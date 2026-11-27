"use client";

import { useEffect } from "react";
import { hasAgePicked, resolveAgeMode, resolveDarkMode } from "@/lib/age-preference";
import { listChildren, loadProfile, profileAgeMode } from "@/lib/demo-store";
import type { AgeMode } from "@/lib/types";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";

/** Apply age + light/dark chrome to <html> (also usable for live Parent previews). */
export function applyAgeChrome(mode: AgeMode, darkMode: boolean) {
  const root = document.documentElement;
  root.dataset.age = mode;
  root.dataset.skin = mode === "teen" ? "studio" : "meadow";
  if (darkMode) {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
}

/**
 * Syncs UI chrome to the document:
 * - data-age = little | explorer | teen (tap size, radius, type scale)
 * - data-theme = dark when darkMode is on (any age)
 * Keeps legacy data-skin for any leftover meadow/journal/studio rules.
 */
export function AgeSkin() {
  useEffect(() => {
    function apply() {
      const profile = loadProfile();
      const kids = listChildren();
      const mode =
        hasAgePicked() || kids.length > 0 ? resolveAgeMode() : profileAgeMode(profile);
      const dark =
        hasAgePicked() || kids.length > 0
          ? resolveDarkMode()
          : Boolean(profile.darkMode ?? profile.teenDark);
      applyAgeChrome(mode, dark);
    }
    apply();
    // Preload TTS quietly so Little never shows a progress bar.
    void import("@/lib/voice").then((v) => v.warmUpVoice()).catch(() => {});
    window.addEventListener(PROFILE_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
