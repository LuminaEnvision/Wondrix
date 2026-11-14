# Deploy Wondrix for phone testers

The app is ready for phones: it installs from the browser ("Add to Home Screen") with the owl icon, opens full screen, uses the phone's own voice (no 80 MB download), and each device is limited to 40 AI calls a minute so a public link cannot burn the AI budget.

PR #14 is on `main`. Deploy from **Anastasia’s** Vercel or Netlify account so keys and the public link stay with her. Every push to `main` redeploys.

---

## Deploy checklist (about 10 minutes)

Do these in order. Tick as you go.

### A. Hosting

- [ ] Log in to [Vercel](https://vercel.com) (preferred) or [Netlify](https://netlify.com) **with GitHub** as Anastasia / LuminaEnvision.
- [ ] **Add New Project** → import `LuminaEnvision/Wondrix`.
- [ ] Branch: `main`. Build command should auto-detect (`npm run build`).
- [ ] Do **not** deploy yet until env vars are set (or redeploy after adding them).

### B. Environment variables (Project Settings → Environment Variables)

Add for Production (and Preview if you want preview deploys to work):

| Name | Value | Required |
|---|---|---|
| `AI_PROVIDER` | `openrouter` | Yes |
| `OPENROUTER_API_KEY` | your OpenRouter secret key | Yes |
| `OPENROUTER_MODEL` | `z-ai/glm-5.3-flash` | Yes |
| `OPENROUTER_REASONING` | `minimal` | Yes |
| `OPENAI_API_KEY` | your OpenAI key | Strongly recommended (free safety check, better in Arabic) |
| `AI_RATE_LIMIT_PER_MIN` | `40` | Optional (default is fine) |
| `ZAI_API_KEY` | leave empty | No |

- [ ] Paste vars. Never commit keys to git or paste them in chat.
- [ ] In OpenRouter dashboard: set a **monthly spend limit** on the key (e.g. $15).
- [ ] Deploy / Redeploy Production.

### C. Smoke test (desktop then 2 phones)

- [ ] Open the production URL. App loads (not a blank error page).
- [ ] **Wonder:** ask one short question; get an answer (or calm offline fallback).
- [ ] **School:** start practice; question appears without a long wait; finish or leave cleanly.
- [ ] **Me / Parent:** open Parent, switch language to Arabic, confirm UI reads OK.
- [ ] **iPhone:** Safari → Share → Add to Home Screen → open from icon (full screen, owl icon).
- [ ] **Android:** Chrome → Install app / Add to Home screen → same check.
- [ ] Mic: one short voice ask on at least one phone (if permission allowed).

### D. Before inviting Founding Testers

- [ ] Native speaker glance at Arabic UI / starters if available.
- [ ] One School sitting with kids ~5–8 (does it feel like practice, not slow calm mode?).
- [ ] Invite note includes **Founding Testers** terms + consent (below).
- [ ] Share checklist in “What testers should check”.

---

## Where (Vercel vs Netlify)

| | Vercel | Netlify |
|---|---|---|
| Next.js 16 | Made by the Next.js team, everything works first | Supported with zero config through its Next.js adapter |
| Free plan | Hobby: free, meant for non-commercial use (fine for testing) | Free plan, fine for testing |
| Long AI calls | Our calls take 2 to 6 s with GLM-5.3 Flash, inside both limits | Same; check the function time limit on your plan if replies get cut off |
| Recommendation | **First choice** for the least surprises | Fine if you already use Netlify |

### Netlify note

Netlify installs its Next.js adapter automatically. If a reply is ever cut off, it is the function time limit: the app then shows the offline answer, so nothing breaks, but tell Jorge.

---

## Founding Testers (invite copy)

- Call the program **Founding Testers**.
- Benefit: **free access while they stay active**, reviewed every **6–12 months** (not lifetime free).
- Honest limit: **we cannot revoke access per person until we have accounts** (Supabase later). Today everything stays on the device; clearing the site / deleting the home-screen app clears their history.

**Parent consent (one line to include in the invite):**  
This is a test. Your child’s chats and practice stay on this device. Questions are sent to an AI so Wondrix can answer. You can stop anytime by deleting the app or clearing the site data.

---

## What testers should check (short, for the family note)

Please send a screenshot and one sentence for anything odd. Most useful for us:

1. **Did your child know where to tap?** First screen, School, Wonder, Me.
2. **Speed:** anything that made your child wait more than a few seconds (and what it was doing).
3. **Voice:** did Wondrix speak? Did it sound OK in your language? Did the mic hear your child?
4. **Wonder answers:** anything wrong, too long, too hard, or not suitable for a child.
5. **School:** questions too easy or too hard for the grade; did the session end nicely?
6. **Arabic families:** sentences that sound translated or unnatural (please quote them).
7. **Phone details:** phone model and browser (for example iPhone 13, Safari).
