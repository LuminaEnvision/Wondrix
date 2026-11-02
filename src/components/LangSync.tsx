"use client";

import { useEffect } from "react";
import { langInfo } from "@/lib/i18n";
import { useLang } from "@/lib/use-client-state";

/** Keeps <html lang dir> in sync with the saved language (RTL for Arabic). */
export function LangSync() {
  const lang = useLang();
  useEffect(() => {
    const info = langInfo(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = info.dir;
  }, [lang]);
  return null;
}
