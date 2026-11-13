// Deploys and wires every SolarShare contract, records the SAMPLE asset
// document hashes, and writes the addresses and ABIs to
// Blockchain/deployments/<network>.json.
//
//   npx hardhat run scripts/deploy.ts     throwaway in-memory chain
//   npm run deploy:local                  local node (`npm run node` in another terminal)
//   npm run preflight:baseSepolia         check wallet, balances and settings first
//   npm run deploy:baseSepolia            Base Sepolia public testnet (test money only)
//
// Local chains get a FAKE MockUSDC. Base Sepolia uses Circle's test USDC.
// Optional settings (Blockchain/.env or the shell): see scripts/lib/deployConfig.ts
//   METER_DEVICE_ADDRESS, TREASURY_ADDRESS, OFFLINE_TIMEOUT_S, USE_MOCK_USDC, REDEPLOY
import fs from "node:fs";
import path from "node:path";
import hre from "hardhat";
import { formatEther, formatUnits, getAddress, type Abi, type Address, type Hash, type Hex } from "viem";
import { readHashes } from "./lib/assetDocuments";
import {
  BASESCAN,
  CIRCLE_USDC_BASE_SEPOLIA,
  MAX_SUPPLY,
  METER_ID,
  MOCK_USDC_MINT,
  PRICE_PER_SHARE,
  TARIFF_USDC_PER_KWH,
  THEFT_GAP_BPS,
  deploymentsFile,
  loadDeploySettings,
  preflightBaseSepolia,
  printChecks,
} from "./lib/deployConfig";
import { verifyAll, type DeployedContract } from "./lib/verify";

const LOCAL_NETWORKS = ["hardhat", "localhost"];
const SUPPORTED = [...LOCAL_NETWORKS, "baseSepolia"];

