import { describe, expect, it } from "vitest";
import { isShortReply, localExtraReply } from "@/lib/extra-reply";
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

describe("generic fallback", () => {
  it("never echoes an unknown question back or promises to explore it", () => {
    const q = "zxq unknown thing about something odd";
    const r = localExtraReply(q);
    expect(r.text).not.toContain(q);
    expect(r.text).not.toMatch(/explore that with you/i);
    expect(r.text.trim().endsWith("?")).toBe(true);
  });
});

describe("social turns work offline too", () => {
  it("knows its name, says good night without keeping the child talking, helps when stuck", () => {
    expect(localExtraReply("what is your name?").text).toMatch(/I'm Wondrix/);
    const night = localExtraReply("it's time to sleep, bye", null, true);
    expect(night.text).toMatch(/Good night/);
    expect(night.text).not.toMatch(/\?/);
    expect(localExtraReply("ok bye", null, true).text).not.toMatch(/\?/);
    expect(localExtraReply("I don't know what to ask").suggestions).toHaveLength(3);
  });
});

describe("mid-conversation fallback (live agent unavailable)", () => {
  it("short replies are recognised", () => {
    for (const t of ["yes", "Yeah!", "no", "ok", "why?", "tell me more", "the roots"]) expect(isShortReply(t), t).toBe(true);
    expect(isShortReply("why do magnets stick to the fridge?")).toBe(false);
  });

  it("a short reply mid-chat keeps the thread instead of jumping topics", () => {
    const r = localExtraReply("yes", null, true);
    expect(r.text).toMatch(/keeping our chat going/);
  });

  it("a short reply with no earlier chat still gets the normal reply", () => {
    expect(localExtraReply("yes", null, false).text).not.toMatch(/keeping our chat going/);
  });

  it("safety still comes first mid-chat", () => {
    expect(localExtraReply("how can I hurt my sister", null, true).text).toBe(SAFE_REDIRECT);
  });
});
