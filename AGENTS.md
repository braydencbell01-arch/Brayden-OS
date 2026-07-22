# Agent guardrails — Brayden-OS

Read this before changing code or deploying. Multiple agents work in this repo; following these rules prevents live-site wipeouts.

## Two separate products (never mix them)

| Product | Source | Permanent live URL |
|---------|--------|--------------------|
| **Brayden Stats** | repo root (`/`) | https://braydencbell01-arch.github.io/Brayden-OS/ |
| **Jersey Deals** | `jerseydeals/` | https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/ |

- Do **not** publish Brayden Stats into `/jerseydeals/`.
- Do **not** publish Jersey Deals into the Pages root.
- When a Brayden Stats task finishes, report **both** URLs, labeled.

## Brayden Stats agent roles

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

## Deploy rules (critical)

1. Prefer deploying **only after merge to `Brayden-OS`** (CI on that branch, or a deploy from that tip).
2. If you must publish Pages manually:
   - Update **only** the path for your product (Stats = site root, Jersey Deals = `jerseydeals/`).
   - **Preserve** the other product’s folder.
   - Never `force_orphan` / wipe the whole `gh-pages` branch unless you rebuild **both** apps in the same deploy.
3. Do not force-push `gh-pages` over a teammate’s newer commit without rebuilding both products from current `Brayden-OS`.

## Designer checklist (Brayden Stats)

Before finishing a design task:

- [ ] Branched from latest `Brayden-OS`
- [ ] Only design/UI/copy files changed (unless explicitly asked otherwise)
- [ ] PR opened against `Brayden-OS`
- [ ] PR **merged** (or clearly blocked waiting on review)
- [ ] Live Stats URL verified
- [ ] Both permanent links given to the user, labeled