async function main() {
  const network = hre.network.name;
  if (!SUPPORTED.includes(network)) throw new Error(`Unknown network "${network}". Use one of: ${SUPPORTED.join(", ")}.`);
  const isLocal = LOCAL_NETWORKS.includes(network);
  const settings = loadDeploySettings();
  const outFile = deploymentsFile(network);

  if (!isLocal) {
    console.log("Checking everything before spending any test ETH...\n");
    const pre = await preflightBaseSepolia();
    printChecks(pre);
    if (!pre.ready) throw new Error("Not ready to deploy: fix the MISSING items above (or run `npm run preflight:baseSepolia`).");
    if (fs.existsSync(outFile) && process.env.REDEPLOY !== "1") {
      throw new Error(
        `${path.relative(process.cwd(), outFile)} already exists. Deploying again makes NEW contracts, so the meter's ` +
          "secrets.h, the relayer and the web app would all need the new addresses. If that's what you want, run it " +
          "again with REDEPLOY=1.",
      );
    }
    console.log("");
  }

  const { documents, problems } = readHashes();
  if (problems.length) throw new Error(`Asset documents aren't ready:\n  ${problems.join("\n  ")}`);

  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const admin = getAddress(deployer.account.address);
  const treasury = settings.treasury ?? admin;
  const useMock = isLocal || settings.useMockUsdc;

  console.log(`Network:  ${network} (chain id ${chainId})`);
  console.log(`Deployer: ${admin}  (${formatEther(await publicClient.getBalance({ address: admin }))} ETH)\n`);

  // We pick each transaction's nonce ourselves (counting up from the
  // deployer's current one) instead of asking the RPC every time: public RPCs
  // sit behind load balancers and sometimes answer with a stale nonce.
  let nonce = await publicClient.getTransactionCount({ address: admin, blockTag: "pending" });
  let gasUsed = 0n;
  let startBlock: bigint | undefined;
  const txs: Array<{ step: string; hash: Hash }> = [];

  const confirm = async (step: string, hash: Hash) => {
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000 });
    if (receipt.status !== "success") throw new Error(`${step} failed onchain (tx ${hash})`);
    gasUsed += receipt.gasUsed;
    startBlock ??= receipt.blockNumber;
    txs.push({ step, hash });
    return receipt;
  };

  const deployed: Record<string, DeployedContract & { abi: Abi }> = {};
  const deploy = async (name: string, args: unknown[], label = name) => {
    const artifact = await hre.artifacts.readArtifact(name);
    const hash = await deployer.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode as Hex,
      args,
      nonce: nonce++,
    });
    const receipt = await confirm(`deploy ${name}`, hash);
    const address = getAddress(receipt.contractAddress as Address);
    deployed[label] = {
      address,
      abi: artifact.abi as Abi,
      source: `${artifact.sourceName}:${artifact.contractName}`,
      constructorArgs: args.map((a) => (typeof a === "bigint" ? a.toString() : a)),
    };
    console.log(`  ${label.padEnd(19)} ${address}`);
    return address;
  };
  const call = async (step: string, address: Address, abi: Abi, functionName: string, args: unknown[]) => {
    const hash = await deployer.writeContract({ address, abi, functionName, args, nonce: nonce++ } as any);
    await confirm(step, hash);
    console.log(`  ✓ ${step}`);
  };

  // ---------------------------------------------------------------- deploy
  console.log("Deploying contracts:");
  let usdc: Address;
  if (useMock) {
    usdc = await deploy("MockUSDC", [], "USDC");
  } else {
    usdc = CIRCLE_USDC_BASE_SEPOLIA;
    deployed.USDC = { address: usdc, abi: (await hre.artifacts.readArtifact("MockUSDC")).abi as Abi };
    console.log(`  ${"USDC".padEnd(19)} ${usdc}  (Circle's test USDC, already on Base Sepolia)`);
  }
  const token = await deploy("SolarShareToken", [admin]);
  const oracle = await deploy("MeterOracle", [admin, METER_ID, settings.meterDevice]);
  const distributor = await deploy("RevenueDistributor", [admin, usdc, token, oracle, TARIFF_USDC_PER_KWH]);
  const sale = await deploy("ShareSale", [admin, token, usdc, treasury, PRICE_PER_SHARE]);

  // ---------------------------------------------------------------- wiring
  console.log("\nWiring them together:");
  const tokenAbi = deployed.SolarShareToken.abi;
  const oracleAbi = deployed.MeterOracle.abi;
  const read = (address: Address, abi: Abi, functionName: string) =>
    publicClient.readContract({ address, abi, functionName } as any) as Promise<Hex>;
  const KYC_ROLE = await read(token, tokenAbi, "KYC_ROLE");
  const MINTER_ROLE = await read(token, tokenAbi, "MINTER_ROLE");

  await call("deployer is the KYC officer (approves investor wallets)", token, tokenAbi, "grantRole", [KYC_ROLE, admin]);
  await call("ShareSale may create new shares", token, tokenAbi, "grantRole", [MINTER_ROLE, sale]);
  await call("token tells RevenueDistributor about every share move", token, tokenAbi, "setDistributor", [distributor]);
  await call("deployer wallet approved to hold shares (for demos)", token, tokenAbi, "approveWallet", [admin]);
  await call(`theft alarm at a ${THEFT_GAP_BPS / 100}% gap`, oracle, oracleAbi, "setTheftGapBps", [THEFT_GAP_BPS]);
  await call(
    `OFFLINE after ${settings.offlineTimeoutS} s without a reading (short, for the demo)`,
    oracle,
    oracleAbi,
    "setOfflineTimeout",
    [BigInt(settings.offlineTimeoutS)],
  );
  for (const doc of documents) {
    await call(`document ${doc.name} = ${doc.sha256.slice(0, 10)}…`, token, tokenAbi, "setDocument", [doc.name, doc.sha256, doc.uri]);
  }
  if (useMock) {
    await call(`minted ${formatUnits(MOCK_USDC_MINT, 6)} FAKE MockUSDC to the deployer`, usdc, deployed.USDC.abi, "mint", [
      admin,
      MOCK_USDC_MINT,
    ]);
  }

  // ---------------------------------------------------------------- record
  const contracts: Record<string, { address: Address } & Record<string, unknown>> = {};
  for (const [name, c] of Object.entries(deployed)) {
    contracts[name] = {
      address: c.address as Address,
      ...(name === "USDC"
        ? {
            label: useMock
              ? "MockUSDC: FAKE test token for the demo, anyone can mint it"
              : "Circle test USDC on Base Sepolia (free from faucet.circle.com, no real value)",
            mock: useMock,
            decimals: 6,
          }
        : {}),
      ...(c.source ? { source: c.source, constructorArgs: c.constructorArgs } : {}),
      ...(isLocal ? {} : { explorer: `${BASESCAN}/address/${c.address}` }),
      abi: c.abi,
    };
  }
  const record = {
    network,
    chainId,
    deployedAt: new Date().toISOString(),
    deployer: admin,
    startBlock: Number(startBlock ?? 0n),
    settings: {
      meterId: METER_ID,
      meterDevice: settings.meterDevice,
      treasury,
      pricePerShareUsdc: PRICE_PER_SHARE.toString(),
      tariffUsdcPerKwh: TARIFF_USDC_PER_KWH.toString(),
      theftGapBps: THEFT_GAP_BPS,
      offlineTimeoutS: settings.offlineTimeoutS,
      maxSupply: MAX_SUPPLY,
    },
    documents: documents.map(({ name, title, file, sha256, uri }) => ({ name, title, file, sha256, uri })),
    transactions: txs,
    contracts,
  };
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(record, null, 2) + "\n");
  console.log(`\nGas used: ${gasUsed.toLocaleString("en-US")} for ${txs.length} transactions`);
  console.log(`Wrote ${path.relative(process.cwd(), outFile)} (addresses + ABIs for the relayer and the web app)`);

  if (!isLocal) await verifyAll(hre, deployed);
  printNextSteps(network, chainId, contracts, settings.meterDevice);
}

