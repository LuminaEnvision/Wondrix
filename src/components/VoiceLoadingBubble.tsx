"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/use-client-state";
import { subscribeVoiceStatus, type VoiceStatus } from "@/lib/voice";

const READY_ONCE_KEY = "wondrix-voice-ready-once";
/** Wait a moment before showing, so a cached model that loads instantly never flashes the bubble. */
const SHOW_DELAY_MS = 700;

type View =
  | { kind: "hidden" }
  | { kind: "loading"; progress: number; firstTime: boolean }
  | { kind: "ready" }
  | { kind: "failed" };

function readyBefore(): boolean {
  try {
    return localStorage.getItem(READY_ONCE_KEY) === "1";
  } catch {
    return false;
  }
}

function markReady() {
  try {
    localStorage.setItem(READY_ONCE_KEY, "1");
  } catch {
    /* private mode */
  }
}

/**
 * Small floating bubble that tells the child (and parent) the natural voice is
 * being prepared, so a first-time model download never looks like a frozen app.
 */
export function VoiceLoadingBubble({ enabled }: { enabled: boolean }) {
  const tr = useT();
  const [view, setView] = useState<View>({ kind: "hidden" });
  const shownRef = useRef(false);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const clearTimers = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      showTimer.current = null;
      hideTimer.current = null;
    };

    const onStatus = (s: VoiceStatus) => {
      if (s.engine !== "kokoro") return;

      if (s.state === "loading") {
        const next: View = { kind: "loading", progress: s.progress, firstTime: !readyBefore() };
        if (shownRef.current) {
          setView(next);
        } else if (!showTimer.current) {
          showTimer.current = setTimeout(() => {
            shownRef.current = true;
            setView(next);
          }, SHOW_DELAY_MS);
        }
        return;
      }

      if (s.state === "ready") {
        markReady();
        if (showTimer.current) clearTimeout(showTimer.current);
        showTimer.current = null;
        if (shownRef.current) {
          setView({ kind: "ready" });
          hideTimer.current = setTimeout(() => {
            shownRef.current = false;
            setView({ kind: "hidden" });
          }, 2500);
        }
        return;
      }

      if (s.state === "failed") {
        if (showTimer.current) clearTimeout(showTimer.current);
        showTimer.current = null;
        if (shownRef.current) {
          setView({ kind: "failed" });
          hideTimer.current = setTimeout(() => {
            shownRef.current = false;
            setView({ kind: "hidden" });
          }, 4500);
        }
      }
    };

    const unsubscribe = subscribeVoiceStatus(onStatus);
    return () => {
      unsubscribe();
      clearTimers();
    };
  }, [enabled]);

  if (!enabled || view.kind === "hidden") return null;

  const dismiss = () => {
    shownRef.current = false;
    setView({ kind: "hidden" });
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-stroke bg-card px-4 py-3 shadow-lg sm:start-auto sm:end-4 sm:mx-0"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-1 inline-block h-3 w-3 shrink-0 rounded-full ${
            view.kind === "loading"
              ? "animate-pulse bg-brand"
              : view.kind === "ready"
                ? "bg-brand"
                : "bg-accent"
          }`}
        />
        <div className="min-w-0 flex-1">
          {view.kind === "loading" ? (
            <>
              <p className="text-sm font-bold text-ink">
                {view.firstTime ? tr("voiceBubble.firstTitle") : tr("voiceBubble.wakeTitle")}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {view.firstTime
                  ? tr("voiceBubble.firstBody")
                  : tr("voiceBubble.wakeBody")}
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-deep"
                aria-label={tr("voiceBubble.progress", { p: view.progress })}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-300"
                  style={{ width: `${Math.max(4, view.progress)}%` }}
                />
              </div>
              <p className="mt-1 text-end text-[11px] font-semibold text-ink-soft">
                {view.progress}%
              </p>
            </>
          ) : view.kind === "ready" ? (
            <p className="text-sm font-bold text-ink">{tr("voiceBubble.ready")}</p>
          ) : (
            <>
              <p className="text-sm font-bold text-ink">{tr("voiceBubble.unavailTitle")}</p>
              <p className="mt-0.5 text-xs text-ink-soft">
                {tr("voiceBubble.unavailBody")}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="-me-1 -mt-1 rounded-full px-2 py-1 text-sm text-ink-soft hover:text-ink"
          aria-label={tr("voiceBubble.hide")}
        >
          ×
        </button>
      </div>
    </div>
  );
}
