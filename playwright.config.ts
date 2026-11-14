import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the production build in LOCAL mode (no AI keys), so
 * results are deterministic. Live AI is covered by unit/API tests with a
 * fake provider, and by the opt-in eval script.
 *
 * Run: npm run build && npm run test:e2e
 */
const PORT = Number(process.env.E2E_PORT || 3199);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Force local mode: no provider keys reach the server.
    // Many tests hit the API from one machine: lift the per-device rate limit.
    env: { ZAI_API_KEY: "", OPENAI_API_KEY: "", OPENROUTER_API_KEY: "", AZURE_SPEECH_KEY: "", AI_RATE_LIMIT_PER_MIN: "10000" },
  },
});
