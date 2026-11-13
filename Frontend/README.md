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

No settings or keys are needed: the page only reads public data from the live
contracts on Base Sepolia.

## Where things are

| Path | What |
| --- | --- |
| `src/app/page.tsx` | Landing page (sections in `src/components/landing/`) |
| `src/app/solar/join` | Placeholder for sign-up and buying (next step, #21) |
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
