"use client";

import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { Container, ExternalA } from "@/components/ui";
import { LanguageToggle, useLang } from "@/i18n/LanguageProvider";
import { MONEY_MODEL_URL, REPO_URL, addressUrl, deployment, shortHex } from "@/lib/chain";
import { Logo } from "./Nav";

function Wordmark() {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <p
      ref={ref}
      className="wordmark text-[17.5vw] xl:text-[15.5rem] font-semibold tracking-[-0.06em] leading-[0.8] text-center whitespace-nowrap text-[#f5f4e8] select-none"
    >
      <span className="sr-only">SolarShare</span>
      {"SolarShare".split("").map((c, i) => (
        <span key={i} aria-hidden="true" className="letter" style={{ "--i": i } as React.CSSProperties}>
          {c}
        </span>
      ))}
    </p>
  );
}

export default function Footer() {
  const { t, lang } = useLang();
  const names = ["SolarShareToken", "MeterOracle", "RevenueDistributor", "ShareSale"] as const;

  return (
    <footer className="relative bg-black text-white mt-0">
      {/* soft wave edge */}
      <svg aria-hidden="true" viewBox="0 0 1200 60" preserveAspectRatio="none" className="block w-full h-8 sm:h-12 bg-black">
        <path d="M0,0 H1200 V18 C1000,58 820,6 600,30 C380,54 200,10 0,34 Z" className="fill-paper-2" />
      </svg>

      <Container className="pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Logo dark />
            <p className="text-sm text-zinc-300 max-w-xs leading-relaxed">{t.footer.tagline}</p>
          </div>

          <div>
            <h2 className="eyebrow text-zinc-400 mb-4">{t.footer.language}</h2>
            <LanguageToggle dark />
            {lang === "zu" && t.footer.draft && <p className="mt-3 text-xs text-zinc-400 max-w-xs">{t.footer.draft}</p>}
          </div>

          <div>
            <h2 className="eyebrow text-zinc-400 mb-4">{t.footer.links}</h2>
            <ul className="space-y-1 text-sm">
              <li>
                <ExternalA href={REPO_URL} className="inline-flex items-center gap-1 min-h-11 text-zinc-200 hover:text-white underline-offset-4 hover:underline">
                  {t.footer.code} <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </ExternalA>
              </li>
              <li>
                <ExternalA href={MONEY_MODEL_URL} className="inline-flex items-center gap-1 min-h-11 text-zinc-200 hover:text-white underline-offset-4 hover:underline">
                  {t.footer.moneyModel} <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </ExternalA>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-zinc-400 mb-4">{t.footer.contracts}</h2>
            <ul className="space-y-1 text-sm">
              {names.map((n) => (
                <li key={n}>
                  <ExternalA
                    href={addressUrl(deployment.contracts[n].address)}
                    className="inline-flex flex-wrap items-center gap-x-2 min-h-11 text-zinc-200 hover:text-white underline-offset-4 hover:underline"
                  >
                    {t.trust.contracts[n]}
                    <span className="font-mono text-xs text-zinc-400">{shortHex(deployment.contracts[n].address)}</span>
                  </ExternalA>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-12 border border-zinc-800 px-4 py-3 text-sm text-zinc-300">{t.footer.testnet}</p>
      </Container>

      <div className="overflow-hidden pt-6 pb-4">
        <Wordmark />
      </div>

      <Container className="pb-8 flex flex-col sm:flex-row justify-between gap-2 text-xs text-zinc-400">
        <p>{t.footer.made}</p>
        <p>Base Sepolia · chain {deployment.chainId}</p>
      </Container>
    </footer>
  );
}
