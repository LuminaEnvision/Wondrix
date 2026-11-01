import { expect, seedProfile, test } from "./fixtures";

test.describe("School door (local mode)", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 4" });
  });

  test("practice: a skill with one question ends kindly instead of a dead end", async ({ page }) => {
    await page.goto("/school/practice?skill=halves-quarters");
    await page.getByRole("button", { name: "One quarter" }).click();
    await page.getByRole("button", { name: "Next question" }).click();
    await expect(page.getByText(/all the practice for this skill today/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to this week" })).toBeVisible();
  });

  test("practice: answer, see feedback, mastery saved, next question is new", async ({ page }) => {
    // forces-motion has two Year 5+ questions, so "next" must show the other one.
    await page.goto("/parent");
    await page.locator("select").first().selectOption("Year 6");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.goto("/school/practice?skill=forces-motion");
    await expect(page.getByRole("heading", { name: "Forces and motion" })).toBeVisible();
    const prompt = page.locator("p.text-lg");
    await expect(prompt).toBeVisible();
    const firstPrompt = await prompt.innerText();

    await page.locator("main button").first().click();
    await expect(page.getByRole("button", { name: "Next question" })).toBeVisible();
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem("wondrix-mastery") || "{}"));
    expect(["growing", "shaky"]).toContain(mastery["forces-motion"]);

    await page.getByRole("button", { name: "Next question" }).click();
    await expect(prompt).not.toHaveText(firstPrompt);
  });

  test("practice: 'I don't know yet' is welcome and marks the skill shaky", async ({ page }) => {
    await page.goto("/school/practice?skill=multiply-basics");
    await page.getByRole("button", { name: /I don.t know yet/ }).click();
    await expect(page.getByRole("button", { name: "Next question" })).toBeVisible();
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem("wondrix-mastery") || "{}"));
    expect(mastery["multiply-basics"]).toBe("shaky");
  });

  test("radar: 'I don't know' on every item finishes and lists shaky skills", async ({ page }) => {
    await page.goto("/school/radar");
    await expect(page.getByText("Short checks for Year 4.")).toBeVisible();
    for (let i = 0; i < 5; i++) {
      const idk = page.getByRole("button", { name: /I don.t know yet/ });
      if (!(await idk.isVisible())) break;
      await idk.click();
    }
    await expect(page.getByText("Radar complete")).toBeVisible();
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem("wondrix-mastery") || "{}"));
    expect(Object.values(mastery).every((m) => m === "shaky")).toBe(true);
    expect(Object.keys(mastery).length).toBeGreaterThan(0);
  });

  test("school home shows a coach note and Start links for this grade", async ({ page }) => {
    await page.goto("/school");
    await expect(page.getByText(/^Today: /)).toBeVisible();
    await expect(page.getByRole("link", { name: "Start" }).first()).toHaveAttribute("href", /\/school\/practice\?skill=/);
  });
});
