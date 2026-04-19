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
  "src/content/content-detector.js"
  "src/content/content-selectors.js"
  "src/content/content.js"
  "src/content/content.min.js"
  "src/content/dialogue-filter.js"
  "src/content/dom-sanitizer.js"
  "src/content/dom-verifier.js"
  "src/content/element-cache.js"
  "src/content/enhancement-runner.js"
  "src/content/error-handler.js"
  "src/content/page-settings.js"
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
  "src/shared/gender/appearance-analyzer.js"
  "src/shared/gender/base-analyzer.js"
  "src/shared/gender/cultural-analyzer.js"
  "src/shared/gender/cultural-terms.js"
  "src/shared/gender/eastern-names.js"
  "src/shared/gender/gender-config.js"
  "src/shared/gender/gender-orchestrator.js"
  "src/shared/gender/gender-utils.js"
  "src/shared/gender/multi-character-analyzer.js"
  "src/shared/gender/name-analyzer.js"
  "src/shared/gender/pronoun-analyzer.js"
  "src/shared/gender/pronouns.js"
  "src/shared/gender/relationship-analyzer.js"
  "src/shared/gender/western-names.js"
  "src/shared/llm/ollama-client.js"
  "src/shared/llm/ollama-config.js"
  "src/shared/llm/prompt-generator.js"
  "src/shared/llm/text-processor.js"
  "src/shared/novel/chapter-detector.js"
  "src/shared/novel/character-extractor.js"
  "src/shared/novel/id-generator.js"
  "src/shared/novel/novel-orchestrator.js"
  "src/shared/novel/style-analyzer.js"
  "src/shared/ui/dark-mode-manager.js"
  "src/shared/ui/toaster.js"
  "src/shared/utils/character-utils.js"
  "src/shared/utils/extension-config.js"
  "src/shared/utils/logger.js"
  "src/shared/utils/string-utils.js"
  "src/shared/utils/text-limits.js"
)

for f in "${REQUIRED[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ERROR: missing $f"
    MISSING=$((MISSING + 1))
  fi
done

if [ ! -d "icons" ]; then
  echo "  ERROR: missing icons/"
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
  icons/ \
  src/
echo "  $RELEASE_ZIP created ($(du -sh "$RELEASE_ZIP" | cut -f1))"

echo ""
echo "Done."
echo "  Upload $RELEASE_ZIP to the Chrome Web Store."
