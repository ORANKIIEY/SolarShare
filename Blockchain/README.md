# SolarShare smart contracts

This folder has SolarShare's smart contracts and the tools to build, test and
deploy them. Neighbours buy shares in a community solar mini-grid and get
monthly payouts in USDC. The contracts run on **Base Sepolia**, a free public
test network, so no real money is involved.

Tools: [Hardhat 2](https://hardhat.org/hardhat-runner/docs/getting-started)
(build and test) with [viem](https://viem.sh) (talks to the blockchain from
TypeScript) and [OpenZeppelin Contracts v5](https://docs.openzeppelin.com/contracts/5.x/)
(audited building blocks). Solidity 0.8.28 with the optimizer on.

## Folders

| Path | What's in it |
| --- | --- |
| `contracts/` | Solidity contracts. `HelloSolarShare.sol` is only a toolchain smoke test. `spike/` holds the issue #4 signature check. |
| `test/` | Tests. They run on a throwaway in-memory blockchain. |
| `scripts/` | Deploy script, wallet helpers, and `verify-spike.ts` for the ESP32 spike. |
| `hardhat.config.ts` | Networks (`hardhat` local, `baseSepolia`) and contract verification on Basescan. |
| `.env.example` | Template for your secrets. Copy it to `.env`. |

## Run it

You need [Node.js](https://nodejs.org) 20 or 22 (LTS).

```bash
cd Blockchain
npm install        # once, downloads the tools
npm run compile    # builds the contracts
npm test           # runs the tests on a local in-memory chain
```

You don't need a `.env` file to compile or test.

## Secrets and the deployer wallet

To deploy to Base Sepolia you need a wallet that pays the (test) gas fees.
Its private key goes in `Blockchain/.env`. That file is git-ignored and must
never be committed.

```bash
npm run wallet:new      # makes a fresh TESTNET wallet and saves the key in .env
npm run wallet:address  # shows the address and its Base Sepolia ETH/USDC balance
```

Neither command ever prints the private key. Only use this wallet for
testnets.

`.env` holds:

| Variable | What it is |
| --- | --- |
| `DEPLOYER_PRIVATE_KEY` | The deployer wallet's private key (filled in by `npm run wallet:new`). |
| `BASE_SEPOLIA_RPC_URL` | The node we talk to. The default `https://sepolia.base.org` is fine. |
| `BASESCAN_API_KEY` | An Etherscan API key, used to publish contract source code on sepolia.basescan.org. |

### Get test money (issue #3)

The wallet needs test ETH (for gas) and test USDC (for payouts). Both are free.

1. Run `npm run wallet:address` and copy the address (starts with `0x`).
2. **Test ETH**: open a Base Sepolia faucet, for example
   <https://portal.cdp.coinbase.com/products/faucet> (Coinbase, free account)
   or <https://console.optimism.io/faucet> (Superchain faucet). Pick
   **Base Sepolia**, paste the address, and request ETH. 0.05 ETH is plenty.
3. **Test USDC**: open <https://faucet.circle.com>, pick **USDC** and the
   network **Base Sepolia**, paste the address, and click **Send 10 USDC**.
   You can repeat this later if you need more.
4. Run `npm run wallet:address` again and check both balances are above zero.

### Basescan API key (for contract verification)

1. Sign up at <https://etherscan.io/register> and log in.
2. Go to **My Account → API Keys → Add** and copy the key.
3. Paste it after `BASESCAN_API_KEY=` in `.env`. Etherscan's V2 API uses one
   key for every chain, including Base Sepolia.

## Deploy

```bash
npm run deploy:baseSepolia
```

For now this only checks the deployer account and its balance. The real
contracts (SolarShareToken, MeterOracle, RevenueDistributor, ShareSale) are
added in their own issues.

To verify a deployed contract's source code on Basescan:

```bash
npx hardhat verify --network baseSepolia <contract address> <constructor args...>
```

## ESP32 signing spike (issue #4)

`npm run verify-spike` checks a meter reading signed by the simulated ESP32.
See [`Hardware/wokwi-spike/README.md`](../Hardware/wokwi-spike/README.md).
