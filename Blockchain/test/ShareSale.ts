import { expect } from "chai";
import { getAddress } from "viem";
import { as, setup, USDC, type World } from "./helpers/fixture";

async function buyAs(w: World, wallet: World["alice"], amount: bigint, approveUsdc = true) {
  if (approveUsdc) {
    const usdc = await as("MockUSDC", w.usdc.address, wallet);
    await usdc.write.approve([w.sale.address, amount * USDC(5)]);
  }
  const sale = await as("ShareSale", w.sale.address, wallet);
  return sale.write.buy([amount]);
}

describe("ShareSale (#9)", function () {
  it("an approved investor buys shares: USDC to the treasury, shares to the buyer", async function () {
    const w = await setup();
    const aliceUsdcBefore = await w.usdc.read.balanceOf([w.alice.account.address]);
    expect(await w.sale.read.quote([20n])).to.equal(USDC(100));

    await buyAs(w, w.alice, 20n);

    expect(await w.token.read.balanceOf([w.alice.account.address])).to.equal(20n);
    expect(await w.usdc.read.balanceOf([w.treasury.account.address])).to.equal(USDC(100));
    expect(await w.usdc.read.balanceOf([w.alice.account.address])).to.equal(aliceUsdcBefore - USDC(100));
    expect(await w.sale.read.sharesRemaining()).to.equal(3480n);
    const [ev] = await w.sale.getEvents.SharesPurchased();
    expect(ev.args).to.deep.equal({ buyer: getAddress(w.alice.account.address), amount: 20n, cost: USDC(100) });
  });

  it("can sell all 3,500 shares", async function () {
    const w = await setup();
    await buyAs(w, w.alice, 3500n);
    expect(await w.sale.read.sharesRemaining()).to.equal(0n);
    expect(await w.usdc.read.balanceOf([w.treasury.account.address])).to.equal(USDC(17_500));
  });

  it("reverts when sold out", async function () {
    const w = await setup();
    await buyAs(w, w.alice, 3490n);
    await expect(buyAs(w, w.bob, 11n)).to.be.rejectedWith("SoldOut(11, 10)");
    await buyAs(w, w.bob, 10n);
    await expect(buyAs(w, w.carol, 1n)).to.be.rejectedWith("SoldOut");
  });

  it("reverts for an unapproved buyer", async function () {
    const w = await setup();
    await expect(buyAs(w, w.mallory, 1n)).to.be.rejectedWith("AccountNotApproved");
    expect(await w.usdc.read.balanceOf([w.treasury.account.address])).to.equal(0n);
  });

  it("reverts for a frozen buyer", async function () {
    const w = await setup();
    await w.token.write.freeze([w.alice.account.address]);
    await expect(buyAs(w, w.alice, 1n)).to.be.rejectedWith("AccountFrozen");
  });

  it("reverts while paused", async function () {
    const w = await setup();
    await w.sale.write.pause();
    await expect(buyAs(w, w.alice, 1n)).to.be.rejectedWith("EnforcedPause");
    await w.sale.write.unpause();
    await buyAs(w, w.alice, 1n);
  });

  it("reverts for zero shares or without a USDC approval", async function () {
    const w = await setup();
    await expect(buyAs(w, w.alice, 0n)).to.be.rejectedWith("ZeroAmount");
    await expect(buyAs(w, w.alice, 1n, false)).to.be.rejectedWith("ERC20InsufficientAllowance");
  });

  it("admin sets price and treasury; others can't", async function () {
    const w = await setup();
    await w.sale.write.setPrice([USDC(6)]);
    await w.sale.write.setTreasury([w.carol.account.address]);
    expect(await w.sale.read.quote([2n])).to.equal(USDC(12));

    const usdc = await as("MockUSDC", w.usdc.address, w.alice);
    await usdc.write.approve([w.sale.address, USDC(12)]);
    await buyAs(w, w.alice, 2n, false);
    expect(await w.usdc.read.balanceOf([w.carol.account.address])).to.equal(USDC(1_000_000) + USDC(12));

    const asAlice = await as("ShareSale", w.sale.address, w.alice);
    await expect(asAlice.write.setPrice([1n])).to.be.rejectedWith("AccessControlUnauthorizedAccount");
    await expect(asAlice.write.pause()).to.be.rejectedWith("AccessControlUnauthorizedAccount");
  });

  it("bought shares earn payouts", async function () {
    const w = await setup();
    await buyAs(w, w.alice, 10n);
    await w.meter.send(w, { producedWh: 1_100_000n, soldWh: 1_000_000n });
    await w.usdc.write.approve([w.distributor.address, USDC(50)]);
    await w.distributor.write.deposit([USDC(50)]);
    expect(await w.distributor.read.pendingPayout([w.alice.account.address])).to.equal(USDC(50));
  });
});
