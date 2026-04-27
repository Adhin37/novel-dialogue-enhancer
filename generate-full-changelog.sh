#!/bin/bash
# generate-full-changelog.sh - Regenerates CHANGELOG.md from the full git tag history.
# Run once to bootstrap the file, or to rebuild it from scratch.

set -euo pipefail

REMOTE_URL=$(git config --get remote.origin.url | sed 's/\.git$//' | sed 's/git@github\.com:/https:\/\/github.com\//')

TAGS_ARRAY=()
while IFS= read -r tag; do
    TAGS_ARRAY+=("$tag")
done < <(git tag --sort=-v:refname | grep -E '^v?[0-9]+\.[0-9]+\.[0-9]+$')

TAG_COUNT=${#TAGS_ARRAY[@]}

if [ "$TAG_COUNT" -eq 0 ]; then
  echo "No version tags found. Tag the repo first (e.g. git tag v1.0.0)."
  exit 1
fi

{
    echo "# Changelog"
    echo ""
    echo "All notable changes to this project will be documented in this file."
    echo ""

    for ((i=0; i<TAG_COUNT; i++)); do
        CUR="${TAGS_ARRAY[$i]}"
        if [ $((i+1)) -lt "$TAG_COUNT" ]; then
            OLDER="${TAGS_ARRAY[$((i+1))]}"
        else
            OLDER=""
        fi

        TAG_DATE=$(git log -1 --format="%ai" "$CUR" | cut -d' ' -f1)

        if [ -n "$OLDER" ]; then
            RANGE="$OLDER..$CUR"
            COMPARE_URL="$REMOTE_URL/compare/$OLDER...$CUR"
        else
            RANGE="$CUR"
            COMPARE_URL=""
        fi

        echo "## 🚀 Release $CUR ($TAG_DATE)"

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
        fi
        echo ""

    done

} > CHANGELOG.md

echo "CHANGELOG.md generated successfully."
