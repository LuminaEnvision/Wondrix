"use client";

import { useRef, useState } from "react";
import { useActionGate } from "@/components/ActionGate";
import { WxGlyph } from "@/components/WxGlyph";
import { useT } from "@/lib/use-client-state";

const HOLD_MS = 3000;

/**
 * Visible but quiet Parent entry for Little mode (Parent is off the child nav).
 * Hold ~3s — ring fills — then opens Parent (PIN still applies).
 * Short taps do nothing, so kids are unlikely to open it by accident.
 */
export function ParentHoldGate() {
  const tr = useT();
  const { requestNavigate } = useActionGate();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const raf = useRef(0);
  const startedAt = useRef(0);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    armed.current = false;
    setHolding(false);
    setProgress(0);
  }

  function tick() {
    const p = Math.min(1, (Date.now() - startedAt.current) / HOLD_MS);
    setProgress(p);
    if (p < 1) raf.current = requestAnimationFrame(tick);
  }

  function start() {
    clear();
    armed.current = true;
    setHolding(true);
    startedAt.current = Date.now();
    raf.current = requestAnimationFrame(tick);
    timer.current = setTimeout(() => {
      if (!armed.current) return;
      armed.current = false;
      setHolding(false);
      setProgress(1);
      window.dispatchEvent(new Event("wondrix-relock-parent"));
      requestNavigate("/parent");
    }, HOLD_MS);
  }

  const deg = Math.round(progress * 360);

  return (
    <button
      type="button"
      aria-label={tr("parent.openHold")}
      title={tr("parent.openHold")}
      className={`pointer-events-auto absolute bottom-[calc(var(--nav-h)+0.5rem)] end-3 z-40 flex size-12 items-center justify-center rounded-full border border-stroke bg-[var(--world-surface)] shadow-[var(--shadow-card)] transition ${
        holding ? "scale-105" : "opacity-80"
      }`}
      style={
        holding
          ? {
              backgroundImage: `conic-gradient(var(--world-accent) ${deg}deg, transparent ${deg}deg)`,
              padding: 2,
            }
          : undefined
      }
      onPointerDown={start}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-[var(--world-surface)]">
        <WxGlyph name="parent" size={28} />
      </span>
    </button>
  );
}
