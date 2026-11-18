import { afterEach, describe, expect, it, vi } from "vitest";

describe("currentLang", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("prefers wondrix-language over profile.language for TTS", async () => {
    const store: Record<string, string> = {
      "wondrix-language": "ar",
      "wondrix-profile": JSON.stringify({ language: "en" }),
    };
    vi.stubGlobal("window", { localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    }});
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    });

    const { currentLang } = await import("@/lib/i18n");
    expect(currentLang()).toBe("ar");
  });
});
