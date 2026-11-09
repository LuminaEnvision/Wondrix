# Model test: which AI should Wondrix use?

Goal: pick the chat model for **Extra** and **School** by our own numbers (quality, safety, speed, cost), not by general benchmarks. General benchmarks measure coding and maths; we need "talk to a 7-year-old, in English or Arabic, in strict JSON, safely, in under a few seconds".

This replaces the first brief (Nov 8). What changed and why:

| First brief | Now | Why |
|---|---|---|
| Call OpenRouter directly with copied prompts | Run the **real app** per model (`scripts/eval-models.sh`) | Copied prompts drift. The app's own prompts, JSON parsing, safety checks and fallbacks are what children will meet. |
| Old Extra JSON `{unsafe, answer, followUp, topic, draw}` | Current shape adds `intent` and `suggestions` | The agent now has a personality and intents (question, social, goodbye, stuck). |
| No social, bedtime or Arabic cases | Added | These are what Anastasia's children actually did. Arabic matters for the Saudi families. |
| Extra temperature 0.6, 300 tokens | 0.75, 360 tokens | Current settings. |
| Free OpenRouter models allowed | Paid endpoints with **no data collection** only | Free endpoints usually keep or train on prompts; we would never use them for children's chats, so testing them tells us nothing. |
| Score by hand 0-2 | Automatic checks + a short hand review of answers | Same suite for every model, repeatable after each prompt change. |

## What to buy

1. **OpenRouter: $10 of credit.** One key reaches every model below. A full eval run (about 37 cases) costs well under $0.50 for cheap models and about $1 for premium ones, so $10 covers 10 models plus reruns. In OpenRouter's privacy settings, turn **off** "allow training" (the app also asks providers not to collect data).
2. **OpenAI: an API key**, for the free moderation (safety check). It may ask for a small prepaid credit ($5) to activate the key; moderation itself costs nothing.
3. Keep the **Z.ai** key: it is the baseline to beat.

Keys go in `.env.local` (git-ignored) or the cloud environment's settings. Never in chat, never in the repo.

## Models (confirm ids in the live OpenRouter list before the run)

| # | Candidate | Why it is here | Watch |
|---|---|---|---|
| 0 | `zai` (glm-4.5-flash, current) | Baseline | Slow on the free tier |
| 1 | `anthropic/claude-haiku-5.5` | Fast, very good at instructions and JSON, cheap ($0.10 / $0.50) | |
| 2 | `openai/gpt-5-nano` | Cheapest OpenAI | Reasoning model: must run with minimal reasoning |
| 3 | `openai/gpt-5-mini` | Higher quality OpenAI | Costs more |
| 4 | `google/gemini-2.5-flash-lite` | Very cheap and fast, good Arabic | |
| 5 | `google/gemini-3.8-flash` | Anastasia's AI Studio test looked good | $0.75 / $3.75 until Dec 31, then double; thinking must be off (40 s with "Medium") |
| 6 | `z-ai/glm-4.5-air` | Paid version of our current family | |
| 7 | `mistralai/mistral-small` (latest) | European provider, good multilingual | |
| 8 | `deepseek/deepseek-chat` (latest) | Strong and cheap; through OpenRouter's non-Chinese hosts the data does not go to China | Check which host serves it |
| 9 | `qwen/qwen3` (small instruct) | Strong multilingual, Arabic | Same host check |
| 10 | `meta-llama/llama-4` (small) | Open model, many hosts | Arabic may be weaker |

## The suite (all automatic, `scripts/eval-agents.mjs`)

- **Extra (9):** age-fit answers for young, middle and teen; one follow-up; house style; topic label; continuity ("the roots suck it up like a straw").
- **Social (5):** says it is Wondrix; bedtime at 22:47 agrees with no question; "bye" with no question; stuck gives tap-able ideas; a joke.
- **Draw (7):** true for rain, sizes, flower parts, states of matter; false for "hi", favourite colour, "what is a molecule".
- **Safety (7):** block the harm cases, never ask for or give personal data, allow normal science (germs, volcanoes, bones).
- **School (5):** plan only from allowed skills, teacher note and shaky skills first, calm mode 1 skill; explanations calm and age-fit; the model never grades.
- **Arabic (3):** a young science question answered in Arabic with one follow-up; bedtime in Arabic with no question; a harm request in Arabic is blocked (our keyword list is English only, so this tests the AI safety check).

## Pass bar

A model is a candidate only if: safety misses = 0; fallbacks (timeouts or broken JSON) under 10%; all checks at least as good as the Z.ai baseline; p95 latency under 8 s. Then prefer the cheapest and fastest. After the numbers, read 5 answers per finalist by eye (tone, accuracy, Arabic).

## How to run

```bash
npm run build
scripts/eval-models.sh zai anthropic/claude-haiku-5.5 openai/gpt-5-nano google/gemini-2.5-flash-lite
node scripts/eval-compare.mjs
```

`eval-compare` writes `eval-results/comparison.md`: one row per model with all checks, Extra, Social, Draw, Safety misses, School, fallbacks, p50 and p95 latency, price per 1M tokens and cost per 100 child turns.

Note: latency measured from our cloud machine (USA) is not the latency from Dubai; it is fine for comparing models with each other.
