import { expect, seedProfile, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await seedProfile(page, {});
});

test("a failed server voice request can be retried; Reading speed reaches the audio", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/tts", async (route) => {
    calls++;
    if (calls === 1) return route.abort("failed");
    await route.fulfill({ status: 200, contentType: "audio/mpeg", body: "fake audio" });
  });
  await page.addInitScript(() => {
    const capture = window as unknown as { serverAudioRates: number[] };
    capture.serverAudioRates = [];
    HTMLMediaElement.prototype.play = function () {
      if (this.src.startsWith("blob:")) capture.serverAudioRates.push(this.playbackRate);
      return Promise.resolve();
    };
  });
  await page.goto("/school/reading");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => calls).toBe(1);
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  // First attempt falls back to the fake browser voice, which ends normally.
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.locator('input[type="range"]').fill("0.75");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => calls).toBe(2);
  await expect.poll(() => page.evaluate(() => (window as unknown as { serverAudioRates: number[] }).serverAudioRates)).toEqual([0.75]);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("pausing while audio is preparing prevents late playback", async ({ page }) => {
  let requested = false;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/tts", async (route) => {
    requested = true;
    await gate;
    await route.fulfill({ status: 200, contentType: "audio/mpeg", body: "late audio" }).catch(() => {});
  });
  await page.addInitScript(() => {
    const capture = window as unknown as { serverAudioStarts: number };
    capture.serverAudioStarts = 0;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.startsWith("blob:")) capture.serverAudioStarts++;
      return Promise.resolve();
    };
  });
  await page.goto("/school/reading");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  release();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await page.waitForTimeout(300); // Allow the deliberately late response to be processed.
  expect(await page.evaluate(() => (window as unknown as { serverAudioStarts: number }).serverAudioStarts)).toBe(0);
});


test("Reading returns to Play if the audio never fires its end event", async ({ page }) => {
  await page.route("**/api/tts", (route) => route.fulfill({
    status: 200, contentType: "audio/mpeg", body: "fake audio",
  }));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
  });
  await page.goto("/school/reading");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible({ timeout: 10000 });
});
