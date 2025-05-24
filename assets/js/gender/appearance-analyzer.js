// appearanceAnalyzer.js
/**
 * Specialized module for analyzing character appearance descriptions
 * Identifies physical descriptions and features that indicate gender
 */
class AppearanceAnalyzer extends BaseGenderAnalyzer {
  /**
   * Analyze physical or character descriptions for gender clues
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Gender scores with evidence
   */
  analyzeDescriptions(name, text) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Get text segments containing character name
    const nameContext = new RegExp(
      `\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,100}`,
      "gi"
    );
    const contextMatches = Array.from(text.matchAll(nameContext));
    let contextText = "";

    contextMatches.forEach((match) => {
      contextText += match[0] + " ";
    });

    const maleWords = this.#getMaleDescriptors();
    const femaleWords = this.#getFemaleDescriptors();

    // Check for male descriptors
    for (const word of maleWords) {
      const regex = new RegExp(
        `\\b${SharedUtils.escapeRegExp(
          name
        )}[^.!?]*\\b${SharedUtils.escapeRegExp(
          word
        )}\\b|\\b${SharedUtils.escapeRegExp(
          word
        )}\\b[^.!?]*\\b${SharedUtils.escapeRegExp(name)}\\b`,
        "i"
      );
      if (regex.test(contextText)) {
        maleScore += 2;
        evidence = `described as ${word}`;
        break;
      }
    }

    // Check for female descriptors
    for (const word of femaleWords) {
      const regex = new RegExp(
        `\\b${SharedUtils.escapeRegExp(
          name
        )}[^.!?]*\\b${SharedUtils.escapeRegExp(
          word
        )}\\b|\\b${SharedUtils.escapeRegExp(
          word
        )}\\b[^.!?]*\\b${SharedUtils.escapeRegExp(name)}\\b`,
        "i"
      );
      if (regex.test(contextText)) {
        femaleScore += 2;
        evidence = `described as ${word}`;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze appearance descriptions for gender clues
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Gender scores with evidence
   */
  analyzeAppearanceDescriptions(name, text) {
    // Find appearance descriptions using regex
    const appearanceRegex = new RegExp(
      `\\b${SharedUtils.escapeRegExp(
        name
      )}(?:'s)?\\b[^.!?]*(\\bappearance\\b|\\blooked\\b|\\bdressed\\b|\\bwore\\b|\\bfigure\\b|\\bface\\b|\\bhair\\b|\\bfeatures\\b)[^.!?]*[.!?]`,
      "gi"
    );

    const appearanceMatches = Array.from(text.matchAll(appearanceRegex));
    let appearanceText = "";

    appearanceMatches.forEach((match) => {
      appearanceText += match[0] + " ";
    });

    // Get appearance indicators
    const maleAppearance = this.#getMaleAppearanceIndicators();
    const femaleAppearance = this.#getFemaleAppearanceIndicators();

    // Check for descriptive appearances
    if (appearanceText) {
      // Check for male appearance descriptors
      for (const indicator of maleAppearance) {
        if (appearanceText.toLowerCase().includes(indicator)) {
          return this._createResult(2, 0, indicator);
        }
      }

      // Check for female appearance descriptors
      for (const indicator of femaleAppearance) {
        if (appearanceText.toLowerCase().includes(indicator)) {
          return this._createResult(0, 2, indicator);
        }
      }
    }

    // If no specific appearance description found, search more broadly for proximity descriptions
    const proximityText = this._getProximityText(name, text, 30);
    const combinedProximityText = proximityText.join(" ");

    // Cultural specific appearance patterns
    const culturalAppearance = this.#getCulturalAppearancePatterns();

    // First check general patterns
    for (const indicator of maleAppearance) {
      if (combinedProximityText.toLowerCase().includes(indicator)) {
        return this._createResult(1, 0, indicator);
      }
    }

    for (const indicator of femaleAppearance) {
      if (combinedProximityText.toLowerCase().includes(indicator)) {
        return this._createResult(0, 1, indicator);
      }
    }

    // Then check cultural specific patterns
    for (const culture in culturalAppearance) {
      for (const indicator of culturalAppearance[culture].male) {
        if (combinedProximityText.toLowerCase().includes(indicator)) {
          return this._createResult(1, 0, `${culture} style: ${indicator}`);
        }
      }

      for (const indicator of culturalAppearance[culture].female) {
        if (combinedProximityText.toLowerCase().includes(indicator)) {
          return this._createResult(0, 1, `${culture} style: ${indicator}`);
        }
      }
    }

    return this._createResult(0, 0, null);
  }

  /**
   * Get male descriptive words
   * @return {Array} - Array of male descriptors
   * @private
   */
  #getMaleDescriptors() {
    return [
      "handsome",
      "muscular",
      "beard",
      "moustache",
      "stubble",
      "broad-shouldered",
      "rugged",
      "masculine",
      "gentleman",
      "fellow",
      "stocky",
      "paternal",
      "strong",
      "manly",
      "chiseled",
      "goatee",
      "sideburns",
      "chest hair",
      "adam's apple",
      "baritone",
      "bass voice",
      "gruff",
      "virile",
      "brawny",
      "husky"
    ];
  }

  /**
   * Get female descriptive words
   * @return {Array} - Array of female descriptors
   * @private
   */
  #getFemaleDescriptors() {
    return [
      "beautiful",
      "pretty",
      "gorgeous",
      "lovely",
      "pregnant",
      "makeup",
      "slender",
      "feminine",
      "graceful",
      "voluptuous",
      "maternal",
      "lady",
      "slim",
      "elegant",
      "petite",
      "curvy",
      "dress",
      "gown",
      "skirt",
      "blouse",
      "heels",
      "lipstick",
      "eyeliner",
      "mascara",
      "bosom",
      "breasts",
      "cleavage",
      "hips",
      "waist",
      "motherly",
      "womanly",
      "soft-spoken",
      "gentle",
      "dainty"
    ];
  }

