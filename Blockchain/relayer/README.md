# SolarShare relayer

The relayer carries the solar meter's readings from MQTT to the blockchain.

```
Wokwi ESP32 meter ──MQTT──▶ relayer ──transaction──▶ MeterOracle (Base Sepolia)
  signs each reading          checks it, pays gas      checks the meter's signature,
  with its own key            and submits it           sets status OK / THEFT / TAMPER / OFFLINE
```

**Why a relayer?** The meter is a tiny device with no crypto wallet and no money
for transaction fees ("gas"). The relayer pays the gas. It **cannot fake or
change readings**: every reading is signed by the meter's own key, and
MeterOracle only accepts it if that signature matches the registered meter. If
the relayer (or anyone on the open MQTT broker) changes one number, the
signature no longer matches and the reading is refused.

Issues: #14 (relay service), #15 (backup broker and demo replay mode).

## The three modes, one command each

Run these from the `Blockchain/` folder.

| What | Command |
| --- | --- |
| **Live**: Wokwi meter → MQTT → chain | `npm run relayer` |
| **Demo backup**: software meter plays normal → theft → recovery | `npm run relayer:demo` |
| **Demo backup, full**: also tamper (+ admin clear) and silence until OFFLINE | `npm run relayer:demo -- --full` |
| Replay a recording, re-signed with fresh times | `npm run relayer -- --replay relayer/recordings/meter-2026-11-13.jsonl` |

`npm run relayer -- --help` lists every option. Stop any mode with Ctrl+C.

The demo backup keeps sending normal readings after the script ends, so the
status doesn't drift to OFFLINE while you talk. Add `--once` to stop at the end
instead.

## What happens to each reading

1. **Shape check.** Is it a well-formed meter message
   (`Hardware/wokwi-meter/MESSAGE_FORMAT.md`)?
2. **Signature check.** The meter sends only two parts of its signature (`r`,
   `s`). Ethereum also needs a third (`v`, which is 27 or 28), so the relayer
   tries both and keeps the one that gives back the meter address registered in
   MeterOracle.
3. **Dedupe.** The meter's readings can arrive on both brokers, so the same
   reading often comes in twice. Each reading has a sequence number (`seq`); the
   relayer never sends the same `seq` twice, and skips anything the chain
   already has.
4. **Dry run.** It asks the node "would MeterOracle accept this?" without
   sending anything. If not (too old, from the future, totals went down, …) it
   logs why and doesn't waste gas.
5. **Send.** One transaction at a time, so they never fight over the wallet's
   transaction counter (the "nonce"). If the network fails, it retries with
   the **same** nonce, so a retry replaces the stuck transaction instead of
   adding a second copy. Before each retry it checks whether the earlier
   attempt landed after all.
6. **Status.** It reads the meter status back from the chain and logs it.

## Reading the log

```
03:26:30 [test.mosquitto.org] ACCEPTED meter 1 seq 1794533190  produced 208 Wh  sold 181 Wh  5089 W  gap 35.7%  -> block 14, status THEFT  https://sepolia.basescan.org/tx/0x…
03:26:30   STATUS OK -> THEFT (sold energy is more than 15% behind produced: payouts paused until it recovers)
```

- `[…]` is where the reading came from: a broker, or `software-meter`.
- **ACCEPTED**: it's onchain. The link opens the transaction on Basescan (Base
  Sepolia only; on a local chain you get the transaction hash).
- `gap` is how far sold energy was behind produced energy since the previous
  reading. Over 15% means THEFT.
- **skipped**: a copy of a reading that is already handled. Normal and harmless.
- **REJECTED**: not sent, with the reason. A wrong signature means the message
  was changed after signing, or the meter is set up for a different contract.
- **FAILED**: valid, but it couldn't get onchain after 4 attempts (network down,
  wallet out of gas money). A later copy of the same reading will try again.
- A **STATUS** line appears whenever the status changes.

