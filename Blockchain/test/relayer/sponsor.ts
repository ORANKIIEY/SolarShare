// Sponsor (#16): the approval check, the rate limits and caps, and an end-to-end
// run on the in-memory Hardhat chain where a brand-new wallet with no ETH gets
// topped up and then buys shares itself.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { createWalletClient, custom, getAddress, parseEther, parseUnits, type Address, type Hash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
import { viemSponsorChain } from "../../relayer/src/sponsor/chain";
import { loadSponsorConfig } from "../../relayer/src/sponsor/config";
import { SponsorLedger, type SponsorLimits } from "../../relayer/src/sponsor/limits";
import { createSponsorServer } from "../../relayer/src/sponsor/server";
import { Sponsor, type SponsorChain } from "../../relayer/src/sponsor/sponsor";

const ETH = parseEther("0.0005");
const USDC = parseUnits("25", 6);
const LIMITS: SponsorLimits = {
  perWalletMax: 1,
  perWalletWindowS: 24 * 3600,
  globalMaxPerHour: 3,
  totalEthCapWei: parseEther("0.01"),
  totalUsdcCap: parseUnits("60", 6),
};
const SPONSOR: Address = "0x5900000000000000000000000000000000000005";
const randomWallet = () => privateKeyToAccount(generatePrivateKey()).address;

/** In-memory chain: balances in maps, approvals in a set, every send logged. */
class FakeChain implements SponsorChain {
  sponsorAddress = SPONSOR;
  approved = new Set<Address>();
  frozen = new Set<Address>();
  eth = new Map<Address, bigint>([[SPONSOR, parseEther("1")]]);
  usdc = new Map<Address, bigint>([[SPONSOR, parseUnits("1000", 6)]]);
  sends: Array<{ kind: "eth" | "usdc"; to: Address; amount: bigint }> = [];
  failEth = false;
  private n = 0;

  approve(...wallets: Address[]) {
    wallets.forEach((w) => this.approved.add(getAddress(w)));
  }
  async isApproved(w: Address) {
    return this.approved.has(w);
  }
  async isFrozen(w: Address) {
    return this.frozen.has(w);
  }
  async ethBalance(w: Address) {
    return this.eth.get(w) ?? 0n;
  }
  async usdcBalance(w: Address) {
    return this.usdc.get(w) ?? 0n;
  }
  private move(map: Map<Address, bigint>, to: Address, amount: bigint) {
    map.set(SPONSOR, (map.get(SPONSOR) ?? 0n) - amount);
    map.set(to, (map.get(to) ?? 0n) + amount);
  }
  async sendEth(to: Address, wei: bigint) {
    if (this.failEth) throw new Error("network down");
    await new Promise((r) => setTimeout(r, 5)); // like waiting for a block
    this.move(this.eth, to, wei);
    this.sends.push({ kind: "eth", to, amount: wei });
    return `0x${(++this.n).toString(16).padStart(64, "0")}` as Hash;
  }
  async sendUsdc(to: Address, amount: bigint) {
    this.move(this.usdc, to, amount);
    this.sends.push({ kind: "usdc", to, amount });
    return `0x${(++this.n).toString(16).padStart(64, "0")}` as Hash;
  }
}

function setup(opts: { limits?: Partial<SponsorLimits>; usdcAmount?: bigint; ledgerFile?: string } = {}) {
  const chain = new FakeChain();
  let now = 1_800_000_000;
  const limits = { ...LIMITS, ...opts.limits };
  const sponsor = new Sponsor({
    chain,
    ledger: new SponsorLedger(opts.ledgerFile),
    limits,
    ethAmountWei: ETH,
    usdcAmount: opts.usdcAmount ?? USDC,
    now: () => now,
  });
  return { chain, sponsor, limits, advance: (s: number) => (now += s) };
}

