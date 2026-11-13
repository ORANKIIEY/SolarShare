# SolarShare contract interface (for the frontend)

This folder tells the web app what it can read from and do with the SolarShare
smart contracts, before they are deployed. Build the screens against
`sample-data.json` now and swap in live calls later. The function names here
match the real contracts.

| File | What it is |
| --- | --- |
| `README.md` | This guide: every read, write, event and status, grouped by screen. |
| `types.ts` | TypeScript types and enums for those values (copy into the app). |
| `sample-data.json` | Realistic sample values, including a THEFT example. |
| `abi/` | The contract ABIs (the machine-readable list of functions) for viem/wagmi, one JSON file per contract. Import them with `import abi from "./abi/ShareSale.json"`. |

After deployment, `Blockchain/deployments/baseSepolia.json` will hold the real
contract addresses and ABIs (issue #11).

## The four contracts in one paragraph each

- **SolarShareToken** is the share. One token = one share of the Block A solar
  mini-grid. There are at most **3,500** shares and they can't be split (0
  decimals). Only wallets approved by the KYC officer can hold or send them.
- **ShareSale** sells new shares for a fixed USDC price (5 USDC each at launch).
  The USDC goes to the operator's treasury.
- **MeterOracle** receives readings signed by the solar meter (an ESP32). It
  rejects fakes and replays and works out a **status**: OK, THEFT, TAMPER or
  OFFLINE.
- **RevenueDistributor** holds the monthly income (in USDC) and lets each
  shareholder **claim** their part. The operator can never deposit more than the
  meter says was sold, and claims stop while the meter is not OK.

## Units (read this first)

| Value | Unit | Example |
| --- | --- | --- |
| Shares | whole numbers, 0 decimals | `40n` = 40 shares |
| USDC | 6 decimals | `5_000_000n` = 5.00 USDC → `formatUnits(x, 6)` |
| Energy | watt-hours (Wh) | `9_000_000n` = 9,000 kWh |
| Power | watts (W) | `6420` = 6.42 kW (max 10,000) |
| Time | Unix seconds | `1794571200n` → `new Date(Number(x) * 1000)` |
| Gap / threshold | basis points | `1500` = 15% |

viem returns large integers as `bigint`, small ones (`uint8`, `uint32`) as `number`.

## Meter status values

`MeterOracle.status()` returns a number:

| Value | Name | Meaning for users | How it ends |
| --- | --- | --- | --- |
| 0 | **OK** | All good. Payouts can be claimed. | — |
| 1 | **THEFT** | Less than 85% of the energy produced was paid for in the last reading. Someone may be taking power. | Clears **by itself** on the next normal reading. |
| 2 | **TAMPER** | The meter says its case was opened. | An **admin** clears it after an inspection. |
| 3 | **OFFLINE** | No reading for more than `offlineTimeout` seconds (600 s normally, shorter for the demo). Also the status before the first reading. | Clears with the next good reading. |

If more than one applies, the status shows the first in this order: TAMPER,
THEFT, OFFLINE. `getMeterState()` also returns each flag on its own
(`tamperActive`, `theftActive`, `offline`) if you want to show them all.

While the status is anything other than OK, **nobody can claim payouts**.

---

## Screen 1: Asset page (public)

What the solar asset is, how much is sold, and proof it's real.

**Reads**

| Contract | Function | Returns |
| --- | --- | --- |
| SolarShareToken | `name()`, `symbol()` | `"Block A Solar Share"`, `"SSBA"` |
| SolarShareToken | `MAX_SUPPLY()` | `3500n` |
| SolarShareToken | `totalSupply()` | shares sold so far |
| SolarShareToken | `getDocuments()` | list of `{ name, sha256Hash, uri, updatedAt }` |
| ShareSale | `pricePerShare()` | USDC per share (6 decimals) |
| ShareSale | `sharesRemaining()` | `3500 - totalSupply` |
| RevenueDistributor | `tariffUsdcPerKwh()` | price per kWh sold (6 decimals) |
| RevenueDistributor | `totalDeposited()` | all income paid in so far |
| RevenueDistributor | `depositCap()` | max income allowed = attested kWh sold × tariff |
| MeterOracle | `getMeterState()` | status, totals, power, flags (see `MeterState` in `types.ts`) |

