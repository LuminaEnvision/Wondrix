import { describe, expect, it } from "vitest";
import { flattenSyllables, splitWordSyllables, tokenizeForReading } from "@/lib/syllables";

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
});
