import { logger } from "../utils/logger.js";
import { Constants } from "../utils/constants.js";
import { SharedUtils } from "../utils/shared-utils.js";
import { NovelUtils } from "../utils/novel-utils.js";
import { GenderUtils } from "../utils/gender-utils.js";
import { OllamaClient } from "../llm/ollama-client.js";
import { StatsUtils } from "../utils/stats-utils.js";
import { TextProcessor } from "../llm/text-processor.js";
import { PromptGenerator } from "../llm/prompt-generator.js";

// content-enhancer-integration.js
/**
 * Enhanced integration module for Novel Dialogue Enhancer
 * Integrates genderUtils, novelUtils, and ollamaClient for LLM-based enhancement
 */
export class ContentEnhancerIntegration {
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
    this.logger = logger;

    // Add flag to track if character analysis was already done for this session
    this.characterAnalysisComplete = false;
    this.sessionCharacterMap = {};

    this.logger.debug(
      "Novel Dialogue Enhancer: Integration module initialized with LLM support"
    );
  }

  async enhanceText(text) {
    const startTime = performance.now();

    // Reset stats for this enhancement session
    this.genderUtils.resetStats();

    try {
      const sanitizedText = SharedUtils.sanitizeText(text);

      // Track word count for statistics
      const originalWordCount = this.#countWords(sanitizedText);
      this.statsUtils.setTotalWordsProcessed(originalWordCount);

      // Extract character information only once per session or use existing data
      const characterMap = await this.#getOrExtractCharacterInfo(sanitizedText);

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
        this.logger.error(`LLM not available: ${ollamaStatus.reason}`);
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
      this.logger.error("Error enhancing text:", error);
      this.statsUtils.incrementErrorCount();
      return text;
    } finally {
      const endTime = performance.now();
      this.statsUtils.setProcessingTime(endTime - startTime);
    }
  }

  /**
   * Get or extract character information - only extract once per session
   * @param {string} text - The text to analyze
   * @return {Promise<object>} - Character map
   * @private
   */
  async #getOrExtractCharacterInfo(text) {
    if (
      this.characterAnalysisComplete &&
      Object.keys(this.sessionCharacterMap).length > 0
    ) {
      this.logger.debug("Using existing character data from session");
      return this.sessionCharacterMap;
    }

    this.logger.debug("Extracting character information...");
    const characterMap = this.novelUtils.extractCharacterNames(text);

    if (!this.novelUtils.isCurrentChapterEnhanced) {
      const updatedCharacterMap = await this.determineCharacterGenders(
        characterMap,
        text
      );
      this.sessionCharacterMap = updatedCharacterMap;
    } else {
      this.sessionCharacterMap = characterMap;
    }

    this.characterAnalysisComplete = true;

    const finalCharCount = Object.keys(this.sessionCharacterMap).length;
    this.statsUtils.setTotalCharactersDetected(finalCharCount);

    this.logger.debug(
      `Processed ${finalCharCount} characters for novel ${
        this.novelUtils.novelId
      }${
        this.novelUtils.chapterInfo?.chapterNumber
          ? ", chapter " + this.novelUtils.chapterInfo.chapterNumber
          : ""
      }`
    );

    return this.sessionCharacterMap;
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
    return Object.entries(characterMap || {}).map(([name, data]) => ({
      name,
      gender: data.gender,
      appearances: data.appearances
    }));
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
        data.gender === Constants.GENDER.UNKNOWN ||
        !data.confidence ||
        data.confidence < 0.7;

      if (needsGenderDetermination) {
        const genderInfo = this.genderUtils.guessGender(
          name,
          text,
          updatedCharacterMap
        );

        updatedCharacterMap[name] = {
          ...updatedCharacterMap[name],
          gender: genderInfo.gender, // Already compressed from genderUtils
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
    return await this.#getOrExtractCharacterInfo(text);
  }

  /**
   * Round prompt-token estimate up to the nearest power-of-2 KV-cache bucket,
   * adding 50% headroom for output tokens. Conservative 3.5 chars/token covers
   * the Chinese/English mix typical in web novel chapters.
   * @param {string} prompt
   * @param {number} maxCtx - User-configured ceiling (default 8192)
   * @return {number}
   */
  #computeDynamicCtx(prompt, maxCtx = 8192) {
    const estimate = Math.ceil(prompt.length / 3.5); // input tokens
    const needed   = Math.ceil(estimate * 1.5);       // +50% for output
    for (const b of [512, 1024, 2048, 4096, 8192]) {
      if (b >= needed) return Math.min(b, maxCtx);
    }
    return maxCtx;
  }

  /**
   * Enhance text using the LLM with character context
   * @param {string} text - Text to enhance
   * @param {string} characterSummary - Character information summary
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceTextWithLLM(text, characterSummary) {
    try {
      const novelStyle = this.novelUtils.analyzeNovelStyle(text);

      if (!this.novelUtils.chapterInfo) {
        this.novelUtils.chapterInfo = this.novelUtils.detectChapterInfo(
          document.title,
          text
        );
      }

      const novelInfo = {
        style: novelStyle.style,
        tone: novelStyle.tone,
        title: this.novelUtils.title,
        platform: this.novelUtils.detectPlatform(window.location.href),
        chapterInfo: this.novelUtils.chapterInfo
      };

      const settings = await this.ollamaClient.getLLMSettings();

      const prompt = this.promptGenerator.createEnhancementPrompt(
        text,
        characterSummary,
        novelInfo
      );

      const cacheKey   = SharedUtils.createHash(text);
      const dynamicCtx = this.#computeDynamicCtx(prompt, settings.contextSize || 8192);

      this.logger.info(`Enhancing chapter in one pass (${text.length} chars, num_ctx: ${dynamicCtx})`);

      const enhancedText = await this.ollamaClient.processWithLLM(
        settings.modelName,
        prompt,
        {
          num_predict: 4096,
          num_ctx: dynamicCtx,
          temperature: settings.temperature,
          top_p: settings.topP,
          timeout: settings.timeout,
          cacheKey
        }
      );

      this.logger.success("Chapter enhancement complete");
      return this.textProcessor.cleanLLMResponse(enhancedText);
    } catch (error) {
      this.logger.error("LLM enhancement error:", error);
      throw error;
    }
  }

}


