// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

interface ICollateralizedLeverage {
    // Events
    event NewLoanRequest(
        address indexed requester,
        uint256 collateralAmount,
        uint256 period
    );

    event LoanRequestAccepted(address indexed barrower, address indexed lender);

    event LoanCompleted(address indexed barrower, address indexed requester);

    event LoanCaptured(address indexed barrower, address indexed requester);

    enum LoanStatus {
        UNDEFINED,
        REQUESTED,
        ACTIVE,
        COMPLETED
    }

    struct LoanRecord {
        uint256 amount;
        uint256 periodInYears;
        uint256 startTime;
        uint8 status;
        address lender;
    }

    // one wallet can take 1 loan at a time

    // Borrower Functions
    function newLoanRequest(uint256 _periodInYears) external payable; // done

    function currentDebt() external view returns (uint256); // done

    function payDebt() external; // done

    // Lender Functions
    function acceptLoanRequest(address _requester) external; // done

    function isCapturable(address _barrower) external view returns (bool); // done

    function captureCollateral(address _barrower) external; // done

    // Views
    function viewLoanRecord(
        address _barrower // done
    ) external view returns (LoanRecord memory);
}