  /**
   * Get male appearance indicators
   * @return {Array} - Array of male appearance indicators
   * @private
   */
  #getMaleAppearanceIndicators() {
    return [
      // Western
      "short hair",
      "crew cut",
      "buzz cut",
      "flat chest",
      "broad shoulders",
      "tall and strong",
      "muscular build",
      "chiseled jaw",
      "square jaw",
      "strong jaw",
      "adam's apple",
      "facial hair",
      "stubble",
      "beard",
      "mustache",
      "large hands",
      "barrel chest",
      "deep voice",
      "baritone",
      "bass voice",
      "men's clothing",
      "men's fashion",
      "suit and tie",
      "tuxedo",
      "male uniform",
      "his physique",
      "brawny",
      "bulky",
      "handsome",
      "rugged",

      // East Asian novel specific
      "sword at his waist",
      "fierce eyes",
      "commanding presence",
      "strong aura",
      "male cultivation technique",
      "battle robe",
      "strong meridians",
      "jade-like face",
      "scholarly appearance",
      "powerful build",
      "strong qi",
      "masculine energy"
    ];
  }

  /**
   * Get female appearance indicators
   * @return {Array} - Array of female appearance indicators
   * @private
   */
  #getFemaleAppearanceIndicators() {
    return [
      // Western
      "long hair",
      "flowing hair",
      "braided hair",
      "ponytail",
      "bun",
      "curves",
      "slender waist",
      "hourglass figure",
      "feminine figure",
      "soft features",
      "delicate features",
      "full lips",
      "long lashes",
      "high cheekbones",
      "smooth skin",
      "small hands",
      "narrow shoulders",
      "ample bosom",
      "bust",
      "breast",
      "cleavage",
      "hips",
      "women's clothing",
      "women's fashion",
      "dress",
      "skirt",
      "blouse",
      "her physique",
      "makeup",
      "painted nails",
      "manicure",
      "pretty",
      "beautiful",
      "gorgeous",
      "slim",

      // East Asian novel specific
      "jade skin",
      "snow-white skin",
      "willow waist",
      "cherry lips",
      "peach blossom eyes",
      "slender fingers",
      "elegant posture",
      "graceful movements",
      "female cultivation technique",
      "gentle aura",
      "floating steps",
      "fairy-like appearance",
      "phoenix eyes",
      "lotus feet",
      "silk robe",
      "inner cultivation",
      "jade bracelet",
      "hairpin",
      "rouge"
    ];
  }

  /**
   * Get cultural appearance patterns
   * @return {object} - Object with cultural appearance patterns
   * @private
   */
  #getCulturalAppearancePatterns() {
    return {
      chinese: {
        male: [
          "jade-like face",
          "cold expression",
          "tall figure",
          "stern face",
          "cultivation robe",
          "profound eyes",
          "commanding aura",
          "sword at waist",
          "male immortal",
          "imposing manner",
          "strong qi",
          "powerful presence",
          "disciple robe"
        ],
        female: [
          "beautiful maiden",
          "fairy maiden",
          "slender figure",
          "graceful posture",
          "delicate features",
          "jade hands",
          "snow-white skin",
          "willow waist",
          "elegant appearance",
          "fairy dress",
          "silk sleeves",
          "gentle aura",
          "female immortal",
          "phoenix hairpin",
          "lotus steps"
        ]
      },
      japanese: {
        male: [
          "hakama",
          "kimono",
          "samurai outfit",
          "strong stance",
          "warrior's build",
          "monk's robe",
          "stern expression",
          "stoic face",
          "katana",
          "traditional male garb"
        ],
        female: [
          "kimono",
          "yukata",
          "graceful movements",
          "petite figure",
          "modest posture",
          "geisha",
          "beautiful woman",
          "graceful lady",
          "long sleeves",
          "traditional female garb"
        ]
      },
      korean: {
        male: [
          "hanbok",
          "scholarly appearance",
          "noble bearing",
          "strong presence",
          "traditional male attire",
          "gentleman",
          "dignified manner"
        ],
        female: [
          "hanbok",
          "graceful lady",
          "delicate features",
          "beautiful maiden",
          "traditional female attire",
          "elegant posture",
          "gentle manner"
        ]
      }
    };
  }
}

if (typeof module !== "undefined") {
  module.exports = AppearanceAnalyzer;
} else {
  window.AppearanceAnalyzer = AppearanceAnalyzer;
}