## Settings (`relayer/.env`)

Copy `relayer/.env.example` to `relayer/.env`. That file is git-ignored: never
commit it.

| Setting | Meaning |
| --- | --- |
| `NETWORK` | `localhost` (a Hardhat node on your laptop) or `baseSepolia`. |
| `RPC_URL` | The node to talk to. Empty = default for the network. |
| `RELAYER_PRIVATE_KEY` | The wallet that pays gas. **Testnet-only key.** Not needed on localhost (the node's first test account is used). |
| `ORACLE_ADDRESS` / `DEPLOYMENTS_FILE` | Where MeterOracle is. Empty = read `deployments/<NETWORK>.json`, which the deploy script writes. |
| `METER_ID` | `1` for the demo. |
| `MQTT_BROKERS` | Comma-separated, primary first. Default: `test.mosquitto.org`, then `broker.hivemq.com`. |
| `MQTT_TOPIC` | Default `solarshare/meter/<METER_ID>/reading`. |
| `RECORD_DIR` | Where received messages are saved. Default `relayer/recordings/`. |
| `DEMO_DEVICE_PRIVATE_KEY` | Software meter only: the meter's **test** key. |
| `REPLAY_INTERVAL_S` | Software meter only: seconds between readings (default 6; the real meter sends every 30). |

Shell variables override the file, e.g. `NETWORK=baseSepolia npm run relayer`.

## Backup broker

The meter sends to `test.mosquitto.org` and switches to `broker.hivemq.com` if
that fails. The relayer listens on **both at once**, so if one broker goes down,
readings keep arriving through the other without anyone doing anything. It keeps
trying to reconnect to the broken one in the background. The log says which
brokers are connected.

## Recordings

Every message the relayer receives (including invalid ones) is appended to
`relayer/recordings/meter-<date>.jsonl`, one JSON object per line, with the time
and the broker it came from. These are signed public readings, not secrets, but
the folder is git-ignored so they don't pile up in the repo. Turn it off with
`--no-record`.

## Demo backup: the software meter

> **This is a backup for when Wokwi or the brokers are down. It is not the real
> meter.** The relayer prints a large banner saying so.

The software meter does what the ESP32 does, in Node: it builds readings, signs
them with the meter's **test** key using the deployed MeterOracle as the
signing target, and passes them through **exactly the same steps** as a live
MQTT message (shape check, `v`, dedupe, dry run, send). Timestamps and `seq` are
fresh, and energy totals continue from whatever the oracle has now, so it can
take over in the middle of a demo.

The scripted demo (`npm run relayer:demo`):

| Phase | Readings | What the oracle shows |
| --- | --- | --- |
| Normal | 4 | ~7% gap (normal line loss) → **OK** |
| Theft | 3 | an illegal connection: sold is only 65% of produced → **THEFT**, payouts paused |
| Recovery | 3 | back to normal → **OK** by itself |
| Tamper (`--tamper` or `--full`) | 2 | meter case opened → **TAMPER**; stays TAMPER until the admin's `clearTamper`, which the script then calls (only if the relayer wallet is an admin) → **OK** |
| Offline (`--offline` or `--full`) | 0, then 2 | silence → **OFFLINE** after `offlineTimeout` (120 s with the demo deploy; on a local chain the script fast-forwards the clock) → **OK** when readings resume |

Each reading counts as 30 seconds of sunshine at about 5 kW (~42 Wh), like the
real meter, even though the software meter sends one every few seconds.

**Which key?** The oracle only accepts readings signed by its registered meter.

- Easiest: put the **Wokwi meter's test key** (from
  `Hardware/wokwi-meter/secrets.h`) in `DEMO_DEVICE_PRIVATE_KEY`. Then nothing
  onchain needs changing, and you can switch from Wokwi to the backup with one
  command.
