"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, CircleCheck, CircleX, FileText, Fingerprint, LoaderCircle, Quote, ShieldCheck, Upload } from "lucide-react";
import { Container, ExternalA, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";
import { addressUrl, deployment, readDocuments, sha256Hex, shortHex, type ChainDocument } from "@/lib/chain";
import { MeterPanel } from "./MeterLive";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "done"; match: boolean; fileHash: string; chainHash: string }
  | { state: "failed" };

/** The three sample documents, with the onchain record once it loads. */
function useDocuments() {
  const [chain, setChain] = useState<ChainDocument[] | null>(null);
  useEffect(() => {
    readDocuments().then(setChain, () => setChain(null));
  }, []);
  return deployment.documents.map((d) => ({
    name: d.name,
    file: d.file,
    // The link and hash shown come from the blockchain when available.
    uri: chain?.find((c) => c.name === d.name)?.uri ?? d.uri,
    chain: chain?.find((c) => c.name === d.name),
  }));
}

function HashLine({ label, value, tone }: { label: string; value: string; tone?: "ok" | "bad" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold tracking-wider uppercase text-zinc-600">{label}</span>
      <code
        title={value}
        className={`font-mono text-xs break-all ${tone === "bad" ? "text-red-800" : "text-zinc-800"}`}
      >
        {value}
      </code>
    </div>
  );
}

