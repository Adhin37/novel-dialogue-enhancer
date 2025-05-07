// enhancerIntegration.js

/**
 * Enhanced integration module for Novel Dialogue Enhancer
 * Integrates dialogueUtils, genderUtils, and ollamaClient for LLM-based enhancement
 */
class EnhancerIntegration {
  constructor() {
    this.dialogueUtils = new DialogueUtils();
    this.genderUtils = new GenderUtils();
    this.ollamaClient = new OllamaClient();
    this.toaster = new Toaster();

    this.setTotalDialoguesEnhanced(0);
    this.setTotalPronounsFixed(0);
    this.setTotalCharactersDetected(0);
    this.setProcessingTime(0);

    console.log(
      "Novel Dialogue Enhancer: Integration module initialized with LLM support"
    );

    this.setEnhancementStats({
      totalDialoguesEnhanced: this.getTotalDialoguesEnhanced(),
      totalPronounsFixed: this.getTotalPronounsFixed(),
      totalCharactersDetected: this.getTotalCharactersDetected(),
      processingTime: this.getProcessingTime()
    });
  }

  /**
   * Main enhancement function for text using LLM
   * @param {string} text - The text to enhance
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceText(text) {
    const startTime = performance.now();

    try {
      // Extract character information if not already provided
      const characterMap = this.extractCharacterNames(text);

      // Get dialogue patterns for statistics
      const dialoguePatterns = this.dialogueUtils.extractDialoguePatterns(text);
      const dialogueCount =
        dialoguePatterns.quotedDialogue.length +
        dialoguePatterns.colonSeparatedDialogue.length +
        dialoguePatterns.actionDialogue.length;

      this.setTotalDialoguesEnhanced(
        this.getTotalDialoguesEnhanced() + dialogueCount
      );

      // Create character summary for LLM context
      const characterArray = Object.entries(characterMap).map(
        ([name, data]) => ({
          name,
          gender: data.gender,
          appearances: data.appearances
        })
      );
      const characterSummary = this.createDialogueSummary(characterArray);

      // Check LLM availability
      const ollamaStatus = await this.ollamaClient.checkOllamaAvailability();
      if (!ollamaStatus.available) {
        this.toaster.showError(`LLM not available: ${ollamaStatus.reason}`);
        return text;
      }

      // Use the ollamaClient directly, passing the character summary
      const enhancedText = await this.ollamaClient.enhanceWithLLM(
        text,
        characterSummary
      );

      const endTime = performance.now();
      this.setProcessingTime(this.getProcessingTime() + (endTime - startTime));

      return enhancedText;
    } catch (error) {
      console.error("Error enhancing text:", error);
      this.toaster.showError("Enhancement failed: " + error.message);

      const endTime = performance.now();
      this.setProcessingTime(this.getProcessingTime() + (endTime - startTime));

      return text;
    }
  }

  /**
   * Create a dialogue summary from character data for LLM context
   * @param {Array} characters - Character data array
   * @return {string} - Character summary string
   */
  createDialogueSummary(characterArray) {
    if (!characterArray || characterArray.length === 0) {
      return "";
    }

    let summary =
      "CHARACTER INFORMATION (for gender and pronoun consistency):\n";

    characterArray.sort((a, b) => (b.appearances || 0) - (a.appearances || 0));

    // Include only characters with multiple appearances to avoid noise
    const significantCharacters = characterArray.filter(
      (c) => c.appearances > 1
    );

    for (const character of significantCharacters.slice(0, 10)) {
      const genderInfo = character.gender
        ? `(${character.gender}, ${
            character.gender === "male"
              ? "he/him"
              : character.gender === "female"
              ? "she/her"
              : "they/them"
          })`
        : "(unknown gender)";

      summary += `- ${character.name} ${genderInfo}\n`;
    }

    return summary;
  }

