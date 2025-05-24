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
}

if (typeof module !== "undefined") {
  module.exports = BaseGenderAnalyzer;
} else {
  window.BaseGenderAnalyzer = BaseGenderAnalyzer;
}
