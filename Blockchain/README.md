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
| `scripts/` | Deploy, preflight and verify scripts, the sample-document builder, wallet helpers, and `verify-spike.ts` for the ESP32 spike. |
| `deployments/` | Addresses + ABIs written by the deploy. `baseSepolia.json` is committed; local ones are git-ignored. |
| `relayer/` | The relayer (meter readings → chain) and the sponsor (gas for new investors). See [`relayer/README.md`](relayer/README.md). |
| `interface/` | What the web app needs: every read and write per screen, types, sample data, ABIs. |
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

One command deploys all four contracts, connects them, registers the meter,
sets the prices and limits, records the asset documents' hashes, and writes
`deployments/<network>.json` (addresses + ABIs for the relayer and the web
app). At the end it prints what to do next in plain English.

**Locally** (no test money needed; uses a FAKE `MockUSDC`):

```bash
npm run node          # terminal 1: a private blockchain on your laptop
npm run deploy:local  # terminal 2
```

**On Base Sepolia** (test network; uses Circle's test USDC
`0x036CbD53842c5426634e7929541eC2318f3dCF7e`):

```bash
npm run preflight:baseSepolia   # checks the wallet, balances and settings; sends nothing
npm run deploy:baseSepolia      # runs the same checks again, then deploys and verifies
```

Preflight lists every check as `OK`, `WARN` or `MISSING`, with what to do for
each problem. The deploy refuses to start while anything is `MISSING`. It also
refuses to deploy a second time over an existing `deployments/baseSepolia.json`
(new contracts mean new addresses for the meter, relayer and web app) unless
you run it with `REDEPLOY=1`.

What it sets up:

| Setting | Value | Change with (`Blockchain/.env`) |
| --- | --- | --- |
| Meter device (who may sign readings) | the Wokwi meter `0xaa69C29dA92fa7d0Ef717705Cd21Dd6e4D641ff3` | `METER_DEVICE_ADDRESS` |
| Treasury (receives share-sale USDC) | the deployer | `TREASURY_ADDRESS` |
| Share price / tariff | 5 USDC per share / 0.20 USDC per kWh | `scripts/lib/deployConfig.ts` |
| Theft alarm | sold energy more than 15% behind produced | `scripts/lib/deployConfig.ts` |
| OFFLINE after | 120 s without a reading (short, for the demo) | `OFFLINE_TIMEOUT_S` |
| Asset documents | the 3 SAMPLE PDFs' SHA-256 hashes (see below) | `npm run docs:build` |
| USDC | Circle test USDC on Base Sepolia, MockUSDC locally | `USE_MOCK_USDC=true` deploys a labelled MockUSDC on Base Sepolia too (only if the Circle faucet runs dry) |

Roles: the deployer is admin, operator and KYC officer; ShareSale may create
shares; the token reports every share move to RevenueDistributor; the
deployer's own wallet is approved to hold shares.

**Source verification.** With `BASESCAN_API_KEY` set, the deploy publishes the
source code of every contract on sepolia.basescan.org, so anyone can read it
there. Without a key it skips this and says so. Run it again any time:

```bash
npm run verify:baseSepolia
```

## Sample asset documents (#27)

Three PDFs in [`docs/asset-documents/`](../docs/asset-documents/): an SPV
company certificate, an installation certificate and a power purchase
agreement. **They are SAMPLES, not real documents**: every page says so. The
deploy stores each file's SHA-256 hash in SolarShareToken, so the web app can
prove a downloaded file is the registered one.

```bash
npm run docs:build   # rebuilds the PDFs and hashes.json (same text = same bytes = same hashes)
npm run docs:hash    # only recomputes hashes.json
```

If you change a document after deploying, run `docs:build` and update the
onchain hash with `SolarShareToken.setDocument(name, newHash, uri)`.

## ESP32 signing spike (issue #4)

`npm run verify-spike` checks a meter reading signed by the simulated ESP32.
See [`Hardware/wokwi-spike/README.md`](../Hardware/wokwi-spike/README.md).
