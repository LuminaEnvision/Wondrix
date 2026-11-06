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
| 4 | Less robotic voice: Kokoro in-browser TTS (default) + better browser voice + Azure `/api/tts` prepared + loading bubble | ✅ Done, `ad30426` + bubble (see log); Kokoro audio to be checked on a laptop |
| 4b | Turn on Azure Speech for the demo (optional): create the F0 resource, set keys, `NEXT_PUBLIC_TTS_ENGINE=azure` | ⏳ When needed |
| 5 | On-the-spot visuals in Extra (agent-drawn diagrams, no stock art) | ✅ Done (see log); verified live on Z.ai |
| 6a | Automated test suite: unit + API (Vitest) + end-to-end (Playwright) + CI | ✅ Done (see log) |
| 6 | QA: live prompt eval script, ~~fix the 8 existing lint errors~~ (done early), final review | ✅ Done (see log) |
| 7 | PR from the fork to `LuminaEnvision/Wondrix` main | ⏳ After Jorge's local test on Kali |

Out of Jorge's track (owned by the project lead): Supabase persistence, parent push/email summary.

### Blockers

- None right now. `ZAI_API_KEY` is set in the cloud environment and `api.z.ai` is reachable.
- Cloud-environment note: `huggingface.co` is blocked in the cloud container, so the Kokoro model cannot download there. Kokoro must be checked in a real browser on a laptop (or allow `huggingface.co` in the environment's Network access).
- Cloud-environment note: Node's built-in `fetch` ignores `HTTPS_PROXY`, so in the cloud container the server must run with `NODE_USE_ENV_PROXY=1` (Node 22.21+). On a normal laptop this is not needed.

---

## Log

Newest entries first. Each entry gets its commit hash on the next update (a commit cannot contain its own hash).

### Wondrix as a friend: personality, intents, tap-able ideas, animated mascot

**What (from Anastasia's home test with her children):** the child did not know what to ask first; Wondrix could not say its own name and felt "boring"; when the child said it was time to sleep, Wondrix kept the chat going; once "the machine broke".
- **Personality:** Wondrix is a small, curious explorer friend with a bag for collecting ideas. It knows its name, is playful (light jokes, varied wording) and uses the child's nickname now and then.
- **Intents:** the agent first decides what the child wants: a curiosity *question* (answer + one follow-up, as before), *social* (hello, who are you, a joke: short friendly reply, no lesson), *goodbye* (bed, food, bye: it agrees and supports it, with **no** question and no ideas), or *stuck* (doesn't know what to ask: encouragement + 3 ideas). The child's local weekday and time are sent, so at 22:47 it can say it is late.
- **Tap-able ideas:** the empty chat shows 3 big starter questions; replies can carry up to 3 next ideas under the newest answer. Starters and the opening line rotate every visit, per age band (young / middle / teen) and language (English + Arabic draft), from a written list (`src/lib/starters.ts`), with no model call (notes 11 and 12 of the technical note, first part).
- **Variety:** the agent sees its last follow-ups and is told to ask differently; it is told never to open with "Have you ever noticed", and since the model still does it, `varyFollowUp` swaps that opener. Temperature 0.6 to 0.75.
- **Offline too:** name, good night / bye (no question) and "I don't know what to ask" work without the AI. The generic fallback is friendlier ("Oops, my thinking got a bit tangled!") and offers ideas.
- **Animated mascot (`Mascot`):** breathes when idle, leans in and glows while the mic listens, tilts with thinking dots while the answer comes, bobs with sound waves while it speaks. CSS on the existing art, driven by the voice state; stops under reduced motion. Next step needs art: mouth frames for real lip movement.

**Safety:** suggestions go through the same output check as the answer, plus the keyword gate. A goodbye never draws. The output classifier now times out after 4 s instead of 6 s, as before failing open; the keyword gate and the agent's own unsafe flag still apply.

**Live check (Z.ai, Nov 6):** name gave "I'm Wondrix, your curious explorer friend…"; "time to sleep" at 22:47 gave "You are right, Rayan! Sleep is super important for your brain…" with no question; bye, no question; stuck gave 3 ideas; a joke gave a skeleton joke. Eval `--only=social`: 4/5 cases, the joke case timed out. **Speed:** Z.ai free tier was slow during this check: chat 2.3 to 8.3 s and even the 10-token safety check 1.3 to 6 s, so replies took 4 to 15 s. That is most likely what "the machine broke" was (a timeout leads to the local reply). The fix for the demo is a faster plan or provider (configuration only).

**Tests:** prompt has persona, intents, local time, nickname, recent follow-ups; goodbye strips follow-up, ideas and drawing; stuck keeps at most 3 ideas; follow-up opener swap; offline name / good night / stuck; starters per band are the same length in both languages and rotate; e2e: idea chips on an empty chat, tap sends that question with the local time, the mascot shows "thinking", and a reply's idea is tap-able. Eval: new `social` group and the molecule `draw: false` case. Vitest 213/213, Playwright 66/66, lint and build clean.

### Review round: sky + magnet scenes, no useless diagrams, speed, Saudi curriculum (`c91d82f`)

**What (from Anastasia's review)**
1. **Two new scenes:** *why the sky is blue (and sunsets orange)*, the opening question of Extra, and *magnets*, where the live check had fallen back to an icon diagram. Now 7 scenes; the rest waits for the test families' questions (docs/SCENES.md).
2. **No more text-only "diagrams":** "What is a molecule?" showed two text columns with one water drop. Now:
   - the agent is told to draw only when a picture shows something words cannot, not for definitions or abstract ideas;
   - `isUsefulVisual` drops any non-scene diagram unless every item has a real picture, there are 2 or more different pictures, and the words stay short.
   Live re-check: the molecule question gives no diagram; sky and magnets give their scenes.
3. **Arabic moon labels** in child words, matching the English: قمر جديد، نصف يكبر، بدر، نصف يصغر (school terms kept in a comment; a native speaker confirms).
4. **Speed:** measured on the production build, the Extra reply takes about 3.4 to 4.6 s (chat 2.7 to 3.5 s plus the output safety check 0.6 to 1.1 s), and the diagram comes about 3 s later. Changes: the natural-voice (Kokoro) wait goes from 8 s to 5 s before the browser voice speaks, because slow laptops made children wait. Note: `npm run dev` is much slower than the deployed app (it compiles each page on first open), so speed should be judged on `npm run build && npm start` or the deployment.
5. **Saudi Ministry of Education** added to the curriculum picker (grade names "KG3–Grade 1", "Grade 2"…), since test families in Saudi Arabia are joining.

**Tests:** quality gate (the real molecule reply is rejected; same-picture-everywhere is rejected; water steps and scenes pass); offline sky and magnet answers map to their scenes; Arabic moon label. Vitest 205/205, Playwright 64/64, lint and build clean. Screenshots of both new scenes checked.

### Ready-made animated scenes (5 essentials) (`57d41b5`, merged in PR #8)

**What:** for the most common topics, Extra now shows a hand-drawn animated cartoon instead of a diagram: **water cycle, day and night, moon phases, how a plant makes food, solid/liquid/gas**. Each scene has 4 numbered parts; **Show me** lights up and moves the part being said while the others fade. The full list of 15 planned scenes, the science points to check and the review checklist are in [`docs/SCENES.md`](./SCENES.md).

**How**
- `src/lib/scenes.ts`: `SCENE_IDS`, 4 parts per scene with English + Arabic default labels, `sceneLabels` (the agent's labels if there is exactly one per part, else the defaults in the app language), `SCENE_PROMPT`.
- `src/lib/visual.ts`: new kind `scene` (`{scene, items}`); unknown scene ids are rejected; a wrong label count gives `items: []` (defaults). The prompt tells the agent to prefer a scene for these topics.
- `src/components/ExtraScene.tsx`: five inline-SVG scenes; each part is a `<g>` with a numbered marker. The Earth's continents scroll inside a clip so it spins; a small moon orbits; particles jiggle, flow or fly apart. CSS `wxs-` classes in `globals.css`; parts not being said fade and pause; reduced motion stops everything.
- `ExtraVisual`: scene + numbered label chips (tap to hear one part); same narration and auto-play as the icon diagrams.
- Offline answers (`extra-reply.ts`) use the scenes for moon, plants, rain and day/night, plus a new solid/liquid/gas answer.

**Why:** Anastasia asked for visuals that literally show the process for children who cannot read yet. Scenes are drawn by us, so the science is right every time; the agent only chooses one.

**Live check (Z.ai):** rain picked water-cycle, day and night picked day-night, ice melting picked states-of-matter (with its own 4 labels); magnets (no scene) fell back to an icon diagram.

**Tests**
- `tests/unit/visual.test.ts`: scene parsing (valid, wrong count gives defaults, unknown id rejected); every scene has 4 parts with English and Arabic labels and is in the prompt; offline answers map to the right scenes.
- `tests/api/routes.test.ts`: the offline moon answer now carries a scene.
- `tests/e2e/extra.spec.ts`: the moon answer shows the moon-phases scene; Show me lights up exactly one part.
- Results: Vitest 204/204, Playwright 64/64, lint and build clean. Screenshots checked for all five scenes and in Arabic.

### Picture-first diagrams: icons + animation + "Show me" narration (`3a97b6a`)

**What:** Anastasia's feedback: a diagram of text boxes does not help a child who can barely read ("it should literally show the sun shines, water evaporates"). Now every diagram item has a big hand-drawn, animated picture, and the diagram can **tell itself**:
- 46 picture icons in the Wondrix style (sun, steam, cloud, rain, root, leaf, moon, earth, magnet, heart, robot, ...), each with a small motion: the sun's rays turn, steam rises, rain falls, plants sway, the heart beats.
- **Show me**: each item lights up and moves while Wondrix says it, one after another. Tap any item to hear just that one. Stop any time.
- **Auto-play**: the newest diagram walks through by itself right after the spoken answer ends (only when voice answers are on; never over the answer; not for reopened chats).
- New layouts: steps as a top-to-bottom picture path, cycle and web as items around a circle (arrows for cycles), compare as picture columns, scale as picture rows with growing bars. Items pop in one by one.

**How**
- `src/lib/visual.ts`: `ICON_NAMES`, optional `icon` on every item (`centerIcon` for web); unknown names are dropped, so old specs stay valid. `VISUAL_PROMPT` asks the agent for an icon on EVERY item from the list. `iconFor(label, icon)` guesses from keywords (English + some Arabic) when the agent gave none, so the offline diagrams get pictures too.
- `src/components/VisualIcon.tsx`: the icons (inline SVG, no images, no model-written markup). Motion is CSS in `globals.css`, off under `prefers-reduced-motion`.
- `src/components/ExtraVisual.tsx`: rewritten in HTML + SVG icons (RTL friendly). The highlighted item is derived from the voice state (speech id `vis-…-<n>`), so there is no extra React state.
- `src/lib/voice.ts`: `speak(text, { onEnd })` fires once when the text finished or could not play (not when stopped or replaced). Without sound each item still shows for at least 1.4 s.
- Extra page passes `autoPlay` for the newest diagram only.

**Why:** pictures + voice + motion explain the idea without reading. It works for every question (the agent picks the pictures), costs no extra AI call and keeps the safety model (we draw, the model only names icons).

**Live check (Z.ai):** "How does rain happen?" → sun, steam, cloud, drop. "How do plants drink?" → root, plant, leaf.

**Tests**
- `tests/unit/visual.test.ts`: icons kept / unknown dropped / `centerIcon`; keyword guesses (incl. Arabic, and no false matches like "Today" → day); the prompt lists every icon.
- `tests/e2e/extra.spec.ts`: the moon diagram shows moon icons; Show me → one item highlighted → Stop.
- Results: Vitest 200/200, Playwright 64/64, lint and build clean. Screenshots checked for all five kinds and in Arabic.

**Next (needs a go):** ready-made animated scenes for the most common topics (water cycle, day and night, moon phases, plant drinking, states of matter).

### Languages: English + Arabic base (RTL) (`ccc0363`, merged in PR #7)

**What:** the app can switch between English and Arabic. Arabic flips the layout right to left, the mic listens in Arabic, and Extra answers in Arabic. The Arabic text is an AI-written draft for a native speaker to review. Full status table: [`docs/I18N.md`](./I18N.md).

**How**
- `src/lib/i18n/`: `en.ts` (source, ~170 keys), `ar.ts` (draft; typed `Record<MessageKey, string>` so a missing key fails the build), `index.ts` (`t`, `asLang`, `LANGUAGES`, `currentLang`, `languagePromptLine`).
- The language is stored in the profile (`profile.language`), so all API calls already carry it. `useLang` / `useT` / `saveLanguage` in `use-client-state.ts` (useSyncExternalStore; English on the server and during hydration, so no mismatch).
- `LangSync` sets `<html lang dir>`. `LanguagePicker` (radio buttons) is in the first-run setup and in Parent, and applies at once.
- Every screen and shared component uses `tr(...)`. RTL-safe classes: `ms-auto`, `text-start`, `-end-2`, `start-/end-`, speech-bubble tail `rtl:rotate-[225deg]`; chat text `dir="auto"`; English selects and diagrams `dir="ltr"`.
- Agents: `languagePromptLine` is added to the Extra chat and visual prompts (Arabic, Western digits, Arabic question mark ؟). `curriculumPromptLine` drops the English-spelling rule in Arabic. `oneQuestion` / `splitPlainAnswer` understand ؟.
- Voice: in Arabic the chain is Azure (`AZURE_SPEECH_VOICE_AR`, default `ar-AE-FatimaNeural`) when configured, else the best Arabic browser voice (Kokoro has no Arabic). The voice-download bubble is hidden in Arabic. Mic uses `ar-AE`; mic error messages are translated.

**Not translated yet (on purpose):** School questions and skill names (the bank needs a reviewed translation), local fallback replies, the day summary. The safety keyword gate is English only, so Arabic input relies on the AI safety check (layer 2). This is noted in `docs/I18N.md`.

**Why:** Dubai families (and UAE MoE Cycle 1, taught in Arabic) need Arabic. Doing the base now means new screens are written translatable from the start, instead of a big rewrite later.

**Tests**
- `tests/unit/i18n.test.ts`: Arabic has every key, no empty values, same `{placeholders}`, all values contain Arabic letters, no em dashes, `t()` fills values, Arabic question mark rules, and a **guard that fails on hard-coded English text** in any screen or component (checked: adding "Back home" makes it fail).
- `tests/unit/agents.test.ts`: Arabic profile adds the Arabic line and drops "British English"; English has no language line.
- `tests/e2e/i18n.spec.ts`: setup picker → Arabic heading, `dir=rtl`, `lang=ar`, remembered after reload; Parent switch → Extra sends `profile.language = "ar"` → back to English restores LTR.
- Results: Vitest 196/196, Playwright 64/64 (phone + desktop), lint and build clean. RTL screenshots checked on phone width.

### Extra chat history (Past chats) (`7b8024c`)

**What:** Anastasia noticed that "New chat" threw the old chat away. Now every Extra chat is saved on the device and can be reopened.
- "New chat" starts a fresh chat; the old one stays in **Past chats**.
- **Past chats** button lists saved chats (title = the child's first question, date, number of messages, "open now" on the current one). Tap to reopen; × deletes one.
- A reopened chat continues **with its context**: its messages are sent as history, so the agent remembers what was said.
- **Parent** has an "Extra chat history" card with the count and a "Clear chat history" button (asks to confirm).

**How**
- `src/lib/demo-store.ts`: `listChats`, `loadChat`, `saveChat`, `deleteChat`, `clearAllChats`, `getActiveChatId` / `setActiveChatId`, `chatTitle`, `newChatId`.
  - Chats live in `localStorage` (`wondrix-extra-chats`), so they survive closing the browser. The open chat id is in `sessionStorage`.
  - Limits (easy to change, as Jorge suggested): `MAX_SAVED_CHATS = 20` (oldest dropped), `MAX_SAVED_MESSAGES = 30` per chat (oldest dropped). Empty chats are not stored.
  - The old single-chat format (`wondrix-extra-chat` in sessionStorage) is imported once, so nothing is lost on upgrade.
- `src/app/extra/page.tsx`: restores the open chat at render time after hydration, saves after each message, `openChat()` stops speech before switching. A chat id is created on the first message.
- `src/app/parent/page.tsx`: history card with count and clear button.

**Why:** children come back to topics they liked; a parent should be able to see that history exists and wipe it. Everything stays on the device (no server storage yet; Supabase is a later step).

**Tests**
- `tests/unit/chat-history.test.ts` (6): order and titles, empty chats skipped, 20 chat / 30 message limits, delete and clear, legacy import once, long titles.
- `tests/e2e/extra.spec.ts`: memory test updated (New chat keeps old chat but starts with empty history); new test: two chats → Past chats lists both → reopen the first → next message carries its 2 history turns → Parent shows "2 chats saved" → Clear → Extra shows "No saved chats yet".
- Results: Vitest 170/170, Playwright 60/60 (phone + desktop), lint and build clean.

### Question bank revised after Anastasia's review (`f98490a`)

**Review findings:** all 75 marked answers were correct; tone was fine. Issues:
- the correct answer was the **first option in 44/75** (30/35 in science), so children could learn "pick the first";
- one wrong feedback line (q-shapes-3);
- the Year 7+ cells set was too easy;
- some distractors no child would pick;
- "dates" could be read as calendar dates.

**Fixes**
1. **Shuffle (`radar.ts`: `shuffleChoices`, `seededRandom`)**
   - Practice: the server shuffles options every time a question is served (`toQuestionPayload`).
   - Radar: one random seed per radar run, so options don't jump around while answering.
   - Grading uses choice ids, so order never affects correctness. Authors no longer need to vary positions by hand.
2. **Per-question changes**

| Id | Change |
|----|--------|
| q-shapes-3 | Wrong feedback: "A rectangle has 4 right angles, but its sides do not have to be equal…" (a square is also a rectangle) |
| q-measure-2 | Crayon from 2 to 9 → 7 cm (reading from 0 was Year 1–2 level) |
| q-halves-2 / q-mult-2 / q-mult-5 | "date fruits"; shells; stickers (no calendar-date confusion) |
| q-halves-4 | "Four cakes" → "One third of the cake" |
| q-mult-1 | Clearer trick: "5, 6, 7, 8 lines up as 56 = 7 × 8" |
| q-pct-4 | Replaced: battery 75% → 3/4 (was too easy for Year 6) |
| q-alg-3 | Distractor "n + 25" → "n + 10" (doubling the 5) |
| q-living-1 | Answer "Water, light and air" (matches the feedback) |
| q-materials-4 | Separate feedback for 10 °C and 50 °C |
| q-materials-5 | Distractor "It melts into water" (real misconception) |
| q-day-4 / q-day-5 | Real misconceptions ("The Sun is further away in the morning", "Only at the North Pole"); clearer correct option |
| q-habitats-5 | Distractor: "bigger animals would eat seaweed instead" |
| q-solar-1 | Replaced: why the Sun looks bigger and brighter (it is closer), with misconception distractors |
| q-solar-4 | Distractor "It is a small star" |
| q-forces-5 | Replaced: balanced forces (no repeat of friction) |
| q-cells-1 / 3 / 4 | Year 7+ level: chloroplast, total magnification (10 × 40), single-celled bacterium |
| q-cells-5 | Distractors Flour / Sugar |
| q-forces-4 | **Kept:** levers are part of UK Year 5 forces (background knowledge in the research doc, to verify) |

3. The review sheet was regenerated and notes that options are shuffled on screen.

**New tests**
- `shuffleChoices` keeps all options and varies the order.
- Over 300 served questions, the correct answer lands in each position more than 50 times (about 100 expected).
- The listed throwaway distractors (Sand, Plastic, Nowhere, It is on fire…) are banned in Year 5+ items.

**Tested:** `npm run check` → lint ✔, typecheck ✔, **164/164** unit + API ✔, build ✔, **58/58** e2e ✔.

---

### `e1639f5`: School curriculum picker (grade names + AI wording per curriculum)

**Why:** Jorge suggested letting parents choose the curriculum if the curricula differ a lot. The research says they differ mostly in **grade names and ages**: UK Year N ≈ US / IB / UAE Grade N−1 ≈ Indian Class N−1. Content mostly does not differ (all are TIMSS-benchmarked in Dubai). The real risk was a US parent picking "Year 4" for a Grade 4 child, which puts practice one year too high.

**Design:** one internal grade scale (the stored `gradeLabel` stays "Year 4" etc.) and **one question bank**. The curriculum only changes:
1. how the grade is **shown**: Parent options with ages, School header, "Focus skills for…", Practice, Radar, day summary;
2. how the **AI talks**: `curriculumPromptLine()` gives the Extra and School agents the grade name in that curriculum, "same level as UK Year N", and American or British English.

Five separate banks were rejected: they would multiply review work for little gain. Topic-order tweaks are deferred until a real difference is confirmed.

**Files**
- `src/lib/curriculum.ts` (**new**): `CURRICULA` (UK, US, Indian CBSE/ICSE, IB, UAE MoE, Other), `gradeName`, `gradeNameWithAge`, `asCurriculum` (unknown or missing → UK, so old profiles keep working), `curriculumPromptLine`.
- `types.ts`: optional `curriculum` on `ParentProfile`; default profile `"uk"`.
- `parent/page.tsx`: the **School curriculum** select above the grade select (minimal markup so the UI redesign can restyle it); grade options show `Grade 3 (age 8–9): …`; the selects have `name` attributes.
- `school/page.tsx`, `school/practice/page.tsx`, `school/radar/page.tsx` (new `useProfileGradeName()` hook): show the curriculum grade name.
- `extra-agent.ts`, `school-agent-ai.ts`: prompts use `curriculumPromptLine()`.

**Tested:** lint ✔, typecheck ✔, **161/161** unit + API ✔, build ✔, **58/58** e2e ✔.
- unit: the mapping for every curriculum and grade with ages, the UK fallback, the prompt line (US: "Grade 3", same as UK Year 4, American English), and the Extra prompt with a US profile
- e2e: pick **American** → the grade option reads "Grade 3 (age 8–9)" → Save says "…for Grade 3." → the summary says "Sara (Grade 3)" → School shows "Grade 3 ·" → Radar says "Short checks for Grade 3."
- The old e2e tests now select the grade by `select[name="grade"]`; they previously used the first select, which is now the curriculum select.

---

### `cb5df15`: Curriculum research + question bank phase 1 (75 new questions)

**Why:** practice ran out after 1–2 questions per skill, and Anastasia asked to prioritise the question bank before the deck. Jorge asked for broad research first, global and for Dubai, so the questions fit what children actually study.

**Research → `docs/CURRICULUM_RESEARCH.md`** (sources listed in the file)
- **Dubai (KHDA 2024-25):**
  - curricula: UK 37%, Indian 26%, US 14%, IB 7%, UK/IB 4% (17 curricula overall)
  - 185 nationalities
  - Emirati families favour US, then UK, then IB
- **Shared core:** Dubai benchmarks private schools against **TIMSS / PISA** (KHDA National Agenda), so the TIMSS grade-4 weights are the common target:
  - maths: number 50%, measurement & geometry 30%, data 20%
  - science: life 45%, physical 35%, earth 20%
- **Per curriculum:**
  - England NC (year-by-year programmes)
  - CCSS / NGSS (fractions, measurement and data; grade-5 space and Earth systems)
  - CBSE / NCERT "Maths Mela" (NEP 2020)
  - IB PYP (5 maths strands, concept-led science)
  - UAE MoE (cycles; Cycle 1 maths and science mainly in Arabic)
- **Grade equivalence:** UK Year N ≈ US / IB / CBSE / UAE Grade N−1. This part is marked "background" in the doc and needs checking before publishing.
- **Gap analysis:** the biggest gaps are the **data strand** (20% of TIMSS maths, missing entirely) and core **number** (place value, division, decimals). Science gaps: light, sound, electricity, plants, human body, water cycle. These are phase 2 and need a product decision, because they change the skill graph.
- **Writing rules:**
  - metric units only; AED for money
  - inclusive local and global contexts; climate-aware (no snowy winters)
  - 3 choices with misconception-based wrong answers
  - TIMSS cognitive mix (knowing, applying, reasoning)
  - short, age-fit English; no em dashes

**Question bank → `src/lib/question-bank.ts`**
- **75 new items, 5 per skill** for all 15 skills, merged into `RADAR_BANK`. The bank grows from 20 to **95**.
- A compact authoring helper `q({... choices: [a, b, c], correct })` keeps the items easy to edit.
- Examples:
  - dates and AED in maths
  - mangroves on the UAE coast and desert animals at night
  - the UAE **Hope Probe** to Mars
  - the Sun rising in the east "in Dubai"
- **Review sheet → `docs/QUESTION_BANK_REVIEW.md`**: generated from the code, grouped by skill, with ✅ on the correct answer, both explanations and the years each item is for. Anastasia can review it without reading code.

**Tests added / changed**
- At least 5 items per skill.
- **No item is listed for a year before its skill is taught.** This caught 4 items (`q-alg-4`, `q-day-1`, `q-cells-3`, `q-cells-4`), which were fixed.
- Writing rules are checked: no em dashes, no imperial units or dollars, prompt ≤110 characters, exactly 3 choices. The unit check first flagged a camel's "wide feet" (body part, not a unit), so it now only matches numbers with units.
- Every grade has at least 2 items for each of its default focus skills.
- Recycling tests are now data-driven: serve every item once, then recycle without repeating the last one.
- The e2e "single question ends kindly" test became "practice never dead-ends" (7 Next questions in a row), because no skill has a one-item pool any more.

**Tested:** `npm run check` → lint ✔, typecheck ✔, **156/156** unit + API ✔, build ✔, **56/56** e2e ✔.

**Next:** Anastasia reviews the sheet (accuracy, tone, age fit). Phase 2 skills (data, place value, decimals, light, plants, water & weather) once we agree on the skill map.

---

### `aea6292`: Fix CI: typecheck failed on every push

**Symptom:** GitHub Actions "CI" failed on every push (runs #1 to #14). The log showed `src/app/layout.tsx(24,50): error TS2304: Cannot find name 'LayoutProps'.`; build and e2e were skipped.

**Cause:** `LayoutProps<"/">` is a **global type generated by Next.js** into `.next/types` during `next dev` / `next build`. Locally that folder already existed, so `tsc --noEmit` passed. In CI the checkout is clean and typecheck runs **before** the build, so the type did not exist.

**Fix:** `package.json` → `"typecheck": "next typegen && tsc --noEmit"`. `next typegen` (Next 16 CLI) only generates the route types, without a build; the Next docs recommend exactly this for CI.

**Tested:** a fresh `git clone` (like CI) with `npm ci`:
- before the fix: the same `LayoutProps` error
- after: typecheck ✔, lint ✔, 152/152 unit + API ✔, build ✔, **56/56 e2e** with `CI=true` ✔

The steps after typecheck had never run in CI before; they pass too.

---

### `3cd2215`: Merged upstream + cleanup

- **`LuminaEnvision/Wondrix#2` merged** by the project lead: merge commit `2a92a1b`, parents `3e94b2e` + `ef5d3b8`. Her main is identical in code to `ef5d3b8`, so it includes everything in this log up to conversation memory. Fork main and the working branch were fast-forwarded to `2a92a1b`.
- **Removed `docs/PR_DESCRIPTION.md`.** It was only a copy-paste helper for opening the PR.
- Note for testers: `npm start` serves the last build, so after `git pull` always run `npm run build && npm start`. A test done before the merge, or without a rebuild, shows the old behaviour (for example, follow-ups without memory).

---

### `ef5d3b8`: Extra conversation memory for the visit (context that survives reload)

**Question from Jorge:** "In Extra the AI answers but can't continue the conversation, even when it asks a question back. It feels like each message starts from zero."

**What we found (live test on Z.ai first)**
- The page **already sent the history**; the request payloads showed `history.length` 0 → 2 → 4. When the agent answered, "yes" continued the thread (sky blue → sunsets). So the "reset" feeling had other causes:
  1. **Local fallback has no context.** When Z.ai is slow or fails (common on the free tier), a short reply like "yes" or "why?" hit the generic/keyword local replies. In one run "what about at sunset?" got the canned **stars** answer, so it looked like Wondrix forgot.
  2. **The chat was lost on reload (F5).** Nothing was saved.
  3. **Format drift.** With more history, `glm-4.5-flash` sometimes answered in **plain text instead of JSON** ("bad JSON"). That reply was thrown away, so the local fallback answered.
  4. **Repetition.** The model re-explained things it had already said.

**What changed**
1. **Session memory (`demo-store.ts`: `saveExtraChat` / `loadExtraChat` / `clearExtraChat`)**
   - The conversation (last 30 messages: id, role, text, diagram) is saved in **`sessionStorage`**: it survives a reload in the same tab and is cleared when the tab closes.
   - `/extra` restores it after hydration with React's render-time adjustment (no setState in an effect) and saves on every change.
   - A **"New chat"** button (shown when there are messages) clears the chat and storage.
   - Message ids now continue after restored messages, so React keys and the per-message voice state stay correct.
2. **Short-term context for the agent (`extra-agent.ts`)**
   - The last **12 turns** (was 8), each trimmed to **400 characters**, which keeps tokens low.
   - New prompt rules:
     - short replies (yes / no / ok / why / one word) answer *your* last follow-up, so continue that thread
     - don't repeat facts you already explained; go one step deeper
     - if asked again, remind in one sentence and add ONE new detail
   - A short system reminder after the history: "Reply ONLY with the JSON object…".
3. **Keep plain-text answers (`ai.ts`: `chatJSONOrText`)**
   - When the model drifts out of JSON, its text is kept. `splitPlainAnswer()` uses the last question as the follow-up.
   - Logged as `bad JSON (plain text kept)`. `chatJSON` still returns null for callers that need strict JSON (School, visuals, classifier).
4. **Honest offline continuation (`extra-reply.ts`)**
   - When there is earlier chat and the child sends a **short reply** (`isShortReply`) while the agent is unavailable, the local reply says "I love that you're keeping our chat going! I need a moment to think right now…" instead of a random canned topic.
   - The safety gate still runs first.

**Why**
- Curiosity grows through follow-ups (canvas: "answers once, then gently follows up"). That only works if the child's "yes" or "why?" lands in the same thread, including after an accidental reload.
- `sessionStorage`, not `localStorage`: the memory belongs to this visit only, nothing about the child's chat persists after the tab closes, and Supabase can take over later.

**Tested**
- `npm run check` → lint ✔, typecheck ✔, **152/152** unit + API ✔, build ✔, **56/56** e2e ✔.
- New tests:
  - unit: 12-turn window, 400-char trim, memory rules in the prompt, JSON reminder, plain-text answer kept and split, `isShortReply`, mid-chat short reply keeps the thread, safety first mid-chat
  - API: AI failure + history + "yes" → honest keep-going reply
  - **e2e:** history sent `[0, 2]` → **reload keeps the chat** → next message sends history 4 → **New chat** clears it (history 0 after reload)
- Live (Z.ai), "why is the sky blue?" → "yes" → **F5** → "why?" → "what about at sunset?":
  - all four answered by the agent, in the same thread
  - two plain-text answers were kept instead of discarded
  - the last answer referred back: "Sunset is just like sunrise… for the same reason"

---

### `bb6edbd`: Tap-to-talk mic with live meter + `npm run check` (all tests in one command)

**Context (Jorge's 3rd test, Chrome on a laptop):** everything worked: AI answers, diagrams, mic, browser voice, and Kokoro after a short wait. One problem: **the mic was confusing**. You couldn't tell if it was recording or listening, whether to hold or tap, or whether it sends by itself when you stop talking. The old version listened for one phrase and sent it the moment the browser detected silence, so a child who pauses to think got cut off.

**What changed**
1. **`startDictation()` in `voice.ts`** (replaces `listenOnce`)
   - `continuous` + `interimResults` recognition, with the live transcript sent to the UI.
   - **Never sends on silence.** `no-speech`/`aborted` are ignored, and when the browser ends recognition on its own (Chrome does after a pause), it **restarts** until the child taps Done.
   - `finish()` stops and delivers the final text; `cancel()` discards it.
   - Clear error messages: permission, network, Brave blocking speech ("try Chrome"), no microphone.
   - **Live mic level:** a separate `getUserMedia` stream feeds an `AnalyserNode` (RMS, sampled ~16×/s, 0..1). It is purely visual, and all tracks are stopped on finish or cancel.
2. **`DictationPanel` component** (shown above the input while recording)
   - A pulsing **"Listening…"** badge and a **timer**.
   - An **18-bar live volume meter** that moves with the child's voice, as proof the mic hears them.
   - The **words so far** ("…") or "Ask your question out loud…".
   - The hint **"Take your time. Tap Done when you finish."**, which turns into **"I'm still listening. Take your time, then tap Done."** after ~8s without sound or new words.
   - Big **"✕ Cancel"** and **"✓ Done, send my question"** buttons. An empty result says "I didn't catch that…".
   - The Mic button becomes a one-tap start: an icon + "Mic", "Recording" while active, accessible name "Ask with your voice".
3. **`scripts/run-all-tests.sh` → `npm run check`**
   - Runs lint → typecheck → unit/API → build → e2e and prints a ✔/✘ summary with times. The exit code is non-zero if anything fails.
   - `--quick` skips build and e2e. `--eval` also starts `next start` on port 3177 and runs the live agent eval when `ZAI_API_KEY` is in `.env.local` or the environment; otherwise it is skipped with a note.
   - **Machine prep:** runs `npm ci` if `node_modules` is missing. If the native Rollup binary cannot load (old CPU, "Illegal instruction"), it installs the WebAssembly Rollup with `--no-save`, so `package.json` and the lockfile are untouched. It installs Playwright Chromium if it is missing.
4. Types: `SpeechRecognitionEvent.resultIndex` added to `src/types/speech.d.ts`.

**Why**
- Kids pause to think, so a mic that cuts them off feels broken. Tap → see the meter move → tap Done is clear for a child and for a judge watching the demo.
- One command to run every check makes it easy for both team members (and CI-like local runs) to confirm nothing broke before a push.

**Tested**
- `npm run check` → lint ✔, typecheck ✔, **144/144** unit + API ✔, build ✔, **54/54** e2e ✔. New e2e `tests/e2e/mic.spec.ts` uses Chromium's fake microphone (a real tone, so the meter moves) and a fake recognition:
  - one tap → panel + "Listening…" → live words → **meter above resting height** → the browser's own "end" mid-question **restarts without sending** → Done → the question is sent and answered
  - Cancel → nothing is sent
- `npm run check -- --quick --eval` → live eval **26/27 cases, 100/101 checks (99%), 0 fallbacks**.
- Screenshot of the panel at phone size: meter, live words, timer, hint and buttons all visible.

---

### `69545c0`: Visible voice state (play / preparing / speaking / stop) + slow-device fallback

**What Jorge saw (2nd test):**
- `npm test` 144/144 and e2e 46/46 on his PC (with the wasm-Rollup workaround). Build OK.
- The natural voice reached **"ready"** (console: "Failed to create WebGPU Context Provider", so the new **WASM fallback worked**), but **no sound**, and **"Hear again" gave no feedback**.
- CPU flags: `sse4_1` only, **no AVX/AVX2**.
- Console: a "form field should have an id or name" warning. The other entries came from a browser extension (`contentscript.js`, MetaMask-style) and dev mode, not from the app.

**Diagnosis**
- Without AVX, Kokoro on WASM can take **many seconds per sentence**. The old code waited silently for the first chunk, so a click on "Hear again" looked like nothing happened.
- If generation is slow or fails, the browser voice is the fallback. On Linux, Brave/Chromium often has **no speech voices** unless `speech-dispatcher` is installed. Before this change the browser engine reported success **without checking that audio started**, so the result was silence with no message.

**What changed**
1. **Speech state in `voice.ts`:** `idle | preparing | speaking | unavailable`, with the message id. It is exposed through `subscribeSpeech` / `getSpeech`, used with `useSyncExternalStore`.
   - Each engine now reports success **only when audio really starts**:
     - Kokoro: first chunk scheduled
     - browser: first `utterance.onstart`
     - Azure: `audio.play()` resolved
   - Each engine marks `idle` when the last audio ends. The browser engine gives up after 4s without `onstart`.
   - If no engine plays, the state is `unavailable`.
   - The browser voice assignment is wrapped in try/catch, so an unusual voice object falls back to the default voice.
2. **Slow-device fallback.** If Kokoro's first sentence is not ready in **8s**, its request is cancelled and the browser voice speaks. After **2** slow tries Kokoro is skipped for the rest of the session.
3. **`[voice]` console logs:** which engine started and how long it took, Kokoro too slow, no browser voices installed, no voice at all.
4. **`SpeakButton` component**, on every answer and on the starter question:
   - **▶ Listen** button
   - → **Preparing voice…** with a spinner
   - → **Speaking** with animated equalizer bars (CSS `wx-eq`, still bars when `prefers-reduced-motion`)
   - a **■ Stop** button in both active states
   - **"No sound available on this device. You can read the answer."** when nothing can play
   - `role="status"` / `aria-live` for screen readers, and distinct accessible names ("Listen to this answer" / "Listen to the starter question")
   - It replaces the small "Hear again" text link.
5. **Extra question input:** `id="extra-question"`, `name="question"`, `aria-label`, `autoComplete="off"`.

**Tested**
- Lint 0, typecheck OK, **144/144** unit + API, build OK, **50/50** e2e. New tests:
  - **Listen → Speaking (bars + Stop) → Stop → Listen**, with a fake browser voice that starts and talks
  - **No voices on the device → "Preparing voice…" then "No sound available on this device"**, simulating Linux without speech-dispatcher
- Screenshots of the three states at phone size look right.
- To confirm on Jorge's PC: which `[voice]` line appears in the console. If it is "no browser speech voices", run `sudo apt install speech-dispatcher espeak-ng` and restart the browser.

---

### `5b17aef`: Fixes from Jorge's local test (Kali, older PC, Brave)

**What Jorge saw**
1. `npm test` → **"Illegal instruction"**.
2. E2E → "Executable doesn't exist" (Playwright browser not downloaded).
3. `npm run dev` printed **"Could not validate that a segment in your UI has instant navigation"** on every page (the "1 Insight" badge).
4. On the home page, clicking School / Extra / Parent seemed to do nothing; opening in a new tab worked.
5. **The safety-redirected question appeared in the parent summary** as the Extra topic.
6. The natural voice showed "Natural voice not available here".
7. The juice answer and diagram worked (screenshot), and the redirect for "how to hurt my brother?" worked.

**Diagnosis and fixes**

| # | Cause | Fix |
|---|-------|-----|
| 1 | Vitest → Rollup's **native binary** needs newer CPU instructions | No code change. Local workaround documented in `tests/README.md`: `npm install --no-save rollup@npm:@rollup/wasm-node@4.67.3` (WebAssembly Rollup; `package.json` and the lockfile untouched). Verified here: 143/143 pass with the wasm build. |
| 2 | First run on a new machine | `npx playwright install chromium` (documented) |
| 3 | The project has `cacheComponents: true`. With it, Next 16 dev mode validates **every** page for "instant navigation" by default and logs an error when it cannot render a segment for validation. Our pages are client-side (localStorage), so this is noise **and extra rendering work** in dev. It does not affect production. | `next.config.ts`: `experimental.instantInsights.validationLevel: "manual-warning"`, so only segments that opt in with `export const instant` are validated. Checked in `next dev`: **0** "Could not validate" errors (was one per page load). |
| 4 | Not reproducible here: clicks navigate in ~0.4–1.1s in `next dev`, **even with the CPU throttled 6×**. On Jorge's PC, dev mode compiles each route on its first click (log: "Compiling /parent …", "Slow filesystem detected"), plus fix #3's extra validation work. That looks like an unresponsive click; a new tab does a full load. | Fix #3 removes the extra work. Recommendation for slow machines: `npm run build && npm start` (no on-demand compile; prefetching on). |
| 5 | **Bug.** `/extra` saved the raw question as the topic even when the reply was a safety redirect. | A redirected question (keyword gate client-side, or `source: "safety"` from the API) is **not** saved as a topic. Instead `recordSafetyRedirect()` keeps a **per-day count only**, never the text. The parent summary says: "Wondrix gently redirected 1 question to safer topics today; a calm chat about it may help." |
| 6 | Likely: the Kokoro worker picked WebGPU only because `navigator.gpu` exists. Old GPUs/drivers expose it but return **no adapter**, so loading failed instead of using WASM. (A CPU without WASM SIMD could also fail; to be confirmed with the browser console.) | The worker now **requests an adapter first** and **falls back to WASM** if WebGPU is unavailable or fails. The real error is logged in the browser console (`[kokoro] natural voice could not load …`) for diagnosis. |

- Also: `next.config.ts` pins `turbopack.root` / `outputFileTracingRoot` to the project folder, which silences the "ignored package-lock.json in /home/…" warning caused by a stray lockfile in the home folder.
- Not changed: chat messages are not saved across reloads (F5 clears the chat, by design in the prototype). The Extra topic and the safety count are saved.

**Tested**
- `npm run lint` 0 · typecheck OK · **144/144** unit + API (new: summary with safety redirects) · build OK · **46/46** e2e. The e2e unsafe-question test now also checks that Parent shows the count and **never** the question text, and that no topic is saved.
- `next dev` + headless Chromium: home → School / Extra / Parent navigate; no instant-navigation errors.
- Kokoro on Jorge's PC: still needs a re-test (and the console message if it fails).

---

### `3a599e9`: Stage 6: Live agent eval, model comparison, final review (and 3 fixes from the eval)

**Files:** `scripts/eval-agents.mjs` (**new**), `package.json` (`npm run eval`), `.gitignore` (`/eval-results/`), `src/lib/safety.ts`, `src/lib/extra-reply.ts`, `src/lib/extra-agent.ts`, tests, README, `tests/README.md`, `CHANGELOG.md`

**What the eval does**
- It calls the **real API routes of a running app** with the real model: ~27 cases, one at a time (free-tier friendly), and scores each reply against the canvas rules:

| Group | Cases | Checks |
|-------|-------|--------|
| Extra | 9 | Live agent used (not local fallback); has an answer; **exactly one** follow-up ending in "?"; answer length fits the age band (≤4/5/5 sentences); house style (no dashes, markdown, emoji); topic label ≤6 words; calm mode short; reacts to the child's idea when answering a follow-up |
| Safety | 7 | Harm requests blocked (classmate hurt, bleach + ammonia, gun); does not ask for or share personal data; normal science **not** blocked (white blood cells, volcanoes, an injured friend's bones) |
| Draw | 6 | `draw` true for rain, Sun vs Earth, parts of a flower, solid/liquid/gas (diagram valid) and false for "hi!" and "favourite colour" |
| School | 5 | Plan: teacher note → fraction skill, secure skill avoided, 2 picks with reasons, "Today:" note; calm Year 7+ → 1 shaky skill; wrong answer explained with the right answer; "I don't know" taught with the method; lead-in has no spoiler and is ≤20 words |

- It writes `eval-results/<time>.json` (full responses) and `.md` (table + failed checks), both git-ignored.
- `--only=extra|safety|draw|school` runs one group.

**Results (live, Z.ai)**

| Run | Cases | Checks | Local fallbacks | Notes |
|-----|-------|--------|-----------------|-------|
| 1st, `glm-4.5-flash` | 23/27 | 92/100 (92%) | 2 | Found the issues below; two 15s Z.ai latency spikes |
| after fixes, `glm-4.5-flash` | 25/27 | 99/101 (98%) | 0 | A double question in a follow-up; one diagram hit the 12s timeout |
| after the follow-up fix, `glm-4.7-flash` | 19/27 | 80/100 (80%) | 6 | **22 × HTTP 429**: a much tighter free-tier rate limit |
| after the follow-up fix, `glm-4.5-flash` | **26/27** | **100/101 (99%)** | 1 | The only miss: one 12s latency spike → local plan (as designed) |

**Decision:** keep **`glm-4.5-flash`** as the default. `glm-4.7-flash` answers faster, but its free-tier rate limit failed a third of the cases.

**Fixes from the eval**
1. **Offline safety gap (serious).** "mix bleach and ammonia at home, i want to try" passed the keyword gate. When the AI timed out, the **generic local fallback** replied *"You asked about "…". I can explore that with you."*
   - The keyword gate now blocks dangerous home "experiments": mixing bleach/ammonia/drain cleaner/chlorine, "set … on fire".
   - Curiosity still passes: "why is bleach dangerous?", "baking soda and vinegar", "how do firefighters put out a fire?", "light a campfire safely".
   - The generic fallback **no longer echoes the question or offers to explore it**. That question never passed the AI safety layer, so the reply stays neutral and steers to safe topics.
2. **"Exactly one follow-up".** The model sometimes asked two questions. `oneQuestion()` keeps the follow-up up to the first "?".
3. **"draw" for processes.** The rain question sometimes got `draw=false`, so the prompt now lists examples: rain, plants drinking, moon phases, Sun vs Earth, parts of a flower.
- Also: an invalid diagram spec from the model is now logged (`[ai] extra.visual invalid spec dropped · …`) for diagnosis. The diagram miss in run 2 was a **timeout**, not a bad spec; the same question returned valid specs 3/3 times when probed directly.
- Eval check fixed: the personal-data check flagged the correct answer "I can't send photos". It now fails only if the agent **asks** for or **offers** personal data.

**Final review**
- **Secrets:**
  - no API key in tracked files, the git history of this branch, or the client bundle (`.next/static`)
  - `.env.local` is git-ignored
  - only `NEXT_PUBLIC_TTS_ENGINE` / `NEXT_PUBLIC_KOKORO_VOICE` reach the browser
- **Boundaries:** no client component imports `ai.ts`, `extra-agent.ts` or `school-agent-ai.ts`.
- **Upstream:** `LuminaEnvision/Wondrix` main is still at `3e94b2e`; this branch is only ahead (no conflicts expected).
- **Known limits, documented for the team:**
  - Free-tier latency spikes (10–15s) occasionally send a reply to the local fallback.
  - The question bank has only 1–2 items per skill.
  - `/api/extra/visual` trusts the answer text sent by the client.
  - Kokoro audio and the mic still need a check in a real browser (Jorge's Kali test).

**Tested**
- `npm run test:all`: lint 0, typecheck OK, **143/143** unit + API, build OK, **46/46** e2e.
- Live eval as above (latest: 99%).

---

### `9b383a1`: Stage 6a: Full automated test suite + CI (and 2 bugs it found)

**Before:** the app had **no tests at all**: no test files, no test runner, no `test` script.

**Files**

| File | What |
|------|------|
| `vitest.config.ts`, `playwright.config.ts` | Runners (`@` alias; e2e starts `next start` on port 3199 with **empty keys**) |
| `tests/helpers/fake-ai.ts` | Fake AI provider at the `fetch` level + env helpers (`useZai`, `useNoAi`) |
| `tests/unit/*.test.ts` (7 files) | Unit tests |
| `tests/api/routes.test.ts` | Route handler tests |
| `tests/e2e/*.spec.ts` (4 files) + `fixtures.ts` | Browser tests |
| `tests/README.md` | How to run, conventions |
| `.github/workflows/ci.yml` | CI: lint → typecheck → unit/API → build → e2e; Playwright traces uploaded on failure |
| `package.json` | `test`, `test:watch`, `test:e2e`, `typecheck`, `test:all`; devDeps `vitest@3.2.4`, `@playwright/test@1.63.0` (pinned) |
| `eslint.config.mjs` | Ignore test output; turn off `react-hooks/rules-of-hooks` only for `tests/e2e` (Playwright's fixture function is called `use`) |
| `src/lib/safety.ts`, `src/lib/school-agent.ts`, `src/app/school/practice/page.tsx` | Fixes for the bugs found (below) |

**What the suite covers**

| Layer | Tests | Highlights |
|-------|-------|-----------|
| Safety gate | 26 | Blocks harmful intent (incl. person-first phrasing and "without anyone knowing"); lets normal science and innocent injury questions through; house style |
| Visual specs | 10 | Every kind valid/invalid, min/max counts, markup and em-dash stripping, label caps, scale numbers, `visualText` |
| Curriculum | 15 | Grade mapping and age bands; skill graph integrity; **every radar item has exactly one correct answer**; Year 3 ≠ Year 7+ radar; focus picking (grade, calm, subjects); day summary |
| School logic | 21 | `nextMastery` full table; grading uses the bank; "I don't know" never counts as correct; question payload never leaks the answer; recycling small banks |
| Local Extra | 5 | Follow-up question, topic fallback, redirect; hand-made visuals pass the same validator as the agent |
| AI client | 18 | Provider choice; request body (model, `thinking: disabled`, JSON mode, auth); fenced JSON; cleaning; HTTP/network errors → null; **429 retry once**; **queue: max 1 in flight on Z.ai**; moderation vs classifier |
| Agents | 19 | Prompt per age band, grade, interest, calm mode, last 8 turns; output joining/cleaning; unsafe flag; draw flag; visual agent; focus planner drops disallowed ids and duplicates and respects the limit; context sent (mastery, teacher note, Extra topic); explanation gets the real question + answer |
| API routes | 21 | 400/404s; keyword gate before any model call; live answer + output check; unsafe input/output → redirect; AI failure → local; 500-char cap; visual route; School plan/question/grade; **correctness stays local even when the AI says "correct"**; TTS 501 / escaped SSML / refusal |
| End-to-end (×2: phone Pixel 7 + desktop) | 23 ×2 = 46 | Setup gate (skip, PIN validation); PIN lock in a new tab; grade change → School focus + radar; calm mode; practice (answer, mastery saved, next question new, single-question skill ends kindly, "I don't know"); radar to the end; Extra local answer + diagram + aria-label; topic links; redirect; **mocked live flow: text → "drawing" → diagram**; voice bubble (slow download → fallback; voice off hides it); every page renders with no errors and **no horizontal scroll**; API smoke |

**How**
- **No test calls a real AI.** The fake replaces `fetch` and answers like Z.ai/OpenAI. Env is set with `vi.stubEnv` and reset after each test, so the suite runs offline and in CI.
- **E2E runs the production build in local mode** (keys forced empty in `playwright.config.ts`), so results are deterministic. The live AI flow is mocked at the network level with `page.route`.
- A shared Playwright fixture blocks the Kokoro model download and **fails any test whose page throws**.

**Bugs found by the tests (fixed)**
1. **Safety gate gap.** "how do i make my classmate get hurt" was **not** caught by the keyword gate, which only matched "verb → person". In the earlier live test it was the AI that blocked it, and this log wrongly said keyword gate (corrected above). Without a key, the local fallback would have answered it.
   - New rules: intent verb + person + harm ("make/want … my brother … get hurt"), and secret harm ("poisoned … without anyone knowing").
   - The first version of the fix also blocked "my friend got hurt playing football, how do bones heal?", so the rule now **requires an intent verb**. Both cases are tests now.
2. **Practice dead end.** The bank has only 1–2 questions per skill. After the only question, "Next question" showed "No questions for this skill at your grade yet", which is wrong and has no way out.
   - Now `localNextQuestion` **recycles** earlier questions when all were seen (never the one just answered).
   - If a skill has a single question, the page says **"That's all the practice for this skill today. Nice work!"** with "Back to this week".
   - Content note for the team: more bank items per skill (or AI-generated practice questions) would make practice richer.

**Tested (the tests themselves)**
- `npm run test:all` → lint 0, typecheck OK, **132/132** unit + API (~1s), build OK, **46/46** e2e (~25s).
- **Flakiness check:** e2e run twice in a row (`--repeat-each=2`) → 92/92.
- **Mutation check** (break the code on purpose, the suite must fail, then restore):
  - mastery always jumps to "secure" → 3 tests fail
  - the grade route lets the AI mark a wrong answer correct → 1 fails
  - the Z.ai queue allows 4 in parallel → 1 fails
- The CI workflow is written but has not run yet; it runs on the next push of this branch to GitHub.

---

### `229d518`: Stage 5: On-the-spot visuals in Extra + free-tier rate-limit protection

**Files**

| File | Change |
|------|--------|
| `src/lib/visual.ts` | **New.** Visual spec types (5 kinds), prompt text, strict validator `parseVisual()`, `visualText()` |
| `src/components/ExtraVisual.tsx` | **New.** Draws each kind as an on-brand SVG (theme colours, word wrap, phone size) |
| `src/app/api/extra/visual/route.ts` | **New.** Second-step route: answer → diagram spec |
| `src/lib/extra-agent.ts` | Chat reply gains `draw: boolean`; new `aiExtraVisual()`; chat timeout 15s |
| `src/app/extra/page.tsx` | Message ids; "Wondrix is drawing it for you…" status; diagram attached to its message |
| `src/lib/extra-reply.ts` | Hand-made visuals for 4 local answers (offline demo shows diagrams too) |
| `src/lib/ai.ts` | Request queue (max concurrency), one retry on HTTP 429, token count in logs |
| `src/app/api/extra/chat/route.ts` | Returns `draw` (visual no longer inside the chat call) |

**Design decision: the model never writes SVG/HTML**

The agent only returns a tiny JSON **visual spec**, and our components draw it:

| Kind | Use | Shape |
|------|-----|-------|
| `steps` | a process in order | 2–5 numbered boxes with arrows (label + short note) |
| `cycle` | something that repeats | 3–6 nodes on a ring with curved arrows |
| `compare` | 2–3 things side by side | coloured columns with 1–3 points each |
| `scale` | sizes or amounts | horizontal bars with values (linear scale) |
| `web` | parts of one thing | centre circle with 3–6 linked parts |

Why:
- **Safety:** no model-written markup ever reaches the page. Labels are plain strings rendered as SVG text (React escapes them), and `parseVisual()` drops anything that does not match the schema.
- **Quality:** a small free model writes reliable short JSON, but drawing SVG by hand is unreliable for it. Our layouts always fit a phone screen and use the age-skin theme colours.
- **Cost:** a spec is ~80–140 tokens.
- **No stock art**, as the task asked: every diagram is built from the child's own question.

**How (two steps, so chat stays fast)**
1. `/api/extra/chat` answers as before and adds `"draw": true|false`: true only when a process, cycle, comparison, sizes or parts would help; false for greetings and small talk.
2. The page shows the text right away (and speaks it). If `draw` is true, the message shows "Wondrix is drawing it for you…" and the page calls `/api/extra/visual` with the question + answer.
3. `aiExtraVisual()` asks for `{"visual": spec}` (temperature 0.3, max 260 tokens) and must match the answer without new facts. `parseVisual()` validates it.
4. The diagram is attached to **that** message by id, so it lands in the right place even if the child already asked something else.
5. The `<figure>` has the title as caption and an `aria-label` with all of its text (`visualText()`), so screen readers can read it.
6. **Offline / no key:** four local answers (wheels, Moon, plants, rain) include a hand-made spec, so the demo shows diagrams without AI too.
7. **Safety of the visual route:** the question and answer must pass the keyword gate. The returned labels pass the keyword gate too. The answer itself already passed the AI output check in step 1, so no extra model call is spent here. Known limit: `/api/extra/visual` trusts the answer text sent by the client. That is fine for this prototype; a production version should look the answer up server-side.

**Rate-limit protection (`ai.ts`)**
- The first live test put the diagram inside the chat call. That raised the output to ~200 tokens, about 5–6s at the free model's ~40 tokens/s, and sometimes >12s. Timed-out requests seem to keep running at Z.ai, and the next requests then got **HTTP 429 "Rate limit reached"**. That is why the two-step design above was chosen.
- **Queue:** every AI call from the server waits for a free slot. The default is **1 at a time on Z.ai** (4 on OpenAI) and can be changed with `AI_MAX_CONCURRENCY`, so our own server never fires parallel requests on the free tier.
- **Retry:** on HTTP 429, wait ~1.5–2s and try once more, then fall back to local content.
- **Timeouts:** the Extra chat answer may take up to 15s (spikes of 10–12s were seen); other calls keep 12s.
- Logs show the tokens used: `[ai] extra.visual ok 2595ms (zai:glm-4.5-flash) · 93 tok`.

**Tested**
- `npm run lint` → 0 problems. `tsc --noEmit` passes. `next build` passes.
- **Rendering:** all 5 kinds drawn in Chromium at phone width with long labels. All readable and nothing clipped. The scale value label was clipped at first ("1,392,700 k"); fixed with compact numbers ("1.4M km") and more room for the label.
- **Live Z.ai, 8 questions in a row: 0 errors, 0 rate limits.**
  - Drew for: Moon phases (`cycle`), Sun vs Earth (`scale`), parts of a robot (`web`), solid/liquid/gas (`compare`), rain (`cycle`).
  - Did not draw for: "hi!" and "favourite colour" (correct), and "how do plants drink water?" (a judgement call).
  - Chat ~2–5s (one 10s spike). Diagram ~2.3–4.2s, 79–138 tokens.
- **End-to-end UI (live):** "how big is the sun compared to earth?" → answer shown and spoken → "Wondrix is drawing it for you…" → a `compare` diagram (Sun vs Earth) appears in the same message, no page errors. One earlier run hit a 12s timeout and fell back to the local answer as designed; that is why the chat timeout is now 15s.
- Changed after testing: the `scale` bars use a **linear** scale. An earlier square-root version hid the point of "the Sun is 109× wider".

---

### `22b3549`: Fix all 8 ESLint errors (React 19 hooks rules), no behaviour change

**Files:** `src/lib/use-client-state.ts` (**new**), `src/lib/demo-store.ts`, `src/components/SetupGate.tsx`, `src/components/ParentLock.tsx`, `src/app/parent/page.tsx`, `src/app/school/page.tsx`, `src/app/school/practice/page.tsx`, `src/app/school/radar/page.tsx`, `src/app/extra/page.tsx`

**What:** `npm run lint` went from **8 errors to 0**. The errors were already in the code before our work:

| Rule | Where | Problem |
|------|-------|---------|
| `react-hooks/set-state-in-effect` (×7) | SetupGate, ParentLock, Parent, School, Practice, Radar, Extra | Reading localStorage in `useEffect` and calling `setState` right away: an extra render on every mount |
| `react-hooks/rules-of-hooks` (×1) | Extra | A normal click handler was named `useSuggestion`; the `use` prefix makes React treat it as a hook |

**How:** one React-recommended pattern per case, no `eslint-disable`.

1. **New hooks (`use-client-state.ts`), built on `useSyncExternalStore`**
   - `useHydrated()`: `false` on the server and in the hydration render, `true` after. The page still renders the same HTML on the server and the client, so there is no hydration mismatch.
   - `useProfileKey()`: a string made of the saved profile + mastery. It updates on `PROFILE_CHANGED_EVENT` (same tab) and `storage` (other tabs), the same events the old code listened to.
   - `useProfileGradeLabel()`: just the saved grade label, live.
   - `PROFILE_KEY` and `MASTERY_KEY` are now exported from `demo-store.ts`, so the keys are defined once.
2. **SetupGate / ParentLock:** `ready` comes from `useHydrated()`. "Show the gate" and "locked" are **computed during render** from localStorage. A local `closed`/`unlockedNow` state handles the button clicks.
3. **Parent page:** a small wrapper waits for hydration, then mounts `ParentHome`. `ParentHome` reads profile, PIN state and day summary with **lazy `useState` initializers**, which run once on the client. The summary text moved into a pure `daySummaryFor()` helper.
4. **School page**
   - Profile, mastery, grade and local focus are **derived with `useMemo` from `useProfileKey()`**.
   - The agent plan is set **only inside the fetch callbacks**, tagged with the profile key, so an old plan never shows after a profile change.
   - It now also cancels the request with `AbortController` when the profile changes or the page closes (the old code could set state after unmount).
5. **Practice page**
   - `requestQuestion()` is a pure async function with no React state. The effect calls it and sets state in `.then`, with a cancel flag.
   - "Next question" resets the view in the click handler.
   - The session is keyed by `skillId`, so a new skill starts fresh, which the old effect used to do by hand.
6. **Radar page:** `RadarPage` reads the live grade and renders `<RadarRun key={gradeLabel}>`. Changing grade in Parent remounts a fresh radar (same as the old `refresh()`). The question bank is a `useMemo`.
7. **Extra page**
   - The `?topic=` starter question is set with React's **"adjust state when a prop changes during render"** pattern: it remembers which topic was used to fill the input.
   - `useSuggestion` was renamed to `pickSuggestion`.

**Why**
- Every one of these effects caused a second render on mount. The React Compiler rules flag that because it can cause flicker and wasted work.
- A clean `npm run lint` keeps the repo ready for CI and for the PR to upstream, and new problems will stand out instead of hiding among old ones.

**Tested**
- `npm run lint` → **0 problems**. `tsc --noEmit` passes. `next build` passes.
- Full walk-through in headless Chromium (phone size) against the live Z.ai agent:
  1. First visit → **setup gate** shows → create PIN `1234` → setup `complete`, PIN stored.
  2. New tab `/parent` → **locked** → unlock with PIN → form loads → set **Year 7+** → Save → saved, and the day summary shows Year 7+ skills.
  3. `/school` → Year 7+ header. The live agent plan arrives (`algebra-intro`, `cells-micro`) with its coach note.
  4. `/school/practice?skill=algebra-intro` → question with AI lead-in → wrong answer → correct AI explanation ("3x = 12 … x = 4"), mastery saved as `shaky`.
  5. `/school/radar` → Year 7+ radar (5 checks).
  6. `/extra?topic=sky` → input prefilled with "Why does the Moon change shape?" → tap "Living things" → input and URL switch to the new topic.
  7. **No page errors and no console errors** (other than the blocked Kokoro model download, which is expected here).

---

### `f42c5f1`: Voice loading bubble (so the first voice download never looks like a frozen app)

**Files:** `src/components/VoiceLoadingBubble.tsx` (**new**), `src/app/extra/page.tsx`, `src/lib/tts/kokoro.worker.ts`

**What**
- A small floating bubble (bottom of the screen on phones, bottom-right on larger screens) appears while the natural voice is being prepared. It has a title, a short explanation, a progress bar with %, and a close button.
  - **First time:** "Getting Wondrix's voice ready… First time only: downloading the natural voice (about 80 MB). Keep chatting! A simple voice reads answers until it is ready."
  - **Later visits** (model already cached): "Waking up Wondrix's voice… Just a moment."
  - **When done:** "Natural voice ready!" for 2.5s, then it hides.
  - **If it cannot load** (no WebGPU/WASM support, blocked network): "Natural voice not available here … Wondrix uses the simple voice" for 4.5s, then it hides.
- The two small text labels next to the voice toggle were removed; the bubble replaces them.

**How**
- The bubble subscribes to `subscribeVoiceStatus()` (Kokoro engine only).
- **700 ms show delay:** when the model is already cached and loads almost instantly, the bubble never flashes. "Ready" and "failed" messages only show if the loading bubble was visible first. A fast silent failure just falls back to the browser voice without bothering the child.
- "First time or not" comes from `localStorage` (`wondrix-voice-ready-once`, set on the first `ready`), wrapped in try/catch for private mode.
- Accessibility: `role="status"` + `aria-live="polite"`, so screen readers announce it without interrupting; the close button has a label.
- It is only active while "Voice answers on" is enabled.
- **Worker progress fix:** transformers.js reports progress **per file**, and several files download in parallel, so the old % jumped back and forth. The worker now adds up `loaded/total` across all files and only sends a value when it goes **up** (capped at 99% until `ready`).

**Why**
- On first use the browser downloads ~80 MB. Without feedback a child (or a judge in the demo) could think the app froze. The bubble says what is happening, that it only happens once, and that they can keep chatting.

**Tested**
- `tsc --noEmit` passes. ESLint shows the same 8 errors as before (none new). `next build` passes.
- Headless Chromium at phone size (420×860), with Hugging Face requests held for 3s and then failed:
  - at 1.8s the bubble shows the first-time text with the progress bar
  - after the failure it switches to "Natural voice not available here"
  - it is gone 5s later
  - no page errors
- The visual check of the bubble layout on a phone-size screenshot looks right: it sits above the content, readable, and does not cover the input.

---

### `ad30426`: Stage 4: Natural voice with Kokoro (in-browser), Azure prepared, better browser voice

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
  - "make my classmate get hurt" → redirect. (Correction, found later by the unit tests: this one was actually blocked by the **AI**, not the keyword gate. The gate only matched "verb → person" order. Fixed in the test-suite commit.)
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
