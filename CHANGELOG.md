# Changelog

All notable work on the Wondrix January prototype.  
Plan source: [docs/PROJECT_CANVAS.md](./docs/PROJECT_CANVAS.md) (exported from Cursor canvas **`wondrix-education-agent-plan`**).

## [0.1.0] — 2026-10-24 — January prototype scaffold (no live AI key required)

Ships a clickable championship demo. School and Extra run on **local banks + keyword coach**. OpenAI routes exist but are optional until a developer adds `OPENAI_API_KEY`.

### Done from the canvas plan

| Canvas item | Status in this release |
|-------------|------------------------|
| Rename Offscreen → **Wondrix**; two doors School / Extra | Done — home + path hero |
| **No school letters** anywhere | Done — never asked for upload |
| Parent setup: nickname, grade/year, subjects, teacher recommendations, calm mode | Done — `/parent` |
| Optional **4-digit parent PIN** + first-run setup gate | Done |
| School **This week** (1–2 focus skills by grade) | Done — `/school` + School agent plan |
| School **Practice** (soft feedback, “I don’t know”) | Done — `/school/practice` |
| School **Gap radar** | Done — `/school/radar`, grade-filtered bank |
| Skill graph + mastery (localStorage) | Done — expanded beyond Year 3; Y5–Y7+ advanced skills |
| Grade-matched questions (Year 3 ≠ Year 7) | Done — `src/lib/radar.ts` |
| Extra curiosity chat + topic ideas + diagrams | Done — `/extra` (physics, robots, astronomy, living things, chemistry) |
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
