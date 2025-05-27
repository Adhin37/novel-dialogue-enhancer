// Enhanced gender-utils.js with better MultiCharacterContextAnalyzer integration
/**
 * Core gender utilities module for Novel Dialogue Enhancer
 * Coordinates other specialized modules for gender detection with enhanced multi-character analysis
 */
class GenderUtils {
  /**
   * Creates a new GenderUtils instance
   * Initializes all specialized analyzers with enhanced multi-character context integration
   */
  constructor() {
    console.debug(
      "Novel Dialogue Enhancer: Gender Utils initialized with enhanced multi-character analysis"
    );

    // Initialize statistics
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;
    this.multiCharacterValidationCount = 0;
    this.crossValidationSuccessCount = 0;

    // Cultural origin tracking
    this.culturalOrigins = {
      western: 0,
      chinese: 0,
      japanese: 0,
      korean: 0
    };

    // Initialize specialized analyzers
    this.culturalAnalyzer = new CulturalAnalyzer();
    this.nameAnalyzer = new NameAnalyzer();
    this.pronounAnalyzer = new PronounAnalyzer();
    this.relationshipAnalyzer = new RelationshipAnalyzer();
    this.appearanceAnalyzer = new AppearanceAnalyzer();

    // Enhanced multi-character analyzer integration
    this.multiCharacterAnalyzer = new MultiCharacterContextAnalyzer();
    this.lastCharacterMapHash = null;
    this.characterInteractionCache = new Map();
  }

  /**
   * Enhanced character gender detection with comprehensive multi-character context awareness
   * @param {string} name - The character name
   * @param {string} text - Surrounding text context
   * @param {object} characterMap - Existing character data
   * @return {object} - Detailed gender information with confidence
   */
  guessGender(name, text, characterMap = {}) {
    if (!this._validateAnalysisInputs(name, text)) {
      return this.#createGenderResult("unknown", 0, ["invalid input"]);
    }

    if (name.length <= 1) {
      return this.#createGenderResult("unknown", 0, ["name too short"]);
    }

    const characterMapHash = this.#createCharacterMapHash(characterMap);
    const useAdvancedAnalysis = Object.keys(characterMap).length >= 2;

    let maleScore = 0;
    let femaleScore = 0;
    const evidence = [];
    const analysisMetadata = {
      useAdvancedAnalysis,
      characterCount: Object.keys(characterMap).length,
      crossValidated: false,
      multiCharacterAnalyzed: false
    };

    // Step 1: Detect cultural origin
    const culturalOrigin = this.culturalAnalyzer.detectNameCulturalOrigin(
      name,
      text
    );
    this.culturalOrigins[culturalOrigin]++;

    // Step 2: Enhanced multi-character context analysis (primary method with higher priority)
    let multiCharResult = null;
    if (useAdvancedAnalysis) {
      multiCharResult = this.#performAdvancedMultiCharacterAnalysis(
        name,
        text,
        characterMap,
        culturalOrigin
      );

      // Apply enhanced weighting for multi-character analysis
      const multiCharWeight = this.#calculateMultiCharacterWeight(characterMap);
      maleScore += multiCharResult.maleScore * multiCharWeight;
      femaleScore += multiCharResult.femaleScore * multiCharWeight;

      if (multiCharResult.evidence) {
        evidence.push(`multi-char: ${multiCharResult.evidence}`);
      }

      analysisMetadata.multiCharacterAnalyzed = true;
      this.multiCharacterValidationCount++;
    } else {
      // Standard multi-character analysis for smaller character sets
      multiCharResult =
        this.multiCharacterAnalyzer.analyzeWithMultiCharacterContext(
          name,
          text,
          characterMap
        );
      maleScore += multiCharResult.maleScore;
      femaleScore += multiCharResult.femaleScore;

      if (multiCharResult.evidence) {
        evidence.push(multiCharResult.evidence);
      }
    }