  /**
   * Extract character names from text and determine their gender
   * @param {string} text - The text to analyze
   * @param {object} existingMap - Existing character data
   * @return {object} - Updated character map
   */
  extractCharacterNames(text, existingMap = {}) {
    console.log("Extracting character names and genders...");
    const characterMap = { ...existingMap };
    const startCharCount = Object.keys(characterMap).length;

    // Get dialogue patterns
    const dialoguePatterns = this.dialogueUtils.extractDialoguePatterns(text);

    // Extract characters from dialogue
    const characterNames =
      this.dialogueUtils.extractCharactersFromDialogue(dialoguePatterns);

    // Process each character name
    characterNames.forEach((name) => {
      if (!characterMap[name]) {
        const gender = this.genderUtils.guessGender(name, text, characterMap);
        characterMap[name] = {
          gender,
          appearances: 1
        };
      } else {
        characterMap[name].appearances =
          (characterMap[name].appearances || 0) + 1;
      }
    });

    // Look for additional names using more patterns
    this.extractAdditionalNames(text, characterMap);

    const newCharCount = Object.keys(characterMap).length - startCharCount;
    this.setTotalCharactersDetected(
      this.getTotalCharactersDetected() + newCharCount
    );

    console.log(
      `Extracted ${Object.keys(characterMap).length} characters:`,
      characterMap
    );
    return characterMap;
  }

  /**
   * Extract additional names using more patterns
   * @param {string} text - The text to analyze
   * @param {object} characterMap - Character map to update
   */
  extractAdditionalNames(text, characterMap) {
    const namePatterns = [
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

    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Determine which capture group contains the name based on pattern
        let name;
        if (pattern === namePatterns[1]) {
          name = match[2]; // For "Text" attribution pattern, name is in group 2
        } else if (pattern === namePatterns[4]) {
          name = match[2] ? `${match[1]} ${match[2]}` : match[1]; // For title pattern
        } else {
          name = match[1]; // For most patterns, name is in group 1
        }

        // Skip if name isn't valid or is too long
        if (!name || name.length > 30) continue;

        // Use dialogueUtils to verify it's a legitimate name
        const extractedName = this.dialogueUtils.extractCharacterName(name);
        if (extractedName) {
          if (!characterMap[extractedName]) {
            const gender = this.genderUtils.guessGender(
              extractedName,
              text,
              characterMap
            );
            characterMap[extractedName] = {
              gender,
              appearances: 1
            };
          } else {
            characterMap[extractedName].appearances =
              (characterMap[extractedName].appearances || 0) + 1;
          }
        }
      }
    }

