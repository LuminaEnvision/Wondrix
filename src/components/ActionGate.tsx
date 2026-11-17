"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { SpeakButton } from "@/components/SpeakButton";
import { loadDeviceAgeMode, loadDeviceDarkMode } from "@/lib/age-preference";
import { addChild, isFamilySetupComplete } from "@/lib/demo-store";
import { markSetupComplete, setParentPin } from "@/lib/parent-auth";
import { PROFILE_CHANGED_EVENT } from "@/lib/types";
import { speak } from "@/lib/voice";
import { useHydrated, useT } from "@/lib/use-client-state";

type GateContextValue = {
  ready: boolean;
  setupComplete: boolean;
  requestNavigate: (href: string) => void;
};

const GateContext = createContext<GateContextValue>({
  ready: false,
  setupComplete: false,
  requestNavigate: () => {},
});

export function useActionGate() {
  return useContext(GateContext);
}

function isProtectedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname.startsWith("/website")) return false;
  return (
    pathname.startsWith("/school") ||
    pathname.startsWith("/extra") ||
    pathname.startsWith("/parent")
  );
}

function subscribeSetup(onStoreChange: () => void) {
  window.addEventListener(PROFILE_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(PROFILE_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

type Step = "handoff" | "pin" | "child";

/**
 * Hero-first: home is free. First School / Wonder / Parent action opens
 * pass-to-parent → passcode → first child, then continues to the destination.
 */
export function ActionGate({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  const tr = useT();
  const router = useRouter();
  const pathname = usePathname();
  const setupComplete = useSyncExternalStore(
    subscribeSetup,
    () => isFamilySetupComplete(),
    () => false,
  );
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("handoff");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const openGate = useCallback((href: string) => {
    setPendingHref(href);
    setStep("handoff");
    setPin("");
    setConfirm("");
    setNickname("");
    setAge("");
    setError("");
  }, []);

  const requestNavigate = useCallback(
    (href: string) => {
      if (!ready) return;
      if (isFamilySetupComplete()) {
        router.push(href);
        return;
      }
      openGate(href);
    },
    [ready, router, openGate],
  );

  // Deep-link into protected routes before setup → same handoff (derive pending).
  const deepLinkPending =
    ready && !setupComplete && !pendingHref && isProtectedPath(pathname) ? pathname : null;
  const effectivePending = pendingHref ?? deepLinkPending;

  useEffect(() => {
    if (step !== "handoff" || !effectivePending) return;
    const text = tr("handoff.speak");
    const t = window.setTimeout(() => speak(text, { id: "handoff" }), 400);
    return () => clearTimeout(t);
  }, [step, effectivePending, tr]);

  const value = useMemo(
    () => ({ ready, setupComplete, requestNavigate }),
    [ready, setupComplete, requestNavigate],
  );

  function bumpSetup() {
    setTick((n) => n + 1);
    window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  }

  function finishSetup() {
    const name = nickname.trim() || tr("parent.yourChild");
    const ageVal = age.trim();
    if (!ageVal) {
      setError(tr("handoff.errAge"));
      return;
    }
    addChild({
      childNickname: name,
      age: ageVal,
      ageMode: loadDeviceAgeMode(),
      darkMode: loadDeviceDarkMode(),
    });
    markSetupComplete();
    bumpSetup();
    setPendingHref(null);
    // Land on Parent; ParentLock will ask for the PIN again (kids safety).
    router.replace("/parent");
  }

  function savePin() {
    if (!/^\d{4}$/.test(pin)) {
      setError(tr("setup.errDigits"));
      return;
    }
    if (pin !== confirm) {
      setError(tr("setup.errMatch"));
      return;
    }
    setParentPin(pin);
    setError("");
    setStep("child");
  }

  // tick forces re-read after local setup mutations in the same tab.
  void tick;
  const showOverlay = Boolean(effectivePending) && !isFamilySetupComplete();

  return (
    <GateContext.Provider value={value}>
      {showOverlay && isProtectedPath(pathname) ? (
        <div className="flex flex-1 items-center justify-center p-6 text-ink-soft">
          {tr("common.loading")}
        </div>
      ) : (
        children
      )}

      {showOverlay ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="handoff-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-stroke bg-card p-5 shadow-xl">
            {step === "handoff" ? (
              <div className="space-y-4 text-center">
                <div className="relative mx-auto h-24 w-24">
                  <Image
                    src="/art/parent-phone.jpg"
                    alt=""
                    fill
                    className="object-contain"
                    sizes="96px"
                  />
                </div>
                <h2 id="handoff-title" className="font-display text-2xl font-semibold text-ink">
                  {tr("handoff.title")}
                </h2>
                <p className="text-sm leading-relaxed text-ink-soft">{tr("handoff.body")}</p>
                <SpeakButton id="handoff" text={tr("handoff.speak")} label={tr("handoff.listen")} />
                <button
                  type="button"
                  onClick={() => setStep("pin")}
                  className="w-full rounded-full bg-brand py-3 font-bold text-white"
                >
                  {tr("handoff.continue")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingHref(null);
                    if (isProtectedPath(pathname)) router.replace("/");
                  }}
                  className="w-full rounded-full border border-stroke py-3 font-bold text-ink-soft"
                >
                  {tr("handoff.backHome")}
                </button>
              </div>
            ) : null}

            {step === "pin" ? (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-semibold text-ink">{tr("handoff.pinTitle")}</h2>
                <p className="text-sm text-ink-soft">{tr("handoff.pinIntro")}</p>
                <label className="block space-y-1">
                  <span className="text-sm font-bold text-ink-soft">{tr("setup.create")}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setError("");
                    }}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 tracking-[0.4em] outline-none focus:border-brand/40"
                    placeholder="••••"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-bold text-ink-soft">{tr("setup.confirm")}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setError("");
                    }}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 tracking-[0.4em] outline-none focus:border-brand/40"
                    placeholder="••••"
                  />
                </label>
                {error ? <p className="text-sm font-semibold text-extra">{error}</p> : null}
                <button
                  type="button"
                  onClick={savePin}
                  className="w-full rounded-full bg-brand py-3 font-bold text-white"
                >
                  {tr("setup.save")}
                </button>
              </div>
            ) : null}

            {step === "child" ? (
              <div className="space-y-4">
                <h2 className="font-display text-2xl font-semibold text-ink">{tr("handoff.childTitle")}</h2>
                <p className="text-sm text-ink-soft">{tr("handoff.childIntro")}</p>
                <label className="block space-y-1" htmlFor="handoff-nickname">
                  <span className="text-sm font-bold text-ink-soft">{tr("parent.nickname")}</span>
                  <input
                    id="handoff-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                  />
                </label>
                <label className="block space-y-1" htmlFor="handoff-age">
                  <span className="text-sm font-bold text-ink-soft">{tr("parent.age")}</span>
                  <input
                    id="handoff-age"
                    value={age}
                    inputMode="numeric"
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-2xl border border-stroke bg-bg/40 px-4 py-3 outline-none focus:border-brand/40"
                    placeholder={tr("parent.agePlaceholder")}
                  />
                </label>
                {error ? <p className="text-sm font-semibold text-extra">{error}</p> : null}
                <button
                  type="button"
                  onClick={finishSetup}
                  className="w-full rounded-full bg-brand py-3 font-bold text-white"
                >
                  {tr("handoff.done")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </GateContext.Provider>
  );
}
