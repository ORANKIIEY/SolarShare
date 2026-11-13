"use client";

import { useLang } from "@/i18n/LanguageProvider";

export default function SkipLink() {
  const { t } = useLang();
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-black focus:text-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold"
    >
      {t.skip}
    </a>
  );
}
