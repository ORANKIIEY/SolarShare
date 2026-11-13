"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en, { type Dict } from "./en";
import zu from "./zu";

export const LANGS = { en, zu } as const;
export type Lang = keyof typeof LANGS;
const STORAGE_KEY = "solarshare.lang";

interface LangCtx {
  lang: Lang;
  t: Dict;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always render English first so the server HTML and the first browser
  // render match, then switch to the saved choice.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "zu" || saved === "en") setLangState(saved);
    } catch {
      /* storage blocked: stay on English */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  return <Ctx.Provider value={{ lang, t: LANGS[lang], setLang }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLang must be used inside <LanguageProvider>");
  return v;
}

/** Two-button switch: English / isiZulu. */
export function LanguageToggle({ dark = false, className = "" }: { dark?: boolean; className?: string }) {
  const { lang, setLang, t } = useLang();
  const base = dark ? "border-zinc-700" : "border-zinc-300";
  return (
    <div role="group" aria-label={t.nav.language} className={`inline-flex border ${base} ${className}`}>
      {(Object.keys(LANGS) as Lang[]).map((l) => {
        const on = l === lang;
        const cls = on
          ? dark
            ? "bg-white text-black"
            : "bg-black text-white"
          : dark
            ? "text-zinc-300 hover:text-white"
            : "text-zinc-700 hover:text-black";
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={on}
            onClick={() => setLang(l)}
            className={`px-3 py-2 min-h-11 text-xs font-semibold tracking-widest uppercase transition-colors ${cls}`}
          >
            {LANGS[l].langName}
          </button>
        );
      })}
    </div>
  );
}
