import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixture:
 * - blocks the Kokoro model download (huggingface.co) so tests are fast and offline
 * - collects page errors; every test fails if the page threw
 * - helper to skip the first-run setup gate
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
  page: async ({ page }, use) => {
    await page.route(/huggingface\.co/, (route) => route.abort());
    await use(page);
  },
});

export { expect };

/** Mark first-run setup as done (no PIN) before the app loads. */
export async function skipSetup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("wondrix-setup", "complete"));
}

/** Seed a saved profile before the app loads (first load only, so later saves stick). */
export async function seedProfile(page: Page, profile: Record<string, unknown>) {
  await page.addInitScript((p) => {
    localStorage.setItem("wondrix-setup", "complete");
    if (localStorage.getItem("wondrix-profile")) return;
    localStorage.setItem(
      "wondrix-profile",
      JSON.stringify({
        childNickname: "Sara",
        ageBand: "young",
        gradeLabel: "Year 3",
        subjects: ["math", "science"],
        oneLiner: "",
        calmMode: false,
        ...p,
      }),
    );
  }, profile);
}
