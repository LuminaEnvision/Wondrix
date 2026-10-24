# Wondrix — project canvas (prototype brief)

Source plan: Cursor canvas **`wondrix-education-agent-plan`**  
*(local path: `.cursor/.../canvases/wondrix-education-agent-plan.canvas.tsx` — revised 23 October 2026)*

**Competition:** Dubai Create AI Agents Championship · **Best Societal AI Agent**  
**Internal submit:** ~20 January · **Grand Final:** first week of May 2027  
**Language:** English submission

## One-line product

Wondrix is an AI learning home with two doors: **School** (find silent gaps without school letters) and **Extra** (grow curiosity with follow-ups and diagrams). Parents get a **daily phone summary**. Soft off-screen missions are optional and later.

## What the child opens

| Door | Job |
|------|-----|
| **School** | Homework-style practice on a skill graph for age/grade. Agent finds shaky skills (especially when the child never raises a hand), then quizzes + visuals. |
| **Extra** | Chat on interests (physics, robotics, biology, chemistry, astronomy). Answers once, then gently follows up. Diagrams grow the topic. |

## School inputs (no letters)

1. **Setup profile** (parent, once) — age band, grade/year, subjects (math, science first); optional calm mode  
2. **Gap radar** (child) — short quiz that maps silent delays without needing the child to confess  
3. **Teacher recommendations / parent one-liner** (optional) — after a teacher call; not a curriculum PDF  

## School screens

- **This week** — 1–2 focus skills from grade + radar + teacher note · Start  
- **Practice** — quiz/visual · soft feedback · “I don’t know” allowed  
- **Radar** — multi-item check across the grade band  
- **Parent** — teacher recommendations field + calm mode · never asks for a letter upload  

## Agent loop (one day)

1. Read state (skills, radar, Extra threads, calm mode)  
2. Offer today (School focus and/or Extra)  
3. School practice → update mastery quietly  
4. Extra path → answer, follow-up, diagram  
5. Safety gate → redirect unsafe turns  
6. Day summary → parent phone preview  

## Architecture (January vs later)

| Layer | January prototype | Later / May |
|-------|-------------------|-------------|
| App | Next.js, phone/tablet first, two doors + parent | Same |
| Agent loop | TS tools + local banks; OpenAI hooks ready | Tuned model + logged decisions |
| Skill graph | Grade-banded math/science nodes | Years 2–6 richer |
| Gap radar | Short multi-skill bank | Richer |
| Parent signals | Teacher note + calm mode | Weekly digest |
| Extra + safety | Topic trees, diagrams, keyword safety | Full classifier + push |
| Records | **localStorage** demo | Postgres / Supabase, auth |

## Age skins (canvas)

- **7–9 meadow** — large type, two big doors  
- **10–13 field journal** — denser columns feel  
- **14–17 studio** — denser type  

## January proof (championship narrative)

Quiet gap found by radar → Extra topic grown → parent got summary — **without school letters**.

## Explicitly out of January prototype

- Live AI API keys in production (dev wires `OPENAI_API_KEY`)  
- Real push/email notifier  
- Off-screen missions (optional, later)  
- Supabase / Postgres persistence  
- Deck + 3-min video (Jan calendar)  
