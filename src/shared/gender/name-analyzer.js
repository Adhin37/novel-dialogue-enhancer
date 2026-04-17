// nameAnalyzer.js
/**
 * Specialized module for character name pattern analysis
 * Identifies titles, honorifics, and name patterns that indicate gender
 */
import { SharedUtils } from "../utils/shared-utils.js";
import {
  WESTERN_MALE_NAMES,
  WESTERN_FEMALE_NAMES,
} from "./western-name-database.js";
import {
  EASTERN_MALE_NAMES,
  EASTERN_FEMALE_NAMES,
  EASTERN_MALE_ENDINGS,
  EASTERN_FEMALE_ENDINGS,
  EASTERN_MALE_TITLES,
  EASTERN_FEMALE_TITLES,
  EASTERN_CULTURAL_PATTERNS,
} from "./eastern-name-database.js";

export class NameAnalyzer {
  /**
   * Check for gendered titles and honorifics in name
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkTitlesAndHonorifics(name, culturalOrigin = "western") {
    const maleTitles = this.#getMaleTitles();
    const femaleTitles = this.#getFemaleTitles();

    const culturesToCheck = [culturalOrigin];

    for (const culture of culturesToCheck) {
      if (!maleTitles[culture] || !femaleTitles[culture]) continue;

      // Check if name starts with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(
          `^${SharedUtils.escapeRegExp(title)}\\s+`,
          "i"
        );
        if (titleRegex.test(name) || name === title) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(
          `^${SharedUtils.escapeRegExp(title)}\\s+`,
          "i"
        );
        if (titleRegex.test(name) || name === title) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }

      // Check if name ends with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${SharedUtils.escapeRegExp(title)}$`,
          "i"
        );
        if (titleRegex.test(name)) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${SharedUtils.escapeRegExp(title)}$`,
          "i"
        );
        if (titleRegex.test(name)) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Check name patterns for gender inference
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkNamePatterns(name, culturalOrigin = "western") {
    if (culturalOrigin === "western") {
      return this.#lookupWesternName(name);
    }

    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

    // Check specific cultural name structures
    const culturalSpecificPatterns = EASTERN_CULTURAL_PATTERNS;
    if (culturalOrigin in culturalSpecificPatterns) {
      for (const pattern of culturalSpecificPatterns[culturalOrigin].male) {
        if (pattern.test(name)) {
          return {
            gender: "male",
            evidence: `${culturalOrigin} male name pattern`,
          };
        }
      }

      for (const pattern of culturalSpecificPatterns[culturalOrigin].female) {
        if (pattern.test(name)) {
          return {
            gender: "female",
            evidence: `${culturalOrigin} female name pattern`,
          };
        }
      }
    }

    // Check for culture-specific endings
    for (const ending of EASTERN_FEMALE_ENDINGS[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "female",
          evidence: `${culturalOrigin} name ending '${ending}'`,
        };
      }
    }

    for (const ending of EASTERN_MALE_ENDINGS[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "male",
          evidence: `${culturalOrigin} name ending '${ending}'`,
        };
      }
    }

    // Check East Asian single / short names
    if (
      ["chinese", "japanese", "korean"].includes(culturalOrigin) &&
      name.length <= 3
    ) {
      const result = this.#checkEastAsianNames(name, culturalOrigin);
      if (result.gender !== "unknown") {
        return result;
      }
    }

    return { gender: "unknown", evidence: null };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  #lookupWesternName(name) {
    const stripped = name.replace(
      /^(mr\.?|mrs\.?|ms\.?|miss|sir|lord|lady)\s+/i,
      ""
    );
    const firstName = stripped.split(/\s+/)[0].toLowerCase();
    if (!firstName) return { gender: "unknown", evidence: null };

    const isMale = WESTERN_MALE_NAMES.has(firstName);
    const isFemale = WESTERN_FEMALE_NAMES.has(firstName);

    if (isMale && !isFemale)
      return { gender: "male", evidence: `western male name '${firstName}'` };
    if (isFemale && !isMale)
      return {
        gender: "female",
        evidence: `western female name '${firstName}'`,
      };
    return { gender: "unknown", evidence: null };
  }

  #checkEastAsianNames(name, culturalOrigin) {
    const maleNames = EASTERN_MALE_NAMES[culturalOrigin];
    const femaleNames = EASTERN_FEMALE_NAMES[culturalOrigin];

    if (!maleNames || !femaleNames) return { gender: "unknown", evidence: null };

    if (maleNames.includes(name)) {
      return {
        gender: "male",
        evidence: `${culturalOrigin} single-character male name`,
      };
    }

    if (femaleNames.includes(name)) {
      return {
        gender: "female",
        evidence: `${culturalOrigin} single-character female name`,
      };
    }

    // Normalise case and retry (handles "hana" → "Hana")
    if (name.length > 1) {
      const normalised = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

      if (maleNames.includes(normalised)) {
        return {
          gender: "male",
          evidence: `${culturalOrigin} name starts with male character '${normalised}'`,
        };
      }

      if (femaleNames.includes(normalised)) {
        return {
          gender: "female",
          evidence: `${culturalOrigin} name starts with female character '${normalised}'`,
        };
      }
    }

    return { gender: "unknown", evidence: null };
  }

  #getMaleTitles() {
    return {
      western: [
        "Mr", "Mr.", "Sir", "Lord", "Duke", "Earl", "Count",
        "Baron", "Prince", "King", "Viscount", "Marquis",
      ],
      ...EASTERN_MALE_TITLES,
    };
  }

  #getFemaleTitles() {
    return {
      western: [
        "Mrs", "Mrs.", "Ms", "Ms.", "Miss", "Lady", "Duchess",
        "Countess", "Baroness", "Princess", "Queen", "Dame", "Viscountess",
      ],
      ...EASTERN_FEMALE_TITLES,
    };
  }
}
