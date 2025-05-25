// novel-character-extractor.js
/**
 * Extracts character names from novel text
 */
class NovelCharacterExtractor {
  /**
   * Extract character names from text
   * @param {string} text - Text to analyze
   * @return {object} - Character map
   */
  extractCharacterNames(text) {
    const characterMap = {};
    const namePatterns = this.#getNamePatterns();
    const maxTextLength = Constants.PROCESSING.MAX_TEXT_LENGTH;
    const processedText = text.substring(0, maxTextLength);
    const maxMatches = Constants.PROCESSING.MAX_MATCHES;
    let totalMatches = 0;

    for (const pattern of namePatterns) {
      let match;
      let patternMatches = 0;

      while (
        (match = pattern.exec(processedText)) !== null &&
        totalMatches < maxMatches &&
        patternMatches < Constants.PROCESSING.MAX_PATTERN_MATCHES
      ) {
        patternMatches++;
        totalMatches++;

        const name = this.#extractNameFromMatch(match, pattern, namePatterns);

        if (!name || name.length > 30) continue;

        const sanitizedName = SharedUtils.sanitizeText(name);
        const extractedName = this.extractCharacterName(sanitizedName);

        if (extractedName) {
          if (!characterMap[extractedName]) {
            characterMap[extractedName] = {
              gender: Constants.GENDER.UNKNOWN,
              appearances: 1
            };
          } else {
            characterMap[extractedName].appearances++;
          }
        }
      }
    }

    return this.#cleanupCharacterMap(characterMap);
  }

  /**
   * Extract a character name from text
   * @param {string} text - Text that may contain a character name
   * @return {string|null} - Extracted character name or null
   */
  extractCharacterName(text) {
    if (!text) return null;
    let processedText = text.trim();

    if (processedText.length > 50) {
      const namePatterns = [
        /\b(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)[\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/,
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+/
      ];

      for (const pattern of namePatterns) {
        const match = processedText.match(pattern);
        if (match) {
          if (pattern === namePatterns[0]) {
            return match[0].trim();
          }
          return match[1] ? match[1].trim() : match[0].trim();
        }
      }

      return null;
    }

    const pronouns = [
      "He",
      "She",
      "It",
      "They",
      "I",
      "You",
      "We",
      "His",
      "Her",
      "Their",
      "My",
      "Your",
      "Our"
    ];

    if (pronouns.includes(processedText)) {
      return null;
    }

    const nonNameWords = this.#getNonNameWords();

    if (nonNameWords.includes(processedText)) {
      return null;
    }

    if (
      processedText.includes(" ") &&
      (/\s(is|was|are|were|have|had|do|did|can|could|will|would|should|shall|may|might|must)\s/.test(
        processedText
      ) ||
        /[.!?]/.test(processedText))
    ) {
      return null;
    }

    if (!/^[A-Z]/.test(processedText)) {
      return null;
    }

    if (processedText.endsWith(".")) {
      processedText = processedText.slice(0, -1).trim();
    }

    if (/^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(processedText)) {
      return processedText;
    }

    if (/^[A-Z][a-z]+$/.test(processedText)) {
      return processedText;
    }

    const titlePattern =
      /^(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const titleMatch = processedText.match(titlePattern);
    if (titleMatch) {
      return processedText;
    }

    if (/^Xiao\s[A-Z][a-z]+$/.test(processedText)) {
      return processedText;
    }

    if (
      processedText.length < 20 &&
      !processedText.includes(",") &&
      !processedText.includes("!") &&
      !processedText.includes("?")
    ) {
      return processedText;
    }

    return null;
  }

  /**
   * Extract dialogue patterns from text
   * @param {string} text - The text to analyze
   * @return {object} - Extracted dialogue data
   */
  extractDialoguePatterns(text) {
    const dialoguePatterns = {
      quotedDialogue: [],
      colonSeparatedDialogue: [],
      actionDialogue: []
    };

    const quotedPattern = /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      dialoguePatterns.quotedDialogue.push({
        full: match[0],
        dialogue: match[1],
        attribution: match[2].trim()
      });
    }

    const colonPattern = /([^:]+):\s*"([^"]+)"/g;
    while ((match = colonPattern.exec(text)) !== null) {
      dialoguePatterns.colonSeparatedDialogue.push({
        full: match[0],
        character: match[1].trim(),
        dialogue: match[2]
      });
    }

