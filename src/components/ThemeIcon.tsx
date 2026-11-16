"use client";

import { useCallback, useSyncExternalStore } from "react";
import { applyAgeChrome } from "@/components/AgeSkin";
import { WxGlyph } from "@/components/WxGlyph";
import {
  pickDeviceTheme,
  resolveAgeMode,
  resolveDarkMode,
} from "@/lib/age-preference";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";
import { useT } from "@/lib/use-client-state";

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener(PROFILE_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(PROFILE_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Compact light/dark toggle for the header (next to language). */
export function ThemeIcon() {
  const tr = useT();
  const dark = useSyncExternalStore(subscribeTheme, resolveDarkMode, () => false);

  const toggle = useCallback(() => {
    const next = !resolveDarkMode();
    pickDeviceTheme(next);
    applyAgeChrome(resolveAgeMode(), next);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      className="wx-tap inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] p-0.5 text-[var(--world-ink)] shadow-[var(--shadow-card)]"
      aria-label={dark ? tr("theme.toLight") : tr("theme.toDark")}
      title={tr("parent.theme")}
    >
      <WxGlyph name={dark ? "sun" : "moon"} size={28} />
    </button>
  );
}
