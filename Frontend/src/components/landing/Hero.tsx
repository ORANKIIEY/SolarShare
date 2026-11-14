"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import { Container, Corners } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { rand, usdcToRand } from "@/lib/format";
import MiniGridArt from "./MiniGridArt";
import { MeterChip } from "./MeterLive";

const DEFAULT_PRICE_USDC = 5_000_000n; // deployed price, shown until the live read arrives

export default function Hero() {
  const { t } = useLang();
  const { stats } = useChainData();
  const price = rand(usdcToRand(stats.data?.pricePerShareUsdc ?? DEFAULT_PRICE_USDC), 2);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden pt-36 lg:pt-44 pb-16 lg:pb-24">
      {/* thin guide lines */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute left-[8%] top-0 w-px h-full bg-zinc-400 hidden lg:block" />
        <div className="absolute right-[28%] top-0 w-px h-full bg-zinc-400 hidden lg:block" />
        <div className="absolute top-[34%] left-0 w-full h-px bg-zinc-400 hidden lg:block" />
      </div>

      <Container className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Text */}
        <div className="lg:col-span-7 xl:col-span-5 flex flex-col min-w-0">
          <p className="eyebrow text-zinc-600 mb-6 flex flex-wrap items-center gap-2">
            {t.hero.kicker.map((k, i) => (
              <span key={k} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="w-1 h-1 bg-zinc-500 rounded-full" />}
                {k}
              </span>
            ))}
          </p>
          <h1
            id="hero-title"
            // Sized so the longest word ("NEIGHBOURHOOD'S", about 9.6em wide) always fits its column.
            className="text-[clamp(1.85rem,8.4vw,5rem)] lg:text-[clamp(2.25rem,4.6vw,3.9rem)] xl:text-[clamp(2.5rem,3.6vw,3.5rem)] font-semibold uppercase tracking-tight leading-[0.92] text-balance"
          >
            {t.hero.title}{" "}
            <span className="block mt-3 text-zinc-500">{t.hero.titleStrong}</span>
          </h1>
          <p className="mt-8 text-base sm:text-lg text-zinc-700 max-w-xl leading-relaxed font-medium">{t.hero.lead}</p>

          <p className="mt-6 inline-flex self-start items-center gap-3 border-y border-black py-2 text-sm font-semibold tracking-wide uppercase">
            <span aria-hidden="true" className="w-1.5 h-1.5 bg-black" />
            {t.hero.priceFrom(price)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/solar/join"
              className="bg-black text-white px-8 min-h-12 inline-flex items-center gap-3 text-sm font-semibold tracking-wide uppercase hover:bg-zinc-800 transition-colors"
            >
              {t.hero.invest}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <a href="#asset" className="group min-h-12 inline-flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              {t.hero.see}
              <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* Graphic */}
        <div className="lg:col-span-5 xl:col-span-4 relative h-[300px] sm:h-[440px] lg:h-[520px] flex items-center justify-center">
          <div aria-hidden="true" className="absolute inset-0 m-auto w-[270px] h-[270px] sm:w-[400px] sm:h-[400px] rounded-full border border-zinc-300 breathe" />
          <div aria-hidden="true" className="absolute inset-0 m-auto w-[300px] h-[300px] sm:w-[450px] sm:h-[450px] rounded-full border border-dashed border-zinc-300 breathe breathe-2" />
          <div aria-hidden="true" className="absolute inset-0 m-auto w-[230px] h-[230px] sm:w-[350px] sm:h-[350px] rounded-full bg-gradient-to-tr from-zinc-300 via-zinc-100 to-zinc-300 breathe breathe-3" />

          {/* rotating badge */}
          <div aria-hidden="true" className="absolute top-[4%] right-[2%] sm:right-[6%] w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black text-white flex items-center justify-center rotate-12 z-20">
            <div className="absolute inset-2 border border-white/20 rounded-full" />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full spin-slow">
              <path id="badge-curve" fill="none" d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
              <text className="fill-white" style={{ fontSize: 7.4, letterSpacing: "0.12em", fontWeight: 600 }}>
                <textPath href="#badge-curve">SOLARSHARE • OWNED BY NEIGHBOURS •</textPath>
              </text>
            </svg>
            <span className="text-lg font-semibold">☀</span>
          </div>

          <div aria-hidden="true" className="absolute top-6 left-0 flex gap-2">
            <span className="w-1.5 h-1.5 bg-black" />
            <span className="w-1.5 h-1.5 bg-black" />
            <span className="w-1.5 h-1.5 border border-black" />
          </div>
          <div aria-hidden="true" className="absolute bottom-[14%] left-0 hidden sm:flex flex-col gap-1">
            <div className="ticks w-24 h-6 opacity-70" />
            <span className="text-[9px] font-mono tracking-widest text-zinc-600">10 kWp · 20 kWh</span>
          </div>

          <figure className="relative z-10 w-[88%] max-w-[420px]">
            <MiniGridArt label={t.asset.illustrationNote} className="w-full h-auto drop-shadow-sm" />
            <figcaption className="mt-1 text-center text-[11px] font-medium tracking-wide text-zinc-600">
              {t.asset.illustrationNote}
            </figcaption>
          </figure>
        </div>

        {/* Side box: live meter + promise */}
        <div className="lg:col-span-12 xl:col-span-3">
          <div className="relative max-w-md xl:ml-auto p-5">
            <Corners />
            <MeterChip />
            <h2 className="mt-6 text-sm font-semibold tracking-widest uppercase">{t.hero.sideTitle}</h2>
            <p className="mt-3 text-base text-zinc-700 leading-relaxed font-medium">{t.hero.sideBody}</p>
            <p className="mt-5 text-xs font-semibold tracking-widest uppercase text-zinc-600">{t.testnetShort}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
