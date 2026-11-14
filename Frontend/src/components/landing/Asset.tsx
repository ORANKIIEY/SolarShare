"use client";

import { BatteryCharging, Coins, Gauge, House, PieChart, Sun, Zap } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import { Container, Corners, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { int, rand, usdcToNumber, usdcToRand } from "@/lib/format";
import MiniGridArt from "./MiniGridArt";

export default function Asset() {
  const { t } = useLang();
  const { stats } = useChainData();
  const s = stats.data;
  const sold = s ? Number(s.sharesSold) : undefined;
  const max = s ? Number(s.maxShares) : 3500;
  const share = sold !== undefined ? Math.min(100, (sold / max) * 100) : 0;

  const rows = [
    { icon: Sun, value: "10 kWp", label: t.asset.stats.solar },
    { icon: BatteryCharging, value: "20 kWh", label: t.asset.stats.battery },
    { icon: Coins, value: "R350,000", label: t.asset.stats.cost },
    { icon: PieChart, value: int(max), label: t.asset.stats.shares },
    { icon: House, value: t.asset.customersValue, label: t.asset.stats.customers },
    { icon: Zap, value: "1,400 kWh", label: t.asset.stats.energy },
  ];

  return (
    <section id="asset" aria-labelledby="asset-title" className="relative overflow-hidden bg-paper-2 py-20 lg:py-28 border-t border-zinc-300/60">
      <div aria-hidden="true" className="absolute right-0 bottom-0 w-[520px] h-[520px] border border-zinc-200 rounded-full translate-x-1/3 translate-y-1/3" />
      <div aria-hidden="true" className="absolute right-0 bottom-0 w-[640px] h-[640px] border border-zinc-200 rounded-full translate-x-1/3 translate-y-1/3" />

      <Container className="relative">
        <SectionHead id="asset-title" index="01" label={t.asset.label} title={t.asset.title} intro={t.asset.intro} />
        <p className="mt-4 inline-block border border-zinc-400 px-2 py-1 text-xs font-semibold tracking-widest uppercase text-zinc-700">
          {t.asset.placeholder}
        </p>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1.3fr_2.2fr_1.5fr] gap-12 lg:gap-14">
          {/* In numbers */}
          <div>
            <h3 className="eyebrow mb-8">{t.asset.numbersTitle}</h3>
            <dl className="flex flex-col gap-5">
              {rows.map(({ icon: Icon, value, label }) => (
                <div key={label} className="grid grid-cols-[20px_7.5rem_1fr] items-center gap-4">
                  <Icon className="w-5 h-5 text-zinc-800 order-1" aria-hidden="true" />
                  <dt className="order-3 text-xs font-semibold tracking-widest uppercase text-zinc-600 leading-snug">{label}</dt>
                  <dd className="order-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Picture */}
          <figure className="relative bg-ink text-white overflow-hidden">
            <div className="aspect-[4/3] flex items-center justify-center p-6 sm:p-10">
              <MiniGridArt dark label={t.asset.illustrationNote} className="w-full h-auto" />
            </div>
            <figcaption className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-wrap items-end justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent">
              <span>
                <span className="block text-lg font-semibold uppercase tracking-tight leading-none">Soweto Block A</span>
                <span className="block mt-1 text-[11px] tracking-widest uppercase text-zinc-300">{t.asset.placeholder}</span>
              </span>
              <span className="text-[11px] font-medium text-zinc-300">{t.asset.illustrationNote}</span>
            </figcaption>
          </figure>

          {/* Owner and live share count */}
          <div className="flex flex-col gap-10 lg:pl-8 lg:border-l border-zinc-300">
            <div className="relative p-5">
              <Corners />
              <h3 className="eyebrow text-zinc-600">{t.asset.ownerLabel}</h3>
              <p className="mt-3 text-lg font-semibold leading-snug">{t.asset.owner}</p>
              <p className="mt-3 text-sm text-zinc-700 leading-relaxed">{t.asset.ownerNote}</p>
            </div>

            <div>
              <h3 className="eyebrow text-zinc-600 flex items-center gap-2">
                <Gauge className="w-4 h-4" aria-hidden="true" />
                {t.asset.stats.sold}
              </h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums" aria-live="polite">
                {sold !== undefined ? int(sold) : "…"}
                <span className="text-lg text-zinc-600 font-medium"> / {int(max)}</span>
              </p>
              <div
                className="mt-3 h-2 bg-zinc-200"
                role="progressbar"
                aria-label={sold !== undefined ? t.asset.soldOf(int(sold), int(max)) : t.asset.stats.sold}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={sold ?? 0}
              >
                <div className="h-full bg-black" style={{ width: `${Math.max(share, sold ? 1 : 0)}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-600">{stats.error && !s ? "—" : t.asset.readLive}</p>
            </div>

            <div>
              <h3 className="eyebrow text-zinc-600">{t.asset.price}</h3>
              <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums">
                {rand(usdcToRand(s?.pricePerShareUsdc ?? 5_000_000n), 2)}
              </p>
              <p className="mt-2 text-xs text-zinc-600">
                {t.asset.priceNote(usdcToNumber(s?.pricePerShareUsdc ?? 5_000_000n).toFixed(2))}
              </p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
