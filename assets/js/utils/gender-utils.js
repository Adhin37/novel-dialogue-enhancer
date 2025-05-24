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

  /**
   * Advanced character gender detection with improved accuracy and context awareness
   * Optimized for LLM prompting with confidence scores
   * @param {string} name - The character name
   * @param {string} text - Surrounding text context
   * @param {object} characterMap - Existing character data (optional)
   * @return {object} - Detailed gender information with confidence
   */
  guessGender(name, text, characterMap = {}) {
    if (name.length <= 1) {
      return this.#createGenderResult("unknown", 0, []);
    }

    // Return existing gender if available with high confidence
    if (
      characterMap[name] &&
      characterMap[name].gender !== "unknown" &&
      characterMap[name].confidence &&
      characterMap[name].confidence > 0.75
    ) {
      return this.#createGenderResult(
        characterMap[name].gender,
        characterMap[name].confidence,
        characterMap[name].evidence || ["previously determined"]
      );
    }

    if (
      characterMap[name] &&
      characterMap[name].gender !== "unknown" &&
      characterMap[name].appearances &&
      characterMap[name].appearances >= 5
    ) {
      return this.#createGenderResult(
        characterMap[name].gender,
        Math.max(0.7, characterMap[name].confidence || 0),
        characterMap[name].evidence || [
          "frequent appearances with consistent gender"
        ]
      );
    }

    let maleScore = 0;
    let femaleScore = 0;
    const evidence = [];

    const culturalOrigin = this.culturalAnalyzer.detectNameCulturalOrigin(
      name,
      text
    );
    console.log(`Cultural origin for ${name}: ${culturalOrigin}`);

    this.culturalOrigins[culturalOrigin]++;

    const titleResult = this.nameAnalyzer.checkTitlesAndHonorifics(
      name,
      culturalOrigin
    );
    if (titleResult.gender !== "unknown") {
      if (titleResult.gender === "male") {
        maleScore += 5; // High confidence for titles
        evidence.push(`title: ${titleResult.evidence} (${culturalOrigin})`);
      } else if (titleResult.gender === "female") {
        femaleScore += 5; // High confidence for titles
        evidence.push(`title: ${titleResult.evidence} (${culturalOrigin})`);
      }
    }

    const relationshipPattern = this.relationshipAnalyzer.checkRelationships(
      name,
      text,
      culturalOrigin
    );
    if (
      relationshipPattern.maleScore > 0 ||
      relationshipPattern.femaleScore > 0
    ) {
      maleScore += relationshipPattern.maleScore;
      femaleScore += relationshipPattern.femaleScore;
      if (relationshipPattern.evidence) {
        evidence.push(`relationship: ${relationshipPattern.evidence}`);
      }
    }

    const namePatternResult = this.nameAnalyzer.checkNamePatterns(
      name,
      culturalOrigin
    );
    if (namePatternResult.gender !== "unknown") {
      if (namePatternResult.gender === "male") {
        maleScore += 2;
        evidence.push(
          `${culturalOrigin} name pattern: ${namePatternResult.evidence}`
        );
      } else {
        femaleScore += 2;
        evidence.push(
          `${culturalOrigin} name pattern: ${namePatternResult.evidence}`
        );
      }
    }

    const pronounResult = this.pronounAnalyzer.analyzePronounContext(
      name,
      text
    );
    if (pronounResult.maleScore > 0 || pronounResult.femaleScore > 0) {
      maleScore += pronounResult.maleScore;
      femaleScore += pronounResult.femaleScore;

      if (pronounResult.maleScore > 0) {
        evidence.push(
          `pronouns: found ${pronounResult.maleScore} male pronouns`
        );
      }
      if (pronounResult.femaleScore > 0) {
        evidence.push(
          `pronouns: found ${pronounResult.femaleScore} female pronouns`
        );
      }
    }

    const inconsistencyResult =
      this.pronounAnalyzer.detectPronounInconsistencies(name, text);
    if (inconsistencyResult.correction) {
      if (inconsistencyResult.correctedGender === "male") {
        maleScore += 4;
        evidence.push(
          `inconsistency correction: ${inconsistencyResult.correction}`
        );
      } else if (inconsistencyResult.correctedGender === "female") {
        femaleScore += 4;
        evidence.push(
          `inconsistency correction: ${inconsistencyResult.correction}`
        );
      }
    }

    const culturalResult =
      this.culturalAnalyzer.checkCulturalSpecificIndicators(
        name,
        text,
        culturalOrigin
      );
    if (culturalResult.maleScore > 0 || culturalResult.femaleScore > 0) {
      maleScore += culturalResult.maleScore;
      femaleScore += culturalResult.femaleScore;

      if (culturalResult.evidence) {
        evidence.push(
          `${culturalOrigin} cultural indicator: ${culturalResult.evidence}`
        );
      }
    }

    const appearanceResult =
      this.appearanceAnalyzer.analyzeAppearanceDescriptions(name, text);
    if (appearanceResult.maleScore > 0 || appearanceResult.femaleScore > 0) {
      maleScore += appearanceResult.maleScore;
      femaleScore += appearanceResult.femaleScore;

      if (appearanceResult.evidence) {
        evidence.push(`appearance: ${appearanceResult.evidence}`);
      }
    }

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

    const roleResult = this.relationshipAnalyzer.analyzeCharacterRole(
      name,
      text,
      culturalOrigin
    );
    if (roleResult.maleScore > 0 || roleResult.femaleScore > 0) {
      maleScore += roleResult.maleScore;
      femaleScore += roleResult.femaleScore;

      if (roleResult.evidence) {
        evidence.push(`role: ${roleResult.evidence}`);
      }
    }

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

    let gender = "unknown";
    let confidence = 0;

    const translationAdjustment = culturalOrigin !== "western" ? 1 : 0;

    if (maleScore > femaleScore && maleScore >= 3 + translationAdjustment) {
      gender = "male";
      confidence = Math.min(0.9, 0.5 + (maleScore - femaleScore) * 0.05);
      this.maleEvidenceCount++;
    } else if (
      femaleScore > maleScore &&
      femaleScore >= 3 + translationAdjustment
    ) {
      gender = "female";
      confidence = Math.min(0.9, 0.5 + (femaleScore - maleScore) * 0.05);
      this.femaleEvidenceCount++;
    } else {
      this.unknownGenderCount++;
    }

    return this.#createGenderResult(gender, confidence, evidence);
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
      gender: gender || "unknown",
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
