# Columba on your Mac — the easy way

You only need **two commands** for day-to-day testing in the Simulator. Ignore ngrok, EAS, and Railway until you are ready to ship.

---

## One-time setup (5 minutes)

Open **Terminal** and run:

```bash
cd ~/columba
git pull
pnpm mac:setup
```

That installs dependencies, creates `artifacts/api-server/.env`, and sets up the database.

If Postgres is missing:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb columba
pnpm mac:setup
```

---

## Every day (one command)

```bash
cd ~/columba
pnpm mac:dev
```

Leave that terminal open. It starts:

- **API** at `http://localhost:8080`
- **Metro** at `http://localhost:8081`

Then in the **Simulator**:

1. Open the **Columba** app (the dev build you already installed).
2. Tap **`localhost:8081`** on the dev-client home screen.
3. **Sign in:** tap the Columba **logo 20 times** → enter **`columba-dev`**.

No email. No ngrok. No EAS build required for daily testing.

Press **Ctrl+C** in the terminal when you are done.

### See UI changes in the Simulator

The Simulator shows **live JavaScript** from Metro, not what was baked into the old EAS build.

1. After `git pull`, restart: `pnpm mac:dev`
2. In Columba, tap **`localhost:8081`** again (do not open the app without Metro)
3. In the Metro terminal, press **`r`** to reload
4. If it still looks stale: Simulator menu **Device → Erase All Content and Settings** is overkill — try **Cmd+R** in Simulator first

**Check you're on latest code:**

```bash
cd ~/columba
git log -1 --oneline
grep EmojiPicker artifacts/ios-app/app/\(tabs\)/groups.tsx
```

If `grep` finds `EmojiPicker`, you have group emojis. If not, run `git pull origin main`.

---

## Rules so you do not get confused

| Do this | Not this |
|--------|----------|
| Always `cd ~/columba` first | Run commands from `~` (home) |
| `pnpm mac:dev` for daily work | Four separate terminals |
| Logo 20× + `columba-dev` to log in | Email codes / ngrok |
| Keep one terminal on `mac:dev` | Mix `eas build:run` before a build finishes |

**Folder reminder:** everything lives under `~/columba`. There is no `artifacts/ios-app` in your home folder — only inside the repo.

---

## When you need more (later, optional)

| Goal | What to do |
|------|------------|
| **Sign in with Apple** (real button) | One EAS simulator build: `pnpm mac:sim` then wait for FINISHED, then `cd artifacts/ios-app && pnpm exec eas build:run --platform ios --latest` |
| **API on the internet** (real iPhone, no ngrok) | Follow [railway.md](./railway.md) — hosted Postgres + API |
| **TestFlight** | Apple Developer account ($99/yr) + production EAS build |

You do **not** need any of that just to use the app in the Simulator with the dev bypass.

---

## If something breaks

### `git pull` blocked by local changes

If you see *“Your local changes would be overwritten”*:

```bash
cd ~/columba
git stash push -m "mac local" -- artifacts/ios-app/app.json pnpm-workspace.yaml
git pull origin main
git log -1 --oneline   # should show 84a76b7 or newer
```

### `pnpm mac:dev` fails with `ERR_PNPM_IGNORED_BUILDS`

pnpm 11 on your Mac requires approved install scripts. After `git pull`:

```bash
cd ~/columba
pnpm install
pnpm mac:dev
```

If install still fails, run once (non-interactive):

```bash
pnpm approve-builds esbuild prisma @prisma/client @prisma/engines @swc/core msw unrs-resolver
pnpm install
```

### General reset

```bash
cd ~/columba
pnpm mac:setup    # fix deps + database
pnpm mac:dev      # try again
```

Still stuck? Paste the last 10 lines from the terminal — not a screenshot of four windows at once.

---

## Cheat sheet (copy to Notes)

```
cd ~/columba
pnpm mac:dev
# Simulator → Columba → localhost:8081
# Login: logo 20 taps → columba-dev
```
