import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
if (!ALCHEMY_API_KEY) throw new Error("ALCHEMY_API_KEY required");

// in order to deploy to the goerli, uncomment the following lines
// don't forget to add your deployer wallet goerli private key to the .env file

//const GOERLI_PRIVATE_KEY = process.env.GOERLI_PRIVATE_KEY;
//if (!GOERLI_PRIVATE_KEY) throw new Error("GOERLI_API_KEY required");

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      outputSelection: {
        "*": {
          "*": ["storageLayout"],
        },
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        //url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        //blockNumber: 15702400,
        url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
        blockNumber: 7733818,
      },
    },
    goerli: {
      chainId: 5,
      url: `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      //accounts: [GOERLI_PRIVATE_KEY],
    },
  },
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS !== undefined,
  //   currency: "USD",
  //   token: "ETH",
  //   //coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  // },
};

export default config;
