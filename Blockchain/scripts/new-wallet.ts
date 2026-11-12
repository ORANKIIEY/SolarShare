// Creates a fresh TESTNET-ONLY deployer wallet and stores its private key in
// Blockchain/.env. The key is never printed: only the public address is.
//
//   npm run wallet:new
import fs from "node:fs";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { ENV_EXAMPLE_PATH, ENV_PATH } from "./lib/env";

const template = fs.existsSync(ENV_PATH)
  ? fs.readFileSync(ENV_PATH, "utf8")
  : fs.readFileSync(ENV_EXAMPLE_PATH, "utf8");

const existing = template.match(/^DEPLOYER_PRIVATE_KEY=(.*)$/m)?.[1]?.trim();
if (existing) {
  const address = privateKeyToAccount(existing as `0x${string}`).address;
  console.log("A deployer key is already in .env, so nothing was changed.");
  console.log(`Deployer address: ${address}`);
  process.exit(0);
}

const privateKey = generatePrivateKey();
const address = privateKeyToAccount(privateKey).address;

const updated = /^DEPLOYER_PRIVATE_KEY=.*$/m.test(template)
  ? template.replace(/^DEPLOYER_PRIVATE_KEY=.*$/m, `DEPLOYER_PRIVATE_KEY=${privateKey}`)
  : `${template.trimEnd()}\nDEPLOYER_PRIVATE_KEY=${privateKey}\n`;
fs.writeFileSync(ENV_PATH, updated, { mode: 0o600 });

console.log("New testnet deployer wallet saved to Blockchain/.env (git-ignored).");
console.log(`Deployer address: ${address}`);
console.log("Fund this address from the Base Sepolia faucets. Testnet only!");
