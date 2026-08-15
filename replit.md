# Columba

A shared-notes app: personal and group notes, with pinned notes surfaced as Time-Sensitive lock-screen push notifications you can complete with a long-press.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ios-app run dev` — run the Expo iOS app
- `pnpm --filter @workspace/api-server run test` — run the API server's test suite (vitest)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-server run prisma:push` — push Prisma schema changes to the DB (dev only)
- `pnpm --filter @workspace/api-server run prisma:generate` — regenerate the Prisma client (run this after `pnpm install` if `@prisma/client` typecheck errors show up — its postinstall generate step is skipped by pnpm's build-script approval gate)
- Required env: `DATABASE_URL`, `SESSION_SECRET`. See `README.md` for the full list (Resend, Expo push, etc).

## Stack

- pnpm workspaces, Node.js 20+, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Prisma ORM
- Validation: Zod (v3)
- API contract: OpenAPI 3.0 (`lib/api-spec/openapi.yaml`) → Orval-generated React Query hooks + Zod schemas, hand-maintained (no wired codegen step)
- iOS app: Expo / React Native, Expo Router, React Query
- Build: esbuild (ESM bundle) for the API server

## Where things live

- `artifacts/api-server` — Express REST API. Routes in `src/routes/`, business rules (visibility/permission checks) live inline in each route handler rather than a separate service layer.
- `artifacts/ios-app` — the Expo app. Screens under `app/` (file-based routing via Expo Router).
- `lib/api-spec/openapi.yaml` — source of truth for the API contract.
- `lib/api-zod` / `lib/api-client-react` — generated-but-hand-maintained validators and React Query hooks consumed by both packages.
- `artifacts/api-server/prisma/schema.prisma` — source of truth for the DB schema.
- `artifacts/mockup-sandbox` — a Replit design-preview scaffold, not shipped product code.

## Architecture decisions

- A note's visibility is owner-only (`groupId = null`) or shared with every member of one group (`groupId` set) — there's no per-user ACL beyond group membership.
- Auth is passwordless: a 6-digit emailed code (`LoginCode`, hashed, 10-minute expiry), exchanged for a 30-day JWT. `NODE_ENV !== "production"` accepts code `000000` for any email as a dev bypass — this is intentional (avoids standing up production email locally) and should stay until email sign-in needs to be tested for real.
- Pinning a note sends a Time-Sensitive APNs push with a custom `PINNED_NOTE` category; the app registers a "Mark as Complete" notification action on startup so it can be completed lock-screen-only. This requires a dev/EAS build — it does not work in Expo Go.
- The reminder scheduler is a `node-cron` job inside the API process (not a separate worker), polling every minute for due, unsent reminders.
- The JWT is stored in `expo-secure-store` (Keychain/Keystore) on iOS/Android; web falls back to `AsyncStorage` since SecureStore has no web implementation.

## Product

- Personal or group notes with title, body, urgent flag, optional reminder, and a done/not-done state that records who completed it and when.
- Groups: invite by email — an existing user is added immediately, a not-yet-registered email gets a pending `GroupInvite` that's accepted automatically on their first sign-in.
- Pin to Home: fires a lock-screen push; long-press → "Mark as Complete" resolves it without opening the app.
- `audioUrl` exists on the `Note` model and in every API response, but there's no recording UI or upload endpoint yet — it's a placeholder for a future voice-note feature.

## User preferences

- Keep the `000000` dev auth bypass in place for now — production email sending isn't wired up yet, and this is deliberate rather than leftover debug code.

## Gotchas

- After `pnpm install`, `@prisma/client`'s postinstall script is skipped by pnpm's build-script approval gate — run `pnpm --filter @workspace/api-server run prisma:generate` manually or api-server's typecheck/tests will fail with "no exported member PrismaClient".
- `artifacts/api-server/src/test/mockPrisma.ts` mocks Prisma in-memory for route tests (no live Postgres needed to run `pnpm test`); it only implements the methods the routes actually call, so a new route touching a new Prisma method needs a matching addition there.
- `expo-notifications`' `NotificationBehavior` type requires `shouldShowBanner` / `shouldShowList` (iOS 16+ additions) alongside the older `shouldShowAlert` field — easy to miss when touching `app/_layout.tsx`'s notification handler.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
