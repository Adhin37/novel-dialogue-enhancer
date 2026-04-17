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
  "src/background/background.js"
  "src/background/background.min.js"
  "src/content/content.js"
  "src/content/content.min.js"
  "src/popup/popup.html"
  "src/popup/popup.js"
  "src/popup/popup.css"
  "src/popup/popup.min.js"
  "src/popup/popup.min.css"
  "src/options/options.html"
  "src/options/options.js"
  "src/options/options.css"
  "src/options/options.min.js"
  "src/options/options.min.css"
  "src/shared/lib/purify.min.js"
  "src/shared/content/enhancer.js"
  "src/shared/gender/base-analyzer.js"
  "src/shared/gender/appearance-analyzer.js"
  "src/shared/gender/cultural-analyzer.js"
  "src/shared/gender/eastern-names.js"
  "src/shared/gender/gender-orchestrator.js"
  "src/shared/gender/multi-character-analyzer.js"
  "src/shared/gender/name-analyzer.js"
  "src/shared/gender/pronoun-analyzer.js"
  "src/shared/gender/relationship-analyzer.js"
  "src/shared/gender/western-names.js"
  "src/shared/llm/ollama-client.js"
  "src/shared/llm/prompt-generator.js"
  "src/shared/llm/text-processor.js"
  "src/shared/novel/chapter-detector.js"
  "src/shared/novel/character-extractor.js"
  "src/shared/novel/id-generator.js"
  "src/shared/novel/novel-orchestrator.js"
  "src/shared/novel/style-analyzer.js"
  "src/shared/ui/dark-mode-manager.js"
  "src/shared/ui/toaster.js"
  "src/shared/utils/constants.js"
  "src/shared/utils/cultural-terms.js"
  "src/shared/utils/element-cache.js"
  "src/shared/utils/error-handler.js"
  "src/shared/utils/logger.js"
  "src/shared/utils/pronouns.js"
  "src/shared/utils/shared-utils.js"
  "src/shared/utils/stats-utils.js"
)

for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ERROR: missing $f"
    MISSING=$((MISSING + 1))
  fi
done

if [ ! -d "src/assets/icons" ]; then
  echo "  ERROR: missing src/assets/icons/"
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
  src/
echo "  $RELEASE_ZIP created ($(du -sh "$RELEASE_ZIP" | cut -f1))"

echo ""
echo "Done."
echo "  Upload $RELEASE_ZIP to the Chrome Web Store."
