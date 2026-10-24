const PIN_KEY = "wondrix-parent-pin";
const SETUP_KEY = "wondrix-setup";
const UNLOCK_KEY = "wondrix-parent-unlocked";

export type SetupStatus = "needed" | "skipped" | "complete";

function hashPin(pin: string): string {
  // Lightweight local obfuscation (not bank-grade; device-local parent gate only)
  let h = 0;
  const salted = `wondrix:${pin}`;
  for (let i = 0; i < salted.length; i++) h = (h * 31 + salted.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}`;
}

export function getSetupStatus(): SetupStatus {
  if (typeof window === "undefined") return "needed";
  const raw = localStorage.getItem(SETUP_KEY);
  if (raw === "skipped") return "skipped";
  if (raw === "complete") return "complete";
  return "needed";
}

export function markSetupSkipped() {
  localStorage.setItem(SETUP_KEY, "skipped");
}

export function markSetupComplete() {
  localStorage.setItem(SETUP_KEY, "complete");
}

export function hasParentPin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(PIN_KEY));
}

export function setParentPin(pin: string) {
  localStorage.setItem(PIN_KEY, hashPin(pin));
  markSetupComplete();
  sessionStorage.setItem(UNLOCK_KEY, "1");
}

export function clearParentPin() {
  localStorage.removeItem(PIN_KEY);
}

export function verifyParentPin(pin: string): boolean {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true;
  return stored === hashPin(pin);
}

export function isParentUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  if (!hasParentPin()) return true;
  return sessionStorage.getItem(UNLOCK_KEY) === "1";
}

export function unlockParentSession() {
  sessionStorage.setItem(UNLOCK_KEY, "1");
}

export function lockParentSession() {
  sessionStorage.removeItem(UNLOCK_KEY);
}
