// Relayer unit tests: message parsing and working out `v`.
// No chain needed. Run with the rest: `npm test`.
import { expect } from "chai";
import { getAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  digestOf,
  parseMessage,
  recoverV,
  signLikeMeter,
  toWire,
  type MeterReading,
  type OracleDomain,
} from "../../relayer/src/message";

// A real message from the Wokwi meter (Hardware/wokwi-meter/MESSAGE_FORMAT.md),
// signed for the placeholder contract 0x1111...1111 on Base Sepolia.
const WOKWI_MESSAGE = {
  reading: {
    meterId: 1,
    seq: "1794529617",
    timestamp: "1794529908",
    energyProducedWh: "417",
    energySoldWh: "387",
    powerW: 5006,
    tamper: false,
  },
  signature: {
    r: "0x0b757cec4ba4e1a82e36c04ac8e94c10d618f8670a4f0774fcab4fe996425932",
    s: "0x254bec648514a375788336d6512721bd9efda7412cc12a8d0f216dd508b1ef66",
  },
  device: "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3",
};
const WOKWI_DEVICE = getAddress("0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3");
const PLACEHOLDER_DOMAIN: OracleDomain = {
  name: "SolarShare MeterOracle",
  version: "1",
  chainId: 84532,
  verifyingContract: "0x1111111111111111111111111111111111111111",
};

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

describe("relayer: message parsing", function () {
  it("parses the real Wokwi message into typed values", function () {
    const result = parseMessage(JSON.stringify(WOKWI_MESSAGE));
    expect(result.ok).to.equal(true);
    if (!result.ok) return;
    expect(result.message.reading).to.deep.equal({
      meterId: 1,
      seq: 1794529617n,
      timestamp: 1794529908n,
      energyProducedWh: 417n,
      energySoldWh: 387n,
      powerW: 5006,
      tamper: false,
    });
    expect(result.message.device).to.equal(WOKWI_DEVICE);
  });

  it("accepts a Buffer (what MQTT delivers) and an object", function () {
    expect(parseMessage(Buffer.from(JSON.stringify(WOKWI_MESSAGE))).ok).to.equal(true);
    expect(parseMessage(WOKWI_MESSAGE).ok).to.equal(true);
  });

  it("round-trips through the wire format unchanged", function () {
    const result = parseMessage(WOKWI_MESSAGE);
    if (!result.ok) throw new Error("should parse");
    expect(toWire(result.message)).to.deep.equal(WOKWI_MESSAGE);
  });

  it("keeps 64-bit values exact (beyond JavaScript's 2^53)", function () {
    const msg = clone(WOKWI_MESSAGE);
    msg.reading.energyProducedWh = "18446744073709551615"; // uint64 max
    const result = parseMessage(msg);
    expect(result.ok).to.equal(true);
    if (result.ok) expect(result.message.reading.energyProducedWh).to.equal(2n ** 64n - 1n);
  });

  const bad: Array<[string, (m: any) => void, string]> = [
    ["seq sent as a number", (m) => (m.reading.seq = 1794529617), "seq must be a decimal string"],
    ["negative energy", (m) => (m.reading.energySoldWh = "-5"), "energySoldWh must be a decimal string"],
    ["hex instead of decimal", (m) => (m.reading.timestamp = "0x10"), "timestamp must be a decimal string"],
    ["leading zero", (m) => (m.reading.seq = "01"), "seq must be a decimal string"],
    ["value above uint64", (m) => (m.reading.seq = "18446744073709551616"), "seq is bigger than uint64"],
    ["fractional power", (m) => (m.reading.powerW = 12.5), "powerW must be a whole number"],
    ["meterId as a string", (m) => (m.reading.meterId = "1"), "meterId must be a whole number"],
    ["tamper as a string", (m) => (m.reading.tamper = "false"), "tamper must be true or false"],
    ["short r", (m) => (m.signature.r = "0x1234"), "signature.r must be 0x + 64 hex"],
    ["missing s", (m) => delete m.signature.s, "signature.s must be 0x + 64 hex"],
    [
      "high-s signature",
      (m) => (m.signature.s = "0x" + "f".repeat(64)),
      "signature.s is not low-s",
    ],
    ["bad device", (m) => (m.device = "0x1234"), "device must be an address"],
    ["no reading", (m) => delete m.reading, "missing reading"],
    ["no signature", (m) => delete m.signature, "missing signature"],
  ];
  for (const [name, mutate, error] of bad) {
    it(`rejects ${name}`, function () {
      const msg = clone(WOKWI_MESSAGE);
      mutate(msg);
      const result = parseMessage(JSON.stringify(msg));
      expect(result.ok).to.equal(false);
      if (!result.ok) expect(result.errors.join("; ")).to.contain(error);
    });
  }

  it("rejects text that isn't JSON, and oversized messages", function () {
    const notJson = parseMessage("hello meter");
    expect(notJson.ok).to.equal(false);
    if (!notJson.ok) expect(notJson.errors).to.deep.equal(["not valid JSON"]);
    const huge = parseMessage(JSON.stringify({ ...WOKWI_MESSAGE, junk: "x".repeat(10_000) }));
    expect(huge.ok).to.equal(false);
  });
});

