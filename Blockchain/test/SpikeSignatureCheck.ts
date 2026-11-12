import { expect } from "chai";
import hre from "hardhat";
import { getAddress, hashTypedData, parseSignature } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { METER_READING_TYPES, SPIKE_DOMAIN } from "../scripts/lib/spike";

// Output of Hardware/wokwi-spike/sketch.ino (same C code, built on a laptop).
// Replace with the real Wokwi serial output once it has been captured.
const DEVICE_VECTOR = {
  reading: {
    meterId: 1,
    seq: 42n,
    timestamp: 1794571200n,
    energyProducedWh: 12345678n,
    energySoldWh: 9876543n,
    powerW: 3250,
    tamper: false,
  },
  digest: "0xe98ebc9e122489931caf9283c996cffc1db85fbd34dd6eaba9022627c59eace4",
  r: "0x3e826be4688d0a73b174b51380c5f33f1d9484ae9d4fafb7033cc06574c62dd3",
  s: "0x39b6ed762fb58bc801fae95a0097c823b3c1fdf837ae06220a3fca927891200e",
  deviceAddress: "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3",
} as const;

describe("Spike: device-signed meter reading checked in Solidity (#4)", function () {
  async function deploy() {
    return hre.viem.deployContract("SpikeSignatureCheck");
  }

  it("rebuilds the same EIP-712 digest as the device", async function () {
    const spike = await deploy();
    expect(await spike.read.digest([DEVICE_VECTOR.reading])).to.equal(DEVICE_VECTOR.digest);
  });

  it("recovers the device address from the device's (r, s) with ecrecover", async function () {
    const spike = await deploy();
    // The device does not output v; the relay tries 27 and 28 and keeps the one that works.
    const recovered = await Promise.all(
      [27, 28].map((v) =>
        spike.read.recoverSigner([DEVICE_VECTOR.reading, v, DEVICE_VECTOR.r, DEVICE_VECTOR.s]),
      ),
    );
    expect(recovered.map((a) => getAddress(a))).to.include(DEVICE_VECTOR.deviceAddress);
  });

  it("agrees with viem for a reading with large 64-bit values and tamper=true", async function () {
    const spike = await deploy();
    const device = privateKeyToAccount(generatePrivateKey());
    const message = {
      meterId: 4294967295,
      seq: 18446744073709551615n,
      timestamp: 1794571200n,
      energyProducedWh: 5000000123n,
      energySoldWh: 4000000000n,
      powerW: 10000,
      tamper: true,
    };
    const typedData = { domain: SPIKE_DOMAIN, types: METER_READING_TYPES, primaryType: "MeterReading", message } as const;
    const { r, s, v } = parseSignature(await device.signTypedData(typedData));

    expect(await spike.read.digest([message])).to.equal(hashTypedData(typedData));
    expect(getAddress(await spike.read.recoverSigner([message, Number(v), r, s]))).to.equal(device.address);
  });

  it("rejects a changed reading (signature no longer matches the device)", async function () {
    const spike = await deploy();
    const tampered = { ...DEVICE_VECTOR.reading, energySoldWh: DEVICE_VECTOR.reading.energySoldWh + 1n };
    for (const v of [27, 28]) {
      const signer = await spike.read.recoverSigner([tampered, v, DEVICE_VECTOR.r, DEVICE_VECTOR.s]);
      expect(getAddress(signer)).to.not.equal(DEVICE_VECTOR.deviceAddress);
    }
  });
});
