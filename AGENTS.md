# Agent guardrails — Brayden-OS

Read this before changing code or deploying. Multiple agents work in this repo; following these rules prevents live-site wipeouts and “I thought you fixed that” misses.

## Two separate products (never mix them)

| Product | Source | Permanent live URL |
|---------|--------|--------------------|
| **BrayStats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | `jerseydeals/` | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

- Do **not** publish BrayStats into `/jerseydeals/`.
- Do **not** publish Jersey Deals into the Pages root.
- When a BrayStats task finishes, report **both** URLs, labeled.

## BrayStats agent roles

| Role | Owns | Does not own |
|------|------|----------------|
| **Designer** | Visual UI, layout, typography, motion, spacing, league **labels/copy** (names, short codes, country lines), user-facing empty/loading text | Data pipelines, APIs, scoring algorithms, deploy CI for other products |
| **Other Stats agents** | Fixtures, scores, favorites logic, standings/stats APIs, match data | Redesigning the shell or renaming leagues without coordinating with Designer |

Stay in your lane. If a task needs another role’s files, coordinate or leave a clear note — don’t silently overwrite.

## Source of truth

1. **`Brayden-OS` is the only shared source of truth.**
2. Always start from latest `origin/Brayden-OS` (`git fetch` + rebase/merge) before editing.
3. A change is **not done** until it is **merged into `Brayden-OS`**.
4. Do **not** treat a feature-branch Pages deploy as permanent — another agent’s deploy from `Brayden-OS` will replace it.

## Done means on Brayden-OS (critical)

User-visible work (copy, UI, bugs) fails if it only lives on a feature branch while the user checks the live site.

**Before telling the user a change is done:**

1. Confirm the PR against `Brayden-OS` is **mergeable** (no conflicts). If it conflicts, merge/rebase `origin/Brayden-OS` and resolve **before** claiming the work is finished.
2. Prefer **small focused PRs** for user-requested copy or one-line fixes. Do **not** bury them only inside a large polish PR that can stall on conflicts.
3. Verify the change exists on **`origin/Brayden-OS`** after merge, e.g.:
   ```bash
   git fetch origin Brayden-OS
   git show origin/Brayden-OS:path/to/file | rg 'expected text or signal'
   ```
4. When the PR is still open / unmerged, say so plainly:
   - ✅ “On PR #N; live updates after merge into `Brayden-OS`.”
   - ❌ Do **not** say “updated”, “done”, or “pushed” in a way that implies the live site already has it.

**Communication rule:** Never imply the live BrayStats/Jersey Deals URL reflects a change until that change is on `Brayden-OS` (and Pages has rebuilt from it).

## Deploy rules (critical)

1. Prefer deploying **only after merge to `Brayden-OS`** (CI on that branch, or a deploy from that tip).
2. If you must publish Pages manually:
   - Update **only** the path for your product (Stats = site root, Jersey Deals = `jerseydeals/`).
   - **Preserve** the other product’s folder.
   - Never `force_orphan` / wipe the whole `gh-pages` branch unless you rebuild **both** apps in the same deploy.
3. Do not force-push `gh-pages` over a teammate’s newer commit without rebuilding both products from current `Brayden-OS`.

## Designer checklist (BrayStats)

Before finishing a design task:

- [ ] Branched from latest `Brayden-OS`
- [ ] Only design/UI/copy files changed (unless explicitly asked otherwise)
- [ ] PR opened against `Brayden-OS`
- [ ] PR kept **mergeable** (rebased/merged with `origin/Brayden-OS` if needed)
- [ ] User-requested copy/fixes not stranded only on a stalled mega-PR
- [ ] PR **merged** (or clearly blocked waiting on review — and said so to the user)
- [ ] Verified on `origin/Brayden-OS` (not only the feature branch)
- [ ] Live Stats URL verified after merge/deploy
- [ ] Both permanent links given to the user, labeled

## Cursor Cloud specific instructions

Two independent Vite + React + TS apps, each its own npm project (separate `package-lock.json` + `node_modules`): **BrayStats** (repo root) and **Jersey Deals** (`jerseydeals/`). There are no npm workspaces, so install and run each directory separately. Node 22 matches CI. Dependency install is handled by the startup update script (`npm ci` in root and in `jerseydeals/`).

Standard commands live in `package.json` (`dev`, `build`, `lint`, `preview`) — run them at the repo root for BrayStats and inside `jerseydeals/` for Jersey Deals.

Non-obvious caveats:
- Dev servers are served under a **base path**, not `/`. BrayStats is at `http://localhost:5173/Brayden-OS/` and Jersey Deals at `http://localhost:5174/Brayden-OS/jerseydeals/` (see the `base` option in each `vite.config.ts`). Hitting `/` returns 404 — always use the base path.
- Run the two dev servers on different ports (e.g. `npm run dev -- --port 5173` at root, `--port 5174` in `jerseydeals/`) since both default to 5173.
- BrayStats fetches live data client-side from public ESPN/FotMob APIs (no keys/secrets). Data panels need outbound internet; the shell still renders offline but stays empty.
- No automated test suite exists; `npm run lint` (oxlint) is the only check. `npm run build` runs `tsc -b` first, so it also type-checks.
