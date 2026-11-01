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

### Fixed
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