- Or use any test key and add `--register-device`. That makes the relayer call
  `setDevice` to switch the oracle to the software meter. It only works if
  `RELAYER_PRIVATE_KEY` is the admin wallet.

**Switching back to Wokwi after the backup has run:** the oracle's totals are
now ahead of what the Wokwi meter remembers, so the oracle refuses Wokwi's
readings ("energy totals are lower than the last accepted reading"). Once you
switch to the backup, stay on it for the rest of that demo, or redeploy before
the next one.

## Try it locally (no testnet money needed)

Two terminals, both in `Blockchain/`:

```bash
# 1. A private blockchain on your laptop
npm run node
```

```bash
# 2. A test key for the software meter: saved in relayer/.env, prints the address
npm run relayer -- --new-demo-key
```

Deploy with that address as the meter (in a second terminal, while the node runs):

```bash
METER_DEVICE_ADDRESS=0xTheAddressFromStep2 npm run deploy:local
```

On Windows PowerShell, set the variable first:
`$env:METER_DEVICE_ADDRESS="0x…"; npm run deploy:local`.

```bash
# 3. The full demo against the local chain
npm run relayer:demo -- --full --once
```

The Wokwi meter can't be used against a local chain: it signs for Base Sepolia
(chain 84532). Locally, its readings are rejected with a message saying which
contract and chain it must sign for.

## On Base Sepolia

