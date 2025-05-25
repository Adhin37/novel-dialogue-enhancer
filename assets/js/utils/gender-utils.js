// gender-utils.js
/**
 * Core gender utilities module for Novel Dialogue Enhancer
 * Coordinates other specialized modules for gender detection
 */
class GenderUtils {
  /**
   * Creates a new GenderUtils instance
   * Initializes all specialized analyzers
   */
  constructor() {
    console.debug(
      "Novel Dialogue Enhancer: Gender Utils initialized (LLM-optimized version)"
    );

    // Initialize statistics
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;

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
  }

  // assets/js/utils/gender-utils.js - Enhanced guessGender method
  /**
   * Advanced character gender detection with improved accuracy and context awareness
   * Optimized for LLM prompting with confidence scores and cultural adaptation
   * @param {string} name - The character name
   * @param {string} text - Surrounding text context
   * @param {object} characterMap - Existing character data (optional)
   * @return {object} - Detailed gender information with confidence
   */
  guessGender(name, text, characterMap = {}) {
    if (!this._validateAnalysisInputs(name, text)) {
      return this.#createGenderResult("unknown", 0, ["invalid input"]);
    }

    if (name.length <= 1) {
      return this.#createGenderResult("unknown", 0, ["name too short"]);
    }

    let maleScore = 0;
    let femaleScore = 0;
    const evidence = [];

    // Step 1: Detect cultural origin - this is crucial for accurate analysis
    const culturalOrigin = this.culturalAnalyzer.detectNameCulturalOrigin(
      name,
      text
    );
    console.log(`Cultural origin for ${name}: ${culturalOrigin}`);
    this.culturalOrigins[culturalOrigin]++;

    // Step 2: Enhanced title and honorific analysis with cultural context
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

    // Step 3: Enhanced relationship analysis with cultural context
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

    // Step 4: Enhanced name pattern analysis
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

    // Step 5: Advanced pronoun analysis with inconsistency detection
    const pronounResult = this.pronounAnalyzer.analyzePronounContext(
      name,
      text
    );
    if (pronounResult.maleScore > 0 || pronounResult.femaleScore > 0) {
      maleScore += pronounResult.maleScore;
      femaleScore += pronounResult.femaleScore;

      if (pronounResult.maleScore > 0) {
        evidence.push(`pronouns: ${pronounResult.maleScore} male references`);
      }
      if (pronounResult.femaleScore > 0) {
        evidence.push(
          `pronouns: ${pronounResult.femaleScore} female references`
        );
      }
    }

    // Step 6: Translation error correction
    const inconsistencyResult =
      this.pronounAnalyzer.detectPronounInconsistencies(name, text);
    if (inconsistencyResult.correction) {
      const correctionScore = this.#calculateCulturalBonus(culturalOrigin, 4);
      if (inconsistencyResult.correctedGender === "male") {
        maleScore += correctionScore;
        evidence.push(`correction: ${inconsistencyResult.correction}`);
      } else if (inconsistencyResult.correctedGender === "female") {
        femaleScore += correctionScore;
        evidence.push(`correction: ${inconsistencyResult.correction}`);
      }
    }

    // Step 7: Enhanced cultural-specific indicators
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

    // Step 8: Enhanced appearance analysis
    const appearanceResult =
      this.appearanceAnalyzer.analyzeAppearanceDescriptions(name, text);
    if (appearanceResult.maleScore > 0 || appearanceResult.femaleScore > 0) {
      maleScore += appearanceResult.maleScore;
      femaleScore += appearanceResult.femaleScore;

      if (appearanceResult.evidence) {
        evidence.push(`appearance: ${appearanceResult.evidence}`);
      }
    }

    // Step 9: General description analysis
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

    // Step 10: Enhanced character role analysis with cultural context
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

    // Step 11: Cross-character inference (when character map is available)
    if (Object.keys(characterMap).length > 0) {
      const inferenceResult = this.relationshipAnalyzer.inferGenderFromRelated(
        name,
        text,
        characterMap
      );
      if (inferenceResult.maleScore > 0 || inferenceResult.femaleScore > 0) {
        maleScore += inferenceResult.maleScore;
        femaleScore += inferenceResult.femaleScore;

        if (inferenceResult.evidence) {
          evidence.push(`inference: ${inferenceResult.evidence}`);
        }
      }
    }

    // Step 12: Advanced final decision with cultural adaptation
    let gender = "unknown";
    let confidence = 0;

    const minThreshold = this.#getCulturalThreshold(culturalOrigin);
    const translationAdjustment =
      this.#getTranslationAdjustment(culturalOrigin);

    if (
      maleScore > femaleScore &&
      maleScore >= minThreshold + translationAdjustment
    ) {
      gender = "male";
      confidence = this.#calculateConfidence(
        maleScore,
        femaleScore,
        culturalOrigin
      );
      this.maleEvidenceCount++;
    } else if (
      femaleScore > maleScore &&
      femaleScore >= minThreshold + translationAdjustment
    ) {
      gender = "female";
      confidence = this.#calculateConfidence(
        femaleScore,
        maleScore,
        culturalOrigin
      );
      this.femaleEvidenceCount++;
    } else {
      this.unknownGenderCount++;
    }

    return this.#createGenderResult(gender, confidence, evidence);
  }

  /**
   * Calculate cultural bonus (no western bonus)
   * @param {string} culturalOrigin - Detected cultural origin
   * @param {number} baseScore - Base score to modify
   * @return {number} - Cultural bonus
   * @private
   */
  #calculateCulturalBonus(culturalOrigin, baseScore) {
    const culturalMultipliers = {
      chinese: 1.2,
      japanese: 1.15,
      korean: 1.1
      // No western multiplier - will use baseScore as-is
    };

    const multiplier = culturalMultipliers[culturalOrigin] || 1.0;
    return Math.round(baseScore * multiplier);
  }

  /**
   * Get cultural-specific minimum threshold (default for western)
   * @param {string} culturalOrigin - Cultural origin
   * @return {number} - Minimum threshold
   * @private
   */
  #getCulturalThreshold(culturalOrigin) {
    const thresholds = {
      chinese: 3,
      japanese: 3,
      korean: 3
      // Western uses default of 3
    };

    return thresholds[culturalOrigin] || 3;
  }

  /**
   * Get translation adjustment factor (none for western)
   * @param {string} culturalOrigin - Cultural origin
   * @return {number} - Translation adjustment
   * @private
   */
  #getTranslationAdjustment(culturalOrigin) {
    const adjustments = {
      chinese: 1,
      japanese: 1,
      korean: 1
      // Western gets no adjustment (0)
    };

    return adjustments[culturalOrigin] || 0;
  }

  /**
   * Calculate confidence score with cultural consideration
   * @param {number} winningScore - Score of the winning gender
   * @param {number} losingScore - Score of the losing gender
   * @param {string} culturalOrigin - Cultural origin
   * @return {number} - Confidence score (0.0 to 1.0)
   * @private
   */
  #calculateConfidence(winningScore, losingScore, culturalOrigin) {
    const scoreDifference = winningScore - losingScore;
    const baseConfidence = Math.min(0.9, 0.5 + scoreDifference * 0.05);

    // Adjust confidence based on cultural complexity
    const culturalConfidenceModifiers = {
      chinese: 0.95, // Slightly lower due to translation complexity
      japanese: 0.96,
      korean: 0.97,
      western: 1.0
    };

    const modifier = culturalConfidenceModifiers[culturalOrigin] || 1.0;
    return Math.max(0, Math.min(1, baseConfidence * modifier));
  }

  /**
   * Validate analysis inputs
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {boolean} - Whether inputs are valid
   * @private
   */
  _validateAnalysisInputs(name, text) {
    return (
      SharedUtils.validateCharacterName(name) &&
      typeof text === "string" &&
      text.length > 0
    );
  }

  /**
   * Creates a gender result object with timestamp
   * @param {string} gender - Gender (male, female, unknown)
   * @param {number} confidence - Confidence level (0.0 to 1.0)
   * @param {Array|string} evidence - Evidence for gender determination
   * @return {object} - Gender result object
   */
  #createGenderResult(gender, confidence, evidence) {
    return {
      gender: SharedUtils.compressGender(gender),
      confidence: Math.max(0, Math.min(1, confidence || 0)),
      evidence: Array.isArray(evidence) ? evidence : [evidence || "no evidence"]
    };
  }

  /**
   * Reset gender evidence counters
   */
  resetStats() {
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;
  }
}

// Export the modules
if (typeof module !== "undefined") {
  module.exports = GenderUtils;
} else {
  window.GenderUtils = GenderUtils;
}
