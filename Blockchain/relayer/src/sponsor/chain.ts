// The real SponsorChain: viem reads of SolarShareToken and USDC, and plain
// transfers from the sponsor wallet.
import { erc20Abi, type Account, type Address, type Chain, type PublicClient, type Transport, type WalletClient } from "viem";
import type { SponsorChain } from "./sponsor";

export const tokenApprovalAbi = [
  {
    type: "function",
    name: "isApproved",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isFrozen",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function viemSponsorChain(opts: {
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain, Account>;
  token: Address;
  usdc: Address;
}): SponsorChain {
  const { publicClient, walletClient, token, usdc } = opts;
  const wait = async (hash: `0x${string}`) => {
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
    if (receipt.status !== "success") throw new Error(`transaction ${hash} reverted`);
    return hash;
  };
  return {
    sponsorAddress: walletClient.account.address,
    isApproved: (wallet) => publicClient.readContract({ address: token, abi: tokenApprovalAbi, functionName: "isApproved", args: [wallet] }),
    isFrozen: (wallet) => publicClient.readContract({ address: token, abi: tokenApprovalAbi, functionName: "isFrozen", args: [wallet] }),
    ethBalance: (wallet) => publicClient.getBalance({ address: wallet }),
    usdcBalance: (wallet) => publicClient.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [wallet] }),
    sendEth: async (to, wei) => wait(await walletClient.sendTransaction({ to, value: wei })),
    sendUsdc: async (to, amount) =>
      wait(await walletClient.writeContract({ address: usdc, abi: erc20Abi, functionName: "transfer", args: [to, amount] })),
  };
}
