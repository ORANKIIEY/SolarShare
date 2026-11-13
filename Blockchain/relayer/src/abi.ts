// The parts of MeterOracle the relayer uses, written out "as const" so viem can
// type-check every call. The full ABI is Blockchain/interface/abi/MeterOracle.json;
// test/relayer/abi.ts checks that everything here matches it.

const meterReadingTuple = {
  type: "tuple",
  name: "reading",
  components: [
    { name: "meterId", type: "uint32" },
    { name: "seq", type: "uint64" },
    { name: "timestamp", type: "uint64" },
    { name: "energyProducedWh", type: "uint64" },
    { name: "energySoldWh", type: "uint64" },
    { name: "powerW", type: "uint32" },
    { name: "tamper", type: "bool" },
  ],
} as const;

export const meterOracleAbi = [
  {
    type: "function",
    name: "submitReading",
    stateMutability: "nonpayable",
    inputs: [
      meterReadingTuple,
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMeterState",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple",
        name: "",
        components: [
          { name: "status", type: "uint8" },
          { name: "meterId", type: "uint32" },
          { name: "deviceSigner", type: "address" },
          { name: "lastSeq", type: "uint64" },
          { name: "lastTimestamp", type: "uint64" },
          { name: "totalProducedWh", type: "uint64" },
          { name: "totalSoldWh", type: "uint64" },
          { name: "lastPowerW", type: "uint32" },
          { name: "lastGapBps", type: "uint16" },
          { name: "theftActive", type: "bool" },
          { name: "tamperActive", type: "bool" },
          { name: "offline", type: "bool" },
          { name: "theftGapBps", type: "uint16" },
          { name: "offlineTimeout", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "eip712Domain",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "fields", type: "bytes1" },
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
      { name: "salt", type: "bytes32" },
      { name: "extensions", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "readingDigest",
    stateMutability: "view",
    inputs: [meterReadingTuple],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "clearTamper",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "setDevice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "meterId_", type: "uint32" },
      { name: "signer", type: "address" },
    ],
    outputs: [],
  },
  // Errors, so viem can name the reason when a reading would be rejected.
  { type: "error", name: "DeviceNotSet", inputs: [] },
  {
    type: "error",
    name: "WrongMeter",
    inputs: [
      { name: "got", type: "uint32" },
      { name: "expected", type: "uint32" },
    ],
  },
  { type: "error", name: "InvalidSigner", inputs: [{ name: "recovered", type: "address" }] },
  {
    type: "error",
    name: "SeqNotIncreasing",
    inputs: [
      { name: "seq", type: "uint64" },
      { name: "lastSeq", type: "uint64" },
    ],
  },
  { type: "error", name: "EnergyWentDown", inputs: [] },
  {
    type: "error",
    name: "TimestampTooOld",
    inputs: [
      { name: "timestamp", type: "uint64" },
      { name: "oldestAllowed", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "TimestampInFuture",
    inputs: [
      { name: "timestamp", type: "uint64" },
      { name: "latestAllowed", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "PowerTooHigh",
    inputs: [
      { name: "powerW", type: "uint32" },
      { name: "max", type: "uint32" },
    ],
  },
  { type: "error", name: "ECDSAInvalidSignature", inputs: [] },
  { type: "error", name: "ECDSAInvalidSignatureLength", inputs: [{ name: "length", type: "uint256" }] },
  { type: "error", name: "ECDSAInvalidSignatureS", inputs: [{ name: "s", type: "bytes32" }] },
  {
    type: "error",
    name: "AccessControlUnauthorizedAccount",
    inputs: [
      { name: "account", type: "address" },
      { name: "neededRole", type: "bytes32" },
    ],
  },
] as const;

/** MeterOracle.status() values. */
export const STATUS_NAMES = ["OK", "THEFT", "TAMPER", "OFFLINE"] as const;
export type StatusName = (typeof STATUS_NAMES)[number];

export function statusName(value: number): StatusName | `UNKNOWN(${number})` {
  return STATUS_NAMES[value] ?? `UNKNOWN(${value})`;
}

export const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
