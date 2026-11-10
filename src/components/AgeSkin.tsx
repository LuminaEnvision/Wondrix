"use client";

import { useEffect } from "react";
import { loadProfile, profileAgeMode } from "@/lib/demo-store";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";

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
      const mode = profileAgeMode(profile);
      const root = document.documentElement;
      root.dataset.age = mode;
      root.dataset.skin = mode === "teen" ? "studio" : "meadow";
      if (mode === "teen" && profile.teenDark) {
        root.dataset.theme = "dark";
      } else {
        delete root.dataset.theme;
      }
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
