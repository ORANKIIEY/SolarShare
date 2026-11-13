import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { getAddress } from "viem";
import { as, ClaimBlocker, setup, Status, USDC, type World } from "./helpers/fixture";

/** Alice 3 shares, Bob 1 share; the meter attests 1,000 kWh sold (cap = 200 USDC). */
async function funded() {
  const w = await setup();
  await w.token.write.mint([w.alice.account.address, 3n]);
  await w.token.write.mint([w.bob.account.address, 1n]);
  await w.meter.send(w, { producedWh: 1_100_000n, soldWh: 1_000_000n });
  await w.usdc.write.approve([w.distributor.address, USDC(1_000_000)]);
  return w;
}

async function claimAs(w: World, wallet: World["alice"]) {
  const d = await as("RevenueDistributor", w.distributor.address, wallet);
  return d.write.claim();
}

describe("RevenueDistributor (#8)", function () {
  describe("deposit cap: attested sold energy x tariff", function () {
    it("cap is kWh sold x tariff (1,000 kWh x 0.20 = 200 USDC)", async function () {
      const w = await funded();
      expect(await w.distributor.read.depositCap()).to.equal(USDC(200));
      expect(await w.distributor.read.remainingDepositAllowance()).to.equal(USDC(200));
    });

    it("accepts a deposit within attested energy and emits IncomeDeposited", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(150)]);
      expect(await w.distributor.read.totalDeposited()).to.equal(USDC(150));
      expect(await w.usdc.read.balanceOf([w.distributor.address])).to.equal(USDC(150));
      const [ev] = await w.distributor.getEvents.IncomeDeposited();
      expect(ev.args.amount).to.equal(USDC(150));
      expect(ev.args.by).to.equal(getAddress(w.admin.account.address));
    });

    it("accepts a deposit of exactly the cap", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(200)]);
      expect(await w.distributor.read.remainingDepositAllowance()).to.equal(0n);
    });

    it("reverts a deposit above attested energy x tariff", async function () {
      const w = await funded();
      await expect(w.distributor.write.deposit([USDC(200) + 1n])).to.be.rejectedWith(
        "DepositExceedsAttestedEnergy",
      );
      await w.distributor.write.deposit([USDC(120)]);
      // Cumulative: 120 + 81 > 200.
      await expect(w.distributor.write.deposit([USDC(81)])).to.be.rejectedWith("DepositExceedsAttestedEnergy");
    });

    it("reverts any deposit before the meter has attested anything", async function () {
      const w = await setup();
      await w.token.write.mint([w.alice.account.address, 1n]);
      await w.usdc.write.approve([w.distributor.address, USDC(1)]);
      await expect(w.distributor.write.deposit([USDC(1)])).to.be.rejectedWith("DepositExceedsAttestedEnergy");
    });

    it("the cap grows as the meter attests more sales", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(200)]);
      await w.meter.send(w, { producedWh: 550_000n, soldWh: 500_000n }); // +500 kWh sold
      expect(await w.distributor.read.remainingDepositAllowance()).to.equal(USDC(100));
      await w.distributor.write.deposit([USDC(100)]);
    });

    it("tariff is set by the admin only", async function () {
      const w = await funded();
      await w.distributor.write.setTariff([USDC("0.1")]);
      expect(await w.distributor.read.depositCap()).to.equal(USDC(100));
      const asAlice = await as("RevenueDistributor", w.distributor.address, w.alice);
      await expect(asAlice.write.setTariff([USDC(9)])).to.be.rejectedWith("AccessControlUnauthorizedAccount");
    });

    it("only the operator can deposit", async function () {
      const w = await funded();
      const asAlice = await as("RevenueDistributor", w.distributor.address, w.alice);
      await expect(asAlice.write.deposit([USDC(1)])).to.be.rejectedWith("AccessControlUnauthorizedAccount");
    });
  });

  describe("pro-rata payouts and claims", function () {
    it("splits a deposit by shares and pays it on claim", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(USDC(75));
      expect(await w.distributor.read.pendingPayout([w.bob.account.address])).to.equal(USDC(25));

      const before = await w.usdc.read.balanceOf([w.alice.account.address]);
      await claimAs(w, w.alice);
      expect(await w.usdc.read.balanceOf([w.alice.account.address])).to.equal(before + USDC(75));
      expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(0n);
      expect(await w.distributor.read.totalClaimedBy([w.alice.account.address])).to.equal(USDC(75));
      const [ev] = await w.distributor.getEvents.PayoutClaimed();
      expect(ev.args).to.deep.equal({ account: getAddress(w.alice.account.address), amount: USDC(75) });
    });

    it("a second claim with nothing new reverts", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await claimAs(w, w.alice);
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("NothingToClaim");
      expect(await w.distributor.read.claimBlocker([w.alice.account.address])).to.equal(
        ClaimBlocker.NOTHING_TO_CLAIM,
      );
    });

    it("stays correct when shares move between deposits", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]); // Alice 75, Bob 25

      const asAlice = await as("SolarShareToken", w.token.address, w.alice);
      await asAlice.write.transfer([w.bob.account.address, 2n]); // now Alice 1, Bob 3

      await w.distributor.write.deposit([USDC(100)]); // Alice +25, Bob +75
      expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(USDC(100));
      expect(await w.distributor.read.pendingPayout([w.bob.account.address])).to.equal(USDC(100));
    });

    it("new buyers don't get income paid before they bought", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.token.write.mint([w.carol.account.address, 4n]); // supply now 8
      expect(await w.distributor.read.pendingPayout([w.carol.account.address])).to.equal(0n);
      await w.distributor.write.deposit([USDC(80)]);
      expect(await w.distributor.read.pendingPayout([w.carol.account.address])).to.equal(USDC(40));
      expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(USDC(75 + 30));
    });

    it("never pays out more than was deposited (rounding)", async function () {
      const w = await setup();
      await w.token.write.mint([w.alice.account.address, 1n]);
      await w.token.write.mint([w.bob.account.address, 1n]);
      await w.token.write.mint([w.carol.account.address, 1n]);
      await w.meter.send(w, { producedWh: 1_100_000n, soldWh: 1_000_000n });
      await w.usdc.write.approve([w.distributor.address, USDC(1)]);
      await w.distributor.write.deposit([100n]); // 0.0001 USDC over 3 shares
      let total = 0n;
      for (const x of [w.alice, w.bob, w.carol]) total += await w.distributor.read.pendingPayout([x.account.address]);
      expect(total <= 100n).to.equal(true);
      expect(total).to.equal(99n);
    });
  });

  describe("claims are blocked while the meter is not OK", function () {
    it("reverts a claim while THEFT", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.meter.send(w, { producedWh: 1000n, soldWh: 100n });
      expect(await w.oracle.read.status()).to.equal(Status.THEFT);
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("MeterNotOk");
      expect(await w.distributor.read.claimBlocker([w.alice.account.address])).to.equal(ClaimBlocker.METER_NOT_OK);
    });

    it("reverts a claim while TAMPER", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.meter.send(w, { tamper: true });
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("MeterNotOk");
    });

    it("reverts a claim while OFFLINE", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await time.increase(601);
      expect(await w.oracle.read.status()).to.equal(Status.OFFLINE);
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("MeterNotOk");
    });

    it("allows the claim again once THEFT clears", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.meter.send(w, { producedWh: 1000n, soldWh: 100n });
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("MeterNotOk");

      await w.meter.send(w, { producedWh: 1000n, soldWh: 930n });
      expect(await w.oracle.read.status()).to.equal(Status.OK);
      expect(await w.distributor.read.claimBlocker([w.alice.account.address])).to.equal(ClaimBlocker.NONE);
      await claimAs(w, w.alice);
      expect(await w.distributor.read.totalClaimed()).to.equal(USDC(75));
    });
  });

  describe("wallet rules", function () {
    it("a frozen wallet can't claim", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.token.write.freeze([w.alice.account.address]);
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("AccountFrozen");
      expect(await w.distributor.read.claimBlocker([w.alice.account.address])).to.equal(ClaimBlocker.FROZEN);
    });

    it("an unapproved (revoked) wallet can't claim", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.token.write.revokeWallet([w.bob.account.address]);
      await expect(claimAs(w, w.bob)).to.be.rejectedWith("AccountNotApproved");
      expect(await w.distributor.read.claimBlocker([w.bob.account.address])).to.equal(ClaimBlocker.NOT_APPROVED);
    });

    it("nobody can claim while the token is paused", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]);
      await w.token.write.pause();
      await expect(claimAs(w, w.alice)).to.be.rejectedWith("SharesPaused");
    });

    it("recovering a lost wallet moves its unclaimed payouts too", async function () {
      const w = await funded();
      await w.distributor.write.deposit([USDC(100)]); // Alice is owed 75
      await w.token.write.recover([w.alice.account.address, w.carol.account.address]);

      expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(0n);
      expect(await w.distributor.read.pendingPayout([w.carol.account.address])).to.equal(USDC(75));
      const [ev] = await w.distributor.getEvents.UnclaimedMoved();
      expect(ev.args.amount).to.equal(USDC(75));

      await claimAs(w, w.carol);
      await w.distributor.write.deposit([USDC(100)]); // Carol now has Alice's 3 shares
      expect(await w.distributor.read.pendingPayout([w.carol.account.address])).to.equal(USDC(75));
    });

    it("only the token can call the share hooks", async function () {
      const w = await funded();
      await expect(
        w.distributor.write.beforeShareBalanceChange([w.alice.account.address, w.bob.account.address]),
      ).to.be.rejectedWith("OnlyToken");
      await expect(
        w.distributor.write.moveUnclaimed([w.alice.account.address, w.mallory.account.address]),
      ).to.be.rejectedWith("OnlyToken");
    });
  });
});
