#!/usr/bin/env bash
# Publish Brayden Stats into the gh-pages `jerseydeals/` folder only.
# Leaves the Pages root (and any sibling paths) alone for other teammates.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

LIVE_PATH="jerseydeals"
LIVE_URL="https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/"

npm run build
cp dist/index.html dist/404.html
touch dist/.nojekyll

BRANCH_DIR="$(mktemp -d)"
cleanup() {
  cd "$ROOT"
  git worktree remove --force "$BRANCH_DIR" 2>/dev/null || true
  rm -rf "$BRANCH_DIR"
  git worktree prune 2>/dev/null || true
}
trap cleanup EXIT

git fetch origin gh-pages:refs/remotes/origin/gh-pages 2>/dev/null || true

if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git worktree add --force -B gh-pages "$BRANCH_DIR" origin/gh-pages
elif git show-ref --verify --quiet refs/heads/gh-pages; then
  git worktree add --force "$BRANCH_DIR" gh-pages
else
  git worktree add --force --orphan -B gh-pages "$BRANCH_DIR"
  touch "$BRANCH_DIR/.nojekyll"
fi

TARGET="$BRANCH_DIR/$LIVE_PATH"
rm -rf "$TARGET"
mkdir -p "$TARGET"
cp -a dist/. "$TARGET/"

# Ensure Pages root keeps a nojekyll marker if this is a fresh orphan branch
touch "$BRANCH_DIR/.nojekyll"

cd "$BRANCH_DIR"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -c user.name='Brayden Stats Deploy' -c user.email='deploy@brayden-stats.local' \
    commit -m "Deploy Brayden Stats to jerseydeals/"
  git push -u origin gh-pages
fi

echo "Live: $LIVE_URL"