describe("sponsor: approval check", function () {
  it("refuses a wallet that is not approved on SolarShareToken, and sends nothing", async function () {
    const { sponsor, chain } = setup();
    const res = await sponsor.handle({ address: randomWallet() });
    expect(res.status).to.equal(403);
    expect(res.body).to.include({ ok: false, error: "NOT_APPROVED" });
    expect(chain.sends).to.be.empty;
  });

  it("refuses a frozen wallet even if it is approved", async function () {
    const { sponsor, chain } = setup();
    const w = randomWallet();
    chain.approve(w);
    chain.frozen.add(w);
    const res = await sponsor.handle({ address: w });
    expect(res.status).to.equal(403);
    expect(res.body).to.include({ error: "FROZEN" });
    expect(chain.sends).to.be.empty;
  });

  it("rejects a missing or malformed address with 400", async function () {
    const { sponsor } = setup();
    for (const body of [undefined, {}, { address: "0x123" }, { address: 42 }, "0xabc"]) {
      const res = await sponsor.handle(body);
      expect(res.status, JSON.stringify(body)).to.equal(400);
      expect(res.body).to.include({ error: "BAD_REQUEST" });
    }
  });

  it("tops up an approved wallet with ETH and USDC (lowercase address is fine)", async function () {
    const { sponsor, chain } = setup();
    const w = randomWallet();
    chain.approve(w);
    const res = await sponsor.handle({ address: w.toLowerCase() });
    expect(res.status).to.equal(200);
    if (!res.body.ok) throw new Error("expected ok");
    expect(res.body.address).to.equal(w);
    expect(res.body.eth.amount).to.equal("0.0005");
    expect(res.body.usdc.amount).to.equal("25");
    expect(res.body.eth.txHash).to.match(/^0x/);
    expect(chain.sends.map((s) => s.kind)).to.deep.equal(["eth", "usdc"]);
  });

  it("only sends what is missing, and nothing if the wallet already has enough", async function () {
    const { sponsor, chain } = setup();
    const a = randomWallet();
    const b = randomWallet();
    chain.approve(a, b);
    chain.eth.set(a, parseEther("0.0002"));
    chain.usdc.set(a, parseUnits("30", 6));
    const res = await sponsor.handle({ address: a });
    expect(chain.sends).to.deep.equal([{ kind: "eth", to: a, amount: parseEther("0.0003") }]);
    expect(res.body.ok && res.body.usdc.skipped).to.equal("already has enough");

    chain.eth.set(b, ETH);
    chain.usdc.set(b, USDC);
    const res2 = await sponsor.handle({ address: b });
    expect(res2.status).to.equal(200);
    expect(res2.body.ok && res2.body.alreadyFunded).to.equal(true);
    expect(chain.sends).to.have.length(1); // nothing new
  });

  it("sends no USDC when SPONSOR_USDC_AMOUNT is 0", async function () {
    const { sponsor, chain } = setup({ usdcAmount: 0n });
    const w = randomWallet();
    chain.approve(w);
    const res = await sponsor.handle({ address: w });
    expect(chain.sends.map((s) => s.kind)).to.deep.equal(["eth"]);
    expect(res.body.ok && res.body.usdc.skipped).to.equal("USDC top-ups are off");
  });
});

