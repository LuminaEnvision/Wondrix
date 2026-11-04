"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { VisualIcon } from "@/components/VisualIcon";
import { useT } from "@/lib/use-client-state";
import { iconFor, visualText, type IconName, type Visual } from "@/lib/visual";
import { getServerSpeech, getSpeech, speak, stopSpeaking, subscribeSpeech } from "@/lib/voice";

/**
 * Draws an agent "visual spec" as a picture-first diagram for children who
 * may not read yet: every item gets a big animated icon, the words are small.
 *
 * "Show me" (and auto-play right after the spoken answer) walks through the
 * items one by one: each item lights up and moves while Wondrix says it.
 * Tapping an item says just that item. All text comes from validated JSON and
 * is rendered by React (escaped), never as markup from the model.
 */

type Item = { label: string; detail?: string; icon?: IconName };

/** The items in reading/speaking order, with what to say for each. */
function itemsOf(v: Visual): Item[] {
  switch (v.kind) {
    case "steps":
      return v.items.map((i) => ({ label: i.label, detail: i.note, icon: iconFor(`${i.label} ${i.note ?? ""}`, i.icon) }));
    case "cycle":
      return v.items.map((i) => ({ label: i.label, icon: iconFor(i.label, i.icon) }));
    case "compare":
      return v.columns.map((c) => ({ label: c.label, detail: c.points.join(". "), icon: iconFor(`${c.label} ${c.points.join(" ")}`, c.icon) }));
    case "scale":
      return v.items.map((i) => ({ label: i.label, detail: `${fmt(i.value)}${v.unit ? ` ${v.unit}` : ""}`, icon: iconFor(i.label, i.icon) }));
    case "web":
      return [
        { label: v.center, icon: iconFor(v.center, v.centerIcon) },
        ...v.items.map((i) => ({ label: i.label, icon: iconFor(i.label, i.icon) })),
      ];
  }
}