    const actionPattern =
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+([^.!?]*[.!?])\s+"([^"]+)"/g;
    while ((match = actionPattern.exec(text)) !== null) {
      dialoguePatterns.actionDialogue.push({
        full: match[0],
        character: match[1],
        action: match[2],
        dialogue: match[3]
      });
    }

    return dialoguePatterns;
  }

  /**
   * Extract named characters from dialogue patterns
   * @param {object} dialoguePatterns - Extracted dialogue patterns
   * @return {Set} - Set of character names
   */
  extractCharactersFromDialogue(dialoguePatterns) {
    const characters = new Set();

    dialoguePatterns.quotedDialogue.forEach((item) => {
      const attribution = item.attribution.trim();

      if (attribution.length > 100) return;

      const patterns = [
        /\b(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i,
        /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)/i
      ];

      for (const pattern of patterns) {
        const match = attribution.match(pattern);
        if (match) {
          const potentialName = pattern === patterns[0] ? match[2] : match[1];
          const extractedName = this.extractCharacterName(potentialName);
          if (extractedName) {
            characters.add(extractedName);
          }
          break;
        }
      }
    });

    dialoguePatterns.colonSeparatedDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    dialoguePatterns.actionDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    return characters;
  }

  /**
   * Get the regex patterns used for name extraction
   * @return {Array<RegExp>} - Array of regex patterns
   * @private
   */
  #getNamePatterns() {
    return [
      // Character said pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered|spoke|declared|answered)/g,

      // "Text" attribution pattern
      /"([^"]+)"\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered)/g,

      // Character: "Text" pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s*:\s*"([^"]+)"/g,

      // Character's possession pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})'s\s+(?:face|eyes|voice|body|hand|arm|leg|hair|head|mouth|mind|heart|soul|gaze|attention)/g,

      // Title + name pattern
      /(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/g,

      // "Xiao" prefix common in Chinese novels
      /(Xiao\s[A-Z][a-z]+)/g
    ];
  }

  /**
   * Extract the name from a regex match based on the pattern
   * @param {Array} match - The regex match result
   * @param {RegExp} pattern - The pattern that produced the match
   * @param {Array<RegExp>} patterns - Array of all patterns for index comparison
   * @return {string|null} - Extracted name or null
   * @private
   */
  #extractNameFromMatch(match, pattern, patterns) {
    if (pattern === patterns[1]) {
      // "Text" attribution pattern
      return match[2];
    } else if (pattern === patterns[4]) {
      // Title + name pattern
      return match[2] ? `${match[1]} ${match[2]}` : match[1];
    } else {
      // All other patterns
      return match[1];
    }
  }

  /**
   * Clean up character map by removing invalid entries
   * @param {object} characterMap - Character map to clean up
   * @return {object} - Cleaned character map
   * @private
   */
  #cleanupCharacterMap(characterMap) {
    const invalidKeys = [];

    for (const name in characterMap) {
      if (name.length > 30) {
        invalidKeys.push(name);
        continue;
      }

      if (
        name.includes(". ") ||
        name.includes("! ") ||
        name.includes("? ") ||
        name.includes(", ") ||
        name.match(/\w+\s+\w+\s+\w+\s+\w+\s+\w+/)
      ) {
        invalidKeys.push(name);
        continue;
      }

      const commonNonNames = [
        "The",
        "Then",
        "This",
        "Well",
        "From",
        "At",
        "Old",
        "Sister"
      ];
      if (commonNonNames.includes(name)) {
        invalidKeys.push(name);
        continue;
      }
    }

    const cleanedMap = { ...characterMap };
    invalidKeys.forEach((key) => {
      delete cleanedMap[key];
    });

    return cleanedMap;
  }

  /**
   * Get non-name words to filter out
   * @return {Array} - Array of non-name words
   * @private
   */
  #getNonNameWords() {
    return [
      "The",
      "Then",
      "This",
      "That",
      "These",
      "Those",
      "There",
      "Their",
      "They",
      "However",
      "Suddenly",
      "Finally",
      "Eventually",
      "Certainly",
      "Perhaps",
      "Maybe",
      "While",
      "When",
      "After",
      "Before",
      "During",
      "Within",
      "Without",
      "Also",
      "Thus",
      "Therefore",
      "Hence",
      "Besides",
      "Moreover",
      "Although",
      "Despite",
      "Since",
      "Because",
      "Nonetheless",
      "Nevertheless",
      "Regardless",
      "Consequently",
      "Accordingly",
      "Meanwhile",
      "Afterwards",
      "Beforehand",
      "In",
      "As",
      "But",
      "Or",
      "And",
      "So",
      "Yet",
      "For",
      "Nor",
      "If",
      "From",
      "At",
      "Old",
      "Well",
      "Sister"
    ];
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelCharacterExtractor;
} else {
  window.NovelCharacterExtractor = NovelCharacterExtractor;
}
