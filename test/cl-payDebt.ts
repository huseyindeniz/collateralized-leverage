import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { expect } from "chai";
import {
  deployLeverageFixture,
  LoanStatus,
  minCollateralAmount,
  minPeriodInYears,
} from "./fixtures";
import { ICollateralizedLeverage } from "../typechain-types/contracts/CollateralizedLeverage";

describe("CollateralizedLeverage payDebt", function () {
  const testPayDebtInvalidState = (loanStatus: LoanStatus) =>
    async function () {
      // Arrange
      const fixture = await loadFixture(deployLeverageFixture);
      await fixture.contractUnderTest.setVariable("loanRecords", {
        [fixture.addr1.address]: {
          status: loanStatus,
        },
      });
      // Act + Assert
      await expect(
        fixture.contractUnderTest.connect(fixture.addr1).payDebt()
      ).to.be.revertedWith("invalid state");
    };

  it(
    "UNDEFINED records can not be paid",
    testPayDebtInvalidState(LoanStatus.UNDEFINED)
  );

  it(
    "REQUESTED records can not be paid",
    testPayDebtInvalidState(LoanStatus.REQUESTED)
  );

  it(
    "COMPLETED records can not be paid",
    testPayDebtInvalidState(LoanStatus.COMPLETED)
  );

  it("Valid payDebt", async function () {
    // Arrange
    const fixture = await loadFixture(deployLeverageFixture);
    const borrower = fixture.addr1;
    const lender = fixture.daiOwner;
    // send some ether to contract, so, contract can send eth to borrower
    const ethToSend = ethers.utils.parseEther("5.0");
    await fixture.owner.sendTransaction({
      to: fixture.contractUnderTest.address,
      value: ethToSend,
    });
    // loan taken some time ago
    const THREE_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 3;
    await fixture.contractUnderTest.setVariable("loanRecords", {
      [borrower.address]: {
        amount: minCollateralAmount,
        periodInYears: minPeriodInYears,
        startTime: fixture.block.timestamp - THREE_MONTHS_IN_SECONDS,
        status: LoanStatus.ACTIVE,
        lender: lender.address,
      },
    });

    // learn your current debt
    const currentDebt = await fixture.contractUnderTest
      .connect(borrower)
      .currentDebt();
    // to be able to test the functionality, send dai to the borrower
    await fixture.daiContract
      .connect(fixture.daiOwner)
      .transfer(borrower.address, currentDebt);

    // approve it in the dai contract
    const approveTx = await fixture.daiContract
      .connect(borrower)
      .approve(fixture.contractUnderTest.address, currentDebt);
    const approveRcpt = await approveTx.wait();
    expect(approveRcpt.status).to.be.eq(1);

    // Act
    const payDebtTx = await fixture.contractUnderTest
      .connect(borrower)
      .payDebt();
    const payDebtRcpt = await payDebtTx.wait();

    // Assert
    expect(payDebtRcpt.status).to.be.eq(1);
    expect(payDebtTx).to.changeEtherBalance(borrower, minCollateralAmount);
    expect(payDebtTx).to.changeEtherBalance(
      fixture.contractUnderTest,
      minCollateralAmount
    );
    const loanRecord: ICollateralizedLeverage.LoanRecordStruct =
      (await fixture.contractUnderTest.getVariable("loanRecords", [
        borrower.address,
      ])) as ICollateralizedLeverage.LoanRecordStruct;

    expect(loanRecord.status).to.be.eq(LoanStatus.COMPLETED);

    await expect(payDebtTx)
      .to.emit(
        fixture.contractUnderTest,
        fixture.contractUnderTest.interface.getEvent("LoanCompleted").name
      )
      .withArgs(borrower.address, lender.address);
  });
});
