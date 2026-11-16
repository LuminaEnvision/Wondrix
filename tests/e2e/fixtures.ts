import { test as base, expect, type Page } from "@playwright/test";

/**
 * Shared fixture:
 * - blocks the Kokoro model download (huggingface.co) so tests are fast and offline
 * - collects page errors; every test fails if the page threw
 * - helpers for family setup / profile seed
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

/** Lightweight PIN hash matching src/lib/parent-auth.ts */
function hashPin(pin: string): string {
  let h = 0;
  const salted = `wondrix:${pin}`;
  for (let i = 0; i < salted.length; i++) h = (h * 31 + salted.charCodeAt(i)) >>> 0;
  return `h${h.toString(16)}`;
}

/** Mark family setup done (PIN + one child) before the app loads. */
export async function skipSetup(page: Page) {
  await page.addInitScript(
    ({ hashed }) => {
      localStorage.setItem("wondrix-setup", "complete");
      localStorage.setItem("wondrix-parent-pin", hashed);
      const id = "kid-e2e";
      if (!localStorage.getItem("wondrix-household")) {
        localStorage.setItem(
          "wondrix-household",
          JSON.stringify({
            children: [
              {
                id,
                childNickname: "Alex",
                age: "8",
                ageBand: "young",
                ageMode: "explorer",
                gradeLabel: "Year 3",
                curriculum: "uk",
                subjects: ["math", "science"],
                oneLiner: "",
                unitNote: "",
                textbookPhotos: [],
                calmMode: false,
              },
            ],
            activeChildId: id,
          }),
        );
      }
    },
    { hashed: hashPin("1234") },
  );
}

/** Seed a saved child before the app loads (first load only, so later saves stick). */
export async function seedProfile(page: Page, profile: Record<string, unknown>) {
  await page.addInitScript(
    ({ p, hashed }) => {
      localStorage.setItem("wondrix-setup", "complete");
      if (!localStorage.getItem("wondrix-parent-pin")) {
        localStorage.setItem("wondrix-parent-pin", hashed);
      }
      sessionStorage.setItem("wondrix-parent-unlocked", "1");
      if (localStorage.getItem("wondrix-household")) return;
      const id = "kid-seed";
      localStorage.setItem(
        "wondrix-household",
        JSON.stringify({
          children: [
            {
              id,
              childNickname: "Sara",
              age: "8",
              ageBand: "young",
              ageMode: "explorer",
              gradeLabel: "Year 3",
              curriculum: "uk",
              subjects: ["math", "science"],
              oneLiner: "",
              unitNote: "",
              textbookPhotos: [],
              calmMode: false,
              ...p,
            },
          ],
          activeChildId: id,
        }),
      );
    },
    { p: profile, hashed: hashPin("1234") },
  );
}

/** Complete the pass-to-parent handoff from a protected action overlay. */
export async function completeHandoff(
  page: Page,
  opts?: { pin?: string; name?: string; age?: string },
) {
  const pin = opts?.pin ?? "1234";
  await expect(page.getByRole("heading", { name: "Pass the phone to a parent" })).toBeVisible();
  await page.getByRole("button", { name: /I am the parent/ }).click();
  const pins = page.locator('input[type="password"]');
  await pins.nth(0).fill(pin);
  await pins.nth(1).fill(pin);
  await page.getByRole("button", { name: "Save password" }).click();
  await page.getByLabel("Child nickname").fill(opts?.name ?? "Alex");
  await page.getByPlaceholder("e.g. 8").fill(opts?.age ?? "8");
  await page.getByRole("button", { name: "Save and continue" }).click();
}
