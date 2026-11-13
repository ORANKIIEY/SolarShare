// Settings for scripts/deploy.ts, plus the launch checks shared by
// `npm run preflight:baseSepolia` and the Base Sepolia deploy itself.
import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  erc20Abi,
  formatEther,
  formatUnits,
  getAddress,
  http,
  isAddress,
  parseEther,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readHashes, type HashedDocument } from "./assetDocuments";

export const BLOCKCHAIN_DIR = path.resolve(__dirname, "..", "..");
export const DEPLOYMENTS_DIR = path.join(BLOCKCHAIN_DIR, "deployments");
export const deploymentsFile = (network: string) => path.join(DEPLOYMENTS_DIR, `${network}.json`);

export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASESCAN = "https://sepolia.basescan.org";

/** Circle's official test USDC on Base Sepolia (developers.circle.com, "USDC contract addresses"). */
export const CIRCLE_USDC_BASE_SEPOLIA: Address = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
/** The Wokwi ESP32 meter's TEST signing address (Hardware/wokwi-meter, issue #4). */
export const WOKWI_DEVICE: Address = "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3";

export const METER_ID = 1;
export const PRICE_PER_SHARE = 5_000_000n; // 5 USDC (6 decimals)
export const TARIFF_USDC_PER_KWH = 200_000n; // 0.20 USDC per kWh
export const THEFT_GAP_BPS = 1500; // 15%
export const MAX_SUPPLY = 3500;
/** MockUSDC minted to the deployer on a local chain (or with USE_MOCK_USDC), for payouts and sponsor top-ups. */
export const MOCK_USDC_MINT = 100_000_000_000n; // 100,000 USDC

/**
 * Gas used by a full deploy + wiring, measured on a local Hardhat chain
 * (see the "Gas used" line `npm run deploy:local` prints). Rounded up.
 */
export const DEPLOY_GAS_ESTIMATE = 8_000_000n;
/** Never let preflight say "ready" with less than this, whatever the gas price. */
export const MIN_DEPLOY_ETH = parseEther("0.002");
/** Test USDC the deployer should hold for the demo (payouts + sponsor top-ups). Not needed to deploy. */
export const RECOMMENDED_USDC = 50_000_000n; // 50 USDC

export interface DeploySettings {
  meterDevice: Address;
  treasury?: Address; // undefined = the deployer
  offlineTimeoutS: number;
  useMockUsdc: boolean;
}

function addressFromEnv(env: NodeJS.ProcessEnv, name: string): Address | undefined {
  const value = env[name]?.trim();
  if (!value) return undefined;
  if (!isAddress(value)) throw new Error(`${name} is not a valid address: ${value}`);
  return getAddress(value);
}

/**
 * Reads the optional deploy settings from Blockchain/.env (or the shell):
 *   METER_DEVICE_ADDRESS  meter signing address (default: the Wokwi meter)
 *   TREASURY_ADDRESS      where share-sale USDC goes (default: the deployer)
 *   OFFLINE_TIMEOUT_S     seconds without a reading before OFFLINE (default 120, short for the demo)
 *   USE_MOCK_USDC         "true" = deploy a labelled MockUSDC on Base Sepolia too (fallback if the faucet runs dry)
 */
export function loadDeploySettings(env: NodeJS.ProcessEnv = process.env): DeploySettings {
  const offlineTimeoutS = Number(env.OFFLINE_TIMEOUT_S?.trim() || "120");
  if (!Number.isInteger(offlineTimeoutS) || offlineTimeoutS <= 0) {
    throw new Error("OFFLINE_TIMEOUT_S must be a whole number of seconds above 0");
  }
  return {
    meterDevice: addressFromEnv(env, "METER_DEVICE_ADDRESS") ?? WOKWI_DEVICE,
    treasury: addressFromEnv(env, "TREASURY_ADDRESS"),
    offlineTimeoutS,
    useMockUsdc: /^(1|true|yes)$/i.test(env.USE_MOCK_USDC?.trim() ?? ""),
  };
}

// ------------------------------------------------------------------ preflight

export type CheckLevel = "ok" | "warn" | "fail" | "info";
export interface Check {
  level: CheckLevel;
  label: string;
  detail: string;
  /** What to do about it (warn/fail only). */
  fix?: string;
}

export interface PreflightResult {
  checks: Check[];
  ready: boolean;
  deployer?: Address;
  documents: HashedDocument[];
}

