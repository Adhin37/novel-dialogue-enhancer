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
      `[^.!?]{0,100}\\b${this.#escapeRegExp(name)}\\b[^.!?]*[.!?]`,
      "gi"
    );

    const nameProximityRegex = new RegExp(
      `[^.!?]*\\b${this.#escapeRegExp(name)}\\b[^.!?]{0,200}`,
      "gi"
    );

    const matches = Array.from(text.matchAll(nameSentenceRegex));
    const proximityMatches = Array.from(text.matchAll(nameProximityRegex));
    const contexts = [];

    for (const match of matches) {
      const matchIndex = match.index;
      const sentenceWithName = match[0];

      // Get about 200 characters of context after the name mention
      const followingText = text.substring(
        matchIndex,
        matchIndex + sentenceWithName.length + 200
      );
      contexts.push(followingText);

      // Count pronouns in the following text
      const malePronouns = (followingText.match(/\b(he|him|his)\b/gi) || [])
        .length;
      const femalePronouns = (followingText.match(/\b(she|her|hers)\b/gi) || [])
        .length;

      const directMaleConnection = followingText.match(
        new RegExp(
          `\\b${this.#escapeRegExp(name)}\\b[^.!?]{0,30}\\b(he|him|his)\\b`,
          "i"
        )
      );

      const directFemaleConnection = followingText.match(
        new RegExp(
          `\\b${this.#escapeRegExp(name)}\\b[^.!?]{0,30}\\b(she|her|hers)\\b`,
          "i"
        )
      );

      if (directMaleConnection) maleScore += 2;
      if (directFemaleConnection) femaleScore += 2;

      // Determine score based on pronoun frequency
      if (malePronouns > femalePronouns) {
        maleScore += Math.min(4, malePronouns);
      } else if (femalePronouns > malePronouns) {
        femaleScore += Math.min(4, femalePronouns);
      }

      if (malePronouns > 0 && femalePronouns > 0) {
        inconsistencies++;

        if (malePronouns > femalePronouns * 2) {
          maleScore += 1;
        } else if (femalePronouns > malePronouns * 2) {
          femaleScore += 1;
        }
      }
    }

    // Check proximity text for additional clues
    this.#analyzeProximityText(name, proximityMatches, { maleScore, femaleScore });

    // Check for archetypal gender indicators
    this.#checkArchetypes(name, text, { maleScore, femaleScore });

    return {
      maleScore,
      femaleScore,
      inconsistencies,
      contexts
    };
  }

  /**
   * Analyze text surrounding the character name
   * @param {string} name - Character name
   * @param {Array} proximityMatches - Matches of text near the character name
   * @param {object} scores - Object containing maleScore and femaleScore
   * @private
   */
  #analyzeProximityText(name, proximityMatches, scores) {
    for (const match of proximityMatches) {
      const proximityText = match[0];

      if (
        proximityText.match(
          new RegExp(
            `\\b${this.#escapeRegExp(
              name
            )}'s\\b[^.!?]*\\b(wife|girlfriend|daughter|sister|mother)\\b`,
            "i"
          )
        )
      ) {
        scores.maleScore += 3;
      }

      if (
        proximityText.match(
          new RegExp(
            `\\b${this.#escapeRegExp(
              name
            )}'s\\b[^.!?]*\\b(husband|boyfriend|son|brother|father)\\b`,
            "i"
          )
        )
      ) {
        scores.femaleScore += 3;
      }

      if (
        proximityText.match(
          new RegExp(
            `"[^"]*"\\s*,?\\s*${this.#escapeRegExp(
              name
            )}\\s+said,?\\s+(he|his)\\b`,
            "i"
          )
        )
      ) {
        scores.maleScore += 2;
      }

      if (
        proximityText.match(
          new RegExp(
            `"[^"]*"\\s*,?\\s*${this.#escapeRegExp(
              name
            )}\\s+said,?\\s+(she|her)\\b`,
            "i"
          )
        )
      ) {
        scores.femaleScore += 2;
      }
    }
  }

  /**
   * Check for archetypal gender indicators in text
   * @param {string} name - Character name
   * @param {string} text - Text to analyze
   * @param {object} scores - Object containing maleScore and femaleScore
   * @private
   */
  #checkArchetypes(name, text, scores) {
    const maleArchetypes = [
      `\\b${this.#escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b`,
      `\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b[^.!?]*\\b${this.#escapeRegExp(
        name
      )}\\b`
    ];

    const femaleArchetypes = [
      `\\b${this.#escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b`,
      `\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b[^.!?]*\\b${this.#escapeRegExp(
        name
      )}\\b`
    ];

    for (const pattern of maleArchetypes) {
      if (new RegExp(pattern, "i").test(text)) {
        scores.maleScore += 3;
      }
    }

    for (const pattern of femaleArchetypes) {
      if (new RegExp(pattern, "i").test(text)) {
        scores.femaleScore += 3;
      }
    }
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

    // If dominant gender is clear despite inconsistencies
    if (totalMale > totalFemale * 2) {
      correctedGender = "male";
      correction = `inconsistent pronouns detected (${totalMale} male vs ${totalFemale} female) - corrected to male`;
    } else if (totalFemale > totalMale * 2) {
      correctedGender = "female";
      correction = `inconsistent pronouns detected (${totalFemale} female vs ${totalMale} male) - corrected to female`;
    }
    // If direction of mistranslation is clear
    else if (maleToFemaleCount > femaleToMaleCount * 2) {
      correctedGender = "male";
      correction = `detected translation error pattern (male→female) - corrected to male`;
    } else if (femaleToMaleCount > maleToFemaleCount * 2) {
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
          `\\b${this.#escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bhe\\b[^.!?]{0,50}\\b${this.#escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "machine translation alternating"
      },
      {
        pattern: new RegExp(
          `\\b${this.#escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b[^.!?]{0,50}\\b${this.#escapeRegExp(
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
          `"[^"]+", (he|his)\\b[^.!?]{0,20}\\b${this.#escapeRegExp(
            name
          )}\\b[^.!?]*\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "dialogue-attribution error"
      },
      {
        pattern: new RegExp(
          `"[^"]+", (she|her)\\b[^.!?]{0,20}\\b${this.#escapeRegExp(
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

  /**
   * Helper function to escape regex special characters
   * @param {string} string - String to escape
   * @return {string} - Escaped string
   * @private
   */
  #escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}

if (typeof module !== "undefined") {
  module.exports = PronounAnalyzer;
} else {
  window.PronounAnalyzer = PronounAnalyzer;
}