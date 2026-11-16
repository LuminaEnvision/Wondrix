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
import { childStorageKey, HOUSEHOLD_KEY } from "./household";
import { loadProfile, MASTERY_KEY, saveProfile, setActiveChatId } from "./demo-store";
import { PROFILE_CHANGED_EVENT } from "./types";

const LANG_KEY = "wondrix-language";

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
    return `${localStorage.getItem(HOUSEHOLD_KEY) ?? ""}|${localStorage.getItem(childStorageKey(MASTERY_KEY)) ?? ""}|${localStorage.getItem(LANG_KEY) ?? ""}`;
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
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return asLang(stored);
  } catch {
    /* ignore */
  }
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

/** Save only the language (device-level; applies at once). */
export function saveLanguage(lang: Lang) {
  const prev = readLang();
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* ignore */
  }
  // Keep active child profile.language in sync for API callers that read the profile blob.
  try {
    const profile = loadProfile();
    if (profile.id || listHasChildren()) {
      saveProfile({ ...profile, language: lang });
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
    }
  } catch {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
    }
  }
  // Do not keep an English chat open after switching to Arabic (and vice versa).
  if (prev !== lang) setActiveChatId(null);
}

function listHasChildren(): boolean {
  try {
    return Boolean(localStorage.getItem(HOUSEHOLD_KEY)?.includes('"id"'));
  } catch {
    return false;
  }
}
