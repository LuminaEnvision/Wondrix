"use client";

import { useEffect } from "react";
import { loadProfile, profileAgeMode } from "@/lib/demo-store";
import type { AgeMode } from "@/lib/types";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";

/** Apply age + dark chrome to <html> (also usable for live Parent previews). */
export function applyAgeChrome(mode: AgeMode, teenDark: boolean) {
  const root = document.documentElement;
  root.dataset.age = mode;
  root.dataset.skin = mode === "teen" ? "studio" : "meadow";
  if (mode === "teen" && teenDark) {
    root.dataset.theme = "dark";
  } else {
    delete root.dataset.theme;
  }
}

/**
 * Syncs UI chrome to the document:
 * - data-age = explorer | teen (tap size, radius, type scale)
 * - data-theme = dark only when teen + teenDark
 * Keeps legacy data-skin for any leftover meadow/journal/studio rules.
 */
export function AgeSkin() {
  useEffect(() => {
    function apply() {
      const profile = loadProfile();
      applyAgeChrome(profileAgeMode(profile), Boolean(profile.teenDark));
    }
    apply();
    window.addEventListener(PROFILE_CHANGED_EVENT, apply);
    window.addEventListener("storage", apply);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, apply);
      window.removeEventListener("storage", apply);
    };
  }, []);

  return null;
}
