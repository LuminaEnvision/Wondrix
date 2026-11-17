import {
  completeHandoff,
  dismissAgePick,
  expect,
  seedProfile,
  test,
  unlockParentGate,
} from "./fixtures";

test.describe("first run + parent controls", () => {
  test("hero home is free; first School action opens pass-to-parent", async ({ page }) => {
    await page.goto("/");
    await dismissAgePick(page);
    await expect(page.getByRole("heading", { name: "School" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Wonder" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Welcome to Wondrix" })).toHaveCount(0);

    await page.getByRole("button", { name: /Open School|School/ }).first().click();
    await expect(page.getByRole("heading", { name: "Pass the phone to a parent" })).toBeVisible();
    await completeHandoff(page);
    await expect(page).toHaveURL(/\/parent/);
    await unlockParentGate(page);
    await expect(page.getByRole("heading", { name: "Parent Dashboard" })).toBeVisible();
  });

  test("handoff validates the PIN", async ({ page }) => {
    await page.goto("/");
    await dismissAgePick(page);
    await page.getByRole("button", { name: /Open School/ }).click();
    await page.getByRole("button", { name: /I am the parent/ }).click();
    const pins = page.locator('input[type="password"]');
    await pins.nth(0).fill("12");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Use a 4-digit number.")).toBeVisible();
    await pins.nth(0).fill("1234");
    await pins.nth(1).fill("9999");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Those numbers do not match.")).toBeVisible();
  });

  test("PIN locks Parent in a new session; wrong PIN is refused", async ({ page, context }) => {
    await page.goto("/");
    await dismissAgePick(page);
    await page.getByRole("button", { name: /Open School/ }).click();
    await completeHandoff(page, { pin: "1234" });
    await expect(page).toHaveURL(/\/parent/);
    await expect(page.getByRole("heading", { name: "Parent password" })).toBeVisible();
    await unlockParentGate(page, "1234");
    await expect(page.getByRole("heading", { name: "Parent Dashboard" })).toBeVisible();

    const tab = await context.newPage();
    await tab.route(/huggingface\.co/, (r) => r.abort());
    await tab.goto("/parent");
    await expect(tab.getByRole("heading", { name: "Parent password" })).toBeVisible();
    await tab.locator('input[type="password"]').fill("0000");
    await tab.getByRole("button", { name: "Unlock" }).click();
    await expect(tab.getByText("That password is not right.")).toBeVisible();
    await tab.locator('input[type="password"]').fill("1234");
    await tab.getByRole("button", { name: "Unlock" }).click();
    await expect(tab.getByRole("heading", { name: "Parent Dashboard" })).toBeVisible();
  });

  test("changing grade in Parent changes School focus and the radar", async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 3", age: "7" });
    await page.goto("/school");
    await expect(page.getByText("Year 3", { exact: true })).toBeVisible();

    await page.goto("/parent");
    await unlockParentGate(page);
    await page.getByRole("button", { name: /Sara/ }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator('select[name="grade"]').selectOption("Year 10");
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText(/Saved\..*Year 10/)).toBeVisible();

    await page.goto("/school");
    await expect(page.getByText(/Year 10/)).toBeVisible();
    await expect(page.getByText("Year 3", { exact: true })).toHaveCount(0);

    await page.goto("/school/radar");
    await expect(page.getByText("Short checks for Year 10.")).toBeVisible();
  });

  test("choosing the American curriculum shows US grade names everywhere", async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 4", age: "8" });
    await page.goto("/parent");
    await unlockParentGate(page);
    await page.getByRole("button", { name: /Sara/ }).click();
    await page.getByRole("button", { name: "Edit" }).click();
    await page.locator('select[name="curriculum"]').selectOption("us");
    await expect(page.locator('select[name="grade"] option:checked')).toHaveText(/^Grade 3 \(age 8–9\)/);
    await page.getByRole("button", { name: "Save", exact: true }).first().click();
    await expect(page.getByText(/Saved\..*Grade 3/)).toBeVisible();

    await page.goto("/school");
    await expect(page.getByText(/Grade 3/)).toBeVisible();
    await page.goto("/school/radar");
    await expect(page.getByText("Short checks for Grade 3.")).toBeVisible();
  });

  test("calm mode shows a single focus skill", async ({ page }) => {
    await seedProfile(page, { calmMode: true });
    await page.goto("/school");
    await expect(page.getByRole("link", { name: "Start" })).toHaveCount(1);
  });

  test("website landing is public and linked from Parent", async ({ page }) => {
    await seedProfile(page, {});
    await page.goto("/website");
    await expect(page.getByRole("heading", { name: /learning friend/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Try now" })).toBeVisible();

    await page.goto("/parent");
    await unlockParentGate(page);
    await expect(page.getByRole("link", { name: "Website" })).toHaveAttribute("href", "/website");
    await expect(page.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");

    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Use" })).toBeVisible();
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  });
});
