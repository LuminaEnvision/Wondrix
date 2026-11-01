## Live AI agents for School + Extra, natural voice, on-the-spot visuals, tests

Jorge's track from the project board: wire and tune live AI for `/api/extra/chat` and `/api/school/session` to the canvas agent loop, keep the local fallback, add on-the-spot visuals in Extra, and fix the robotic voice. Tested on a laptop in Chrome: AI answers, diagrams, mic and voice all work. Full what/how/why per commit: [`docs/DEV_CHANGELOG.md`](docs/DEV_CHANGELOG.md). Short summary: `CHANGELOG.md` → `[Unreleased]`.

### What's in it

**AI agents (canvas loop)**
- `src/lib/ai.ts`: one server-side client for any OpenAI-compatible API.
  - **Z.ai is the default** (`ZAI_API_KEY`, free `glm-4.5-flash`, thinking off). OpenAI is optional.
  - Timeouts, tolerant JSON parsing, `[ai]` logs with latency and tokens.
  - A request queue (1 at a time on the free tier) and one retry on HTTP 429.
  - Every failure falls back to the local banks, so **the app still works with no key**.
- **Extra agent:**
  - The prompt adapts to age band (7–9 / 10–13 / 14–17), grade, picked interest and calm mode.
  - It answers first, then asks **exactly one** follow-up.
  - It returns a topic label that goes into the parent summary.
- **It remembers the conversation for the visit:** the last 12 turns go to the model, "yes" or "why?" continues its last question, and the chat survives a reload (`sessionStorage`). A **New chat** button starts fresh.
- **School agent:**
  - It reads the child's state: mastery, teacher note and Extra topic.
  - It picks today's focus **only from grade-allowed skills**, and gives a reason for each pick. Reasons show under each skill and are logged (`[agent] school.plan …`).
  - Lead-ins and explanations get the real question and answer. **The AI never grades**: correctness comes from the bank.
- Mastery now moves one step per answer.

**Safety**
- The keyword gate matches harmful intent: harm to a person, weapons, self-harm, dangerous home "experiments" like bleach + ammonia. Normal science passes ("white blood cells kill germs").
- AI check on the child's input and the agent's output: the agent's own `unsafe` flag plus a small classifier on Z.ai, or OpenAI moderation.
- The generic offline reply never echoes an unknown question.
- The parent summary shows only a **count** of redirected questions, never their text.

**On-the-spot visuals (no stock art)**
- The agent decides when a diagram helps and returns a small JSON spec: steps, cycle, compare, scale or parts. Our own SVG components draw it. **The model never writes markup.**
- Two steps (text first, then "drawing…"), so chat stays fast.
- Four local answers include hand-made diagrams for the offline demo.

**Voice out**
- **Kokoro 82M runs in the browser** (Web Worker; WebGPU, with WASM fallback): free, no key, audio stays on the device.
- A loading bubble explains the one-time ~80 MB download, so the app never looks frozen.
- **Visible voice state on every answer:** ▶ **Listen** → **Preparing voice…** → **Speaking** (animated equalizer bars) with **■ Stop**, and "No sound available on this device" when nothing can play.
- Slow devices: if Kokoro's first sentence takes more than 8s, the browser voice takes over. The browser voice is improved: best installed voice, one utterance per sentence. `[voice]` console logs show which engine played.
- `/api/tts` is ready for Azure Speech (option for the demo, off by default; see `.env.example`).

**Voice in (tap-to-talk mic for kids)**
- One tap starts recording: a **live volume meter**, the **words so far** and a timer show it is listening.
- **It never sends on silence**, so a child can pause to think. After ~8s of quiet it says "I'm still listening. Take your time, then tap Done."
- Big **✓ Done, send my question** and **✕ Cancel** buttons.

**Quality**
- Fixed all 8 existing ESLint errors (React 19 hooks rules) with no behaviour change.
- Practice no longer dead-ends when a skill has only one question.
- `next.config.ts`: dev-only instant-navigation validation limited to opted-in segments, which removes the per-page dev errors.

### Tests

| | Result |
|---|---|
| Unit + API (Vitest, AI faked) | **152/152** |
| End-to-end (Playwright, phone + desktop, local mode) | **56/56** |
| Live agent eval (`npm run eval`, real `glm-4.5-flash`) | **26/27 cases, 99% of checks** |
| Lint / typecheck / build | clean |

- Also checked: no flaky tests (e2e run twice); planted bugs are caught.
- CI workflow: `.github/workflows/ci.yml`.
- **One command runs everything:** `npm run check`, with a summary; `--quick` and `--eval` options. It also handles old CPUs and the first Playwright install.

### How to try

```bash
npm ci
cp .env.example .env.local   # add ZAI_API_KEY (free at z.ai); leave empty for local mode
npm run dev                  # on slower machines: npm run build && npm start
npm run check                # lint + typecheck + tests + build + e2e
```

Walk-through: Parent (grade, teacher note) → School (agent focus with reasons, practice, radar) → Extra (ask "how does rain happen?": answer, then a diagram; natural-voice bubble) → Parent summary.

### Known limits
- Free-tier Z.ai latency spikes (10–15s) sometimes send a reply to the local fallback. `glm-4.7-flash` was faster but hit the rate limit far more often.
- The question bank has only 1–2 items per skill. More items, or AI-generated practice, would make practice richer.
- The natural voice needs a recent CPU (very slow without AVX; the browser voice takes over) and ~80 MB of storage. The mic needs Chrome (Brave blocks Google speech), and HTTPS when not on localhost. Check both on the demo device.
- `/api/extra/visual` trusts the answer text sent by the client. Fine for the prototype; look it up server-side in production.
- Supabase persistence and parent push/email are not part of this PR (separate tasks).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01F2PRuePjGjQJbbaoSg2nLF
