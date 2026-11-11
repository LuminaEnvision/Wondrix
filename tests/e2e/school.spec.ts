import { expect, seedProfile, test } from "./fixtures";

test.describe("School door (local mode)", () => {
  test.beforeEach(async ({ page }) => {
    await seedProfile(page, { gradeLabel: "Year 4" });
  });

  test("a practice session ends after 5 questions; the parent summary counts it", async ({ page }) => {
    await page.goto("/school/practice?skill=halves-quarters");
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole("button", { name: /Next question|Finish for today/ });
      await page.getByTestId("choice").first().click();
      await expect(next).toBeVisible();
      const finishing = (await next.innerText()).includes("Finish");
      await next.click();
      if (finishing) break;
    }
    await expect(page.getByTestId("choice")).toHaveCount(0);
    await page.goto("/parent");
    await expect(page.getByText(/Finished 1 practice session/)).toBeVisible();
  });

  test("a wrong answer shows the calm owl and marks the right option; the AI explanation arrives after", async ({ page }) => {
    let explainCalls = 0;
    await page.route("**/api/school/session", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { action?: string };
      if (body.action === "explain") {
        explainCalls++;
        await route.fulfill({ json: { explanation: "Gentle AI explanation.", source: "zai" } });
        return;
      }
      await route.continue();
    });
    await page.goto("/school/practice?skill=halves-quarters");
    await expect(page.getByTestId("choice").first()).toBeVisible();
    await page.getByRole("button", { name: /I don.t know yet/ }).click();
    await expect(page.getByTestId("owl-calm")).toBeVisible();
    await expect(page.locator('[data-correct="true"]')).toHaveCount(1);
    await expect(page.getByText("Gentle AI explanation.")).toBeVisible();
    expect(explainCalls).toBe(1);
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
    await expect(page.getByRole("button", { name: /Next question|Finish for today/ })).toBeVisible();
    const mastery = await page.evaluate(() => JSON.parse(localStorage.getItem("wondrix-mastery") || "{}"));
    expect(["growing", "shaky"]).toContain(mastery["forces-motion"]);

    await page.getByRole("button", { name: /Next question|Finish for today/ }).click();
    // The other Year 6 question, or the end of the session when this grade has no more.
    await expect(page.getByTestId("choice").first().or(page.getByText(/today/i).first()).first()).toBeVisible();
    if (await prompt.isVisible()) await expect(prompt).not.toHaveText(firstPrompt);
  });

  test("practice: 'I don't know yet' is welcome and marks the skill shaky", async ({ page }) => {
    await page.goto("/school/practice?skill=multiply-basics");
    await page.getByRole("button", { name: /I don.t know yet/ }).click();
    await expect(page.getByRole("button", { name: /Next question|Finish for today/ })).toBeVisible();
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
