// pronounAnalyzer.js
/**
 * Specialized module for pronoun analysis in text
 * Identifies and analyzes pronoun usage to determine character gender
 */
class PronounAnalyzer {
  /**
   * Analyze pronouns in context around the character name
   * @param {string} name - Character name
   * @param {string} text - Surrounding text context
   * @return {object} - Analysis results with scores and contexts
   */
  analyzePronounContext(name, text) {
    let maleScore = 0;
    let femaleScore = 0;
    let inconsistencies = 0;

    const nameSentenceRegex = new RegExp(
      `[^.!?]{0,50}\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,50}[.!?]`,
      "gi"
    );

    const nameProximityRegex = new RegExp(
      `[^.!?]*\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,80}`,
      "gi"
    );

    const matches = Array.from(text.matchAll(nameSentenceRegex));
    const proximityMatches = Array.from(text.matchAll(nameProximityRegex));
    const contexts = [];

    for (const match of matches) {
      const matchIndex = match.index;
      const sentenceWithName = match[0];

      const followingText = text.substring(
        matchIndex,
        matchIndex + sentenceWithName.length + 100
      );
      contexts.push(followingText);

      const directMaleConnection = this.#checkDirectPronounConnection(
        name,
        followingText,
        ["he", "him", "his"]
      );

      const directFemaleConnection = this.#checkDirectPronounConnection(
        name,
        followingText,
        ["she", "her", "hers"]
      );

      if (directMaleConnection.isDirectConnection) {
        maleScore += 3;
      } else if (directMaleConnection.closeProximity) {
        maleScore += 1;
      }

