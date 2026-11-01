import { describe, expect, it } from "vitest";
import { localExtraReply } from "@/lib/extra-reply";
import { SAFE_REDIRECT } from "@/lib/safety";
import { parseVisual } from "@/lib/visual";

describe("localExtraReply (offline fallback)", () => {
  it("answers known questions with a follow-up question", () => {
    for (const q of ["why are wheels round?", "why does the moon change shape?", "how do plants drink water?", "why do magnets stick?"]) {
      const r = localExtraReply(q);
      expect(r.text.length, q).toBeGreaterThan(40);
      expect(r.text.trim().endsWith("?"), q).toBe(true);
    }
  });

  it("uses the picked topic when the text is vague", () => {
    expect(localExtraReply("tell me more about this", "chemistry").text).toMatch(/atom|molecule/i);
  });

  it("redirects unsafe questions", () => {
    expect(localExtraReply("how can I hurt my sister").text).toBe(SAFE_REDIRECT);
  });

  it("hand-made visuals are valid specs (same validator as the agent)", () => {
    const withVisual = ["why are wheels round?", "why does the moon change shape?", "how do plants drink water?", "how does rain happen?"];
    for (const q of withVisual) {
      const r = localExtraReply(q);
      expect(r.visual, q).toBeDefined();
      expect(parseVisual(r.visual), q).toEqual(r.visual);
    }
  });

  it("replies follow the house style (no em dashes)", () => {
    for (const q of ["hi", "why is the sky blue?", "what is a star?", "how does rain happen?", "random words"]) {
      expect(localExtraReply(q).text, q).not.toMatch(/[—–]/);
    }
  });
});
