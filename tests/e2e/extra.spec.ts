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

  test("unsafe question: gentle redirect; parent sees a count, never the question", async ({ page }) => {
    await page.goto("/extra");
    await page.getByPlaceholder("Ask anything curious…").fill("how can I hurt my brother");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/isn't something I can explore here/)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("wondrix-extra-topic"))).toBeNull();

    await page.goto("/parent");
    await expect(page.getByText(/gently redirected 1 question/)).toBeVisible();
    await expect(page.getByText(/hurt my brother/)).toHaveCount(0);
    await expect(page.getByText(/Extra: not opened today/)).toBeVisible();
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

test.describe("voice controls", () => {
  test.beforeEach(async ({ page }) => {
    await skipSetup(page);
  });

  test("Listen → Speaking (bars + Stop) → Stop returns to Listen", async ({ page }) => {
    // Fake browser voice: starts quickly, "talks" for 3s unless cancelled.
    await page.addInitScript(() => {
      const timers: number[] = [];
      const fake = {
        getVoices: () => [{ name: "Google US English", lang: "en-US" }],
        addEventListener: () => {},
        cancel: () => timers.splice(0).forEach((t) => clearTimeout(t)),
        speak: (u: { onstart?: () => void; onend?: () => void }) => {
          timers.push(window.setTimeout(() => u.onstart?.(), 100));
          timers.push(window.setTimeout(() => u.onend?.(), 3000));
        },
      };
      Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    });
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click(); // no auto-speak; test the manual button
    await page.getByPlaceholder("Ask anything curious…").fill("why are wheels round?");
    await page.getByRole("button", { name: "Send" }).click();
    const listen = page.getByRole("button", { name: "Listen to this answer" });
    await expect(listen).toBeVisible();
    await listen.click();
    await expect(page.getByText("Speaking", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Stop reading" }).click();
    await expect(page.getByText("Speaking", { exact: true })).toHaveCount(0);
    await expect(listen).toBeVisible();
  });

  test("no voice on the device → clear message instead of silence", async ({ page }) => {
    // Linux browser without speech-dispatcher: API exists, nothing ever starts.
    await page.addInitScript(() => {
      const fake = { getVoices: () => [], addEventListener: () => {}, cancel: () => {}, speak: () => {} };
      Object.defineProperty(window, "speechSynthesis", { value: fake, configurable: true });
    });
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click();
    await page.getByPlaceholder("Ask anything curious…").fill("why are wheels round?");
    await page.getByRole("button", { name: "Send" }).click();
    await page.getByRole("button", { name: "Listen to this answer" }).click();
    await expect(page.getByText("Preparing voice…")).toBeVisible();
    await expect(page.getByText(/No sound available on this device/)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("conversation memory + chat history", () => {
  test.beforeEach(async ({ page }) => {
    await skipSetup(page);
  });

  test("history is sent with each message, survives a reload, and New chat starts fresh", async ({ page }) => {
    const histories: number[] = [];
    await page.route("**/api/extra/chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { message: string; history: unknown[] };
      histories.push(body.history.length);
      await route.fulfill({
        json: { text: `Reply to: ${body.message}. Want to know more?`, answer: `Reply to: ${body.message}.`, topic: "Sky", source: "zai" },
      });
    });
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click();
    const ask = async (q: string) => {
      await page.getByPlaceholder("Ask anything curious…").fill(q);
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByText(`Reply to: ${q}.`, { exact: false })).toBeVisible();
    };
    await ask("why is the sky blue?");
    await ask("yes");
    expect(histories).toEqual([0, 2]);

    await page.reload();
    await expect(page.getByText("Reply to: yes.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Voice answers on" }).click();
    await ask("what about sunsets?");
    expect(histories).toEqual([0, 2, 4]);

    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByText("Reply to: yes.", { exact: false })).toHaveCount(0);
    await ask("hello again");
    expect(histories.at(-1)).toBe(0);
  });

  test("Past chats: an old chat can be reopened and continued with its context; Parent can clear history", async ({ page }) => {
    const histories: number[] = [];
    await page.route("**/api/extra/chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}") as { message: string; history: unknown[] };
      histories.push(body.history.length);
      await route.fulfill({ json: { text: `Reply to: ${body.message}.`, answer: `Reply to: ${body.message}.`, topic: "t", source: "zai" } });
    });
    await page.goto("/extra");
    await page.getByRole("button", { name: "Voice answers on" }).click();
    const ask = async (q: string) => {
      await page.getByPlaceholder("Ask anything curious…").fill(q);
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByText(`Reply to: ${q}.`, { exact: false })).toBeVisible();
    };
    await ask("how do volcanoes erupt?");
    await page.getByRole("button", { name: "New chat" }).click();
    await ask("why do cats purr?");

    // Both chats are listed, newest first; the open one is marked.
    await page.getByRole("button", { name: "Past chats" }).click();
    const panel = page.getByRole("region", { name: "Past chats" });
    await expect(panel.getByText("why do cats purr?")).toBeVisible();
    await expect(panel.getByText("open now")).toBeVisible();
    await panel.getByText("how do volcanoes erupt?").click();

    // Reopened with its messages; the next question carries that chat's context.
    await expect(page.getByText("Reply to: how do volcanoes erupt?.")).toBeVisible();
    await expect(page.getByText("Reply to: why do cats purr?.")).toHaveCount(0);
    await ask("and lava?");
    expect(histories.at(-1)).toBe(2);

    // Parent can see and clear the history.
    await page.goto("/parent");
    await expect(page.getByText(/2 chats saved on this device/)).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Clear chat history" }).click();
    await expect(page.getByText("No chats saved on this device.")).toBeVisible();
    await page.goto("/extra");
    await page.getByRole("button", { name: "Past chats" }).click();
    await expect(page.getByText("No saved chats yet.", { exact: false })).toBeVisible();
  });
});