**Documents.** The three names are `SPV_CERTIFICATE`,
`INSTALLATION_CERTIFICATE` and `POWER_PURCHASE_AGREEMENT`. Show the IPFS link
and the SHA-256 hash. A visitor can download the file, hash it with SHA-256 and
check it matches: that proves the document wasn't swapped.

**Events for an activity feed:** `ReadingAccepted`, `IncomeDeposited`,
`SharesPurchased`.

## Screen 2: Buy shares

**Reads first**

| Contract | Function | Use |
| --- | --- | --- |
| SolarShareToken | `isApproved(wallet)` | If `false`, show "Your wallet needs to be approved first" and hide Buy. |
| SolarShareToken | `isFrozen(wallet)` | If `true`, block buying. |
| ShareSale | `paused()` | If `true`, show "Sales are paused". |
| ShareSale | `sharesRemaining()` | If `0n`, show "Sold out". Cap the input at this. |
| ShareSale | `quote(amount)` | USDC cost for `amount` shares. |
| USDC | `balanceOf(wallet)`, `allowance(wallet, ShareSale)` | Enough money? Already approved? |

**Writes (two transactions)**

1. `usdc.approve(ShareSaleAddress, cost)`: lets the sale contract take the USDC.
   Skip if `allowance` is already ≥ cost.
2. `ShareSale.buy(amount)`: takes the USDC, sends it to the treasury and gives
   the wallet `amount` new shares.

**Event:** `SharesPurchased(buyer, amount, cost)`.

**Errors to turn into messages**

| Error | Message |
| --- | --- |
| `AccountNotApproved(account)` | "Your wallet is not approved yet." |
| `AccountFrozen(account)` | "Your wallet is frozen. Contact the operator." |
| `SoldOut(requested, remaining)` | "Only {remaining} shares left." |
| `ZeroAmount()` | "Enter at least 1 share." |
| `EnforcedPause()` | "Sales are paused." |
| `ERC20InsufficientAllowance` / `ERC20InsufficientBalance` | "Approve USDC first" / "Not enough USDC." |

## Screen 3: My shares

**Reads**

| Contract | Function | Use |
| --- | --- | --- |
| SolarShareToken | `balanceOf(wallet)` | number of shares |
| SolarShareToken | `totalSupply()` | to show "you own x%" |
| RevenueDistributor | `pendingPayout(wallet)` | USDC ready to claim |
| RevenueDistributor | `claimBlocker(wallet)` | why they can't claim (0 = they can). See `ClaimBlocker` in `types.ts`. |
| RevenueDistributor | `totalClaimedBy(wallet)` | lifetime payouts |
| MeterOracle | `status()` | show the status badge next to the Claim button |

**Writes**

- `RevenueDistributor.claim()`: sends all pending USDC to the wallet.
- `SolarShareToken.transfer(to, amount)`: give shares to another **approved**
  wallet. Pending payouts stay with the sender; the receiver earns from the
  next deposit.

**Events:** `PayoutClaimed(account, amount)`, `Transfer(from, to, value)`.

**Claim errors**

| Error | Message |
| --- | --- |
| `MeterNotOk(status)` | "Payouts are paused: meter status is THEFT/TAMPER/OFFLINE." |
| `NothingToClaim()` | "Nothing to claim yet." |
| `AccountNotApproved(account)` / `AccountFrozen(account)` | as above |
| `SharesPaused()` | "SolarShare is paused for an emergency." |

Tip: call `claimBlocker(wallet)` and disable the button with the matching
message instead of waiting for an error.

## Screen 4: Operator / admin

Only wallets with the right **role** can do these. Check with
`hasRole(ROLE, wallet)`; the role ids are read with e.g. `KYC_ROLE()`.

