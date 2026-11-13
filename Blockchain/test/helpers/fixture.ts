// Shared setup for the SolarShare contract tests.
//
// `deploySolarShare` deploys every contract on the in-memory test chain and
// wires them together the same way scripts/deploy.ts does. `FakeMeter` plays
// the ESP32: it builds readings and signs them with a device key, exactly as
// the real meter does (EIP-712, secp256k1).
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import hre from "hardhat";
import type { ContractTypesMap } from "hardhat/types/artifacts";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { parseSignature, parseUnits, type Address, type Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { METER_READING_TYPES } from "../../scripts/lib/spike";

chai.use(chaiAsPromised);

export const USDC = (amount: string | number) => parseUnits(String(amount), 6);
export const PRICE_PER_SHARE = USDC(5);
export const TARIFF = USDC("0.2"); // 0.20 USDC per kWh
export const METER_ID = 1;

// Throwaway test keys. Never use these anywhere real.
const DEVICE_KEY: Hex = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const ATTACKER_DEVICE_KEY: Hex = "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba";

export enum Status {
  OK = 0,
  THEFT = 1,
  TAMPER = 2,
  OFFLINE = 3,
}

export enum ClaimBlocker {
  NONE = 0,
  NOTHING_TO_CLAIM = 1,
  METER_NOT_OK = 2,
  NOT_APPROVED = 3,
  FROZEN = 4,
  PAUSED = 5,
}

export interface MeterReading {
  meterId: number;
  seq: bigint;
  timestamp: bigint;
  energyProducedWh: bigint;
  energySoldWh: bigint;
  powerW: number;
  tamper: boolean;
}

export async function deploySolarShare() {
  const [admin, alice, bob, carol, mallory, treasury] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const device = privateKeyToAccount(DEVICE_KEY);
  const attackerDevice = privateKeyToAccount(ATTACKER_DEVICE_KEY);
  const a = admin.account.address;

  const usdc = await hre.viem.deployContract("MockUSDC");
  const token = await hre.viem.deployContract("SolarShareToken", [a]);
  const oracle = await hre.viem.deployContract("MeterOracle", [a, METER_ID, device.address]);
  const distributor = await hre.viem.deployContract("RevenueDistributor", [
    a,
    usdc.address,
    token.address,
    oracle.address,
    TARIFF,
  ]);
  const sale = await hre.viem.deployContract("ShareSale", [
    a,
    token.address,
    usdc.address,
    treasury.account.address,
    PRICE_PER_SHARE,
  ]);

  // Wiring: admin is KYC officer and minter (for tests); sale can mint;
  // distributor hears about every balance change.
  await token.write.grantRole([await token.read.KYC_ROLE(), a]);
  await token.write.grantRole([await token.read.MINTER_ROLE(), a]);
  await token.write.grantRole([await token.read.MINTER_ROLE(), sale.address]);
  await token.write.setDistributor([distributor.address]);

  // Alice, Bob and Carol pass KYC. Mallory does not.
  for (const w of [alice, bob, carol]) await token.write.approveWallet([w.account.address]);

  // Everyone gets test USDC; the admin (operator) gets plenty for deposits.
  for (const w of [admin, alice, bob, carol, mallory]) {
    await usdc.write.mint([w.account.address, USDC(1_000_000)]);
  }

  const meter = new FakeMeter(oracle.address, chainId, device);
  return {
    admin, alice, bob, carol, mallory, treasury, publicClient, chainId,
    device, attackerDevice, usdc, token, oracle, distributor, sale, meter,
  };
}

export type World = Awaited<ReturnType<typeof deploySolarShare>>;

/** Fresh copy of the deployed world for each test (fast snapshot/revert). */
export async function setup(): Promise<World> {
  const world = await loadFixture(deploySolarShare);
  world.meter.reset();
  return world;
}

type Wallet = World["alice"];

/** The same contract, but transactions are sent from `wallet`. */
export async function as<N extends "SolarShareToken" | "MeterOracle" | "RevenueDistributor" | "ShareSale" | "MockUSDC">(
  name: N,
  address: Address,
  wallet: Wallet,
): Promise<ContractTypesMap[N]> {
  const contract = await hre.viem.getContractAt(name as string, address, { client: { wallet } });
  return contract as unknown as ContractTypesMap[N];
}

/** Plays the ESP32 meter: builds and signs readings. */
export class FakeMeter {
  seq = 0n;
  produced = 0n;
  sold = 0n;

  constructor(
    public readonly oracleAddress: Address,
    public readonly chainId: number,
    public readonly device: PrivateKeyAccount,
  ) {}

  reset() {
    this.seq = 0n;
    this.produced = 0n;
    this.sold = 0n;
  }

  /** Next reading: seq + 1 and the given increases (Wh) since the last one. */
  async next(opts: {
    producedWh?: bigint;
    soldWh?: bigint;
    powerW?: number;
    tamper?: boolean;
    timestamp?: bigint;
    seq?: bigint;
  } = {}): Promise<MeterReading> {
    const producedWh = opts.producedWh ?? 1000n;
    const soldWh = opts.soldWh ?? (producedWh * 92n) / 100n; // a normal 8% gap
    return {
      meterId: METER_ID,
      seq: opts.seq ?? this.seq + 1n,
      timestamp: opts.timestamp ?? BigInt(await time.latest()),
      energyProducedWh: this.produced + producedWh,
      energySoldWh: this.sold + soldWh,
      powerW: opts.powerW ?? 6420,
      tamper: opts.tamper ?? false,
    };
  }

  /** Sign like the device: EIP-712 typed data, low-s signature. */
  async sign(reading: MeterReading, signer: PrivateKeyAccount = this.device) {
    const signature = await signer.signTypedData({
      domain: {
        name: "SolarShare MeterOracle",
        version: "1",
        chainId: this.chainId,
        verifyingContract: this.oracleAddress,
      },
      types: METER_READING_TYPES,
      primaryType: "MeterReading",
      message: reading,
    });
    const { r, s, v } = parseSignature(signature);
    return { v: Number(v), r, s };
  }

  /** Signs and submits a reading; remembers it if the chain accepts it. */
  async submit(world: World, reading: MeterReading, signer: PrivateKeyAccount = this.device) {
    const { v, r, s } = await this.sign(reading, signer);
    const hash = await world.oracle.write.submitReading([reading, v, r, s]);
    this.seq = reading.seq;
    this.produced = reading.energyProducedWh;
    this.sold = reading.energySoldWh;
    return hash;
  }

  /** Shortcut: build the next reading and submit it. */
  async send(world: World, opts: Parameters<FakeMeter["next"]>[0] = {}) {
    return this.submit(world, await this.next(opts));
  }
}
