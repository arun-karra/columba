# AGENTS.md

Columba is a pnpm monorepo: an Express REST API (`artifacts/api-server`, Prisma + PostgreSQL)
and an Expo/React Native iOS app (`artifacts/ios-app`). See `README.md` and `replit.md` for
product details, architecture, and the full list of run/test commands.

## Cursor Cloud specific instructions

The startup update script already runs `pnpm install` and generates the Prisma client
(`pnpm --filter @workspace/api-server run prisma:generate`). The notes below cover the
non-obvious runtime setup that the update script intentionally does NOT do.

### PostgreSQL (required by the API server)

- PostgreSQL 16 is installed in the base image, but the server process is not auto-started.
  Start it each boot: `sudo pg_ctlcluster 16 main start`.
- A local dev database `columba` already exists (role `postgres` / password `postgres`).
  If it is ever missing, recreate it with `sudo -u postgres createdb columba`.

### API server env (`artifacts/api-server/.env`)

- The server needs `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, and `PORT`. `.env` is
  git-ignored (secrets never get committed). A local dev `.env` is provided in the snapshot;
  if it is missing, recreate it with:
  ```
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/columba
  SESSION_SECRET=dev-local-session-secret-change-me
  NODE_ENV=development
  PORT=8080
  ```
- After changing `prisma/schema.prisma`, apply it with
  `pnpm --filter @workspace/api-server run prisma:push` (this also regenerates the client).

### Running the services

- API server: `pnpm --filter @workspace/api-server run dev` (esbuild bundle then `node`,
  listens on `PORT`, default 8080). It is not a hot-reload watcher — restart it after edits.
- iOS app bundler: `pnpm --filter @workspace/ios-app run start` (Metro on port 8081). The
  package's `dev` script depends on Replit-only env vars; use `start` (or `expo start`)
  directly in the cloud VM. There is no iOS simulator here, so validate the app via Metro
  bundling (`/index.bundle` equivalents) and `typecheck`, not a running simulator.
- Auth dev bypass: POST code `000000` to `/api/auth/verify` for any email returns a valid JWT
  (non-production only) — use this for API testing instead of real email OTP.

### Lint / test / typecheck

- `pnpm run typecheck` is the repo's type/lint gate. It builds the `lib/*` project references
  first (`tsc --build`), so run the whole script rather than a single package's typecheck.
- `pnpm --filter @workspace/api-server run test` (vitest) mocks Prisma in-memory, so it needs
  no running PostgreSQL.
- Known pre-existing failure: `artifacts/mockup-sandbox` (a Replit design-preview scaffold,
  not shipped product code) fails `typecheck` with a React 19 ref-type conflict. This is
  unrelated to environment setup; the product packages (`api-server`, `ios-app`) typecheck clean.
