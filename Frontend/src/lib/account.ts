"use client";

// The investor's account on the test network: a key made in this browser and
// kept in this browser's storage. DEMO ONLY: fine for test money, not for real
// money (a real launch would use a passkey smart account with a paymaster).
// The investor never sees the key, a seed phrase or the word "wallet".
import { createWalletClient, http, nonceManager, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { publicClient, sale, usdc, distributor } from "./chain";
import hosts from "./hosts.json";

const KEY = "solarshare.key";
const PROFILE = "solarshare.profile";

export interface Profile {
  name: string;
  phone: string; // as typed, kept only in this browser
  startedAt: number; // when sign-up began, to time the "under 2 minutes" run
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadKey(): Hex | null {
  const k = storage()?.getItem(KEY);
  return k && /^0x[0-9a-f]{64}$/i.test(k) ? (k as Hex) : null;
}

export function createKey(): Hex {
  const existing = loadKey();
  if (existing) return existing;
  const k = generatePrivateKey();
  storage()?.setItem(KEY, k);
  return k;
}

export function loadProfile(): Profile | null {
  try {
    const raw = storage()?.getItem(PROFILE);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: Profile) {
  storage()?.setItem(PROFILE, JSON.stringify(p));
}

/** Forget this browser's account (demo reset). */
export function forgetAccount() {
  storage()?.removeItem(KEY);
  storage()?.removeItem(PROFILE);
}

export const addressOf = (k: Hex): Address => privateKeyToAccount(k).address;

function walletFor(k: Hex) {
  const account = privateKeyToAccount(k, { nonceManager });
  return { account, wallet: createWalletClient({ account, chain: baseSepolia, transport: http(hosts.readRpcs[0]) }) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Dry-run, send, wait. Public test-network nodes can lag a block behind, so a
 * dry run that fails right after an earlier step is retried a few times.
 */
async function send(k: Hex, contract: { address: Address; abi: readonly unknown[] }, functionName: string, args: readonly unknown[]) {
  const { account, wallet } = walletFor(k);
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { request } = await publicClient.simulateContract({
        address: contract.address,
        abi: contract.abi as never,
        functionName: functionName as never,
        args: args as never,
        account,
      });
      const hash = await wallet.writeContract(request as never);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status !== "success") throw new Error("Transaction failed");
      return hash;
    } catch (e) {
      lastError = e;
      const name = (e as { cause?: { data?: { errorName?: string } } }).cause?.data?.errorName;
      const lagging = name === "ERC20InsufficientAllowance" || name === "ERC20InsufficientBalance" || name === "AccountNotApproved";
      if (!lagging || attempt === 3) throw e;
      await sleep(1500);
    }
  }
  throw lastError;
}

/** Buy shares: let the sale take the USDC (if needed), then buy. */
export async function buyShares(k: Hex, amount: bigint, onStep?: (step: "approve" | "buy") => void) {
  const me = addressOf(k);
  const cost = (await publicClient.readContract({ ...sale, functionName: "quote", args: [amount] })) as bigint;
  const allowance = (await publicClient.readContract({ ...usdc, functionName: "allowance", args: [me, sale.address] })) as bigint;
  const hashes: Hex[] = [];
  if (allowance < cost) {
    onStep?.("approve");
    hashes.push(await send(k, usdc, "approve", [sale.address, cost]));
  }
  onStep?.("buy");
  hashes.push(await send(k, sale, "buy", [amount]));
  return { hashes, cost };
}

export const claimPayout = (k: Hex) => send(k, distributor, "claim", []);
