// Relayer end-to-end on the in-memory Hardhat chain: the real MeterOracle,
// the real Relayer pipeline, and the software meter as the device.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { meterOracleAbi } from "../../relayer/src/abi";
import { parseMessage, signLikeMeter } from "../../relayer/src/message";
import { Recorder } from "../../relayer/src/recorder";
import { Relayer, type Outcome } from "../../relayer/src/relayer";
import {
  demoScenario,
  NORMAL_SOLD_RATIO,
  SoftwareMeter,
  step,
  stepsFromRecording,
} from "../../relayer/src/softwareMeter";
import fullAbi from "../../interface/abi/MeterOracle.json";

const DEVICE_KEY = generatePrivateKey(); // throwaway, per test run

async function deployOracle() {
  const [admin] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const device = privateKeyToAccount(DEVICE_KEY);
  const oracle = await hre.viem.deployContract("MeterOracle", [admin.account.address, 1, device.address]);
  return { admin, publicClient, device, oracle };
}

async function setup(records: string[] = []) {
  const { admin, publicClient, device, oracle } = await loadFixture(deployOracle);
  const relayer = new Relayer({
    publicClient: publicClient as any,
    walletClient: admin as any,
    oracle: oracle.address,
    retryDelayMs: 10,
    log: process.env.DEBUG_RELAYER ? console : undefined,
  });
  await relayer.init();
  const meter = new SoftwareMeter({
    relayer,
    device,
    publicClient: publicClient as any,
    walletClient: admin as any,
    log: { info() {}, warn() {}, error() {} },
    intervalMs: 0,
    onMessage: (p) => records.push(p),
  });
  return { relayer, meter, oracle, device, publicClient };
}

const kinds = (outcomes: Outcome[]) => outcomes.map((o) => o.kind);
const statuses = (outcomes: Outcome[]) => outcomes.map((o) => (o.kind === "accepted" ? o.status : o.kind));

