# Columba

A shared-notes iOS app with a REST API backend. Create personal and group notes, pin urgent ones to your lock screen, and complete them with a single long-press — no need to open the app.

---

## Features

- **Email sign-in** — passwordless, code-based auth (6-digit OTP). Dev bypass: any email + code `000000`.
- **Notes** — title, body, urgent flag, reminders, mark done/reopen, delete.
- **Pin to Home** — pinning a note fires a Time-Sensitive push notification that lives on the lock screen. Long-press → *Mark as Complete* dismisses it and marks the note done in the background.
- **Share with groups** — share any note with a group; all members see and can complete it.
- **Groups** — create groups, invite members by email, remove members, leave.
- **Push notifications** — Expo push (APNs) for pinned alerts, reminders, and group invites.

---

## Stack

| Layer | Technology |
|---|---|
| iOS app | Expo / React Native (TypeScript) |
| Fonts | Manrope via `@expo-google-fonts/manrope` |
| Navigation | Expo Router (file-based) |
| Data fetching | React Query + Orval-generated hooks |
| Backend | Node.js, Express 5, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Replit built-in) |
| Push | expo-server-sdk (APNs via Expo) |
| Validation | Zod |
| API spec | OpenAPI 3.0 (`lib/api-spec/openapi.yaml`) |

---

## Monorepo structure

```
artifacts/
  api-server/          # Express REST API (port 8080)
  ios-app/             # Expo iOS app

lib/
  api-spec/            # OpenAPI 3.0 source of truth
  api-client-react/    # React Query hooks (Orval-generated, manually maintained)
  api-zod/             # Zod validators + TypeScript types (Orval-generated, manually maintained)
```

> **Note on codegen** — the generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` are edited manually when the API spec changes. There is no automated orval step wired into the build.

---

## Getting started

### Prerequisites

- Node 20+
- pnpm 9+
- A PostgreSQL database (or use Replit's built-in)

### Install

```bash
pnpm install
```

### Environment variables

Create `artifacts/api-server/.env` (or set these as Replit secrets):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | JWT signing secret |
| `JWT_SECRET` | | Falls back to `SESSION_SECRET` |
| `RESEND_API_KEY` | | Email delivery (console.log fallback in dev) |
| `FROM_EMAIL` | | Sender address for auth codes |
| `EXPO_ACCESS_TOKEN` | | Expo push notifications (optional in dev) |

### Database

```bash
cd artifacts/api-server
pnpm exec prisma db push
```

### Run locally

```bash
# API server (port 8080)
pnpm --filter @workspace/api-server run dev

# iOS app (Expo)
pnpm --filter @workspace/ios-app run dev
```

Then scan the QR code with Expo Go (iOS) or open in a simulator.

> **Expo Go cannot pin notes to the lock screen.** Custom notification actions need a development build (see below).

### EAS / development builds

This is a **pnpm monorepo**. The Expo app lives in `artifacts/ios-app`, not the repo root. EAS config (`eas.json`, `app.json`) must be used from that folder.

The name **workspace** you may see in the terminal is only the npm package name of this repo (`package.json` → `"name": "workspace"`). It is not your Expo project. Your Expo account is **arunkarra** and the Expo project is **columba**.

If this GitHub repo is linked on [expo.dev](https://expo.dev), set **Base directory** to `artifacts/ios-app` (Project → GitHub settings). Leaving it as `/` makes Expo look at the repo root, where there is no app.

`EXPO_PUBLIC_DOMAIN` (API hostname, no `https://`) must be set as an EAS Environment Variable for each environment (`development`, `preview`, `production`). Do not put API keys, JWT secrets, or signing credentials in `eas.json` — those stay in EAS Environment Variables / EAS Credentials (`credentialsSource: remote`).

#### One-time setup

