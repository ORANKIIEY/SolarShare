"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { useChainData, useNow } from "@/components/chain/ChainData";
import LiveBanner from "@/components/platform/LiveBanner";
import Readings from "@/components/platform/Readings";
import { secondaryBtn } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { kw, kwh, pct, since } from "@/lib/format";

export default function LivePage() {
  const { t } = useLang();
  const { meter } = useChainData();
  const m = meter.data;
  const now = useNow(1_000);
  const box = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const on = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);

  const toggle = () => {
    const p = document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen();
    p?.catch(() => undefined);
  };
  const checked = meter.updatedAt ? since(new Date(meter.updatedAt), now) : undefined;

  const stats = [
    { k: t.meter.powerNow, v: m ? kw(m.lastPowerW) : "…" },
    { k: t.meter.lastGap, v: m ? pct(m.lastGapBps) : "…" },
    { k: t.meter.produced, v: m ? kwh(m.totalProducedWh) : "…" },
    { k: t.meter.sold, v: m ? kwh(m.totalSoldWh) : "…" },
  ];

  return (
    <div ref={box} className="platform min-h-full p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.app.live.title}</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{t.app.live.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-zinc-400 tabular-nums" aria-live="off">
            {checked ? t.app.live.checked(`${checked.value} ${t.meter.ago[checked.unit]}`) : ""}
          </p>
          <button type="button" onClick={toggle} className={secondaryBtn}>
            {full ? <Minimize className="w-4 h-4" aria-hidden="true" /> : <Maximize className="w-4 h-4" aria-hidden="true" />}
            {full ? t.app.live.exitFullscreen : t.app.live.fullscreen}
          </button>
        </div>
      </header>

      <div className="rounded-lg overflow-hidden">
        <LiveBanner big />
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((x) => (
          <div key={x.k} className="bg-d-panel border border-d-line rounded-lg p-4 sm:p-6">
            <dt className="text-xs sm:text-sm text-zinc-400">{x.k}</dt>
            <dd className="mt-2 text-2xl sm:text-4xl font-semibold tabular-nums">{x.v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="feed" className="bg-d-panel border border-d-line rounded-lg p-4 sm:p-6">
        <h2 id="feed" className="text-sm font-medium text-white mb-4">
          {t.app.live.feed}
        </h2>
        <Readings big />
      </section>
    </div>
  );
}
