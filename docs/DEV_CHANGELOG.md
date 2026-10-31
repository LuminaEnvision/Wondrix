# Wondrix: development log (Jorge's track)

Detailed log of each change on Jorge's track: **what** changed, **how** it was done, and **why**.
Updated after every commit. The short summary for the release stays in [`CHANGELOG.md`](../CHANGELOG.md).

- Fork: `j-c-fstk-dev/Wondrix` · Upstream: `LuminaEnvision/Wondrix` (main)
- Working branch: `claude/ecstatic-wright-shau5s`
- Plan source: [`docs/PROJECT_CANVAS.md`](./PROJECT_CANVAS.md)

---

## Execution plan and status

| Stage | Goal | Status |
|-------|------|--------|
| 0 | Sync the fork, run the app, walk School → Extra → Parent | ✅ Done (fork in sync, build OK) |
| 1 | Shared AI layer (`src/lib/ai.ts`) with timeout, logging, local fallback | ✅ Done, `8cda327` |
| 2 | Extra agent tuned to the canvas loop + moderation | ✅ Done, `8cda327` (needs a live-key test) |
| 3 | School agent: real question context, AI explains but never grades, logged focus decisions | ⏳ Next |
| 4 | Less robotic voice: better browser voice pick + `/api/tts` (OpenAI TTS) with fallback | ⏳ Planned |
| 5 | On-the-spot visuals in Extra (agent-drawn SVG, no stock art) | ⏳ Later |
| 6 | QA: prompt eval script, fix the 8 existing lint errors, PR to upstream | ⏳ Planned |

Out of Jorge's track (owned by the project lead): Supabase persistence, parent push/email summary.

### Blockers

- **Live AI test:** the cloud dev environment needs `OPENAI_API_KEY` set in its environment settings and `api.openai.com` allowed in Network access. Until then, AI paths are tested against a local mock server.

---

## Log

Newest entries first.

### Add this development log (`docs/DEV_CHANGELOG.md`)

**What:** Created this file with the plan/status table and a detailed entry for every change so far.

**How:** One Markdown file in `docs/`, next to the canvas. Each entry has the commit, what, how, why and how it was tested.

**Why:** The repo is shared between two people during the hackathon. `CHANGELOG.md` is short and meant for the release. This file keeps the reasons behind each decision, so either person can pick up the work, and the judges can see how the agent was built.

---

### `8cda327`: Shared AI client + Extra agent tuned to the canvas loop

**Files**

| File | Change |
|------|--------|
| `src/lib/ai.ts` | **New.** Single server-side OpenAI client |
| `src/lib/extra-agent.ts` | **New.** Extra agent prompt builder + output validation |
| `src/app/api/extra/chat/route.ts` | Rewritten to use the agent, moderation and local fallback |
| `src/app/extra/page.tsx` | Sends the parent profile; saves the agent's topic label |
| `src/lib/safety.ts` | Redirect text exported as `SAFE_REDIRECT`; no em dash |
| `.env.example` | Documents optional `OPENAI_BASE_URL` |
| `CHANGELOG.md` | `[Unreleased]` summary |

**What and how**

1. **Shared AI client (`src/lib/ai.ts`)**
   - `chatText()` and `chatJSON()` wrap `POST /v1/chat/completions`. `chatJSON` uses `response_format: json_object` and parses the result.
   - Each call has an **8s timeout** (`AbortSignal.timeout`).
   - Each call logs one line, e.g. `[ai] extra.chat ok 820ms` or `[ai] extra.chat fail 8001ms · TimeoutError`.
   - Every failure (no key, HTTP error, timeout, bad JSON) returns `null`. The route then uses the local banks.
   - `isFlagged()` calls `POST /v1/moderations` (`omni-moderation-latest`, 4s timeout). It returns `true`/`false`, or `null` when moderation is unavailable.
   - `cleanKidText()` applies the house style: em and en dashes become commas, and markdown marks and wrapping quotes are removed.
   - `OPENAI_BASE_URL` can point the client at a proxy or a mock server.
2. **Extra agent (`src/lib/extra-agent.ts`)**
   - The system prompt is built from the profile:
     - age band: meadow 7–9 = very simple words, 2–3 sentences; journal 10–13 = name the real idea once; studio 14–17 = precise terms + "why it matters"
     - grade label
     - picked interest (physics, robots, astronomy, living things, chemistry)
     - calm mode: shorter, gentler, follow-up optional in tone
   - Canvas rule "answer once, then gently follow up": the answer always comes first, then exactly **one** follow-up question. If the child answers the previous follow-up, the agent reacts to their idea first.
   - Output is JSON `{ answer, followUp, topic }`. It is checked (missing answer → `null` → local fallback) and cleaned. `topic` is a 2–5 word label for the parent day summary.
   - Prompt guardrails: no personal data requests, no image promises, no markdown or emojis, and steer unsafe topics to safe science.
   - The last 8 turns of history are sent; the child's message is capped at 500 characters.
3. **Route flow (`/api/extra/chat`)**
   1. Keyword gate (always on, works offline).
   2. With a key: moderation on the child's message runs **in parallel** with the agent call, so it adds no wait.
   3. The agent reply goes through moderation before the child sees it.
   4. Otherwise: `localExtraReply` (`source: "local"`).
   - The response keeps `text` (the UI did not need to change shape) and adds `answer`, `followUp`, `topic` and `source`.
4. **Frontend:** `/extra` sends `profile: loadProfile()` and stores `data.topic` with `saveExtraTopic`.

**Why**

- The old routes had no timeout and failed silently, and each one had its own copy of the `fetch` to OpenAI. One client means one place to change the model or provider, add retries, or add logging for the canvas "logged decisions".
- The old Extra prompt was fixed to "ages 7-12" and ignored the profile. The canvas has three age skins and a calm mode, so the agent now follows the same profile as the UI.
- The canvas loop step 1 says "read state". Sending the profile is the first piece of that; School state comes in stage 3.
- The parent summary used to show the first 40 characters of the child's question. The agent's topic label reads better.
- Safety was input-only keywords. For a societal agent for kids, the **agent's own output** must be checked too. The keyword list is **not** used on output, because it would block innocent science ("white blood cells kill germs").
- The local fallback is kept on purpose. The demo must work without a key or network.

**Tested**

- `tsc --noEmit` and ESLint pass on the new and changed files. `next build` passes.
- No key → local answer (`source: "local"`).
- Invalid key → error logged → local answer.
- Mock OpenAI server (`OPENAI_BASE_URL=http://localhost:4999`):
  - the teen + calm mode prompt reaches the model
  - the JSON reply is shown and the em dash is cleaned (`source: "openai"`)
  - flagged agent output → safe redirect
  - flagged child input → safe redirect
- **Pending:** a test with the real model, once the key is set and the domain is allowed.

---

### Stage 0: Sync check (no commit)

**What:** Checked that the fork matches upstream before starting.

**How:** `git fetch https://github.com/LuminaEnvision/Wondrix.git main` and `git rev-list --left-right --count HEAD...FETCH_HEAD` gave `0 0`. Fork main, upstream main and the working branch were all on `3e94b2e`. Then `npm ci`, `npm run build` (OK) and `npm run lint`.

**Why:** So we build on her latest work and avoid merge conflicts later.

**Findings:**
- `npm run lint` reports 8 errors (`react-hooks/set-state-in-effect`). They were already in the code and do not break the build; fixing them is planned for stage 6.
- The local fallback works with no key for both `/api/extra/chat` and `/api/school/session`.
