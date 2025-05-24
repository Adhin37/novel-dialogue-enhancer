// content-enhancer-integration.js

/**
 * Enhanced integration module for Novel Dialogue Enhancer
 * Integrates genderUtils, novelUtils, and ollamaClient for LLM-based enhancement
 */
class ContentEnhancerIntegration {
  /**
   * Creates a new ContentEnhancerIntegration instance
   */
  constructor() {
    this.genderUtils = new GenderUtils();
    this.ollamaClient = new OllamaClient();
    this.novelUtils = new NovelUtils(window.location.href, document.title);
    this.statsUtils = new StatsUtils();
    this.textProcessor = new TextProcessor();
    this.promptGenerator = new PromptGenerator();

    console.debug(
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

    // Reset stats for this enhancement session
    this.genderUtils.resetStats();

    try {
      const sanitizedText = SharedUtils.sanitizeText(text);

      // Track word count for statistics
      const originalWordCount = this.#countWords(sanitizedText);
      this.statsUtils.setTotalWordsProcessed(originalWordCount);

      // Extract character information using novelUtils
      const characterMap = await this.extractCharacterInfo(sanitizedText);

      // Get dialogue patterns for statistics
      const dialoguePatterns =
        this.novelUtils.extractDialoguePatterns(sanitizedText);
      const dialogueCount = this.#countDialogues(dialoguePatterns);
      this.statsUtils.setTotalDialoguesEnhanced(dialogueCount);

      // Extract additional characters from dialogue patterns
      const dialogueCharacters =
        this.novelUtils.extractCharactersFromDialogue(dialoguePatterns);
      for (const characterName of dialogueCharacters) {
        if (!characterMap[characterName]) {
          characterMap[characterName] = {
            gender: "unknown",
            appearances: 1
          };
        }
      }

      // Create character summary for LLM context
      const characterSummary = this.novelUtils.createCharacterSummary(
        this.#convertCharacterMapToArray(characterMap)
      );

      // Check LLM availability
      const ollamaStatus = await this.ollamaClient.checkOllamaAvailability();
      if (!ollamaStatus.available) {
        console.error(`LLM not available: ${ollamaStatus.reason}`);
        this.statsUtils.incrementErrorCount();
        return text;
      }

      // Use the ollamaClient with our newly refactored components
      const enhancedText = await this.enhanceTextWithLLM(
        sanitizedText,
        characterSummary
      );

      // Calculate compression ratio
      const enhancedWordCount = this.#countWords(enhancedText);
      if (originalWordCount > 0) {
        const compressionRatio = enhancedWordCount / originalWordCount;
        this.statsUtils.setCompressionRatio(compressionRatio);
      }

      return enhancedText;
    } catch (error) {
      console.error("Error enhancing text:", error);
      this.statsUtils.incrementErrorCount();
      return text;
    } finally {
      const endTime = performance.now();
      this.statsUtils.setProcessingTime(endTime - startTime);
    }
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @return {number} - Number of words
   * @private
   */
  #countWords(text) {
    if (!text || typeof text !== "string") {
      return 0;
    }

    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Count the number of dialogues in the text
   * @param {object} dialoguePatterns - The dialogue patterns to count
   * @return {number} - The number of dialogues
   */
  #countDialogues(dialoguePatterns) {
    return (
      dialoguePatterns.quotedDialogue.length +
      dialoguePatterns.colonSeparatedDialogue.length +
      dialoguePatterns.actionDialogue.length
    );
  }

  /**
   * Convert character map to array for LLM context
   * @param {object} characterMap - The character map to convert
   * @return {Array} - Array of character objects
   */
  #convertCharacterMapToArray(characterMap) {
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

    // Let novelUtils extract the character names (now async)
    let characterMap = await this.novelUtils.extractCharacterNames(text);

    // If the current chapter was already enhanced, we might be using cached data
    if (!this.novelUtils.isCurrentChapterEnhanced) {
      // Apply gender detection to any characters with unknown gender
      characterMap = await this.determineCharacterGenders(characterMap, text);
    }

    // Track new characters found
    const newCharCount = Object.keys(characterMap).length - startCharCount;
    this.statsUtils.setTotalCharactersDetected(newCharCount);

    console.log(
      `Processed ${Object.keys(characterMap).length} characters for novel ${
        this.novelUtils.novelId
      }${
        this.novelUtils.chapterInfo?.chapterNumber
          ? ", chapter " + this.novelUtils.chapterInfo.chapterNumber
          : ""
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
  async determineCharacterGenders(characterMap, text) {
    const updatedCharacterMap = { ...characterMap };

    for (const [name, data] of Object.entries(updatedCharacterMap)) {
      const needsGenderDetermination =
        data.gender === "unknown" || !data.confidence || data.confidence < 0.7;

      if (needsGenderDetermination) {
        const genderInfo = this.genderUtils.guessGender(
          name,
          text,
          updatedCharacterMap
        );

        updatedCharacterMap[name] = {
          ...updatedCharacterMap[name],
          gender: genderInfo.gender,
          confidence: genderInfo.confidence,
          evidence: genderInfo.evidence
        };
      }
    }

    this.novelUtils.syncCharacterMap(updatedCharacterMap);
    return updatedCharacterMap;
  }

  /**
   * Set up character context for enhancement
   * @return {Promise<Object>} - Character map with gender information
   */
  async setupCharacterContext() {
    // Get text from the content element
    const text = document.body.textContent;
    return await this.extractCharacterInfo(text);
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
      const novelStyle = await this.novelUtils.analyzeNovelStyle(text);

      // Get chapter info if not already detected
      if (!this.novelUtils.chapterInfo) {
        this.novelUtils.chapterInfo = this.novelUtils.detectChapterInfo(
          document.title,
          text
        );
      }

      // Format novel style information
      const novelInfo = {
        style: novelStyle.style,
        tone: novelStyle.tone,
        title: this.novelUtils.title,
        platform: this.novelUtils.detectPlatform(window.location.href),
        chapterInfo: this.novelUtils.chapterInfo
      };

      // Split text into manageable chunks
      const settings = await this.ollamaClient.getLLMSettings();
      const textChunks = this.textProcessor.splitIntoChunks(
        text,
        settings.maxChunkSize
      );

      // Process each chunk
      const enhancedChunks = await this.#processChunks(
        textChunks,
        characterSummary,
        novelInfo,
        settings
      );

      const enhancedText = enhancedChunks.join("\n\n");
      console.log("Text enhancement complete!");

      return this.textProcessor.cleanLLMResponse(enhancedText);
    } catch (error) {
      console.error("LLM enhancement error:", error);
      throw error;
    }
  }

  /**
   * Process all text chunks sequentially with enhanced context
   * @param {Array<string>} chunks - Text chunks to process
   * @param {string} characterContext - Character information
   * @param {object} novelInfo - Novel style information
   * @param {object} settings - LLM settings
   * @return {Promise<Array<string>>} - Array of enhanced text chunks
   * @private
   */
  async #processChunks(chunks, characterContext, novelInfo, settings) {
    const enhancedChunks = [];
    const BATCH_DELAY = 800;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `Processing chunk ${i + 1}/${chunks.length} (size: ${chunk.length})`
      );

      // Build context using enhanced chunks when available
      const contextInfo = this.textProcessor.buildChunkContext(
        enhancedChunks.length > 0
          ? [...enhancedChunks, ...chunks.slice(enhancedChunks.length)]
          : chunks,
        i
      );

      // Create the prompt using our prompt generator
      const prompt = this.promptGenerator.createEnhancementPrompt(
        chunk,
        characterContext,
        contextInfo,
        novelInfo
      );

      // Create a cache key for the background service
      const cacheKey = SharedUtils.createHash(chunk + contextInfo);

      try {
        // Process with LLM via the Ollama client
        const enhancedChunk = await this.ollamaClient.processWithLLM(
          settings.modelName,
          prompt,
          {
            max_tokens: settings.contextSize,
            temperature: settings.temperature,
            top_p: settings.topP,
            timeout: settings.timeout,
            cacheKey: cacheKey
          }
        );

        enhancedChunks.push(enhancedChunk);
      } catch (chunkError) {
        console.warn("Failed to enhance chunk, using original:", chunkError);
        enhancedChunks.push(chunk);
        errorCount++;
        this.statsUtils.incrementErrorCount();
      }

      // Add delay between chunks to avoid overwhelming the LLM
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    if (errorCount > 0) {
      console.warn(`Processing completed with ${errorCount} chunk errors`);
    }

    return enhancedChunks;
  }
}

if (typeof module !== "undefined") {
  module.exports = ContentEnhancerIntegration;
} else {
  window.enhancerIntegration = ContentEnhancerIntegration;
}
