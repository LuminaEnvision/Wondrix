# Changelog

All notable work on the Wondrix January prototype.  
Plan source: [docs/PROJECT_CANVAS.md](./docs/PROJECT_CANVAS.md) (exported from Cursor canvas **`wondrix-education-agent-plan`**).

## [Unreleased]

### Added
- `src/lib/ai.ts`: single server-side AI client (timeout, JSON mode, `[ai]` logs, safety check, house-style cleanup). Any failure returns `null` so routes keep the local fallback.
- **Z.ai as default LLM provider** (`ZAI_API_KEY`, free `glm-4.5-flash`, thinking off). OpenAI stays as an alternative (`OPENAI_API_KEY` / `AI_PROVIDER`).
- `src/lib/extra-agent.ts`: Extra agent tuned to the canvas loop. Prompt adapts to age band (meadow / journal / studio), grade, picked interest and calm mode. Structured reply `{ answer, followUp, topic }`.
- Extra safety layer 2 on the child's turn and the agent's reply: OpenAI moderation endpoint, or on Z.ai the agent's own `unsafe` flag + a small LLM classifier (keyword gate stays as layer 1).
- `OPENAI_BASE_URL` (optional) for proxies or local mocks.
- School agent on the shared client (`src/lib/school-agent-ai.ts`): picks today's focus from allowed skills using mastery, teacher note and Extra topic, with logged reasons; lead-ins and explanations use the real question. Correctness stays local.
- Step-by-step mastery (`nextMastery`) for practice and radar.
- **Natural voice:** Kokoro 82M TTS runs in the browser (Web Worker, WebGPU or WASM), free and private; browser voice speaks while it loads and as fallback. Browser voice now picks the best installed voice and speaks sentence by sentence.
- Voice loading bubble in Extra: tells the child the natural voice is downloading (first time only, with progress), then "ready" or a gentle fallback note.
- **On-the-spot visuals in Extra:** the agent decides when a diagram helps and describes it as a small JSON spec (steps, cycle, compare, scale, web); `ExtraVisual` draws it as on-brand SVG. Two-step flow (`/api/extra/visual`) keeps chat fast. No model-written markup, no stock art.
- AI request queue (1 at a time on Z.ai free tier) and one retry on HTTP 429.
- **Live agent eval** (`npm run eval`): ~27 scored cases against the canvas rules on the real model. Latest run on `glm-4.5-flash`: 26/27 cases, 100/101 checks (99%).
- **Test suite:** 132 unit + API tests (Vitest, AI faked at `fetch`) and 46 end-to-end tests (Playwright, phone + desktop, local mode). `npm test`, `npm run test:e2e`, `npm run test:all`. GitHub Actions CI.
- `/api/tts` prepared for Azure Speech neural voices (`NEXT_PUBLIC_TTS_ENGINE=azure` + `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`); returns 501 when not configured.
- `docs/DEV_CHANGELOG.md`: detailed per-commit log (what, how, why, tests) and stage status.

### Added (curriculum + question bank)
- **Question bank revised after review:**
  - answer options are **shuffled every time** a question is shown (the correct answer had been first in 44/75)
  - one wrong feedback line fixed (q-shapes-3)
  - harder Year 7+ cells set
  - real-misconception distractors from Year 5 up
  - "dates" made unambiguous
- **School curriculum picker** in Parent (British, American, Indian CBSE/ICSE, IB, UAE MoE, Other):
  - grades are shown the way the school names them, with ages ("Grade 3 (age 8–9)") in Parent, School, Practice, Radar and the summary
  - the AI prompts get the grade name and spelling (math / maths)
  - there is still one internal grade scale and one question bank; old saved profiles default to UK
- `docs/CURRICULUM_RESEARCH.md`: what Dubai children study.
  - KHDA 2024-25 split: UK 37%, Indian 26%, US 14%, IB 7%.
  - Grade equivalence across curricula.
  - TIMSS grade-4 shared core (Dubai benchmarks schools against TIMSS/PISA).
  - Notes per curriculum (England NC, CCSS/NGSS, CBSE Maths Mela, IB PYP, UAE MoE).
  - Gap analysis of the Wondrix skill map, and writing rules.
- **Question bank phase 1 (draft for review):** 75 new questions (5 per skill) in `src/lib/question-bank.ts`. Metric units, AED, Dubai + global contexts, misconception-based wrong answers. The bank grows from 20 to 95 items. Review sheet: `docs/QUESTION_BANK_REVIEW.md`.

