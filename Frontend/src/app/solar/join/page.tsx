"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui";
import { Logo } from "@/components/landing/Nav";
import { useLang } from "@/i18n/LanguageProvider";

// Placeholder until the sign-up and buy flow (#21) lands here.
export default function JoinPage() {
  const { t } = useLang();
  return (
    <main className="min-h-screen flex items-center py-20">
      <Container className="max-w-2xl">
        <Logo />
        <h1 className="mt-10 text-[clamp(1.75rem,6vw,3rem)] font-semibold uppercase tracking-tight leading-[0.95]">
          {t.comingSoon.title}
        </h1>
        <p className="mt-6 text-lg text-zinc-700">{t.comingSoon.body}</p>
        <p className="mt-4 text-sm font-semibold tracking-widest uppercase text-zinc-600">{t.testnetShort}</p>
        <Link href="/" className="mt-10 inline-flex items-center gap-2 border border-black px-5 min-h-11 text-sm font-semibold uppercase tracking-wide hover:bg-black hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {t.comingSoon.back}
        </Link>
      </Container>
    </main>
  );
}
