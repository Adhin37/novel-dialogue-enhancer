// dialogueUtils.js
/**
 * Dialogue enhancement utilities for Novel Dialogue Enhancer
 */
class DialogueUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Dialogue Utils initialized");
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
   * @return {Array} - Array of character names
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
   * Extract a proper character name from text
   * @param {string} text - Text that may contain a character name
   * @return {string|null} - Extracted character name or null
   */
  extractCharacterName(text) {
    if (!text) return null;
    let _text = text.trim();

    if (_text.length > 50) {
      const namePatterns = [
        /\b(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)[\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/,
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+/
      ];

      for (const pattern of namePatterns) {
        const match = _text.match(pattern);
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
    if (pronouns.includes(_text)) {
      return null;
    }

    const nonNameWords = [
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

    if (nonNameWords.includes(_text)) {
      return null;
    }

    if (
      _text.includes(" ") &&
      (/\s(is|was|are|were|have|had|do|did|can|could|will|would|should|shall|may|might|must)\s/.test(
        _text
      ) ||
        /[.!?]/.test(_text))
    ) {
      return null;
    }

    if (!/^[A-Z]/.test(_text)) {
      return null;
    }

    if (_text.endsWith(".")) {
      _text = _text.slice(0, -1).trim();
    }

    if (/^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(_text)) {
      return _text;
    }

    if (/^[A-Z][a-z]+$/.test(_text)) {
      return _text;
    }
    const titlePattern =
      /^(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const titleMatch = _text.match(titlePattern);
    if (titleMatch) {
      return _text;
    }

    if (/^Xiao\s[A-Z][a-z]+$/.test(_text)) {
      return _text;
    }

    if (
      _text.length < 20 &&
      !_text.includes(",") &&
      !_text.includes("!") &&
      !_text.includes("?")
    ) {
      return _text;
    }

    return null;
  }

  /**
   * Create a dialogue summary for LLM context
   * @param {Array} characters - Array of character objects with names and genders
   * @return {string} - Formatted dialogue summary for LLM
   */
  createDialogueSummary(characters) {
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return "";
    }

    let summary =
      "CHARACTER INFORMATION (to help maintain proper pronouns and gender references):\n";

    const sortedCharacters = [...characters].sort(
      (a, b) => (b.appearances || 0) - (a.appearances || 0)
    );

    const significantCharacters = sortedCharacters.filter(
      (c) => c.appearances > 1
    );

    const displayCharacters =
      significantCharacters.length > 0
        ? significantCharacters.slice(0, 10)
        : sortedCharacters.slice(0, 10);

    displayCharacters.forEach((char) => {
      const pronounInfo =
        char.gender === "male"
          ? "he/him/his"
          : char.gender === "female"
          ? "she/her/her"
          : "unknown pronouns";

      summary += `- ${char.name}: ${
        char.gender || "unknown"
      } (${pronounInfo}), appeared ${char.appearances || "unknown"} times\n`;
    });

    return summary;
  }
}

if (typeof module !== "undefined") {
  module.exports = DialogueUtils;
} else {
  window.dialogueUtils = DialogueUtils;
}
