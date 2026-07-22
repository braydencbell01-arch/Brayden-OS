#!/usr/bin/env bash
# Publish BrayStats to the gh-pages site ROOT only.
# Preserves /jerseydeals/ (Jersey Deals).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STATS_URL="https://braydencbell01-arch.github.io/Brayden-OS/"
JERSEY_URL="https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/"

npm run build
cp dist/index.html dist/404.html
touch dist/.nojekyll

if ! grep -q 'BrayStats' dist/index.html; then
  echo "ERROR: dist/index.html is not BrayStats" >&2
  exit 1
fi

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
fi

if [ -d "$BRANCH_DIR/jerseydeals" ]; then
  KEEP_JERSEY="$(mktemp -d)"
  cp -a "$BRANCH_DIR/jerseydeals" "$KEEP_JERSEY/jerseydeals"
else
  KEEP_JERSEY=""
fi

find "$BRANCH_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'jerseydeals' -exec rm -rf {} +
cp -a dist/. "$BRANCH_DIR/"

if [ -n "$KEEP_JERSEY" ]; then
  rm -rf "$BRANCH_DIR/jerseydeals"
  cp -a "$KEEP_JERSEY/jerseydeals" "$BRANCH_DIR/jerseydeals"
  rm -rf "$KEEP_JERSEY"
fi

touch "$BRANCH_DIR/.nojekyll"

if ! grep -q 'BrayStats' "$BRANCH_DIR/index.html"; then
  echo "ERROR: root index.html is not BrayStats" >&2
  exit 1
fi
if [ -f "$BRANCH_DIR/jerseydeals/index.html" ] && ! grep -q 'Jersey Deals' "$BRANCH_DIR/jerseydeals/index.html"; then
  echo "ERROR: jerseydeals/index.html is not Jersey Deals" >&2
  exit 1
fi

cd "$BRANCH_DIR"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -c user.name='BrayStats Deploy' -c user.email='deploy@brayden-stats.local' \
    commit -m "Deploy BrayStats to Pages root (keep jerseydeals/)"
  git push -u origin gh-pages
fi

echo "BrayStats: $STATS_URL"
echo "Jersey Deals:  $JERSEY_URL"