| Who | Contract | Write | What it does |
| --- | --- | --- | --- |
| KYC officer (`KYC_ROLE`) | SolarShareToken | `approveWallet(wallet)` / `revokeWallet(wallet)` | Allow or stop a wallet holding shares. |
| KYC officer | SolarShareToken | `freeze(wallet)` / `unfreeze(wallet)` | Lock a wallet (lost phone, investigation). |
| Admin (`DEFAULT_ADMIN_ROLE`) | SolarShareToken | `recover(lostWallet, newWallet)` | Moves all shares **and unclaimed payouts** to a new approved wallet. |
| Admin | SolarShareToken | `pause()` / `unpause()` | Emergency stop for all share moves and claims. |
| Admin | SolarShareToken | `setDocument(name, sha256Hash, uri)` | Add or update an asset document. |
| Operator (`OPERATOR_ROLE`) | RevenueDistributor | `deposit(amount)` | Pay in monthly income. Needs `usdc.approve(Distributor, amount)` first. Reverts with `DepositExceedsAttestedEnergy(requested, remaining)` if over the cap; read `remainingDepositAllowance()` to show the limit. |
| Admin | RevenueDistributor | `setTariff(usdcPerKwh)` | Change the price per kWh. |
| Admin | MeterOracle | `clearTamper()` | Clear TAMPER after an inspection. |
| Admin | MeterOracle | `setDevice(meterId, deviceAddress)` | Register or replace the meter. |
| Operator (`OPERATOR_ROLE`) | MeterOracle | `setTheftGapBps(bps)` | THEFT threshold (default 1500 = 15%). |
| Operator | MeterOracle | `setOfflineTimeout(seconds)` | OFFLINE after this long without a reading (default 600). |
| Admin | ShareSale | `setPrice(usdc)`, `setTreasury(addr)`, `pause()`, `unpause()` | Sale settings. |

**Events for an admin log:** `WalletApproved`, `WalletRevoked`, `WalletFrozen`,
`WalletUnfrozen`, `WalletRecovered`, `DocumentSet`, `IncomeDeposited`,
`TariffSet`, `TamperCleared`, `DeviceSet`, `TheftGapSet`, `OfflineTimeoutSet`.

## Screen 5: Live theft banner (the demo moment)

The judge plays the thief: they draw power without paying, the meter's next
signed reading shows sold energy far below produced, and the chain flips to
THEFT. Payouts stop until it's fixed.

**How to drive the banner**

- **Poll** `MeterOracle.getMeterState()` every few seconds (Base makes a block
  about every 2 seconds). This is the only way to catch **OFFLINE**, because
  OFFLINE is worked out at read time and has no event.
- **Or watch events** with viem `watchContractEvent`:
  - `TheftDetected(meterId, seq, deltaProducedWh, deltaSoldWh, gapBps)`:
    show "⚠ Possible theft: only {100 - gapBps/100}% of energy was paid for".
  - `TamperDetected(meterId, seq)`: show "Meter case opened".
  - `StatusChanged(previous, current)`: switch the banner colour; when
    `current == 0` show "Back to normal, payouts resumed".
  - `ReadingAccepted(...)`: update the live power and energy numbers.

**Suggested banner text**

| Status | Banner |
| --- | --- |
| OK | green: "Meter OK · {lastPowerW/1000} kW now · payouts active" |
| THEFT | red: "Theft detected · {gapBps/100}% of energy unpaid · payouts paused" |
| TAMPER | orange: "Meter tampered · waiting for inspection · payouts paused" |
| OFFLINE | grey: "Meter offline since {lastTimestamp} · payouts paused" |

## Full reference

### SolarShareToken (ERC-20, 0 decimals)

Reads: `name()`, `symbol()`, `decimals()` (0), `totalSupply()`,
`MAX_SUPPLY()` (3500), `balanceOf(a)`, `isApproved(a)`, `isFrozen(a)`,
`paused()`, `distributor()`, `getDocuments()`, `getDocument(name)`,
`hasRole(role, a)`, `KYC_ROLE()`, `MINTER_ROLE()`, `DEFAULT_ADMIN_ROLE()`.

Writes: `transfer(to, amount)`, `transferFrom(from, to, amount)`,
`approve(spender, amount)` (normal ERC-20 allowance, **not** KYC approval),
`approveWallet(a)`, `revokeWallet(a)`, `freeze(a)`, `unfreeze(a)`,
`recover(lost, newWallet)`, `mint(to, amount)` (minter only; ShareSale has
this role), `pause()`, `unpause()`, `setDocument(name, sha256Hash, uri)`,
`setDistributor(addr)`.

