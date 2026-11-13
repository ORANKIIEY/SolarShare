"use client";

import { useId, useState } from "react";
import { ArrowUpRight, Minus, Plus } from "lucide-react";
import { Container, Corners, ExternalA, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { MONEY_MODEL_URL, ZAR_PER_USD } from "@/lib/chain";
import { rand } from "@/lib/format";

// From docs/money-model: 112.60 USDC a month to investors, shared by 3,500 shares.
const INVESTOR_USDC_PER_MONTH = 112.6;
const SHARES = 3500;
const PRICE_USDC = 5;
const perShareMonthUsdc = INVESTOR_USDC_PER_MONTH / SHARES;

const estimate = (n: number) => ({
  pay: n * PRICE_USDC * ZAR_PER_USD,
  month: n * perShareMonthUsdc * ZAR_PER_USD,
  year: n * perShareMonthUsdc * 12 * ZAR_PER_USD,
});

export default function Estimate() {
  const { t } = useLang();
  const [n, setN] = useState(20);
  const id = useId();
  const ex = estimate(20);
  const e = estimate(n);
  const clamp = (v: number) => Math.max(1, Math.min(200, Math.round(v) || 1));

  return (
    <section id="estimate" aria-labelledby="estimate-title" className="py-20 lg:py-28">
      <Container>
        <SectionHead id="estimate-title" index="05" label={t.estimate.label} title={t.estimate.title} />

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-0 lg:divide-x divide-zinc-300">
          {/* Headline yield */}
          <div className="lg:pr-12">
            <p className="text-6xl sm:text-7xl font-semibold tracking-tighter leading-none">{t.estimate.yield}</p>
            <p className="mt-3 text-base font-medium text-zinc-700">{t.estimate.yieldLabel}</p>
            <p className="mt-8 text-sm text-zinc-700 leading-relaxed">{t.estimate.note}</p>
            <ExternalA
              href={MONEY_MODEL_URL}
              className="mt-6 inline-flex items-center gap-2 min-h-11 text-sm font-semibold tracking-wide uppercase underline underline-offset-4"
            >
              {t.estimate.link}
              <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            </ExternalA>
          </div>

          {/* Worked example */}
          <div className="lg:px-12">
            <h3 className="eyebrow text-zinc-700">{t.estimate.exampleTitle}</h3>
            <dl className="mt-6 divide-y divide-zinc-300 border-y border-zinc-300">
              {[
                [t.estimate.pay, rand(ex.pay)],
                [t.estimate.month, rand(ex.month)],
                [t.estimate.year, rand(ex.year, 0)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 py-4">
                  <dt className="text-sm font-medium text-zinc-700">{k}</dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Calculator */}
          <div className="lg:pl-12">
            <div className="relative p-5">
              <Corners />
              <label htmlFor={`${id}-n`} className="eyebrow text-zinc-700">
                {t.estimate.calcLabel}
              </label>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  aria-label="−1"
                  onClick={() => setN((v) => clamp(v - 1))}
                  className="w-11 h-11 border border-black inline-flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <input
                  id={`${id}-n`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={200}
                  value={n}
                  onChange={(ev) => setN(clamp(Number(ev.target.value)))}
                  className="w-24 h-11 border border-zinc-400 bg-white text-center text-xl font-semibold tabular-nums"
                />
                <button
                  type="button"
                  aria-label="+1"
                  onClick={() => setN((v) => clamp(v + 1))}
                  className="w-11 h-11 border border-black inline-flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={n}
                onChange={(ev) => setN(clamp(Number(ev.target.value)))}
                aria-label={t.estimate.calcLabel}
                className="mt-5 w-full accent-black"
              />
              <div aria-live="polite" className="mt-5">
                <dl className="space-y-2">
                  {[
                    [t.estimate.calcPay, rand(e.pay)],
                    [t.estimate.calcMonth, rand(e.month)],
                    [t.estimate.calcYear, rand(e.year, e.year < 100 ? 2 : 0)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-zinc-700">{k}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
