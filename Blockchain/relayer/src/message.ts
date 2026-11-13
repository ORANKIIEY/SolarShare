// The meter's MQTT message: shape check, EIP-712 definition, and working out
// the missing `v` of the signature.
//
// Format: Hardware/wokwi-meter/MESSAGE_FORMAT.md. This is a TypeScript port of
// Hardware/wokwi-meter/tools/reading.mjs, with the domain taken from the
// deployed oracle instead of being hard-coded.
import {
  getAddress,
  hashTypedData,
  isAddress,
  parseSignature,
  recoverAddress,
  type Address,
  type Hex,
} from "viem";
import type { PrivateKeyAccount } from "viem/accounts";

export interface MeterReading {
  meterId: number;
  seq: bigint;
  timestamp: bigint;
  energyProducedWh: bigint;
  energySoldWh: bigint;
  powerW: number;
  tamper: boolean;
}

/** A message that passed the shape check. Not yet checked against the oracle. */
export interface ParsedMessage {
  reading: MeterReading;
  r: Hex;
  s: Hex;
  /** What the message claims. Informational only: never trust it. */
  device: Address;
}

export type ParseResult =
  | { ok: true; message: ParsedMessage }
  | { ok: false; errors: string[] };

/** The EIP-712 domain the meter signs with. Read it from the oracle (eip712Domain()). */
export interface OracleDomain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: Address;
}

// Field order matters: it is part of the signed type string.
export const METER_READING_TYPES = {
  MeterReading: [
    { name: "meterId", type: "uint32" },
    { name: "seq", type: "uint64" },
    { name: "timestamp", type: "uint64" },
    { name: "energyProducedWh", type: "uint64" },
    { name: "energySoldWh", type: "uint64" },
    { name: "powerW", type: "uint32" },
    { name: "tamper", type: "bool" },
  ],
} as const;

export const DOMAIN_NAME = "SolarShare MeterOracle";
export const DOMAIN_VERSION = "1";

const SECP256K1_HALF_N = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
const UINT64_MAX = 2n ** 64n - 1n;
const UINT32_MAX = 2 ** 32 - 1;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;
/** Bigger than any real meter message (about 450 bytes). */
const MAX_MESSAGE_BYTES = 4096;

function u64(value: unknown, name: string, errors: string[]): bigint {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    errors.push(`${name} must be a decimal string`);
    return 0n;
  }
  const n = BigInt(value);
  if (n > UINT64_MAX) errors.push(`${name} is bigger than uint64`);
  return n;
}

function u32(value: unknown, name: string, errors: string[]): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    errors.push(`${name} must be a whole number from 0 to ${UINT32_MAX}`);
    return 0;
  }
  return value;
}

/** Checks the shape of one message (a JSON string, Buffer or object) and converts it to typed values. */
export function parseMessage(input: string | Uint8Array | object): ParseResult {
  let obj: any;
  if (typeof input === "string" || input instanceof Uint8Array) {
    const text = typeof input === "string" ? input : Buffer.from(input).toString("utf8");
    if (Buffer.byteLength(text, "utf8") > MAX_MESSAGE_BYTES) {
      return { ok: false, errors: [`message is larger than ${MAX_MESSAGE_BYTES} bytes`] };
    }
    try {
      obj = JSON.parse(text);
    } catch {
      return { ok: false, errors: ["not valid JSON"] };
    }
  } else {
    obj = input;
  }

  const errors: string[] = [];
  const raw = obj?.reading;
  const sig = obj?.signature;
  if (typeof raw !== "object" || raw === null) errors.push("missing reading");
  if (typeof sig !== "object" || sig === null) errors.push("missing signature");
  if (errors.length) return { ok: false, errors };

  const reading: MeterReading = {
    meterId: u32(raw.meterId, "meterId", errors),
    seq: u64(raw.seq, "seq", errors),
    timestamp: u64(raw.timestamp, "timestamp", errors),
    energyProducedWh: u64(raw.energyProducedWh, "energyProducedWh", errors),
    energySoldWh: u64(raw.energySoldWh, "energySoldWh", errors),
    powerW: u32(raw.powerW, "powerW", errors),
    tamper: raw.tamper === true,
  };
  if (typeof raw.tamper !== "boolean") errors.push("tamper must be true or false");
  if (typeof sig.r !== "string" || !BYTES32.test(sig.r)) errors.push("signature.r must be 0x + 64 hex");
  if (typeof sig.s !== "string" || !BYTES32.test(sig.s)) errors.push("signature.s must be 0x + 64 hex");
  else if (BigInt(sig.s) > SECP256K1_HALF_N) errors.push("signature.s is not low-s (Ethereum rejects it)");
  if (typeof obj.device !== "string" || !isAddress(obj.device, { strict: false })) {
    errors.push("device must be an address");
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    message: {
      reading,
      r: sig.r.toLowerCase() as Hex,
      s: sig.s.toLowerCase() as Hex,
      device: getAddress(obj.device),
    },
  };
}

