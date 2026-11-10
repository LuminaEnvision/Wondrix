# Next-stage notes for Jorge

Living product notes from Anastasia. Not fix tickets: say what you agree with, what you would drop, and a sensible order. Nothing here must land before the demo unless we both say so.

---

## Done (shipped on this branch / main)

**UI / UX:** Explorer / Teen age modes, world theming, bottom nav School | Wonder | Me, Wonder dock, topic SVG placeholders. Mic: tap → speak → ~2s pause auto-sends (Done optional). Chats stay per language (language switch clears the open Wonder thread). Mascot faces the bubble; single opaque frame (no blink / fade-out); think pose faces away; idle not in the talk loop. Voice Listen states clearer (preparing / speaking / stop). Home / School / Wonder / Parent surfaces tightened after the redesign pass.

**Parent / curriculum:** Subjects change with programme + grade (`subjectsForProgramme`, coming-later chips, clamp on load/save). Optional textbook/unit free-text (`unitNote`) steers AI wording only. Teacher field renamed to recommendations / parent observations. Parent door removed from the **child** School screen. Weekly skill map on Parent from mastery (shaky / growing / secure). Arabic Parent summary + curriculum/grade menus (PR #12).

**School practice:** Question from bank appears at once (no AI lead-in wait). Wrong-answer calm “look again” card marks the correct choice. Listen on question + explanation. Session ends after a soft cap (`PRACTICE_SESSION_LIMIT` = 5), no bank recycle, finish-for-today screen. Child Quick check kept; it quietly feeds the Parent week map.

**Wonder:** Opening starters rotate by visit + age band + language. Topic seeds age-band + rotate on re-tap (`topic-seeds.ts`). Same five topic cards for now (second row still open below). PR #12 on `main`: Arabic offline replies, `content-ar` names/summary/menus, owl webp frames, model-test tooling.

---

## Still feeling unnatural / slow / bad

- **Arabic voice is robotic** (or silent / wrong language on many devices). English voice feels more natural; Arabic does not match a warm owl coach yet.
- **Voice gender mismatch:** Arabic path tends male; English path female. Our Arab mascot reads male — should we pick **one** voice gender per language (or one owl identity overall) and stick to it?
- **School session feel:** An early pass with ages ~5–8 on the question bank *technically* worked, but the sitting was not deep — slow, shallow, and felt like calm mode rather than a proper practice loop. Instant question + session end + Listen were meant to fix that; needs a **second live session** to confirm.
- **Latency / waiting:** Anything that still “thinks” before the child can act feels wrong (Wonder answers, diagrams, TTS prepare). Prefer unlock UI first, polish later.
- **Arabic copy / seeds:** Draft i18n and starters need a native ear; some lines still feel translated, not spoken to a child.

---

## Test path before Arab family pilots

1. Push improvements (this batch).
2. **Second practice session** (same ~5–8 age band) to confirm: question appears at once, wrong-card feel, Listen, session ends cleanly, not “slow calm mode”.
3. **Native-speaker review** of Arabic UI + starters/seeds + (if available) TTS sample.
4. Then **deploy** and test with Arab families — not before 2–3 feel honest.

---

## Please consult — order these next

1. **Voice identity** — Pick and stick: one female or one male per language? Arab mascot = male, English owl voice = female today. Prefer matching mascot, or one consistent Wondrix voice everywhere? Arabic must stop sounding robotic (Azure / real Arabic system voice vs Kokoro-only English).

2. **Picture-first School items (Y1–3)** — Counters, fraction bar, ruler, compare pictures. Which skills deserve drawings vs stay words? Ties to a School “look again” owl face in `docs/ART_NEEDED.md`.

3. **Deeper question bank** — Fewer skills, more items each, matched to grade / programme / gaps — not five forever. Early 5–8 test passed mechanically but lacked depth; bank quality + pacing matter as much as UI. School bank stays English for now; translation later (keep the on-screen English note honest).

4. **Second Wonder topic row** — Today: Physics · Robots · Astronomy · Living things · Chemistry. Wish: a second row (or swipe) of five more interests, local lists, unique art, age-band EN+AR seeds. Suggested: Dinosaurs, Ocean, Weather, My body, Inventions. Alternates: Desert & UAE animals, Sound & music, Volcanoes & rocks, Food & cooking science, Sports & movement. Need from you: which five, Explorer-only or all ages. Art via same 512² path as `docs/ART_NEEDED.md`.

5. **Several children, one parent** — Smallest sketch: one PIN, several child profiles, separate chats / practice / summary. Pilot = on-device profiles? What breaks when a second child appears?

6. **Home hero motion** — Home still feels static next to Wonder’s owl. Options: soft path/sparkle loop · Home owl idle breathe / rare wave · gentle door lift on CTA · one entrance motion then still. Prefer `prefers-reduced-motion` off for loops. Please say: **none / one small loop / entrance only**. Do not make Home a busy dashboard.

7. **Art leftovers** (`docs/ART_NEEDED.md`) — Final topic PNGs (replace SVGs), school paper grain, owl mouth frames on front pose, front thinking face, School “look again” face.

8. **Arabic polish** — Native-speaker pass on `ar.ts` / `content-ar.ts` (including starter / seed feel). Do not re-litigate chrome/summary/menus — that correction shipped.

9. **Models** — OpenRouter / eval follow-through in `docs/MODEL_TEST.md` — Jorge’s lane.

---

## What not to do from this note

- Do not start everything at once.
- Do not pilot with Arab families before the second School session + native review above.
- Recommendation on order: what helps a family in week two vs after the demo.
