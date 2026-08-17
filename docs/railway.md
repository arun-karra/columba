# Deploy Columba to Railway

Columba needs a hosted PostgreSQL database and the API server running over HTTPS so your iPhone does not need ngrok.

You must create the Railway project yourself (the agent cannot log into your Railway account). This guide walks through it step by step.

## What you will create

1. A **PostgreSQL** database on Railway (free trial credits, then pay-as-you-go)
2. An **API service** that runs `artifacts/api-server` and connects to that database

## Step 1 — Create a Railway account

1. Go to [https://railway.app](https://railway.app) and sign up (GitHub login works).
2. Create a **New Project**.

## Step 2 — Add PostgreSQL

1. In the project, click **+ New** → **Database** → **PostgreSQL**.
2. Open the Postgres service → **Variables** (or **Connect**).
3. Copy **`DATABASE_URL`** (starts with `postgresql://`).

## Step 3 — Deploy the API

### Option A — Deploy from GitHub (recommended)

1. **+ New** → **GitHub Repo** → select `arun-karra/columba`.
2. Set **Root directory** to `artifacts/api-server` (Railway settings → Service → Root Directory).
3. **Build command:** `pnpm install && pnpm run build && pnpm run prisma:generate`
   - If Railway runs from repo root instead, use:
     `cd ../.. && pnpm install && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run prisma:generate`
4. **Start command:** `node --enable-source-maps dist/index.mjs` (from `artifacts/api-server` after build).
5. Add **Variables** on the API service:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Paste from Postgres (Railway can reference `${{Postgres.DATABASE_URL}}`) |
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `JWT_SECRET` | Same as `SESSION_SECRET` or another random string |
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `APPLE_BUNDLE_ID` | `com.columba.notes` |

6. After first deploy, run migrations once (Railway **Shell** or one-off job):

```bash
pnpm exec prisma db push --schema ./prisma/schema.prisma
```

7. **Settings** → **Networking** → **Generate Domain** (e.g. `columba-api-production.up.railway.app`).

### Option B — Local API + Railway DB only

Keep running the API on your Mac but point it at Railway Postgres:

1. Create Postgres only (Step 2).
2. In `artifacts/api-server/.env` on your Mac:

```
DATABASE_URL=<paste Railway DATABASE_URL>
SESSION_SECRET=<random>
NODE_ENV=development
DEV_BYPASS_CODE=columba-dev
PORT=8080
```

3. Run `pnpm --filter @workspace/api-server run prisma:push` then `run dev`.

## Step 4 — Point the iOS app at Railway

1. Copy your Railway **public hostname** (no `https://`), e.g. `columba-api-production.up.railway.app`.
2. In [expo.dev](https://expo.dev) → project **columba** → **Environment variables**:
   - Name: `EXPO_PUBLIC_DOMAIN`
   - Value: your Railway hostname
   - Environments: development, preview, production
3. Rebuild the dev client after auth changes:

```bash
cd artifacts/ios-app
eas build --profile development-simulator --platform ios
```

For **local Simulator** testing without ngrok, leave `EXPO_PUBLIC_DOMAIN` unset and run the API on `localhost:8080` — the app uses `http://localhost:8080` automatically in dev.

## Dev bypass (no Apple account needed)

1. Set `DEV_BYPASS_CODE` on the API (e.g. `columba-dev`) — **never in production** unless you accept the risk.
2. In the app auth screen, **tap the Columba logo 20 times** → enter the code.

## Cost notes

- Railway Postgres + a small API service typically fits within trial credits for development.
- You still need an **Apple Developer** account ($99/year) for Sign in with Apple on real devices and TestFlight.

## Troubleshooting

| Problem | Fix |
|---|---|
| API 502 on Railway | Check deploy logs; ensure `PORT=8080` and start command uses `dist/index.mjs`. |
| Database connection errors | Verify `DATABASE_URL` on the API service matches Postgres. |
| Apple sign-in fails | `APPLE_BUNDLE_ID` must match `com.columba.notes`; enable Sign in with Apple in Apple Developer portal for that App ID. |
| App "network failed" | Set `EXPO_PUBLIC_DOMAIN` to Railway hostname in EAS, or use local API + unset domain on Simulator. |
