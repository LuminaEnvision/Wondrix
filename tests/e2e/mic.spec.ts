import { expect, skipSetup, test } from "./fixtures";

// Chromium's fake microphone plays a tone, so the live meter has real input.
test.use({
  permissions: ["microphone"],
  launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
});

/**
 * Fake Web Speech recognition: interim words, then a final phrase, and one
 * spontaneous "end" (like Chrome after a pause) to prove we keep listening.
 */
async function fakeRecognition(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__recStarts = 0;
    class FakeRecognition {
      lang = "en-US";
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onstart: (() => void) | null = null;
      start() {
        (w.__recStarts as number)++;
        const first = w.__recStarts === 1;
        const emit = (transcript: string, isFinal: boolean) =>
          this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { length: 1, isFinal, 0: { transcript } } } });
        if (first) {
          setTimeout(() => emit("how do plants", false), 300);
          setTimeout(() => emit("how do plants drink water", true), 700);
          // Browser ends on its own after a pause; the app must restart, not send.
          setTimeout(() => this.onend?.(), 1200);
        }
      }
      stop() {
        setTimeout(() => this.onend?.(), 50);
      }
      abort() {}
    }
    w.webkitSpeechRecognition = FakeRecognition;
    w.SpeechRecognition = FakeRecognition;
  });
}

test.describe("tap-to-talk mic", () => {
  test.beforeEach(async ({ page }) => {
    await skipSetup(page);
    await fakeRecognition(page);
  });

  test("one tap starts; live words + meter; keeps listening through a pause; Done sends", async ({ page }) => {
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click();
    await page.getByRole("button", { name: "Ask with your voice" }).click();

    const panel = page.getByRole("region", { name: "Voice question recording" });
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Listening…")).toBeVisible();
    await expect(page.getByTestId("dictation-text")).toContainText("how do plants drink water");

    // The fake mic tone moves the meter above its resting height.
    await expect
      .poll(async () =>
        page.getByTestId("mic-meter").locator("span").evaluateAll((bars) =>
          bars.some((b) => parseFloat((b as HTMLElement).style.height) > 10),
        ),
      )
      .toBe(true);

    // After the browser's own "end", we restarted and are still listening (nothing sent).
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as unknown as { __recStarts: number }).__recStarts)).toBeGreaterThanOrEqual(2);
    await expect(panel).toBeVisible();
    await expect(page.locator(".ms-auto.bg-extra", { hasText: "how do plants drink water" })).toHaveCount(0);

    await panel.getByRole("button", { name: /Done, send my question/ }).click();
    await expect(panel).toHaveCount(0);
    await expect(page.locator(".ms-auto.bg-extra", { hasText: "how do plants drink water" })).toBeVisible();
    await expect(page.getByText(/Roots drink water from the soil/)).toBeVisible();
  });

  test("Cancel discards the recording", async ({ page }) => {
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click();
    await page.getByRole("button", { name: "Ask with your voice" }).click();
    await expect(page.getByTestId("dictation-text")).toContainText("how do plants");
    await page.getByRole("button", { name: /Cancel/ }).click();
    await expect(page.getByRole("region", { name: "Voice question recording" })).toHaveCount(0);
    await expect(page.locator(".ms-auto.bg-extra")).toHaveCount(0);
  });
});
