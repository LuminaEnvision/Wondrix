import { dismissAgePick, expect, seedProfile, test } from "./fixtures";

test.describe("language switch (English / Arabic)", () => {
  test("home language icon switches Arabic and remembers after reload", async ({ page }) => {
    await page.goto("/");
    await dismissAgePick(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.getByRole("button", { name: /Switch language to العربية/ }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: "المدرسة" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "استكشاف" })).toBeVisible();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("header language switch reaches Extra chat; English switch works", async ({ page }) => {
    await seedProfile(page, {});
    const languages: unknown[] = [];
    await page.route("**/api/extra/chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { profile?: { language?: string } };
      languages.push(body.profile?.language);
      await route.fulfill({
        json: { text: "السماء زرقاء بسبب الضوء. هل تريد تجربة؟", answer: "x", topic: "السماء", source: "zai" },
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: /Switch language to العربية/ }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.goto("/extra");
    await page.getByRole("button", { name: "الإجابات الصوتية تعمل" }).click();
    await page.getByRole("textbox", { name: "سؤالك لووندريكس" }).fill("لماذا السماء زرقاء؟");
    await page.getByRole("button", { name: "أرسل" }).click();
    await expect(page.getByText("هل تريد تجربة؟", { exact: false })).toBeVisible();
    expect(languages).toEqual(["ar"]);

    await page.goto("/");
    await page.getByRole("button", { name: /Switch language to English|بدّل اللغة إلى English/ }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});
