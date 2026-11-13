"use client";

import React from "react";
import { Globe } from "lucide-react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const options: { code: Language; label: string; name: string }[] = [
    { code: "en", label: "EN", name: "English" },
    { code: "zu", label: "ZU", name: "isiZulu" },
    { code: "st", label: "ST", name: "Sesotho" },
  ];

  return (
    <div
      role="group"
      aria-label="Language selector"
      className="inline-flex items-center p-1 rounded-xl bg-gray-100 border border-gray-200 text-xs shadow-2xs"
    >
      <Globe className="w-3.5 h-3.5 text-gray-500 mx-1.5 shrink-0" aria-hidden="true" />
      <div className="flex items-center gap-0.5">
        {options.map((opt) => {
          const isActive = language === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              aria-pressed={isActive}
              aria-label={`Switch to ${opt.name}`}
              className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                isActive
                  ? "bg-amber-500 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/60"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