function printNextSteps(network: string, chainId: number, contracts: Record<string, { address: Address }>, device: Address) {
  const oracle = contracts.MeterOracle.address;
  const line = "-".repeat(72);
  console.log(`\n${line}\nNEXT STEPS\n${line}`);
  console.log(`
1. Point the meter at the new MeterOracle.
   The meter signs every reading for one contract address only. In the Wokwi
   project, open secrets.h and set:

     #define VERIFYING_CONTRACT "${oracle}"

   (chain id ${chainId}). The meter's device address must stay ${device}.
`);
  if (network === "baseSepolia") {
    console.log(`2. Start the relayer against Base Sepolia (from Blockchain/):
   In relayer/.env set NETWORK=baseSepolia and RELAYER_PRIVATE_KEY (a TEST
   wallet with a little Base Sepolia ETH: it pays the gas for each reading).
   The oracle address is read from deployments/baseSepolia.json. Then:

     npm run relayer          live: Wokwi meter -> MQTT -> MeterOracle
     npm run relayer:demo     backup: software meter (no Wokwi needed)

3. Start the sponsor (tops up newly approved investors with gas money).
   In relayer/.env set SPONSOR_PRIVATE_KEY (a TEST wallet holding some
   Base Sepolia ETH and test USDC), then:

     npm run sponsor

4. See the contracts on Basescan:
${Object.entries(contracts)
  .map(([name, c]) => `     ${name.padEnd(19)} ${BASESCAN}/address/${c.address}`)
  .join("\n")}

5. Commit deployments/baseSepolia.json so the web app and relayer use it.
`);
  } else {
    console.log(`2. Run the relayer against this local chain (from Blockchain/):

     npm run relayer:demo     software meter plays normal -> theft -> recovery

3. Start the sponsor for local test top-ups:  npm run sponsor
`);
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
