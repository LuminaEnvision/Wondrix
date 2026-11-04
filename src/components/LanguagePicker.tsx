"use client";

import { LANGUAGES } from "@/lib/i18n";
import { saveLanguage, useLang, useT } from "@/lib/use-client-state";

/** English / العربية switch. Saves at once (no form Save needed). */
export function LanguagePicker() {
  const lang = useLang();
  const tr = useT();
  return (
    <div className="space-y-1">
      <p className="text-sm font-bold text-ink-soft" id="lang-label">
        {tr("lang.label")}
      </p>
      <div className="flex gap-2" role="radiogroup" aria-labelledby="lang-label">
        {LANGUAGES.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={lang === l.id}
            lang={l.id}
            onClick={() => saveLanguage(l.id)}
            className={`flex-1 rounded-full border px-4 py-2 font-bold ${
              lang === l.id ? "border-brand bg-brand text-white" : "border-stroke bg-card text-ink-soft"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">{tr("lang.help")}</p>
      {lang === "ar" ? <p className="text-xs font-semibold text-ink-soft">{tr("lang.draftNote")}</p> : null}
    </div>
  );
}
