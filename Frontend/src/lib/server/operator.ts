// The operator's (deployer's) TEST key, used ONLY here on the server, to sign
// admin transactions: approve investors, deposit income, freeze, recover,
// clear tamper. It is read from Frontend/.env.local and never sent to a
// browser. Any file that imports this must only run on the server.
import { createWalletClient, http, nonceManager, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { distributor, errorCode, oracle, publicClient, token, usdc, type ErrorCode } from "@/lib/chain";
import hosts from "@/lib/hosts.json";

if (typeof window !== "undefined") throw new Error("operator.ts must never run in a browser");

function operatorAccount() {
  const key = process.env.OPERATOR_PRIVATE_KEY?.trim();
  if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("OPERATOR_PRIVATE_KEY is missing (Frontend/.env.local)");
  return privateKeyToAccount(key as Hex, { nonceManager });
}

let cached: ReturnType<typeof make> | undefined;
function make() {
  const account = operatorAccount();
  return { account, wallet: createWalletClient({ account, chain: baseSepolia, transport: http(hosts.readRpcs[0]) }) };
}
const op = () => (cached ??= make());

export const operatorAddress = (): Address => op().account.address;

export type TxResult = { ok: true; txHashes: Hex[] } | { ok: false; code: ErrorCode | "config"; message: string };

type Contract = { address: Address; abi: readonly unknown[] };

/** Dry-run, send, and wait for the block. Returns the transaction hash. */
async function send(contract: Contract, functionName: string, args: readonly unknown[]): Promise<Hex> {
  const { account, wallet } = op();
  const { request } = await publicClient.simulateContract({
    address: contract.address,
    abi: contract.abi as never,
    functionName: functionName as never,
    args: args as never,
    account,
  });
  const hash = await wallet.writeContract(request as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
  if (receipt.status !== "success") throw new Error(`Transaction failed: ${hash}`);
  return hash;
}

async function run(steps: () => Promise<Hex[]>): Promise<TxResult> {
  try {
    return { ok: true, txHashes: await steps() };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/OPERATOR_PRIVATE_KEY/.test(msg)) return { ok: false, code: "config", message: msg };
    const code = errorCode(e);
    // Short reason for the operator; never echoes settings or keys.
    const short = (e as { shortMessage?: string }).shortMessage ?? msg;
    return { ok: false, code, message: short.slice(0, 300) };
  }
}

export const approveWallet = (who: Address) => run(async () => [await send(token, "approveWallet", [who])]);
export const revokeWallet = (who: Address) => run(async () => [await send(token, "revokeWallet", [who])]);
export const freeze = (who: Address) => run(async () => [await send(token, "freeze", [who])]);
export const unfreeze = (who: Address) => run(async () => [await send(token, "unfreeze", [who])]);
export const recover = (lost: Address, newWallet: Address) =>
  run(async () => [await send(token, "recover", [lost, newWallet])]);
export const clearTamper = () => run(async () => [await send(oracle, "clearTamper", [])]);

/** Pay in income (USDC, 6 decimals): allow the distributor to take it, then deposit. */
export const deposit = (amount: bigint) =>
  run(async () => {
    const hashes: Hex[] = [];
    const me = operatorAddress();
    // Check the contract's own rules first, so a refused deposit sends nothing.
    const [supply, room] = (await Promise.all([
      publicClient.readContract({ ...token, functionName: "totalSupply" }),
      publicClient.readContract({ ...distributor, functionName: "remainingDepositAllowance" }),
    ])) as [bigint, bigint];
    if (supply === 0n) throw Object.assign(new Error("No shares sold yet"), { data: { errorName: "NoSharesIssued" } });
    if (amount > room) throw Object.assign(new Error("Above the meter limit"), { data: { errorName: "DepositExceedsAttestedEnergy" } });
    const allowance = (await publicClient.readContract({
      ...usdc,
      functionName: "allowance",
      args: [me, distributor.address],
    })) as bigint;
    if (allowance < amount) hashes.push(await send(usdc, "approve", [distributor.address, amount]));
    hashes.push(await send(distributor, "deposit", [amount]));
    return hashes;
  });

export async function operatorBalances() {
  const me = operatorAddress();
  const [eth, usdcBal] = await Promise.all([
    publicClient.getBalance({ address: me }),
    publicClient.readContract({ ...usdc, functionName: "balanceOf", args: [me] }) as Promise<bigint>,
  ]);
  return { address: me, eth, usdc: usdcBal };
}
