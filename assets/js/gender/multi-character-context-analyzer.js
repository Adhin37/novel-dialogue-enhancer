// Enhanced multi-character-context-analyzer.js with exposed sophisticated methods
/**
 * Advanced analyzer for handling multiple characters in same context
 * Enhanced integration with sophisticated analysis methods exposed
 */
class MultiCharacterContextAnalyzer extends BaseGenderAnalyzer {
  /**
   * Creates a new MultiCharacterContextAnalyzer instance
   */
  constructor() {
    super();
    this.sentenceCache = new Map();
    this.dialogueCache = new Map();
    this.interactionCache = new Map();
    this.analysisMetrics = {
      totalAnalyses: 0,
      cacheHits: 0,
      complexContextAnalyses: 0,
      crossValidations: 0
    };
  }

  /**
   * Analyze character gender with multi-character context awareness
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text context
   * @param {object} knownCharacters - Map of known characters
   * @return {object} - Enhanced analysis results
   */
  analyzeWithMultiCharacterContext(
    targetCharacter,
    text,
    knownCharacters = {}
  ) {
    if (!this._validateAnalysisInputs(targetCharacter, text)) {
      return this._createResult(0, 0, null);
    }

    this.analysisMetrics.totalAnalyses++;
    const hasComplexContext = Object.keys(knownCharacters).length >= 3;

    if (hasComplexContext) {
      this.analysisMetrics.complexContextAnalyses++;
    }

    const allCharacterNames = Object.keys(knownCharacters).concat([
      targetCharacter
    ]);
    const relevantSentences = this.#extractRelevantSentences(
      targetCharacter,
      text
    );

    let maleScore = 0;
    let femaleScore = 0;
    const evidenceList = [];

    // Analyze each sentence individually for better accuracy
    for (const sentence of relevantSentences) {
      const sentenceAnalysis = this.#analyzeSentenceContext(
        targetCharacter,
        sentence,
        allCharacterNames
      );

      maleScore += sentenceAnalysis.maleScore;
      femaleScore += sentenceAnalysis.femaleScore;

