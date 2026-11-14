"use client";

import { ArrowUpRight, TriangleAlert } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import { ExternalA } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { txUrl } from "@/lib/chain";
import { dateTime, fromUnix, kw, pct } from "@/lib/format";

/** Latest signed meter readings with a Basescan link each (dark platform). */
export default function Readings({ big = false }: { big?: boolean }) {
  const { t, lang } = useLang();
  const { readings, meter } = useChainData();
  const loc = lang === "zu" ? "zu-ZA" : "en-ZA";
  const line = meter.data?.theftGapBps ?? 1500;

  if (!readings.data) return <p className="text-sm text-zinc-400">{readings.error ? t.trust.readingsError : t.trust.loadingReadings}</p>;
  if (readings.data.length === 0) return <p className="text-sm text-zinc-400">{t.trust.noReadings}</p>;

  return (
    <table className={`w-full tabular-nums whitespace-nowrap ${big ? "text-base sm:text-xl" : "text-[13px] sm:text-sm"}`}>
      <thead>
        <tr className="text-left text-xs text-zinc-400">
          <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colWhen}</th>
          <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colPower}</th>
          <th scope="col" className="whitespace-normal align-bottom font-medium pb-2">{t.trust.colUnpaid}</th>
          <th scope="col" className="whitespace-normal align-bottom font-medium pb-2 text-right">{t.trust.colProof}</th>
        </tr>
      </thead>
      <tbody>
        {readings.data.map((r) => {
          const theft = r.gapBps > line;
          const when = dateTime(fromUnix(r.timestamp), loc);
          return (
            <tr key={r.seq.toString()} className="border-t border-d-line">
              <td className={`pr-2 ${big ? "py-3" : "py-2"}`}>{when}</td>
              <td className="pr-2">{kw(r.powerW)}</td>
              <td className={`pr-2 ${theft ? "text-red-300 font-semibold" : "text-zinc-200"}`}>
                <span className="inline-flex items-center gap-1">
                  {theft && <TriangleAlert className="w-3.5 h-3.5" aria-hidden="true" />}
                  {pct(r.gapBps)}
                  {theft && <span className="sr-only"> ({t.meter.status[1]})</span>}
                </span>
              </td>
              <td className="text-right">
                <ExternalA
                  href={txUrl(r.txHash)}
                  label={`${t.trust.view}: ${when} (Basescan)`}
                  className="inline-flex items-center gap-0.5 font-medium text-zinc-100 underline underline-offset-4 decoration-zinc-500 hover:decoration-white"
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
  );
}
