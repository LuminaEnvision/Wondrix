"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/use-client-state";
import { getServerSpeech, getSpeech, speak, stopSpeaking, subscribeSpeech } from "@/lib/voice";

/** Animated equalizer bars shown while Wondrix is talking. */
function Bars() {
  return (
    <span className="wx-eq inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden
    />
  );
}

/**
 * Per-message voice control: Listen → Preparing voice… → Speaking (bars) with Stop.
 * Makes it obvious when audio is loading or playing, even on slow devices.
 */
export function SpeakButton({
  id,
  text,
  tone = "brand",
  label,
}: {
  id: string;
  text: string;
  tone?: "brand" | "extra";
  /** Accessible name of the play button. */
  label?: string;
}) {
  const tr = useT();
  const s = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);
  const mine = "id" in s && s.id === id;
  const color = tone === "extra" ? "text-extra border-extra/30" : "text-brand border-brand/30";

  if (mine && (s.state === "preparing" || s.state === "speaking")) {
    return (
      <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${color.split(" ")[0]}`}>
          {s.state === "preparing" ? <Spinner /> : <Bars />}
          {s.state === "preparing" ? tr("speak.preparing") : tr("speak.speaking")}
        </span>
        <button
          type="button"
          onClick={stopSpeaking}
          className={`inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs font-bold ${color}`}
          aria-label={tr("speak.stopLabel")}
        >
          <span className="inline-block h-2 w-2 rounded-[2px] bg-current" aria-hidden />
          {tr("speak.stop")}
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => speak(text, { id })}
        className={`inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-bold ${color}`}
        aria-label={label ?? tr("speak.listenAnswer")}
      >
        <span
          className="inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current"
          aria-hidden
        />
        {tr("speak.listen")}
      </button>
      {mine && s.state === "unavailable" ? (
        <span className="text-xs text-ink-soft" role="status">
          {tr("speak.noSound")}
        </span>
      ) : null}
    </span>
  );
}
