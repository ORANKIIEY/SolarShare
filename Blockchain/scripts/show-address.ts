// Shows the deployer's public address and its Base Sepolia balances
// (test ETH for gas, test USDC for payouts). Never prints the private key.
//
//   npm run wallet:address
import { createPublicClient, erc20Abi, formatEther, formatUnits, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { loadEnv } from "./lib/env";

// Circle's official test USDC on Base Sepolia (what faucet.circle.com sends).
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

async function main() {
  loadEnv();
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error("No DEPLOYER_PRIVATE_KEY in .env. Run `npm run wallet:new` first.");
  const { address } = privateKeyToAccount(key as `0x${string}`);
  console.log(`Deployer address: ${address}`);

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  });
  try {
    const [eth, usdc] = await Promise.all([
      client.getBalance({ address }),
      client.readContract({
        address: USDC_BASE_SEPOLIA,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
    ]);
    console.log(`Base Sepolia ETH:  ${formatEther(eth)}`);
    console.log(`Base Sepolia USDC: ${formatUnits(usdc, 6)}`);
  } catch (err) {
    console.log(`(Could not reach Base Sepolia to read balances: ${(err as Error).message.split("\n")[0]})`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
