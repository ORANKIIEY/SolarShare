# SolarShare money model (one page)

> **Every number here is an assumption or a mock** until the team's interviews (#30) and a real installer quote replace it. "Soweto Block A" and "Solar Share Block A SPV (Pty) Ltd" are **illustrative mocks**, not a real site or company. Rand figures use **R16.50 per US dollar** (USDC is a digital dollar). All sums were checked with a script; small differences are rounding.

## 1. The asset and its income

A **10 kWp solar + 20 kWh battery mini-grid** costing about **R350,000** (about 21,212 USDC). In Gauteng it makes about **1,400 kWh a month** (45–50 kWh a day). That power is sold on prepaid meters to **20 homes and 5 spaza shops**, whose expected use in the sample power purchase agreement is about 47.5 kWh a day (about 1,440 kWh a month), so the system can sell what it makes.

The onchain tariff is **0.20 USDC per kWh = R3.30 per kWh**. That is in the range a Johannesburg City Power prepaid customer pays (roughly R3 to R4 per kWh before VAT in 2025/26), but **above Eskom's Homelight prepaid tariff** (roughly R2.20 to R2.50 per kWh). So the price works where the municipality is the supplier, and the selling point is reliable power (the battery), not cheaper power. There is little room to raise it.

## 2. The shares

**3,500 shares at 5 USDC = 17,500 USDC = R288,750.** That is **R61,250 (17.5%) short** of the R350,000 cost. 5 USDC × 3,500 only equals R350,000 at R20 per dollar; at today's rate it doesn't. Two honest fixes: price shares at **about 6 USDC** (3,500 × 6 = 21,000 USDC = R346,500), or cover the gap with a grant, installer finance or the operator's own money. The demo keeps 5 USDC (the deployed price); yields are shown at both prices.

## 3. Where each month's money goes (normal month, no theft)

| Line | USDC / month | Rand / month | How it's worked out |
| --- | ---: | ---: | --- |
| Gross sales | **280.00** | 4,620 | 1,400 kWh × 0.20 USDC |
| SolarShare platform fee | −8.40 | −139 | 3% of gross |
| Prepaid vendor fees | −14.00 | −231 | 5% of gross |
| Maintenance and panel cleaning | −25.00 | −413 | about 1.4% of cost a year |
| Insurance | −18.00 | −297 | about 1% of cost a year |
| Battery and inverter replacement reserve | −42.00 | −693 | about R85,000 saved over 10 years |
| Local operator (part-time) | −60.00 | −990 | meters, customers, cleaning, faults |
| **Paid to investors** | **112.60** | **1,858** | gross minus everything above |
| Per share | 0.0322 a month, **0.386 a year** | R0.53 a month | 112.60 ÷ 3,500 |

**Yield: 7.7% a year at 5 USDC a share** (0.386 ÷ 5), or **6.4% at 6 USDC**. So the numbers come close to the 8% target but **do not reach it**. What would:

| Change | Investor payout a year | Yield at 5 USDC | Yield at 6 USDC |
| --- | ---: | ---: | ---: |
| As above (0.20 USDC = R3.30 per kWh) | 1,351 USDC | 7.7% | 6.4% |
| Tariff 0.21 USDC (R3.47 per kWh) | 1,506 USDC | **8.6%** | 7.2% |
| Tariff 0.23 USDC (R3.80 per kWh) | 1,815 USDC | 10.4% | **8.6%** |

Lower running costs would work too: every 10 USDC a month saved adds about 0.7 percentage points at 5 USDC. Note that this is a **cash yield**: the payouts also have to pay back the money invested, because the system wears out. Over a 25-year life, 7.7% a year works out to a true return of about 5.9% a year (about 4.6% over 20 years). That is similar to a bank fixed deposit, so the pitch to investors is local ownership, a small ticket size and income they can check, not a high return.

## 4. Theft: why it hurts investors so much

