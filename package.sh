#!/bin/bash
# package.sh - Package Novel Dialogue Enhancer for Chrome Web Store submission
#
# Produces:
#   dist/novel-dialogue-enhancer.zip  - ready for Chrome Web Store upload
#
# Usage:
#   ./package.sh

set -euo pipefail

RELEASE_ZIP="dist/novel-dialogue-enhancer.zip"

# -- 1. Validate required files exist -------------------------------------------
echo "Validating extension files..."

MISSING=0
REQUIRED=(
  "manifest.json"
  "LICENSE"
  "README.md"
  "background/background.js"
  "content/content.js"
  "popup/popup.html"
  "popup/popup.js"
  "popup/popup.css"
  "options/options.html"
  "options/options.js"
  "options/options.css"
  "assets/js/lib/purify.min.js"
  "assets/js/utils/constants.js"
  "assets/js/utils/shared-utils.js"
  "assets/js/utils/logger.js"
  "assets/js/llm/ollama-client.js"
  "assets/js/llm/prompt-generator.js"
  "assets/js/llm/text-processor.js"
)

for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ERROR: missing $f"
    MISSING=$((MISSING + 1))
  fi
done

if [ ! -d "assets/icons" ]; then
  echo "  ERROR: missing assets/icons/"
  MISSING=$((MISSING + 1))
fi

if [ $MISSING -gt 0 ]; then
  echo "Validation failed: $MISSING item(s) missing."
  exit 1
fi
echo "  All required files present."

# -- 2. Package zip -------------------------------------------------------------
echo ""
echo "Creating $RELEASE_ZIP..."
mkdir -p dist
rm -f "$RELEASE_ZIP"
zip -r "$RELEASE_ZIP" \
  manifest.json LICENSE README.md \
  assets/ \
  background/ \
  content/ \
  popup/ \
  options/
echo "  $RELEASE_ZIP created ($(du -sh "$RELEASE_ZIP" | cut -f1))"

echo ""
echo "Done."
echo "  Upload $RELEASE_ZIP to the Chrome Web Store."
