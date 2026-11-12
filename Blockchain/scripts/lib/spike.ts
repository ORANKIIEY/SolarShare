import type { Address } from "viem";

// Must match Hardware/wokwi-spike/sketch.ino exactly.
export const SPIKE_DOMAIN = {
  name: "SolarShare MeterOracle",
  version: "1",
  chainId: 84532,
  // FIXED PLACEHOLDER for the spike. The real MeterOracle address replaces it.
  verifyingContract: "0x1111111111111111111111111111111111111111" as Address,
} as const;

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
