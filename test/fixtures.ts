import * as dotenv from "dotenv";
import { impersonateAccount } from "@nomicfoundation/hardhat-network-helpers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { smock, MockContract } from "@defi-wonderland/smock";
import {
  CollateralizedLeverage,
  CollateralizedLeverage__factory,
  IERC20,
} from "../typechain-types";

dotenv.config();

export const daiAddress = "0x11fE4B6AE13d2a6055C8D9cF65c55bac32B5d844";
export const DAI_ETH_MULTIPLIER = 1294;
export const MONTHLY_INTEREST_RATE = 10;
export const MONTHLY_DELAYED_INTEREST_RATE = 5;
export const minPeriodInYears = 1;
export const invalidPeriodInYears = 0;
export const minCollateralAmount = ethers.utils.parseEther("0.01");
export const invalidCollateralAmount = ethers.utils.parseEther("0.009");

if (process.env.GOERLI_WALLET_TO_IMPERSONATE == undefined)
  throw new Error("GOERLI_WALLET_TO_IMPERSONATE required");
const accountToInpersonate = process.env.GOERLI_WALLET_TO_IMPERSONATE;

export type ContractFixture = {
  block: any;
  contractUnderTest: MockContract<CollateralizedLeverage>;
  daiContract: IERC20;
  wethContract: IERC20;
  owner: SignerWithAddress;
  daiOwner: SignerWithAddress;
  addr1: SignerWithAddress;
  addr2: SignerWithAddress;
  addrs: SignerWithAddress[];
};

export enum LoanStatus {
  UNDEFINED,
  REQUESTED,
  ACTIVE,
  COMPLETED,
}

export async function deployLeverageFixture() {
  // Contracts are deployed using the first signer/account by default
  const [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

  // deploy contract
  const mockContractFactory = await smock.mock<CollateralizedLeverage__factory>(
    "CollateralizedLeverage"
  );
  const contractUnderTest = await mockContractFactory.deploy();
  await contractUnderTest.deployed();

  // inpersonate an account which already has DAI
  await impersonateAccount(accountToInpersonate);
  const daiOwner = await ethers.getSigner(accountToInpersonate);

  // dai contract
  const daiContract = await ethers.getContractAt("IERC20", daiAddress);

  // current block
  const blockNumber = await ethers.provider.getBlockNumber();
  const block = await ethers.provider.getBlock(blockNumber);

  return {
    block,
    contractUnderTest,
    daiContract,
    owner,
    daiOwner,
    addr1,
    addr2,
    addrs,
  };
}
