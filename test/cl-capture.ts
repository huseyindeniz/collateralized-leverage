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

describe("CollateralizedLeverage capture", function () {
  const testPayDebtInvalidState = (loanStatus: LoanStatus) =>
    async function () {
      // Arrange
      const fixture = await loadFixture(deployLeverageFixture);
      await fixture.contractUnderTest.setVariable("loanRecords", {
        [fixture.addr1.address]: {
          status: loanStatus,
          lender: fixture.addr2.address,
        },
      });
      // Act + Assert
      await expect(
        fixture.contractUnderTest
          .connect(fixture.addr2)
          .captureCollateral(fixture.addr1.address)
      ).to.be.revertedWith("invalid state");
    };

  it(
    "UNDEFINED records can not be captured",
    testPayDebtInvalidState(LoanStatus.UNDEFINED)
  );

  it(
    "REQUESTED records can not be captured",
    testPayDebtInvalidState(LoanStatus.REQUESTED)
  );

  it(
    "COMPLETED records can not be captured",
    testPayDebtInvalidState(LoanStatus.COMPLETED)
  );

  it("Non-owned loans can not be captured", async function () {
    // Arrange
    const fixture = await loadFixture(deployLeverageFixture);
    await fixture.contractUnderTest.setVariable("loanRecords", {
      [fixture.addr1.address]: {
        status: LoanStatus.ACTIVE,
      },
    });
    // Act + Assert
    await expect(
      fixture.contractUnderTest
        .connect(fixture.addr2)
        .captureCollateral(fixture.addr1.address)
    ).to.be.revertedWith("not lender");
  });

  it("Valid capture", async function () {
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
    // loan taken too long ago, delayed loan
    const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 30 * 12;
    await fixture.contractUnderTest.setVariable("loanRecords", {
      [borrower.address]: {
        amount: minCollateralAmount,
        periodInYears: minPeriodInYears,
        startTime: fixture.block.timestamp - ONE_YEAR_IN_SECONDS,
        status: LoanStatus.ACTIVE,
        lender: lender.address,
      },
    });

    const isCapturable = await fixture.contractUnderTest
      .connect(lender)
      .isCapturable(borrower.address);
    expect(isCapturable).to.be.true;

    // Act
    const captureTx = await fixture.contractUnderTest
      .connect(lender)
      .captureCollateral(borrower.address);
    const captureRcpt = await captureTx.wait();

    // Assert
    expect(captureRcpt.status).to.be.eq(1);
    expect(captureTx).to.changeEtherBalance(lender, minCollateralAmount);
    expect(captureTx).to.changeEtherBalance(
      fixture.contractUnderTest,
      minCollateralAmount
    );
    const loanRecord: ICollateralizedLeverage.LoanRecordStruct =
      (await fixture.contractUnderTest.getVariable("loanRecords", [
        borrower.address,
      ])) as ICollateralizedLeverage.LoanRecordStruct;

    expect(loanRecord.status).to.be.eq(LoanStatus.COMPLETED);

    await expect(captureTx)
      .to.emit(
        fixture.contractUnderTest,
        fixture.contractUnderTest.interface.getEvent("LoanCaptured").name
      )
      .withArgs(borrower.address, lender.address);
  });
});
