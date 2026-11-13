"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleCheck, CircleX, FileText, Fingerprint, LoaderCircle } from "lucide-react";
import { useChainData } from "@/components/chain/ChainData";
import MiniGridArt from "@/components/landing/MiniGridArt";
import { useDocuments } from "@/components/landing/Trust";
import Readings from "@/components/platform/Readings";
import { ExternalA, KV, Panel, primaryBtn, secondaryBtn } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { addressUrl, distributor, oracle, readEvents, txUrl, type EventLog } from "@/lib/chain";
import { verifyDocument, type DocCheck } from "@/lib/documents";
import { dateTime, fromUnix, int, kwh, rand, usdcToRand } from "@/lib/format";

type Income = EventLog<{ amount: bigint }>;

function DocRow({ doc }: { doc: ReturnType<typeof useDocuments>[number] }) {
  const { t } = useLang();
  const [check, setCheck] = useState<DocCheck>({ state: "idle" });
  return (
    <li className="py-4 border-t border-d-line first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <FileText className="w-5 h-5 mt-0.5 text-zinc-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-white">{t.trust.docTitles[doc.name]}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t.trust.docAbout[doc.name]} · {t.trust.sample}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={secondaryBtn}
            disabled={check.state === "checking"}
            aria-describedby={`pdoc-${doc.name}`}
            onClick={async () => {
              setCheck({ state: "checking" });
              setCheck(await verifyDocument(doc.name));
            }}
          >
            {check.state === "checking" ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Fingerprint className="w-4 h-4" aria-hidden="true" />}
            {check.state === "checking" ? t.trust.verifying : t.trust.verify}
          </button>
          <ExternalA href={doc.uri} className="inline-flex items-center gap-1 min-h-11 px-2 text-sm text-zinc-200 underline underline-offset-4 decoration-zinc-500">
            PDF <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </ExternalA>
        </div>
      </div>
      <div id={`pdoc-${doc.name}`} aria-live="polite" className="mt-2">
        {check.state === "done" && (
          <div className={`border-l-2 pl-3 text-xs space-y-1 ${check.match ? "border-emerald-500" : "border-red-500"}`}>
            <p className={`flex items-center gap-1.5 text-sm font-medium ${check.match ? "text-emerald-300" : "text-red-300"}`}>
              {check.match ? <CircleCheck className="w-4 h-4" aria-hidden="true" /> : <CircleX className="w-4 h-4" aria-hidden="true" />}
              {check.match ? t.trust.match : t.trust.mismatch}
            </p>
            <p className="text-zinc-400 break-all">
              {t.trust.fileHash}: <code className="font-mono text-zinc-200">{check.fileHash}</code>
            </p>
            <p className="text-zinc-400 break-all">
              {t.trust.chainHash}: <code className="font-mono text-zinc-200">{check.chainHash}</code>
            </p>
          </div>
        )}
        {check.state === "failed" && <p className="text-sm text-red-300">{t.trust.failed}</p>}
      </div>
    </li>
  );
}

export default function GridPage() {
  const { t, lang } = useLang();
  const { stats, meter } = useChainData();
  const docs = useDocuments();
  const [income, setIncome] = useState<Income | null | undefined>(undefined);
  const s = stats.data;
  const m = meter.data;
  const loc = lang === "zu" ? "zu-ZA" : "en-ZA";

  useEffect(() => {
    readEvents<{ amount: bigint }>(distributor, "IncomeDeposited", { limit: 1 }).then(
      (l) => setIncome(l[0] ?? null),
      () => setIncome(null),
    );
  }, [s?.totalDeposited]);

  const tiles = [
    { k: t.app.grid.sharesSold, v: s ? `${int(s.sharesSold)} / ${int(s.maxShares)}` : "…" },
    { k: t.app.grid.price, v: s ? rand(usdcToRand(s.pricePerShareUsdc), 2) : "…" },
    { k: t.app.grid.energy, v: m ? kwh(m.totalProducedWh) : "…" },
    {
      k: t.app.grid.lastIncome,
      v: income === undefined ? "…" : income ? rand(usdcToRand(income.args.amount), 2) : t.app.grid.none,
      link: income ? txUrl(income.txHash) : undefined,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.app.grid.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">{t.app.grid.subtitle}</p>
        </div>
        <Link href="/solar/join" className={primaryBtn}>
          {t.app.grid.invest}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        <figure className="bg-d-panel border border-d-line rounded-lg overflow-hidden">
          <div className="aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center p-6">
            <MiniGridArt dark label={t.asset.illustrationNote} className="w-full h-auto max-h-full" />
          </div>
          <figcaption className="px-4 py-3 border-t border-d-line text-xs text-zinc-400">{t.asset.illustrationNote}</figcaption>
        </figure>

        <Panel title={t.app.grid.facts} id="facts">
          <dl>
            <KV k={t.app.grid.location} v={t.app.grid.locationValue} />
            <KV k={t.app.grid.size} v={t.app.grid.sizeValue} />
            <KV k={t.app.grid.customers} v={t.app.grid.customersValue} />
            <KV k={t.app.grid.cost} v="R350,000" />
            <KV k={t.app.grid.owner} v={<span className="whitespace-normal">{t.asset.owner}</span>} />
          </dl>
          <p className="mt-3 text-xs text-zinc-400 leading-relaxed">{t.asset.ownerNote}</p>
        </Panel>
      </div>

      <section aria-labelledby="key-numbers">
        <h2 id="key-numbers" className="sr-only">
          {t.app.grid.keyNumbers}
        </h2>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tiles.map((x) => (
            <li key={x.k} className="bg-d-panel border border-d-line rounded-lg p-4">
              <p className="text-xs text-zinc-400">{x.k}</p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold tabular-nums">
                {x.link ? (
                  <ExternalA href={x.link} className="underline underline-offset-4 decoration-zinc-600 hover:decoration-white">
                    {x.v}
                  </ExternalA>
                ) : (
                  x.v
                )}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel
          title={t.app.grid.readings}
          id="readings"
          action={
            <ExternalA href={addressUrl(oracle.address)} className="text-xs text-zinc-300 hover:text-white inline-flex items-center gap-1">
              Basescan <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </ExternalA>
          }
        >
          <Readings />
          {m && m.lastTimestamp > 0n && (
            <p className="mt-3 text-xs text-zinc-400">
              {t.meter.lastReading}: {dateTime(fromUnix(m.lastTimestamp), loc)}
            </p>
          )}
        </Panel>

        <Panel title={t.app.grid.documents} id="documents">
          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">{t.trust.docsIntro}</p>
          <ul>
            {docs.map((d) => (
              <DocRow key={d.name} doc={d} />
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title={t.app.grid.risks} id="risks">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {t.risks.items.map((r) => (
            <li key={r.title}>
              <h3 className="text-sm font-medium text-white">{r.title}</h3>
              <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{r.body}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
