"use client";

// The plain-words sections: risks, who it's for, partners, questions.
import { ChevronDown, Store, Users, UserRound, Wrench } from "lucide-react";
import { Container, Corners, SectionHead } from "@/components/ui";
import { useLang } from "@/i18n/LanguageProvider";

export function Risks() {
  const { t } = useLang();
  return (
    <section id="risks" aria-labelledby="risks-title" className="py-20 lg:py-28">
      <Container className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
        <SectionHead id="risks-title" index="06" label={t.risks.label} title={t.risks.title} />
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
          {t.risks.items.map((r, i) => (
            <li key={r.title} className="flex gap-5 border-t border-zinc-300 py-6">
              <span className="text-xs font-mono text-zinc-600 pt-1" aria-hidden="true">
                0{i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold tracking-widest uppercase">{r.title}</h3>
                <p className="mt-2 text-base text-zinc-700 leading-relaxed">{r.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

const WHO_ICONS = [UserRound, Store, Users, Wrench];

export function Who() {
  const { t } = useLang();
  return (
    <section id="who" aria-labelledby="who-title" className="bg-paper-2 border-y border-zinc-300/60 py-20 lg:py-28">
      <Container>
        <SectionHead id="who-title" index="07" label={t.who.label} title={t.who.title} />
        <ul className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {t.who.items.map((w, i) => {
            const Icon = WHO_ICONS[i];
            return (
              <li key={w.title} className="group relative bg-ink text-white p-6 min-h-56 flex flex-col justify-between overflow-hidden">
                <div aria-hidden="true" className="absolute -right-10 -top-10 w-40 h-40 rounded-full border border-zinc-800" />
                <div aria-hidden="true" className="absolute -right-4 -top-4 w-28 h-28 rounded-full border border-zinc-800" />
                <Icon className="relative w-7 h-7 text-zinc-200" aria-hidden="true" />
                <div className="relative mt-10">
                  <h3 className="text-lg font-semibold uppercase tracking-tight leading-none">{w.title}</h3>
                  <p className="mt-3 text-sm text-zinc-300 leading-relaxed">{w.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

export function Partners() {
  const { t } = useLang();
  return (
    <section id="partners" aria-labelledby="partners-title" className="py-20 lg:py-28">
      <Container>
        <SectionHead id="partners-title" index="08" label={t.partners.label} title={t.partners.title} />
        <div className="mt-12 border-t border-black">
          <div className="hidden md:grid grid-cols-3 gap-6 py-3 eyebrow text-zinc-600 border-b border-zinc-300" aria-hidden="true">
            <span>{t.partners.colWhat}</span>
            <span>{t.partners.colWho}</span>
            <span>{t.partners.colToday}</span>
          </div>
          <dl>
            {t.partners.rows.map((r) => (
              <div key={r.what} className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-6 py-5 border-b border-zinc-300">
                <dt className="text-base font-semibold">{r.what}</dt>
                <dd className="text-base text-zinc-800">
                  <span className="md:hidden text-xs font-semibold tracking-wider uppercase text-zinc-600">{t.partners.colWho}: </span>
                  {r.who}
                </dd>
                <dd className="text-base text-zinc-800">
                  <span className="md:hidden text-xs font-semibold tracking-wider uppercase text-zinc-600">{t.partners.colToday}: </span>
                  {r.today}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}

export function Faq() {
  const { t } = useLang();
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-paper-2 border-t border-zinc-300/60 py-20 lg:py-28">
      <Container className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-12">
        <div className="relative self-start p-0">
          <SectionHead id="faq-title" index="09" label={t.faq.label} title={t.faq.title} />
        </div>
        <div className="relative">
          <Corners />
          {t.faq.items.map((f) => (
            <details key={f.q} className="group border-b border-zinc-300 first:border-t">
              <summary className="flex items-center justify-between gap-6 cursor-pointer list-none py-5 px-1 text-base sm:text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown className="w-5 h-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="pb-6 px-1 text-base text-zinc-700 leading-relaxed max-w-2xl">{f.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