function DocumentCard({ doc }: { doc: ReturnType<typeof useDocuments>[number] }) {
  const { t } = useLang();
  const [check, setCheck] = useState<Check>({ state: "idle" });

  async function verify() {
    setCheck({ state: "checking" });
    try {
      // Always compare with a fresh read of the blockchain, never a cached copy.
      const onchain = (await readDocuments()).find((c) => c.name === doc.name);
      if (!onchain) throw new Error("not on chain");
      const res = await fetch(onchain.uri, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fileHash = await sha256Hex(await res.arrayBuffer());
      const chainHash = onchain.sha256Hash.toLowerCase();
      setCheck({ state: "done", match: fileHash === chainHash, fileHash, chainHash });
    } catch {
      setCheck({ state: "failed" });
    }
  }

  return (
    <li className="bg-white border border-zinc-300 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <h4 className="font-semibold leading-snug">{t.trust.docTitles[doc.name]}</h4>
          <p className="text-sm text-zinc-700 mt-1">{t.trust.docAbout[doc.name]}</p>
          <p className="mt-2 inline-block border border-zinc-400 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest uppercase text-zinc-700">
            {t.trust.sample}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={verify}
          disabled={check.state === "checking"}
          aria-describedby={`doc-${doc.name}-result`}
          className="inline-flex items-center gap-2 bg-black text-white px-4 min-h-11 text-sm font-semibold tracking-wide uppercase hover:bg-zinc-800 disabled:opacity-60 transition-colors"
        >
          {check.state === "checking" ? (
            <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Fingerprint className="w-4 h-4" aria-hidden="true" />
          )}
          {check.state === "checking" ? t.trust.verifying : t.trust.verify}
        </button>
        <ExternalA
          href={doc.uri}
          className="inline-flex items-center gap-1 min-h-11 text-sm font-semibold underline underline-offset-4 decoration-zinc-400 hover:decoration-black"
        >
          {t.trust.open}
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </ExternalA>
      </div>

      <div id={`doc-${doc.name}-result`} aria-live="polite">
        {check.state === "done" && (
          <div className={`border-l-4 pl-3 py-1 space-y-2 ${check.match ? "border-emerald-600" : "border-red-600"}`}>
            <p className={`flex items-center gap-2 text-sm font-semibold ${check.match ? "text-emerald-900" : "text-red-900"}`}>
              {check.match ? <CircleCheck className="w-4 h-4" aria-hidden="true" /> : <CircleX className="w-4 h-4" aria-hidden="true" />}
              {check.match ? t.trust.match : t.trust.mismatch}
            </p>
            <HashLine label={t.trust.fileHash} value={check.fileHash} tone={check.match ? "ok" : "bad"} />
            <HashLine label={t.trust.chainHash} value={check.chainHash} />
          </div>
        )}
        {check.state === "failed" && (
          <p className="flex items-center gap-2 text-sm font-semibold text-red-900">
            <CircleX className="w-4 h-4" aria-hidden="true" />
            {t.trust.failed}
          </p>
        )}
        {check.state === "idle" && doc.chain && (
          <p className="text-xs text-zinc-600">
            {t.trust.chainHash}: <code className="font-mono">{shortHex(doc.chain.sha256Hash, 8)}</code>
          </p>
        )}
      </div>
    </li>
  );
}

/** Pick a PDF you already have and see if it matches one of the three. */
function OwnFileCheck() {
  const { t } = useLang();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const [hash, docs] = await Promise.all([file.arrayBuffer().then(sha256Hex), readDocuments()]);
      const hit = docs.find((d) => d.sha256Hash.toLowerCase() === hash);
      setMsg(hit ? { ok: true, text: t.trust.ownFileResult(t.trust.docTitles[hit.name] ?? hit.name) } : { ok: false, text: t.trust.ownFileNone });
    } catch {
      setMsg({ ok: false, text: t.trust.failed });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-dashed border-zinc-400 p-5">
      <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold underline underline-offset-4 decoration-zinc-400 hover:decoration-black min-h-11">
        {busy ? <LoaderCircle className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
        {t.trust.ownFile}
        <input type="file" accept="application/pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <p aria-live="polite" className={`text-sm font-semibold mt-2 ${msg ? (msg.ok ? "text-emerald-900" : "text-red-900") : ""}`}>
        {msg?.text}
      </p>
    </div>
  );
}

export default function Trust() {
  const { t } = useLang();
  const docs = useDocuments();
  const contracts = ["SolarShareToken", "MeterOracle", "RevenueDistributor", "ShareSale"] as const;

  return (
    <section id="trust" aria-labelledby="trust-title" className="py-20 lg:py-28">
      <Container>
        <SectionHead id="trust-title" index="03" label={t.trust.label} title={t.trust.title} intro={t.trust.intro} />

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-start">
          <MeterPanel />

          <div>
            <h3 className="eyebrow">{t.trust.docsTitle}</h3>
            <p className="mt-3 text-base text-zinc-700 leading-relaxed">{t.trust.docsIntro}</p>
            <ul className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {docs.map((d) => (
                <DocumentCard key={d.name} doc={d} />
              ))}
              <li className="xl:col-span-1">
                <OwnFileCheck />
              </li>
            </ul>
          </div>
        </div>

        {/* Quote + contracts */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-12">
          <figure className="relative pl-6 sm:pl-8 border-l border-zinc-300">
            <Quote className="w-10 h-10 text-zinc-400 rotate-180 mb-4" aria-hidden="true" />
            <blockquote className="text-[clamp(1.5rem,4vw,2.25rem)] font-medium tracking-tight leading-snug">
              {t.trust.quote}
            </blockquote>
            <figcaption className="mt-5 text-base text-zinc-700 leading-relaxed max-w-lg">{t.trust.quoteBody}</figcaption>
          </figure>

          <div>
            <h3 className="eyebrow flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              {t.trust.contractsTitle}
            </h3>
            <p className="mt-2 text-sm text-zinc-700">{t.trust.contractsNote}</p>
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-px bg-zinc-300 border border-zinc-300">
              {contracts.map((name) => {
                const address = deployment.contracts[name].address;
                return (
                  <li key={name} className="bg-paper">
                    <ExternalA
                      href={addressUrl(address)}
                      className="group flex flex-col gap-1 p-5 h-full hover:bg-white transition-colors"
                      label={`${t.trust.contracts[name]}: ${address} (Basescan)`}
                    >
                      <span className="text-sm font-semibold">{t.trust.contracts[name]}</span>
                      <span className="font-mono text-xs text-zinc-700">{shortHex(address, 6)}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-zinc-700 group-hover:text-black">
                        Basescan <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                    </ExternalA>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
