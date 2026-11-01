#!/usr/bin/env bash
# Run every check of the Wondrix repo in one go, with a summary at the end.
#
#   npm run check                 # lint, typecheck, unit + API tests, build, end-to-end
#   npm run check -- --quick      # skip build + end-to-end (fast, ~10s)
#   npm run check -- --eval       # also run the live agent eval (real Z.ai tokens, needs ZAI_API_KEY)
#
# It also prepares the machine when needed:
#   - old CPUs ("Illegal instruction"): swaps Rollup's native binary for the WebAssembly build
#     (local only: package.json and the lockfile are not changed)
#   - installs Playwright's Chromium the first time end-to-end tests run

set -u
cd "$(dirname "$0")/.."

QUICK=0
EVAL=0
for arg in "$@"; do
  case "$arg" in
    --quick) QUICK=1 ;;
    --eval) EVAL=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 2 ;;
  esac
done

bold=$(printf '\033[1m'); green=$(printf '\033[32m'); red=$(printf '\033[31m'); yellow=$(printf '\033[33m'); reset=$(printf '\033[0m')
results=()
failed=0

step() {
  local name="$1"; shift
  echo
  echo "${bold}▶ ${name}${reset}"
  local start=$SECONDS
  if "$@"; then
    results+=("${green}✔${reset} ${name} ($((SECONDS - start))s)")
  else
    results+=("${red}✘${reset} ${name} ($((SECONDS - start))s)")
    failed=1
  fi
}

# --- Machine preparation -------------------------------------------------

if [ ! -d node_modules ]; then
  echo "${yellow}node_modules missing: running npm ci${reset}"
  npm ci || exit 1
fi

# Old CPUs: the native Rollup binary used by Vitest crashes with "Illegal instruction".
if ! node -e "require('@rollup/rollup-linux-x64-gnu')" >/dev/null 2>&1 && [ "$(uname -s)" = "Linux" ] && [ "$(uname -m)" = "x86_64" ]; then
  if [ "$(node -p "require('rollup/package.json').name" 2>/dev/null)" != "@rollup/wasm-node" ]; then
    ver=$(node -p "require('rollup/package.json').version" 2>/dev/null || echo "4")
    echo "${yellow}Native Rollup does not run on this CPU: installing the WebAssembly build (local only)${reset}"
    npm install --no-save --no-audit --no-fund "rollup@npm:@rollup/wasm-node@${ver}" >/dev/null || exit 1
  fi
fi

# --- Checks ------------------------------------------------------------------

step "Lint (ESLint)" npm run --silent lint
step "Typecheck (tsc)" npm run --silent typecheck
step "Unit + API tests (Vitest, AI faked)" npm run --silent test

if [ "$QUICK" -eq 0 ]; then
  step "Production build" npm run --silent build
  if ! ls -d "${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"/chromium_headless_shell-* >/dev/null 2>&1; then
    echo "${yellow}Installing Playwright Chromium (first run only)${reset}"
    npx playwright install chromium || true
  fi
  step "End-to-end tests (Playwright, phone + desktop)" npm run --silent test:e2e
fi

if [ "$EVAL" -eq 1 ]; then
  if grep -qE '^ZAI_API_KEY=.+' .env.local 2>/dev/null || [ -n "${ZAI_API_KEY:-}" ]; then
    run_eval() {
      local port=3177
      npx next start -p "$port" >/tmp/wondrix-eval-server.log 2>&1 &
      local pid=$!
      for _ in $(seq 1 30); do curl -s "http://localhost:$port" >/dev/null && break; sleep 1; done
      EVAL_BASE_URL="http://localhost:$port" npm run --silent eval
      local code=$?
      kill "$pid" 2>/dev/null
      return $code
    }
    [ "$QUICK" -eq 1 ] && step "Production build" npm run --silent build
    step "Live agent eval (real model)" run_eval
  else
    results+=("${yellow}–${reset} Live agent eval skipped (no ZAI_API_KEY in .env.local)")
  fi
fi

# --- Summary -------------------------------------------------------------------

echo
echo "${bold}──────── Summary ────────${reset}"
for r in "${results[@]}"; do echo "  $r"; done
echo
if [ "$failed" -eq 0 ]; then
  echo "${green}${bold}All checks passed.${reset}"
else
  echo "${red}${bold}Some checks failed. Scroll up for details.${reset}"
fi
exit "$failed"