      if (directFemaleConnection.isDirectConnection) {
        femaleScore += 3;
      } else if (directFemaleConnection.closeProximity) {
        femaleScore += 1;
      }
      if (directMaleConnection.count > 0 && directFemaleConnection.count > 0) {
        inconsistencies++;
      }
    }

    const proximityResult = this.#analyzeProximityTextImproved(
      name,
      proximityMatches
    );
    maleScore += proximityResult.maleScore;
    femaleScore += proximityResult.femaleScore;

    const archetypeResult = this.#checkArchetypes(name, text);
    maleScore += archetypeResult.maleScore;
    femaleScore += archetypeResult.femaleScore;

    return {
      maleScore,
      femaleScore,
      inconsistencies,
      contexts
    };
  }

  /**
   * Check for direct pronoun connections with improved accuracy
   * @param {string} name - Character name
   * @param {string} text - Text to analyze
   * @param {Array<string>} pronouns - Pronouns to check
   * @return {object} - Connection analysis results
   * @private
   */
  #checkDirectPronounConnection(name, text, pronouns) {
    let count = 0;
    let isDirectConnection = false;
    let closeProximity = false;

    for (const pronoun of pronouns) {
      // Very close connection (within 15 characters)
      const directPattern = new RegExp(
        `\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,15}\\b${pronoun}\\b`,
        "i"
      );

      // Close proximity (within 40 characters)
      const proximityPattern = new RegExp(
        `\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,40}\\b${pronoun}\\b`,
        "i"
      );

      if (directPattern.test(text)) {
        isDirectConnection = true;
        count++;
      } else if (proximityPattern.test(text)) {
        closeProximity = true;
        count++;
      }
    }

    return { isDirectConnection, closeProximity, count };
  }

  /**
   * Analyze text surrounding the character name with improved filtering
   * @param {string} name - Character name
   * @param {Array} proximityMatches - Matches of text near the character name
   * @return {object} - Analysis results with scores
   * @private
   */
  #analyzeProximityTextImproved(name, proximityMatches) {
    let maleScore = 0;
    let femaleScore = 0;

    for (const match of proximityMatches) {
      const proximityText = match[0];

      // Check for possessive patterns (more reliable)
      if (
        proximityText.match(
          new RegExp(
            `\\b${SharedUtils.escapeRegExp(
              name
            )}'s\\b[^.!?]*\\b(wife|girlfriend|daughter|sister|mother)\\b`,
            "i"
          )
        )
      ) {
        maleScore += 3;
      }

      if (
        proximityText.match(
          new RegExp(
            `\\b${SharedUtils.escapeRegExp(
              name
            )}'s\\b[^.!?]*\\b(husband|boyfriend|son|brother|father)\\b`,
            "i"
          )
        )
      ) {
        femaleScore += 3;
      }

      // Check for dialogue attribution patterns (more restrictive)
      const dialogueMalePattern = new RegExp(
        `"[^"]*"\\s*,?\\s*${SharedUtils.escapeRegExp(
          name
        )}\\s+(?:said|replied|asked|shouted|whispered|exclaimed|muttered|responded|commented)[^.!?]{0,20}\\b(he|his)\\b`,
        "i"
      );

      const dialogueFemalePattern = new RegExp(
        `"[^"]*"\\s*,?\\s*${SharedUtils.escapeRegExp(
          name
        )}\\s+(?:said|replied|asked|shouted|whispered|exclaimed|muttered|responded|commented)[^.!?]{0,20}\\b(she|her)\\b`,
        "i"
      );

      if (dialogueMalePattern.test(proximityText)) {
        maleScore += 2;
      }

      if (dialogueFemalePattern.test(proximityText)) {
        femaleScore += 2;
      }

      // Filter out pronouns that clearly refer to other characters
      if (!this.#containsOtherCharacterNames(proximityText, name)) {
        // Only analyze pronouns if no other character names are present
        const isolatedMalePronouns = (
          proximityText.match(/\b(he|him|his)\b/gi) || []
        ).length;
        const isolatedFemalePronouns = (
          proximityText.match(/\b(she|her|hers)\b/gi) || []
        ).length;

        // Apply much lower weight for isolated pronouns
        if (isolatedMalePronouns > isolatedFemalePronouns) {
          maleScore += Math.min(1, isolatedMalePronouns * 0.3);
        } else if (isolatedFemalePronouns > isolatedMalePronouns) {
          femaleScore += Math.min(1, isolatedFemalePronouns * 0.3);
        }
      }
    }

    return { maleScore, femaleScore };
  }

  /**
   * Check if text contains other character names that might cause pronoun confusion
   * @param {string} text - Text to check
   * @param {string} targetName - Target character name to exclude
   * @return {boolean} - Whether other character names are present
   * @private
   */
  #containsOtherCharacterNames(text, targetName) {
    // Common patterns for character names in novels
    const namePatterns = [
      /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, // Two-word names
      /\b(?:Master|Lady|Lord|Sir|Young|Elder)\s+[A-Z][a-z]+\b/g, // Titled names
      /\b[A-Z][a-z]{2,}\b/g // Single capitalized words (potential names)
    ];

    for (const pattern of namePatterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        if (match !== targetName && match.length > 3) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for archetypal gender indicators in text
   * @param {string} name - Character name
   * @param {string} text - Text to analyze
   * @return {object} - Analysis results with scores
   * @private
   */
  #checkArchetypes(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

    const maleArchetypes = [
      `\\b${SharedUtils.escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b`,
      `\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
        name
      )}\\b`
    ];

    const femaleArchetypes = [
      `\\b${SharedUtils.escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b`,
      `\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
        name
      )}\\b`
    ];

    for (const pattern of maleArchetypes) {
      if (new RegExp(pattern, "i").test(text)) {
        maleScore += 3;
      }
    }

    for (const pattern of femaleArchetypes) {
      if (new RegExp(pattern, "i").test(text)) {
        femaleScore += 3;
      }
    }

    return { maleScore, femaleScore };
  }

  /**
   * Detect pronoun inconsistencies commonly found in translations
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Inconsistency analysis results
   */
  detectPronounInconsistencies(name, text) {
    // First analyze pronoun usage
    const pronounResult = this.analyzePronounContext(name, text);

    // If few inconsistencies, probably no issue
    if (pronounResult.inconsistencies < 2) {
      return { correction: null };
    }

    // Look for patterns in same paragraph pronoun switches
    let maleToFemaleCount = 0;
    let femaleToMaleCount = 0;

    for (const context of pronounResult.contexts) {
      // Look for sequences like "he... she" or "her... his" within same paragraph
      if (/\b(he|his|him)\b.*\b(she|her|hers)\b/i.test(context)) {
        maleToFemaleCount++;
      }
      if (/\b(she|her|hers)\b.*\b(he|his|him)\b/i.test(context)) {
        femaleToMaleCount++;
      }
    }

    // Calculate the overall ratio of male to female pronouns
    const totalMale = pronounResult.maleScore;
    const totalFemale = pronounResult.femaleScore;

    let correctedGender = null;
    let correction = null;

    // Check for known error patterns
    const errorPatternResult = this.#checkKnownErrorPatterns(name, text);
    if (errorPatternResult.correction) {
      return errorPatternResult;
    }

    // Use higher thresholds to avoid false corrections
    if (totalMale > totalFemale * 3) {
      correctedGender = "male";
      correction = `inconsistent pronouns detected (${totalMale} male vs ${totalFemale} female) - corrected to male`;
    } else if (totalFemale > totalMale * 3) {
      correctedGender = "female";
      correction = `inconsistent pronouns detected (${totalFemale} female vs ${totalMale} male) - corrected to female`;
    }
    // If direction of mistranslation is clear
    else if (maleToFemaleCount > femaleToMaleCount * 3) {
      correctedGender = "male";
      correction = `detected translation error pattern (male→female) - corrected to male`;
    } else if (femaleToMaleCount > maleToFemaleCount * 3) {
      correctedGender = "female";
      correction = `detected translation error pattern (female→male) - corrected to female`;
    }

    return {
      correctedGender,
      correction,
      inconsistencies: pronounResult.inconsistencies
    };
  }

  /**
   * Check for known machine translation error patterns
   * @param {string} name - Character name
   * @param {string} text - Text to analyze
   * @return {object} - Error pattern analysis results
   * @private
   */
  #checkKnownErrorPatterns(name, text) {
    // Enhanced translation error detection for East Asian novels
    // Look for common translation software error patterns
    const knownErrorPatterns = [
      // Check for machine translation errors with alternating pronouns
      {
        pattern: new RegExp(
          `\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bhe\\b[^.!?]{0,50}\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "machine translation alternating"
      },
      {
        pattern: new RegExp(
          `\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b[^.!?]{0,50}\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bhe\\b`,
          "i"
        ),
        dominantGender: "female",
        errorType: "machine translation alternating"
      },
      // Check for dialogue attribution patterns
      {
        pattern: new RegExp(
          `"[^"]+", (he|his)\\b[^.!?]{0,20}\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]*\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "dialogue-attribution error"
      },
      {
        pattern: new RegExp(
          `"[^"]+", (she|her)\\b[^.!?]{0,20}\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]*\\bhe\\b`,
          "i"
        ),
        dominantGender: "female",
        errorType: "dialogue-attribution error"
      }
    ];

    // Check for known error patterns
    for (const errorPattern of knownErrorPatterns) {
      if (errorPattern.pattern.test(text)) {
        return {
          correctedGender: errorPattern.dominantGender,
          correction: `detected ${errorPattern.errorType} error - corrected to ${errorPattern.dominantGender}`
        };
      }
    }

    return { correction: null };
  }
}

if (typeof module !== "undefined") {
  module.exports = PronounAnalyzer;
} else {
  window.PronounAnalyzer = PronounAnalyzer;
}
