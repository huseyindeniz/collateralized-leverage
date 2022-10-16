import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CLContractFactory = await ethers.getContractFactory(
    "CollateralizedLeverage"
  );
  const CLContract = await CLContractFactory.deploy();

  await CLContract.deployed();
  console.log("CollateralizedLeverage deployed to:", CLContract.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
