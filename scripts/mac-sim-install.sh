#!/usr/bin/env bash
# Rebuild the Simulator dev client and install it (required after icon changes).
# Run from repo root: pnpm mac:sim:install
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/artifacts/ios-app"

echo ""
echo "Columba — refresh Simulator app (icon + native shell)"
echo "======================================================"
echo ""
echo "This replaces the installed dev client. Metro reload alone never updates"
echo "the home-screen or push-notification icon."
echo ""
echo "Using committed icon.png (run pnpm sync-icons only after replacing icon-source.png)."
echo ""
echo "→ Starting EAS simulator build (development-simulator)..."
echo "  Watch for FINISHED at https://expo.dev/accounts/arunkarra/projects/columba/builds"
echo ""

pnpm run eas:build:sim

echo ""
echo "→ Installing latest simulator build..."
pnpm exec eas build:run --platform ios --latest

echo ""
echo "Done. Open Columba on the Simulator, tap localhost:8081, then sign in."
echo "If the old green icon remains, delete the Columba app from the home screen"
echo "and run:  cd artifacts/ios-app && pnpm exec eas build:run --platform ios --latest"
echo ""