describe("sponsor: rate limits and caps", function () {
  it("tops up each wallet once per window, then answers 429 with Retry-After", async function () {
    const { sponsor, chain, advance } = setup();
    const w = randomWallet();
    chain.approve(w);
    expect((await sponsor.handle({ address: w })).status).to.equal(200);

    chain.eth.set(w, 0n); // spent it all: asks again
    advance(3600);
    const again = await sponsor.handle({ address: w });
    expect(again.status).to.equal(429);
    expect(again.body).to.include({ error: "WALLET_LIMIT", retryAfterS: 23 * 3600 });

    advance(23 * 3600);
    expect((await sponsor.handle({ address: w })).status).to.equal(200);
    expect(chain.sends.filter((s) => s.kind === "eth")).to.have.length(2);
  });

  it("allows several top-ups per wallet when SPONSOR_PER_WALLET_MAX says so", async function () {
    const { sponsor, chain } = setup({ limits: { perWalletMax: 2 } });
    const w = randomWallet();
    chain.approve(w);
    for (const expected of [200, 200, 429]) {
      chain.eth.set(w, 0n);
      expect((await sponsor.handle({ address: w })).status).to.equal(expected);
    }
  });

  it("limits top-ups for all wallets together per hour", async function () {
    const { sponsor, chain, advance } = setup(); // globalMaxPerHour: 3
    const wallets = [randomWallet(), randomWallet(), randomWallet(), randomWallet()];
    chain.approve(...wallets);
    for (const w of wallets.slice(0, 3)) {
      expect((await sponsor.handle({ address: w })).status).to.equal(200);
      advance(60);
    }
    const busy = await sponsor.handle({ address: wallets[3] });
    expect(busy.status).to.equal(429);
    expect(busy.body).to.include({ error: "BUSY", retryAfterS: 3600 - 180 });
    advance(3600 - 180 + 1);
    expect((await sponsor.handle({ address: wallets[3] })).status).to.equal(200);
  });

  it("stops at the total ETH cap with 503 BUDGET_SPENT", async function () {
    const { sponsor, chain } = setup({ limits: { totalEthCapWei: parseEther("0.001"), globalMaxPerHour: 100 } });
    const wallets = [randomWallet(), randomWallet(), randomWallet()];
    chain.approve(...wallets);
    expect((await sponsor.handle({ address: wallets[0] })).status).to.equal(200);
    expect((await sponsor.handle({ address: wallets[1] })).status).to.equal(200);
    const res = await sponsor.handle({ address: wallets[2] });
    expect(res.status).to.equal(503);
    expect(res.body).to.include({ error: "BUDGET_SPENT" });
  });

  it("trims USDC to the total USDC cap, then sends ETH only", async function () {
    const { sponsor, chain } = setup({ limits: { globalMaxPerHour: 100 } }); // totalUsdcCap: 60
    const wallets = [randomWallet(), randomWallet(), randomWallet()];
    chain.approve(...wallets);
    const amounts = [];
    for (const w of wallets) {
      const res = await sponsor.handle({ address: w });
      expect(res.status).to.equal(200);
      amounts.push(res.body.ok && res.body.usdc.amount);
    }
    expect(amounts).to.deep.equal(["25", "25", "10"]);
    chain.approve(randomWallet());
    const last = await sponsor.handle({ address: [...chain.approved].at(-1) });
    expect(last.body.ok && last.body.usdc.skipped).to.equal("the sponsor's total USDC budget is used up");
    expect(last.body.ok && last.body.eth.amount).to.equal("0.0005");
  });

  it("answers 503 SPONSOR_EMPTY when the sponsor wallet runs out of ETH", async function () {
    const { sponsor, chain } = setup();
    chain.eth.set(SPONSOR, parseEther("0.0006")); // less than 2x a top-up
    const w = randomWallet();
    chain.approve(w);
    const res = await sponsor.handle({ address: w });
    expect(res.status).to.equal(503);
    expect(res.body).to.include({ error: "SPONSOR_EMPTY" });
    expect(chain.sends).to.be.empty;
  });

  it("doesn't count a failed send against the wallet", async function () {
    const { sponsor, chain } = setup();
    const w = randomWallet();
    chain.approve(w);
    chain.failEth = true;
    expect((await sponsor.handle({ address: w })).status).to.equal(502);
    chain.failEth = false;
    expect((await sponsor.handle({ address: w })).status).to.equal(200);
  });

  it("can't be raced: ten requests at once for one wallet send once", async function () {
    const { sponsor, chain } = setup();
    const w = randomWallet();
    chain.approve(w);
    const results = await Promise.all(Array.from({ length: 10 }, () => sponsor.handle({ address: w })));
    expect(results.filter((r) => r.status === 200 && r.body.ok && !r.body.alreadyFunded)).to.have.length(1);
    expect(chain.sends.filter((s) => s.kind === "eth")).to.have.length(1);
  });

  it("keeps its limits across a restart (ledger file)", async function () {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sponsor-")), "ledger.json");
    const first = setup({ ledgerFile: file });
    const w = randomWallet();
    first.chain.approve(w);
    expect((await first.sponsor.handle({ address: w })).status).to.equal(200);

    const second = setup({ ledgerFile: file }); // "restarted" process, same clock
    second.chain.approve(w);
    const res = await second.sponsor.handle({ address: w });
    expect(res.body).to.include({ error: "WALLET_LIMIT" });
    expect(new SponsorLedger(file).totalEthWei).to.equal(ETH);
  });
});

describe("sponsor: config", function () {
  const base = { TOKEN_ADDRESS: randomWallet(), USDC_ADDRESS: randomWallet() };

  it("needs SPONSOR_PRIVATE_KEY on Base Sepolia, not on localhost", function () {
    expect(() => loadSponsorConfig({ ...base, NETWORK: "baseSepolia" })).to.throw(/SPONSOR_PRIVATE_KEY is required/);
    expect(loadSponsorConfig({ ...base, NETWORK: "localhost" }).sponsorPrivateKey).to.equal(undefined);
  });

  it("only accepts test networks", function () {
    expect(() => loadSponsorConfig({ ...base, NETWORK: "mainnet" })).to.throw(/test networks only/);
  });

  it("reads caps and amounts from the environment", function () {
    const c = loadSponsorConfig({
      ...base,
      SPONSOR_ETH_AMOUNT: "0.001",
      SPONSOR_USDC_AMOUNT: "0",
      SPONSOR_PER_WALLET_MAX: "2",
      SPONSOR_PER_WALLET_WINDOW_H: "1",
      SPONSOR_MAX_PER_HOUR: "5",
      SPONSOR_TOTAL_ETH_CAP: "0.1",
      SPONSOR_TOTAL_USDC_CAP: "500",
    });
    expect(c.ethAmountWei).to.equal(parseEther("0.001"));
    expect(c.usdcAmount).to.equal(0n);
    expect(c.limits).to.deep.equal({
      perWalletMax: 2,
      perWalletWindowS: 3600,
      globalMaxPerHour: 5,
      totalEthCapWei: parseEther("0.1"),
      totalUsdcCap: parseUnits("500", 6),
    });
    expect(() => loadSponsorConfig({ ...base, SPONSOR_TOTAL_ETH_CAP: "lots" })).to.throw(/SPONSOR_TOTAL_ETH_CAP/);
  });
});

