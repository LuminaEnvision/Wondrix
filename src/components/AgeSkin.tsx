"use client";

import { useEffect } from "react";
import { loadProfile } from "@/lib/demo-store";
import { PROFILE_CHANGED_EVENT, type AgeBand } from "@/lib/types";

const SKINS: Record<AgeBand, string> = {
  young: "meadow",
  middle: "journal",
  teen: "studio",
};

/** Applies meadow / field-journal / studio skin from parent age band (canvas three skins). */
export function AgeSkin() {
  useEffect(() => {
    function apply() {
      const band = loadProfile().ageBand;
      document.documentElement.dataset.skin = SKINS[band] ?? "meadow";
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
