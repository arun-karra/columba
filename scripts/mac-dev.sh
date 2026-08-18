#!/usr/bin/env bash
# Starts API + Metro for Simulator dev. Run from repo root: pnpm mac:dev
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/artifacts/api-server/.env" ]]; then
  echo "No API .env found. Run first: pnpm mac:setup"
  exit 1
fi

if [[ ! -f "$ROOT/artifacts/api-server/dist/index.mjs" ]]; then
  echo "API not built yet. Running pnpm mac:setup..."
  bash "$ROOT/scripts/mac-setup.sh"
fi

cleanup() {
  echo ""
  echo "Stopping Columba dev servers..."
  jobs -p | xargs -r kill 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo ""
echo "Columba dev — API :8080 + Metro :8081"
echo "======================================"
echo ""
echo "In the Simulator:"
echo "  1. Open the Columba app (your existing dev build)"
echo "  2. Tap  localhost:8081  on the home screen"
echo "  3. Sign in: tap the logo 20 times → enter  columba-dev"
echo ""
echo "If a feature needs new native code (e.g. voice dictation), rebuild the"
echo "simulator app once:  pnpm mac:sim   OR   cd artifacts/ios-app && npx expo run:ios"
echo ""
echo "Press Ctrl+C here to stop both servers."
echo ""

echo "→ Syncing database schema (adds columns like User.displayName)..."
pnpm --filter @workspace/api-server run prisma:push

echo "→ Building API (picks up latest routes like /me)..."
pnpm --filter @workspace/api-server run build

pnpm --filter @workspace/api-server run start &
sleep 2
pnpm --filter @workspace/ios-app run start
