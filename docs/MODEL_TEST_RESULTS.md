# Model test results (Nov 10, 2026)

Run with `scripts/eval-models.sh` (our real app, one production server per model) and `scripts/eval-compare.mjs`. Same suite for every model: 36 cases, about 133 automatic checks (Extra, Social, Arabic, Draw, Safety, School). Brief: [`MODEL_TEST.md`](./MODEL_TEST.md). OpenRouter with `provider.data_collection = "deny"` (only hosts that do not store or train on prompts). No OpenAI key yet, so the safety check used each model's own classifier. Latency measured from our cloud machine (USA), not Dubai: good for comparing models, not absolute.

**Verdict: switch from the free Z.ai tier. Best value: `z-ai/glm-5.3-flash` via OpenRouter, reasoning "minimal", for both Extra and School.** It passed 99% of checks with no fallbacks, p50 2.0 s, p95 5.6 s, at about $0.011 per 100 child turns (about $5 a month for 50 children asking 30 questions a day). It is the newer generation of the model family we use today. It is open-weight and was served by US hosts, not from China. Backups: **Claude Haiku 5.5** (97%, p95 3.8 s, steady tone, $0.035 per 100 turns) or **Gemini 2.5 Flash-Lite** (96%, fastest at p95 2.0 s, but answers run long).

## Table

| Model (OpenRouter id) | All checks | Extra | Social | Arabic | Draw | Safety misses | School | Fallbacks | p50 ms | p95 ms | $/1M in / out | $ per 100 turns |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **z-ai/glm-5.3-flash** (minimal) | **99%** | 100% | 100% | 100% | 100% | 0 | 95% | 0 | 2001 | 5601 | 0.04 / 0.08 | **$0.011** |
| deepseek/deepseek-v4-flash | 99% | 98% | 100% | 100% | 100% | 0 | 100% | 0 | 2404 | **12803** | 0.09 / 0.18 | $0.026 |
| qwen/qwen3.7-flash | 98% | 100% | 100% | 100% | 94% | 0 | 95% | 0 | 2838 | 3885 | 0.03 / 0.13 | $0.010 |
| mistralai/mistral-small-3.2-24b-instruct | 98% | 98% | 100% | 100% | 94% | 0 | 100% | 0 | 2013 | 3923 | 0.10 / 0.30 | $0.031 |
| anthropic/claude-haiku-5.5 | 97% | 96% | 100% | 91% | 94% | 0 | 100% | 0 | 2587 | 3815 | 0.10 / 0.50 | $0.035 |
| openai/gpt-5-nano (minimal) | 97% | 98% | 100% | 100% | 83% | 0 | 100% | 0 | 2502 | 3575 | 0.05 / 0.40 | $0.021 |
| openai/gpt-4o-mini | 97% | 98% | 100% | 100% | 88% | 0 | 95% | 0 | 2108 | 3031 | 0.15 / 0.60 | $0.049 |
| google/gemini-3.8-flash (minimal) | 97% | 100% | 100% | 100% | 94% | 0 | 86% | 0 | 4395 | 7961 | 0.75 / 3.75 | $0.263 |
| meta-llama/llama-3.3-70b-instruct | 97% | 100% | 100% | 100% | 78% | 0 | 100% | 0 | 2459 | 6731 | 0.71 / 0.71 | $0.186 |
| google/gemini-2.5-flash-lite | 96% | 93% | 100% | 100% | 100% | 0 | 95% | 0 | **1525** | **2000** | 0.10 / 0.40 | $0.033 |
| **Baseline: Z.ai glm-4.5-flash (free)** | 84% | 79% | 100% | 100% | 44% | 0 | 100% | **8** | 12749 | 16909 | free | free |

Cost per 100 turns uses our average of about 2,400 input and 220 output tokens per turn. Monthly at 50 children × 30 turns × 30 days = 45,000 turns.

## Ranking

- **Extra:** 1. glm-5.3-flash · 2. qwen3.7-flash · 3. mistral-small-3.2 (gemini-3.8-flash scores 100% on Extra but is 20× the price and slower).
- **School:** 1. glm-5.3-flash · 2. Claude Haiku 5.5 · 3. mistral-small-3.2 (all calm, never grade; glm missed "Today:" once).
- **Best value overall:** glm-5.3-flash.

## Selection

Picked from the live catalogue (431 models): cheap or fast tiers, text chat, JSON, a spread of providers. 10: Claude Haiku 5.5, GPT-5 nano, GPT-4o mini, Gemini 2.5 Flash-Lite, Gemini 3.8 Flash (premium, Anastasia's AI Studio test), GLM-5.3 Flash, DeepSeek V4 Flash, Qwen 3.7 Flash, Mistral Small 3.2, Llama 3.3 70B.

Rejected: Llama 4 Scout (no host that refuses data collection), Gemini 3.1 Flash-Lite (third Google model, kept the cheaper one), Kimi K2.x and the Pro / Max tiers (expensive and long reasoning), all `:free` endpoints (they keep prompts). GPT-5 nano, GLM-5.3 Flash and Gemini 3.8 Flash cannot turn reasoning off, so they ran with `minimal`.

## Best examples

- glm-5.3-flash, young, "why does the moon change shape?": *"Ooh, I love this one, Mia! The moon does not really change shape. The Sun lights it up, and as the moon goes around Earth we see different amounts of the lit part, like peeking at a torch behind a ball from different sides. Next clear night, can you spot the moon…"*
- Claude Haiku 5.5, bedtime at 22:47: *"Good night, Mia! It is nearly 11 o'clock, so you are right to rest now. Sleep gives your brain and body energy for tomorrow's adventures, and the sky will still be there in the morning."*

## Worst failures

- **Z.ai free (today's setup):** 8 of 36 replies timed out and fell back to the offline answer; p95 16.9 s. This is the "machine broke" moment children saw.
- **Claude Haiku 5.5, Arabic moon question:** the raw JSON object showed up as the answer text. Our parser treated the reply as plain text. **Fix in our code** (extract a JSON object found inside text), not a reason to drop the model.
- **Gemini 3.8 Flash, School explanation:** cut off after "One half means": minimal reasoning still uses part of the token budget. Would need a higher `max_tokens`.
- **DeepSeek V4 Flash:** quality 99% but p95 12.8 s (slow hosts), above the 8 s bar.

## Risks

- **OpenRouter routing:** the same model id can be served by different hosts with different speed. We can pin a provider order once we pick.
- **Data location:** with `data_collection: deny`, GLM-5.3 Flash ran on US hosts (open weights). Qwen 3.7 Flash is only served by Alibaba, so children's prompts would go to Alibaba Cloud; prefer GLM or a non-Chinese model for the pilot.
- **Arabic:** the automatic checks only confirm Arabic script, one follow-up and safety. Tone and naturalness still need a native ear (one sample per finalist is in `eval-results/`).
- **Safety:** 0 misses for every model, but with an OpenAI key the safety check moves to OpenAI moderation (free, faster), whichever chat model we pick.

## Next step

Set the deployment to `AI_PROVIDER=openrouter`, `OPENROUTER_MODEL=z-ai/glm-5.3-flash`, `OPENROUTER_REASONING=minimal`, add the OpenAI key for moderation, fix the JSON-inside-text parsing, then rerun the eval once with the OpenAI key on.
