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

    // Extract quoted dialogue: "This is dialogue," said Character.
    const quotedPattern = /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      dialoguePatterns.quotedDialogue.push({
        full: match[0],
        dialogue: match[1],
        attribution: match[2].trim()
      });
    }

    // Extract colon dialogue: Character: "This is dialogue."
    const colonPattern = /([^:]+):\s*"([^"]+)"/g;
    while ((match = colonPattern.exec(text)) !== null) {
      dialoguePatterns.colonSeparatedDialogue.push({
        full: match[0],
        character: match[1].trim(),
        dialogue: match[2]
      });
    }

    // Extract action dialogue: Character did something. "This is dialogue."
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

    // Extract from quoted dialogue
    dialoguePatterns.quotedDialogue.forEach((item) => {
      const attribution = item.attribution.trim();

      // Skip if attribution is too long (likely not a simple attribution)
      if (attribution.length > 100) return;

      // Check for common dialogue attribution patterns
      const patterns = [
        // "Text," said Character.
        /\b(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i,
        // "Text," Character said.
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

    // Extract from colon dialogue
    dialoguePatterns.colonSeparatedDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    // Extract from action dialogue
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

    // Clean up the text
    text = text.trim();

    // Handle common cases where we get paragraphs or sentences instead of names
    if (text.length > 50) {
      // Too long to be a reasonable name, try to extract name patterns
      const namePatterns = [
        // Match titles followed by names: "Master Wong", "Lady Chen"
        /\b(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)[\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        // Match common East Asian name patterns (2-3 characters, capitalized)
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/,
        // Match a character name at the beginning of a sentence
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+/
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          // For title matches, return the full title + name
          if (pattern === namePatterns[0]) {
            return match[0].trim();
          }
          // Otherwise return just the name portion
          return match[1] ? match[1].trim() : match[0].trim();
        }
      }

      // If we can't find a clear name pattern, this is probably not a character name
      return null;
    }

    // Check for individual pronouns which are not character names
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
    if (pronouns.includes(text)) {
      return null;
    }

    // Check if it's a common non-name word or sentence starter
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

    if (nonNameWords.includes(text)) {
      return null;
    }

    // Check if text is a sentence (contains certain verbs or ending punctuation)
    if (
      text.includes(" ") &&
      (/\s(is|was|are|were|have|had|do|did|can|could|will|would|should|shall|may|might|must)\s/.test(
        text
      ) ||
        /[.!?]/.test(text))
    ) {
      // This is likely a sentence, not a name
      return null;
    }

    // Check if it starts with capital letter (typical for names)
    if (!/^[A-Z]/.test(text)) {
      return null;
    }

    // If there's a period at the end, remove it (could be from a title abbreviation)
    if (text.endsWith(".")) {
      text = text.slice(0, -1).trim();
    }

    // Check if it looks like a composite name (e.g. "Yue Zhong")
    // Common pattern for character names in novels, especially Asian novels
    if (/^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(text)) {
      return text;
    }

    // Check if it's a single capitalized word (Western first names or single-character names)
    if (/^[A-Z][a-z]+$/.test(text)) {
      return text;
    }

    // Check for name with title
    const titlePattern =
      /^(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const titleMatch = text.match(titlePattern);
    if (titleMatch) {
      return text;
    }

    // Check for "Xiao" prefix (common in Chinese novels)
    if (/^Xiao\s[A-Z][a-z]+$/.test(text)) {
      return text;
    }

    // If we got here but the text is short (less than 20 chars) and capitalized,
    // it might still be a name, but let's do one more check to exclude short sentences
    if (
      text.length < 20 &&
      !text.includes(",") &&
      !text.includes("!") &&
      !text.includes("?")
    ) {
      return text;
    }

    return null;
  }

  /**
   * Create a dialogue summary for LLM context
   * @param {Array} characters - Array of character objects with names and genders
   * @return {string} - Formatted dialogue summary for LLM
   */
  createDialogueSummary(characters) {
    let summary =
      "CHARACTER INFORMATION (to help maintain proper pronouns and gender references):\n";

    characters.forEach((char) => {
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
