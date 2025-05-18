// enhancerIntegration.js

/**
 * Enhanced integration module for Novel Dialogue Enhancer
 * Integrates genderUtils, novelUtils, and ollamaClient for LLM-based enhancement
 */
class EnhancerIntegration {
  constructor() {
    this.genderUtils = new GenderUtils();
    this.ollamaClient = new OllamaClient();
    this.novelUtils = new NovelUtils(window.location.href, document.title);
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
      const sanitizedText = this.novelUtils.sanitizeText(text);

      // Extract character information using novelUtils
      const characterMap = await this.extractCharacterInfo(sanitizedText);

      // Get dialogue patterns for statistics
      const dialoguePatterns =
        this.novelUtils.extractDialoguePatterns(sanitizedText);
      const dialogueCount = this.countDialogues(dialoguePatterns);
      this.statsUtils.setTotalDialoguesEnhanced(dialogueCount);

      // Create character summary for LLM context
      const characterSummary = this.novelUtils.createCharacterSummary(
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

  /**
   * Count the number of dialogues in the text
   * @param {object} dialoguePatterns - The dialogue patterns to count
   * @return {number} - The number of dialogues
   */
  countDialogues(dialoguePatterns) {
    return (
      dialoguePatterns.quotedDialogue.length +
      dialoguePatterns.colonSeparatedDialogue.length +
      dialoguePatterns.actionDialogue.length
    );
  }

  /**
   * Map character map to array for LLM context
   * @param {object} characterMap - The character map to map
   * @return {Array} - Array of character objects
   */
  mapCharactersToArray(characterMap) {
    return Object.entries(characterMap).map(([name, data]) => ({
      name,
      gender: data.gender,
      appearances: data.appearances
    }));
  }

  /**
   * Extract character information using novelUtils and apply gender detection
   * @param {string} text - The text to analyze
   * @return {Promise<object>} - Updated character map
   */
  async extractCharacterInfo(text) {
    console.log("Extracting character information...");
    const startCharCount = Object.keys(this.novelUtils.characterMap).length;

    // Let novelUtils extract the character names
    const characterMap = this.novelUtils.extractCharacterNames(text);

    // Apply gender detection to any characters with unknown gender
    await this.applyGenderDetection(characterMap, text);

    // Track new characters found
    const newCharCount = Object.keys(characterMap).length - startCharCount;
    this.statsUtils.setTotalCharactersDetected(newCharCount);

    console.log(
      `Processed ${Object.keys(characterMap).length} characters for novel ${
        this.novelUtils.novelId
      }`
    );
    return characterMap;
  }

  /**
   * Apply gender detection to characters with unknown gender
   * @param {object} characterMap - The character map to update
   * @param {string} text - The text to analyze
   * @return {Promise<object>} - Updated character map with gender information
   */
  async applyGenderDetection(characterMap, text) {
    for (const [name, data] of Object.entries(characterMap)) {
      if (
        data.gender === "unknown" ||
        !data.confidence ||
        data.confidence < 0.7
      ) {
        const genderInfo = this.genderUtils.guessGender(
          name,
          text,
          characterMap
        );

        characterMap[name].gender = genderInfo.gender;
        characterMap[name].confidence = genderInfo.confidence;
        characterMap[name].evidence = genderInfo.evidence;
      }
    }

    // Let novelUtils handle the sync to storage
    this.novelUtils.syncCharacterMap(characterMap);

    return characterMap;
  }

  /**
   * Enhance text using the LLM with character context
   * @param {string} text - Text to enhance
   * @param {string} characterSummary - Character information summary
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceTextWithLLM(text, characterSummary) {
    try {
      // Analyze novel style using novelUtils
      const novelStyle = this.novelUtils.analyzeNovelStyle(text);

      // Format novel style information for the LLM
      const novelInfo = {
        style: novelStyle.style,
        tone: novelStyle.tone,
        title: this.novelUtils.title,
        platform: this.novelUtils.detectPlatform(window.location.href),
        chapterInfo: this.novelUtils.detectChapterInfo(document.title, text)
      };

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
}

if (typeof module !== "undefined") {
  module.exports = EnhancerIntegration;
} else {
  window.enhancerIntegration = EnhancerIntegration;
}
