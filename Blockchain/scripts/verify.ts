// Verifies every contract in deployments/<network>.json on Basescan.
// deploy.ts already does this; run it again if the key was missing or
// Basescan was slow.
//
//   npm run verify:baseSepolia
import fs from "node:fs";
import hre from "hardhat";
import { deploymentsFile } from "./lib/deployConfig";
import { verifyAll } from "./lib/verify";

async function main() {
  const file = deploymentsFile(hre.network.name);
  if (!fs.existsSync(file)) throw new Error(`No ${file}. Deploy first.`);
  const { contracts } = JSON.parse(fs.readFileSync(file, "utf8"));
  const failed = await verifyAll(hre, contracts);
  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
