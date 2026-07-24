# Agent guardrails — Brayden-OS

Read this before changing code or deploying. Multiple agents work in this repo; following these rules prevents live-site wipeouts and “I thought you fixed that” misses.

## Token / context budget

Prefer staying under ~10% of the context window. See `.cursor/rules/lean-token-usage.mdc`: small reads, capped tool output, short replies, no full-file dumps.

## Two separate products (never mix them)

| Product | Source | Permanent live URL |
|---------|--------|--------------------|
| **BrayStats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | `jerseydeals/` | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

- Do **not** publish BrayStats into `/jerseydeals/`.
- Do **not** publish Jersey Deals into the Pages root.
- Keep **email lists and form endpoints separate** (BrayStats ≠ Jersey Deals business). No shared signup storage or env vars across products.
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

### Agents merge and ship live themselves (default — do not wait to be asked)

The user should **never** need to say “make it live,” “merge it,” or “deploy it.” That is part of finishing the task.

Do **not** leave finished user-visible work sitting on an open PR waiting for the user to merge. When the change is ready and mergeable:

1. Open/update the PR against `Brayden-OS` (for review history).
2. **Merge it yourself** into `Brayden-OS` (merge the feature branch locally or via the host’s merge path, then `git push origin Brayden-OS`). Pushing `Brayden-OS` triggers GitHub Pages deploy.
3. Wait for / confirm the Pages deploy, then verify the live URL.
4. Only then tell the user it is live.

Stopping at “PR opened” or “draft ready for review” is incomplete unless the user explicitly asked for review-only.

Exceptions (say so plainly and stop): merge conflicts you cannot resolve, failing CI/build, or the user explicitly asked for a draft / review-only PR.

**Before telling the user a change is done:**

1. Confirm the PR against `Brayden-OS` is **mergeable** (no conflicts). If it conflicts, merge/rebase `origin/Brayden-OS` and resolve **before** claiming the work is finished.
2. Prefer **small focused PRs** for user-requested copy or one-line fixes. Do **not** bury them only inside a large polish PR that can stall on conflicts.
3. **Merge into `Brayden-OS` and push** (see above) — do not stop at “PR opened.”
4. Verify the change exists on **`origin/Brayden-OS`** after merge, e.g.:
   ```bash
   git fetch origin Brayden-OS
   git show origin/Brayden-OS:path/to/file | rg 'expected text or signal'
   ```
5. Verify the live site (BrayStats and/or Jersey Deals) reflects the change after Pages rebuilds.
6. If you are blocked from merging, say so plainly:
   - ✅ “Blocked on X; not live yet.”
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

## Minimal tokens / context (hard default)

Prefer the smallest useful response and the fewest tool calls. Short answers by default. Do not explore the whole repo, write long plans, or restate the task unless needed to ship correctly.

## Cursor Cloud specific instructions

Two independent Vite + React + TS apps, each its own npm project (separate `package-lock.json` + `node_modules`): **BrayStats** (repo root) and **Jersey Deals** (`jerseydeals/`). There are no npm workspaces, so install and run each directory separately. Node 22 matches CI. Dependency install is handled by the startup update script (`npm ci` in root and in `jerseydeals/`).

Standard commands live in `package.json` (`dev`, `build`, `lint`, `preview`) — run them at the repo root for BrayStats and inside `jerseydeals/` for Jersey Deals.

Non-obvious caveats:
- Dev servers are served under a **base path**, not `/`. BrayStats is at `http://localhost:5173/Brayden-OS/` and Jersey Deals at `http://localhost:5174/Brayden-OS/jerseydeals/` (see the `base` option in each `vite.config.ts`). Hitting `/` returns 404 — always use the base path.
- Run the two dev servers on different ports (e.g. `npm run dev -- --port 5173` at root, `--port 5174` in `jerseydeals/`) since both default to 5173.
- BrayStats fetches live data client-side from public ESPN/FotMob APIs (no keys/secrets). Data panels need outbound internet; the shell still renders offline but stays empty.
- No automated test suite exists; `npm run lint` (oxlint) is the only check. `npm run build` runs `tsc -b` first, so it also type-checks.
