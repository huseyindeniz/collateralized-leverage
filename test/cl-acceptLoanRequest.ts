import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  deployLeverageFixture,
  LoanStatus,
  minCollateralAmount,
  minPeriodInYears,
} from "./fixtures";
import { ICollateralizedLeverage } from "../typechain-types/contracts/CollateralizedLeverage";

describe("CollateralizedLeverage acceptLoanRequest", function () {
  it("Valid accept", async function () {
    // Arrange
    const fixture = await loadFixture(deployLeverageFixture);
    const barrower = fixture.addr1;
    const lender = fixture.daiOwner;
    const lenderInitialDAIBalance = await fixture.daiContract.balanceOf(
      lender.address
    );
    const barrowerInitialDAIBalance = await fixture.daiContract.balanceOf(
      barrower.address
    );

    await fixture.contractUnderTest.setVariable("loanRecords", {
      [barrower.address]: {
        amount: minCollateralAmount,
        status: LoanStatus.REQUESTED,
        periodInYears: minPeriodInYears,
      },
    });
    const requestedDaiAmount = minCollateralAmount
      .div(2)
      .mul(await fixture.contractUnderTest.DAI_ETH_MULTIPLIER());

    const approveTx = await fixture.daiContract
      .connect(lender)
      .approve(fixture.contractUnderTest.address, requestedDaiAmount);
    const approveRcpt = await approveTx.wait();
    expect(approveRcpt.status).to.be.eq(1);

    // Act
    const acceptLoanRequestTx = await fixture.contractUnderTest
      .connect(lender)
      .acceptLoanRequest(barrower.address);
    const acceptLoanRequestRcpt = await acceptLoanRequestTx.wait();

    // Assert
    expect(acceptLoanRequestRcpt.status).to.be.eq(1);

    const loanRecord: ICollateralizedLeverage.LoanRecordStruct =
      (await fixture.contractUnderTest.getVariable("loanRecords", [
        barrower.address,
      ])) as ICollateralizedLeverage.LoanRecordStruct;

    expect(loanRecord.status).to.be.eq(LoanStatus.ACTIVE);
    expect(loanRecord.periodInYears).to.be.eq(minPeriodInYears);
    expect(loanRecord.amount).to.be.eq(minCollateralAmount);
    expect(loanRecord.startTime).to.be.gt(fixture.block.timestamp);
    expect(loanRecord.lender).to.be.eq(lender.address);

    const lenderCurrentDAIBalance = await fixture.daiContract.balanceOf(
      lender.address
    );
    const barrowerCurrentDAIBalance = await fixture.daiContract.balanceOf(
      barrower.address
    );

    expect(barrowerCurrentDAIBalance.sub(barrowerInitialDAIBalance)).to.be.eq(
      requestedDaiAmount
    );
    expect(lenderInitialDAIBalance.sub(lenderCurrentDAIBalance)).to.be.eq(
      requestedDaiAmount
    );

    await expect(acceptLoanRequestTx)
      .to.emit(
        fixture.contractUnderTest,
        fixture.contractUnderTest.interface.getEvent("LoanRequestAccepted").name
      )
      .withArgs(barrower.address, lender.address);
  });
});