### Changed (School, before family tests)
- Practice questions show at once (the AI coach line and explanation arrive after). Wrong answers get a calm "Let's look again" card with the right option marked. Listen buttons on the question and the explanation. Sessions end after 5 questions (3 in calm mode) and the parent summary says so. The parent note left the child's School screen and was renamed "Teacher recommendations or parent observations".

### Added (Arabic gate + owl)
- **Arabic for what children and parents read:** offline answers, safety redirect and a basic Arabic safety keyword list, parent day summary with the curriculum's grade name, Arabic skill, grade and curriculum names. School says its questions are English for now.
- **The owl comes alive** with Anastasia's art: waves, listens, thinks, and its beak moves while it talks.

### Added (Wondrix as a friend)
- **Free, faster safety check:** with an OpenAI key, OpenAI's free moderation checks every turn (any chat model), in Arabic too.
- **Model comparison:** OpenRouter support and `scripts/eval-models.sh` + `eval-compare.mjs` to test models on our own suite ([docs/MODEL_TEST.md](./docs/MODEL_TEST.md)). Dinosaur starter questions.
- **Personality and intents:** Wondrix knows its name, is playful and varied, says good night without keeping the child talking, and helps a stuck child with ideas. It knows the child's local time.
- **Tap-able ideas:** starter questions on an empty chat and next ideas under answers, rotating per visit, age band and language.
- **Animated Wondrix:** breathes, listens, thinks and talks with the conversation.

### Added (picture-first diagrams)
- Scenes for **why the sky is blue** and **magnets** (7 scenes now). Diagrams that only add text (no real pictures) are no longer shown. Arabic moon labels in child words. Saudi curriculum in the picker. Natural voice waits at most 5 s before the browser voice speaks.
- **Animated scenes** for the 5 most common topics (water cycle, day and night, moon phases, how plants make food, solid/liquid/gas). Show me lights up each numbered part while Wondrix says it. Full list of 15 and review checklist: [docs/SCENES.md](./docs/SCENES.md).
- **Extra diagrams for children who can't read yet:** every item has a big animated picture (46 hand-drawn icons: sun, steam, cloud, rain, root, ...). **Show me** lights up each item while Wondrix says it; the newest diagram plays itself after the spoken answer. Tap an item to hear it.

### Added (languages)
- **English + Arabic switch** in setup and Parent. Arabic turns the app right to left, the mic listens in Arabic (ar-AE), and Extra answers in Arabic. Arabic text is an AI draft for native review; School questions stay English for now. See [docs/I18N.md](./docs/I18N.md).

### Added (conversation memory)
- **Extra chat history:** chats are saved on the device; "New chat" keeps the old one in **Past chats**, which reopens a chat with its context. Keeps the 20 newest chats, 30 messages each. Parent can clear the history.
- **Extra remembers the conversation for this visit:** kept on reload, with a **New chat** button (now saved in Past chats, see above). The agent gets the last 12 turns (trimmed to 400 chars each) plus memory rules: short replies like "yes" answer its last question, don't repeat, remind in one sentence and add one new detail.
- If the model drifts out of JSON in long chats, its plain-text answer is kept (follow-up split off) instead of falling back.
- If the live agent is unavailable mid-chat and the child replies briefly, the local reply keeps the thread honestly instead of jumping to a random topic.

### Added (voice UX)
- **Tap-to-talk mic for kids** (`DictationPanel`): one tap starts; a live volume meter, the words so far and a timer show it is listening; it **never sends on silence** (keeps listening through pauses and browser restarts) and shows "Take your time" after ~8s of quiet; big **Done, send my question** / **Cancel** buttons.
- `npm run check` (`scripts/run-all-tests.sh`): lint, typecheck, unit/API, build and end-to-end in one go with a summary; `--quick`, `--eval`; auto-handles old CPUs and the first Playwright install.
- Per-message voice control (`SpeakButton`): **Listen** → **Preparing voice…** (spinner) → **Speaking** (animated equalizer bars) with **Stop**; "No sound available on this device" when no engine can play. Replaces the small "Hear again" link.
- Kokoro gets 8s for the first sentence on slow devices (no AVX / WASM only), then the browser voice takes over; after 2 slow tries Kokoro is skipped for the session. `[voice]` console logs show which engine played and how fast.