describe("relayer: end to end on a local chain", function () {
  it("uses only functions and errors that exist in MeterOracle's ABI", function () {
    const sig = (x: any) => `${x.type} ${x.name}(${(x.inputs ?? []).map((i: any) => i.type).join(",")})`;
    const known = new Set((fullAbi as any[]).map(sig));
    for (const item of meterOracleAbi) expect(known, sig(item)).to.include(sig(item));
  });

  it("relays readings and the status follows the oracle", async function () {
    const { relayer, meter, oracle } = await setup();
    const outcome = await meter.send(step("normal", 5000, NORMAL_SOLD_RATIO));
    expect(outcome.kind).to.equal("accepted");
    if (outcome.kind !== "accepted") return;
    expect(outcome.previousStatus).to.equal("OFFLINE"); // no reading yet
    expect(outcome.status).to.equal("OK");
    expect(await oracle.read.lastSeq()).to.equal(outcome.reading.seq);
    expect(await oracle.read.totalProducedWh()).to.equal(42n);
    expect(relayer.state.totalSoldWh).to.equal(39n);
  });

  it("demo sequence: normal -> THEFT -> back to OK", async function () {
    const { meter } = await setup();
    const outcomes = await meter.run(demoScenario());
    expect(kinds(outcomes).every((k) => k === "accepted")).to.equal(true);
    expect(statuses(outcomes)).to.deep.equal([
      "OK", "OK", "OK", "OK", // normal
      "THEFT", "THEFT", "THEFT", // illegal connection
      "OK", "OK", "OK", // recovery
    ]);
  });

  it("full demo: tamper needs an admin, silence turns OFFLINE, then OK", async function () {
    const { meter, relayer } = await setup();
    const outcomes = await meter.run(demoScenario({ tamper: true, offline: true }));
    expect(statuses(outcomes).slice(10)).to.deep.equal([
      "TAMPER", "TAMPER", // tamper reading, then a normal one: still TAMPER
      "OK", // after the admin's clearTamper
      "OK", "OK", // after the silence
    ]);
    expect(relayer.state.status).to.equal(0);
  });

  it("rejects a tampered message (one number changed) without sending it", async function () {
    const { relayer, meter, oracle, publicClient } = await setup();
    await meter.send(step("normal", 5000, NORMAL_SOLD_RATIO));
    const records: string[] = [];
    const forged = await signLikeMeter(
      {
        meterId: 1,
        seq: relayer.state.lastSeq + 1n,
        timestamp: relayer.state.lastTimestamp + 1n,
        energyProducedWh: relayer.state.totalProducedWh + 42n,
        energySoldWh: relayer.state.totalSoldWh + 25n, // theft...
        powerW: 5000,
        tamper: false,
      },
      relayer.domain,
      privateKeyToAccount(DEVICE_KEY),
    );
    forged.reading.energySoldWh = (relayer.state.totalSoldWh + 39n).toString(); // ...hidden after signing
    records.push(JSON.stringify(forged));
    const blockBefore = await publicClient.getBlockNumber();

    const outcome = await relayer.handle(records[0], "test");
    expect(outcome.kind).to.equal("rejected");
    if (outcome.kind === "rejected") expect(outcome.reason).to.equal("InvalidSigner");
    expect(await publicClient.getBlockNumber()).to.equal(blockBefore); // nothing was sent

    // The forgery did not "use up" its seq: the genuine reading still goes through.
    forged.reading.energySoldWh = (relayer.state.totalSoldWh + 25n).toString();
    const genuine = await relayer.handle(JSON.stringify(forged), "test");
    expect(genuine.kind).to.equal("accepted");
    expect(await oracle.read.theftActive()).to.equal(true);
  });

  it("skips a duplicate seq (same reading from both brokers)", async function () {
    const records: string[] = [];
    const { relayer, meter, publicClient } = await setup(records);
    await meter.send(step("normal", 5000, NORMAL_SOLD_RATIO));
    const blockBefore = await publicClient.getBlockNumber();

    const again = await relayer.handle(records[0], "broker.hivemq.com");
    expect(again.kind).to.equal("skipped");
    if (again.kind === "skipped") expect(again.reason).to.equal("duplicate");

    // A brand-new relayer (restarted) learns lastSeq from the chain instead.
    const fresh = new Relayer({ publicClient: publicClient as any, walletClient: (await hre.viem.getWalletClients())[1] as any, oracle: relayer.oracle });
    await fresh.init();
    const replayed = await fresh.handle(records[0], "test");
    expect(replayed.kind).to.equal("skipped");
    if (replayed.kind === "skipped") expect(replayed.reason).to.equal("already-onchain");
    expect(await publicClient.getBlockNumber()).to.equal(blockBefore);
  });

  it("handles a burst of copies arriving at once: one transaction", async function () {
    const records: string[] = [];
    const { relayer, meter, publicClient } = await setup(records);
    await meter.send(step("normal", 5000, NORMAL_SOLD_RATIO));
    const next = await signLikeMeter(
      { ...parseOk(records[0]), seq: relayer.state.lastSeq + 1n, energyProducedWh: relayer.state.totalProducedWh + 40n, energySoldWh: relayer.state.totalSoldWh + 37n },
      relayer.domain,
      privateKeyToAccount(DEVICE_KEY),
    );
    const blockBefore = await publicClient.getBlockNumber();
    const results = await Promise.all([1, 2, 3].map(() => relayer.handle(JSON.stringify(next), "burst")));
    expect(kinds(results).sort()).to.deep.equal(["accepted", "skipped", "skipped"]);
    expect(await publicClient.getBlockNumber()).to.equal(blockBefore + 1n);
  });

  it("skips readings the contract would reject, and says why", async function () {
    const { relayer, meter, publicClient } = await setup();
    await meter.send(step("normal", 5000, NORMAL_SOLD_RATIO));
    const device = privateKeyToAccount(DEVICE_KEY);
    const base = {
      meterId: 1,
      seq: relayer.state.lastSeq + 10n,
      timestamp: relayer.state.lastTimestamp,
      energyProducedWh: relayer.state.totalProducedWh,
      energySoldWh: relayer.state.totalSoldWh,
      powerW: 5000,
      tamper: false,
    };
    const blockBefore = await publicClient.getBlockNumber();
    const cases = [
      [{ energyProducedWh: base.energyProducedWh - 1n }, "EnergyWentDown"],
      [{ timestamp: base.timestamp - 1n }, "TimestampTooOld"],
      [{ timestamp: base.timestamp + 3600n }, "TimestampInFuture"],
      [{ powerW: 10_001 }, "PowerTooHigh"],
    ] as const;
    let seq = base.seq;
    for (const [change, reason] of cases) {
      const wire = await signLikeMeter({ ...base, seq: seq++, ...change }, relayer.domain, device);
      const outcome = await relayer.handle(JSON.stringify(wire), "test");
      expect(outcome.kind, `${reason}: ${(outcome as any).text}`).to.equal("rejected");
      if (outcome.kind === "rejected") expect(outcome.reason).to.equal(reason);
    }
    const wrongMeter = await signLikeMeter({ ...base, seq, meterId: 2 }, relayer.domain, device);
    expect((await relayer.handle(JSON.stringify(wrongMeter))).kind).to.equal("rejected");
    expect(await publicClient.getBlockNumber()).to.equal(blockBefore); // no gas wasted
  });

  it("follows a device change made while running (setDevice)", async function () {
    const { relayer, oracle } = await setup();
    const newDevice = privateKeyToAccount(generatePrivateKey());
    await oracle.write.setDevice([1, newDevice.address]);
    const wire = await signLikeMeter(
      { meterId: 1, seq: 5n, timestamp: BigInt((await hre.viem.getPublicClient().then((c) => c.getBlock())).timestamp), energyProducedWh: 10n, energySoldWh: 9n, powerW: 100, tamper: false },
      relayer.domain,
      newDevice,
    );
    expect((await relayer.handle(JSON.stringify(wire))).kind).to.equal("accepted");
  });

  /** The admin wallet, but writeContract misbehaves on the first call. */
  async function flakyWallet(mode: "fail-before-send" | "lose-reply") {
    const [admin] = await hre.viem.getWalletClients();
    let calls = 0;
    return new Proxy(admin, {
      get(target, prop, receiver) {
        if (prop !== "writeContract") return Reflect.get(target, prop, receiver);
        return async (args: any) => {
          calls++;
          if (calls === 1 && mode === "fail-before-send") throw new Error("fetch failed (network down)");
          const hash = await target.writeContract(args);
          if (calls === 1 && mode === "lose-reply") throw new Error("request timed out");
          return hash;
        };
      },
    });
  }

  for (const mode of ["fail-before-send", "lose-reply"] as const) {
    it(`retries safely when the RPC fails (${mode}) and sends only one transaction`, async function () {
      const { relayer, publicClient, oracle } = await setup();
      const flaky = new Relayer({
        publicClient: publicClient as any,
        walletClient: (await flakyWallet(mode)) as any,
        oracle: relayer.oracle,
        retryDelayMs: 10,
      });
      await flaky.init();
      const block = await publicClient.getBlock();
      const wire = await signLikeMeter(
        { meterId: 1, seq: 1n, timestamp: block.timestamp, energyProducedWh: 42n, energySoldWh: 39n, powerW: 5000, tamper: false },
        flaky.domain,
        privateKeyToAccount(DEVICE_KEY),
      );
      const outcome = await flaky.handle(JSON.stringify(wire));
      expect(outcome.kind).to.equal(mode === "lose-reply" ? "skipped" : "accepted");
      expect(await oracle.read.lastSeq()).to.equal(1n);
      expect(await publicClient.getBlockNumber()).to.equal(block.number + 1n); // exactly one transaction
    });
  }

  it("records messages and replays a recording re-signed with fresh seq", async function () {
    const records: string[] = [];
    const { meter, relayer } = await setup(records);
    await meter.run(demoScenario());
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "solarshare-relayer-"));
    const recorder = new Recorder(dir);
    for (const r of records) recorder.write("software-meter", "solarshare/meter/1/reading", r);

    const lastSeqBefore = relayer.state.lastSeq;
    const steps = stepsFromRecording(recorder.file);
    expect(steps.filter((s) => s.kind === "reading")).to.have.length(9); // 10 readings -> 9 changes
    const outcomes = await meter.run(steps);
    expect(kinds(outcomes).every((k) => k === "accepted")).to.equal(true);
    expect(statuses(outcomes)).to.include("THEFT");
    expect(statuses(outcomes).at(-1)).to.equal("OK");
    expect(relayer.state.lastSeq > lastSeqBefore).to.equal(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

function parseOk(payload: string) {
  const parsed = parseMessage(payload);
  if (!parsed.ok) throw new Error(parsed.errors.join("; "));
  return parsed.message.reading;
}
