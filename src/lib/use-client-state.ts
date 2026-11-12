"use client";

/**
 * Hooks for reading browser-only state (localStorage) without calling
 * setState inside an effect. Pages are prerendered on the server, where
 * localStorage does not exist, so these return a server value first and
 * the real value after hydration (React's useSyncExternalStore contract).
 */

import { useSyncExternalStore } from "react";
import { gradeName } from "./curriculum";
import { asLang, t, type Lang, type MessageKey } from "./i18n";
import { loadProfile, MASTERY_KEY, PROFILE_KEY, saveProfile, setActiveChatId } from "./demo-store";
import { PROFILE_CHANGED_EVENT } from "./types";

const noopSubscribe = () => () => {};

/** false during SSR and the hydration render, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeProfile(onChange: () => void) {
  window.addEventListener(PROFILE_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(PROFILE_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readProfileKey(): string {
  try {
    // Raw strings are stable snapshots (same value → no re-render).
    return `${localStorage.getItem(PROFILE_KEY) ?? ""}|${localStorage.getItem(MASTERY_KEY) ?? ""}`;
  } catch {
    return "|";
  }
}

/**
 * A string that changes whenever the saved profile or mastery changes
 * (same tab via PROFILE_CHANGED_EVENT, other tabs via "storage").
 * Empty string on the server / before hydration.
 */
export function useProfileKey(): string {
  return useSyncExternalStore(subscribeProfile, readProfileKey, () => "");
}

function readGradeLabel(): string {
  return loadProfile().gradeLabel;
}

/** The saved grade label ("Year 4"...), live-updated; empty string before hydration. */
export function useProfileGradeLabel(): string {
  return useSyncExternalStore(subscribeProfile, readGradeLabel, () => "");
}

function readGradeName(): string {
  const p = loadProfile();
  return gradeName(p.gradeLabel, p.curriculum);
}

/** The saved grade in the family's curriculum ("Grade 3"...); empty string before hydration. */
export function useProfileGradeName(): string {
  return useSyncExternalStore(subscribeProfile, readGradeName, () => "");
}

function readLang(): Lang {
  return asLang(loadProfile().language);
}

/** Saved app language; "en" on the server and during hydration. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribeProfile, readLang, () => "en");
}

/** Translator bound to the saved language: `const tr = useT(); tr("extra.send")`. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const lang = useLang();
  return (key, vars) => t(key, vars, lang);
}

/** Save only the language (applies at once, without the Parent form's Save button). */
export function saveLanguage(lang: Lang) {
  const prev = asLang(loadProfile().language);
  saveProfile({ ...loadProfile(), language: lang });
  // Do not keep an English chat open after switching to Arabic (and vice versa).
  if (prev !== lang) setActiveChatId(null);
}
