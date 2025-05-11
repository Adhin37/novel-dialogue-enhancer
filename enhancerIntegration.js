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
    this.statsUtils = new StatsUtils();

    console.log(
      "Novel Dialogue Enhancer: Integration module initialized with LLM support"
    );
  }

  /**
   * Main enhancement function for text using LLM
   * @param {string} text - The text to enhance
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceText(text) {
    const startTime = performance.now();

    try {
      const sanitizedText = this.sanitizeText(text);

      // Extract character information if not already provided
      const characterMap = this.extractCharacterNames(sanitizedText);

      // Get dialogue patterns for statistics
      const dialoguePatterns =
        this.dialogueUtils.extractDialoguePatterns(sanitizedText);
      const dialogueCount = this.countDialogues(dialoguePatterns);
      this.statsUtils.setTotalDialoguesEnhanced(dialogueCount);

      // Create character summary for LLM context
      const characterSummary = this.dialogueUtils.createDialogueSummary(
        this.mapCharactersToArray(characterMap)
      );

      // Check LLM availability
      const ollamaStatus = await this.ollamaClient.checkOllamaAvailability();
      if (!ollamaStatus.available) {
        console.error(`LLM not available: ${ollamaStatus.reason}`);
        return text;
      }

      // Use the ollamaClient directly, passing the character summary
      const enhancedText = await this.enhanceTextWithLLM(
        sanitizedText,
        characterSummary
      );

      return enhancedText;
    } catch (error) {
      console.error("Error enhancing text:", error);
      return text;
    } finally {
      const endTime = performance.now();
      this.statsUtils.setProcessingTime(endTime - startTime);
    }
  }

  countDialogues(dialoguePatterns) {
    return (
      dialoguePatterns.quotedDialogue.length +
      dialoguePatterns.colonSeparatedDialogue.length +
      dialoguePatterns.actionDialogue.length
    );
  }

  mapCharactersToArray(characterMap) {
    return Object.entries(characterMap).map(([name, data]) => ({
      name,
      gender: data.gender,
      appearances: data.appearances
    }));
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
    const novelId = this.novelUtils.updateNovelId(
      window.location.href,
      document.title
    );

    // Try to get existing character map for this novel first
    if (novelId) {
      this.loadExistingCharacterData(novelId, characterMap);
    }

    // Get dialogue patterns
    const dialoguePatterns = this.dialogueUtils.extractDialoguePatterns(text);

    // Extract characters from dialogue
    const characterNames =
      this.dialogueUtils.extractCharactersFromDialogue(dialoguePatterns);

    // Process each character name
    characterNames.forEach((name) =>
      this.processCharacterName(name, text, characterMap)
    );

    // Look for additional names using more patterns
    this.extractAdditionalNames(text, characterMap);

    // Clean up characters
    this.cleanupCharacterMap(characterMap);

    // Track new characters found
    const newCharCount = Object.keys(characterMap).length - startCharCount;
    this.statsUtils.setTotalCharactersDetected(newCharCount);

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

  loadExistingCharacterData(novelId, characterMap) {
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

  processCharacterName(name, text, characterMap) {
    // Add validation for name
    if (!name || typeof name !== "string" || name.length > 50) {
      return; // Skip invalid names
    }

    // Sanitize name to prevent potential injection
    const sanitizedName = this.sanitizeText(name);

    if (!characterMap[sanitizedName]) {
      const gender = this.genderUtils.guessGender(
        sanitizedName,
        text,
        characterMap
      );
      characterMap[sanitizedName] = {
        gender,
        appearances: 1
      };
    } else {
      // Increment appearances counter
      characterMap[sanitizedName].appearances =
        (characterMap[sanitizedName].appearances || 0) + 1;

      // If gender was previously unknown but we have more context now, try again
      if (
        characterMap[sanitizedName].gender === "unknown" ||
        characterMap[sanitizedName].confidence < 0.7
      ) {
        const updatedGender = this.genderUtils.guessGender(
          sanitizedName,
          text,
          characterMap
        );

        // Only update if we have better confidence
        if (
          updatedGender.confidence >
          (characterMap[sanitizedName].confidence || 0)
        ) {
          characterMap[sanitizedName].gender = updatedGender.gender;
          characterMap[sanitizedName].confidence = updatedGender.confidence;
          characterMap[sanitizedName].evidence = updatedGender.evidence;
        }
      }
    }
  }

  /**
   * Sanitize text to prevent XSS and other injection attacks
   * @param {string} text - Text to sanitize
   * @return {string} - Sanitized text
   */
  sanitizeText(text) {
    if (!text || typeof text !== "string") return "";

    // Basic HTML sanitization
    const temp = document.createElement("div");
    temp.textContent = text;
    return temp.innerHTML;
  }

  /**
   * Get existing character map for a novel from background storage
   * @param {string} novelId - Unique novel identifier
   * @param {object} currentMap - Current character map
   * @return {Promise<object>} - Promise resolving to existing character map
   */
  async getExistingCharacterMap(novelId, currentMap = {}) {
    return new Promise((resolve, reject) => {
      if (!novelId) {
        resolve(currentMap);
        return;
      }

      // Add timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn("Character map retrieval timed out");
        resolve(currentMap);
      }, x5000);

      chrome.runtime.sendMessage(
        { action: "getCharacterMap", novelId },
        (response) => {
          clearTimeout(timeoutId);

          if (chrome.runtime.lastError) {
            console.warn(
              "Error retrieving character map:",
              chrome.runtime.lastError
            );
            resolve(currentMap);
            return;
          }

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
   * Extract additional names using more patterns
   * @param {string} text - The text to analyze
   * @param {object} characterMap - Character map to update
   */
  extractAdditionalNames(text, characterMap) {
    // Limit text size to prevent ReDoS attacks
    const maxTextLength = 100000; // 100KB
    const processedText = text.substring(0, maxTextLength);
    const namePatterns = [
      // Character said pattern - same as before
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

    // Set a limit on matches to prevent DoS
    const maxMatches = 1000;
    let totalMatches = 0;

    for (const pattern of namePatterns) {
      let match;
      let patternMatches = 0;

      while (
        (match = pattern.exec(processedText)) !== null &&
        totalMatches < maxMatches &&
        patternMatches < 200
      ) {
        patternMatches++;
        totalMatches++;
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

    // Validate characterMap before sending
    if (!characterMap || typeof characterMap !== "object") {
      console.warn("Invalid character map provided for sync");
      return;
    }

    // Validate and sanitize the data before sending
    const sanitizedCharMap = {};
    Object.entries(characterMap).forEach(([name, data]) => {
      // Only include valid entries
      if (name && typeof name === "string" && name.length <= 50) {
        sanitizedCharMap[name] = {
          gender: data.gender || "unknown",
          confidence: parseFloat(data.confidence) || 0,
          appearances: parseInt(data.appearances) || 1,
          evidence: Array.isArray(data.evidence)
            ? data.evidence.filter((e) => typeof e === "string").slice(0, 10)
            : []
        };
      }
    });

    console.log(`Syncing character map for novel: ${novelId}`);
    chrome.runtime.sendMessage({
      action: "updateCharacterMap",
      characters: sanitizedCharMap,
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
      const novelId = this.novelUtils.updateNovelId(
        window.location.href,
        document.title
      );

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

      console.log("Text enhancement complete!");

      return enhancedText;
    } catch (error) {
      console.error("LLM enhancement error:", error);
      throw error;
    }
  }

  /**
   * Get the current enhancement statistics
   * @return {object} - Enhancement statistics
   */
  getStats() {
    return this.statsUtils.getStats();
  }
}

if (typeof module !== "undefined") {
  module.exports = EnhancerIntegration;
} else {
  window.enhancerIntegration = EnhancerIntegration;
}
