# Wondrix — First family user test report

**Date of session:** ~18–19 Nov 2026 (tester messages + screen recording)  
**Product:** Wondrix web app (Wonder chat + Parent setup; School planned for next day)  
**Deploy observed:** `phi.vercel.app` (Vercel)  
**Evidence:** Instagram DM feedback from tester “ARABIC_M…”, screenshots, and screen recording `b67f3a9c16014bf1beb5617877035c20.MOV` (~18s)

---

## 1. Summary

Two children tried Wondrix on the same iPhone:

| Child   | Focus                         | Overall |
|---------|-------------------------------|---------|
| **Mansur** | Wonder (EN → RU via browser) | Topics liked; **reading fatigue** without reliable voice |
| **Amira**  | Wonder (EN + AR)             | **Strong like**; asked if she can install the app |

**Wins:** simple UI, good topic answers (animals, astronomy, sensitive anatomy Qs handled calmly), Arabic UI usable, diagram answers (moon phases / light scattering) worked.

**Top blockers:** voice often late / incomplete / “No sound available”; dark-mode Parent form unreadable; chat auto-scroll hides start of answers; mic STT unreliable.

---

## 2. Environment

| Item | Detail |
|------|--------|
| Device | **iPhone 15 Pro** |
| Browser | **Google Chrome** (mobile) |
| App language | EN and AR toggled in-app |
| Device / browser language | Russian (browser translate + Cyrillic keyboard visible) |
| Sections exercised | Wonder chat, Parent child settings (theme / age / curriculum / year) |
| Sections **not** finished | **School** (Mansur left; Amira planned “tomorrow”) |

---

## 3. Session A — Mansur

### What went well
1. Topic cards felt interesting; he chose **robots**, then asked about **animals**.
2. Learned a memorable fact (chameleons change colour for mood / temperature, not only camouflage).

### Issues / friction
1. **Voice did not work at first** → they read English, then Russian (browser translate).
2. Lost interest because **chat required a lot of reading**; asked for voice “like Alisa / AI assistants”.
3. **School** not tried — he left mid-session.

### Device note
Same phone/browser as Amira: iPhone 15 Pro, Google browser.

---

## 4. Session B — Amira

### What went well
1. **“Really liked it”** — described as natively clear and simple.
2. Worked in **English and Arabic**; browser also translated UI/content toward Russian for the adult.
3. Asked about **astronomy**, then other topics; then stress-tested **anatomy / periods** — answers described as **correct, simple, understandable**.
4. Also tried **recipes**-style curiosity questions.
5. Asked if she can **download the app for herself**.

### Issues / friction
1. **Voice load delay** — eventually played, but sometimes **stopped before finishing** the chat answer.
2. Amira identified spoken Arabic as **Egyptian dialect** (not Gulf / MSA she expected).
3. **Chat mic (STT)** sometimes failed to recognise what she said.
4. Curiosity about **hiding Wonder search/chat history from parents** (privacy / trust question — product decision, not just a bug).
5. **Feature ask (bilingual):** tips that translate **specific words she doesn’t know** — Arabic → English and **vice versa** (EN → AR). Helpful for kids who mix languages rather than full-page translation.

### Parent dark theme (Amira profile)
While trying **Dark**:
- Labels / controls under **Grade / year** (and nearby selects) were **black-on-dark → unreadable**.
- Family switched back to **Light** immediately.
- Profile filled as: nickname **Amira**, age **10**, curriculum **British (UK)**, year ~**Year 6**.

### Chat scroll UX
When an answer appears, the thread **jumps up** so the **start of the answer is off-screen**; child must drag to see the beginning. Confusing on first use.

---

## 5. Screen recording notes (`…5c20.MOV`)

Short Wonder clip on `phi.vercel.app` (EN):

- Question: “Why does the Moon shine at night?”
- Visual card: moon-phase style explanation + **Listen**
- Reply addresses **Mansour** / moon reflection metaphor
- UI shows **“Preparing voice…”** then Speak/Stop — matches tester reports of delayed / flaky voice
- App chrome in EN; phone Safari/Chrome chrome shows Russian (“Спросить”)

Also captured in stills from the family: Arabic Wonder answer about **light scattering** (`تشتت الضوء`) with **Speaking / Stop**, plus follow-up chips — Arabic path works when voice succeeds.

---

## 6. Bug / UX backlog (prioritised)

| ID | Severity | Area | Finding | Suggested fix |
|----|----------|------|---------|----------------|
| T1 | **P0** | Voice (TTS) | First play often fails or shows “No sound available…”; second Listen sometimes works; answers cut off mid-read | Harden ElevenLabs path; retry; never show Azure copy; ensure auto-speak after reply |
| T2 | **P0** | Parent dark mode | Grade/year (and similar selects) unreadable (dark text on dark surface) | Fix select / option / label colours for dark theme |
| T3 | **P1** | Wonder chat | New answer scrolls so **start** is hidden | Scroll so new agent message **top** stays in view (or pin start) |
| T4 | **P1** | Voice (TTS) | Arabic voice perceived as **Egyptian**; cutoffs | Prefer Gulf/MSA-friendly settings if available; longer/stable playback |
| T5 | **P1** | Voice (STT) | Mic often mishears on iPhone Chrome | Locale (`ar-AE` etc.), UX fallback (“type it”), clearer error |
| T6 | **P2** | Product | “Can I hide history from parents?” | Decide Parent visibility vs kid privacy; clear copy |
| T7 | **P2** | Product | “Can I download the app?” | Clarify PWA / Add to Home Screen vs store app |
| T8 | **P2** | School | Not tested yet | Schedule School pass with Amira |
| T9 | **P2** | Wonder / bilingual | Want **word-level tips**: unknown Arabic → EN, and unknown English → AR | Tap-a-word or “hard words” gloss under answers; both directions |

---

## 7. What’s already working (keep)

- First-run / Parent child card flow (nickname, age → suggested year) is understandable.
- Wonder topic flow + diagrams engage kids when voice works.
- Sensitive Qs (periods) handled appropriately in this sample.
- EN + AR UI switching works at a basic level.
- Age 10 / Year 6 British curriculum path usable for Amira.

---

## 8. Recommended next test plan

1. Retest **Wonder EN + AR** on iPhone 15 Pro Chrome after TTS fixes (auto-speak + Listen + stop mid-sentence).
2. Retest **Parent Dark** on grade/year + curriculum dropdowns.
3. Retest **chat scroll** with long Arabic answers.
4. First full **School** pass (practice question + Listen + Reading) with Amira.
5. Note dialect preference if Gulf Arabic is required for Dubai demo.
6. Prototype **bilingual word tips** (tap unknown word → short EN↔AR gloss) on one Wonder answer.

---

## 9. Source material

- Tester DMs (Russian) from family contact testing with **Mansur** then **Amira**
- Screenshots: dark Parent form contrast, Wonder moon card + “No sound…”, Arabic light-scattering answer
- Recording: `/Users/luminaenvision/Downloads/b67f3a9c16014bf1beb5617877035c20.MOV`

---

*Report compiled for the Wondrix team from the first external kid test. Not a substitute for formal QA checklists.*
