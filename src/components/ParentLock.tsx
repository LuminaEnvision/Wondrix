"use client";

import { useState } from "react";
import {
  hasParentPin,
  isParentUnlocked,
  unlockParentSession,
  verifyParentPin,
} from "@/lib/parent-auth";
import { useHydrated, useT } from "@/lib/use-client-state";

export function ParentLock({ children }: { children: React.ReactNode }) {
  const ready = useHydrated();
  const tr = useT();
  const [unlockedNow, setUnlockedNow] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");


  if (!ready) {
    return <p className="text-ink-soft">{tr("common.loading")}</p>;
  }

  const locked = !unlockedNow && hasParentPin() && !isParentUnlocked();
  if (!locked) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 rounded-3xl border border-stroke bg-card p-6">
      <h1 className="font-display text-2xl font-semibold text-ink">{tr("lock.title")}</h1>
      <p className="text-sm text-ink-soft">{tr("lock.intro")}</p>
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
        autoFocus
      />
      {error ? <p className="text-sm font-semibold text-extra">{error}</p> : null}
      <button
        type="button"
        onClick={() => {
          if (!verifyParentPin(pin)) {
            setError(tr("lock.wrong"));
            return;
          }
          unlockParentSession();
          setUnlockedNow(true);
        }}
        className="rounded-full bg-brand py-3 font-bold text-white"
      >
        {tr("lock.unlock")}
      </button>
    </div>
  );
}