Events: `Transfer`, `WalletApproved(account, by)`, `WalletRevoked(account, by)`,
`WalletFrozen(account, by)`, `WalletUnfrozen(account, by)`,
`WalletRecovered(lost, newWallet, amount, by)`,
`DocumentSet(name, sha256Hash, uri)`, `DistributorSet(distributor)`,
`Paused(by)`, `Unpaused(by)`.

Errors: `AccountNotApproved(account)`, `AccountFrozen(account)`,
`MaxSupplyExceeded(requested, remaining)`, `EnforcedPause()`.

### MeterOracle

Reads: `status()`, `isOffline()`, `getMeterState()`, `latestReading()`, `totalProducedWh()`,
`totalSoldWh()`, `theftGapBps()`, `offlineTimeout()`, `maxReadingAge()`,
`MAX_POWER_W()` (10000), `meterId()`, `deviceSigner()`, `lastSeq()`,
`readingDigest(reading)` (for the relayer).

Writes: `submitReading(reading, v, r, s)` (anyone can send it, only the
meter's signature counts; the relayer does this, not the app), `setDevice`,
`clearTamper`, `setTheftGapBps`, `setOfflineTimeout`, `setMaxReadingAge`.

Events: `ReadingAccepted(meterId, seq, timestamp, energyProducedWh,
energySoldWh, powerW, tamper, gapBps)`, `StatusChanged(previous, current)`,
`TheftDetected(meterId, seq, deltaProducedWh, deltaSoldWh, gapBps)`,
`TamperDetected(meterId, seq)`, `TamperCleared(by)`, `DeviceSet(meterId,
signer)`, `TheftGapSet(bps)`, `OfflineTimeoutSet(seconds)`,
`MaxReadingAgeSet(seconds)`.

Errors (the relayer sees these): `DeviceNotSet()`, `WrongMeter(got,
expected)`, `InvalidSigner(recovered)`, `SeqNotIncreasing(seq, lastSeq)`,
`EnergyWentDown()`, `TimestampTooOld(timestamp, oldestAllowed)`,
`TimestampInFuture(timestamp, latestAllowed)`, `PowerTooHigh(powerW, max)`.

### RevenueDistributor

Reads: `pendingPayout(a)`, `claimBlocker(a)`, `totalDeposited()`,
`totalClaimed()`, `totalClaimedBy(a)`, `depositCap()`,
`remainingDepositAllowance()`, `tariffUsdcPerKwh()`, `rewardPerShare()`,
`usdc()`, `token()`, `oracle()`.

Writes: `claim()`, `deposit(amount)` (operator), `setTariff(usdcPerKwh)`
(admin).

Events: `IncomeDeposited(by, amount, totalDeposited, rewardPerShare)`,
`PayoutClaimed(account, amount)`, `TariffSet(previous, current)`,
`UnclaimedMoved(from, to, amount)`.

Errors: `MeterNotOk(status)`, `NothingToClaim()`, `AccountNotApproved`,
`AccountFrozen`, `SharesPaused()`, `DepositExceedsAttestedEnergy(requested,
remaining)`, `NoSharesIssued()`, `ZeroAmount()`.

### ShareSale

Reads: `pricePerShare()`, `quote(amount)`, `sharesRemaining()`, `treasury()`,
`paused()`, `token()`, `usdc()`.

Writes: `buy(amount)`, `setPrice(usdc)`, `setTreasury(addr)`, `pause()`,
`unpause()`.

Events: `SharesPurchased(buyer, amount, cost)`, `PriceSet(previous, current)`,
`TreasurySet(treasury)`.

Errors: `AccountNotApproved`, `AccountFrozen`, `SoldOut(requested,
remaining)`, `ZeroAmount()`, `EnforcedPause()`.

### USDC

On Base Sepolia this is Circle's test USDC at
`0x036CbD53842c5426634e7929541eC2318f3dCF7e` (6 decimals, free from
<https://faucet.circle.com>). Locally and in tests we use `MockUSDC`, a fake
copy anyone can mint.