    // Step 3: Perform traditional analysis methods
    const traditionalAnalysisResult = this.#performTraditionalAnalysis(
      name,
      text,
      culturalOrigin,
      characterMap
    );

    maleScore += traditionalAnalysisResult.maleScore;
    femaleScore += traditionalAnalysisResult.femaleScore;
    evidence.push(...traditionalAnalysisResult.evidence);

    // Step 4: Cross-validation using multi-character analyzer (if enough characters)
    if (useAdvancedAnalysis && multiCharResult) {
      const crossValidationResult = this.#performCrossValidation(
        name,
        text,
        characterMap,
        { maleScore, femaleScore },
        multiCharResult
      );

      maleScore = crossValidationResult.maleScore;
      femaleScore = crossValidationResult.femaleScore;

      if (crossValidationResult.evidenceAdjustment) {
        evidence.push(crossValidationResult.evidenceAdjustment);
      }

      analysisMetadata.crossValidated = true;
      if (crossValidationResult.adjustmentMade) {
        this.crossValidationSuccessCount++;
      }
    }

    // Step 5: Apply sophisticated confidence calculation
    const finalResult = this.#calculateFinalResult(
      name,
      maleScore,
      femaleScore,
      culturalOrigin,
      evidence,
      analysisMetadata
    );

    // Step 6: Cache character interaction patterns for future analysis
    this.#cacheCharacterInteractionPatterns(
      name,
      characterMap,
      multiCharResult
    );

    return finalResult;
  }

  /**
   * Perform advanced multi-character analysis using all sophisticated methods
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {object} characterMap - Character map
   * @param {string} culturalOrigin - Cultural origin
   * @return {object} - Enhanced analysis results
   * @private
   */
  #performAdvancedMultiCharacterAnalysis(
    name,
    text,
    characterMap,
    culturalOrigin
  ) {
    let totalMaleScore = 0;
    let totalFemaleScore = 0;
    const evidenceList = [];

    // 1. Comprehensive multi-character context analysis
    const contextResult =
      this.multiCharacterAnalyzer.analyzeWithMultiCharacterContext(
        name,
        text,
        characterMap
      );
    totalMaleScore += contextResult.maleScore * 1.5; // Higher weight
    totalFemaleScore += contextResult.femaleScore * 1.5;
    if (contextResult.evidence) {
      evidenceList.push(`context: ${contextResult.evidence}`);
    }

    // 2. Enhanced dialogue attribution analysis
    const allCharacterNames = Object.keys(characterMap).concat([name]);
    const dialogueResult =
      this.multiCharacterAnalyzer.analyzeDialogueAttribution(
        name,
        text,
        allCharacterNames
      );
    totalMaleScore += dialogueResult.maleScore * 1.3; // Dialogue is reliable
    totalFemaleScore += dialogueResult.femaleScore * 1.3;
    if (dialogueResult.evidence) {
      evidenceList.push(`dialogue: ${dialogueResult.evidence}`);
    }

    // 3. Character interaction pattern analysis
    const interactionResult = this.#analyzeCharacterInteractionPatterns(
      name,
      text,
      characterMap
    );
    totalMaleScore += interactionResult.maleScore * 1.2;
    totalFemaleScore += interactionResult.femaleScore * 1.2;
    if (interactionResult.evidence) {
      evidenceList.push(`interaction: ${interactionResult.evidence}`);
    }

    // 4. Relationship-based gender inference
    const relationshipInference =
      this.relationshipAnalyzer.inferGenderFromRelated(
        name,
        text,
        characterMap
      );
    totalMaleScore += relationshipInference.maleScore * 1.4; // Relationships are strong indicators
    totalFemaleScore += relationshipInference.femaleScore * 1.4;
    if (relationshipInference.evidence) {
      evidenceList.push(`relationship: ${relationshipInference.evidence}`);
    }

    // 5. Pronoun disambiguation in multi-character context
    const pronounDisambiguation = this.#performPronounDisambiguation(
      name,
      text,
      allCharacterNames
    );
    totalMaleScore += pronounDisambiguation.maleScore;
    totalFemaleScore += pronounDisambiguation.femaleScore;
    if (pronounDisambiguation.evidence) {
      evidenceList.push(`pronoun: ${pronounDisambiguation.evidence}`);
    }

    return {
      maleScore: totalMaleScore,
      femaleScore: totalFemaleScore,
      evidence: evidenceList.join("; ")
    };
  }

  /**
   * Perform traditional analysis methods
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Cultural origin
   * @param {object} characterMap - Character map
   * @return {object} - Traditional analysis results
   * @private
   */
  #performTraditionalAnalysis(name, text, culturalOrigin, characterMap) {
    let maleScore = 0;
    let femaleScore = 0;
    const evidence = [];

    // Title and honorific analysis
    const titleResult = this.nameAnalyzer.checkTitlesAndHonorifics(
      name,
      culturalOrigin
    );
    if (titleResult.gender !== "unknown") {
      const titleScore = this.#calculateCulturalBonus(culturalOrigin, 5);
      if (titleResult.gender === "male") {
        maleScore += titleScore;
        evidence.push(`title: ${titleResult.evidence} (${culturalOrigin})`);
      } else if (titleResult.gender === "female") {
        femaleScore += titleScore;
        evidence.push(`title: ${titleResult.evidence} (${culturalOrigin})`);
      }
    }

    // Name pattern analysis
    const namePatternResult = this.nameAnalyzer.checkNamePatterns(
      name,
      culturalOrigin
    );
    if (namePatternResult.gender !== "unknown") {
      const nameScore = this.#calculateCulturalBonus(culturalOrigin, 2);
      if (namePatternResult.gender === "male") {
        maleScore += nameScore;
        evidence.push(`name pattern: ${namePatternResult.evidence}`);
      } else {
        femaleScore += nameScore;
        evidence.push(`name pattern: ${namePatternResult.evidence}`);
      }
    }

    // Cultural-specific indicators
    const culturalResult =
      this.culturalAnalyzer.checkCulturalSpecificIndicators(
        name,
        text,
        culturalOrigin
      );
    if (culturalResult.maleScore > 0 || culturalResult.femaleScore > 0) {
      const culturalBonus = this.#calculateCulturalBonus(culturalOrigin, 1);
      maleScore += culturalResult.maleScore + culturalBonus;
      femaleScore += culturalResult.femaleScore + culturalBonus;

      if (culturalResult.evidence) {
        evidence.push(`cultural: ${culturalResult.evidence}`);
      }
    }

    // Relationship analysis
    const relationshipPattern = this.relationshipAnalyzer.checkRelationships(
      name,
      text,
      culturalOrigin
    );
    if (
      relationshipPattern.maleScore > 0 ||
      relationshipPattern.femaleScore > 0
    ) {
      const relationshipBonus = this.#calculateCulturalBonus(culturalOrigin, 1);
      maleScore += relationshipPattern.maleScore + relationshipBonus;
      femaleScore += relationshipPattern.femaleScore + relationshipBonus;
      if (relationshipPattern.evidence) {
        evidence.push(`relationship: ${relationshipPattern.evidence}`);
      }
    }

    // Character role analysis
    const roleResult = this.relationshipAnalyzer.analyzeCharacterRole(
      name,
      text,
      culturalOrigin
    );
    if (roleResult.maleScore > 0 || roleResult.femaleScore > 0) {
      const roleBonus = this.#calculateCulturalBonus(culturalOrigin, 1);
      maleScore += roleResult.maleScore + roleBonus;
      femaleScore += roleResult.femaleScore + roleBonus;

      if (roleResult.evidence) {
        evidence.push(`role: ${roleResult.evidence}`);
      }
    }

    // Appearance analysis
    const appearanceResult =
      this.appearanceAnalyzer.analyzeAppearanceDescriptions(name, text);
    if (appearanceResult.maleScore > 0 || appearanceResult.femaleScore > 0) {
      maleScore += appearanceResult.maleScore;
      femaleScore += appearanceResult.femaleScore;

      if (appearanceResult.evidence) {
        evidence.push(`appearance: ${appearanceResult.evidence}`);
      }
    }

    // General description analysis
    const descriptionResult = this.appearanceAnalyzer.analyzeDescriptions(
      name,
      text
    );
    if (descriptionResult.maleScore > 0 || descriptionResult.femaleScore > 0) {
      maleScore += descriptionResult.maleScore;
      femaleScore += descriptionResult.femaleScore;

      if (descriptionResult.evidence) {
        evidence.push(`description: ${descriptionResult.evidence}`);
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Perform cross-validation using multi-character analyzer insights
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {object} characterMap - Character map
   * @param {object} preliminaryScores - Initial scores from other analyzers
   * @param {object} multiCharResult - Multi-character analysis result
   * @return {object} - Cross-validated scores
   * @private
   */
  #performCrossValidation(
    name,
    text,
    characterMap,
    preliminaryScores,
    multiCharResult
  ) {
    let { maleScore, femaleScore } = preliminaryScores;
    let evidenceAdjustment = null;
    let adjustmentMade = false;

    // Check for inconsistencies between traditional and multi-character analysis
    const traditionalLeaning =
      maleScore > femaleScore
        ? "male"
        : femaleScore > maleScore
        ? "female"
        : "neutral";
    const multiCharLeaning =
      multiCharResult.maleScore > multiCharResult.femaleScore
        ? "male"
        : multiCharResult.femaleScore > multiCharResult.maleScore
        ? "female"
        : "neutral";

    // If there's a strong disagreement, use multi-character analysis to resolve
    if (
      traditionalLeaning !== multiCharLeaning &&
      traditionalLeaning !== "neutral" &&
      multiCharLeaning !== "neutral"
    ) {
      const multiCharConfidence = Math.abs(
        multiCharResult.maleScore - multiCharResult.femaleScore
      );
      const traditionalConfidence = Math.abs(maleScore - femaleScore);

      // If multi-character analysis is more confident, adjust scores
      if (multiCharConfidence > traditionalConfidence * 1.2) {
        const adjustmentFactor = 0.3;
        const adjustment = multiCharConfidence * adjustmentFactor;

        if (multiCharLeaning === "male") {
          maleScore += adjustment;
          femaleScore = Math.max(0, femaleScore - adjustment * 0.5);
        } else {
          femaleScore += adjustment;
          maleScore = Math.max(0, maleScore - adjustment * 0.5);
        }

        evidenceAdjustment = `cross-validated with multi-char analysis (${multiCharLeaning})`;
        adjustmentMade = true;
      }
    }

    // Check for pronoun inconsistencies and correct them
    const inconsistencyResult =
      this.pronounAnalyzer.detectPronounInconsistencies(name, text);
    if (inconsistencyResult.correction && inconsistencyResult.correctedGender) {
      const correctionWeight = 2;

      if (inconsistencyResult.correctedGender === "male") {
        maleScore += correctionWeight;
        femaleScore = Math.max(0, femaleScore - correctionWeight * 0.5);
      } else if (inconsistencyResult.correctedGender === "female") {
        femaleScore += correctionWeight;
        maleScore = Math.max(0, maleScore - correctionWeight * 0.5);
      }

      if (evidenceAdjustment) {
        evidenceAdjustment += `; ${inconsistencyResult.correction}`;
      } else {
        evidenceAdjustment = inconsistencyResult.correction;
      }
      adjustmentMade = true;
    }

    return {
      maleScore,
      femaleScore,
      evidenceAdjustment,
      adjustmentMade
    };
  }

  /**
   * Analyze character interaction patterns using cached data
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {object} characterMap - Character map
   * @return {object} - Interaction analysis results
   * @private
   */
  #analyzeCharacterInteractionPatterns(name, text, characterMap) {
    const cacheKey = `${name}:${this.#createCharacterMapHash(characterMap)}`;

    if (this.characterInteractionCache.has(cacheKey)) {
      return this.characterInteractionCache.get(cacheKey);
    }

    const result = this.multiCharacterAnalyzer.analyzeCharacterInteractions(
      name,
      text,
      characterMap
    );

    // Cache the result for future use
    this.characterInteractionCache.set(cacheKey, result);

    // Limit cache size
    if (this.characterInteractionCache.size > 50) {
      const firstKey = this.characterInteractionCache.keys().next().value;
      this.characterInteractionCache.delete(firstKey);
    }

    return result;
  }

  /**
   * Perform sophisticated pronoun disambiguation
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {Array} allCharacterNames - All character names in context
   * @return {object} - Pronoun disambiguation results
   * @private
   */
  #performPronounDisambiguation(name, text, allCharacterNames) {
    // Use the multi-character analyzer's isolated pronoun analysis
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    let totalMaleScore = 0;
    let totalFemaleScore = 0;
    const evidenceList = [];

    for (const sentence of sentences) {
      if (sentence.includes(name)) {
        const sentenceResult =
          this.multiCharacterAnalyzer.analyzeSentenceContext(
            name,
            sentence,
            allCharacterNames
          );

        totalMaleScore += sentenceResult.maleScore;
        totalFemaleScore += sentenceResult.femaleScore;

        if (sentenceResult.evidence) {
          evidenceList.push(sentenceResult.evidence);
        }
      }
    }

    return {
      maleScore: totalMaleScore,
      femaleScore: totalFemaleScore,
      evidence:
        evidenceList.length > 0 ? evidenceList.slice(0, 2).join("; ") : null
    };
  }

  /**
   * Calculate weight multiplier for multi-character analysis
   * @param {object} characterMap - Character map
   * @return {number} - Weight multiplier
   * @private
   */
  #calculateMultiCharacterWeight(characterMap) {
    const characterCount = Object.keys(characterMap).length;

    // More characters = higher confidence in multi-character analysis
    if (characterCount >= 10) return 2.0;
    if (characterCount >= 5) return 1.7;
    if (characterCount >= 3) return 1.4;
    if (characterCount >= 2) return 1.2;

    return 1.0;
  }

  /**
   * Calculate final result with enhanced confidence
   * @param {string} name - Character name
   * @param {number} maleScore - Male score
   * @param {number} femaleScore - Female score
   * @param {string} culturalOrigin - Cultural origin
   * @param {Array} evidence - Evidence array
   * @param {object} analysisMetadata - Analysis metadata
   * @return {object} - Final gender result
   * @private
   */
  #calculateFinalResult(
    name,
    maleScore,
    femaleScore,
    culturalOrigin,
    evidence,
    analysisMetadata
  ) {
    let gender = "unknown";
    let confidence = 0;

    const minThreshold = this.#getCulturalThreshold(culturalOrigin);
    const translationAdjustment =
      this.#getTranslationAdjustment(culturalOrigin);

    // Enhanced confidence calculation for multi-character analysis
    const confidenceBonus = analysisMetadata.multiCharacterAnalyzed ? 0.15 : 0;
    const crossValidationBonus = analysisMetadata.crossValidated ? 0.1 : 0;

    if (
      maleScore > femaleScore &&
      maleScore >= minThreshold + translationAdjustment
    ) {
      gender = "male";
      confidence =
        this.#calculateConfidence(maleScore, femaleScore, culturalOrigin) +
        confidenceBonus +
        crossValidationBonus;
      this.maleEvidenceCount++;
    } else if (
      femaleScore > maleScore &&
      femaleScore >= minThreshold + translationAdjustment
    ) {
      gender = "female";
      confidence =
        this.#calculateConfidence(femaleScore, maleScore, culturalOrigin) +
        confidenceBonus +
        crossValidationBonus;
      this.femaleEvidenceCount++;
    } else {
      this.unknownGenderCount++;
    }

    // Limit evidence to most important items
    const limitedEvidence = evidence
      .filter((e) => e && e.trim().length > 0)
      .slice(0, Constants.STORAGE.MAX_EVIDENCE_ENTRIES);

    return this.#createGenderResult(
      gender,
      Math.min(1.0, confidence),
      limitedEvidence
    );
  }

  /**
   * Cache character interaction patterns for performance
   * @param {string} name - Character name
   * @param {object} characterMap - Character map
   * @param {object} multiCharResult - Multi-character analysis result
   * @private
   */
  #cacheCharacterInteractionPatterns(name, characterMap, multiCharResult) {
    if (!multiCharResult || Object.keys(characterMap).length < 2) return;

    const hash = this.#createCharacterMapHash(characterMap);
    this.lastCharacterMapHash = hash;

    // Store interaction patterns for this character set
    const interactionKey = `interactions:${hash}`;
    const interactionData = {
      timestamp: Date.now(),
      characterCount: Object.keys(characterMap).length,
      analysisResult: multiCharResult
    };

    this.characterInteractionCache.set(interactionKey, interactionData);
  }

  /**
   * Create hash for character map to detect changes
   * @param {object} characterMap - Character map
   * @return {string} - Hash string
   * @private
   */
  #createCharacterMapHash(characterMap) {
    const names = Object.keys(characterMap).sort();
    return SharedUtils.createHash(names.join("|"));
  }

  /**
   * Clear caches when character map changes significantly
   */
  clearAnalysisCaches() {
    this.multiCharacterAnalyzer.clearCaches();
    this.characterInteractionCache.clear();
    this.lastCharacterMapHash = null;

    console.debug("Analysis caches cleared due to character map changes");
  }

  /**
   * Get analysis statistics including multi-character metrics
   * @return {object} - Enhanced statistics
   */
  getEnhancedStats() {
    return {
      maleEvidenceCount: this.maleEvidenceCount,
      femaleEvidenceCount: this.femaleEvidenceCount,
      unknownGenderCount: this.unknownGenderCount,
      multiCharacterValidationCount: this.multiCharacterValidationCount,
      crossValidationSuccessCount: this.crossValidationSuccessCount,
      culturalOrigins: { ...this.culturalOrigins },
      cacheSize: this.characterInteractionCache.size,
      cacheEfficiency:
        this.multiCharacterValidationCount > 0
          ? this.crossValidationSuccessCount /
            this.multiCharacterValidationCount
          : 0
    };
  }

  // Existing helper methods (unchanged)
  #calculateCulturalBonus(culturalOrigin, baseScore) {
    const culturalMultipliers = {
      chinese: 1.2,
      japanese: 1.15,
      korean: 1.1
    };

    const multiplier = culturalMultipliers[culturalOrigin] || 1.0;
    return Math.round(baseScore * multiplier);
  }

  #getCulturalThreshold(culturalOrigin) {
    const thresholds = {
      chinese: 3,
      japanese: 3,
      korean: 3
    };

    return thresholds[culturalOrigin] || 3;
  }

  #getTranslationAdjustment(culturalOrigin) {
    const adjustments = {
      chinese: 1,
      japanese: 1,
      korean: 1
    };

    return adjustments[culturalOrigin] || 0;
  }

  #calculateConfidence(winningScore, losingScore, culturalOrigin) {
    const scoreDifference = winningScore - losingScore;
    const baseConfidence = Math.min(0.9, 0.5 + scoreDifference * 0.05);

    const culturalConfidenceModifiers = {
      chinese: 0.95,
      japanese: 0.96,
      korean: 0.97,
      western: 1.0
    };

    const modifier = culturalConfidenceModifiers[culturalOrigin] || 1.0;
    return Math.max(0, Math.min(1, baseConfidence * modifier));
  }

  _validateAnalysisInputs(name, text) {
    return (
      SharedUtils.validateCharacterName(name) &&
      typeof text === "string" &&
      text.length > 0
    );
  }

  #createGenderResult(gender, confidence, evidence) {
    return {
      gender: SharedUtils.compressGender(gender),
      confidence: Math.max(0, Math.min(1, confidence || 0)),
      evidence: Array.isArray(evidence) ? evidence : [evidence || "no evidence"]
    };
  }

  resetStats() {
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;
    this.multiCharacterValidationCount = 0;
    this.crossValidationSuccessCount = 0;
  }
}

// Export the modules
if (typeof module !== "undefined") {
  module.exports = GenderUtils;
} else {
  window.GenderUtils = GenderUtils;
}
