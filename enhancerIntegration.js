// enhancerIntegration.js

/**
 * Enhancer integration module for Novel Dialogue Enhancer
 * This module combines the functionality of dialogueUtils and genderUtils
 */
class EnhancerIntegration {
  constructor() {
    this.dialogueUtils = new DialogueUtils();
    this.genderUtils = new GenderUtils();
    this.setTotalDialoguesEnhanced(0);
    this.setTotalPronounsFixed(0);
    this.setTotalCharactersDetected(0);
    this.setProcessingTime(0);

    console.log("Novel Dialogue Enhancer: Integration module initialized");

    this.setEnhancementStats({
      totalDialoguesEnhanced: this.getTotalDialoguesEnhanced(),
      totalPronounsFixed: this.getTotalPronounsFixed(),
      totalCharactersDetected: this.getTotalCharactersDetected(),
      processingTime: this.getProcessingTime()
    });
  }

  /**
   * Enhance text with all available improvements
   * @param {string} text - The text to enhance
   * @param {object} settings - Enhancement settings
   * @param {object} characterMap - Existing character data
   * @return {object} - Enhanced text and updated character map
   */
  enhanceTextIntegrated(text, settings, characterMap = {}) {
    const startTime = performance.now();

    if (settings.preserveNames || settings.fixPronouns) {
      characterMap = this.extractCharacterNamesInternal(text, characterMap);
    }

    let enhancedText = text;

    enhancedText = enhancedText.replace(/"([^"]+)"/g, (match, dialogue) => {
      const enhanced = this.dialogueUtils.enhanceDialogue(dialogue);
      if (enhanced !== dialogue) {
        this.setTotalDialoguesEnhanced(this.getTotalDialoguesEnhanced() + 1);
      }
      return `"${enhanced}"`;
    });

    enhancedText = this.dialogueUtils.fixDialoguePatterns(enhancedText);

    if (settings.fixPronouns) {
      enhancedText = this.fixPronounsIntegrated(enhancedText, characterMap);
    }

    this.setProcessingTime(
      this.getProcessingTime() + performance.now() - startTime
    );

    return {
      enhancedText,
      characterMap
    };
  }

  /**
   * Extract character names from text and determine their gender
   * @param {string} text - The text to analyze
   * @param {object} existingMap - Existing character data
   * @return {object} - Updated character map
   */
  extractCharacterNamesInternal(text, existingMap = {}) {
    const characterMap = { ...existingMap };

    const namePatterns = [
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered|spoke|declared|answered)/g,
      /"([^"]+)"\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered)/g,
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s*:\s*"([^"]+)"/g
    ];

    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1].includes('"') ? match[2] : match[1];

        if (this.isCommonNonName(name)) continue;

        if (!characterMap[name]) {
          const gender = this.genderUtils.guessGender(name, text, characterMap);
          characterMap[name] = {
            gender,
            appearances: 1
          };
          this.setTotalCharactersDetected(
            this.getTotalCharactersDetected() + 1
          );
        } else {
          characterMap[name].appearances =
            (characterMap[name].appearances || 0) + 1;
        }
      }
    }

    return characterMap;
  }

  /**
   * Check if a potential name is actually a common word or phrase
   * that shouldn't be considered a character name
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
   * Fix pronouns based on character map
   * @param {string} text - The text to fix
   * @param {object} characterMap - Character data with gender information
   * @return {string} - Text with fixed pronouns
   */
  fixPronounsIntegrated(text, characterMap) {
    let fixedText = text;
    let fixCount = 0;

    Object.keys(characterMap).forEach((name) => {
      const character = characterMap[name];

      if (character.gender === "unknown") return;

      const nameRegex = new RegExp(
        `([^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]*(?:[.!?]))`,
        "g"
      );

      const matches = Array.from(fixedText.matchAll(nameRegex));

      matches.forEach((match) => {
        const sentence = match[0];
        const sentenceIndex = match.index;

        const followingText = fixedText.substring(
          sentenceIndex + sentence.length
        );

        if (character.gender === "male") {
          const fixedFollowing = followingText
            .replace(/\b(She|she)\b(?=\s)(?![^<]*>)/g, "He")
            .replace(/\b(Her|her)\b(?=\s)(?![^<]*>)/g, (match) => {
              return /\b(Her|her)\b\s+([\w-]+)/i.test(match) ? "His" : "Him";
            })
            .replace(/\b(herself)\b(?=\s)(?![^<]*>)/g, "himself");

          if (followingText !== fixedFollowing) {
            fixedText =
              fixedText.substring(0, sentenceIndex + sentence.length) +
              fixedFollowing;
            fixCount++;
          }
        } else if (character.gender === "female") {
          const fixedFollowing = followingText
            .replace(/\b(He|he)\b(?=\s)(?![^<]*>)/g, "She")
            .replace(/\b(His|his)\b(?=\s)(?![^<]*>)/g, "Her")
            .replace(/\b(Him|him)\b(?=\s)(?![^<]*>)/g, "Her")
            .replace(/\b(himself)\b(?=\s)(?![^<]*>)/g, "herself");

          if (followingText !== fixedFollowing) {
            fixedText =
              fixedText.substring(0, sentenceIndex + sentence.length) +
              fixedFollowing;
            fixCount++;
          }
        }
      });
    });

    this.setTotalPronounsFixed(this.getTotalPronounsFixed() + fixCount);
    return fixedText;
  }

  /**
   * Escape special characters for regex
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
   * @return {object} - totalDialoguesEnhanced
   */
  setTotalDialoguesEnhanced(totalDialoguesEnhanced) {
    this.totalDialoguesEnhanced = totalDialoguesEnhanced;
  }

  /**
   * Set the current totalPronounsFixed
   * @return {object} - totalPronounsFixed
   */
  setTotalPronounsFixed(totalPronounsFixed) {
    this.totalPronounsFixed = totalPronounsFixed;
  }

  /**
   * Set the current totalCharactersDetected
   * @return {object} - totalCharactersDetected
   */
  setTotalCharactersDetected(totalCharactersDetected) {
    this.totalCharactersDetected = totalCharactersDetected;
  }

  /**
   * Set the current processingTime
   * @return {object} - processingTime
   */
  setProcessingTime(processingTime) {
    this.processingTime = processingTime;
  }
  /**
   * Get the current totalDialoguesEnhanced
   * @return {number} - totalDialoguesEnhanced
   */
  getTotalDialoguesEnhanced() {
    return this.totalDialoguesEnhanced;
  }

  /**
   * Get the current totalPronounsFixed
   * @return {number} - totalPronounsFixed
   */
  getTotalPronounsFixed() {
    return this.totalPronounsFixed;
  }

  /**
   * Get the current totalCharactersDetected
   * @return {number} - totalCharactersDetected
   */
  getTotalCharactersDetected() {
    return this.totalCharactersDetected;
  }

  /**
   * Get the current processingTime
   * @return {number} - processingTime
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
