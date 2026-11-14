"use client";

// The theft banner (#24): full width, on every platform page.
// Two sources, kept apart on purpose:
// - the SIGNED status on the blockchain (polled every 3 s) decides green/red
//   and whether payouts are paused;
// - the meter's LIVE preview (every 2 s, unsigned) gives an amber early
//   warning the moment the dials change, while the signed proof catches up.
import { LoaderCircle, Radar } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import { useLiveFeed, type LiveSample } from "@/components/chain/LiveFeed";
import { useBannerText } from "@/components/landing/MeterLive";
import { STATUS_STYLE } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { MeterStatus } from "@/lib/chain";
import { rand, usdcToRand } from "@/lib/format";

/** Seconds until the meter's next signed reading, from the latest live sample. */
export function secondsToNextReading(sample: LiveSample | null, seenAt: number | null, now = Date.now()): string {
  if (!sample || seenAt === null) return "30";
  return String(Math.max(1, Math.round(sample.nextReadingS - (now - seenAt) / 1000) + 5)); // +5 s: relayer and block
}

export default function LiveBanner({ big = false }: { big?: boolean }) {
  const { t } = useLang();
  const { meter, stats } = useChainData();
  const { sample, fresh, seenAt } = useLiveFeed();
  const m = meter.data;
  const text = useBannerText(m);
  const held = stats.data ? stats.data.totalDeposited - stats.data.totalClaimed : undefined;

  if (!m) {
    return (
      <div role="status" className={`flex items-center gap-3 bg-zinc-800 text-zinc-200 px-4 ${big ? "py-8 text-2xl" : "py-3 text-sm"}`}>
        {meter.error ? t.meter.error : <><LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> {t.meter.checking}</>}
      </div>
    );
  }

  const chainAlarm = m.status === MeterStatus.THEFT || m.status === MeterStatus.TAMPER;
  const liveAlarm = fresh && !!sample && (sample.theft || sample.tamper);
  const next = secondsToNextReading(sample, seenAt);
  const pad = big ? "px-6 sm:px-10 py-8 sm:py-12" : "px-4 sm:px-6 py-3";
  const textCls = `flex items-start gap-3 font-semibold ${big ? "text-[clamp(1.6rem,4.5vw,3.5rem)] leading-tight gap-5" : "text-sm sm:text-base"}`;
  const subCls = `font-medium opacity-90 ${big ? "text-[0.45em] mt-3 leading-snug" : "text-xs sm:text-sm mt-0.5"}`;
  const iconCls = `${big ? "w-[1em] h-[1em] mt-1" : "w-5 h-5 mt-0.5"} shrink-0`;

  // Early warning: the meter sees theft, the signed reading hasn't landed yet.
  if (m.status === MeterStatus.OK && liveAlarm && sample) {
    return (
      <div role="alert" aria-live="assertive" className={`bg-amber-400 text-black transition-colors duration-300 ${pad}`}>
        <div className={textCls}>
          <Radar className={`${iconCls} animate-pulse`} aria-hidden="true" />
          <div>
            <p>{sample.tamper ? t.app.live.preTamper : t.app.live.preTheft(`${sample.gapPct}%`)}</p>
            <p className={subCls}>{t.app.live.preSub(next)}</p>
          </div>
        </div>
      </div>
    );
  }

  const s = STATUS_STYLE[m.status as MeterStatus];
  const Icon = s.icon;
  const recovering = chainAlarm && fresh && sample && !sample.theft && !sample.tamper;
  const liveWhileOffline = m.status === MeterStatus.OFFLINE && fresh;
  return (
    <div
      role={chainAlarm ? "alert" : "status"}
      aria-live={chainAlarm ? "assertive" : "polite"}
      className={`${s.banner} transition-colors duration-500 ${pad}`}
    >
      <div className={textCls}>
        <Icon className={iconCls} aria-hidden="true" />
        <div>
          <p>{text}</p>
          {recovering && <p className={subCls}>{t.app.live.recovering(next)}</p>}
          {liveWhileOffline && <p className={subCls}>{t.app.live.liveOnly}</p>}
          {!recovering && !liveWhileOffline && held !== undefined && held > 0n && (
            <p className={subCls}>{t.app.held(rand(usdcToRand(held), 2))}</p>
          )}
        </div>
      </div>
    </div>
  );
}
