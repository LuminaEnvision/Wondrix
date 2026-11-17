import { childStorage, expect, seedProfile, test, unlockParentGate } from "./fixtures";

test("switching children keeps Wonder topics and clearing history isolated", async ({ page }) => {
  await seedProfile(page, {});
  await page.goto("/parent");
  await unlockParentGate(page);
  // Seed two distinct histories, then exercise the actual Parent switch and clear actions.
  await page.evaluate(() => {
    const household = JSON.parse(localStorage.getItem("wondrix-household")!);
    const first = household.children[0];
    household.children.push({ ...first, id: "kid-second", childNickname: "Omar" });
    localStorage.setItem("wondrix-household", JSON.stringify(household));
    for (const [id, topic] of [[first.id, "Rain"], ["kid-second", "Robots"]]) {
      localStorage.setItem(`wondrix-extra-topic:${id}`, topic);
      localStorage.setItem(`wondrix-extra-chats:${id}`, JSON.stringify([{
        id: `chat-${id}`, title: topic, createdAt: Date.now(), updatedAt: Date.now(), lang: "en",
        messages: [{ id: 1, role: "child", text: topic }],
      }]));
    }
  });
  await page.reload();
  await unlockParentGate(page);
  await page.getByRole("button", { name: /Sara/ }).click();
  await expect(page.getByText("Rain", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 chat saved on this device/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear chat history" }).click();
  await expect(page.getByText("No chats saved on this device.")).toBeVisible();
  await page.getByRole("button", { name: "All children" }).click();
  await page.getByRole("button", { name: /Omar/ }).click();
  await expect(page.getByText("Robots", { exact: true })).toBeVisible();
  await expect(page.getByText(/1 chat saved on this device/)).toBeVisible();
  expect(await childStorage(page, "wondrix-extra-topic")).toBe("Robots");
});