function fmt(x: number): string {
  if (x >= 10000) return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(x);
  if (x >= 1000) return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${+x.toFixed(2)}`;
}

/** Say item i; when it ends (at least a short pause even without sound), go on to the next. */
function playItems(items: Item[], prefix: string, i: number, chain: boolean) {
  if (i >= items.length) return;
  const startedAt = Date.now();
  speak(say(items[i]), {
    id: `${prefix}${i}`,
    onEnd: () => {
      if (!chain) return;
      const wait = Math.max(0, 1400 - (Date.now() - startedAt));
      if (wait) setTimeout(() => playItems(items, prefix, i + 1, true), wait);
      else playItems(items, prefix, i + 1, true);
    },
  });
}

const say = (item: Item) => (item.detail ? `${item.label}. ${item.detail}` : item.label);

/** Shown when the agent gave no icon and no keyword matched: a numbered dot. */
function Badge({ n, size }: { n: number; size: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-extra font-bold text-white"
      style={{ width: size * 0.7, height: size * 0.7, fontSize: size * 0.3 }}
      aria-hidden
    >
      {n}
    </span>
  );
}

function Pic({ item, n, size, on }: { item: Item; n: number; size: number; on: boolean }) {
  return item.icon ? <VisualIcon name={item.icon} size={size} active={on} /> : <Badge n={n} size={size} />;
}

/** Shared look of one tappable item (highlight while it is being said). */
function itemClass(state: "idle" | "active" | "dim", centered = false) {
  const base = `wx-pop flex items-center rounded-2xl border bg-card transition duration-300 ${
    centered ? "flex-col justify-center text-center" : "gap-3 px-3 py-2 text-start"
  }`;
  if (state === "active") return `${base} border-extra ring-2 ring-extra/40 scale-[1.03] shadow-md`;
  if (state === "dim") return `${base} border-stroke opacity-50`;
  return `${base} border-stroke`;
}

function Arrow({ down = false }: { down?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-5 w-5 text-extra ${down ? "" : "rtl:-scale-x-100"}`} aria-hidden>
      <path
        d={down ? "M12 4 v14 M6 12 l6 6 6 -6" : "M4 12 h14 M12 6 l6 6 -6 6"}
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ExtraVisual({ visual, autoPlay = false }: { visual: Visual; autoPlay?: boolean }) {
  const tr = useT();
  const prefix = `vis-${useId().replace(/:/g, "")}-`;
  const items = itemsOf(visual);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeech, getServerSpeech);

  // Which item is being said now comes straight from the voice state (id "vis-…-<n>").
  const speakingId = "id" in speech ? (speech.id ?? "") : "";
  const active = speakingId.startsWith(prefix) ? Number(speakingId.slice(prefix.length)) : -1;
  const playing = active >= 0;

  const playFrom = (i: number, chain: boolean) => playItems(items, prefix, i, chain);

  // Auto-play once, after the spoken answer has finished (never over it).
  const autoDone = useRef(false);
  useEffect(() => {
    if (!autoPlay || autoDone.current || (speech.state !== "idle" && speech.state !== "unavailable")) return;
    autoDone.current = true;
    const t = setTimeout(() => playFrom(0, true), 400);
    return () => clearTimeout(t);
    // playFrom is recreated each render; the guard ref keeps this to one run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, speech.state]);

  // Leaving the chat stops a walkthrough that is still talking.
  const playingRef = useRef(false);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => () => {
    if (playingRef.current) stopSpeaking();
  }, []);

  const stateOf = (i: number): "idle" | "active" | "dim" => (!playing ? "idle" : i === active ? "active" : "dim");
  const tap = (i: number) => playFrom(i, false);
  const delay = (i: number) => ({ animationDelay: `${i * 140}ms` });

  return (
    <figure className="overflow-hidden rounded-2xl border border-stroke bg-bg/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {visual.title ? (
          <figcaption className="text-xs font-bold uppercase tracking-wide text-extra">{visual.title}</figcaption>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => (playing ? stopSpeaking() : playFrom(0, true))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-extra px-3 py-1.5 text-xs font-bold text-white"
        >
          {playing ? (
            <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-current" aria-hidden />
          ) : (
            <span className="inline-block h-0 w-0 border-y-[6px] border-l-[9px] border-y-transparent border-l-current" aria-hidden />
          )}
          {playing ? tr("visual.stop") : tr("visual.play")}
        </button>
      </div>

      <div role="group" aria-label={visualText(visual)} data-kind={visual.kind}>
        {visual.kind === "steps" ? (
          <ol className="flex flex-col items-stretch gap-1">
            {items.map((item, i) => (
              <li key={i} className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => tap(i)} className={`${itemClass(stateOf(i))} w-full`} style={delay(i)}>
                  <Pic item={item} n={i + 1} size={56} on={!playing || i === active} />
                  <span className="min-w-0">
                    <span className="block font-bold text-ink">{item.label}</span>
                    {item.detail ? <span className="block text-xs text-ink-soft">{item.detail}</span> : null}
                  </span>
                </button>
                {i < items.length - 1 ? <Arrow down /> : null}
              </li>
            ))}
          </ol>
        ) : null}

        {visual.kind === "cycle" || visual.kind === "web" ? (
          <Ring
            items={visual.kind === "web" ? items.slice(1) : items}
            center={visual.kind === "web" ? items[0] : null}
            cycle={visual.kind === "cycle"}
            stateOf={(i) => stateOf(visual.kind === "web" ? i + 1 : i)}
            centerState={stateOf(0)}
            onTap={(i) => tap(visual.kind === "web" ? i + 1 : i)}
            onTapCenter={() => tap(0)}
            playing={playing}
            active={visual.kind === "web" ? active - 1 : active}
          />
        ) : null}

        {visual.kind === "compare" ? (
          <div className={`grid gap-2 ${items.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {visual.columns.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tap(i)}
                className={`${itemClass(stateOf(i), true)} gap-1 px-2 py-2`}
                style={delay(i)}
              >
                <Pic item={items[i]} n={i + 1} size={52} on={!playing || i === active} />
                <span className="block font-bold text-ink">{c.label}</span>
                <span className="block space-y-0.5 text-xs text-ink-soft">
                  {c.points.map((p, k) => (
                    <span key={k} className="block">
                      {p}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {visual.kind === "scale" ? <Bars v={visual} items={items} stateOf={stateOf} onTap={tap} playing={playing} active={active} /> : null}
      </div>

      <p className="mt-2 text-[11px] text-ink-soft">{tr("extra.drawnBy")}</p>
    </figure>
  );
}

/* ---------------- cycle / web: items around a circle ---------------- */

function Ring({
  items,
  center,
  cycle,
  stateOf,
  centerState,
  onTap,
  onTapCenter,
  playing,
  active,
}: {
  items: Item[];
  center: Item | null;
  cycle: boolean;
  stateOf: (i: number) => "idle" | "active" | "dim";
  centerState: "idle" | "active" | "dim";
  onTap: (i: number) => void;
  onTapCenter: () => void;
  playing: boolean;
  active: number;
}) {
  const n = items.length;
  const R = center ? 38 : 35; // % of the box
  const pos = (i: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
  };
  return (
    // Geometry is fixed left-to-right (clockwise); labels inside still follow the language.
    <div className="relative mx-auto my-6 aspect-square w-full max-w-[340px]" dir="ltr">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        {cycle ? (
          <>
            <defs>
              <marker id="wx-ring-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill="var(--extra)" />
              </marker>
            </defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--extra)" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" className="wx-ring" />
            {items.map((_, i) => {
              // Small arrow half-way between item i and i+1, pointing clockwise.
              const a = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
              const x = 50 + R * Math.cos(a);
              const y = 50 + R * Math.sin(a);
              const dx = -Math.sin(a);
              const dy = Math.cos(a);
              return (
                <line
                  key={i}
                  x1={x - dx * 2}
                  y1={y - dy * 2}
                  x2={x + dx * 2}
                  y2={y + dy * 2}
                  stroke="var(--extra)"
                  strokeWidth="1.5"
                  markerEnd="url(#wx-ring-arrow)"
                />
              );
            })}
          </>
        ) : (
          items.map((_, i) => {
            const p = pos(i);
            return <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke="var(--extra)" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 2" />;
          })
        )}
      </svg>

      {center ? (
        <button
          type="button"
          onClick={onTapCenter}
          className={`${itemClass(centerState, true)} absolute left-1/2 top-1/2 w-[28%] -translate-x-1/2 -translate-y-1/2 gap-0.5 px-1 py-1.5`}
        >
          <Pic item={center} n={0} size={44} on={!playing || active === -1} />
          <span className="block text-xs font-bold leading-tight text-ink">{center.label}</span>
        </button>
      ) : null}

      {items.map((item, i) => {
        const p = pos(i);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onTap(i)}
            className={`${itemClass(stateOf(i), true)} absolute w-[29%] -translate-x-1/2 -translate-y-1/2 gap-0.5 px-1 py-1.5`}
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 140}ms` }}
          >
            <Pic item={item} n={i + 1} size={38} on={!playing || i === active} />
            <span className="block text-[11px] font-bold leading-tight text-ink" dir="auto">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- scale: bars with a picture per row ---------------- */

function Bars({
  v,
  items,
  stateOf,
  onTap,
  playing,
  active,
}: {
  v: Extract<Visual, { kind: "scale" }>;
  items: Item[];
  stateOf: (i: number) => "idle" | "active" | "dim";
  onTap: (i: number) => void;
  playing: boolean;
  active: number;
}) {
  // Linear on purpose: "the Sun is 109x wider" should LOOK 109x wider. Tiny values keep a stub.
  const max = Math.max(...v.items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-2">
      {v.items.map((row, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onTap(i)}
          className={`${itemClass(stateOf(i))} w-full`}
          style={{ animationDelay: `${i * 140}ms` }}
        >
          <Pic item={items[i]} n={i + 1} size={40} on={!playing || i === active} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-ink">{row.label}</span>
            <span className="mt-1 flex items-center gap-2">
              <span
                className="wx-grow block h-3 rounded-full"
                style={{
                  width: `${Math.max(2, (row.value / max) * 100)}%`,
                  background: i % 2 ? "var(--school)" : "var(--extra)",
                  animationDelay: `${i * 140 + 200}ms`,
                }}
              />
              <span className="shrink-0 text-xs font-semibold text-ink-soft" dir="ltr">
                {items[i].detail}
              </span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
