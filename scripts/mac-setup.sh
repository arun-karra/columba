#!/usr/bin/env bash
# One-time Mac setup for Columba local development.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "Columba — one-time Mac setup"
echo "=============================="
echo ""

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is not installed. Install Node 20+ then: npm install -g pnpm"
  exit 1
fi

echo "→ Installing dependencies (from repo root: $(pwd))..."
pnpm install

ENV_FILE="$ROOT/artifacts/api-server/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  MAC_USER="$(whoami)"
  cat > "$ENV_FILE" << EOF
DATABASE_URL=postgresql://${MAC_USER}@localhost:5432/columba
SESSION_SECRET=local-dev-secret-change-me
DEV_BYPASS_CODE=columba-dev
NODE_ENV=development
PORT=8080
EOF
  echo "→ Created artifacts/api-server/.env"
else
  echo "→ artifacts/api-server/.env already exists (left unchanged)"
fi

if ! grep -q '^DEV_BYPASS_CODE=' "$ENV_FILE" 2>/dev/null; then
  echo 'DEV_BYPASS_CODE=columba-dev' >> "$ENV_FILE"
  echo "→ Added DEV_BYPASS_CODE=columba-dev to .env"
fi

echo "→ Applying database schema..."
if ! pnpm --filter @workspace/api-server run prisma:push; then
  echo ""
  echo "Database setup failed. Common fixes on Mac:"
  echo "  1. Install Postgres: brew install postgresql@16 && brew services start postgresql@16"
  echo "  2. Create DB: createdb columba"
  echo "  3. Fix DATABASE_URL in artifacts/api-server/.env if your Postgres user is not $(whoami)"
  exit 1
fi

echo "→ Building API (first time only takes a moment)..."
pnpm --filter @workspace/api-server run build

echo ""
echo "Setup complete."
echo ""
echo "Next: run daily dev with:"
echo "  cd ~/columba && pnpm mac:dev"
echo ""
echo "See docs/easy-mac.md for the full cheat sheet."
echo ""
