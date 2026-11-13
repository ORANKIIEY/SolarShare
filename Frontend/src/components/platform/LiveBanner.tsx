"use client";

// The theft banner (#24): full width, on every platform page, polled every
// 3 seconds. Red within seconds of the meter's signed THEFT reading landing.
import { LoaderCircle } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import { useBannerText } from "@/components/landing/MeterLive";
import { STATUS_STYLE } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { MeterStatus } from "@/lib/chain";
import { rand, usdcToRand } from "@/lib/format";

export default function LiveBanner({ big = false }: { big?: boolean }) {
  const { t } = useLang();
  const { meter, stats } = useChainData();
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

  const s = STATUS_STYLE[m.status as MeterStatus];
  const Icon = s.icon;
  const alarm = m.status === MeterStatus.THEFT || m.status === MeterStatus.TAMPER;
  return (
    <div
      role={alarm ? "alert" : "status"}
      aria-live={alarm ? "assertive" : "polite"}
      className={`${s.banner} transition-colors duration-500 ${big ? "px-6 sm:px-10 py-8 sm:py-12" : "px-4 sm:px-6 py-3"}`}
    >
      <div className={`flex items-start gap-3 font-semibold ${big ? "text-[clamp(1.6rem,4.5vw,3.5rem)] leading-tight gap-5" : "text-sm sm:text-base"}`}>
        <Icon className={`${big ? "w-[1em] h-[1em] mt-1" : "w-5 h-5 mt-0.5"} shrink-0`} aria-hidden="true" />
        <div>
          <p>{text}</p>
          {held !== undefined && held > 0n && (
            <p className={`font-medium opacity-90 ${big ? "text-[0.45em] mt-3" : "text-xs sm:text-sm mt-0.5"}`}>
              {t.app.held(rand(usdcToRand(held), 2))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
