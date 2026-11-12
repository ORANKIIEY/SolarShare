import path from "node:path";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";

// Load secrets from Blockchain/.env (never committed). A missing .env is fine:
// you can still compile and run tests locally without one.
try {
  process.loadEnvFile(path.join(__dirname, ".env"));
} catch {
  // no .env file yet
}

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const BASE_SEPOLIA_RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY ?? "";

// Only pass the key to the network if it looks like a real 32-byte hex key,
// so a half-filled .env doesn't break `npm run compile` or `npm test`.
const deployerAccounts = /^0x[0-9a-fA-F]{64}$/.test(DEPLOYER_PRIVATE_KEY)
  ? [DEPLOYER_PRIVATE_KEY]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun",
    },
  },
  networks: {
    // In-memory chain used by `npm test` (and `npm run node`).
    hardhat: {},
    // Base Sepolia public testnet. Test money only.
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL,
      chainId: 84532,
      accounts: deployerAccounts,
    },
  },
  // Contract source verification on sepolia.basescan.org.
  // Uses the Etherscan V2 API: one Etherscan API key works for Base Sepolia too.
  etherscan: {
    apiKey: BASESCAN_API_KEY,
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
