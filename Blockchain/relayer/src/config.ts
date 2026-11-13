// Settings for the relayer, from Blockchain/relayer/.env (see .env.example).
import fs from "node:fs";
import path from "node:path";
import { getAddress, isAddress, type Address, type Hex } from "viem";

export const RELAYER_DIR = path.resolve(__dirname, "..");
export const BLOCKCHAIN_DIR = path.resolve(RELAYER_DIR, "..");
export const ENV_PATH = path.join(RELAYER_DIR, ".env");

export type NetworkName = "localhost" | "baseSepolia";

export const NETWORKS: Record<NetworkName, { chainId: number; defaultRpc: string }> = {
  localhost: { chainId: 31337, defaultRpc: "http://127.0.0.1:8545" },
  baseSepolia: { chainId: 84532, defaultRpc: "https://sepolia.base.org" },
};

export interface RelayerConfig {
  network: NetworkName;
  chainId: number;
  rpcUrl: string;
  /** Pays the gas. Optional on localhost: then the node's first unlocked account is used. */
  relayerPrivateKey?: Hex;
  oracle: Address;
  /** Where the oracle address came from, for the start-up banner. */
  oracleSource: string;
  meterId: number;
  brokers: string[];
  topic: string;
  recordDir: string;
  /** Software meter (demo backup) only. */
  demoDevicePrivateKey?: Hex;
  replayIntervalS: number;
}

const PRIVATE_KEY = /^0x[0-9a-fA-F]{64}$/;

/** Reads Blockchain/relayer/.env into process.env (if it exists). Shell variables win. */
export function loadEnvFile(file = ENV_PATH): void {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

export function optionalKey(env: NodeJS.ProcessEnv, name: string): Hex | undefined {
  const value = env[name]?.trim();
  if (!value) return undefined;
  const key = value.startsWith("0x") ? value : `0x${value}`;
  if (!PRIVATE_KEY.test(key)) throw new Error(`${name} must be a 32-byte hex private key (0x + 64 hex characters)`);
  return key as Hex;
}

/** The MeterOracle address from deployments/<network>.json, written by scripts/deploy.ts. */
export function oracleFromDeployments(file: string): Address {
  if (!fs.existsSync(file)) {
    throw new Error(
      `Can't find ${file}. Deploy first (npm run deploy:local), or set ORACLE_ADDRESS in relayer/.env.`,
    );
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const address = json?.contracts?.MeterOracle?.address;
  if (typeof address !== "string" || !isAddress(address)) {
    throw new Error(`${file} has no contracts.MeterOracle.address`);
  }
  return getAddress(address);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RelayerConfig {
  const network = (env.NETWORK?.trim() || "localhost") as NetworkName;
  if (!(network in NETWORKS)) {
    throw new Error(`NETWORK must be one of ${Object.keys(NETWORKS).join(", ")}, not "${network}"`);
  }
  const { chainId, defaultRpc } = NETWORKS[network];

  const relayerPrivateKey = optionalKey(env, "RELAYER_PRIVATE_KEY");
  if (!relayerPrivateKey && network !== "localhost") {
    throw new Error(
      `RELAYER_PRIVATE_KEY is required on ${network}: it is the wallet that pays the gas. ` +
        "Use a testnet-only wallet with a little Base Sepolia ETH.",
    );
  }

  let oracle: Address;
  let oracleSource: string;
  if (env.ORACLE_ADDRESS?.trim()) {
    if (!isAddress(env.ORACLE_ADDRESS.trim())) throw new Error("ORACLE_ADDRESS is not a valid address");
    oracle = getAddress(env.ORACLE_ADDRESS.trim());
    oracleSource = "ORACLE_ADDRESS";
  } else {
    const file = path.resolve(
      RELAYER_DIR,
      env.DEPLOYMENTS_FILE?.trim() || path.join("..", "deployments", `${network}.json`),
    );
    oracle = oracleFromDeployments(file);
    oracleSource = path.relative(BLOCKCHAIN_DIR, file);
  }

  const meterId = Number(env.METER_ID?.trim() || "1");
  if (!Number.isInteger(meterId) || meterId < 0) throw new Error("METER_ID must be a whole number");

  const brokers = (env.MQTT_BROKERS?.trim() || "mqtt://test.mosquitto.org:1883,mqtt://broker.hivemq.com:1883")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  const replayIntervalS = Number(env.REPLAY_INTERVAL_S?.trim() || "6");
  if (!(replayIntervalS > 0)) throw new Error("REPLAY_INTERVAL_S must be a positive number of seconds");

  return {
    network,
    chainId,
    rpcUrl: env.RPC_URL?.trim() || defaultRpc,
    relayerPrivateKey,
    oracle,
    oracleSource,
    meterId,
    brokers,
    topic: env.MQTT_TOPIC?.trim() || `solarshare/meter/${meterId}/reading`,
    recordDir: path.resolve(RELAYER_DIR, env.RECORD_DIR?.trim() || "recordings"),
    demoDevicePrivateKey: optionalKey(env, "DEMO_DEVICE_PRIVATE_KEY"),
    replayIntervalS,
  };
}