/** The EIP-712 digest the meter signed. Same value as MeterOracle.readingDigest(reading). */
export function digestOf(reading: MeterReading, domain: OracleDomain): Hex {
  return hashTypedData({
    domain,
    types: METER_READING_TYPES,
    primaryType: "MeterReading",
    message: reading,
  });
}

export type RecoverResult =
  | { valid: true; v: 27 | 28; recovered: Address[] }
  | { valid: false; recovered: Address[] };

/**
 * The meter sends only r and s. Ethereum also needs v (27 or 28): try both and
 * keep the one that gives back the device address registered in the oracle.
 */
export async function recoverV(
  message: Pick<ParsedMessage, "reading" | "r" | "s">,
  domain: OracleDomain,
  expectedDevice: Address,
): Promise<RecoverResult> {
  const expected = getAddress(expectedDevice);
  const hash = digestOf(message.reading, domain);
  const recovered: Address[] = [];
  for (const v of [27, 28] as const) {
    let address: Address;
    try {
      address = await recoverAddress({ hash, signature: { r: message.r, s: message.s, v: BigInt(v) } });
    } catch {
      continue; // r is not a valid curve point for this v
    }
    recovered.push(address);
    if (address === expected) return { valid: true, v, recovered };
  }
  return { valid: false, recovered };
}

/** Wire format, exactly like the meter publishes it (64-bit values as decimal strings). */
export interface WireMessage {
  reading: {
    meterId: number;
    seq: string;
    timestamp: string;
    energyProducedWh: string;
    energySoldWh: string;
    powerW: number;
    tamper: boolean;
  };
  signature: { r: Hex; s: Hex };
  device: Address;
}

export function toWire(message: ParsedMessage): WireMessage {
  const { reading } = message;
  return {
    reading: {
      meterId: reading.meterId,
      seq: reading.seq.toString(),
      timestamp: reading.timestamp.toString(),
      energyProducedWh: reading.energyProducedWh.toString(),
      energySoldWh: reading.energySoldWh.toString(),
      powerW: reading.powerW,
      tamper: reading.tamper,
    },
    signature: { r: message.r, s: message.s },
    device: message.device,
  };
}

/**
 * Signs a reading the way the ESP32 does (EIP-712, low-s) and drops `v`, so
 * the result goes through exactly the same path as a real meter message.
 * Used by the software meter (demo backup) and the tests.
 */
export async function signLikeMeter(
  reading: MeterReading,
  domain: OracleDomain,
  device: PrivateKeyAccount,
): Promise<WireMessage> {
  const signature = await device.signTypedData({
    domain,
    types: METER_READING_TYPES,
    primaryType: "MeterReading",
    message: reading,
  });
  const { r, s } = parseSignature(signature); // viem always produces low-s
  return toWire({ reading, r, s, device: device.address });
}

/** One-line summary of a reading for the console. */
export function describeReading(reading: MeterReading): string {
  const flags = reading.tamper ? "  TAMPER SWITCH OPEN" : "";
  return (
    `meter ${reading.meterId} seq ${reading.seq}  ` +
    `produced ${reading.energyProducedWh} Wh  sold ${reading.energySoldWh} Wh  ` +
    `${reading.powerW} W${flags}`
  );
}
