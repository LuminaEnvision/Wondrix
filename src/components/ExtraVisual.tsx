"use client";

import { useId } from "react";
import { visualText, type Visual } from "@/lib/visual";

/**
 * Draws an agent "visual spec" as an on-brand SVG diagram.
 * All text comes from validated JSON and is rendered as SVG text nodes
 * (React escapes it), never as markup from the model.
 */

const W = 340;
const FONT = 13;
const LINE = 16;

/** Greedy word wrap for SVG text. */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function Lines({
  lines,
  x,
  y,
  anchor = "start",
  weight = 600,
  size = FONT,
  fill = "var(--ink)",
}: {
  lines: string[];
  x: number;
  y: number;
  anchor?: "start" | "middle" | "end";
  weight?: number;
  size?: number;
  fill?: string;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size + 3}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

function ArrowDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--extra)" />
      </marker>
    </defs>
  );
}

/* ---------------- steps: vertical flow ---------------- */

function Steps({ v, arrow }: { v: Extract<Visual, { kind: "steps" }>; arrow: string }) {
  const blocks: { i: number; label: string[]; note: string[]; h: number; top: number }[] = [];
  let y = 8;
  for (let i = 0; i < v.items.length; i++) {
    const item = v.items[i];
    const label = wrap(item.label, 28);
    const note = item.note ? wrap(item.note, 36) : [];
    const h = 18 + label.length * LINE + note.length * (LINE - 2);
    blocks.push({ i, label, note, h, top: y });
    y += h + 22;
  }
  const height = y - 14;
  return (
    <svg viewBox={`0 0 ${W} ${height}`}>
      <ArrowDefs id={arrow} />
      {blocks.map(({ i, label, note, h, top }) => (
        <g key={i}>
          <rect x={16} y={top} width={W - 32} height={h} rx={14} fill="var(--card)" stroke="var(--stroke)" />
          <circle cx={40} cy={top + h / 2} r={13} fill="var(--extra)" />
          <text x={40} y={top + h / 2 + 4.5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
            {i + 1}
          </text>
          <Lines lines={label} x={64} y={top + 22} weight={700} />
          {note.length ? (
            <Lines lines={note} x={64} y={top + 22 + label.length * LINE} weight={400} size={12} fill="var(--ink-soft)" />
          ) : null}
          {i < blocks.length - 1 ? (
            <line x1={W / 2} y1={top + h + 3} x2={W / 2} y2={top + h + 19} stroke="var(--extra)" strokeWidth={2.5} markerEnd={`url(#${arrow})`} />
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/* ---------------- cycle: nodes on a ring ---------------- */

function Cycle({ v, arrow }: { v: Extract<Visual, { kind: "cycle" }>; arrow: string }) {
  const n = v.items.length;
  const cx = W / 2;
  const cy = 170;
  const r = 118;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const gap = Math.min(0.42, Math.PI / n - 0.12);
  const point = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  return (
    <svg viewBox={`0 0 ${W} 340`}>
      <ArrowDefs id={arrow} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-deep)" strokeWidth={10} />
      {v.items.map((_, i) => {
        const [x1, y1] = point(angle(i) + gap);
        const [x2, y2] = point(angle(i + 1) - gap);
        return (
          <path
            key={`a${i}`}
            d={`M${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2}`}
            fill="none"
            stroke="var(--extra)"
            strokeWidth={2.5}
            markerEnd={`url(#${arrow})`}
          />
        );
      })}
      {v.items.map((item, i) => {
        const [x, y] = point(angle(i));
        const lines = wrap(item.label, 13);
        const h = 12 + lines.length * LINE;
        return (
          <g key={i}>
            <rect x={x - 54} y={y - h / 2} width={108} height={h} rx={12} fill="var(--card)" stroke="var(--extra)" strokeWidth={1.5} />
            <Lines lines={lines} x={x} y={y - h / 2 + 19} anchor="middle" weight={700} size={12} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- compare: side-by-side columns ---------------- */

const COLUMN_COLORS = ["var(--extra)", "var(--school)", "var(--brand)"];

function Compare({ v }: { v: Extract<Visual, { kind: "compare" }> }) {
  const n = v.columns.length;
  const gap = 10;
  const colW = (W - 24 - gap * (n - 1)) / n;
  const chars = n === 2 ? 20 : 12;
  const cols = v.columns.map((c) => ({
    head: wrap(c.label, chars - 2),
    pts: c.points.map((p) => wrap(p, chars)),
  }));
  const headH = Math.max(...cols.map((c) => c.head.length)) * LINE + 14;
  // Precompute the y of each point (stacked under the header).
  const pointTops = cols.map((c) => {
    const tops: number[] = [];
    let y = 8 + headH + 20;
    for (const p of c.pts) {
      tops.push(y);
      y += p.length * (LINE - 1) + 8;
    }
    return tops;
  });
  const bodyH = Math.max(...cols.map((c) => c.pts.reduce((s, p) => s + p.length * (LINE - 1) + 8, 0))) + 12;
  const height = 8 + headH + bodyH + 8;
  return (
    <svg viewBox={`0 0 ${W} ${height}`}>
      {cols.map((c, i) => {
        const x = 12 + i * (colW + gap);
        return (
          <g key={i}>
            <rect x={x} y={8} width={colW} height={headH + bodyH} rx={14} fill="var(--card)" stroke="var(--stroke)" />
            <rect x={x} y={8} width={colW} height={headH} rx={14} fill={COLUMN_COLORS[i]} />
            <rect x={x} y={8 + headH - 14} width={colW} height={14} fill={COLUMN_COLORS[i]} />
            <Lines lines={c.head} x={x + colW / 2} y={8 + 21} anchor="middle" weight={700} fill="#fff" />
            {c.pts.map((p, j) => {
              const top = pointTops[i][j];
              return (
                <g key={j}>
                  <circle cx={x + 11} cy={top - 4} r={3} fill={COLUMN_COLORS[i]} />
                  <Lines lines={p} x={x + 20} y={top} weight={500} size={12} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- scale: horizontal bars ---------------- */

function Scale({ v }: { v: Extract<Visual, { kind: "scale" }> }) {
  // Linear on purpose: "the Sun is 109x wider" should LOOK 109x wider.
  // Tiny values keep a 3px stub and their number label.
  const max = Math.max(...v.items.map((i) => i.value));
  const scale = (x: number) => x / max;
  const labelW = 104;
  const barMax = W - labelW - 8 - 84; // leave room for the value label
  const rowH = 34;
  const height = 10 + v.items.length * rowH;
  const fmt = (x: number) =>
    x >= 10000
      ? new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(x)
      : x >= 1000
        ? x.toLocaleString("en-US", { maximumFractionDigits: 0 })
        : `${+x.toFixed(2)}`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`}>
      {v.items.map((item, i) => {
        const y = 10 + i * rowH;
        const w = Math.max(3, scale(item.value) * barMax);
        const lines = wrap(item.label, 14);
        return (
          <g key={i}>
            <Lines lines={lines} x={labelW} y={y + (lines.length > 1 ? 11 : 18)} anchor="end" weight={600} size={12} />
            <rect x={labelW + 8} y={y + 5} width={w} height={18} rx={9} fill={i % 2 ? "var(--school)" : "var(--extra)"} />
            <text x={labelW + 14 + w} y={y + 18} fontSize={11.5} fontWeight={600} fill="var(--ink-soft)">
              {fmt(item.value)}
              {v.unit ? ` ${v.unit}` : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- web: parts around a center ---------------- */

function Web({ v }: { v: Extract<Visual, { kind: "web" }> }) {
  const cx = W / 2;
  const cy = 150;
  const n = v.items.length;
  const center = wrap(v.center, 11);
  return (
    <svg viewBox={`0 0 ${W} 300`}>
      {v.items.map((_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return (
          <line key={`l${i}`} x1={cx} y1={cy} x2={cx + 112 * Math.cos(a)} y2={cy + 112 * Math.sin(a)} stroke="var(--extra)" strokeWidth={2} strokeDasharray="4 4" />
        );
      })}
      <circle cx={cx} cy={cy} r={46} fill="var(--extra)" />
      <Lines lines={center} x={cx} y={cy + 5 - ((center.length - 1) * 16) / 2} anchor="middle" weight={700} fill="#fff" />
      {v.items.map((item, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const x = cx + 112 * Math.cos(a);
        const y = cy + 112 * Math.sin(a);
        const lines = wrap(item.label, 12);
        const h = 12 + lines.length * LINE;
        const bx = Math.min(Math.max(x - 50, 4), W - 104);
        return (
          <g key={i}>
            <rect x={bx} y={y - h / 2} width={100} height={h} rx={12} fill="var(--card)" stroke="var(--extra)" strokeWidth={1.5} />
            <Lines lines={lines} x={bx + 50} y={y - h / 2 + 19} anchor="middle" weight={700} size={12} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------- wrapper ---------------- */

export function ExtraVisual({ visual }: { visual: Visual }) {
  const arrow = `arrow-${useId().replace(/:/g, "")}`;
  const label = visualText(visual);
  return (
    <figure className="overflow-hidden rounded-2xl border border-stroke bg-bg/60 p-3">
      {visual.title ? (
        <figcaption className="mb-2 text-xs font-bold uppercase tracking-wide text-extra">{visual.title}</figcaption>
      ) : null}
      <div role="img" aria-label={label} className="w-full [&>svg]:h-auto [&>svg]:w-full">
        {visual.kind === "steps" ? <Steps v={visual} arrow={arrow} /> : null}
        {visual.kind === "cycle" ? <Cycle v={visual} arrow={arrow} /> : null}
        {visual.kind === "compare" ? <Compare v={visual} /> : null}
        {visual.kind === "scale" ? <Scale v={visual} /> : null}
        {visual.kind === "web" ? <Web v={visual} /> : null}
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">Drawn by Wondrix for your question</p>
    </figure>
  );
}
