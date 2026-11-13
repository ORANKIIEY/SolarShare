"use client";

import { useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Container, ExternalA, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { MONEY_MODEL_URL } from "@/lib/chain";

// Bars for the little produced-vs-paid chart in the demo panel (relative units).
const PRODUCED = [5, 6, 7, 8, 8, 9, 9, 8, 7, 6];
const THEFT_FROM = 6; // bars after this show the gap opening up

export default function Theft() {
  const { t } = useLang();
  const [theft, setTheft] = useState(false);

  return (
    <section id="theft" aria-labelledby="theft-title" className="bg-paper-2 border-y border-zinc-300/60 py-20 lg:py-28">
      <Container className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-start">
        <div>
          <SectionHead id="theft-title" index="04" label={t.theft.label} title={t.theft.title} intro={t.theft.body} />

          <div className="mt-10 flex flex-wrap items-end gap-x-6 gap-y-2">
            <span className="text-7xl sm:text-8xl font-semibold tracking-tighter leading-none">{t.theft.stat}</span>
            <span className="pb-2 text-base font-medium text-zinc-700 max-w-[16rem]">
              {t.theft.statLabel} <strong className="text-black">{t.theft.statValue}</strong>
            </span>
          </div>

          <table className="mt-10 w-full text-sm">
            <caption className="eyebrow text-left text-zinc-700 mb-3">{t.theft.tableTitle}</caption>
            <tbody>
              {t.theft.rows.map((r, i) => (
                <tr key={r.stolen} className="border-t border-zinc-300">
                  <th scope="row" className="py-3 pr-3 text-left font-semibold tabular-nums w-16">{r.stolen}</th>
                  <td className="py-3 pr-3 tabular-nums">{r.payout}</td>
                  <td className={`py-3 text-right font-semibold ${i === 3 ? "text-red-800" : "text-zinc-700"}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {i === 3 ? <TriangleAlert className="w-4 h-4" aria-hidden="true" /> : <CircleCheck className="w-4 h-4" aria-hidden="true" />}
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-600">
            <ExternalA href={MONEY_MODEL_URL} className="underline underline-offset-4">
              {t.theft.source}
            </ExternalA>
          </p>
        </div>

        {/* Demo panel, dashboard style */}
        <div className="bg-[#111113] text-zinc-100 border border-[#222224] lg:mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#222224]">
            <h3 className="text-sm font-medium">{t.theft.demoTitle}</h3>
            <div role="radiogroup" aria-label={t.theft.demoTitle} className="inline-flex bg-[#0b0b0c] border border-[#2e2e30] p-0.5">
              {[
                { on: !theft, label: t.theft.demoNormal, set: false },
                { on: theft, label: t.theft.demoTheft, set: true },
              ].map((o) => (
                <button
                  key={o.label}
                  type="button"
                  role="radio"
                  aria-checked={o.on}
                  onClick={() => setTheft(o.set)}
                  className={`px-3 min-h-10 text-xs font-semibold tracking-wider uppercase transition-colors ${
                    o.on ? "bg-zinc-100 text-black" : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-6">
            <div
              aria-live="polite"
              className={`flex items-start gap-3 px-4 py-4 text-base sm:text-lg font-semibold transition-colors duration-500 ${
                theft ? "bg-red-700 text-white" : "bg-emerald-700 text-white"
              }`}
            >
              {theft ? <TriangleAlert className="w-6 h-6 shrink-0" aria-hidden="true" /> : <CircleCheck className="w-6 h-6 shrink-0" aria-hidden="true" />}
              <span>
                {theft ? t.theft.bannerTheft : t.theft.bannerOk}
                <span className="block mt-1 text-sm font-medium opacity-90">{theft ? t.theft.bannerTheftSub : t.theft.bannerOkSub}</span>
              </span>
            </div>

            {/* produced vs paid bars */}
            <div aria-hidden="true">
              <div className="flex items-end gap-2 h-28">
                {PRODUCED.map((p, i) => {
                  const paid = theft && i >= THEFT_FROM ? p * 0.78 : p * 0.95;
                  return (
                    <div key={i} className="relative flex-1 h-full flex items-end">
                      <div className="absolute bottom-0 inset-x-0 bg-zinc-700/60" style={{ height: `${p * 10}%` }} />
                      <div
                        className={`relative w-full transition-all duration-500 ${theft && i >= THEFT_FROM ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ height: `${paid * 10}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-5 text-xs text-zinc-300">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-zinc-600" /> {t.meter.produced}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500" /> {t.meter.sold}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 border-t border-[#222224] pt-4">{t.theft.demoNote}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
