#!/bin/bash
# generate-changelog.sh - Generate categorized release notes from git log
#
# Categorizes commits by conventional commit prefix (feat/fix/chore/refactor).
# Outputs RELEASE_NOTES.md for the current release (latest two tags).
# Works in CI (GitHub Actions) and locally.
#
# Usage:
#   ./generate-changelog.sh

set -euo pipefail

TAGS=$(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$' | head -n 2)
CUR=$(echo "$TAGS" | sed -n '1p')
PREV=$(echo "$TAGS" | sed -n '2p')

if [ -z "$CUR" ]; then
  echo "No version tags found. Tag the repo first (e.g. git tag v1.0.0)."
  exit 1
fi

if [ -z "$PREV" ]; then
  RANGE="$CUR"
  COMPARE_URL=""
else
  RANGE="$PREV..$CUR"
  REMOTE_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github\.com:/https:\/\/github.com\//')
  COMPARE_URL="$REMOTE_URL/compare/$PREV...$CUR"
fi

{
  echo "## 🚀 Release $CUR ($(date +'%Y-%m-%d'))"

  FEATS=$(git log "$RANGE" --grep="^feat" --format="* %s (%h)" --no-merges)
  if [ -n "$FEATS" ]; then
    echo ""
    echo "### ✨ Features"
    echo "$FEATS"
  fi

  FIXES=$(git log "$RANGE" --grep="^fix" --format="* %s (%h)" --no-merges)
  if [ -n "$FIXES" ]; then
    echo ""
    echo "### 🐛 Bug Fixes"
    echo "$FIXES"
  fi

  CHORES=$(git log "$RANGE" --grep="^chore\|^refactor" --format="* %s (%h)" --no-merges)
  if [ -n "$CHORES" ]; then
    echo ""
    echo "### ⚙️ Maintenance"
    echo "$CHORES"
  fi

  echo ""
  echo "---"
  echo "### 📊 Release Stats"
  echo "* **Total Commits:** $(git rev-list --count "$RANGE" --no-merges)"
  echo "* **Contributors:** $(git log "$RANGE" --format='%aN' --no-merges | sort -u | paste -sd ', ' -)"

  if [ -n "$COMPARE_URL" ]; then
    echo "* **Full Changelog:** [View Changes]($COMPARE_URL)"
  else
    REMOTE_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github\.com:/https:\/\/github.com\//')
    echo "* **Full Changelog:** ${REMOTE_URL}/commits/${CUR}"
  fi

} > RELEASE_NOTES.md