    // Clean up possible duplicates or invalid entries
    this.cleanupCharacterMap(characterMap);
  }

  /**
   * Clean up character map by removing invalid entries and merging duplicates
   * @param {object} characterMap - Character map to clean up
   */
  cleanupCharacterMap(characterMap) {
    const invalidKeys = [];

    // Find invalid entries
    for (const name in characterMap) {
      // Check for very long names (likely not real character names)
      if (name.length > 30) {
        invalidKeys.push(name);
        continue;
      }

      // Check if it contains sentence-like structures
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

      // Check for common sentence starters that aren't names
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

    // Remove invalid entries
    invalidKeys.forEach((key) => {
      delete characterMap[key];
    });
  }

  /**
   * Check if a potential name is actually a common word or phrase
   * @param {string} word - Word to check
   * @return {boolean} - True if common non-name
   */
  isCommonNonName(word) {
    const commonNonNames = [
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
      "Likewise",
      "Similarly",
      "Alternatively",
      "Conversely",
      "Instead",
      "Otherwise",
      "Particularly",
      "Specifically",
      "Generally",
      "Usually",
      "Typically",
      "Rarely",
      "Frequently",
      "Occasionally",
      "Normally"
    ];

    return commonNonNames.includes(word);
  }

  /**
   * Enhance text using the LLM with character context
   * @param {string} text - Text to enhance
   * @param {string} characterSummary - Character information summary
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceTextWithLLM(text, characterSummary) {
    try {
      // Create an enhanced prompt with character information
      const enhancedPrompt = this.createEnhancedPrompt(text, characterSummary);

      // Show progress indicator
      this.toaster.showMessage("Enhancing text with LLM...");

      // Process with Ollama
      const enhancedText = await this.ollamaClient.enhanceWithLLM(
        enhancedPrompt
      );

      // Extract only the enhanced text response (removing any prompt or instruction text)
      const cleanedText = this.cleanLLMResponse(enhancedText);

      this.toaster.showMessage("Text enhancement complete!", 3000);

      return cleanedText;
    } catch (error) {
      console.error("LLM enhancement error:", error);
      this.toaster.showError("LLM enhancement failed: " + error.message);
      throw error;
    }
  }

  /**
   * Create an enhanced prompt with character information
   * @param {string} text - Original text
   * @param {string} characterSummary - Character information summary
   * @return {string} - Enhanced prompt for LLM
   */
  createEnhancedPrompt(text, characterSummary) {
    return `You are a dialogue enhancer for translated web novels. Your task is to enhance the following text to make it sound more natural in English.

${characterSummary}

INSTRUCTIONS:
0. IMPORTANT: Do not omit or remove any sentences or paragraphs. Every original paragraph must appear in the output, even if lightly edited for style or clarity.
1. Improve dialogue naturalness while preserving the original meaning
2. Make dialogue flow better in English
3. Keep all character names in the same language and exactly as provided
4. Fix pronoun inconsistencies based on the character information above
5. Briefly translate any foreign titles/cities/terms to English
6. IMPORTANT: Return ONLY the enhanced text with no explanations, analysis, or commentary
7. IMPORTANT: Do not use markdown formatting or annotations
8. Maintain paragraph breaks as in the original text as much as possible
9. Focus especially on maintaining gender consistency based on the character information provided

TEXT TO ENHANCE:

${text}`;
  }

  /**
   * Clean the LLM response to extract only the enhanced text
   * @param {string} llmResponse - Raw LLM response
   * @return {string} - Cleaned enhanced text
   */
  cleanLLMResponse(llmResponse) {
    // If the response contains markdown code blocks, remove them
    let cleanedText = llmResponse.replace(/```[\s\S]*?```/g, "");

    // Remove potential explanations or notes at the beginning/end
    cleanedText = cleanedText.replace(
      /^(Here is the enhanced text:|The enhanced text:|Enhanced text:|Enhanced version:)/i,
      ""
    );

    // Remove any final notes
    cleanedText = cleanedText.replace(
      /(Note:.*$)|(I hope this helps.*$)/im,
      ""
    );

    return cleanedText.trim();
  }

  /**
   * Escape special characters for regex
   * @param {string} string - String to escape
   * @return {string} - Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Get the current enhancement statistics
   * @return {object} - Enhancement statistics
   */
  getEnhancementStats() {
    return {
      totalDialoguesEnhanced: this.getTotalDialoguesEnhanced(),
      totalPronounsFixed: this.getTotalPronounsFixed(),
      totalCharactersDetected: this.getTotalCharactersDetected(),
      processingTime: Math.round(this.getProcessingTime())
    };
  }

  setEnhancementStats(stats) {
    this.enhancementStats = stats;
  }

  /**
   * Set the current totalDialoguesEnhanced
   * @param {number} totalDialoguesEnhanced - Number of dialogues enhanced
   */
  setTotalDialoguesEnhanced(totalDialoguesEnhanced) {
    this.totalDialoguesEnhanced = totalDialoguesEnhanced;
  }

  /**
   * Set the current totalPronounsFixed
   * @param {number} totalPronounsFixed - Number of pronouns fixed
   */
  setTotalPronounsFixed(totalPronounsFixed) {
    this.totalPronounsFixed = totalPronounsFixed;
  }

  /**
   * Set the current totalCharactersDetected
   * @param {number} totalCharactersDetected - Number of characters detected
   */
  setTotalCharactersDetected(totalCharactersDetected) {
    this.totalCharactersDetected = totalCharactersDetected;
  }

  /**
   * Set the current processingTime
   * @param {number} processingTime - Processing time in ms
   */
  setProcessingTime(processingTime) {
    this.processingTime = processingTime;
  }

  /**
   * Get the current totalDialoguesEnhanced
   * @return {number} - Total dialogues enhanced
   */
  getTotalDialoguesEnhanced() {
    return this.totalDialoguesEnhanced;
  }

  /**
   * Get the current totalPronounsFixed
   * @return {number} - Total pronouns fixed
   */
  getTotalPronounsFixed() {
    return this.totalPronounsFixed;
  }

  /**
   * Get the current totalCharactersDetected
   * @return {number} - Total characters detected
   */
  getTotalCharactersDetected() {
    return this.totalCharactersDetected;
  }

  /**
   * Get the current processingTime
   * @return {number} - Processing time in ms
   */
  getProcessingTime() {
    return this.processingTime;
  }
}

if (typeof module !== "undefined") {
  module.exports = EnhancerIntegration;
} else {
  window.enhancerIntegration = EnhancerIntegration;
}
