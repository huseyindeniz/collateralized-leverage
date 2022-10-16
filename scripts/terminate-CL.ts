import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const CLContractFactory = await ethers.getContractFactory(
    "CollateralizedLeverage"
  );
  const CLContract = CLContractFactory.attach("CONTRACT ADDRESS HERE");

  await CLContract.deployed();
  console.log("CollateralizedLeverage deployed to:", CLContract.address);

  const terminateTx = await CLContract.terminate();
  const terminateRcpt = await terminateTx.wait();
  if (terminateRcpt.status == 1) {
    console.log("contract terminated");
  } else {
    console.log(terminateTx);
    console.log(terminateRcpt);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
