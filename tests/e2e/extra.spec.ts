import { expect, skipSetup, test } from "./fixtures";

test.describe("Extra door", () => {
  test.beforeEach(async ({ page }) => {
    await skipSetup(page);
  });

  test("local answer with a hand-made diagram", async ({ page }) => {
    await page.goto("/extra");
    await page.getByPlaceholder("Ask anything curious…").fill("why does the moon change shape?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/The Moon doesn't really change shape/)).toBeVisible();
    const figure = page.locator("figure");
    await expect(figure).toBeVisible();
    await expect(figure.getByText("Moon phases in a month")).toBeVisible();
    await expect(figure.locator('div[role="img"]')).toHaveAttribute("aria-label", /New moon/);
  });

  test("topic link prefills the starter; picking another topic switches it", async ({ page }) => {
    await page.goto("/extra?topic=sky");
    await expect(page.getByPlaceholder("Ask anything curious…")).toHaveValue("Why does the Moon change shape?");
    await page.getByRole("button", { name: /Living things/ }).click();
    await expect(page).toHaveURL(/topic=life/);
    await expect(page.getByPlaceholder("Ask anything curious…")).toHaveValue("How do plants drink water?");
  });

  test("unsafe question gets the gentle redirect", async ({ page }) => {
    await page.goto("/extra");
    await page.getByPlaceholder("Ask anything curious…").fill("how can I hurt my brother");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/isn't something I can explore here/)).toBeVisible();
  });

  test("live flow (mocked agent): text first, then 'drawing', then the diagram", async ({ page }) => {
    await page.route("**/api/extra/chat", (route) =>
      route.fulfill({
        json: {
          text: "Rain comes from clouds. What do you see before it rains?",
          answer: "Rain comes from clouds.",
          followUp: "What do you see before it rains?",
          topic: "Rain",
          draw: true,
          source: "zai",
        },
      }),
    );
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    await page.route("**/api/extra/visual", async (route) => {
      await gate;
      await route.fulfill({
        json: {
          visual: {
            kind: "cycle",
            title: "Water cycle",
            items: [{ label: "Evaporation" }, { label: "Clouds" }, { label: "Rain" }],
          },
        },
      });
    });

    await page.goto("/extra");
    await page.getByPlaceholder("Ask anything curious…").fill("how does rain happen?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Rain comes from clouds.", { exact: false })).toBeVisible();
    await expect(page.getByText("Wondrix is drawing it for you…")).toBeVisible();
    release();
    await expect(page.locator("figure").getByText("Water cycle")).toBeVisible();
    await expect(page.getByText("Wondrix is drawing it for you…")).toHaveCount(0);
    // Topic label from the agent goes to the parent summary.
    expect(await page.evaluate(() => localStorage.getItem("wondrix-extra-topic"))).toBe("Rain");
  });

  test("voice bubble explains a slow first download, then the fallback", async ({ page }) => {
    await page.unroute(/huggingface\.co/);
    await page.route(/huggingface\.co/, async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.abort();
    });
    await page.goto("/extra");
    await expect(page.getByText("Getting Wondrix's voice ready…")).toBeVisible();
    await expect(page.getByText(/First time only/)).toBeVisible();
    await expect(page.getByText("Natural voice not available here")).toBeVisible({ timeout: 10_000 });
  });

  test("turning voice off hides the voice bubble", async ({ page }) => {
    await page.unroute(/huggingface\.co/);
    await page.route(/huggingface\.co/, async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.abort();
    });
    await page.goto("/extra");
    await expect(page.getByText("Getting Wondrix's voice ready…")).toBeVisible();
    await page.getByRole("button", { name: "Voice answers on" }).click();
    await expect(page.getByText("Getting Wondrix's voice ready…")).toHaveCount(0);
  });
});
