"use client";

import { Banknote, Gauge, HandCoins, Smartphone } from "lucide-react";
import { Container, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";

const ICONS = [Smartphone, HandCoins, Gauge, Banknote];

export default function HowItWorks() {
  const { t } = useLang();
  return (
    <section id="how" aria-labelledby="how-title" className="bg-ink text-white py-20 lg:py-24 border-y border-zinc-800">
      <Container>
        <SectionHead dark id="how-title" index="02" label={t.how.label} title={t.how.title} />
        <ol className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-y md:divide-y-0 lg:divide-x divide-zinc-800">
          {t.how.steps.map((step, i) => {
            const Icon = ICONS[i];
            return (
              <li key={step.title} className="py-8 md:py-6 lg:py-0 md:pr-8 lg:px-8 lg:first:pl-0 flex items-start gap-5">
                <div aria-hidden="true" className="relative w-12 h-12 shrink-0 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-zinc-200" />
                </div>
                <div>
                  <p className="text-xs font-mono text-zinc-400 mb-1">0{i + 1}</p>
                  <h3 className="text-sm font-semibold tracking-widest uppercase mb-2">{step.title}</h3>
                  <p className="text-base text-zinc-300 font-medium leading-relaxed">{step.body}</p>
                  <p className="mt-3 inline-block border border-zinc-700 px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-zinc-300">
                    {step.note}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
