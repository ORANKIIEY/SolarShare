// Checks everything the Base Sepolia launch needs, without sending anything:
// deployer key, ETH for gas, test USDC for the demo, settings, document
// hashes and the Basescan key. Prints exactly what's missing.
//
//   npm run preflight:baseSepolia
import { loadEnv } from "./lib/env";
import { preflightBaseSepolia, printChecks } from "./lib/deployConfig";

async function main() {
  loadEnv();
  console.log("SolarShare launch check: Base Sepolia (test network, test money only)\n");
  const result = await preflightBaseSepolia();
  printChecks(result);
  const warnings = result.checks.filter((c) => c.level === "warn").length;
  if (result.ready) {
    console.log(`\nREADY to deploy${warnings ? ` (${warnings} warning${warnings > 1 ? "s" : ""} above, none blocking)` : ""}.`);
    console.log("Next: npm run deploy:baseSepolia");
  } else {
    console.log("\nNOT READY: fix the MISSING items above, then run this again.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
