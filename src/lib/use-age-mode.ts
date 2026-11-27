"use client";

import { useSyncExternalStore } from "react";
import { resolveAgeMode } from "@/lib/age-preference";
import { isAgeMode } from "@/lib/age-mode";
import type { AgeMode } from "@/lib/types";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";

function readDomAge(): AgeMode {
  if (typeof document === "undefined") return "explorer";
  const raw = document.documentElement.dataset.age;
  if (isAgeMode(raw)) return raw;
  return resolveAgeMode();
}

function subscribe(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  if (typeof document !== "undefined") {
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-age"] });
  }
  window.addEventListener(PROFILE_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    obs.disconnect();
    window.removeEventListener(PROFILE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Live AgeMode from html[data-age], falling back to household/device. */
export function useAgeMode(): AgeMode {
  return useSyncExternalStore(subscribe, readDomAge, () => "explorer" as AgeMode);
}
