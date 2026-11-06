import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { asLang, languagePromptLine, t } from "@/lib/i18n";
import { ar } from "@/lib/i18n/ar";
import { en } from "@/lib/i18n/en";
import { oneQuestion, splitPlainAnswer } from "@/lib/extra-agent";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("i18n dictionaries", () => {
  it("Arabic has every English key, none empty, same {placeholders}", () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(ar[key], key).toBeTruthy();
      expect(placeholders(ar[key]), key).toEqual(placeholders(en[key]));
    }
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it("Arabic strings are really Arabic (not left in English)", () => {
    for (const [key, value] of Object.entries(ar)) {
      expect(/[؀-ۿ]/.test(value), key).toBe(true);
    }
  });

  it("house style: no em dashes", () => {
    for (const value of [...Object.values(en), ...Object.values(ar)]) expect(value).not.toMatch(/[—–]/);
  });

  it("t() fills placeholders and falls back to English", () => {
    expect(t("school.weekFor", { name: "Sara" })).toBe("This week for Sara");
    expect(t("school.weekFor", { name: "Sara" }, "ar")).toBe("هذا الأسبوع لـ Sara");
    expect(t("extra.send", undefined, "ar")).toBe("أرسل");
    expect(asLang("ar")).toBe("ar");
    expect(asLang("fr")).toBe("en");
    expect(asLang(undefined)).toBe("en");
  });

  it("agents get a language line only for Arabic", () => {
    expect(languagePromptLine("en")).toBe("");
    expect(languagePromptLine("ar")).toMatch(/Arabic/);
  });

  it("follow-up rules work with the Arabic question mark", () => {
    expect(oneQuestion("هل تعرف لماذا؟ وماذا عن القمر؟")).toBe("هل تعرف لماذا؟");
    const split = splitPlainAnswer("السماء زرقاء بسبب الضوء. هل تريد تجربة؟");
    expect(split.followUp).toBe("هل تريد تجربة؟");
  });
});

/** Every visible UI string must come from the dictionaries, so a new screen cannot ship English-only. */
describe("no hardcoded UI text in screens", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".tsx")) files.push(p);
    }
  };
  walk("src/app");
  walk("src/components");
  // Brand name and symbols are the same in every language.
  const allowed = new Set(["Wondrix", "×", "%"]);

  it.each(files)("%s", (file) => {
    const src = readFileSync(file, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    const problems: string[] = [];
    // Text between JSX tags, e.g. <p>Hello there</p>
    for (const m of src.matchAll(/>([^<>{}]*[A-Za-z]{2,}[^<>{}]*)</g)) {
      const text = m[1].trim();
      if (text && !allowed.has(text) && !/[=;()]|=>|&&/.test(text)) problems.push(text);
    }
    // Visible / spoken attributes with literal text
    for (const m of src.matchAll(/\b(aria-label|placeholder|title|alt)="([^"]*[A-Za-z]{2,}[^"]*)"/g)) {
      if (!allowed.has(m[2])) problems.push(`${m[1]}="${m[2]}"`);
    }
    expect(problems).toEqual([]);
  });
});

describe("Extra starters", () => {
  it("every age band has the same number of English and Arabic starters, and visits rotate", async () => {
    const { STARTERS, startersForVisit } = await import("@/lib/starters");
    for (const band of ["young", "middle", "teen"] as const) {
      expect(STARTERS[band].ar.length, band).toBe(STARTERS[band].en.length);
      for (const q of STARTERS[band].ar) expect(/[؀-ۿ]/.test(q)).toBe(true);
      for (const q of [...STARTERS[band].en, ...STARTERS[band].ar]) expect(q).not.toMatch(/[—–]/);
      expect(startersForVisit(band, "en", 0)[0]).not.toBe(startersForVisit(band, "en", 1)[0]);
    }
    expect(startersForVisit("young", "en", 0)).not.toEqual(startersForVisit("middle", "en", 0));
  });
});
