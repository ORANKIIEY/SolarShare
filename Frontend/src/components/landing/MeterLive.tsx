"use client";

import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useChainData, useNow } from "@/components/chain/ChainData";
import { STATUS_STYLE, ExternalA } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { MeterStatus, addressUrl, oracle, txUrl, type MeterState } from "@/lib/chain";
import { dateTime, fromUnix, kw, kwh, pct, since } from "@/lib/format";

/** The one-line banner text for the current meter status. */
export function useBannerText(m?: MeterState): string | undefined {
  const { t, lang } = useLang();
  if (!m) return undefined;
  const b = t.meter.banner;
  switch (m.status) {
    case MeterStatus.OK:
      return b[0](kw(m.lastPowerW));
    case MeterStatus.THEFT:
      return b[1](pct(m.lastGapBps));
    case MeterStatus.TAMPER:
      return b[2]();
    default:
      return b[3](m.lastTimestamp > 0n ? dateTime(fromUnix(m.lastTimestamp), lang === "zu" ? "zu-ZA" : "en-ZA") : t.meter.noReading);
  }
}

function Ago({ ts }: { ts: bigint }) {
  const { t } = useLang();
  const now = useNow();
  if (ts === 0n) return <>{t.meter.noReading}</>;
  const a = since(fromUnix(ts), now);
  return (
    <>
      {a.value} {t.meter.ago[a.unit]}
    </>
  );
}

/** Small live status chip for the hero. */
export function MeterChip() {
  const { t } = useLang();
  const { meter } = useChainData();
  const m = meter.data;
  const banner = useBannerText(m);

  if (!m) {
    return (
      <div role="status" className="inline-flex items-center gap-2 border border-zinc-300 bg-white/70 px-3 py-2 text-sm font-medium text-zinc-700">
        {meter.error ? (
          t.meter.error
        ) : (
          <>
            <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> {t.meter.checking}
          </>
        )}
      </div>
    );
  }
  const s = STATUS_STYLE[m.status as MeterStatus];
  const Icon = s.icon;
  return (
    <div role="status" aria-live="polite" className={`border px-3 py-2.5 text-sm font-medium ${s.pill}`}>
      <span className="flex items-start gap-2">
        <span className="relative mt-1.5 flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className={`absolute inline-flex h-full w-full rounded-full ${s.dot} ping-soft`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${s.dot}`} />
        </span>
        <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          <span className="eyebrow block mb-0.5 opacity-80">{t.meter.label}</span>
          {banner}
        </span>
      </span>
    </div>
  );
}

/** Key/value rows and the latest signed readings, for the proof section. */
export function MeterPanel() {
  const { t, lang } = useLang();
  const { meter, readings } = useChainData();
  const m = meter.data;
  const banner = useBannerText(m);
  const loc = lang === "zu" ? "zu-ZA" : "en-ZA";
  const s = m ? STATUS_STYLE[m.status as MeterStatus] : undefined;
  const Icon = s?.icon;

  return (
    <div className="relative bg-white border border-zinc-300">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-200">
        <h3 className="eyebrow text-black">{t.trust.meterTitle}</h3>
        <ExternalA
          href={addressUrl(oracle.address)}
          className="inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-zinc-700 hover:text-black underline-offset-4 hover:underline"
        >
          Basescan <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </ExternalA>
      </div>

      <div className="p-5 space-y-5">
        {/* Status banner */}
        <div role="status" aria-live="polite" className={`flex items-start gap-3 px-4 py-3 text-sm sm:text-base font-semibold ${s ? s.banner : "bg-zinc-200 text-zinc-800"}`}>
          {Icon ? <Icon className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" /> : <LoaderCircle className="w-5 h-5 animate-spin" aria-hidden="true" />}
          <span>{banner ?? (meter.error ? t.meter.error : t.meter.checking)}</span>
        </div>

        {/* Key / value rows, like an info panel */}
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            [t.meter.powerNow, m ? kw(m.lastPowerW) : "…"],
            [t.meter.lastGap, m ? pct(m.lastGapBps) : "…"],
            [t.meter.produced, m ? kwh(m.totalProducedWh) : "…"],
            [t.meter.sold, m ? kwh(m.totalSoldWh) : "…"],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col border-t border-zinc-200 pt-2">
              <dt className="text-zinc-600 text-xs">{k}</dt>
              <dd className="font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
          <div className="col-span-2 flex flex-col border-t border-zinc-200 pt-2">
            <dt className="text-zinc-600 text-xs">{t.meter.lastReading}</dt>
            <dd className="font-semibold">
              {m ? (
                <>
                  {m.lastTimestamp > 0n ? dateTime(fromUnix(m.lastTimestamp), loc) : t.meter.noReading}{" "}
                  <span className="text-zinc-600 font-medium">
                    (<Ago ts={m.lastTimestamp} />)
                  </span>
                </>
              ) : (
                "…"
              )}
            </dd>
          </div>
        </dl>
        {m?.status === MeterStatus.OFFLINE && <p className="text-xs text-zinc-600 leading-relaxed">{t.meter.offlineHint}</p>}

        {/* Readings */}
        <div>
          <h4 className="eyebrow text-zinc-700 mb-3">{t.trust.readingsTitle}</h4>
          {!readings.data ? (
            <p className="text-sm text-zinc-600">{readings.error ? t.trust.readingsError : t.trust.loadingReadings}</p>
          ) : readings.data.length === 0 ? (
            <p className="text-sm text-zinc-600">{t.trust.noReadings}</p>
          ) : (
            <table className="w-full text-[13px] sm:text-sm tabular-nums whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-zinc-600">
                  <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colWhen}</th>
                  <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colPower}</th>
                  <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colUnpaid}</th>
                  <th scope="col" className="whitespace-normal align-bottom font-medium pb-2 text-right">{t.trust.colProof}</th>
                </tr>
              </thead>
              <tbody>
                {readings.data.map((r) => {
                  const theft = m ? r.gapBps > m.theftGapBps : r.gapBps > 1500;
                  return (
                    <tr key={r.seq.toString()} className="border-t border-zinc-200">
                      <td className="py-2 pr-2">{dateTime(fromUnix(r.timestamp), loc)}</td>
                      <td className="py-2 pr-2">{kw(r.powerW)}</td>
                      <td className={`py-2 pr-2 ${theft ? "text-red-800 font-semibold" : ""}`}>
                        {pct(r.gapBps)}
                        {theft && <span className="sr-only"> ({t.meter.status[1]})</span>}
                        {theft && <span aria-hidden="true"> ▲</span>}
                      </td>
                      <td className="py-2 text-right">
                        <ExternalA
                          href={txUrl(r.txHash)}
                          className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-4 decoration-zinc-400 hover:decoration-black"
                          label={`${t.trust.view}: ${dateTime(fromUnix(r.timestamp), loc)}`}
                        >
                          {t.trust.view}
                          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </ExternalA>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
