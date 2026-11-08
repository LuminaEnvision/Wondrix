#!/usr/bin/env node
/**
 * One comparison table from the newest eval run of each model (eval-results/*.json
 * written with EVAL_LABEL by scripts/eval-models.sh). With OPENROUTER_API_KEY set,
 * prices come from OpenRouter's model list.
 *
 * Cost per 100 Extra turns uses Wondrix's real average: about 2,400 input and
 * 220 output tokens per turn (chat + diagram share; the safety check is free
 * when OpenAI moderation is on).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "eval-results");
const runs = new Map();
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json") && !x.startsWith("comparison")).sort()) {
  const data = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
  if (data.label) runs.set(data.label, data); // newest wins (files sort by timestamp)
}
if (!runs.size) {
  console.error("No labelled runs. Use scripts/eval-models.sh first.");
  process.exit(1);
}

let prices = {};
if (process.env.OPENROUTER_API_KEY) {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    });
    const list = (await res.json()).data ?? [];
    prices = Object.fromEntries(
      list.map((m) => [m.id, { in: Number(m.pricing?.prompt) * 1e6, out: Number(m.pricing?.completion) * 1e6 }]),
    );
  } catch {
    // table without prices
  }
}

const groupScore = (r, g) => {
  const rows = r.results.filter((x) => x.group === g);
  const ok = rows.reduce((s, x) => s + x.passed, 0);
  const all = rows.reduce((s, x) => s + x.total, 0);
  return all ? `${Math.round((ok / all) * 100)}%` : "-";
};
const safetyMiss = (r) =>
  r.results.filter((x) => (x.group === "safety" || x.name.includes("أؤذي")) && x.passed < x.total).length;
const fallbacks = (r) =>
  r.results.filter((x) => ["extra", "draw", "social", "arabic"].includes(x.group) && x.response?.source === "local").length;

const lines = [
  "| Model | All checks | Extra | Social | Arabic | Draw | Safety misses | School | Fallbacks | p50 ms | p95 ms | $/1M in / out | $ per 100 turns |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
];
for (const [label, r] of runs) {
  const p = prices[label];
  const cost = p ? ((2400 * p.in + 220 * p.out) / 1e6) * 100 : null;
  lines.push(
    [
      label,
      `${Math.round((r.checkPass / r.checks) * 100)}%`,
      groupScore(r, "extra"),
      groupScore(r, "social"),
      groupScore(r, "arabic"),
      groupScore(r, "draw"),
      safetyMiss(r),
      groupScore(r, "school"),
      fallbacks(r),
      r.p50,
      r.p95,
      p ? `${p.in.toFixed(2)} / ${p.out.toFixed(2)}` : "-",
      cost === null ? "-" : `$${cost.toFixed(3)}`,
    ]
      .join(" | ")
      .replace(/^/, "| ")
      .concat(" |"),
  );
}
const md = ["# Wondrix model comparison", "", `Generated ${new Date().toISOString()}`, "", ...lines, ""].join("\n");
writeFileSync(path.join(dir, "comparison.md"), md);
console.log(md);
