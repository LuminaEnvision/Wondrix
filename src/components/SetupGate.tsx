"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  getSetupStatus,
  hasParentPin,
  markSetupSkipped,
  setParentPin,
} from "@/lib/parent-auth";

export function SetupGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const status = getSetupStatus();
    // First open only: no setup decision yet, and no PIN
    setShow(status === "needed" && !hasParentPin());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-ink-soft">
        Loading…
      </div>
    );
  }

  if (!show) return <>{children}</>;

  function createPin() {
    if (!/^\d{4}$/.test(pin)) {
      setError("Use a 4-digit number.");
      return;
    }
    if (pin !== confirm) {
      setError("Those numbers do not match.");
      return;
    }
    setParentPin(pin);
    setShow(false);
  }

  function skip() {
    markSetupSkipped();
    setShow(false);
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
        <h1 className="font-display text-3xl font-semibold text-ink">Welcome to Wondrix</h1>
        <p className="text-ink-soft">
          Parents can set a 4-digit password for the Parent area. Or skip and explore first.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-stroke bg-card p-5">
        <label className="block space-y-1">
          <span className="text-sm font-bold text-ink-soft">Create parent password (4 digits)</span>
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
          <span className="text-sm font-bold text-ink-soft">Confirm password</span>
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
          Save password
        </button>
        <button
          type="button"
          onClick={skip}
          className="w-full rounded-full border border-stroke bg-card py-3 font-bold text-ink-soft"
        >
          Skip for now. Let me explore
        </button>
      </div>
    </div>
  );
}
