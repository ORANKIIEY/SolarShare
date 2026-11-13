// Shared logic for SolarShare meter messages: the EIP-712 definition, a strict
// shape check, and signature recovery. The relayer (#14) can copy this.
//
// The message format is documented in ../MESSAGE_FORMAT.md.

import { getAddress, hashTypedData, isAddress, recoverTypedDataAddress } from "viem";

export const CHAIN_ID = 84532; // Base Sepolia
export const PLACEHOLDER_CONTRACT = "0x1111111111111111111111111111111111111111";
export const TEST_DEVICE = "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3";

// Field order matters: it is part of the signed type string.
export const TYPES = {
  MeterReading: [
    { name: "meterId", type: "uint32" },
    { name: "seq", type: "uint64" },
    { name: "timestamp", type: "uint64" },
    { name: "energyProducedWh", type: "uint64" },
    { name: "energySoldWh", type: "uint64" },
    { name: "powerW", type: "uint32" },
    { name: "tamper", type: "bool" },
  ],
};

export function domain(verifyingContract) {
  return {
    name: "SolarShare MeterOracle",
    version: "1",
    chainId: CHAIN_ID,
    verifyingContract: getAddress(verifyingContract),
  };
}

const SECP256K1_HALF_N = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n;
const UINT64_MAX = 2n ** 64n - 1n;
const UINT32_MAX = 2 ** 32 - 1;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const DECIMAL = /^(0|[1-9][0-9]*)$/;

function u64(value, name, errors) {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    errors.push(`${name} must be a decimal string`);
    return 0n;
  }
  const n = BigInt(value);
  if (n > UINT64_MAX) errors.push(`${name} is bigger than uint64`);
  return n;
}

function u32(value, name, errors) {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    errors.push(`${name} must be a whole number from 0 to ${UINT32_MAX}`);
    return 0;
  }
  return value;
}

/**
 * Checks the shape of one message and converts it to typed values.
 * Returns { ok, errors, reading, r, s, device }.
 */
export function parseMessage(text) {
  const errors = [];
  let obj;
  try {
    obj = typeof text === "string" ? JSON.parse(text) : text;
  } catch {
    return { ok: false, errors: ["not valid JSON"] };
  }
  const raw = obj?.reading;
  const sig = obj?.signature;
  if (typeof raw !== "object" || raw === null) errors.push("missing reading");
  if (typeof sig !== "object" || sig === null) errors.push("missing signature");
  if (errors.length) return { ok: false, errors };

  const reading = {
    meterId: u32(raw.meterId, "meterId", errors),
    seq: u64(raw.seq, "seq", errors),
    timestamp: u64(raw.timestamp, "timestamp", errors),
    energyProducedWh: u64(raw.energyProducedWh, "energyProducedWh", errors),
    energySoldWh: u64(raw.energySoldWh, "energySoldWh", errors),
    powerW: u32(raw.powerW, "powerW", errors),
    tamper: raw.tamper,
  };
  if (typeof raw.tamper !== "boolean") errors.push("tamper must be true or false");
  if (typeof sig.r !== "string" || !BYTES32.test(sig.r)) errors.push("signature.r must be 0x + 64 hex");
  if (typeof sig.s !== "string" || !BYTES32.test(sig.s)) errors.push("signature.s must be 0x + 64 hex");
  else if (BigInt(sig.s) > SECP256K1_HALF_N) errors.push("signature.s is not low-s (Ethereum rejects it)");
  if (typeof obj.device !== "string" || !isAddress(obj.device, { strict: false }))
    errors.push("device must be an address");

  return {
    ok: errors.length === 0,
    errors,
    reading,
    r: sig.r,
    s: sig.s,
    device: errors.length === 0 ? getAddress(obj.device) : undefined,
  };
}

/** The EIP-712 digest the meter signed. */
export function digestOf(reading, verifyingContract) {
  return hashTypedData({
    domain: domain(verifyingContract),
    types: TYPES,
    primaryType: "MeterReading",
    message: reading,
  });
}

/**
 * The meter sends only r and s. Ethereum also needs v (27 or 28), so try both
 * and see which one gives back the expected device address.
 * Returns { valid, v, signature (65-byte hex), recovered: [addr27, addr28] }.
 */
export async function recoverSigner({ reading, r, s }, verifyingContract, expectedDevice) {
  const expected = getAddress(expectedDevice);
  const recovered = [];
  for (const v of [27, 28]) {
    const signature = `${r}${s.slice(2)}${v.toString(16)}`;
    const address = await recoverTypedDataAddress({
      domain: domain(verifyingContract),
      types: TYPES,
      primaryType: "MeterReading",
      message: reading,
      signature,
    });
    recovered.push(address);
    if (address === expected) return { valid: true, v, signature, recovered };
  }
  return { valid: false, v: undefined, signature: undefined, recovered };
}
