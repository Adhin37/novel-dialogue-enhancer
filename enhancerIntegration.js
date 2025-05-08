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
    this.novelUtils = new NovelUtils();

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

      const characterSummary =
        this.dialogueUtils.createDialogueSummary(characterArray);

      // Check LLM availability
      const ollamaStatus = await this.ollamaClient.checkOllamaAvailability();
      if (!ollamaStatus.available) {
        console.error(`LLM not available: ${ollamaStatus.reason}`);
        return text;
      }

      // Use the ollamaClient directly, passing the character summary
      const enhancedText = await this.enhanceTextWithLLM(
        text,
        characterSummary
      );

      const endTime = performance.now();
      this.setProcessingTime(this.getProcessingTime() + (endTime - startTime));

      return enhancedText;
    } catch (error) {
      console.error("Error enhancing text:", error);

      const endTime = performance.now();
      this.setProcessingTime(this.getProcessingTime() + (endTime - startTime));

      return text;
    }
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

    // Get novel ID to retrieve existing character data
    const novelId = this.generateNovelId();

    // Try to get existing character map for this novel first
    if (novelId) {
      this.getExistingCharacterMap(novelId, characterMap)
        .then((existingNovelMap) => {
          // Merge with existing map if available
          Object.entries(existingNovelMap).forEach(([name, data]) => {
            if (!characterMap[name]) {
              characterMap[name] = { ...data };
            }
          });
        })
        .catch((err) => {
          console.warn("Failed to fetch existing character map:", err);
        });
    }

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
        // Increment appearances counter
        characterMap[name].appearances =
          (characterMap[name].appearances || 0) + 1;

        // If gender was previously unknown but we have more context now, try again
        if (
          characterMap[name].gender === "unknown" ||
          characterMap[name].confidence < 0.7
        ) {
          const updatedGender = this.genderUtils.guessGender(
            name,
            text,
            characterMap
          );

          // Only update if we have better confidence
          if (updatedGender.confidence > (characterMap[name].confidence || 0)) {
            characterMap[name].gender = updatedGender.gender;
            characterMap[name].confidence = updatedGender.confidence;
            characterMap[name].evidence = updatedGender.evidence;
          }
        }
      }
    });

    // Look for additional names using more patterns
    this.extractAdditionalNames(text, characterMap);

    // Clean up characters
    this.cleanupCharacterMap(characterMap);

    // Track new characters found
    const newCharCount = Object.keys(characterMap).length - startCharCount;
    this.setTotalCharactersDetected(
      this.getTotalCharactersDetected() + newCharCount
    );

    // Sync character map with background
    if (novelId && Object.keys(characterMap).length > 0) {
      this.syncCharacterMap(characterMap, novelId);
    }

    console.log(
      `Extracted ${
        Object.keys(characterMap).length
      } characters for novel ${novelId}:`,
      characterMap
    );
    return characterMap;
  }

  /**
   * Get existing character map for a novel from background storage
   * @param {string} novelId - Unique novel identifier
   * @param {object} currentMap - Current character map
   * @return {Promise<object>} - Promise resolving to existing character map
   */
  getExistingCharacterMap(novelId, currentMap = {}) {
    return new Promise((resolve, reject) => {
      if (!novelId) {
        resolve(currentMap);
        return;
      }

      chrome.runtime.sendMessage(
        { action: "getCharacterMap", novelId },
        (response) => {
          if (response && response.status === "ok") {
            console.log(
              `Retrieved existing character map for novel ${novelId} with ${
                Object.keys(response.characterMap).length
              } characters`
            );
            resolve(response.characterMap || {});
          } else {
            console.warn(
              "Failed to get character map:",
              response?.message || "Unknown error"
            );
            resolve(currentMap); // Return current map if retrieval fails
          }
        }
      );
    });
  }

  /**
   * Generate a novel identifier based on URL and title
   * @return {string} - Unique novel identifier
   */
  generateNovelId() {
    const url = window.location.href;
    const title = document.title;

    let domain = new URL(url).hostname.replace(/^www\./, "");
    let novelName = "";

    if (title) {
      const titleParts = title.split(/[|\-–—:]/);
      if (titleParts.length > 0) {
        novelName = titleParts[0].trim();
      }
    }

    if (!novelName) {
      novelName = title.replace(/[^\w\s]/g, "").trim();
    }

    const novelId = `${domain}_${novelName}`
      .toLowerCase()
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_")
      .replace(/_(\d+)(?=\.\w+$)/, "")
      .substring(0, 50);

    console.log(`Generated novel ID: ${novelId}`);
    return novelId;
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
   * Sync character map with background script
   * @param {object} characterMap - Character map to sync
   * @param {string} novelId - Unique identifier for the novel
   */
  syncCharacterMap(characterMap, novelId) {
    if (!novelId) {
      console.warn("No novel ID provided for character map sync");
      return;
    }

    console.log(`Syncing character map for novel: ${novelId}`);
    chrome.runtime.sendMessage({
      action: "updateCharacterMap",
      characters: characterMap,
      novelId: novelId
    });
  }

  /**
   * Enhance text using the LLM with character context
   * @param {string} text - Text to enhance
   * @param {string} characterSummary - Character information summary
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceTextWithLLM(text, characterSummary) {
    try {
      const novelId = this.generateNovelId();

      // Add context about the novel and writing style
      const novelInfo = await this.dialogueUtils.analyzeNovelStyle(
        text,
        novelId
      );

      // Process with Ollama
      const enhancedText = await this.ollamaClient.enhanceWithLLM(
        text,
        characterSummary,
        novelInfo
      );

      // Extract only the enhanced text response (removing any prompt or instruction text)
      const cleanedText = this.cleanLLMResponse(enhancedText);

      console.log("Text enhancement complete!");

      return cleanedText;
    } catch (error) {
      console.error("LLM enhancement error:", error);
      throw error;
    }
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
