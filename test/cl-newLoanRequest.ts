import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  deployLeverageFixture,
  LoanStatus,
  minCollateralAmount,
  invalidCollateralAmount,
  minPeriodInYears,
  invalidPeriodInYears,
} from "./fixtures";
import { ICollateralizedLeverage } from "../typechain-types/contracts/CollateralizedLeverage";

describe("CollateralizedLeverage newLoanRequest", function () {
  const testInvalidNewLoanRequest = (
    loanStatus: LoanStatus,
    collateralAmount: BigInt,
    periodInYears: number,
    revertMessage: string
  ) =>
    async function () {
      // Arrange
      const fixture = await loadFixture(deployLeverageFixture);
      await fixture.contractUnderTest.setVariable("loanRecords", {
        [fixture.addr1.address]: {
          amount: collateralAmount,
          status: loanStatus,
          periodInYears: periodInYears,
        },
      });
      // Act + Assert
      await expect(
        fixture.contractUnderTest
          .connect(fixture.addr1)
          .newLoanRequest(periodInYears, { value: collateralAmount })
      ).to.be.revertedWith(revertMessage);
    };

  it(
    "Collateral Amount less than threshold should not be accepted",
    testInvalidNewLoanRequest(
      LoanStatus.UNDEFINED,
      invalidCollateralAmount.toBigInt(),
      minPeriodInYears,
      "at least 0.01 eth"
    )
  );
  it(
    "PeriodInYears less than threshold should not be accepted",
    testInvalidNewLoanRequest(
      LoanStatus.UNDEFINED,
      minCollateralAmount.toBigInt(),
      invalidPeriodInYears,
      "at least 1 year"
    )
  );
  it(
    "REQUESTED record can not be requested",
    testInvalidNewLoanRequest(
      LoanStatus.REQUESTED,
      minCollateralAmount.toBigInt(),
      minPeriodInYears,
      "invalid state"
    )
  );
  it(
    "ACTIVE record can not be requested",
    testInvalidNewLoanRequest(
      LoanStatus.ACTIVE,
      minCollateralAmount.toBigInt(),
      minPeriodInYears,
      "invalid state"
    )
  );

  it("Valid new request", async function () {
    // Arrange
    const fixture = await loadFixture(deployLeverageFixture);
    // Act
    const newLoanRequestTx = await fixture.contractUnderTest
      .connect(fixture.addr1)
      .newLoanRequest(minPeriodInYears, { value: minCollateralAmount });
    const newLoanRequestRcpt = await newLoanRequestTx.wait();

    // Assert
    expect(newLoanRequestRcpt.status).to.be.eq(1);

    const loanRecord: ICollateralizedLeverage.LoanRecordStruct =
      (await fixture.contractUnderTest.getVariable("loanRecords", [
        fixture.addr1.address,
      ])) as ICollateralizedLeverage.LoanRecordStruct;

    expect(loanRecord.status).to.be.eq(LoanStatus.REQUESTED);
    expect(loanRecord.periodInYears).to.be.eq(minPeriodInYears);
    expect(loanRecord.amount).to.be.eq(minCollateralAmount);
    expect(loanRecord.startTime).to.be.gt(fixture.block.timestamp);
    expect(loanRecord.lender).to.be.eq(fixture.contractUnderTest.address);

    await expect(newLoanRequestTx)
      .to.emit(
        fixture.contractUnderTest,
        fixture.contractUnderTest.interface.getEvent("NewLoanRequest").name
      )
      .withArgs(fixture.addr1.address, minCollateralAmount, minPeriodInYears);
  });

  it("Valid new request with barrower has a previous completed loan", async function () {
    // Arrange
    const fixture = await loadFixture(deployLeverageFixture);
    await fixture.contractUnderTest.setVariable("loanRecords", {
      [fixture.addr1.address]: {
        status: LoanStatus.COMPLETED,
      },
    });
    // Act
    const newLoanRequestTx = await fixture.contractUnderTest
      .connect(fixture.addr1)
      .newLoanRequest(minPeriodInYears, { value: minCollateralAmount });
    const newLoanRequestRcpt = await newLoanRequestTx.wait();

    // Assert
    expect(newLoanRequestRcpt.status).to.be.eq(1);

    const loanRecord: ICollateralizedLeverage.LoanRecordStruct =
      (await fixture.contractUnderTest.getVariable("loanRecords", [
        fixture.addr1.address,
      ])) as ICollateralizedLeverage.LoanRecordStruct;

    expect(loanRecord.status).to.be.eq(LoanStatus.REQUESTED);
    expect(loanRecord.periodInYears).to.be.eq(minPeriodInYears);
    expect(loanRecord.amount).to.be.eq(minCollateralAmount);
    expect(loanRecord.startTime).to.be.gt(fixture.block.timestamp);
    expect(loanRecord.lender).to.be.eq(fixture.contractUnderTest.address);

    await expect(newLoanRequestTx)
      .to.emit(
        fixture.contractUnderTest,
        fixture.contractUnderTest.interface.getEvent("NewLoanRequest").name
      )
      .withArgs(fixture.addr1.address, minCollateralAmount, minPeriodInYears);
  });
});
