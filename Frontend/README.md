# SolarShare web app

The public landing page (and, next, the investor and operator pages) for
SolarShare: neighbours co-own a community solar mini-grid and get paid monthly,
only for power a tamper-checked meter has proven was sold.

**Demo on Base Sepolia, a test network. No real money.** The site ("Soweto
Block A"), the company and the documents are samples.

## Run it

Needs Node 22.

```bash
npm ci
npm run dev          # http://localhost:3000
npm run build        # what CI runs
```

The landing page and the read-only platform pages need no settings: they only
read public data from the live contracts on Base Sepolia.

### Sign-up, buying and the operator page

These need two things running next to the web app:

1. **Server settings.** Copy `.env.example` to `.env.local` (git-ignored) and
   fill in the operator's **test** key and a password. The key is only read by
   server routes (`src/lib/server/`), never sent to a browser.
2. **The sponsor service**, which gives each new investor test ETH for network
   fees and test USDC to buy with: `npm run sponsor` in `Blockchain/` (needs
   `SPONSOR_PRIVATE_KEY` in `Blockchain/relayer/.env`, a funded test wallet).

| Page | What |
| --- | --- |
| `/` | Public landing page |
| `/solar` | The mini-grid: facts, key numbers, live meter readings, documents with Verify, risks |
| `/solar/join` | Sign up (mocked phone code and ID check) and buy shares in rand, with a timer |
| `/solar/me` | Shares owned, payouts, claim, mocked cash-out to mobile money, history |
| `/solar/live` | The theft banner and readings feed, big, for a projector (checks every 3 s) |
| `/solar/operator` | Approve investors, pay in income, freeze/recover, clear tamper (password login) |

**How an investor's account works (demo only).** A key is made in the browser
and kept in its storage; the investor never sees it, a seed phrase or the word
"wallet". After the mocked ID check the server approves the account onchain
(automatically when `DEMO_AUTO_APPROVE=1`) and the sponsor tops it up, so the
investor only presses "Buy". A real launch would use a passkey smart account
with a paymaster instead, and a licensed ID-check partner.

**Route protection** (`src/proxy.ts`): everything is public except
`/solar/operator` and `/api/operator`, which need the operator login (a signed,
expiring, http-only cookie).

## Where things are

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Landing page (sections in `src/components/landing/`) |
| `src/app/solar/` | The platform pages (shell in `src/components/platform/`) |
| `src/app/api/` | Server routes: applications, sponsor pass-through, operator actions |
| `src/lib/server/` | Server-only code: operator key, login, application store (`.data/`, git-ignored) |
| `src/lib/account.ts` | The investor's in-browser test account: buy and claim |
| `src/lib/chain.ts` | Read-only blockchain client and helpers (meter, shares, documents) |
| `src/lib/contracts.generated.ts` | Contract addresses and ABIs, generated from `Blockchain/deployments/baseSepolia.json` |
| `src/lib/hosts.json` | Every outside address the browser may call; the Content-Security-Policy in `next.config.ts` is built from it |
| `src/i18n/` | English and isiZulu text (isiZulu is a draft to be checked by a first-language speaker) |

After a new contract deploy, run `npm run sync:contracts` to refresh the
generated file.

### Why two kinds of blockchain endpoint

`sepolia.base.org` answers normal reads but only searches 200 blocks (about 7
minutes) of events at a time. Meter reading history therefore comes from
Tenderly's public gateway, with publicnode as a backup. Both are free and need
no key.

## Writing rules

Plain words for investors: "share", "payout", "cash out". Never "token", "gas"
or "wallet". Status is always shown with text and an icon, not colour alone.
