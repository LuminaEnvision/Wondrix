import { expect, skipSetup, test } from "./fixtures";

const PAGES = ["/", "/school", "/school/practice?skill=measure-length", "/school/radar", "/extra", "/parent"];

test.describe("smoke: every page", () => {
  for (const path of PAGES) {
    test(`${path} renders without errors or horizontal scroll`, async ({ page }) => {
      await skipSetup(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, "horizontal scroll").toBeLessThanOrEqual(1);
    });
  }

  test("API routes answer in local mode", async ({ request }) => {
    const chat = await request.post("/api/extra/chat", { data: { message: "why is the sky blue?" } });
    expect(chat.ok()).toBe(true);
    expect((await chat.json()).source).toBe("local");
    const tts = await request.post("/api/tts", { data: { text: "hello" } });
    expect(tts.status()).toBe(501);
  });
});
