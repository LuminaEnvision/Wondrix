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
| 2 | Extra agent tuned to the canvas loop + moderation | ✅ Done, `8cda327`; verified live on Z.ai |
| 2b | Switch LLM provider to Z.ai (free GLM Flash), keep OpenAI optional | ✅ Done, `786b37a` |
| 3 | School agent: move to the shared client (so it also uses Z.ai), real question context, AI explains but never grades, logged focus decisions | ✅ Done, `df570da`; verified live on Z.ai |
| 4 | Less robotic voice: Kokoro in-browser TTS (default) + better browser voice + Azure `/api/tts` prepared | ✅ Done (see log); Kokoro audio to be checked on a laptop |
| 4b | Turn on Azure Speech for the demo (optional): create the F0 resource, set keys, `NEXT_PUBLIC_TTS_ENGINE=azure` | ⏳ When needed |
| 5 | On-the-spot visuals in Extra (agent-drawn SVG, no stock art) | ⏳ Next |
| 6 | QA: prompt eval script, fix the 8 existing lint errors, PR to upstream | ⏳ Planned |

Out of Jorge's track (owned by the project lead): Supabase persistence, parent push/email summary.

### Blockers

- None right now. `ZAI_API_KEY` is set in the cloud environment and `api.z.ai` is reachable.
- Cloud-environment note: `huggingface.co` is blocked in the cloud container, so the Kokoro model cannot download there. Kokoro must be checked in a real browser on a laptop (or allow `huggingface.co` in the environment's Network access).
- Cloud-environment note: Node's built-in `fetch` ignores `HTTPS_PROXY`, so in the cloud container the server must run with `NODE_USE_ENV_PROXY=1` (Node 22.21+). On a normal laptop this is not needed.

---

## Log

Newest entries first. Each entry gets its commit hash on the next update (a commit cannot contain its own hash).

### Stage 4: Natural voice with Kokoro (in-browser), Azure prepared, better browser voice

**Files**

| File | Change |
|------|--------|
| `src/lib/tts/kokoro.worker.ts` | **New.** Web Worker that loads Kokoro 82M and turns sentences into audio |
| `src/lib/voice.ts` | Rewritten: engine chain (Kokoro → Azure → browser), status events, stop/cancel, better browser voice |
| `src/app/api/tts/route.ts` | **New.** Azure Speech route, prepared and off by default (501 without keys) |
| `src/app/extra/page.tsx` | Warms up the voice on open; shows "Natural voice loading N%" / "ready" |
| `package.json` | `kokoro-js@1.2.1` (pinned) |
| `.env.example`, `CHANGELOG.md` | Voice settings and summary |

**Decision: which voice service**

| Option | Cost | Quality | Privacy | Notes |
|--------|------|---------|---------|-------|
| **Kokoro 82M in the browser (chosen, default)** | Free, no key, no quota | Natural, far above browser voices | Audio never leaves the device | ~80 MB model download on first use (then cached); slower on weak phones |
| **Azure Speech F0 (prepared, option 2)** | Free tier with a monthly character quota (check current limits) | Excellent neural voices, incl. a child voice (`en-US-AnaNeural`) | Text goes to Azure | Azure account usually asks for a card at sign-up |
| ElevenLabs free | Small monthly quota | Top | Cloud | Attribution required on free plan; quota too small |
| edge-tts (unofficial) | Free | Very good | Cloud | Unofficial endpoint can break during the demo |
| Browser Web Speech (before) | Free | Often robotic | Depends on browser | Kept as the last fallback |

Kokoro won on cost (zero), privacy (a kids app should not send speech data out) and quality. Azure is ready for a demo-day upgrade without code changes.

**What and how**

1. **Kokoro worker (`kokoro.worker.ts`)**
   - Loads `onnx-community/Kokoro-82M-v1.0-ONNX` with `kokoro-js`: **WebGPU + fp32** when the browser has WebGPU, else **WASM + q8**, which keeps the download small.
   - It runs in a Web Worker, so generating audio never freezes the UI.
   - Sends download progress (`status: loading N%`), then `ready`, or `failed`.
   - Generates **one sentence at a time** and sends each chunk back as soon as it is ready (a transferable `Float32Array`). The first sentence plays while the rest are still being generated.
   - A newer request cancels older ones between sentences. An empty request is a pure "stop" and does not start a download.
2. **Voice chain (`voice.ts`)**
   - `NEXT_PUBLIC_TTS_ENGINE` picks the order: `kokoro` → `kokoro, browser` (default); `azure` → `azure, kokoro, browser`; `browser` → browser only.
   - Each engine returns "spoke or not". If not, the next engine speaks, so the child always hears something.
   - **Kokoro not ready yet** (first visit, model downloading): the browser voice answers right away, and Kokoro takes over once it is ready. The child never waits for the download.
   - Kokoro audio plays through one `AudioContext`; sentence chunks are queued with a small 80 ms pause between them.
   - `stopSpeaking()` stops everything: Web Speech, queued Kokoro buffers, the Azure `<audio>`, and pending worker work. A play token stops late chunks from an old answer.
   - **Browser voice, improved:**
     - voices are ranked: "Natural"/"Neural" (Edge) > Google (Chrome) > Apple (Samantha, Ava...) > other English; "compact"/"espeak" robotic voices get a penalty
     - waits briefly for `voiceschanged`, because Chrome loads voices asynchronously
     - speaks **one utterance per sentence**, which avoids Chrome cutting long text and sounds less flat
   - `warmUpVoice()` starts the model download when `/extra` opens. `subscribeVoiceStatus()` feeds the status label.
   - Mic input (`listenOnce`) is unchanged.
3. **Azure route (`/api/tts`)**, prepared for option 2
   - Azure Speech REST: SSML with voice + prosody rate, MP3 24 kHz output, 10s timeout.
   - Defaults: `en-US-AnaNeural` (child voice), rate `-5%`.
   - Text is capped at 800 chars, XML-escaped (including the env voice/rate) and passed through the keyword safety gate, so the route cannot be used to voice harmful text.
   - Without `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` it returns **501**; the client then remembers Azure is unavailable and skips it.
   - Logs: `[tts] azure ok 420ms (en-US-AnaNeural, 180 chars)`.

**How to turn on option 2 (Azure) later**
1. Azure portal → create a **Speech** resource on the **Free F0** tier. Pick a region; `uaenorth` is close to Dubai.
2. In `.env.local`: `AZURE_SPEECH_KEY=...`, `AZURE_SPEECH_REGION=uaenorth`, `NEXT_PUBLIC_TTS_ENGINE=azure`.
3. Restart `npm run dev`. If Azure fails or the quota runs out, Kokoro and then the browser voice take over automatically.

**Why**
- The old voice used only the browser's Web Speech API with a simple voice match. On most laptops and phones that voice is robotic, which was the complaint in the task.
- A kids product should keep voice local when it can. Kokoro gives a natural voice with zero cost and no data leaving the device.
- The fallback chain keeps the demo safe: no network, no WebGPU, or a slow phone still gives a voice.

**Tested**
- `tsc --noEmit` passes. ESLint shows the same 8 errors as before (2 of them in `extra/page.tsx`, both already there). `next build` passes; Turbopack bundles the worker as its own `turbopack-worker` chunk with `kokoro-js` inside.
- `/api/tts` with no Azure keys → `501`.
- Headless Chromium on `/extra`:
  - the Kokoro worker starts and requests the model from `huggingface.co`
  - that host is blocked in the cloud container, so Kokoro reports `failed` and the **browser voice** speaks instead
  - the greeting and the answer were spoken **sentence by sentence**, with no page errors
- **Not tested here:** real Kokoro audio (the model download is blocked in the cloud container) and real Azure audio (no Azure key). To check on a laptop: open `/extra` in Chrome or Edge, wait for "Natural voice ready", ask a question.

---

### `df570da`: Stage 3: School agent on the shared client + live Z.ai verification + safer keyword gate

**Files**

| File | Change |
|------|--------|
| `src/lib/school-agent-ai.ts` | **New.** AI layer for School: focus planner, question lead-in, explanation |
| `src/app/api/school/session/route.ts` | Rewritten on the shared client; reads mastery + Extra topic; logs decisions |
| `src/lib/school-agent.ts` | `AgentSource` type (`local`/`zai`/`openai`), `nextMastery()`, `decision` field on the plan |
| `src/app/school/page.tsx` | Sends mastery + Extra topic; shows the agent's reason under each focus skill |
| `src/app/school/practice/page.tsx` | Sends the current mastery when grading |
| `src/app/school/radar/page.tsx` | Uses `nextMastery()` (same rule as practice) |
| `src/lib/safety.ts` | Keyword gate rewritten to match harmful intent, not single words |
| `src/lib/extra-agent.ts` | Follow-up must be one question; accuracy rule added |

**What and how**

1. **Focus planner (`aiPlanFocus`)**, canvas loop steps 1–2 ("read state, offer today")
   - The page sends the profile, the **mastery map** from localStorage and today's **Extra topic**.
   - The server builds the candidate list: every skill allowed for the grade + subjects, tagged with mastery, "teacher note" (from the parent one-liner) and "core for grade".
   - The model must pick 1 skill (calm mode) or 2 **from that list only**. Priority: teacher note → shaky (silent gaps) → unknown core skills → growing; secure skills are avoided.
   - It returns a short reason per skill for the parent, and a "Today: ..." line for the child that may link to the Extra interest.
   - The server checks the reply: unknown ids, duplicates and anything over the limit are dropped. If nothing valid is left, the local plan is used.
   - **Logged decision:** the response carries `decision { candidates, picked }`, and the server prints e.g. `[agent] school.plan Year 4 → halves-quarters (Teacher noted struggle; core for grade), materials (Radar showed shaky skill; core for grade)`.
   - `/school` shows the reason under each focus skill, only when it came from the live agent.
2. **Question lead-in (`aiLeadIn`)**
   - The model now gets the real question text (before: only a preview with no age info).
   - One sentence, max 15 words, a real-life hook, never a hint at the right choice, written for the child's age band.
   - Timeout is 6s and output max 60 tokens, so the practice screen does not wait long.
3. **Explanation (`aiExplain`)**
   - The model now gets the **question text, all choices, the correct answer, the child's answer and the teacher fact** from the bank. Before, it only got the ids (`r-halves-1`, `a`), so it could not explain anything real.
   - There are three situations: correct (confirm + one reason), wrong (why their choice does not fit, then the right idea), "I don't know yet" (welcome it, teach with an everyday example).
   - **The AI never grades.** `correct` and `mastery` come from the local bank before the AI is called. Empty or runaway (>400 chars) output → local explanation.
4. **Quiet mastery (`nextMastery`)**, canvas loop step 3
   - Before: correct → growing, wrong → shaky, every time. One slip erased a secure skill, and a skill could never become secure.
   - Now one answer moves one step: correct = unknown/shaky → growing → secure; wrong or "I don't know" = secure → growing, otherwise → shaky.
   - Used by both practice and radar.
   - Every grade is logged: `[agent] school.grade halves-quarters correct=true → secure`.
5. **School output safety:** no classifier call here. School content comes from the curated bank and the child types no free text, so an extra call per answer would only add delay and use up the free-tier limit.
6. **Keyword gate (`safety.ts`)**
   - Before, single words were blocked, so "how do white blood cells kill germs?" got the safety redirect.
   - Worse, "how do i make my classmate get hurt" passed the gate and, with no AI, the local fallback replied "I can explore that with you".
   - Now the gate matches **intent phrases**: harm verb + person target, making or getting weapons, self-harm, sexual words, drug dealing, hate phrases. This layer also protects the local fallback.
7. **Extra prompt:** `followUp` must be one sentence ending with "?". There is also an accuracy rule, because the live test produced a mixed-up magnet explanation (it talked about poles for a steel fridge door).

**Why**
- Before this change School still called OpenAI directly, so with only `ZAI_API_KEY` it never used AI.
- The canvas asks the agent to find **silent gaps** and to log its decisions. Feeding it mastery + teacher note + Extra topic, and returning the reasons, is what makes the School door an agent instead of a quiz.
- Keeping correctness local protects against the model saying a wrong answer is right. For a learning product that is the most damaging failure.

**Tested (live, `api.z.ai`, `glm-4.5-flash`)**
- `tsc --noEmit` passes. ESLint shows only the 8 errors that were already there (`react-hooks/set-state-in-effect`), none new. `next build` passes.
- Extra:
  - Year 3 / Year 5 / Year 7+ calm answers fit the age band, with answer first and then a follow-up (`source: "zai"`), ~3s + ~0.7s output check.
  - When the child answers the follow-up, the agent reacts to their idea first.
  - "make my classmate get hurt" → redirect (keyword gate).
  - "mix bleach and ammonia, i want to try" → redirect (the agent flagged it as unsafe).
  - "how do white blood cells kill germs?" → normal answer.
- School:
  - Year 4 with teacher note "struggles with fractions" and `materials: shaky` → picked `halves-quarters` + `materials` with correct reasons (~3.3s).
  - Year 7+ calm with `algebra-intro: shaky` → picked one skill, `algebra-intro`.
  - Lead-in ~0.7s, without giving the answer away.
  - Wrong answer, "I don't know" and correct answer each got the right kind of explanation (~0.9–2.5s). Mastery went `growing → secure` on a correct answer.
- Not re-tested live after the last Extra prompt tweak (follow-up/accuracy rule); covered by the stage 6 eval script.

---

### `786b37a`: Switch the LLM provider to Z.ai (GLM Flash, free)

**Files:** `src/lib/ai.ts`, `src/lib/extra-agent.ts`, `src/app/api/extra/chat/route.ts`, `.env.example`, `README.md`, `CHANGELOG.md`

**What**
- The AI client is now provider-agnostic. **Z.ai is the default**: `ZAI_API_KEY`, base URL `https://api.z.ai/api/paas/v4`, model `glm-4.5-flash`. OpenAI still works as an alternative.
- New env vars: `ZAI_API_KEY`, `ZAI_MODEL`, `ZAI_BASE_URL`, `ZAI_THINKING`, `AI_PROVIDER` (force `zai` or `openai`), `AI_TIMEOUT_MS`.
- Safety layer 2 now works on providers that have no moderation endpoint.
- The `source` field in the API response names the provider (`"zai"` or `"openai"`).

**How**
- `aiProvider()` reads env and returns one config: key, base URL, model, extra body fields, and whether the provider has `/moderations`.
  - Rule: `AI_PROVIDER` wins if set; otherwise Z.ai if `ZAI_API_KEY` is set, else OpenAI, else no AI (local banks).
  - Z.ai and OpenAI both speak the OpenAI Chat Completions format, so the request code is shared. Only the URL, the model and extra fields change.
- On Z.ai, each request sends `thinking: { type: "disabled" }`. GLM Flash models can reason before answering, which adds seconds; a kids chat needs fast short answers. `ZAI_THINKING=enabled` turns it back on.
- Default timeout went up from 8s to **12s**, since free models can be slower. It can be changed with `AI_TIMEOUT_MS`.
- `chatJSON` now pulls the outer `{...}` out of the reply, because some models wrap JSON in a code fence or add a sentence around it.
- Logs now name the provider and model: `[ai] extra.chat ok 900ms (zai:glm-4.5-flash)`.
- Safety on Z.ai:
  - **Child's input:** the Extra agent's JSON gained an `"unsafe": boolean` field. If the agent marks the message unsafe, the route returns the safe redirect. No extra request.
  - **Agent's output:** `isFlagged()` uses a small LLM classifier (temperature 0, `{"unsafe": bool}`). The prompt says normal science like "white blood cells kill germs" is safe.
  - **OpenAI:** unchanged (moderation endpoint on input in parallel, and on output).

**Why**
- The team chose Z.ai because the GLM Flash models are free with no card, which fits a hackathon budget. The API is OpenAI-compatible, so the switch needed no new SDK or dependency.
- The free tier allows few requests at the same time. On Z.ai the route never fires two requests in parallel: the input check rides inside the agent call, and the output check runs after it. That makes 429 (rate limit) errors less likely; if one happens, the reply falls back to local content and the error is logged.
- Keeping OpenAI as an option costs little and gives a plan B if the free tier is too slow during the demo.

**Tested**
- `tsc --noEmit` and ESLint pass on `src/lib` and `src/app/api`. `next build` passes.
- Mock Z.ai server (`ZAI_API_KEY=test ZAI_BASE_URL=http://localhost:4998/`):
  - every request carries `model=glm-4.5-flash`, `thinking={"type":"disabled"}` and JSON mode
  - a fenced JSON reply is parsed and the em dash is cleaned (`source: "zai"`)
  - agent flags unsafe input → safe redirect, with only **one** request (no classifier call)
  - classifier flags unsafe output → safe redirect
- **Pending:** a test against the real `api.z.ai` (the key and domain are not set in the cloud environment yet).

---

### `7af21fd`: Add this development log (`docs/DEV_CHANGELOG.md`)

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
