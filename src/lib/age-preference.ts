import { activeChildId, loadHousehold, updateChild } from "@/lib/household";
import type { AgeMode } from "@/lib/types";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";

const MODE_KEY = "wondrix-device-age-mode";
const THEME_KEY = "wondrix-device-theme";
const PICKED_KEY = "wondrix-age-picked";

export function hasAgePicked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PICKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function loadDeviceAgeMode(): AgeMode {
  if (typeof window === "undefined") return "explorer";
  try {
    const raw = localStorage.getItem(MODE_KEY);
    if (raw === "little" || raw === "explorer" || raw === "teen") return raw;
    return "explorer";
  } catch {
    return "explorer";
  }
}

export function loadDeviceDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}

function profileDark(raw: { darkMode?: boolean; teenDark?: boolean } | undefined): boolean {
  return Boolean(raw?.darkMode ?? raw?.teenDark);
}

/** Persist age + theme from first-open picker (or Parent). Caller applies chrome. */
export function pickDeviceLook(mode: AgeMode, darkMode: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MODE_KEY, mode);
  localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  localStorage.setItem(PICKED_KEY, "1");
  const id = activeChildId();
  if (id) {
    updateChild(id, { ageMode: mode, darkMode, teenDark: undefined });
  }
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

/** Persist age only; keeps current theme. */
export function pickDeviceAgeMode(mode: AgeMode) {
  pickDeviceLook(mode, resolveDarkMode());
}

/** Persist theme only; keeps current age mode. */
export function pickDeviceTheme(darkMode: boolean) {
  pickDeviceLook(resolveAgeMode(), darkMode);
}

/** Seed age pick from an existing child profile (e.g. parent already chose level). */
export function markAgePickedFromProfile(mode: AgeMode, darkMode = false) {
  if (typeof window === "undefined") return;
  if (hasAgePicked()) return;
  localStorage.setItem(MODE_KEY, mode);
  localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light");
  localStorage.setItem(PICKED_KEY, "1");
}

export function resolveAgeMode(): AgeMode {
  const h = loadHousehold();
  if (h.children.length > 0) {
    const active = h.children.find((c) => c.id === h.activeChildId) ?? h.children[0];
    if (
      active?.ageMode === "little" ||
      active?.ageMode === "teen" ||
      active?.ageMode === "explorer"
    ) {
      return active.ageMode;
    }
  }
  return loadDeviceAgeMode();
}

export function resolveDarkMode(): boolean {
  const h = loadHousehold();
  if (h.children.length > 0) {
    const active = h.children.find((c) => c.id === h.activeChildId) ?? h.children[0];
    if (active) return profileDark(active);
  }
  return loadDeviceDarkMode();
}
