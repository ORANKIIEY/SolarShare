// SolarShare sponsor: tops up newly approved investor wallets with a little
// test ETH (for gas) and test USDC, so buying shares never shows a gas prompt.
//
//   npm run sponsor
//
// DEMO SHORTCUT, testnet only. Production would use a smart wallet with a
// paymaster instead. Settings: relayer/.env ("Sponsor" section of .env.example).
import { createPublicClient, createWalletClient, formatEther, formatUnits, http, type Account, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, hardhat } from "viem/chains";
import { loadEnvFile } from "../config";
import { viemSponsorChain } from "./chain";
import { loadSponsorConfig } from "./config";
import { SponsorLedger } from "./limits";
import { createSponsorServer } from "./server";
import { Sponsor } from "./sponsor";

async function main() {
  loadEnvFile();
  const config = loadSponsorConfig();
  const chain: Chain = config.network === "baseSepolia" ? baseSepolia : hardhat;
  const transport = http(config.rpcUrl, { retryCount: 3, timeout: 20_000 });
  const publicClient = createPublicClient({ chain, transport, pollingInterval: 1_000 });

  const actual = await publicClient.getChainId().catch(() => {
    throw new Error(`Can't reach the ${config.network} RPC at ${config.rpcUrl}.`);
  });
  // Testnet only: refuse anything that isn't Base Sepolia or a local Hardhat node.
  if (actual !== config.chainId || ![84532, 31337].includes(actual)) {
    throw new Error(`RPC ${config.rpcUrl} is chain ${actual}; the sponsor only runs on Base Sepolia (84532) or a local node (31337).`);
  }

  let account: Account;
  if (config.sponsorPrivateKey) account = privateKeyToAccount(config.sponsorPrivateKey);
  else {
    const [first] = await createWalletClient({ chain, transport }).getAddresses();
    account = { address: first, type: "json-rpc" };
  }
  const walletClient = createWalletClient({ chain, transport, account });

  const stamp = () => new Date().toTimeString().slice(0, 8);
  const log = {
    info: (s: string) => console.log(`${stamp()} ${s}`),
    warn: (s: string) => console.log(`${stamp()} WARN ${s}`),
    error: (s: string) => console.error(`${stamp()} ERROR ${s}`),
  };

  const sponsor = new Sponsor({
    chain: viemSponsorChain({ publicClient, walletClient, token: config.token, usdc: config.usdc }),
    ledger: new SponsorLedger(config.ledgerFile),
    limits: config.limits,
    ethAmountWei: config.ethAmountWei,
    usdcAmount: config.usdcAmount,
    txLink: config.network === "baseSepolia" ? (h) => `https://sepolia.basescan.org/tx/${h}` : undefined,
    log,
  });
  const s = await sponsor.status();

  const server = createSponsorServer(sponsor, {
    allowedOrigins: config.allowedOrigins,
    log,
    info: { network: config.network, chainId: config.chainId, token: config.token, usdc: config.usdc },
  });
  server.listen(config.port, config.host, () => {
    log.info("SolarShare sponsor (DEMO SHORTCUT: testnet only; production = smart wallet + paymaster)");
    log.info(`  network   ${config.network} (chain ${config.chainId}) via ${config.rpcUrl}`);
    log.info(`  token     ${config.token} (from ${config.addressSource})`);
    log.info(`  usdc      ${config.usdc}${config.usdcIsMock ? "  (FAKE MockUSDC)" : ""}`);
    log.info(`  sponsor   ${s.sponsor}: ${s.balance.eth} ETH, ${s.balance.usdc} USDC`);
    log.info(`  tops up   to ${formatEther(config.ethAmountWei)} ETH + ${formatUnits(config.usdcAmount, 6)} USDC per approved wallet`);
    log.info(`  limits    ${s.limits.perWallet} per wallet, ${s.limits.perHourAllWallets}/hour overall, caps ${s.limits.totalEthCap} ETH / ${s.limits.totalUsdcCap} USDC (given so far ${s.given.eth} ETH / ${s.given.usdc} USDC)`);
    log.info(`  listening http://${config.host}:${config.port}  (POST /sponsor, GET /health; CORS: ${config.allowedOrigins.join(", ")})`);
    if (s.balance.eth === "0") log.warn(`The sponsor wallet ${s.sponsor} has no ETH: every top-up will fail. Fund it first.`);
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