Costs stay the same whether power is paid for or stolen, so **lost income comes straight off the payout**. A 20% drop in sales removes 56 USDC of gross, but only 4.48 USDC of percentage-based fees, so the payout falls by 51.52 USDC.

| Energy stolen | kWh paid for | Paid to investors | Payout lost | Meter status |
| --- | ---: | ---: | ---: | --- |
| None | 1,400 | 112.60 USDC | — | OK |
| 10% | 1,260 | 86.84 USDC | −23% | OK (gap 10%) |
| 15% | 1,190 | 73.96 USDC | **−34% (a third)** | OK (the line: THEFT needs *more* than 15%) |
| 20% | 1,120 | 61.08 USDC | **−46% (almost half)** | **THEFT: claims paused** |

Each 1% of power stolen costs investors about 2.3% of their payout. Our earlier notes said "20% theft cuts payouts by about a third"; with these costs it is **almost half**, and a third is already gone at 15%.

How the contracts protect investors:
- **Money only follows proof.** The operator can't deposit more than *meter-proven kWh sold × tariff* (`RevenueDistributor.depositCap`), so nobody can pay out income that wasn't earned and hide a problem.
- **The 15% gap rule.** `MeterOracle` compares energy sold with energy produced on every signed reading. If sold falls more than 15% behind, the status turns **THEFT within minutes**, a signed record appears on Basescan, and **claims pause**. Money already deposited stays safe in the contract, and claims resume by themselves once the gap closes.
- **Why that matters:** without the meter, theft shows up as a smaller payout months later, with no proof of why. With it, everyone sees the theft the same day and the operator has to cut the illegal connections before investors can claim again. The pause can't recover stolen power; it stops theft from going unnoticed. Theft under 15% isn't flagged, so once real loss levels are known the line could move closer to 10%.

## 5. Example investor: a spaza owner buys 20 shares

| | USDC | Rand |
| --- | ---: | ---: |
| Pays | 100.00 | 1,650 |
| Gets each month | 0.64 | 10.62 |
| Gets each year | 7.72 | 127.40 |
| Payback | about **13 years** | |

**Cash-out (mocked):** the payout lands in the app as USDC. The investor taps "Cash out" and a licensed partner (e.g. Kotani Pay or Yellow Card) converts it to rand and sends it to mobile money or a bank account. In the demo this is a receipt screen. Amounts this small are best cashed out every few months so the partner's fee doesn't eat them.

## 6. How SolarShare makes money, and who pays

SolarShare keeps **3% of each site's gross sales**, which comes from the electricity customers pay. That is about **100.80 USDC (R1,663) a year per site**:

| Sites | Platform fee a year |
| ---: | ---: |
| 1 | 101 USDC (R1,663) |
| 10 | 1,008 USDC (R16,632) |
| 100 | 10,080 USDC (R166,320) |
| 1,000 | 100,800 USDC (R1.66 million) |

**Honest read:** at this site size, 3% doesn't pay for a team until well past 100 sites. A business needs bigger sites (a 50 to 100 kWp school, clinic or taxi rank roof earns 5 to 10 times more) and/or a one-off listing fee on each share sale (e.g. 2% of the money raised, 350 USDC per site).

**Licences and regulated partners needed:**
- **FSCA (FAIS Act):** crypto assets are financial products, so selling and advising on tokens needs a licensed crypto asset service provider (CASP), or a partner who holds one. A lawyer must also check whether selling shares to the public needs a prospectus under the Companies Act.
- **FIC Act:** CASPs must do KYC and anti-money-laundering checks, e.g. with **Smile ID** (mocked as an "approve" button).
- **NERSA / municipality:** register the generator, get the municipality's approval to connect, and confirm whether selling power to neighbours needs a NERSA licence or falls under an exemption. A partner mini-grid operator would normally hold this.
- **Cash-out:** a licensed on/off-ramp such as **Kotani Pay or Yellow Card** (check their current South African licences).
- **Prepaid vending:** an STS prepaid vendor; **POPIA** for customer data; a **tax adviser** (below).

