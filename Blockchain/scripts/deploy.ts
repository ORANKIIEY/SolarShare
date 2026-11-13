// Deploys and wires every SolarShare contract on a LOCAL chain, then writes
// the addresses and ABIs to Blockchain/deployments/<network>.json.
//
//   npx hardhat run scripts/deploy.ts     (throwaway in-memory chain)
//   npm run deploy:local                  (needs `npm run node` in another terminal)
//
// Base Sepolia is deliberately refused here: that deploy is issue #11 and
// uses Circle's test USDC instead of MockUSDC.
//
// Optional settings (Blockchain/.env or the shell):
//   METER_DEVICE_ADDRESS  the meter's signing address (default: the Wokwi ESP32 from #4)
//   TREASURY_ADDRESS      where share-sale USDC goes (default: the deployer)
import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { getAddress, isAddress, type Address, type Hash } from "viem";

const LOCAL_NETWORKS = ["hardhat", "localhost"];
const WOKWI_DEVICE: Address = "0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3";

const METER_ID = 1;
const PRICE_PER_SHARE = 5_000_000n; // 5 USDC (6 decimals)
const TARIFF_USDC_PER_KWH = 200_000n; // 0.20 USDC per kWh

function addressFromEnv(name: string, fallback: Address): Address {
  const value = process.env[name];
  if (!value) return fallback;
  if (!isAddress(value)) throw new Error(`${name} is not a valid address: ${value}`);
  return getAddress(value);
}

async function main() {
  const network = hre.network.name;
  if (!LOCAL_NETWORKS.includes(network)) {
    throw new Error(
      `This script only deploys to a local chain (${LOCAL_NETWORKS.join(", ")}), not "${network}". ` +
        "The Base Sepolia deploy is issue #11.",
    );
  }

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const admin = deployer.account.address;
  const device = addressFromEnv("METER_DEVICE_ADDRESS", WOKWI_DEVICE);
  const treasury = addressFromEnv("TREASURY_ADDRESS", admin);
  const wait = async (tx: Promise<Hash>) => publicClient.waitForTransactionReceipt({ hash: await tx });

  console.log(`Network:  ${network} (chain id ${chainId})`);
  console.log(`Deployer: ${admin}`);

  const usdc = await hre.viem.deployContract("MockUSDC");
  const token = await hre.viem.deployContract("SolarShareToken", [admin]);
  const oracle = await hre.viem.deployContract("MeterOracle", [admin, METER_ID, device]);
  const distributor = await hre.viem.deployContract("RevenueDistributor", [
    admin,
    usdc.address,
    token.address,
    oracle.address,
    TARIFF_USDC_PER_KWH,
  ]);
  const sale = await hre.viem.deployContract("ShareSale", [
    admin,
    token.address,
    usdc.address,
    treasury,
    PRICE_PER_SHARE,
  ]);

  // Wiring.
  await wait(token.write.grantRole([await token.read.KYC_ROLE(), admin])); // deployer is KYC officer
  await wait(token.write.grantRole([await token.read.MINTER_ROLE(), sale.address])); // sale mints shares
  await wait(token.write.setDistributor([distributor.address])); // payouts follow share moves
  await wait(token.write.approveWallet([admin])); // deployer can hold shares for demos

  const contracts = {
    MockUSDC: usdc.address,
    SolarShareToken: token.address,
    MeterOracle: oracle.address,
    RevenueDistributor: distributor.address,
    ShareSale: sale.address,
  };
  const out: Record<string, { address: Address; abi: unknown }> = {};
  for (const [name, address] of Object.entries(contracts)) {
    out[name] = { address, abi: (await hre.artifacts.readArtifact(name)).abi };
    console.log(`${name.padEnd(19)} ${address}`);
  }

  const file = path.join(__dirname, "..", "deployments", `${network}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const record = {
    network,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: admin,
    settings: {
      meterId: METER_ID,
      meterDevice: device,
      treasury,
      pricePerShareUsdc: PRICE_PER_SHARE.toString(),
      tariffUsdcPerKwh: TARIFF_USDC_PER_KWH.toString(),
      maxSupply: 3500,
    },
    contracts: out,
  };
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n");

  console.log(`\nWrote ${path.relative(process.cwd(), file)}`);
  console.log(
    `The meter must sign with verifyingContract = ${oracle.address} and chainId ${chainId}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