1. Install [Node.js 20+](https://nodejs.org/) and [pnpm](https://pnpm.io/installation) if you do not have them.
2. Log in to [expo.dev](https://expo.dev) as **arunkarra** (the account that owns the **columba** project).
3. On your computer, in a terminal:

```bash
cd /path/to/columba
pnpm install
npm install -g eas-cli
eas login
cd artifacts/ios-app
eas init
```

`eas init` links this app to your Expo project and writes `extra.eas.projectId` into `app.json`. That is expected — commit that change. If it asks to create a new project vs link an existing one, choose the existing **columba** project under **arunkarra**.

4. In [expo.dev](https://expo.dev) → **columba** → **Environment variables**, add `EXPO_PUBLIC_DOMAIN` (public) for the **development** environment. Use your API host without `https://`, for example `columba.example.com`.
5. For a **physical iPhone** build you need a paid [Apple Developer](https://developer.apple.com) account. EAS will ask to manage credentials the first time — say yes. For **Simulator only**, skip Apple credentials (the `development-simulator` profile already sets `withoutCredentials`).

#### Create the native app (once per native-change)

From the repo root:

```bash
pnpm eas:build:sim          # iPhone Simulator (easiest first build)
pnpm eas:build:dev          # physical iPhone (internal distribution)
```

Or from `artifacts/ios-app`:

```bash
eas build --profile development-simulator --platform ios
eas build --profile development --platform ios
```

The first run asks a few questions (credentials, generate a new keystore / provisioning profile). Accept the defaults unless you already manage signing yourself.

Wait for the build on [expo.dev/accounts/arunkarra/projects/columba/builds](https://expo.dev/accounts/arunkarra/projects/columba/builds). It usually takes 10–20 minutes.

- **Simulator:** download the `.tar.gz`, unpack it, drag `Columba.app` onto the Simulator (or `xcrun simctl install booted Columba.app`).
- **iPhone:** install [Expo Orbit](https://expo.dev/orbit) or scan the QR code from the build page. The device must be registered with your Apple team; EAS walks you through that.

You only need a new native build after changing native dependencies, plugins, or `app.json`. Everyday JS/TS changes do **not** need a rebuild.

#### Run the app day-to-day

1. Start the API (`pnpm --filter @workspace/api-server run dev`).
2. Start the bundler from `artifacts/ios-app`:

```bash
EXPO_PUBLIC_DOMAIN=your-api-host.example.com pnpm start
```

3. Open the Columba development build on the Simulator or iPhone. It will load JS from that bundler.

```bash
pnpm eas:build:preview      # internal preview (no dev client)
pnpm eas:build:prod         # App Store / production
```

---

## API overview

Base URL: `https://<host>/api`

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/request-code` | Send OTP to email |
| `POST` | `/auth/verify` | Verify OTP, receive JWT |
| `GET` | `/notes` | List all visible notes |
| `POST` | `/notes` | Create note |
| `GET` | `/notes/summary` | Counts (open, done, urgent) |
| `GET` | `/notes/:id` | Get note |
| `PATCH` | `/notes/:id` | Update note |
| `DELETE` | `/notes/:id` | Delete note |
| `POST` | `/notes/:id/toggle-done` | Toggle done state |
| `GET` | `/groups` | List groups |
| `POST` | `/groups` | Create group |
| `GET` | `/groups/:id` | Get group + members |
| `POST` | `/groups/:id/invite` | Invite member by email |
| `DELETE` | `/groups/:id/members/:userId` | Remove member |
| `POST` | `/groups/:id/leave` | Leave group |
| `POST` | `/push/register` | Register Expo push token |
| `DELETE` | `/push/unregister` | Unregister token |
| `GET` | `/healthz` | Health check |

All routes except `/auth/*` and `/healthz` require `Authorization: Bearer <token>`.

---

## Push notifications & lock-screen actions

Pinning a note sends a **Time-Sensitive** APNs push with a `PINNED_NOTE` category. The app registers this category with a **"Mark as Complete"** action on startup.

```
User pins note
  → backend: sendPush(..., { urgent: true, categoryId: 'PINNED_NOTE' })
  → lock screen notification appears

User long-presses notification → taps "Mark as Complete"
  → Expo handles action in background
  → app calls POST /api/notes/:id/toggle-done
  → notification dismissed, note marked done

User marks done from inside the app
  → backend sends silent dismiss push
  → app clears presented notification via getPresentedNotificationsAsync()
```

> **Development builds required** — custom notification categories (the long-press action button) are not supported in Expo Go. They work in `expo run:ios` dev builds and EAS production builds.

---

## Auth dev bypass

In `NODE_ENV !== "production"`, posting code `000000` to `POST /api/auth/verify` for any email skips the database lookup and returns a valid JWT. Useful for simulator testing.

---

## Licence

MIT
