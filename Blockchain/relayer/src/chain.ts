// viem clients for the configured network.
import {
  createPublicClient,
  createWalletClient,
  http,
  type Account,
  type Chain,
  type PublicClient,
  type Transport,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, hardhat } from "viem/chains";
import type { RelayerConfig } from "./config";

export interface Clients {
  chain: Chain;
  publicClient: PublicClient<Transport, Chain>;
  walletClient: WalletClient<Transport, Chain, Account>;
}

export async function makeClients(config: RelayerConfig): Promise<Clients> {
  const chain: Chain = config.network === "baseSepolia" ? baseSepolia : hardhat;
  const transport = http(config.rpcUrl, { retryCount: 3, timeout: 20_000 });
  const publicClient = createPublicClient({ chain, transport, pollingInterval: 1_000 });

  let actualChainId: number;
  try {
    actualChainId = await publicClient.getChainId();
  } catch (err) {
    throw new Error(
      `Can't reach the ${config.network} RPC at ${config.rpcUrl}.` +
        (config.network === "localhost" ? " Is `npm run node` running in another terminal?" : ""),
    );
  }
  if (actualChainId !== config.chainId) {
    throw new Error(
      `RPC ${config.rpcUrl} is chain ${actualChainId}, but NETWORK=${config.network} expects ${config.chainId}`,
    );
  }

  let account: Account;
  if (config.relayerPrivateKey) {
    account = privateKeyToAccount(config.relayerPrivateKey);
  } else {
    // Local Hardhat node only: it unlocks 20 test accounts, so use the first
    // one (the deployer). No key needs to be written anywhere.
    const [first] = await createWalletClient({ chain, transport }).getAddresses();
    if (!first) throw new Error("The local node has no unlocked accounts; set RELAYER_PRIVATE_KEY");
    account = { address: first, type: "json-rpc" };
  }

  const walletClient = createWalletClient({ chain, transport, account });
  return { chain, publicClient, walletClient };
}
