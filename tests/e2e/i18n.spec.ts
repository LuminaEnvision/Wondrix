import { expect, seedProfile, test } from "./fixtures";

test.describe("language switch (English / Arabic)", () => {
  test("setup gate offers the language; Arabic turns the app right-to-left", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await page.getByRole("radio", { name: "العربية" }).click();
    await expect(page.getByRole("heading", { name: "أهلًا بك في ووندريكس" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await page.getByRole("button", { name: "تخطَّ الآن، دعني أستكشف" }).click();
    await expect(page.getByRole("heading", { name: "المدرسة" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "استكشاف" })).toBeVisible();
    // Remembered after a reload.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("Parent switches to Arabic at once; Extra asks the agent in Arabic and back to English works", async ({ page }) => {
    await seedProfile(page, {});
    const languages: unknown[] = [];
    await page.route("**/api/extra/chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { profile?: { language?: string } };
      languages.push(body.profile?.language);
      await route.fulfill({ json: { text: "السماء زرقاء بسبب الضوء. هل تريد تجربة؟", answer: "x", topic: "السماء", source: "zai" } });
    });

    await page.goto("/parent");
    await page.getByRole("radio", { name: "العربية" }).click();
    await expect(page.getByRole("heading", { name: "إعدادات المنزل" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    await page.goto("/extra");
    await page.getByRole("button", { name: "الإجابات الصوتية تعمل" }).click();
    await page.getByRole("textbox", { name: "سؤالك لووندريكس" }).fill("لماذا السماء زرقاء؟");
    await page.getByRole("button", { name: "اسأل البومة" }).click();
    await expect(page.getByText("هل تريد تجربة؟", { exact: false })).toBeVisible();
    expect(languages).toEqual(["ar"]);

    await page.goto("/parent");
    await page.getByRole("radio", { name: "English" }).click();
    await expect(page.getByRole("heading", { name: "Home controls" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  });
});
