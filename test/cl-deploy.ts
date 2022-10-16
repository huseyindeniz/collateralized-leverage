import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import {
  DAI_ETH_MULTIPLIER,
  deployLeverageFixture,
  MONTHLY_INTEREST_RATE,
  MONTHLY_DELAYED_INTEREST_RATE,
} from "./fixtures";

describe("CollateralizedLeverage Deploy", function () {
  it("Should be deployed", async function () {
    // Arrange + Act
    const fixture = await loadFixture(deployLeverageFixture);

    // Assert
    expect(await fixture.contractUnderTest.owner()).to.be.equal(
      fixture.owner.address
    );
    expect(await fixture.contractUnderTest.MONTHLY_INTEREST_RATE()).to.be.eq(
      MONTHLY_INTEREST_RATE
    );
    expect(
      await fixture.contractUnderTest.MONTHLY_DELAYED_INTEREST_RATE()
    ).to.be.eq(MONTHLY_DELAYED_INTEREST_RATE);
    expect(await fixture.contractUnderTest.DAI_ETH_MULTIPLIER()).to.be.eq(
      DAI_ETH_MULTIPLIER
    );
  });
});
