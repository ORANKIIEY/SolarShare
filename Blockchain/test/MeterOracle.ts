import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getAddress, hashTypedData } from "viem";
import { METER_READING_TYPES } from "../scripts/lib/spike";
import { as, setup, Status } from "./helpers/fixture";

describe("MeterOracle (#7)", function () {
  describe("valid readings", function () {
    it("accepts a reading signed by the registered device", async function () {
      const w = await setup();
      const reading = await w.meter.next({ producedWh: 5000n, soldWh: 4600n, powerW: 6420 });
      await w.meter.submit(w, reading);

      expect(await w.oracle.read.lastSeq()).to.equal(1n);
      expect(await w.oracle.read.totalProducedWh()).to.equal(5000n);
      expect(await w.oracle.read.totalSoldWh()).to.equal(4600n);
      expect(await w.oracle.read.status()).to.equal(Status.OK);

      const [ev] = await w.oracle.getEvents.ReadingAccepted();
      expect(ev.args.seq).to.equal(1n);
      expect(ev.args.powerW).to.equal(6420);
      expect(ev.args.gapBps).to.equal(800); // 8% gap
      const [changed] = await w.oracle.getEvents.StatusChanged();
      expect(changed.args).to.deep.equal({ previous: Status.OFFLINE, current: Status.OK });
    });

    it("rebuilds the same EIP-712 digest as viem (and so as the ESP32)", async function () {
      const w = await setup();
      const reading = await w.meter.next();
      const expected = hashTypedData({
        domain: { name: "SolarShare MeterOracle", version: "1", chainId: w.chainId, verifyingContract: w.oracle.address },
        types: METER_READING_TYPES,
        primaryType: "MeterReading",
        message: reading,
      });
      expect(await w.oracle.read.readingDigest([reading])).to.equal(expected);
    });

    it("lets anyone relay a reading: only the device signature matters", async function () {
      const w = await setup();
      const reading = await w.meter.next();
      const { v, r, s } = await w.meter.sign(reading);
      const asMallory = await as("MeterOracle", w.oracle.address, w.mallory);
      await asMallory.write.submitReading([reading, v, r, s]);
      expect(await w.oracle.read.lastSeq()).to.equal(1n);
    });

    it("accepts exactly 10,000 W", async function () {
      const w = await setup();
      await w.meter.send(w, { powerW: 10_000 });
      expect((await w.oracle.read.latestReading()).powerW).to.equal(10_000);
    });

    it("returns everything in getMeterState()", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 2000n, soldWh: 1900n, powerW: 3000 });
      const s = await w.oracle.read.getMeterState();
      expect(s.status).to.equal(Status.OK);
      expect(s.deviceSigner).to.equal(getAddress(w.device.address));
      expect(s.totalProducedWh).to.equal(2000n);
      expect(s.lastPowerW).to.equal(3000);
      expect(s.lastGapBps).to.equal(500);
      expect(s.theftGapBps).to.equal(1500);
      expect(s.offlineTimeout).to.equal(600n);
      expect(s.offline).to.equal(false);
    });
  });

  describe("rejects bad readings", function () {
    it("a reading signed by the wrong key (a fake meter)", async function () {
      const w = await setup();
      const reading = await w.meter.next();
      await expect(w.meter.submit(w, reading, w.attackerDevice)).to.be.rejectedWith("InvalidSigner");
    });

    it("a reading changed after signing (fake numbers)", async function () {
      const w = await setup();
      const reading = await w.meter.next({ producedWh: 1000n, soldWh: 920n });
      const { v, r, s } = await w.meter.sign(reading);
      const faked = { ...reading, energySoldWh: reading.energySoldWh + 500n };
      await expect(w.oracle.write.submitReading([faked, v, r, s])).to.be.rejectedWith("InvalidSigner");
    });

    it("the wrong v (the relayer must try 27 and 28)", async function () {
      const w = await setup();
      const reading = await w.meter.next();
      const { v, r, s } = await w.meter.sign(reading);
      const wrongV = v === 27 ? 28 : 27;
      await expect(w.oracle.write.submitReading([reading, wrongV, r, s])).to.be.rejectedWith("InvalidSigner");
    });

    it("a replayed reading (same seq)", async function () {
      const w = await setup();
      const reading = await w.meter.next();
      await w.meter.submit(w, reading);
      const { v, r, s } = await w.meter.sign(reading);
      await expect(w.oracle.write.submitReading([reading, v, r, s])).to.be.rejectedWith("SeqNotIncreasing");
    });

    it("a reading with a lower seq", async function () {
      const w = await setup();
      await w.meter.send(w, { seq: 10n });
      await expect(w.meter.send(w, { seq: 9n })).to.be.rejectedWith("SeqNotIncreasing");
    });

    it("energy produced going down", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 5000n, soldWh: 4500n });
      const reading = await w.meter.next();
      reading.energyProducedWh = 4999n;
      await expect(w.meter.submit(w, reading)).to.be.rejectedWith("EnergyWentDown");
    });

    it("energy sold going down", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 5000n, soldWh: 4500n });
      const reading = await w.meter.next();
      reading.energySoldWh = 4499n;
      await expect(w.meter.submit(w, reading)).to.be.rejectedWith("EnergyWentDown");
    });

    it("power above the 10 kW rating", async function () {
      const w = await setup();
      await expect(w.meter.send(w, { powerW: 10_001 })).to.be.rejectedWith("PowerTooHigh");
    });

    it("a timestamp that is too old", async function () {
      const w = await setup();
      const now = BigInt(await time.latest());
      await expect(w.meter.send(w, { timestamp: now - 2n * 3600n })).to.be.rejectedWith("TimestampTooOld");
    });

    it("a timestamp older than the previous reading", async function () {
      const w = await setup();
      const now = BigInt(await time.latest());
      await w.meter.send(w, { timestamp: now });
      await expect(w.meter.send(w, { timestamp: now - 10n })).to.be.rejectedWith("TimestampTooOld");
    });

    it("a timestamp in the future", async function () {
      const w = await setup();
      const now = BigInt(await time.latest());
      await expect(w.meter.send(w, { timestamp: now + 3600n })).to.be.rejectedWith("TimestampInFuture");
    });

    it("a reading for a different meter id", async function () {
      const w = await setup();
      const reading = { ...(await w.meter.next()), meterId: 2 };
      await expect(w.meter.submit(w, reading)).to.be.rejectedWith("WrongMeter");
    });
  });

  describe("THEFT", function () {
    it("flags THEFT when sold is more than 15% below produced, and emits TheftDetected", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 1000n, soldWh: 920n });
      // The thief draws power: 110 Wh produced, only 40 Wh paid for (64% gap).
      await w.meter.send(w, { producedWh: 110n, soldWh: 40n });

      expect(await w.oracle.read.status()).to.equal(Status.THEFT);
      expect(await w.oracle.read.theftActive()).to.equal(true);
      const [theft] = await w.oracle.getEvents.TheftDetected();
      expect(theft.args.deltaProducedWh).to.equal(110n);
      expect(theft.args.deltaSoldWh).to.equal(40n);
      expect(theft.args.gapBps).to.equal(6363);
      const [changed] = await w.oracle.getEvents.StatusChanged();
      expect(changed.args).to.deep.equal({ previous: Status.OK, current: Status.THEFT });
    });

    it("does not flag a gap of exactly 15%", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 1000n, soldWh: 850n });
      expect(await w.oracle.read.status()).to.equal(Status.OK);
    });

    it("clears by itself when the gap returns to normal", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 1000n, soldWh: 500n });
      expect(await w.oracle.read.status()).to.equal(Status.THEFT);

      await w.meter.send(w, { producedWh: 1000n, soldWh: 950n });
      expect(await w.oracle.read.status()).to.equal(Status.OK);
      expect(await w.oracle.read.theftActive()).to.equal(false);
      const [changed] = await w.oracle.getEvents.StatusChanged();
      expect(changed.args).to.deep.equal({ previous: Status.THEFT, current: Status.OK });
    });

    it("uses the operator's threshold", async function () {
      const w = await setup();
      await w.oracle.write.setTheftGapBps([500]); // 5%
      await w.meter.send(w, { producedWh: 1000n, soldWh: 900n }); // 10% gap
      expect(await w.oracle.read.status()).to.equal(Status.THEFT);

      const asAlice = await as("MeterOracle", w.oracle.address, w.alice);
      await expect(asAlice.write.setTheftGapBps([2000])).to.be.rejectedWith("AccessControlUnauthorizedAccount");
      await expect(w.oracle.write.setTheftGapBps([10_001])).to.be.rejectedWith("InvalidSetting");
    });

    it("ignores readings with no new production (night time)", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 0n, soldWh: 0n, powerW: 0 });
      expect(await w.oracle.read.status()).to.equal(Status.OK);
    });
  });

  describe("TAMPER", function () {
    it("is set by the device and stays until the admin clears it", async function () {
      const w = await setup();
      await w.meter.send(w, { tamper: true });
      expect(await w.oracle.read.status()).to.equal(Status.TAMPER);
      const [ev] = await w.oracle.getEvents.TamperDetected();
      expect(ev.args.seq).to.equal(1n);

      await w.meter.send(w); // normal reading, still TAMPER
      expect(await w.oracle.read.status()).to.equal(Status.TAMPER);

      const asAlice = await as("MeterOracle", w.oracle.address, w.alice);
      await expect(asAlice.write.clearTamper()).to.be.rejectedWith("AccessControlUnauthorizedAccount");

      await w.oracle.write.clearTamper();
      expect(await w.oracle.read.status()).to.equal(Status.OK);
      const [changed] = await w.oracle.getEvents.StatusChanged();
      expect(changed.args).to.deep.equal({ previous: Status.TAMPER, current: Status.OK });
    });

    it("wins over THEFT", async function () {
      const w = await setup();
      await w.meter.send(w, { producedWh: 1000n, soldWh: 100n, tamper: true });
      expect(await w.oracle.read.status()).to.equal(Status.TAMPER);
      expect(await w.oracle.read.theftActive()).to.equal(true);
    });
  });

  describe("OFFLINE", function () {
    it("is OFFLINE before the first reading", async function () {
      const w = await setup();
      expect(await w.oracle.read.status()).to.equal(Status.OFFLINE);
    });

    it("goes OFFLINE after 600 s without a reading, and back to OK on the next one", async function () {
      const w = await setup();
      await w.meter.send(w);
      await time.increase(590);
      expect(await w.oracle.read.status()).to.equal(Status.OK);
      await time.increase(20);
      expect(await w.oracle.read.status()).to.equal(Status.OFFLINE);

      await w.meter.send(w);
      expect(await w.oracle.read.status()).to.equal(Status.OK);
    });

    it("uses a shorter timeout for the demo", async function () {
      const w = await setup();
      await w.oracle.write.setOfflineTimeout([30n]);
      await w.meter.send(w);
      await time.increase(31);
      expect(await w.oracle.read.status()).to.equal(Status.OFFLINE);
      await expect(w.oracle.write.setOfflineTimeout([0n])).to.be.rejectedWith("InvalidSetting");
    });
  });

  describe("device registration", function () {
    it("admin can replace the device; the old key is then rejected", async function () {
      const w = await setup();
      await w.meter.send(w);
      await w.oracle.write.setDevice([1, w.attackerDevice.address]);
      await expect(w.meter.send(w)).to.be.rejectedWith("InvalidSigner");
      await w.meter.submit(w, await w.meter.next(), w.attackerDevice);
      expect(await w.oracle.read.lastSeq()).to.equal(2n);

      const asAlice = await as("MeterOracle", w.oracle.address, w.alice);
      await expect(asAlice.write.setDevice([1, w.alice.account.address])).to.be.rejectedWith(
        "AccessControlUnauthorizedAccount",
      );
    });
  });
});
