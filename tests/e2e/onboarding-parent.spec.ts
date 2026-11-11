import { expect, seedProfile, test } from "./fixtures";

test.describe("first run + parent controls", () => {
  test("first visit shows the setup gate; skipping opens the two doors", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome to Wondrix" })).toBeVisible();
    await page.getByRole("button", { name: /Skip for now/ }).click();
    await expect(page.getByRole("heading", { name: "School" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wonder" })).toBeVisible();
    // The decision is remembered.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Welcome to Wondrix" })).toHaveCount(0);
  });

  test("setup gate validates the PIN", async ({ page }) => {
    await page.goto("/");
    const pins = page.locator('input[type="password"]');
    await pins.nth(0).fill("12");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Use a 4-digit number.")).toBeVisible();
    await pins.nth(0).fill("1234");
    await pins.nth(1).fill("9999");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("heading", { name: "Welcome to Wondrix" })).toBeVisible();
  });

  test("PIN locks Parent in a new session; wrong PIN is refused", async ({ page, context }) => {
    await page.goto("/");
    const pins = page.locator('input[type="password"]');
    await pins.nth(0).fill("1234");
    await pins.nth(1).fill("1234");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("heading", { name: "School" })).toBeVisible();

    // sessionStorage is per tab: a new tab must unlock again.
    const tab = await context.newPage();
    await tab.route(/huggingface\.co/, (r) => r.abort());
    await tab.goto("/parent");
    await expect(tab.getByRole("heading", { name: "Parent password" })).toBeVisible();
    await tab.locator('input[type="password"]').fill("0000");
    await tab.getByRole("button", { name: "Unlock" }).click();
    await expect(tab.getByText("That password is not right.")).toBeVisible();
    await tab.locator('input[type="password"]').fill("1234");
    await tab.getByRole("button", { name: "Unlock" }).click();
    await expect(tab.getByRole("heading", { name: "Home controls" })).toBeVisible();
  });

  test("changing grade in Parent changes School focus and the radar", async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 3" });
    await page.goto("/school");
    await expect(page.getByText("Year 3 ·")).toBeVisible();
    const y3Focus = await page.getByRole("link", { name: "Start" }).evaluateAll((els) =>
      els.map((e) => e.getAttribute("href")),
    );

    await page.goto("/parent");
    await page.locator('select[name="grade"]').selectOption("Year 10");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Saved\. Open School/)).toBeVisible();
    await expect(page.getByText(/Sara \(Year 10\) practiced:/)).toBeVisible();

    await page.goto("/school");
    await expect(page.getByText("Year 10 ·")).toBeVisible();
    const y10Focus = await page.getByRole("link", { name: "Start" }).evaluateAll((els) =>
      els.map((e) => e.getAttribute("href")),
    );
    expect(y10Focus).not.toEqual(y3Focus);

    await page.goto("/school/radar");
    await expect(page.getByText("Short checks for Year 10.")).toBeVisible();
  });

  test("choosing the American curriculum shows US grade names everywhere", async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 4" });
    await page.goto("/parent");
    await page.locator('select[name="curriculum"]').selectOption("us");
    // Grade options are renamed (same internal level).
    await expect(page.locator('select[name="grade"] option:checked')).toHaveText(/^Grade 3 \(age 8–9\)/);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/Saved\. Open School to see new focus skills for Grade 3\./)).toBeVisible();
    await expect(page.getByText(/Sara \(Grade 3\) practiced:/)).toBeVisible();

    await page.goto("/school");
    await expect(page.getByText("Grade 3 ·")).toBeVisible();
    await page.goto("/school/radar");
    await expect(page.getByText("Short checks for Grade 3.")).toBeVisible();
  });

  test("calm mode shows a single focus skill", async ({ page }) => {
    await seedProfile(page, { calmMode: true });
    await page.goto("/school");
    await expect(page.getByRole("link", { name: "Start" })).toHaveCount(1);
  });
});