export function baseSepoliaClient(rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"): PublicClient {
  return createPublicClient({ chain: baseSepolia, transport: http(rpcUrl, { retryCount: 2, timeout: 15_000 }) }) as PublicClient;
}

/**
 * Everything the Base Sepolia launch needs, checked without sending anything.
 * `ready` is false if any check failed; warnings don't block the deploy.
 */
export async function preflightBaseSepolia(env: NodeJS.ProcessEnv = process.env): Promise<PreflightResult> {
  const checks: Check[] = [];
  const add = (level: CheckLevel, label: string, detail: string, fix?: string) => checks.push({ level, label, detail, fix });
  const rpcUrl = env.BASE_SEPOLIA_RPC_URL?.trim() || "https://sepolia.base.org";

  // 1. Deployer key.
  let deployer: Address | undefined;
  const key = env.DEPLOYER_PRIVATE_KEY?.trim() ?? "";
  if (!key) add("fail", "Deployer key", "DEPLOYER_PRIVATE_KEY is empty in Blockchain/.env.", "Run `npm run wallet:new` (creates a TEST wallet).");
  else if (!/^0x[0-9a-fA-F]{64}$/.test(key)) add("fail", "Deployer key", "DEPLOYER_PRIVATE_KEY is not 0x + 64 hex characters.", "Fix it in Blockchain/.env.");
  else {
    deployer = privateKeyToAccount(key as Hex).address;
    add("ok", "Deployer key", `wallet ${deployer} (the key itself is never printed)`);
  }

  // 2. Settings.
  let settings: DeploySettings | undefined;
  try {
    settings = loadDeploySettings(env);
    add(
      "ok",
      "Settings",
      `meter device ${settings.meterDevice}${settings.meterDevice === WOKWI_DEVICE ? " (the Wokwi meter)" : ""}, ` +
        `treasury ${settings.treasury ?? "= deployer"}, offline after ${settings.offlineTimeoutS} s, ` +
        `theft gap ${THEFT_GAP_BPS / 100}%, ${formatUnits(PRICE_PER_SHARE, 6)} USDC per share, ` +
        `${formatUnits(TARIFF_USDC_PER_KWH, 6)} USDC per kWh`,
    );
    if (settings.useMockUsdc) {
      add("warn", "USDC", "USE_MOCK_USDC=true: a FAKE MockUSDC will be deployed instead of Circle's test USDC.", "Remove USE_MOCK_USDC unless the Circle faucet is dry.");
    }
  } catch (err) {
    add("fail", "Settings", (err as Error).message, "Fix the value in Blockchain/.env.");
  }

  // 3. Documents.
  const { documents, problems } = readHashes();
  if (problems.length) for (const p of problems) add("fail", "Asset documents", p);
  else add("ok", "Asset documents", `${documents.length} SAMPLE documents, hashes match the files in docs/asset-documents/`);
  const unreachable: string[] = [];
  for (const doc of problems.length ? [] : documents) {
    try {
      const res = await fetch(doc.uri, { method: "HEAD" });
      if (!res.ok) unreachable.push(`${doc.file} (HTTP ${res.status})`);
    } catch {
      unreachable.push(`${doc.file} (no answer)`);
    }
  }
  if (unreachable.length) {
    add(
      "warn",
      "Document links",
      `not downloadable yet from GitHub: ${unreachable.join(", ")}.`,
      "They work once docs/asset-documents/ is merged to main. You can deploy before that: the onchain hash is what counts.",
    );
  } else if (!problems.length) add("ok", "Document links", "all 3 download from GitHub");

  // 4. Verification key.
  if (env.BASESCAN_API_KEY?.trim()) add("ok", "Basescan API key", "set: contracts will be verified after deploying");
  else {
    add(
      "warn",
      "Basescan API key",
      "BASESCAN_API_KEY is empty: the deploy works, but source verification will be skipped.",
      "Get a free key at etherscan.io > API Keys (one Etherscan V2 key covers Base Sepolia), put it in Blockchain/.env, " +
        "then run `npm run verify:baseSepolia` any time.",
    );
  }

  // 5. Earlier deploy.
  const existing = deploymentsFile("baseSepolia");
  if (fs.existsSync(existing)) {
    add(
      "warn",
      "Earlier deploy",
      "deployments/baseSepolia.json already exists. Deploying again makes NEW contracts; the meter, relayer and web app must then use the new addresses.",
      "The deploy refuses unless you set REDEPLOY=1.",
    );
  }

  // 6. Chain: reachable, balances.
  const client = baseSepoliaClient(rpcUrl);
  let chainOk = false;
  try {
    const chainId = await client.getChainId();
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      add("fail", "RPC", `${rpcUrl} is chain ${chainId}, not Base Sepolia (${BASE_SEPOLIA_CHAIN_ID}).`, "Fix BASE_SEPOLIA_RPC_URL.");
    } else {
      chainOk = true;
      add("ok", "RPC", `${rpcUrl} is Base Sepolia (chain ${chainId})`);
    }
  } catch (err) {
    add("fail", "RPC", `Can't reach ${rpcUrl}: ${(err as Error).message.split("\n")[0]}`, "Check your internet, or set BASE_SEPOLIA_RPC_URL.");
  }

  if (chainOk) {
    try {
      const code = await client.getCode({ address: CIRCLE_USDC_BASE_SEPOLIA });
      const [symbol, decimals] = await Promise.all([
        client.readContract({ address: CIRCLE_USDC_BASE_SEPOLIA, abi: erc20Abi, functionName: "symbol" }),
        client.readContract({ address: CIRCLE_USDC_BASE_SEPOLIA, abi: erc20Abi, functionName: "decimals" }),
      ]);
      if (!code || code === "0x" || decimals !== 6) {
        add("fail", "Circle USDC", `${CIRCLE_USDC_BASE_SEPOLIA} doesn't look like test USDC (symbol ${symbol}, ${decimals} decimals).`);
      } else add("ok", "Circle USDC", `${CIRCLE_USDC_BASE_SEPOLIA} (${symbol}, ${decimals} decimals)`);
    } catch (err) {
      add("fail", "Circle USDC", `Couldn't read ${CIRCLE_USDC_BASE_SEPOLIA}: ${(err as Error).message.split("\n")[0]}`);
    }
  }

  if (chainOk && deployer) {
    try {
      const [eth, usdc, gasPrice] = await Promise.all([
        client.getBalance({ address: deployer }),
        client.readContract({ address: CIRCLE_USDC_BASE_SEPOLIA, abi: erc20Abi, functionName: "balanceOf", args: [deployer] }),
        client.getGasPrice(),
      ]);
      // 3x the measured gas at today's price, never below MIN_DEPLOY_ETH.
      const estimate = DEPLOY_GAS_ESTIMATE * gasPrice * 3n;
      const needEth = estimate > MIN_DEPLOY_ETH ? estimate : MIN_DEPLOY_ETH;
      if (eth >= needEth) {
        add("ok", "Deployer ETH", `${formatEther(eth)} ETH (deploy needs about ${formatEther(needEth)} ETH incl. safety margin)`);
      } else {
        add(
          "fail",
          "Deployer ETH",
          `${formatEther(eth)} ETH, but the deploy needs about ${formatEther(needEth)} ETH (gas price now ${formatUnits(gasPrice, 9)} gwei).`,
          `Send at least ${formatEther(needEth - eth)} Base Sepolia ETH to ${deployer} (free from a Base Sepolia faucet, e.g. the Coinbase Developer Platform faucet).`,
        );
      }
      if (usdc >= RECOMMENDED_USDC) add("ok", "Deployer USDC", `${formatUnits(usdc, 6)} test USDC`);
      else {
        add(
          "warn",
          "Deployer USDC",
          `${formatUnits(usdc, 6)} test USDC. Not needed to deploy, but the demo needs some for payouts and sponsor top-ups.`,
          `Get ${formatUnits(RECOMMENDED_USDC, 6)}+ test USDC for ${deployer} at https://faucet.circle.com (pick Base Sepolia).`,
        );
      }
    } catch (err) {
      add("fail", "Balances", `Couldn't read balances: ${(err as Error).message.split("\n")[0]}`);
    }
  }

  return { checks, ready: !checks.some((c) => c.level === "fail"), deployer, documents };
}

export function printChecks(result: PreflightResult): void {
  const icon: Record<CheckLevel, string> = { ok: "  OK  ", warn: " WARN ", fail: " MISSING", info: "  --  " };
  for (const c of result.checks) {
    console.log(`${icon[c.level].padEnd(8)} ${c.label}: ${c.detail}`);
    if (c.fix && c.level !== "ok") console.log(`         -> ${c.fix}`);
  }
}
