#!/usr/bin/env bash
# Publish BrayStats to the gh-pages site ROOT only.
# Preserves /jerseydeals/ (Jersey Deals) and /platequest/ (PlateQuest).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

STATS_URL="https://braydencbell01-arch.github.io/Brayden-OS/"
JERSEY_URL="https://braydencbell01-arch.github.io/Brayden-OS/jerseydeals/"
PLATE_URL="https://braydencbell01-arch.github.io/Brayden-OS/platequest/"

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

KEEP_TMP="$(mktemp -d)"
for folder in jerseydeals platequest; do
  if [ -d "$BRANCH_DIR/$folder" ]; then
    cp -a "$BRANCH_DIR/$folder" "$KEEP_TMP/$folder"
  fi
done

find "$BRANCH_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' ! -name 'jerseydeals' ! -name 'platequest' -exec rm -rf {} +
cp -a dist/. "$BRANCH_DIR/"

for folder in jerseydeals platequest; do
  if [ -d "$KEEP_TMP/$folder" ]; then
    rm -rf "$BRANCH_DIR/$folder"
    cp -a "$KEEP_TMP/$folder" "$BRANCH_DIR/$folder"
  fi
done
rm -rf "$KEEP_TMP"

touch "$BRANCH_DIR/.nojekyll"

if ! grep -q 'BrayStats' "$BRANCH_DIR/index.html"; then
  echo "ERROR: root index.html is not BrayStats" >&2
  exit 1
fi
if [ -f "$BRANCH_DIR/jerseydeals/index.html" ] && ! grep -q 'Jersey Deals' "$BRANCH_DIR/jerseydeals/index.html"; then
  echo "ERROR: jerseydeals/index.html is not Jersey Deals" >&2
  exit 1
fi
if [ -f "$BRANCH_DIR/platequest/index.html" ] && ! grep -q 'PlateQuest' "$BRANCH_DIR/platequest/index.html"; then
  echo "ERROR: platequest/index.html is not PlateQuest" >&2
  exit 1
fi

cd "$BRANCH_DIR"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -c user.name='BrayStats Deploy' -c user.email='deploy@brayden-stats.local' \
    commit -m "Deploy BrayStats to Pages root (keep jerseydeals/ + platequest/)"
  git push -u origin gh-pages
fi

echo "BrayStats: $STATS_URL"
echo "Jersey Deals:  $JERSEY_URL"
echo "PlateQuest: $PLATE_URL"