      if (sentenceAnalysis.evidence) {
        evidenceList.push(sentenceAnalysis.evidence);
      }
    }

    // Analyze dialogue attribution specifically
    const dialogueAnalysis = this.#analyzeDialogueAttribution(
      targetCharacter,
      text,
      allCharacterNames
    );
    maleScore += dialogueAnalysis.maleScore;
    femaleScore += dialogueAnalysis.femaleScore;

    if (dialogueAnalysis.evidence) {
      evidenceList.push(dialogueAnalysis.evidence);
    }

    // Check for character interaction patterns
    const interactionAnalysis = this.#analyzeCharacterInteractions(
      targetCharacter,
      text,
      knownCharacters
    );
    maleScore += interactionAnalysis.maleScore;
    femaleScore += interactionAnalysis.femaleScore;

    if (interactionAnalysis.evidence) {
      evidenceList.push(interactionAnalysis.evidence);
    }

    const finalEvidence =
      evidenceList.length > 0 ? evidenceList.join("; ") : null;
    return this._createResult(maleScore, femaleScore, finalEvidence);
  }

  /**
   * Public method to analyze dialogue attribution patterns
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text
   * @param {Array<string>} allCharacterNames - All character names
   * @return {object} - Analysis results
   */
  analyzeDialogueAttribution(targetCharacter, text, allCharacterNames) {
    return this.#analyzeDialogueAttribution(
      targetCharacter,
      text,
      allCharacterNames
    );
  }

  /**
   * Public method to analyze character interactions
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text
   * @param {object} knownCharacters - Known characters with gender info
   * @return {object} - Analysis results
   */
  analyzeCharacterInteractions(targetCharacter, text, knownCharacters) {
    return this.#analyzeCharacterInteractions(
      targetCharacter,
      text,
      knownCharacters
    );
  }

  /**
   * Public method to analyze sentence context
   * @param {string} targetCharacter - Character to analyze
   * @param {string} sentence - Sentence to analyze
   * @param {Array<string>} allCharacterNames - All character names
   * @return {object} - Analysis results
   */
  analyzeSentenceContext(targetCharacter, sentence, allCharacterNames) {
    return this.#analyzeSentenceContext(
      targetCharacter,
      sentence,
      allCharacterNames
    );
  }

  /**
   * Enhanced method to validate analysis results across multiple contexts
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text
   * @param {object} knownCharacters - Known characters
   * @param {object} preliminaryResult - Initial analysis result
   * @return {object} - Validated and potentially adjusted result
   */
  crossValidateAnalysis(
    targetCharacter,
    text,
    knownCharacters,
    preliminaryResult
  ) {
    this.analysisMetrics.crossValidations++;

    const contextValidation = this.analyzeWithMultiCharacterContext(
      targetCharacter,
      text,
      knownCharacters
    );

    const dialogueValidation = this.analyzeDialogueAttribution(
      targetCharacter,
      text,
      Object.keys(knownCharacters).concat([targetCharacter])
    );

    const interactionValidation = this.analyzeCharacterInteractions(
      targetCharacter,
      text,
      knownCharacters
    );

    // Calculate weighted consensus
    const totalMaleScore =
      preliminaryResult.maleScore * 0.4 +
      contextValidation.maleScore * 0.3 +
      dialogueValidation.maleScore * 0.2 +
      interactionValidation.maleScore * 0.1;

    const totalFemaleScore =
      preliminaryResult.femaleScore * 0.4 +
      contextValidation.femaleScore * 0.3 +
      dialogueValidation.femaleScore * 0.2 +
      interactionValidation.femaleScore * 0.1;

    const evidenceList = [
      preliminaryResult.evidence,
      contextValidation.evidence,
      dialogueValidation.evidence,
      interactionValidation.evidence
    ].filter((e) => e && e.trim().length > 0);

    return this._createResult(
      totalMaleScore,
      totalFemaleScore,
      evidenceList.length > 0
        ? `cross-validated: ${evidenceList.join("; ")}`
        : null
    );
  }

  /**
   * Analyze complex pronoun references with disambiguation
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Text context
   * @param {Array<string>} allCharacterNames - All character names
   * @param {object} options - Analysis options
   * @return {object} - Pronoun disambiguation results
   */
  analyzeComplexPronounReferences(
    targetCharacter,
    text,
    allCharacterNames,
    options = {}
  ) {
    const maxSentences = options.maxSentences || 20;
    const confidenceThreshold = options.confidenceThreshold || 0.7;

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const relevantSentences = sentences
      .filter((sentence) => sentence.includes(targetCharacter))
      .slice(0, maxSentences);

    let totalMaleScore = 0;
    let totalFemaleScore = 0;
    let highConfidenceMatches = 0;
    const evidenceList = [];

    for (const sentence of relevantSentences) {
      const analysis = this.#analyzeSentenceContext(
        targetCharacter,
        sentence,
        allCharacterNames
      );

      const confidence = Math.abs(analysis.maleScore - analysis.femaleScore);

      if (confidence >= confidenceThreshold) {
        highConfidenceMatches++;
        totalMaleScore += analysis.maleScore * 1.5; // Boost high-confidence results
        totalFemaleScore += analysis.femaleScore * 1.5;
      } else {
        totalMaleScore += analysis.maleScore;
        totalFemaleScore += analysis.femaleScore;
      }

      if (analysis.evidence) {
        evidenceList.push(analysis.evidence);
      }
    }

    const evidenceSummary =
      evidenceList.length > 0
        ? `pronoun analysis: ${evidenceList.slice(0, 3).join("; ")}`
        : null;

    return {
      ...this._createResult(totalMaleScore, totalFemaleScore, evidenceSummary),
      metadata: {
        sentencesAnalyzed: relevantSentences.length,
        highConfidenceMatches,
        confidenceRatio:
          relevantSentences.length > 0
            ? highConfidenceMatches / relevantSentences.length
            : 0
      }
    };
  }

  /**
   * Detect and resolve character name ambiguities
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Text context
   * @param {Array<string>} allCharacterNames - All character names
   * @return {object} - Ambiguity resolution results
   */
  resolveCharacterAmbiguities(targetCharacter, text, allCharacterNames) {
    const similarNames = allCharacterNames.filter((name) => {
      if (name === targetCharacter) return false;

      // Check for similar names that could cause confusion
      return (
        name.toLowerCase().includes(targetCharacter.toLowerCase()) ||
        targetCharacter.toLowerCase().includes(name.toLowerCase()) ||
        this.#calculateNameSimilarity(name, targetCharacter) > 0.7
      );
    });

    if (similarNames.length === 0) {
      return this._createResult(0, 0, "no name ambiguities detected");
    }

    // Analyze contexts where similar names appear together
    let ambiguityScore = 0;
    let resolutionConfidence = 0;
    const ambiguityEvidence = [];

    for (const similarName of similarNames) {
      const pattern = new RegExp(
        `\\b(${SharedUtils.escapeRegExp(
          targetCharacter
        )}|${SharedUtils.escapeRegExp(
          similarName
        )})\\b[^.!?]*\\b(${SharedUtils.escapeRegExp(
          targetCharacter
        )}|${SharedUtils.escapeRegExp(similarName)})\\b`,
        "gi"
      );

      const ambiguousContexts = text.match(pattern) || [];
      ambiguityScore += ambiguousContexts.length;

      if (ambiguousContexts.length > 0) {
        ambiguityEvidence.push(
          `ambiguous with ${similarName} (${ambiguousContexts.length} contexts)`
        );
      }
    }

    // Calculate resolution confidence based on distinct context analysis
    const uniqueContexts = this.#findUniqueCharacterContexts(
      targetCharacter,
      text,
      similarNames
    );
    resolutionConfidence =
      uniqueContexts.length /
      Math.max(1, ambiguityScore + uniqueContexts.length);

    return {
      ...this._createResult(0, 0, ambiguityEvidence.join("; ")),
      metadata: {
        ambiguityScore,
        resolutionConfidence,
        similarNames,
        uniqueContexts: uniqueContexts.length
      }
    };
  }

  /**
   * Get comprehensive analysis metrics
   * @return {object} - Analysis metrics and performance data
   */
  getAnalysisMetrics() {
    const cacheEfficiency =
      this.analysisMetrics.totalAnalyses > 0
        ? this.analysisMetrics.cacheHits / this.analysisMetrics.totalAnalyses
        : 0;

    return {
      ...this.analysisMetrics,
      cacheEfficiency,
      cacheSizes: {
        sentences: this.sentenceCache.size,
        dialogues: this.dialogueCache.size,
        interactions: this.interactionCache.size
      },
      memoryUsage: this.#estimateMemoryUsage()
    };
  }

  /**
   * Enhanced cache management with performance optimization
   */
  optimizeCaches() {
    const maxCacheSize = 100;
    const caches = [
      { cache: this.sentenceCache, name: "sentence" },
      { cache: this.dialogueCache, name: "dialogue" },
      { cache: this.interactionCache, name: "interaction" }
    ];

    for (const { cache, name } of caches) {
      if (cache.size > maxCacheSize) {
        const entries = Array.from(cache.entries());

        // Sort by access time if available, otherwise remove oldest entries
        entries.sort((a, b) => {
          const aTime = a[1]?.lastAccess || 0;
          const bTime = b[1]?.lastAccess || 0;
          return bTime - aTime;
        });

        // Keep only the most recent entries
        cache.clear();
        entries.slice(0, maxCacheSize * 0.8).forEach(([key, value]) => {
          cache.set(key, value);
        });

        console.debug(
          `Optimized ${name} cache: reduced from ${entries.length} to ${cache.size} entries`
        );
      }
    }
  }

  /**
   * Clear all analysis caches
   */
  clearCaches() {
    this.sentenceCache.clear();
    this.dialogueCache.clear();
    this.interactionCache.clear();

    // Reset metrics
    this.analysisMetrics.cacheHits = 0;

    console.debug("All MultiCharacterContextAnalyzer caches cleared");
  }

  /**
   * Calculate similarity between two character names
   * @param {string} name1 - First name
   * @param {string} name2 - Second name
   * @return {number} - Similarity score (0-1)
   * @private
   */
  #calculateNameSimilarity(name1, name2) {
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.#calculateEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate edit distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @return {number} - Edit distance
   * @private
   */
  #calculateEditDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find contexts unique to the target character
   * @param {string} targetCharacter - Target character name
   * @param {string} text - Text to analyze
   * @param {Array<string>} similarNames - Similar character names
   * @return {Array} - Unique contexts
   * @private
   */
  #findUniqueCharacterContexts(targetCharacter, text, similarNames) {
    const targetPattern = new RegExp(
      `[^.!?]*\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b[^.!?]*[.!?]`,
      "gi"
    );

    const targetContexts = text.match(targetPattern) || [];

    return targetContexts.filter((context) => {
      return !similarNames.some((similarName) =>
        context.toLowerCase().includes(similarName.toLowerCase())
      );
    });
  }

  /**
   * Estimate memory usage of caches
   * @return {number} - Estimated memory usage in bytes
   * @private
   */
  #estimateMemoryUsage() {
    const estimateObjectSize = (obj) => {
      return JSON.stringify(obj).length * 2; // Rough estimate: 2 bytes per character
    };

    let totalSize = 0;

    for (const value of this.sentenceCache.values()) {
      totalSize += estimateObjectSize(value);
    }

    for (const value of this.dialogueCache.values()) {
      totalSize += estimateObjectSize(value);
    }

    for (const value of this.interactionCache.values()) {
      totalSize += estimateObjectSize(value);
    }

    return totalSize;
  }

  // Existing private methods remain unchanged
  #analyzeDialogueAttribution(targetCharacter, text, allCharacterNames) {
    const cacheKey = `dialogue:${targetCharacter}:${SharedUtils.createHash(
      text
    )}`;

    if (this.dialogueCache.has(cacheKey)) {
      this.analysisMetrics.cacheHits++;
      const cached = this.dialogueCache.get(cacheKey);
      cached.lastAccess = Date.now();
      return cached;
    }

    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const dialoguePatterns = [
      /"([^"]+)",\s*([^.!?]+?)\s+(said|replied|asked|exclaimed|whispered|muttered)/gi,
      /([^.!?]+?)\s+(said|replied|asked|exclaimed|whispered|muttered),?\s*"([^"]+)"/gi
    ];

    for (const pattern of dialoguePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const speakerSection =
          pattern === dialoguePatterns[0] ? match[2] : match[1];

        const targetRegex = new RegExp(
          `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
          "i"
        );
        if (!targetRegex.test(speakerSection)) continue;

        const attributionAnalysis = this.#analyzeDialogueAttributionSection(
          targetCharacter,
          speakerSection,
          allCharacterNames
        );

        maleScore += attributionAnalysis.maleScore;
        femaleScore += attributionAnalysis.femaleScore;

        if (attributionAnalysis.evidence && !evidence) {
          evidence = attributionAnalysis.evidence;
        }
      }
    }

    const result = {
      maleScore,
      femaleScore,
      evidence,
      lastAccess: Date.now()
    };

    this.dialogueCache.set(cacheKey, result);

    // Optimize cache if needed
    if (this.dialogueCache.size > 150) {
      this.optimizeCaches();
    }

    return result;
  }

  #analyzeCharacterInteractions(targetCharacter, text, knownCharacters) {
    const cacheKey = `interactions:${targetCharacter}:${Object.keys(
      knownCharacters
    )
      .sort()
      .join(",")}`;

    if (this.interactionCache.has(cacheKey)) {
      this.analysisMetrics.cacheHits++;
      const cached = this.interactionCache.get(cacheKey);
      cached.lastAccess = Date.now();
      return cached;
    }

    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const interactionPatterns = [
      {
        patterns: [
          `\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b[^.!?]*\\b(loved|kissed|embraced|married|dating)\\b[^.!?]*\\b(\\w+)\\b`,
          `\\b(\\w+)\\b[^.!?]*\\b(loved|kissed|embraced|married|dating)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b`
        ],
        weight: 3
      },
      {
        patterns: [
          `\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b[^.!?]*\\b(brother|sister|son|daughter|father|mother|husband|wife)\\b[^.!?]*\\b(\\w+)\\b`,
          `\\b(\\w+)\\b[^.!?]*\\b(brother|sister|son|daughter|father|mother|husband|wife)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b`
        ],
        weight: 4
      }
    ];

    for (const patternGroup of interactionPatterns) {
      for (const pattern of patternGroup.patterns) {
        const regex = new RegExp(pattern, "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
          const otherCharacter =
            match[1] !== targetCharacter ? match[1] : match[3];
          const relationshipType = match[2];

          if (
            knownCharacters[otherCharacter] &&
            knownCharacters[otherCharacter].gender !== "unknown"
          ) {
            const otherGender = SharedUtils.expandGender(
              knownCharacters[otherCharacter].gender
            );
            const confidence = knownCharacters[otherCharacter].confidence || 0;

            if (confidence >= 0.7) {
              const genderInference = this.#inferGenderFromRelationship(
                relationshipType,
                otherGender
              );

              if (genderInference.gender === "male") {
                maleScore += patternGroup.weight;
                evidence = `relationship inference: ${relationshipType} with ${otherGender} ${otherCharacter}`;
              } else if (genderInference.gender === "female") {
                femaleScore += patternGroup.weight;
                evidence = `relationship inference: ${relationshipType} with ${otherGender} ${otherCharacter}`;
              }
            }
          }
        }
      }
    }

    const result = {
      maleScore,
      femaleScore,
      evidence,
      lastAccess: Date.now()
    };

    this.interactionCache.set(cacheKey, result);
    return result;
  }

  // All other existing private methods remain unchanged...
  #analyzeSentenceContext(targetCharacter, sentence, allCharacterNames) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const targetRegex = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
      "i"
    );
    const targetMatch = sentence.match(targetRegex);

    if (!targetMatch) {
      return { maleScore: 0, femaleScore: 0, evidence: null };
    }

    const targetPosition = targetMatch.index;
    const otherCharactersInSentence = this.#findOtherCharactersInSentence(
      sentence,
      targetCharacter,
      allCharacterNames
    );

    if (otherCharactersInSentence.length > 0) {
      const isolatedAnalysis = this.#analyzeIsolatedPronounReference(
        targetCharacter,
        sentence,
        targetPosition,
        otherCharactersInSentence
      );

      maleScore += isolatedAnalysis.maleScore;
      femaleScore += isolatedAnalysis.femaleScore;
      evidence = isolatedAnalysis.evidence;
    } else {
      const directAnalysis = this.#analyzeDirectPronounReference(
        targetCharacter,
        sentence
      );
      maleScore += directAnalysis.maleScore;
      femaleScore += directAnalysis.femaleScore;
      evidence = directAnalysis.evidence;
    }

    const possessiveAnalysis = this.#analyzePossessivePatterns(
      targetCharacter,
      sentence
    );
    maleScore += possessiveAnalysis.maleScore;
    femaleScore += possessiveAnalysis.femaleScore;

    if (possessiveAnalysis.evidence && !evidence) {
      evidence = possessiveAnalysis.evidence;
    }

    return { maleScore, femaleScore, evidence };
  }

  // Keep all existing helper methods unchanged...
  #extractRelevantSentences(targetCharacter, text) {
    const cacheKey = `${targetCharacter}:${SharedUtils.createHash(text)}`;

    if (this.sentenceCache.has(cacheKey)) {
      this.analysisMetrics.cacheHits++;
      const cached = this.sentenceCache.get(cacheKey);
      cached.lastAccess = Date.now();
      return cached.sentences;
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const relevantSentences = [];
    const characterRegex = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
      "i"
    );

    for (const sentence of sentences) {
      if (characterRegex.test(sentence)) {
        relevantSentences.push(sentence.trim());
      }
    }

    const cacheEntry = {
      sentences: relevantSentences,
      lastAccess: Date.now()
    };

    this.sentenceCache.set(cacheKey, cacheEntry);
    return relevantSentences;
  }

  // Include all remaining private helper methods...
  #analyzeDialogueAttributionSection(
    targetCharacter,
    attributionSection,
    allCharacterNames
  ) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const otherCharactersPresent = allCharacterNames.some(
      (name) =>
        name !== targetCharacter &&
        new RegExp(`\\b${SharedUtils.escapeRegExp(name)}\\b`, "i").test(
          attributionSection
        )
    );

    if (!otherCharactersPresent) {
      const malePronouns = (
        attributionSection.match(/\b(he|him|his)\b/gi) || []
      ).length;
      const femalePronouns = (
        attributionSection.match(/\b(she|her|hers)\b/gi) || []
      ).length;

      if (malePronouns > 0) {
        maleScore += malePronouns * 3;
        evidence = `dialogue attribution: ${malePronouns} male pronouns`;
      }

      if (femalePronouns > 0) {
        femaleScore += femalePronouns * 3;
        evidence = `dialogue attribution: ${femalePronouns} female pronouns`;
      }
    } else {
      const isolatedAnalysis = this.#analyzeIsolatedPronounReference(
        targetCharacter,
        attributionSection,
        attributionSection.indexOf(targetCharacter),
        this.#findOtherCharactersInSentence(
          attributionSection,
          targetCharacter,
          allCharacterNames
        )
      );

      maleScore += isolatedAnalysis.maleScore * 1.5;
      femaleScore += isolatedAnalysis.femaleScore * 1.5;
      evidence = isolatedAnalysis.evidence;
    }

    return { maleScore, femaleScore, evidence };
  }

  #inferGenderFromRelationship(relationshipType, partnerGender) {
    const relationshipRules = {
      loved: { male: "female", female: "male" },
      kissed: { male: "female", female: "male" },
      embraced: { male: "female", female: "male" },
      married: { male: "female", female: "male" },
      dating: { male: "female", female: "male" },

      husband: { female: "male" },
      wife: { male: "female" },
      father: { "*": "male" },
      mother: { "*": "female" },
      son: { "*": "male" },
      daughter: { "*": "female" },
      brother: { "*": "male" },
      sister: { "*": "female" }
    };

    const rule = relationshipRules[relationshipType.toLowerCase()];
    if (!rule) {
      return { gender: "unknown" };
    }

    if (rule["*"]) {
      return { gender: rule["*"] };
    }

    if (rule[partnerGender]) {
      return { gender: rule[partnerGender] };
    }

    return { gender: "unknown" };
  }

  #findOtherCharactersInSentence(sentence, targetCharacter, allCharacterNames) {
    const otherCharacters = [];

    for (const characterName of allCharacterNames) {
      if (characterName === targetCharacter) continue;

      const regex = new RegExp(
        `\\b${SharedUtils.escapeRegExp(characterName)}\\b`,
        "i"
      );
      const match = sentence.match(regex);

      if (match) {
        otherCharacters.push({
          name: characterName,
          position: match.index
        });
      }
    }

    return otherCharacters.sort((a, b) => a.position - b.position);
  }

  #analyzeIsolatedPronounReference(
    targetCharacter,
    sentence,
    targetPosition,
    otherCharacters
  ) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const pronounMatches = this.#findPronounsWithPositions(sentence);

    for (const pronounMatch of pronounMatches) {
      const { pronoun, position, type } = pronounMatch;

      const likelyCharacter = this.#determinePronounReference(
        targetCharacter,
        targetPosition,
        otherCharacters,
        position,
        sentence
      );

      if (likelyCharacter === targetCharacter) {
        if (type === "male") {
          maleScore += 2;
          evidence = `isolated pronoun '${pronoun}' likely refers to ${targetCharacter}`;
        } else if (type === "female") {
          femaleScore += 2;
          evidence = `isolated pronoun '${pronoun}' likely refers to ${targetCharacter}`;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  #findPronounsWithPositions(sentence) {
    const pronouns = [
      { patterns: ["\\bhe\\b", "\\bhim\\b", "\\bhis\\b"], type: "male" },
      { patterns: ["\\bshe\\b", "\\bher\\b", "\\bhers\\b"], type: "female" }
    ];

    const matches = [];

    for (const pronounGroup of pronouns) {
      for (const pattern of pronounGroup.patterns) {
        const regex = new RegExp(pattern, "gi");
        let match;

        while ((match = regex.exec(sentence)) !== null) {
          matches.push({
            pronoun: match[0],
            position: match.index,
            type: pronounGroup.type
          });
        }
      }
    }

    return matches.sort((a, b) => a.position - b.position);
  }

  #determinePronounReference(
    targetCharacter,
    targetPosition,
    otherCharacters,
    pronounPosition,
    sentence
  ) {
    const allCharacters = [
      { name: targetCharacter, position: targetPosition },
      ...otherCharacters
    ];

    const sortedByDistance = allCharacters
      .map((char) => ({
        ...char,
        distance: Math.abs(char.position - pronounPosition)
      }))
      .sort((a, b) => a.distance - b.distance);

    const beforePronoun = sentence.substring(0, pronounPosition);

    const speechVerbMatch = beforePronoun.match(
      /\b(said|replied|asked|exclaimed)\s*$/
    );
    if (speechVerbMatch) {
      const speechVerbPosition = speechVerbMatch.index;
      let closestCharacterToSpeechVerb = null;
      let closestDistance = Infinity;

      for (const character of allCharacters) {
        if (character.position < speechVerbPosition) {
          const distance = speechVerbPosition - character.position;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestCharacterToSpeechVerb = character;
          }
        }
      }

      if (closestCharacterToSpeechVerb) {
        return closestCharacterToSpeechVerb.name;
      }
    }

    if (/\b(his|her|hers)\s+\w+/.test(sentence.substring(pronounPosition))) {
      return sortedByDistance[0].name;
    }

    return sortedByDistance[0].name;
  }

  #analyzeDirectPronounReference(targetCharacter, sentence) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const malePronouns = (sentence.match(/\b(he|him|his)\b/gi) || []).length;
    if (malePronouns > 0) {
      maleScore += malePronouns * 2;
      evidence = `direct pronoun reference: ${malePronouns} male pronouns`;
    }

    const femalePronouns = (sentence.match(/\b(she|her|hers)\b/gi) || [])
      .length;
    if (femalePronouns > 0) {
      femaleScore += femalePronouns * 2;
      evidence = `direct pronoun reference: ${femalePronouns} female pronouns`;
    }

    return { maleScore, femaleScore, evidence };
  }

  #analyzePossessivePatterns(targetCharacter, sentence) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const possessivePattern = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}'s\\s+(\\w+)`,
      "gi"
    );

    const possessiveMatches = Array.from(sentence.matchAll(possessivePattern));

    for (const match of possessiveMatches) {
      const possessedItem = match[1].toLowerCase();

      const maleItems = [
        "wife",
        "girlfriend",
        "daughter",
        "sister",
        "mother",
        "bride"
      ];
      const femaleItems = [
        "husband",
        "boyfriend",
        "son",
        "brother",
        "father",
        "groom"
      ];

      if (maleItems.includes(possessedItem)) {
        maleScore += 3;
        evidence = `possessive: ${targetCharacter}'s ${possessedItem}`;
        break;
      } else if (femaleItems.includes(possessedItem)) {
        femaleScore += 3;
        evidence = `possessive: ${targetCharacter}'s ${possessedItem}`;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }
}

if (typeof module !== "undefined") {
  module.exports = MultiCharacterContextAnalyzer;
} else {
  window.MultiCharacterContextAnalyzer = MultiCharacterContextAnalyzer;
}