describe("sponsor: end to end on a local chain", function () {
  async function deployAll() {
    const [admin] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const a = admin.account.address;
    const usdc = await hre.viem.deployContract("MockUSDC");
    const token = await hre.viem.deployContract("SolarShareToken", [a]);
    const sale = await hre.viem.deployContract("ShareSale", [a, token.address, usdc.address, a, 5_000_000n]);
    await token.write.grantRole([await token.read.KYC_ROLE(), a]);
    await token.write.grantRole([await token.read.MINTER_ROLE(), sale.address]);
    await usdc.write.mint([a, parseUnits("1000", 6)]);
    return { admin, publicClient, usdc, token, sale };
  }

  async function startServer() {
    const { admin, publicClient, usdc, token, sale } = await loadFixture(deployAll);
    const sponsor = new Sponsor({
      chain: viemSponsorChain({ publicClient: publicClient as any, walletClient: admin as any, token: token.address, usdc: usdc.address }),
      ledger: new SponsorLedger(),
      limits: LIMITS,
      ethAmountWei: ETH,
      usdcAmount: USDC,
    });
    const server = createSponsorServer(sponsor, { allowedOrigins: ["*"] });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const post = (body: unknown) =>
      fetch(`${url}/sponsor`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { server, url, post, publicClient, usdc, token, sale };
  }

  it("a brand-new approved wallet gets gas + USDC over HTTP and buys shares itself", async function () {
    const { server, post, publicClient, usdc, token, sale } = await startServer();
    try {
      const investor = privateKeyToAccount(generatePrivateKey());
      expect(await publicClient.getBalance({ address: investor.address })).to.equal(0n);

      // Not approved yet: refused.
      const refused = await post({ address: investor.address });
      expect(refused.status).to.equal(403);
      expect((await refused.json()).error).to.equal("NOT_APPROVED");

      // The KYC officer approves, then the web app calls the sponsor.
      await token.write.approveWallet([investor.address]);
      const res = await post({ address: investor.address });
      expect(res.status).to.equal(200);
      expect(res.headers.get("access-control-allow-origin")).to.equal("*");
      const body = await res.json();
      expect(body).to.include({ ok: true, alreadyFunded: false });
      expect(await publicClient.getBalance({ address: investor.address })).to.equal(ETH);
      expect(await usdc.read.balanceOf([investor.address])).to.equal(USDC);

      // The investor signs both buy transactions with its own key, paying gas
      // only from what the sponsor sent.
      const wallet = createWalletClient({ account: investor, chain: hardhat, transport: custom(hre.network.provider) });
      const approveHash = await wallet.writeContract({
        address: usdc.address,
        abi: usdc.abi,
        functionName: "approve",
        args: [sale.address, 15_000_000n],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      const buyHash = await wallet.writeContract({ address: sale.address, abi: sale.abi, functionName: "buy", args: [3n] });
      await publicClient.waitForTransactionReceipt({ hash: buyHash });
      expect(await token.read.balanceOf([investor.address])).to.equal(3n);

      // Second ask from the same wallet: rate-limited, with Retry-After.
      const again = await post({ address: investor.address });
      expect(again.status).to.equal(429);
      expect(Number(again.headers.get("retry-after"))).to.be.greaterThan(0);
    } finally {
      server.close();
    }
  });

  it("answers CORS preflight, /health, bad JSON and unknown paths", async function () {
    const { server, url } = await startServer();
    try {
      const pre = await fetch(`${url}/sponsor`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000" } });
      expect(pre.status).to.equal(204);
      expect(pre.headers.get("access-control-allow-methods")).to.contain("POST");

      const health = await (await fetch(`${url}/health`)).json();
      expect(health.ok).to.equal(true);
      expect(health.topUpTo).to.deep.equal({ eth: "0.0005", usdc: "25" });

      const bad = await fetch(`${url}/sponsor`, { method: "POST", body: "not json" });
      expect(bad.status).to.equal(400);
      expect((await fetch(`${url}/nope`)).status).to.equal(404);
    } finally {
      server.close();
    }
  });
});
