"use client";

import Image from "next/image";
import { useState } from "react";
import {
  getSetupStatus,
  hasParentPin,
  markSetupSkipped,
  setParentPin,
} from "@/lib/parent-auth";
import { LanguagePicker } from "@/components/LanguagePicker";
import { useHydrated, useT } from "@/lib/use-client-state";

export function SetupGate({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  const tr = useT();
  const [closed, setClosed] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");


  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-ink-soft">
        {tr("common.loading")}
      </div>
    );
  }

  // First open only: no setup decision yet, and no PIN (read after hydration).
  const show = !closed && getSetupStatus() === "needed" && !hasParentPin();
  if (!show) return <>{children}</>;

  function createPin() {
    if (!/^\d{4}$/.test(pin)) {
      setError(tr("setup.errDigits"));
      return;
    }
    if (pin !== confirm) {
      setError(tr("setup.errMatch"));
      return;
    }
    setParentPin(pin);
    setClosed(true);
  }

  function skip() {
    markSetupSkipped();
    setClosed(true);
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative h-28 w-28">
          <Image
            src="/art/mascot-hero.png"
            alt="Wondrix"
            fill
            className="object-contain"
            sizes="112px"
            priority
          />
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink">{tr("setup.title")}</h1>
        <p className="text-ink-soft">{tr("setup.intro")}</p>
      </div>

      <div className="space-y-4 rounded-3xl border border-stroke bg-card p-5">
        <LanguagePicker />
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
          onClick={createPin}
          className="w-full rounded-full bg-brand py-3 font-bold text-white"
        >
          {tr("setup.save")}
        </button>
        <button
          type="button"
          onClick={skip}
          className="w-full rounded-full border border-stroke bg-card py-3 font-bold text-ink-soft"
        >
          {tr("setup.skip")}
        </button>
      </div>
    </div>
  );
}