### Fixed
- CI: `npm run typecheck` now runs `next typegen` first. Next's global route types (`LayoutProps`) only existed after a local dev/build, so typecheck failed on every fresh CI checkout.
- Extra question field has `id`/`name`/label (browser "form field" warning).
- Parent summary no longer lists a safety-redirected question as an "explored" Extra topic; it shows only a count ("Wondrix gently redirected 1 question…").
- Kokoro voice: checks for a real WebGPU adapter and falls back to WASM if WebGPU fails (old GPUs advertise WebGPU without an adapter); the real error is logged in the browser console.
- Dev mode: instant-navigation validation limited to opted-in segments (`manual-warning`), removing the per-page "Could not validate…" errors and extra CPU work; project root pinned (no stray-lockfile warning).
- Keyword gate now also blocks dangerous home "experiments" (mixing bleach/ammonia, setting things on fire) so the offline fallback never answers them.
- Generic local fallback no longer echoes an unknown question back or offers to "explore" it.
- Extra follow-up is trimmed to exactly one question.
- Keyword gate missed person-first harm phrasing ("make my classmate get hurt"); now blocked without blocking "my friend got hurt, how do bones heal?".
- Practice no longer dead-ends after the only question of a skill: it recycles earlier questions (never the last one) or says "That's all the practice for this skill today".

### Changed
- ESLint is clean (0 errors): localStorage reads moved to `useSyncExternalStore` hooks (`src/lib/use-client-state.ts`), lazy state, render-time derivation and keyed remounts instead of setState in effects.
- Keyword safety gate matches harmful intent phrases (normal science like "white blood cells kill germs" passes).
- `/school` shows the agent's reason under each focus skill.
- Extra page sends the parent profile and saves the agent's topic label for the parent day summary.

## [0.1.0] — 2026-10-24 — January prototype scaffold (no live AI key required)

Ships a clickable championship demo. School and Extra run on **local banks + keyword coach**. OpenAI routes exist but are optional until a developer adds `OPENAI_API_KEY`.

### Done from the canvas plan

| Canvas item | Status in this release |
|-------------|------------------------|
| Rename Offscreen → **Wondrix**; two doors School / Extra | Done — home + path hero |
| Parent setup: nickname, grade/year, subjects, teacher recommendations, calm mode | Done — `/parent` |
| Optional **4-digit parent PIN** + first-run setup gate | Done |
| School **This week** (1–2 focus skills by grade) | Done — `/school` + School agent plan |
| School **Practice** (soft feedback, “I don’t know”) | Done — `/school/practice` |
| School **Gap radar** | Done — `/school/radar`, grade-filtered bank |
| Skill graph + mastery (localStorage) | Done — expanded beyond Year 3; Y5–Y7+ advanced skills |
| Grade-matched questions (Year 3 ≠ Year 7) | Done — `src/lib/radar.ts` |
| Extra curiosity chat + topic ideas (text replies) | Done — `/extra` (physics, robots, astronomy, living things, chemistry). On-the-spot visuals TBD with AI. |
| Extra voice (TTS + mic where browser allows) | Done — Web Speech API |
| Soft **safety redirect** | Done — keyword gate (`src/lib/safety.ts`) |
| Parent **daily phone summary** preview | Done — built from focus + Extra topic + calm |
| Age-band **skins** (meadow / journal / studio) | Done — CSS `data-skin` from profile age band |
| Agent-shaped APIs for School + Extra | Done — `/api/school/session`, `/api/extra/chat` with local fallback |
| Designer art pack wired | Done — `public/art/*` |
| Env template for later AI | Done — `.env.example` |

### Intentionally not done (for the first GitHub issue / May track)

- Wire and **tune live AI models** for School + Extra to match canvas agent goals  
- Real safety classifier (beyond keywords)  
- Push/email parent notifier  
- Postgres / Supabase records  
- Soft off-screen missions (canvas: optional, later)  
- Deck + 3-minute video  

### How to demo without an API key

```bash
npm install
npm run dev
```

1. Parent → set grade (try Year 3 then Year 7+) → Save  
2. School → see focus skills change → Practice / Radar  
3. Extra → ask “why are wheels round?” → get a real local answer + follow-up  
4. Parent → read today’s phone summary preview  
