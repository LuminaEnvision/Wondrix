# Wondrix tests

| Layer | Tool | Where | What it covers | Needs a key? |
|-------|------|-------|----------------|--------------|
| Unit | Vitest | `tests/unit/` | Safety gate, visual specs, grades/skills/radar bank, mastery, local School plan, local Extra replies, AI client (provider choice, JSON parsing, 429 retry, queue), Extra + School agents (prompts and output validation) | No (AI is faked at `fetch`) |
| API | Vitest | `tests/api/` | Route handlers: `/api/extra/chat`, `/api/extra/visual`, `/api/school/session`, `/api/tts` | No |
| End-to-end | Playwright | `tests/e2e/` | Real app in Chromium (phone + desktop): setup gate, PIN lock, grade change, School practice and radar, Extra answers, diagrams, voice bubble, every page without errors or horizontal scroll | No (local mode; the AI flow is mocked at the network) |

| Live eval | `scripts/eval-agents.mjs` | `npm run eval` | ~27 real calls to the running app with the real model, scored against the canvas rules; report in `eval-results/` | **Yes** (server needs `ZAI_API_KEY`) |

## Run

```bash
npm run check         # everything, with a summary (see the root README for --quick / --eval)
npm test              # unit + API (~1s)
npm run build && npm run test:e2e   # end-to-end (~25s)
npm run test:all      # lint + typecheck + unit/API + build + e2e
```

The first `test:e2e` on a new machine may need `npx playwright install chromium`.

## Conventions

- Tests never call a real AI provider. `tests/helpers/fake-ai.ts` replaces `fetch` and sets env with `vi.stubEnv` (reset after each test).
- E2E runs the production build with empty keys, so results are deterministic. Kokoro's model download is blocked in tests; the voice bubble tests delay it on purpose.
- Every E2E test fails if the page throws (`tests/e2e/fixtures.ts`).

## Old CPUs ("Illegal instruction" on `npm test`)

Vitest uses Rollup, whose native binary needs a newer CPU. On older machines, swap in the WebAssembly build **locally** (does not change `package.json` or the lockfile; redo it after `npm ci`):

```bash
npm install --no-save rollup@npm:@rollup/wasm-node@4.67.3
```

The first `npm run test:e2e` on a new machine needs `npx playwright install chromium`.
