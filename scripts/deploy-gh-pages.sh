#!/usr/bin/env bash
# Build and publish the static site to the gh-pages branch (for GitHub Pages).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

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
fi

# Replace published files (keep .git via worktree)
find "$BRANCH_DIR" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -a dist/. "$BRANCH_DIR/"

cd "$BRANCH_DIR"
git add -A
if git diff --cached --quiet; then
  echo "No changes to deploy."
else
  git -c user.name='Brayden Stats Deploy' -c user.email='deploy@brayden-stats.local' \
    commit -m "Deploy Brayden Stats site"
  git push -u origin gh-pages
fi