## 7. Assumptions

| Number | Value | Type | Source or reasoning |
| --- | --- | --- | --- |
| Asset, owner, site | Soweto Block A, Solar Share Block A SPV (Pty) Ltd | **Mock** | Placeholder until #31 names a real site |
| Exchange rate | R16.50 per USD | Assumption | Rand traded about R16.4–16.6 in early Nov 2026 ([Trading Economics](https://tradingeconomics.com/south-africa/currency)) |
| System cost | R350,000 | Assumption | A 10 kW hybrid with a 15–20 kWh battery is R200,000–R300,000+ for one home ([EnergyBee, 2026](https://energybee.co.za/guides/10kw-solar-system-price-south-africa-2026)); extra for mini-grid wiring and 25 prepaid meters |
| Energy made and sold | 1,400 kWh a month | Assumption | Gauteng solar makes roughly 1,600–1,700 kWh per kWp a year ([Global Solar Atlas](https://globalsolaratlas.info)); 10 kWp × 1,680 ÷ 12 ≈ 1,400. Normal losses ignored (they use part of the 15% allowance) |
| Customers | 20 homes, 5 spaza shops, about 47.5 kWh a day | **Mock** | Sample power purchase agreement ([`docs/asset-documents/`](../asset-documents/README.md)) |
| Tariff | 0.20 USDC (R3.30) per kWh | Deployed demo setting | `TARIFF_USDC_PER_KWH` in `Blockchain/scripts/lib/deployConfig.ts` |
| City Power prepaid | roughly R3–R4 per kWh before VAT (2025/26) | Public figure, rough | [City of Johannesburg 2025/26 tariffs](https://joburg.org.za/documents_/Documents/Amendment%20of%20Tariff%20Charges/Consolidated-Tariffs-FY20252026.FINAL.pdf), read via secondary summaries; about 9% higher from July 2026 |
| Eskom Homelight prepaid | roughly R2.20–R2.50 per kWh (2025/26) | Public figure, rough | [Eskom tariff booklet](https://www.eskom.co.za/distribution/wp-content/uploads/2025/06/Tariff-booklet.pdf), read via news summaries |
| Shares | 3,500 at 5 USDC | Deployed demo setting | `MAX_SUPPLY`, `PRICE_PER_SHARE` in `deployConfig.ts`. Assumes all 3,500 are sold |
| Platform fee | 3% of gross sales | SolarShare decision | Taken before the operator deposits; not enforced onchain in the demo |
| Prepaid vendor fees | 5% of gross sales | Assumption | No public source checked; replace with a vendor quote |
| Maintenance | 25 USDC (R413) a month | Assumption | About 1.4% of cost a year, a common rule of thumb |
| Insurance | 18 USDC (R297) a month | Assumption | About 1% of cost a year; needs a broker quote |
| Replacement reserve | 42 USDC (R693) a month | Assumption | Battery about R60,000 (public listings run R12,000–R70,000 per battery, [EnergyBee](https://energybee.co.za)) plus inverter about R25,000, replaced after about 10 years |
| Operator | 60 USDC (R990) a month | Assumption | Part-time local caretaker; to be checked in interviews (#30) |
| Theft line | more than 15% gap | Deployed demo setting | `THEFT_GAP_BPS` in `deployConfig.ts`, `MeterOracle.theftGapBps` |
| Tax and VAT | ignored | Assumption | The SPV's sales (about R55,000 a year) are far below SARS's VAT registration threshold. Section 12B lets small solar be written off in year one, so little company tax early on; dividend tax may apply to investors. Needs a tax adviser |
| Cash-out partner and fees | Kotani Pay or Yellow Card | **Mock** | Receipt screen in the demo; no fee assumed |
