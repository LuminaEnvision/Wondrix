import { clampSubjectsToProgramme } from "./curriculum";
import { defaultAgeMode, gradeFromAge, gradeFromLabel, suggestedAgeFromGrade } from "./grades";
import type { AgeMode, ChildProfile, Household, ParentProfile } from "./types";
import { MAX_TEXTBOOK_PHOTOS, notifyProfileChanged } from "./types";

export const HOUSEHOLD_KEY = "wondrix-household";
export const PROFILE_KEY = "wondrix-profile";

export const DEFAULT_PROFILE: ParentProfile = {
  childNickname: "Alex",
  age: "8",
  ageBand: "young",
  ageMode: "explorer",
  darkMode: false,
  gradeLabel: "Year 3",
  curriculum: "uk",
  subjects: ["math", "science"],
  oneLiner: "",
  unitNote: "",
  textbookPhotos: [],
  calmMode: false,
};

function normalizeAgeMode(value: unknown, gradeLabel: string): AgeMode {
  if (value === "explorer" || value === "teen") return value;
  return defaultAgeMode(gradeLabel);
}

export function newChildId(): string {
  return `kid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeChild(raw: Partial<ChildProfile> & { childNickname?: string }): ChildProfile {
  const grade = gradeFromLabel(raw.gradeLabel ?? DEFAULT_PROFILE.gradeLabel!);
  const photos = Array.isArray(raw.textbookPhotos)
    ? raw.textbookPhotos.filter((p): p is string => typeof p === "string").slice(0, MAX_TEXTBOOK_PHOTOS)
    : [];
  return {
    ...DEFAULT_PROFILE,
    ...raw,
    id: typeof raw.id === "string" && raw.id ? raw.id : newChildId(),
    childNickname: (raw.childNickname ?? DEFAULT_PROFILE.childNickname).trim() || DEFAULT_PROFILE.childNickname,
    age: typeof raw.age === "string" ? raw.age.trim() : raw.age != null ? String(raw.age) : "",
    avatarUrl: typeof raw.avatarUrl === "string" ? raw.avatarUrl : undefined,
    ageBand: grade.ageBand,
    gradeLabel: grade.label,
    ageMode: normalizeAgeMode(raw.ageMode, grade.label),
    darkMode: Boolean(raw.darkMode ?? raw.teenDark),
    teenDark: undefined,
    unitNote: typeof raw.unitNote === "string" ? raw.unitNote : "",
    textbookPhotos: photos,
    subjects: clampSubjectsToProgramme(
      raw.subjects ?? DEFAULT_PROFILE.subjects,
      raw.curriculum,
      grade.label,
    ),
  };
}

function emptyHousehold(): Household {
  return { children: [], activeChildId: null };
}

/** Move legacy unscoped localStorage values into `base:childId`. */
export function migrateLegacyChildKeys(childId: string) {
  if (typeof window === "undefined") return;
  const bases = [
    "wondrix-mastery",
    "wondrix-extra-topic",
    "wondrix-safety-redirects",
    "wondrix-practice-today",
    "wondrix-extra-chats",
  ];
  for (const base of bases) {
    const scoped = `${base}:${childId}`;
    if (localStorage.getItem(scoped)) continue;
    const legacy = localStorage.getItem(base);
    if (legacy == null) continue;
    localStorage.setItem(scoped, legacy);
    localStorage.removeItem(base);
  }
  const activeLegacy = sessionStorage.getItem("wondrix-extra-active");
  if (activeLegacy && !sessionStorage.getItem(`wondrix-extra-active:${childId}`)) {
    sessionStorage.setItem(`wondrix-extra-active:${childId}`, activeLegacy);
    sessionStorage.removeItem("wondrix-extra-active");
  }
}

function migrateLegacyProfile(): Household | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChildProfile>;
    const child = normalizeChild(parsed);
    migrateLegacyChildKeys(child.id);
    localStorage.removeItem(PROFILE_KEY);
    return { children: [child], activeChildId: child.id };
  } catch {
    return null;
  }
}

export function loadHousehold(): Household {
  if (typeof window === "undefined") return emptyHousehold();
  try {
    const raw = localStorage.getItem(HOUSEHOLD_KEY);
    if (!raw) {
      const migrated = migrateLegacyProfile();
      if (migrated) {
        saveHousehold(migrated);
        return migrated;
      }
      return emptyHousehold();
    }
    const parsed = JSON.parse(raw) as Household;
    const children = Array.isArray(parsed.children)
      ? parsed.children.map((c) => normalizeChild(c))
      : [];
    let activeChildId = parsed.activeChildId;
    if (activeChildId && !children.some((c) => c.id === activeChildId)) {
      activeChildId = children[0]?.id ?? null;
    }
    if (!activeChildId && children[0]) activeChildId = children[0].id;
    return { children, activeChildId };
  } catch {
    return emptyHousehold();
  }
}

export function saveHousehold(household: Household) {
  if (typeof window === "undefined") return;
  const children = household.children.map((c) => normalizeChild(c));
  let activeChildId = household.activeChildId;
  if (activeChildId && !children.some((c) => c.id === activeChildId)) {
    activeChildId = children[0]?.id ?? null;
  }
  if (!activeChildId && children[0]) activeChildId = children[0].id;
  localStorage.setItem(HOUSEHOLD_KEY, JSON.stringify({ children, activeChildId }));
  notifyProfileChanged();
}

export function activeChildId(): string | null {
  return loadHousehold().activeChildId;
}

/** Scoped storage key for the active child (or explicit id). */
export function childStorageKey(base: string, childId?: string | null): string {
  const id = childId === undefined ? activeChildId() : childId;
  return id ? `${base}:${id}` : base;
}

export function listChildren(): ChildProfile[] {
  return loadHousehold().children;
}

export function getChild(id: string): ChildProfile | undefined {
  return loadHousehold().children.find((c) => c.id === id);
}

export function setActiveChild(id: string) {
  const h = loadHousehold();
  if (!h.children.some((c) => c.id === id)) return;
  saveHousehold({ ...h, activeChildId: id });
}

export function addChild(partial?: Partial<ChildProfile>): ChildProfile {
  const merged: Partial<ChildProfile> & { id: string } = {
    ...DEFAULT_PROFILE,
    ...partial,
    id: newChildId(),
  };
  // Age without an explicit year → pick a matching year (avoids age 15 + Year 3).
  if (partial?.age && partial.gradeLabel === undefined) {
    const g = gradeFromAge(partial.age);
    merged.gradeLabel = g.label;
    merged.ageBand = g.ageBand;
    if (partial.ageMode === undefined) merged.ageMode = defaultAgeMode(g.label);
  } else if (partial?.gradeLabel && (partial.age === undefined || partial.age === "")) {
    merged.age = suggestedAgeFromGrade(partial.gradeLabel);
  }
  const child = normalizeChild(merged);
  const h = loadHousehold();
  saveHousehold({ children: [...h.children, child], activeChildId: child.id });
  return child;
}

export function updateChild(id: string, patch: Partial<ChildProfile>) {
  const h = loadHousehold();
  const children = h.children.map((c) => (c.id === id ? normalizeChild({ ...c, ...patch, id }) : c));
  saveHousehold({ ...h, children });
}

export function removeChild(id: string) {
  const h = loadHousehold();
  const children = h.children.filter((c) => c.id !== id);
  const activeChildId =
    h.activeChildId === id ? (children[0]?.id ?? null) : h.activeChildId;
  saveHousehold({ children, activeChildId });
}

export function loadProfile(): ParentProfile {
  const h = loadHousehold();
  const active = h.children.find((c) => c.id === h.activeChildId) ?? h.children[0];
  if (active) return active;
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: ParentProfile) {
  const h = loadHousehold();
  const id = profile.id ?? h.activeChildId;
  if (id && h.children.some((c) => c.id === id)) {
    updateChild(id, profile);
    return;
  }
  if (h.children.length === 0) {
    addChild(profile);
    return;
  }
  const target = h.activeChildId ?? h.children[0].id;
  updateChild(target, profile);
}

/** True when a parent passcode exists and at least one child is on the device. */
export function isFamilySetupComplete(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const pin = localStorage.getItem("wondrix-parent-pin");
    const h = loadHousehold();
    return Boolean(pin) && h.children.length > 0;
  } catch {
    return false;
  }
}

export function profileAgeMode(profile: ParentProfile = loadProfile()): AgeMode {
  return normalizeAgeMode(profile.ageMode, profile.gradeLabel);
}

export function childIsFilled(child: ChildProfile): boolean {
  return Boolean(
    child.childNickname.trim() &&
      child.age?.trim() &&
      child.gradeLabel &&
      child.subjects.length,
  );
}
