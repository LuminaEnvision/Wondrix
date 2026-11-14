# Next-stage notes

Living product order for Anastasia + Jorge. Updated after PR #14 (phone-ready app, model test, CI green) and Jorge’s tester / deploy notes.

Nothing here must land before the demo unless we both say so — except **deploy on Anastasia’s account**, which unblocks Founding Testers.

---

## Done (landed or in PR #14)

- Explorer / Teen UI, world theming, School | Wonder | Me, PWA install (owl icon), phone device voice (no big Kokoro download on mobile), per-device AI rate limit.
- School: bank question at once, explain-after-answer, calm look-again + calm owl, session end, parent session count in summary.
- Model winner: **GLM-5.3 Flash via OpenRouter** (`docs/MODEL_TEST_RESULTS.md`). Free Z.ai out as happy path.
- CI green on new UI labels (e2e + lint). Owl art frames (think / talk / calm).
- Deploy guide + tester checklist: `docs/DEPLOY.md`.

**Action:** merge PR #14 into `LuminaEnvision/Wondrix` `main` when ready, then deploy from Anastasia’s Vercel or Netlify (keys + public link stay with her).

---

## This week (before sending the link)

Owned mostly by **Anastasia** (product / account). Jorge supports env questions.

1. **Merge PR #14** → `main` auto-deploys once hosting is connected.
2. **Deploy** (Vercel preferred, Netlify fine) from Anastasia’s GitHub login: import `LuminaEnvision/Wondrix`, branch `main`, paste env from `docs/DEPLOY.md`:
   - `AI_PROVIDER=openrouter`
   - `OPENROUTER_API_KEY=…`
   - `OPENROUTER_MODEL=z-ai/glm-5.3-flash`
   - `OPENROUTER_REASONING=minimal`
   - `OPENAI_API_KEY=…` (optional but recommended — free safety check, better in Arabic)
3. **Smoke on 2 phones** (iPhone + Android): one Wonder question, one School question, Parent in Arabic; Add to Home Screen.
4. **Native speaker** reviews Arabic UI, starters, topic seeds (`ar.ts` / `content-ar.ts`).
5. **One more School session** with kids ages ~5–8: does it feel like real practice, not slow calm mode?

### Founding Testers (program copy)

- Name: **Founding Testers** (not “lifetime”).
- Benefit: **free access while active**, reviewed every **6–12 months** (not lifetime free).
- Honest limit: **we cannot revoke access per person until accounts exist** (Supabase later). Today data is on-device; clearing the browser clears the history.
- **Parent consent one-liner** (include in the invite note):  
  *This is a test. Your child’s chats and practice stay on this device. Questions are sent to an AI so Wondrix can answer. You can stop anytime by deleting the app / clearing the site data.*

Use the short checklist in `docs/DEPLOY.md` (lost taps, waiting, voice, odd answers, School difficulty, translated Arabic, phone + browser). Screenshot + one sentence each.

---

## First tester week

6. **Report a problem** in-app (screenshot + one sentence) so feedback is not only WhatsApp. (Build when the link is live.)
7. Read reports together; **fix the top 3** each week.

---

## Next stage (after first feedback)

Order that helps families in week two without boiling the ocean:

8. **Several children, one device** — on-device profiles keyed by child id (before Supabase so the data model is right).
9. **School bank depth** — fewer skills, 15–20 items each; Jorge drafts Arabic bank, native speaker checks. Keep English-on-screen note honest until AR bank is real.
10. **Picture-first School (Y1–3)** — counting blocks, fraction bars, ruler.
11. **Shared School plan (Up next + gap map) for all ages; Teen tabs** — see `docs/SCHOOL_DASHBOARD_PLAN.md`. **Not before deploy / first feedback.**
12. **Arabic voice** — Azure Arabic neural voice trial; pick **one** voice gender for the owl and stick to it.

---

## Later

13. Supabase (accounts, sync, revoke Founding Testers), parent email summary, **homework photo upload (Teen)**, second Wonder topic row.
14. Pitch deck + demo video (English); both registered on the same championship team entry.

---

## Still open (feel / product)

- Arabic TTS still risks robotic / wrong-gender / silent on some devices → item 12.
- Home hero motion: still optional; prefer none or one small loop, not a busy dashboard.
- Wonder second topic row: after first feedback (later bucket).

---

## What not to do from this note

- Do not build the full School dashboard or homework upload before deploy + first Founding Tester week.
- Do not invite families before smoke on two phones + Arabic glance + one kids School sitting.
- Do not put API keys in the repo or in chat.
- Do not promise lifetime free or per-person revoke until accounts exist.
