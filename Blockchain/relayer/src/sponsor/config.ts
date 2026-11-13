// Sponsor settings, from Blockchain/relayer/.env (see .env.example, "Sponsor" section).
import fs from "node:fs";
import path from "node:path";
import { getAddress, isAddress, parseEther, parseUnits, type Address, type Hex } from "viem";
import { NETWORKS, RELAYER_DIR, optionalKey, type NetworkName } from "../config";
import type { SponsorLimits } from "./limits";

export interface SponsorConfig {
  network: NetworkName;
  chainId: number;
  rpcUrl: string;
  /** Optional on localhost (then the node's first unlocked account pays). */
  sponsorPrivateKey?: Hex;
  token: Address;
  usdc: Address;
  /** True when deployments say USDC is the FAKE MockUSDC. */
  usdcIsMock: boolean;
  addressSource: string;
  host: string;
  port: number;
  allowedOrigins: string[];
  ethAmountWei: bigint;
  usdcAmount: bigint;
  limits: SponsorLimits;
  ledgerFile: string;
}

function num(env: NodeJS.ProcessEnv, name: string, fallback: string, check: (n: number) => boolean, hint: string): number {
  const n = Number(env[name]?.trim() || fallback);
  if (!check(n)) throw new Error(`${name} ${hint}`);
  return n;
}

function amount(env: NodeJS.ProcessEnv, name: string, fallback: string, parse: (s: string) => bigint): bigint {
  const raw = env[name]?.trim() || fallback;
  try {
    const value = parse(raw);
    if (value < 0n) throw new Error();
    return value;
  } catch {
    throw new Error(`${name} must be a positive decimal amount, like ${fallback}`);
  }
}

export function loadSponsorConfig(env: NodeJS.ProcessEnv = process.env): SponsorConfig {
  const network = (env.NETWORK?.trim() || "localhost") as NetworkName;
  if (!(network in NETWORKS)) {
    // Only test networks are listed, so a mainnet can never be picked by accident.
    throw new Error(`NETWORK must be one of ${Object.keys(NETWORKS).join(", ")} (test networks only), not "${network}"`);
  }
  const { chainId, defaultRpc } = NETWORKS[network];

  const sponsorPrivateKey = optionalKey(env, "SPONSOR_PRIVATE_KEY");
  if (!sponsorPrivateKey && network !== "localhost") {
    throw new Error(
      `SPONSOR_PRIVATE_KEY is required on ${network}: the TEST wallet the top-ups come from. ` +
        "Give it some Base Sepolia ETH (and test USDC if SPONSOR_USDC_AMOUNT is above 0).",
    );
  }

  // Token and USDC addresses: from the deployments file unless overridden.
  const file = path.resolve(RELAYER_DIR, env.DEPLOYMENTS_FILE?.trim() || path.join("..", "deployments", `${network}.json`));
  const json = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : undefined;
  const pick = (envName: string, contract: string): Address => {
    const value = env[envName]?.trim() || json?.contracts?.[contract]?.address;
    if (!value) {
      throw new Error(`No ${contract} address: deploy first (${path.relative(process.cwd(), file)} is missing) or set ${envName}.`);
    }
    if (!isAddress(value)) throw new Error(`${envName} / ${contract} address is not valid: ${value}`);
    return getAddress(value);
  };
  const token = pick("TOKEN_ADDRESS", "SolarShareToken");
  const usdc = pick("USDC_ADDRESS", "USDC");

  const port = num(env, "SPONSOR_PORT", "8787", (n) => Number.isInteger(n) && n > 0 && n < 65536, "must be a port number");
  const perWalletMax = num(env, "SPONSOR_PER_WALLET_MAX", "1", (n) => Number.isInteger(n) && n > 0, "must be a whole number above 0");
  const perWalletWindowH = num(env, "SPONSOR_PER_WALLET_WINDOW_H", "24", (n) => n > 0, "must be a number of hours above 0");
  const globalMaxPerHour = num(env, "SPONSOR_MAX_PER_HOUR", "30", (n) => Number.isInteger(n) && n > 0, "must be a whole number above 0");

  return {
    network,
    chainId,
    rpcUrl: env.RPC_URL?.trim() || defaultRpc,
    sponsorPrivateKey,
    token,
    usdc,
    usdcIsMock: Boolean(json?.contracts?.USDC?.mock),
    addressSource: env.TOKEN_ADDRESS?.trim() ? "TOKEN_ADDRESS / USDC_ADDRESS" : path.relative(path.resolve(RELAYER_DIR, ".."), file),
    host: env.SPONSOR_HOST?.trim() || "127.0.0.1",
    port,
    allowedOrigins: (env.SPONSOR_ALLOWED_ORIGINS?.trim() || "*").split(",").map((s) => s.trim()).filter(Boolean),
    ethAmountWei: amount(env, "SPONSOR_ETH_AMOUNT", "0.0005", parseEther),
    usdcAmount: amount(env, "SPONSOR_USDC_AMOUNT", "25", (s) => parseUnits(s, 6)),
    limits: {
      perWalletMax,
      perWalletWindowS: Math.round(perWalletWindowH * 3600),
      globalMaxPerHour,
      totalEthCapWei: amount(env, "SPONSOR_TOTAL_ETH_CAP", "0.05", parseEther),
      totalUsdcCap: amount(env, "SPONSOR_TOTAL_USDC_CAP", "1000", (s) => parseUnits(s, 6)),
    },
    ledgerFile: path.resolve(RELAYER_DIR, env.SPONSOR_LEDGER?.trim() || `sponsor-ledger.${network}.json`),
  };
}
