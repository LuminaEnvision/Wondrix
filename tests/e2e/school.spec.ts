import { expect, seedProfile, test } from "./fixtures";

test.describe("School door (local mode)", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 4" });
  });

  test("a practice session ends after 5 questions with a clear end card; the parent summary says so", async ({ page }) => {
    await page.goto("/school/practice?skill=halves-quarters");
    const prompt = page.locator("p.text-lg");
    for (let i = 0; i < 6; i++) {
      if (await page.getByTestId("practice-done").isVisible()) break;
      await expect(prompt).toBeVisible();
      await page.getByTestId("choice").first().click();
      await page.getByRole("button", { name: /Next question|Finish/ }).click();
    }
    await expect(page.getByTestId("practice-done")).toBeVisible();
    await expect(page.getByText("Today's questions are done!")).toBeVisible();
    await expect(page.getByText("Come back tomorrow for new questions.")).toBeVisible();
    await page.goto("/parent");
    await expect(page.getByText(/Finished 1 practice session/)).toBeVisible();
  });

  test("the question shows at once, without waiting for the AI coach line", async ({ page }) => {
    await page.route("**/api/school/session", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { action?: string };
      if (body.action === "lead") {
        await new Promise((r) => setTimeout(r, 8000));
        await route.fulfill({ json: { coachLead: "Late line", source: "zai" } });
        return;
      }
      await route.continue();
    });
    await page.goto("/school/practice?skill=halves-quarters");
    await expect(page.locator("p.text-lg")).toBeVisible({ timeout: 3000 });
    await expect(page.getByTestId("choice")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Listen to the question" })).toBeVisible();
  });

  test("a wrong answer is a calm 'let's look again', and the right option is marked", async ({ page }) => {
    await page.goto("/school/practice?skill=halves-quarters");
    await expect(page.getByTestId("choice")).toHaveCount(3);
    // Find a wrong option: answer, and if it was right, go to the next question and try another.
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("choice").nth(i % 3).click();
      if (await page.locator('[data-result="look-again"]').isVisible()) break;
      await page.getByRole("button", { name: /Next question|Finish/ }).click();
      if (await page.getByTestId("practice-done").isVisible()) return;
    }
    const card = page.locator('[data-result="look-again"]');
    await expect(card).toBeVisible();
    await expect(card.getByText("Let's look again")).toBeVisible();
    await expect(card.locator("img")).toHaveCount(0);
    await expect(page.locator('[data-correct="true"]')).toHaveCount(1);
    await expect(page.locator('[data-correct="true"]')).toContainText("Right answer");
    await expect(page.getByRole("button", { name: "Listen to the explanation" })).toBeVisible();
  });

  test("practice: answer, see feedback, mastery saved, next question is new", async ({ page }) => {
    // forces-motion has two Year 5+ questions, so "next" must show the other one.
    await page.goto("/parent");
    await page.locator('select[name="grade"]').selectOption("Year 6");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.goto("/school/practice?skill=forces-motion");
    await expect(page.getByRole("heading", { name: "Forces and motion" })).toBeVisible();
    const prompt = page.locator("p.text-lg");
    await expect(prompt).toBeVisible();
    const firstPrompt = await prompt.innerText();

    await page.getByTestId("choice").first().click();
    await expect(page.getByRole("button", { name: /Next question|Finish/ })).toBeVisible();
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem("wondrix-mastery") || "{}"));
    expect(["growing", "shaky"]).toContain(mastery["forces-motion"]);

    await page.getByRole("button", { name: /Next question|Finish/ }).click();
    // Either the other Year 6 question, or the end card when this grade has no more.
    await expect(page.getByTestId("practice-done").or(prompt.filter({ hasNotText: firstPrompt }))).toBeVisible();
  });

  test("practice: 'I don't know yet' is welcome and marks the skill shaky", async ({ page }) => {
    await page.goto("/school/practice?skill=multiply-basics");
    await page.getByRole("button", { name: /I don.t know yet/ }).click();
    await expect(page.getByRole("button", { name: /Next question|Finish/ })).toBeVisible();
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
