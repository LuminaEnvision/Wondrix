import { describe, expect, it } from "vitest";
import {
  flattenSyllables,
  highlightIndexAtChar,
  highlightIndexAtProgress,
  isArabicReading,
  splitWordSyllables,
  tokenizeForReading,
} from "@/lib/syllables";

describe("splitWordSyllables", () => {
  it("uses kid-friendly splits for common words", () => {
    expect(splitWordSyllables("monkey").join("-").toLowerCase()).toBe("mon-key");
    expect(splitWordSyllables("automated").join("-").toLowerCase()).toBe("au-to-ma-ted");
    expect(splitWordSyllables("Wondrix").join("-")).toBe("Won-drix");
  });

  it("keeps short words whole", () => {
    expect(splitWordSyllables("a")).toEqual(["a"]);
    expect(splitWordSyllables("sky")).toEqual(["sky"]);
  });
});

describe("tokenizeForReading", () => {
  it("keeps punctuation in gaps and flattens syllables", () => {
    const tokens = tokenizeForReading("Why do leaves change colour?");
    expect(tokens.some((t) => t.kind === "gap" && t.raw.includes("?"))).toBe(true);
    expect(flattenSyllables("A leaf spun down.").length).toBeGreaterThan(3);
  });

  it("keeps Arabic words whole for karaoke", () => {
    const line = "مشى ووندريكس في ممر مشمس.";
    expect(isArabicReading(line)).toBe(true);
    const words = tokenizeForReading(line).filter((t) => t.kind === "word");
    expect(words.length).toBeGreaterThanOrEqual(4);
    expect(words.every((w) => w.kind === "word" && w.syllables.length === 1)).toBe(true);
  });

  it("maps progress and char index onto highlight slots", () => {
    const line = "A leaf spun.";
    expect(highlightIndexAtProgress(line, 0)).toBe(0);
    expect(highlightIndexAtProgress(line, 1)).toBe(flattenSyllables(line).length - 1);
    expect(highlightIndexAtChar(line, 0)).toBe(0);
  });
});
