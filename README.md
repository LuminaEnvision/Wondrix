# Wondrix

**Your friend on the learning path.**

Wondrix is an AI education agent for the Dubai Create AI Agents Championship (**Best Societal AI Agent**). It helps families support school learning at home, and grows a child’s curiosity in a safe, follow-up chat.

> Prototype plan: [docs/PROJECT_CANVAS.md](./docs/PROJECT_CANVAS.md)  
> What shipped vs the plan: [CHANGELOG.md](./CHANGELOG.md)

## The agent (two doors)

```
                 ┌─────────────┐
                 │   Wondrix   │
                 │  day loop   │
                 └──────┬──────┘
          ┌─────────────┴─────────────┐
          ▼                           ▼
   ┌─────────────┐             ┌─────────────┐
   │   School    │             │    Extra    │
   │ gaps + quiz │             │ curiosity   │
   └──────┬──────┘             └──────┬──────┘
          │                           │
          └─────────────┬─────────────┘
                        ▼
                 ┌─────────────┐
                 │   Parent    │
                 │ daily note  │
                 └─────────────┘
```

1. **Read state** — grade, subjects, mastery, teacher note, calm mode  
2. **School** — pick 1–2 focus skills → practice / gap radar → update mastery  
3. **Extra** — answer a curiosity question → gentle follow-up  
4. **Safety** — redirect unsafe topics  
5. **Parent summary** — what was practiced, Extra topic, calm tip  

This release runs the loop with **local skill banks and keyword replies**. Live model calls are stubbed behind the same APIs so a developer can drop in `OPENAI_API_KEY` without rewriting the UI (see [open issue #1](../../issues) after push).

## Features

### School

- Grade-aware **focus skills** (Year 1–2 through Year 7+, including advanced algebra / cells / percentages)
- **Gap radar** — short checks that catch silent delays (“I don’t know” is always ok)
- **Practice** — multi-choice with soft coaching, not punishing percent scores
- School agent session API: plan → question → grade/explain

### Extra (curiosity agent)

- Open chat + topic ideas: physics, robots, astronomy, living things, chemistry  
- Local content-first answers (e.g. why wheels are round) + follow-up questions  
- Optional **voice answers** (TTS) and **mic** input (Chrome/Edge)  
- Soft safety redirect for unsafe topics  
- Text replies for now; on-the-spot visuals come with the live agent later  

### Parent

- Nickname, grade, math/science subjects  
- **Teacher recommendations** field (fill when teachers advise)  
- **Calm mode** (one gentler focus skill)  
- Optional **4-digit PIN** for Parent area  
- **Today’s phone summary** preview  

### Experience

- Phone/tablet-first Next.js UI  
- Age skins: meadow (7–9), field journal (10–13), studio (14–17)  
- Mascot + illustration pack in `public/art/`  

## Quick start

```bash
npm install
cp .env.example .env.local   # optional — leave OPENAI_API_KEY empty for local demo
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Path | Screen |
|------|--------|
| `/` | Two doors |
| `/school` | This week + agent note |
| `/school/radar` | Gap radar |
| `/school/practice?skill=…` | Practice |
| `/extra` | Curiosity chat |
| `/parent` | Setup + summary |

## Adding the live AI API (for developers)

1. Put `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) in `.env.local`  
2. Restart `npm run dev`  
3. Extra uses `/api/extra/chat`; School uses `/api/school/session`  
4. Without a key, both fall back to local banks — the UI still works for demos  

Tune prompts and model behaviour against the canvas goals in [docs/PROJECT_CANVAS.md](./docs/PROJECT_CANVAS.md). Tracked in the first GitHub issue.

## Stack

- Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript  
- Client state: `localStorage` (prototype)  
- Speech: Web Speech API (browser-dependent)  

## Championship context

- **Category:** Best Societal AI Agent  
- **Story:** Quiet gap found by radar → Extra grown → parent summary  
- **Submit window:** ~January 2027 prototype · May 2027 final  

## License

MIT — see [LICENSE](./LICENSE).
