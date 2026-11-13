// Basescan source verification for everything in a deployments file.
// Used by deploy.ts (right after a Base Sepolia deploy) and scripts/verify.ts.
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { BASESCAN } from "./deployConfig";

export interface DeployedContract {
  address: string;
  /** "contracts/X.sol:X". Missing for contracts we didn't deploy (Circle USDC). */
  source?: string;
  constructorArgs?: unknown[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Verifies each contract; returns the names that failed. Never throws. */
export async function verifyAll(
  hre: HardhatRuntimeEnvironment,
  contracts: Record<string, DeployedContract>,
): Promise<string[]> {
  if (!process.env.BASESCAN_API_KEY?.trim()) {
    console.log(
      "\nSkipping Basescan verification: BASESCAN_API_KEY is empty in Blockchain/.env.\n" +
        "  Get a free key at etherscan.io > API Keys (one Etherscan V2 key covers Base Sepolia),\n" +
        "  add it to Blockchain/.env, then run: npm run verify:baseSepolia",
    );
    return [];
  }
  console.log("\nVerifying source code on Basescan (so anyone can read it there)...");
  const failed: string[] = [];
  for (const [name, c] of Object.entries(contracts)) {
    if (!c.source) continue; // e.g. Circle's USDC: already verified by Circle
    let done = false;
    // Basescan needs a little time to index new contracts: retry a few times.
    for (let attempt = 1; attempt <= 5 && !done; attempt++) {
      try {
        await hre.run("verify:verify", {
          address: c.address,
          constructorArguments: c.constructorArgs ?? [],
          contract: c.source,
        });
        done = true;
      } catch (err) {
        const msg = String((err as Error).message ?? err);
        if (/already verified/i.test(msg)) {
          done = true;
        } else if (attempt < 5 && /does not have bytecode|unable to locate|not found|try again|rate limit/i.test(msg)) {
          console.log(`  ${name}: Basescan isn't ready yet, retrying in 15 s (${attempt}/5)`);
          await sleep(15_000);
        } else {
          console.log(`  ${name}: verification FAILED: ${msg.split("\n")[0]}`);
          break;
        }
      }
    }
    if (done) console.log(`  ${name}: verified  ${BASESCAN}/address/${c.address}#code`);
    else failed.push(name);
  }
  if (failed.length) console.log(`\nNot verified: ${failed.join(", ")}. Run \`npm run verify:baseSepolia\` to try again.`);
  return failed;
}