1. `npm run preflight:baseSepolia`, then `npm run deploy:baseSepolia` (#11).
   That writes `deployments/baseSepolia.json` and prints the next steps.
2. Set the Wokwi meter's `VERIFYING_CONTRACT` (in its `secrets.h`) to the
   MeterOracle address the deploy printed.
3. In `relayer/.env`: `NETWORK=baseSepolia` and `RELAYER_PRIVATE_KEY=` a
   testnet wallet with a little Base Sepolia ETH (each reading costs a fraction
   of a cent of test ETH).
4. `npm run relayer`. The start-up banner shows the wallet's balance and warns if
   it is empty.

The demo deploy sets OFFLINE to 120 s without a reading (4 missed readings).
An operator can change it with `MeterOracle.setOfflineTimeout`, or set
`OFFLINE_TIMEOUT_S` in `Blockchain/.env` before deploying.

## Sponsor: hide gas from investors (#16)

> **Demo shortcut, testnet only.** In production this would be a smart wallet
> (ERC-4337) with a **paymaster** that pays the gas inside the investor's own
> transaction, so no ETH would be sent around at all.

Every transaction costs a little ETH for gas. A new investor has none. The
sponsor is a tiny web service: the web app calls `POST /sponsor {address}` once
the wallet is approved, and the sponsor sends that wallet a little Base Sepolia
ETH (default: tops up to 0.0005 ETH, enough for hundreds of transactions) and
some test USDC to buy shares with (default: tops up to 25 USDC). The API is in
[`interface/README.md`](../interface/README.md#sponsored-fees-16-hide-gas-from-investors).

```bash
npm run sponsor      # from Blockchain/; listens on http://127.0.0.1:8787
```

**Why its own process, not part of the relayer?** They do different jobs with
different wallets. If the sponsor were drained or busy, the relayer must still
get every meter reading onchain: separate wallets mean they never compete for
gas money or transaction numbers (nonces), and you can restart one without the
other. It shares the relayer's folder, settings file and network code, so
there's nothing extra to install.

**Who gets money:** only wallets that are **approved on SolarShareToken**
(`isApproved`) and not frozen. That's the main protection: a random wallet gets
`403 NOT_APPROVED` and nothing is sent. On top of that:

| Setting (`relayer/.env`) | Default | What it limits |
| --- | --- | --- |
| `SPONSOR_PER_WALLET_MAX` / `SPONSOR_PER_WALLET_WINDOW_H` | 1 per 24 h | top-ups per wallet |
| `SPONSOR_MAX_PER_HOUR` | 30 | top-ups per hour, all wallets together |
| `SPONSOR_TOTAL_ETH_CAP` | 0.05 ETH | ETH ever given away |
| `SPONSOR_TOTAL_USDC_CAP` | 1000 USDC | USDC ever given away (after that: ETH only) |
| `SPONSOR_ETH_AMOUNT`, `SPONSOR_USDC_AMOUNT` | 0.0005, 25 | top up **to** these balances; `SPONSOR_USDC_AMOUNT=0` turns USDC off |

The counts are saved in `relayer/sponsor-ledger.<network>.json` (git-ignored),
so restarting doesn't reset them. Delete that file to start fresh. Only one
top-up runs at a time, so ten clicks at once still send once.

It only runs on Base Sepolia or a local Hardhat node: it refuses to start on
any other chain.

**Set-up on Base Sepolia:** make a separate TEST wallet for it (for example
`npm run wallet:new` in a scratch copy, or any wallet app), put its key in
`SPONSOR_PRIVATE_KEY`, and send it some Base Sepolia ETH and test USDC (from
<https://faucet.circle.com>). 0.01 ETH covers 20 investors. The start-up line
shows its balances. If the web app is on another computer, set
`SPONSOR_HOST=0.0.0.0` and list the app's address in `SPONSOR_ALLOWED_ORIGINS`.

**Log lines**

```
04:51:10 sponsor: topped up 0x3f2a…91c0: 0.0005 ETH + 25.0 USDC  (total given: 0.0015 ETH, 75 USDC)
04:51:32 WARN sponsor: refused 0x8b11…02de: not approved on SolarShareToken
04:52:05 WARN sponsor: refused 0x3f2a…91c0: WALLET_LIMIT: This wallet was already topped up 1 time(s) in the last 1 day(s).
```

Locally (`npm run node` + `npm run deploy:local`) it needs no key: the node's
first test account pays, with the deploy's FAKE MockUSDC.

## Tests

`npm test` (in `Blockchain/`) runs the relayer tests with the contract tests, in
CI too. They live in `test/relayer/`:

- `message.ts`: message parsing, the real Wokwi message as a test vector, and
  working out `v` (both 27 and 28, tampered messages, wrong contract or chain).
- `dedupe.ts`: never the same `seq` twice.
- `relay.ts`: end to end on the in-memory chain: readings accepted, the theft
  and full demo sequences, a tampered message rejected without sending anything,
  duplicates skipped (also after a restart), readings the contract would refuse,
  safe retries after network failures, and replaying a recording.
- `sponsor.ts`: the sponsor's approval check (unapproved, frozen, bad
  address), every rate limit and cap, the ledger surviving a restart, ten
  requests at once, and end to end over HTTP: a brand-new wallet with no ETH is
  refused, approved, topped up, and then buys shares with its own key.

`npm run relayer:typecheck` type-checks the relayer code.

## Files

| File | What it does |
| --- | --- |
| `src/main.ts` | The command line: live mode, demo backup, start-up banner. |
| `src/relayer.ts` | The six steps above. Used by every mode. |
| `src/message.ts` | Message shape check, EIP-712 signing format, working out `v`. |
| `src/dedupe.ts` | Remembers which `seq` numbers were handled. |
| `src/reasons.ts` | Turns contract errors into plain English. |
| `src/mqtt.ts` | Listens on all brokers at once. |
| `src/recorder.ts` | Saves received messages, reads recordings back. |
| `src/softwareMeter.ts` | The demo backup meter and its scripted sequence. |
| `src/chain.ts`, `src/config.ts` | Blockchain connection and settings. |
| `src/abi.ts` | The MeterOracle functions the relayer calls. |
| `src/sponsor/` | The sponsor: `main.ts` (start-up), `server.ts` (HTTP), `sponsor.ts` (approval check and top-ups), `limits.ts` (rate limits and ledger), `chain.ts`, `config.ts`. |
