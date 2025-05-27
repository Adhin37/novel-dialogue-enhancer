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

    // Add flag to track if character analysis was already done for this session
    this.characterAnalysisComplete = false;
    this.sessionCharacterMap = {};

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
   * Get or extract character information - only extract once per session
   * @param {string} text - The text to analyze
   * @return {Promise<object>} - Character map
   * @private
   */
  async #getOrExtractCharacterInfo(text) {
    // If we already have character data for this session, return it
    if (
      this.characterAnalysisComplete &&
      Object.keys(this.sessionCharacterMap).length > 0
    ) {
      console.log("Using existing character data from session");
      return this.sessionCharacterMap;
    }

    // Extract character information for the first time
    console.log("Extracting character information...");
    const characterMap = await this.novelUtils.extractCharacterNames(text);

    const startCharCount = Object.keys(characterMap).length;
    console.log(`Starting with ${startCharCount} characters`);

    // If the current chapter was already enhanced, we might be using cached data
    if (!this.novelUtils.isCurrentChapterEnhanced) {
      // Apply gender detection to any characters with unknown gender
      const updatedCharacterMap = await this.determineCharacterGenders(
        characterMap,
        text
      );
      this.sessionCharacterMap = updatedCharacterMap;
    } else {
      this.sessionCharacterMap = characterMap;
    }

    // Mark character analysis as complete for this session
    this.characterAnalysisComplete = true;

    // Track new characters found - use 0 as baseline since characterMap includes all characters
    const finalCharCount = Object.keys(this.sessionCharacterMap).length;
    const newCharCount = Math.max(0, finalCharCount - 0); // Always use 0 as baseline
    this.statsUtils.setTotalCharactersDetected(newCharCount);

    console.log(
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
    return Object.entries(SharedUtils.deepClone(characterMap) || {}).map(
      ([name, data]) => ({
        name,
        gender: data.gender,
        appearances: data.appearances
      })
    );
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
    const BATCH_DELAY = Constants.PROCESSING.BATCH_DELAY_MS;
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

  // Enhanced methods for ContentEnhancerIntegration to better utilize MultiCharacterContextAnalyzer

  /**
   * Enhanced method to determine character genders with better multi-character analysis
   * This method should be added to the ContentEnhancerIntegration class
   */
  async determineCharacterGendersEnhanced(characterMap, text) {
    const updatedCharacterMap = { ...characterMap };
    const characterNames = Object.keys(updatedCharacterMap);

    const unknownGenderCharacters = [];

    for (const [name, data] of Object.entries(updatedCharacterMap)) {
      const needsGenderDetermination =
        data.gender === Constants.GENDER.UNKNOWN ||
        !data.confidence ||
        data.confidence < 0.7;

      if (needsGenderDetermination) {
        unknownGenderCharacters.push(name);
      }
    }

    console.log(
      `Analyzing ${unknownGenderCharacters.length} characters with unknown/low-confidence gender`
    );

    if (characterNames.length >= 3 && unknownGenderCharacters.length > 0) {
      console.log(
        "Using enhanced multi-character analysis for complex character set"
      );

      const interactionInsights = this.#analyzeCharacterInteractionNetwork(
        characterNames,
        text,
        updatedCharacterMap
      );

      this.#applyInteractionInsights(updatedCharacterMap, interactionInsights);
    }

    for (const name of unknownGenderCharacters) {
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

      console.log(
        `Enhanced analysis for ${name}: ${SharedUtils.expandGender(
          genderInfo.gender
        )} (confidence: ${Math.round(genderInfo.confidence * 100)}%)`
      );
    }

    if (characterNames.length >= 4) {
      this.#performCharacterSetCrossValidation(updatedCharacterMap, text);
    }
    this.genderUtils.multiCharacterAnalyzer.optimizeCaches();

    this.novelUtils.syncCharacterMap(updatedCharacterMap);
    return updatedCharacterMap;
  }

  /**
   * Analyze character interaction networks to provide better context
   * @param {Array} characterNames - All character names
   * @param {string} text - Text context
   * @param {object} characterMap - Current character map
   * @return {object} - Interaction insights
   * @private
   */
  #analyzeCharacterInteractionNetwork(characterNames, text, characterMap) {
    const interactions = {
      relationships: new Map(),
      dialoguePatterns: new Map(),
      coOccurrences: new Map(),
      genderClues: new Map()
    };

    for (const name1 of characterNames) {
      for (const name2 of characterNames) {
        if (name1 === name2) continue;

        const pairKey = [name1, name2].sort().join("|");

        const coOccurrencePattern = new RegExp(
          `[^.!?]*\\b${SharedUtils.escapeRegExp(
            name1
          )}\\b[^.!?]*\\b${SharedUtils.escapeRegExp(name2)}\\b[^.!?]*[.!?]`,
          "gi"
        );

        const coOccurrences = (text.match(coOccurrencePattern) || []).length;
        if (coOccurrences > 0) {
          interactions.coOccurrences.set(pairKey, coOccurrences);
        }

        const relationshipAnalysis =
          this.genderUtils.relationshipAnalyzer.inferGenderFromRelated(
            name1,
            text,
            { [name2]: characterMap[name2] || { gender: "u", confidence: 0 } }
          );

        if (relationshipAnalysis.evidence) {
          interactions.relationships.set(pairKey, relationshipAnalysis);
        }
      }
    }

    console.log(
      `Interaction analysis: ${interactions.coOccurrences.size} co-occurrences, ${interactions.relationships.size} relationships`
    );

    return interactions;
  }

  /**
   * Apply interaction insights to improve character analysis context
   * @param {object} characterMap - Character map to enhance
   * @param {object} interactions - Interaction insights
   * @private
   */
  #applyInteractionInsights(characterMap, interactions) {
    for (const [pairKey, relationshipData] of interactions.relationships) {
      const [name1, name2] = pairKey.split("|");

      const char1 = characterMap[name1];
      const char2 = characterMap[name2];

      if (!char1 || !char2) continue;

      const char1HasKnownGender =
        char1.gender !== Constants.GENDER.UNKNOWN &&
        (char1.confidence || 0) >= 0.7;
      const char2HasKnownGender =
        char2.gender !== Constants.GENDER.UNKNOWN &&
        (char2.confidence || 0) >= 0.7;

      if (relationshipData.maleScore > 2 || relationshipData.femaleScore > 2) {
        if (char1HasKnownGender && !char2HasKnownGender) {
          if (!char2.relationshipHints) char2.relationshipHints = [];
          char2.relationshipHints.push({
            relatedCharacter: name1,
            relatedGender: char1.gender,
            evidence: relationshipData.evidence,
            strength: Math.max(
              relationshipData.maleScore,
              relationshipData.femaleScore
            )
          });
        } else if (char2HasKnownGender && !char1HasKnownGender) {
          // Use char2's gender to inform char1's analysis
          if (!char1.relationshipHints) char1.relationshipHints = [];
          char1.relationshipHints.push({
            relatedCharacter: name2,
            relatedGender: char2.gender,
            evidence: relationshipData.evidence,
            strength: Math.max(
              relationshipData.maleScore,
              relationshipData.femaleScore
            )
          });
        }
      }
    }

    // Apply co-occurrence patterns for dialogue attribution improvement
    for (const [pairKey, count] of interactions.coOccurrences) {
      if (count >= 3) {
        // Frequent co-occurrence
        const [name1, name2] = pairKey.split("|");
        const char1 = characterMap[name1];
        const char2 = characterMap[name2];

        if (char1) {
          if (!char1.frequentCoOccurrences) char1.frequentCoOccurrences = [];
          char1.frequentCoOccurrences.push({ name: name2, count });
        }

        if (char2) {
          if (!char2.frequentCoOccurrences) char2.frequentCoOccurrences = [];
          char2.frequentCoOccurrences.push({ name: name1, count });
        }
      }
    }
  }

  /**
   * Perform cross-validation of character gender assignments
   * @param {object} characterMap - Character map to validate
   * @param {string} text - Text context
   * @private
   */
  #performCharacterSetCrossValidation(characterMap, text) {
    const characterNames = Object.keys(characterMap);
    let validationAdjustments = 0;

    console.log("Performing character set cross-validation...");

    for (const [name, data] of Object.entries(characterMap)) {
      if ((data.confidence || 0) < 0.9) {
        // Only validate uncertain characters

        // Use multi-character analyzer for cross-validation
        const crossValidationResult =
          this.genderUtils.multiCharacterAnalyzer.crossValidateAnalysis(
            name,
            text,
            characterMap,
            {
              maleScore: data.gender === Constants.GENDER.MALE ? 5 : 0,
              femaleScore: data.gender === Constants.GENDER.FEMALE ? 5 : 0,
              evidence: data.evidence ? data.evidence.join("; ") : null
            }
          );

        // Check for significant disagreement
        const currentGender = data.gender;
        const validatedGender =
          crossValidationResult.maleScore > crossValidationResult.femaleScore
            ? Constants.GENDER.MALE
            : crossValidationResult.femaleScore >
              crossValidationResult.maleScore
            ? Constants.GENDER.FEMALE
            : Constants.GENDER.UNKNOWN;

        if (
          currentGender !== validatedGender &&
          validatedGender !== Constants.GENDER.UNKNOWN
        ) {
          const validationConfidence =
            Math.abs(
              crossValidationResult.maleScore -
                crossValidationResult.femaleScore
            ) / 10;

          if (validationConfidence > (data.confidence || 0) + 0.2) {
            console.log(
              `Cross-validation adjustment for ${name}: ${SharedUtils.expandGender(
                currentGender
              )} → ${SharedUtils.expandGender(validatedGender)}`
            );

            characterMap[name] = {
              ...data,
              gender: validatedGender,
              confidence: Math.min(0.95, validationConfidence),
              evidence: [
                ...(data.evidence || []),
                `cross-validated: ${
                  crossValidationResult.evidence || "multi-character analysis"
                }`
              ].slice(0, Constants.STORAGE.MAX_EVIDENCE_ENTRIES)
            };

            validationAdjustments++;
          }
        }
      }
    }

    if (validationAdjustments > 0) {
      console.log(`Cross-validation made ${validationAdjustments} adjustments`);
    }
  }

  /**
   * Enhanced setup character context method that leverages multi-character analysis
   * This method should replace the existing setupCharacterContext in ContentEnhancerIntegration
   */
  async setupCharacterContextEnhanced() {
    const text = document.body.textContent;

    // Get initial character context
    const characterMap = await this.#getOrExtractCharacterInfo(text);

    // If we have multiple characters, perform enhanced analysis
    if (Object.keys(characterMap).length >= 2) {
      console.log(
        "Performing enhanced character context setup with multi-character analysis"
      );

      // Use enhanced multi-character analysis
      const enhancedCharacterMap = await this.determineCharacterGendersEnhanced(
        characterMap,
        text
      );

      // Detect and resolve any character name ambiguities
      this.#resolveCharacterAmbiguities(enhancedCharacterMap, text);

      // Get performance metrics
      const analysisMetrics =
        this.genderUtils.multiCharacterAnalyzer.getAnalysisMetrics();
      console.log("Multi-character analysis metrics:", {
        totalAnalyses: analysisMetrics.totalAnalyses,
        complexAnalyses: analysisMetrics.complexContextAnalyses,
        cacheEfficiency:
          Math.round(analysisMetrics.cacheEfficiency * 100) + "%",
        memoryUsage: Math.round(analysisMetrics.memoryUsage / 1024) + "KB"
      });

      return enhancedCharacterMap;
    }

    // Fallback to standard analysis for simple character sets
    return await this.#getOrExtractCharacterInfo(text);
  }

  /**
   * Resolve character name ambiguities in multi-character contexts
   * @param {object} characterMap - Character map to analyze
   * @param {string} text - Text context
   * @private
   */
  #resolveCharacterAmbiguities(characterMap, text) {
    const characterNames = Object.keys(characterMap);

    if (characterNames.length < 2) return; // No ambiguities possible with < 2 characters

    for (const characterName of characterNames) {
      const ambiguityResult =
        this.genderUtils.multiCharacterAnalyzer.resolveCharacterAmbiguities(
          characterName,
          text,
          characterNames
        );

      if (
        ambiguityResult.metadata &&
        ambiguityResult.metadata.ambiguityScore > 0
      ) {
        console.log(`Detected potential name ambiguity for ${characterName}:`, {
          ambiguityScore: ambiguityResult.metadata.ambiguityScore,
          resolutionConfidence:
            Math.round(ambiguityResult.metadata.resolutionConfidence * 100) +
            "%",
          similarNames: ambiguityResult.metadata.similarNames
        });

        // Store ambiguity information for future reference
        if (characterMap[characterName]) {
          characterMap[characterName].ambiguityData = {
            score: ambiguityResult.metadata.ambiguityScore,
            confidence: ambiguityResult.metadata.resolutionConfidence,
            similarNames: ambiguityResult.metadata.similarNames
          };
        }
      }
    }
  }

  /**
   * Get enhanced statistics including multi-character analysis metrics
   * This method should be added to ContentEnhancerIntegration
   */
  getEnhancedAnalysisStats() {
    const baseStats = this.statsUtils.getStats();
    const genderStats = this.genderUtils.getEnhancedStats();
    const multiCharStats =
      this.genderUtils.multiCharacterAnalyzer.getAnalysisMetrics();

    return {
      ...baseStats,
      genderAnalysis: genderStats,
      multiCharacterAnalysis: {
        totalAnalyses: multiCharStats.totalAnalyses,
        complexContextAnalyses: multiCharStats.complexContextAnalyses,
        crossValidations: multiCharStats.crossValidations,
        cacheEfficiency: multiCharStats.cacheEfficiency,
        cacheHitRate:
          multiCharStats.cacheHits / Math.max(1, multiCharStats.totalAnalyses),
        memoryUsage: multiCharStats.memoryUsage
      }
    };
  }

  /**
   * Performance optimization method to clear caches when character context changes significantly
   * This method should be called when moving between different novels or chapters
   */
  optimizePerformance() {
    this.genderUtils.multiCharacterAnalyzer.optimizeCaches();

    const currentCharacterMapSize = Object.keys(
      this.sessionCharacterMap || {}
    ).length;

    if (
      currentCharacterMapSize === 0 ||
      currentCharacterMapSize !== this.lastCharacterMapSize
    ) {
      this.genderUtils.clearAnalysisCaches();
      this.lastCharacterMapSize = currentCharacterMapSize;

      console.log("Cleared analysis caches due to character map changes");
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = ContentEnhancerIntegration;
} else {
  window.enhancerIntegration = ContentEnhancerIntegration;
}
