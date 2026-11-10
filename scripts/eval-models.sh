#!/usr/bin/env bash
# Run the Wondrix agent eval against several models, one after another.
# Each model gets its own production server, so the REAL prompts, JSON parsing,
# safety checks and fallbacks are what is measured (docs/MODEL_TEST.md).
#
# Usage:
#   scripts/eval-models.sh google/gemini-2.5-flash-lite anthropic/claude-haiku-5.5
#   scripts/eval-models.sh zai                 # baseline: the current Z.ai setup
#   scripts/eval-models.sh openai/gpt-5-nano@minimal   # model@effort when reasoning cannot be off
#   node scripts/eval-compare.mjs              # one table for all runs
#
# Keys come from the environment or .env.local (OPENROUTER_API_KEY, ZAI_API_KEY,
# OPENAI_API_KEY for moderation); never write them into files in the repo.
set -euo pipefail
cd "$(dirname "$0")/.."
# Not the e2e port (3199), so a run never leaves a stale server for Playwright.
PORT="${EVAL_PORT:-3299}"
mkdir -p eval-results

if [ "$#" -eq 0 ]; then
  echo "Give one or more model ids (OpenRouter 'provider/model') or 'zai'."
  exit 2
fi
if [ ! -d .next ]; then npm run build; fi

for model in "$@"; do
  echo "=== $model ==="
  reasoning=""
  id="$model"
  if [ "$model" = "zai" ]; then
    provider="zai"
  else
    provider="openrouter"
    case "$model" in *@*) reasoning="${model#*@}"; id="${model%@*}" ;; esac
  fi
  logname="eval-results/server-$(echo "$model" | tr '/' '_').log"
  # Own process group, so stopping it also stops the next-server child.
  AI_PROVIDER="$provider" OPENROUTER_MODEL="$id" OPENROUTER_REASONING="$reasoning" OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-proxy-injected}" setsid npx next start -p "$PORT" >"$logname" 2>&1 &
  pid=$!
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null "http://localhost:$PORT"; then break; fi
    sleep 0.5
  done
  EVAL_BASE_URL="http://localhost:$PORT" EVAL_LABEL="$model" node scripts/eval-agents.mjs || true
  kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
done
