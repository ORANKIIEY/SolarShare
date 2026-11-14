"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { LanguageToggle, useLang } from "@/i18n/LanguageProvider";
import { Container } from "@/components/ui";

/** Our mark: a sun cut into slices, one slice per neighbour. */
export function LogoMark({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16 16 L16 1.5 A14.5 14.5 0 0 1 30.5 16 Z" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5">
        <line x1="16" y1="16" x2="16" y2="30.5" />
        <line x1="16" y1="16" x2="1.5" y2="16" />
      </g>
    </svg>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <span className={`flex items-center gap-3 ${dark ? "text-white" : "text-black"}`}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-[0.28em] uppercase">SolarShare</span>
    </span>
  );
}

export default function Nav() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "#asset", label: t.nav.asset },
    { href: "#how", label: t.nav.how },
    { href: "#trust", label: t.nav.trust },
    { href: "#risks", label: t.nav.risks },
    { href: "#faq", label: t.nav.faq },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <p className="bg-black text-white text-center text-[11px] sm:text-xs font-semibold tracking-widest uppercase py-1.5 px-4">
        {t.testnetShort}
      </p>
      <nav aria-label="Main" className="bg-paper/90 backdrop-blur-md border-b border-zinc-300/60">
        <Container className="h-16 lg:h-20 flex items-center justify-between gap-4">
          <Link href="/" aria-label="SolarShare home">
            <Logo />
          </Link>

          <ul className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-wide">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="text-zinc-700 hover:text-black transition-colors uppercase">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            <Link
              href="/solar/join"
              className="hidden sm:inline-flex items-center gap-2 border border-black px-5 min-h-11 text-sm font-semibold tracking-wide uppercase hover:bg-black hover:text-white transition-colors"
            >
              {t.nav.invest}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="lg:hidden inline-flex items-center justify-center w-11 h-11 border border-zinc-300"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t.nav.close : t.nav.menu}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </Container>

        {open && (
          <div id="mobile-menu" className="lg:hidden border-t border-zinc-300/60 bg-paper">
            <Container className="py-4 flex flex-col gap-1">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-base font-semibold uppercase tracking-wide border-b border-zinc-200"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <LanguageToggle />
                <Link
                  href="/solar/join"
                  className="inline-flex items-center gap-2 bg-black text-white px-5 min-h-11 text-sm font-semibold tracking-wide uppercase"
                >
                  {t.nav.invest}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </Container>
          </div>
        )}
      </nav>
    </header>
  );
}
