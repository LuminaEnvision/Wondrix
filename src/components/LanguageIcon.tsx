"use client";

import { saveLanguage, useLang, useT } from "@/lib/use-client-state";

/** Compact EN/AR toggle for kids and parents (header). */
export function LanguageIcon() {
  const lang = useLang();
  const tr = useT();
  const next = lang === "ar" ? "en" : "ar";
  return (
    <button
      type="button"
      onClick={() => saveLanguage(next)}
      className="wx-tap inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] px-2 text-xs font-bold text-[var(--world-ink)] shadow-[var(--shadow-card)]"
      aria-label={tr("lang.toggle", { lang: next === "ar" ? "العربية" : "English" })}
      title={tr("lang.label")}
    >
      <span lang={lang}>{lang === "ar" ? "ع" : "EN"}</span>
    </button>
  );
}
