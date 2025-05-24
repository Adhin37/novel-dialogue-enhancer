// assets/js/gender/base-analyzer.js
/**
 * Base class for gender analyzers with shared functionality
 */
class BaseGenderAnalyzer {
  /**
   * Analyze text near character name
   * @param {string} name - Character name
   * @param {string} text - Full text context
   * @param {number} proximityRange - Range in characters to search
   * @return {string[]} - Array of relevant text segments
   * @protected
   */
  _getProximityText(name, text, proximityRange = 100) {
    const nameRegex = new RegExp(
      `[^.!?]{0,${proximityRange}}\\b${SharedUtils.escapeRegExp(
        name
      )}\\b[^.!?]{0,${proximityRange}}`,
      "gi"
    );
    return Array.from(text.matchAll(nameRegex)).map((match) => match[0]);
  }

  /**
   * Check patterns against text segments
   * @param {string[]} textSegments - Text segments to check
   * @param {string[]} malePatterns - Male indicator patterns
   * @param {string[]} femalePatterns - Female indicator patterns
   * @return {object} - Analysis results
   * @protected
   */
  _analyzePatterns(textSegments, malePatterns, femalePatterns) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const combinedText = textSegments.join(" ").toLowerCase();

    for (const pattern of malePatterns) {
      if (combinedText.includes(pattern.toLowerCase())) {
        maleScore += 2;
        evidence = pattern;
        break;
      }
    }

    if (!evidence) {
      for (const pattern of femalePatterns) {
        if (combinedText.includes(pattern.toLowerCase())) {
          femaleScore += 2;
          evidence = pattern;
          break;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Create standardized result object
   * @param {number} maleScore - Male confidence score
   * @param {number} femaleScore - Female confidence score
   * @param {string} evidence - Supporting evidence
   * @return {object} - Standardized result
   * @protected
   */
  _createResult(maleScore, femaleScore, evidence) {
    return {
      maleScore: Math.max(0, maleScore || 0),
      femaleScore: Math.max(0, femaleScore || 0),
      evidence: evidence || null
    };
  }

  /**
   * Analyze text for gender indicators using patterns
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {Array} malePatterns - Male indicator patterns
   * @param {Array} femalePatterns - Female indicator patterns
   * @param {number} proximityRange - Text range to analyze
   * @return {object} - Analysis results
   * @protected
   */
  _analyzeTextPatterns(
    name,
    text,
    malePatterns,
    femalePatterns,
    proximityRange = 100
  ) {
    const proximityText = this._getProximityText(name, text, proximityRange);
    return this._analyzePatterns(proximityText, malePatterns, femalePatterns);
  }

  /**
   * Check for exact phrase matches in text
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {Array} maleExactPhrases - Exact male phrases
   * @param {Array} femaleExactPhrases - Exact female phrases
   * @return {object} - Analysis results
   * @protected
   */
  _checkExactPhrases(name, text, maleExactPhrases, femaleExactPhrases) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const textLower = text.toLowerCase();

    for (const phrase of maleExactPhrases) {
      if (textLower.includes(phrase.toLowerCase())) {
        maleScore += Constants.ANALYSIS.MIN_MALE_SCORE;
        evidence = phrase;
        break;
      }
    }

    if (!evidence) {
      for (const phrase of femaleExactPhrases) {
        if (textLower.includes(phrase.toLowerCase())) {
          femaleScore += Constants.ANALYSIS.MIN_FEMALE_SCORE;
          evidence = phrase;
          break;
        }
      }
    }

    return this._createResult(maleScore, femaleScore, evidence);
  }

  /**
   * Validate analysis input parameters
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {boolean} - Whether inputs are valid
   * @protected
   */
  _validateAnalysisInputs(name, text) {
    return (
      SharedUtils.validateCharacterName(name) &&
      typeof text === "string" &&
      text.length > 0
    );
  }
}

if (typeof module !== "undefined") {
  module.exports = BaseGenderAnalyzer;
} else {
  window.BaseGenderAnalyzer = BaseGenderAnalyzer;
}
