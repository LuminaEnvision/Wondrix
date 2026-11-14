# Deploy Wondrix for phone testers

The app is ready for phones: it installs from the browser ("Add to Home Screen") with the owl icon, opens full screen, uses the phone's own voice (no 80 MB download), and each device is limited to 40 AI calls a minute so a public link cannot burn the AI budget.

## Where

Both work with zero code changes. Pick one account that will own the test link (Anastasia's).

| | Vercel | Netlify |
|---|---|---|
| Next.js 16 | Made by the Next.js team, everything works first | Supported with zero config through its Next.js adapter |
| Free plan | Hobby: free, meant for non-commercial use (fine for testing) | Free plan, fine for testing |
| Long AI calls | Our calls take 2 to 6 s with GLM-5.3 Flash, inside both limits | Same; check the function time limit on your plan if replies get cut off |
| Recommendation | **First choice** for the least surprises | Fine if you already use Netlify |

## Steps (about 10 minutes)

1. Log in to Vercel or Netlify **with GitHub** and import `LuminaEnvision/Wondrix` (branch `main`). The build command and output are detected (`npm run build`).
2. Add the environment variables below in the project settings, then deploy.
3. Open the link on a phone, check one Wonder question, one School question, and Parent in Arabic.
4. Share the link. Every push to `main` redeploys automatically.

### Environment variables

| Name | Value | Notes |
|---|---|---|
| `AI_PROVIDER` | `openrouter` | Use OpenRouter for the chat (model test winner) |
| `OPENROUTER_API_KEY` | the OpenRouter key | Secret. The key's $ limit in OpenRouter is the safety net |
| `OPENROUTER_MODEL` | `z-ai/glm-5.3-flash` | See `docs/MODEL_TEST_RESULTS.md` |
| `OPENROUTER_REASONING` | `minimal` | This model cannot turn reasoning off |
| `OPENAI_API_KEY` | an OpenAI key (optional) | Free moderation: faster safety check, better in Arabic |
| `ZAI_API_KEY` | (leave empty) | Only if you want to go back to Z.ai |
| `AI_RATE_LIMIT_PER_MIN` | `40` (optional) | AI calls per device per minute |

Keys go only in the hosting settings. Never in the repo or a chat.

### Netlify note

Netlify installs its Next.js adapter automatically. If a reply is ever cut off, it is the function time limit: the app then shows the offline answer, so nothing breaks, but tell Jorge.

## Before sending the link

- In OpenRouter, keep a monthly limit on the key (today $15). Watch usage after the first day.
- Data stays on each device (no accounts yet). Tell families that clearing the browser clears the history.
- Testers on iPhone: Safari → Share → Add to Home Screen. Android: Chrome menu → Install app.

## What testers should check (short, for the family note)

Please send a screenshot and one sentence for anything odd. Most useful for us:

1. **Did your child know where to tap?** First screen, School, Wonder, Me.
2. **Speed:** anything that made your child wait more than a few seconds (and what it was doing).
3. **Voice:** did Wondrix speak? Did it sound OK in your language? Did the mic hear your child?
4. **Wonder answers:** anything wrong, too long, too hard, or not suitable for a child.
5. **School:** questions too easy or too hard for the grade; did the session end nicely?
6. **Arabic families:** sentences that sound translated or unnatural (please quote them).
7. **Phone details:** phone model and browser (for example iPhone 13, Safari).