describe("relayer: working out v", function () {
  it("matches the documented digest and recovers the Wokwi device with v = 28", async function () {
    const result = parseMessage(WOKWI_MESSAGE);
    if (!result.ok) throw new Error("should parse");
    expect(digestOf(result.message.reading, PLACEHOLDER_DOMAIN)).to.equal(
      "0x9f48f4c8afd38085fcdcb73561af3eac8f9e1d05d4af4816558f1e3b0383d03e",
    );
    const rec = await recoverV(result.message, PLACEHOLDER_DOMAIN, WOKWI_DEVICE);
    expect(rec.valid).to.equal(true);
    if (rec.valid) expect(rec.v).to.equal(28);
  });

  it("finds v = 27 and v = 28 for readings signed in Node", async function () {
    const device = privateKeyToAccount(generatePrivateKey());
    const domain: OracleDomain = { ...PLACEHOLDER_DOMAIN, chainId: 31337 };
    const seen = new Set<number>();
    for (let seq = 1n; seq <= 40n && seen.size < 2; seq++) {
      const reading: MeterReading = {
        meterId: 1,
        seq,
        timestamp: 1_800_000_000n + seq,
        energyProducedWh: seq * 42n,
        energySoldWh: seq * 39n,
        powerW: 5000,
        tamper: false,
      };
      const wire = await signLikeMeter(reading, domain, device);
      expect(wire).to.not.have.nested.property("signature.v");
      const parsed = parseMessage(JSON.stringify(wire));
      if (!parsed.ok) throw new Error(parsed.errors.join("; "));
      const rec = await recoverV(parsed.message, domain, device.address);
      expect(rec.valid, `seq ${seq}`).to.equal(true);
      if (rec.valid) seen.add(rec.v);
    }
    expect([...seen].sort()).to.deep.equal([27, 28]);
  });

  it("rejects a message with one number changed after signing", async function () {
    const msg = clone(WOKWI_MESSAGE);
    msg.reading.energySoldWh = "417"; // pretend nothing was stolen
    const parsed = parseMessage(msg);
    if (!parsed.ok) throw new Error("shape is still fine");
    const rec = await recoverV(parsed.message, PLACEHOLDER_DOMAIN, WOKWI_DEVICE);
    expect(rec.valid).to.equal(false);
    expect(rec.recovered).to.not.include(WOKWI_DEVICE);
  });

  it("rejects a reading signed for a different contract or chain", async function () {
    const parsed = parseMessage(WOKWI_MESSAGE);
    if (!parsed.ok) throw new Error("should parse");
    const otherContract = { ...PLACEHOLDER_DOMAIN, verifyingContract: "0x2222222222222222222222222222222222222222" as Hex };
    const otherChain = { ...PLACEHOLDER_DOMAIN, chainId: 31337 };
    expect((await recoverV(parsed.message, otherContract, WOKWI_DEVICE)).valid).to.equal(false);
    expect((await recoverV(parsed.message, otherChain, WOKWI_DEVICE)).valid).to.equal(false);
  });

  it("rejects a valid signature from a different device", async function () {
    const parsed = parseMessage(WOKWI_MESSAGE);
    if (!parsed.ok) throw new Error("should parse");
    const someoneElse = privateKeyToAccount(generatePrivateKey()).address;
    expect((await recoverV(parsed.message, PLACEHOLDER_DOMAIN, someoneElse)).valid).to.equal(false);
  });
});
