import { expect } from "chai";
import { getAddress, keccak256, toHex } from "viem";
import { as, setup } from "./helpers/fixture";

describe("SolarShareToken (#6)", function () {
  describe("basics", function () {
    it("is 'Block A Solar Share' with 0 decimals and a 3,500 cap", async function () {
      const { token } = await setup();
      expect(await token.read.name()).to.equal("Block A Solar Share");
      expect(await token.read.symbol()).to.equal("SSBA");
      expect(await token.read.decimals()).to.equal(0);
      expect(await token.read.MAX_SUPPLY()).to.equal(3500n);
    });
  });

  describe("minting and the cap", function () {
    it("mints up to exactly 3,500 shares", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 3000n]);
      await token.write.mint([bob.account.address, 500n]);
      expect(await token.read.totalSupply()).to.equal(3500n);
    });

    it("reverts a mint over 3,500", async function () {
      const { token, alice } = await setup();
      await expect(token.write.mint([alice.account.address, 3501n])).to.be.rejectedWith("MaxSupplyExceeded");
      await token.write.mint([alice.account.address, 3500n]);
      await expect(token.write.mint([alice.account.address, 1n])).to.be.rejectedWith("MaxSupplyExceeded");
    });

    it("reverts a mint to an unapproved wallet", async function () {
      const { token, mallory } = await setup();
      await expect(token.write.mint([mallory.account.address, 1n])).to.be.rejectedWith("AccountNotApproved");
    });

    it("only the minter can mint", async function () {
      const { token, alice } = await setup();
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.mint([alice.account.address, 1n])).to.be.rejectedWith(
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("allowlist", function () {
    it("lets approved wallets transfer to each other", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await asAlice.write.transfer([bob.account.address, 4n]);
      expect(await token.read.balanceOf([alice.account.address])).to.equal(6n);
      expect(await token.read.balanceOf([bob.account.address])).to.equal(4n);
    });

    it("reverts a transfer to an unapproved wallet with a clear error", async function () {
      const { token, alice, mallory } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.transfer([mallory.account.address, 1n])).to.be.rejectedWith(
        `AccountNotApproved("${getAddress(mallory.account.address)}")`,
      );
    });

    it("blocks a revoked wallet from sending", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      await token.write.revokeWallet([alice.account.address]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.transfer([bob.account.address, 1n])).to.be.rejectedWith("AccountNotApproved");
    });

    it("also applies to transferFrom", async function () {
      const { token, alice, bob, mallory } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await asAlice.write.approve([bob.account.address, 5n]);
      const asBob = await as("SolarShareToken", token.address, bob);
      await expect(
        asBob.write.transferFrom([alice.account.address, mallory.account.address, 1n]),
      ).to.be.rejectedWith("AccountNotApproved");
      await asBob.write.transferFrom([alice.account.address, bob.account.address, 5n]);
      expect(await token.read.balanceOf([bob.account.address])).to.equal(5n);
    });

    it("only the KYC officer can approve wallets, and it emits WalletApproved", async function () {
      const { token, alice, mallory, admin } = await setup();
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.approveWallet([mallory.account.address])).to.be.rejectedWith(
        "AccessControlUnauthorizedAccount",
      );
      await token.write.approveWallet([mallory.account.address]);
      const [ev] = await token.getEvents.WalletApproved();
      expect(ev.args.account).to.equal(getAddress(mallory.account.address));
      expect(ev.args.by).to.equal(getAddress(admin.account.address));
      expect(await token.read.isApproved([mallory.account.address])).to.equal(true);
    });
  });

  describe("freeze", function () {
    it("reverts a transfer from a frozen wallet", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      await token.write.freeze([alice.account.address]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.transfer([bob.account.address, 1n])).to.be.rejectedWith("AccountFrozen");
    });

    it("reverts a transfer to a frozen wallet", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      await token.write.freeze([bob.account.address]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.transfer([bob.account.address, 1n])).to.be.rejectedWith("AccountFrozen");
    });

    it("works again after unfreeze", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      await token.write.freeze([alice.account.address]);
      await token.write.unfreeze([alice.account.address]);
      const asAlice = await as("SolarShareToken", token.address, alice);
      await asAlice.write.transfer([bob.account.address, 1n]);
      expect((await token.getEvents.Transfer())[0].args.value).to.equal(1n);
    });
  });

  describe("recover a lost wallet", function () {
    it("moves all shares to a new approved wallet and freezes the old one", async function () {
      const { token, alice, carol } = await setup();
      await token.write.mint([alice.account.address, 40n]);
      await token.write.freeze([alice.account.address]); // reported lost
      await token.write.recover([alice.account.address, carol.account.address]);

      expect(await token.read.balanceOf([alice.account.address])).to.equal(0n);
      expect(await token.read.balanceOf([carol.account.address])).to.equal(40n);
      expect(await token.read.isFrozen([alice.account.address])).to.equal(true);
      const [ev] = await token.getEvents.WalletRecovered();
      expect(ev.args.amount).to.equal(40n);
      expect(ev.args.newWallet).to.equal(getAddress(carol.account.address));
    });

    it("freezes a not-yet-frozen lost wallet", async function () {
      const { token, alice, carol } = await setup();
      await token.write.mint([alice.account.address, 5n]);
      await token.write.recover([alice.account.address, carol.account.address]);
      expect(await token.read.isFrozen([alice.account.address])).to.equal(true);
    });

    it("reverts if the new wallet is not approved", async function () {
      const { token, alice, mallory } = await setup();
      await token.write.mint([alice.account.address, 5n]);
      await expect(
        token.write.recover([alice.account.address, mallory.account.address]),
      ).to.be.rejectedWith("AccountNotApproved");
    });

    it("only the admin can recover", async function () {
      const { token, alice, bob } = await setup();
      const asBob = await as("SolarShareToken", token.address, bob);
      await expect(asBob.write.recover([alice.account.address, bob.account.address])).to.be.rejectedWith(
        "AccessControlUnauthorizedAccount",
      );
    });
  });

  describe("pause", function () {
    it("blocks transfers and mints while paused", async function () {
      const { token, alice, bob } = await setup();
      await token.write.mint([alice.account.address, 10n]);
      await token.write.pause();
      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.transfer([bob.account.address, 1n])).to.be.rejectedWith("EnforcedPause");
      await expect(token.write.mint([alice.account.address, 1n])).to.be.rejectedWith("EnforcedPause");
      await token.write.unpause();
      await asAlice.write.transfer([bob.account.address, 1n]);
    });
  });

  describe("asset documents", function () {
    it("stores SHA-256 hashes and IPFS links, and replaces by name", async function () {
      const { token, alice } = await setup();
      const h1 = keccak256(toHex("spv v1")); // any 32-byte value stands in for a SHA-256 hash
      const h2 = keccak256(toHex("spv v2"));
      await token.write.setDocument(["SPV_CERTIFICATE", h1, "ipfs://spv1"]);
      await token.write.setDocument(["INSTALLATION_CERTIFICATE", h1, "ipfs://coc"]);
      await token.write.setDocument(["POWER_PURCHASE_AGREEMENT", h1, "ipfs://ppa"]);
      await token.write.setDocument(["SPV_CERTIFICATE", h2, "ipfs://spv2"]);

      const docs = await token.read.getDocuments();
      expect(docs.map((d) => d.name)).to.deep.equal([
        "SPV_CERTIFICATE",
        "INSTALLATION_CERTIFICATE",
        "POWER_PURCHASE_AGREEMENT",
      ]);
      const spv = await token.read.getDocument(["SPV_CERTIFICATE"]);
      expect(spv.sha256Hash).to.equal(h2);
      expect(spv.uri).to.equal("ipfs://spv2");
      const [ev] = await token.getEvents.DocumentSet();
      expect(ev.args.uri).to.equal("ipfs://spv2");

      const asAlice = await as("SolarShareToken", token.address, alice);
      await expect(asAlice.write.setDocument(["X", h1, "ipfs://x"])).to.be.rejectedWith(
        "AccessControlUnauthorizedAccount",
      );
    });
  });
});
