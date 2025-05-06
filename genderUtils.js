// genderUtils.js
/**
 * Enhanced gender utils module for Novel Dialogue Enhancer - LLM integration version
 * Focuses on extracting reliable gender information for LLM prompting
 */
class GenderUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Gender Utils initialized (LLM-optimized version)");
    
    // Initialize gender evidence statistics
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;
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
    if (name.length <= 1) return { gender: "unknown", confidence: 0, evidence: [] };

    // Return existing gender if available
    if (characterMap[name] && characterMap[name].gender !== "unknown") {
      return {
        gender: characterMap[name].gender,
        confidence: characterMap[name].confidence || 0.8,
        evidence: characterMap[name].evidence || ["previously determined"]
      };
    }

    let maleScore = 0;
    let femaleScore = 0;
    let evidence = [];

    // Check for definitive markers first
    const titleResult = this.checkTitlesAndHonorifics(name);
    if (titleResult.gender !== "unknown") {
      if (titleResult.gender === "male") {
        this.maleEvidenceCount++;
        return {
          gender: "male",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence}`]
        };
      }
      if (titleResult.gender === "female") {
        this.femaleEvidenceCount++;
        return {
          gender: "female",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence}`]
        };
      }
    }

    // Analyze name patterns
    const namePatternResult = this.checkNamePatterns(name);
    if (namePatternResult.gender !== "unknown") {
      if (namePatternResult.gender === "male") {
        maleScore += 2;
        evidence.push(`name pattern: ${namePatternResult.evidence}`);
      } else {
        femaleScore += 2;
        evidence.push(`name pattern: ${namePatternResult.evidence}`);
      }
    }

    // Analyze pronouns in context
    const pronounResult = this.analyzePronounContext(name, text);
    if (pronounResult.maleScore > 0 || pronounResult.femaleScore > 0) {
      maleScore += pronounResult.maleScore;
      femaleScore += pronounResult.femaleScore;
      
      if (pronounResult.maleScore > 0) {
        evidence.push(`pronouns: found ${pronounResult.maleScore} male pronouns`);
      }
      if (pronounResult.femaleScore > 0) {
        evidence.push(`pronouns: found ${pronounResult.femaleScore} female pronouns`);
      }
    }

    // Check relationships
    const relationshipResult = this.checkRelationships(name, text);
    if (relationshipResult.maleScore > 0 || relationshipResult.femaleScore > 0) {
      maleScore += relationshipResult.maleScore;
      femaleScore += relationshipResult.femaleScore;
      
      if (relationshipResult.maleScore > 0 && relationshipResult.evidence) {
        evidence.push(`relationship: ${relationshipResult.evidence}`);
      }
      if (relationshipResult.femaleScore > 0 && relationshipResult.evidence) {
        evidence.push(`relationship: ${relationshipResult.evidence}`);
      }
    }

    // Analyze descriptions
    const descriptionResult = this.analyzeDescriptions(name, text);
    if (descriptionResult.maleScore > 0 || descriptionResult.femaleScore > 0) {
      maleScore += descriptionResult.maleScore;
      femaleScore += descriptionResult.femaleScore;
      
      if (descriptionResult.maleScore > 0 && descriptionResult.evidence) {
        evidence.push(`description: ${descriptionResult.evidence}`);
      }
      if (descriptionResult.femaleScore > 0 && descriptionResult.evidence) {
        evidence.push(`description: ${descriptionResult.evidence}`);
      }
    }

    // Analyze appearance
    const appearanceResult = this.analyzeAppearanceDescriptions(name, text);
    if (appearanceResult.maleScore > 0 || appearanceResult.femaleScore > 0) {
      maleScore += appearanceResult.maleScore;
      femaleScore += appearanceResult.femaleScore;
      
      if (appearanceResult.maleScore > 0 && appearanceResult.evidence) {
        evidence.push(`appearance: ${appearanceResult.evidence}`);
      }
      if (appearanceResult.femaleScore > 0 && appearanceResult.evidence) {
        evidence.push(`appearance: ${appearanceResult.evidence}`);
      }
    }

    // Determine final gender and confidence
    let gender = "unknown";
    let confidence = 0;
    
    if (maleScore > femaleScore && maleScore >= 3) {
      gender = "male";
      confidence = Math.min(0.9, 0.5 + (maleScore - femaleScore) * 0.05);
      this.maleEvidenceCount++;
    } else if (femaleScore > maleScore && femaleScore >= 3) {
      gender = "female";
      confidence = Math.min(0.9, 0.5 + (femaleScore - maleScore) * 0.05);
      this.femaleEvidenceCount++;
    } else {
      this.unknownGenderCount++;
    }

    return {
      gender,
      confidence,
      evidence
    };
  }

  /**
   * Check for gendered titles and honorifics in name
   * @param {string} name - Name to check
   * @return {object} - Gender determination with evidence
   */
  checkTitlesAndHonorifics(name) {
    const maleTitles = [
      "Mr", "Mr.", "Sir", "Lord", "Master", "Prince", "King", "Duke", "Count", "Baron", "Emperor",
      "Brother", "Uncle", "Father", "Dad", "Daddy", "Papa", "Grandpa", "Grandfather", "Boy", "Son",
      "Husband", "Mister", "Gentleman", "Lad", "Fellow", "Dage", "Gege", "Oppa", "Hyung", "Nii",
      "Oniisan", "Otouto", "Aniki", "-kun", "Shixiong", "Shidi", "Shizun", "Shifu", "Taoist",
      "Monk", "Young Master"
    ];

    const femaleTitles = [
      "Mrs", "Mrs.", "Ms", "Ms.", "Miss", "Lady", "Princess", "Queen", "Duchess", "Countess", "Baroness",
      "Empress", "Sister", "Aunt", "Mother", "Mom", "Mommy", "Mama", "Grandma", "Grandmother", "Girl",
      "Daughter", "Wife", "Madam", "Madame", "Mistress", "Dame", "Jiejie", "Meimei", "Unni", "Nuna",
      "Nee", "Oneesan", "Imouto", "Aneue", "-chan", "Shimei", "Shijie", "Young Lady", "Young Miss"
    ];

    // Check if name starts with a title
    for (const title of maleTitles) {
      if (name.startsWith(title + " ") || name === title) {
        return { gender: "male", evidence: title };
      }
    }

    for (const title of femaleTitles) {
      if (name.startsWith(title + " ") || name === title) {
        return { gender: "female", evidence: title };
      }
    }

    // Check if name ends with a title
    for (const title of maleTitles) {
      if (name.endsWith(" " + title)) {
        return { gender: "male", evidence: title };
      }
    }

    for (const title of femaleTitles) {
      if (name.endsWith(" " + title)) {
        return { gender: "female", evidence: title };
      }
    }

    // Check if name contains a title
    for (const title of maleTitles) {
      if (name.includes(" " + title + " ")) {
        return { gender: "male", evidence: title };
      }
    }

    for (const title of femaleTitles) {
      if (name.includes(" " + title + " ")) {
        return { gender: "female", evidence: title };
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Check name patterns (endings, etc.) for gender clues
   * @param {string} name - Name to check
   * @return {object} - Gender determination with evidence
   */
  checkNamePatterns(name) {
    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

    const femaleEndings = [
      "a", "ia", "ie", "y", "ey", "i", "elle", "ette", "ine", "ell", "lyn", "ina", "ah", 
      "ella", "anna", "enna", "anne", "issa", "ara", "lyn", "lynn", "lee"
    ];

    const maleEndings = [
      "o", "er", "on", "en", "us", "or", "k", "d", "t", "io", "ian", "im", "am", "ik", 
      "to", "ro", "hn", "il", "rt", "ng", "ez", "an"
    ];

    // Check name endings
    for (const ending of femaleEndings) {
      if (nameLower.endsWith(ending)) {
        return { gender: "female", evidence: `name ends with '${ending}'` };
      }
    }

    for (const ending of maleEndings) {
      if (nameLower.endsWith(ending)) {
        return { gender: "male", evidence: `name ends with '${ending}'` };
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Analyze pronouns in context around the character name
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Gender scores
   */
  analyzePronounContext(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

    // Find sentences containing the name
    const nameSentenceRegex = new RegExp(
      `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]*[.!?]`,
      "gi"
    );
    const matches = Array.from(text.matchAll(nameSentenceRegex));

    // For each matching sentence, analyze pronouns in following text
    matches.forEach((match) => {
      const matchIndex = match.index;
      const sentenceWithName = match[0];

      // Get about 200 characters of context after the name mention
      const followingText = text.substring(
        matchIndex,
        matchIndex + sentenceWithName.length + 200
      );

      // Count pronouns in the following text
      const malePronouns = (followingText.match(/\b(he|him|his)\b/gi) || []).length;
      const femalePronouns = (followingText.match(/\b(she|her|hers)\b/gi) || []).length;

      // Determine score based on pronoun frequency
      if (malePronouns > femalePronouns) {
        maleScore += Math.min(4, malePronouns);
      } else if (femalePronouns > malePronouns) {
        femaleScore += Math.min(4, femalePronouns);
      }

      // Add bonus for direct possessive connections
      if (
        followingText.match(
          new RegExp(`\\b${this.escapeRegExp(name)}\\b[^.!?]*\\bhis\\b`, "i")
        )
      ) {
        maleScore += 2;
      }
      if (
        followingText.match(
          new RegExp(`\\b${this.escapeRegExp(name)}\\b[^.!?]*\\bher\\b`, "i")
        )
      ) {
        femaleScore += 2;
      }
    });

    return { maleScore, femaleScore };
  }

  /**
   * Check for relationship descriptions that indicate gender
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Gender scores with evidence
   */
  checkRelationships(name, text) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const maleRelationships = [
      `${name} was her husband`,
      `${name} was his husband`,
      `${name}'s wife`,
      `${name} was the father`,
      `${name} was the son`,
      `${name} was the brother`,
      `${name} was the uncle`,
      `${name} was the grandfather`,
      `${name} was the grandson`,
      `${name} was the king`,
      `${name} was the prince`,
      `${name} was the emperor`,
      `${name} was the lord`,
      `${name} was the duke`,
      `${name} was the boyfriend`,
      `${name}, the husband`,
      `${name}, the father`,
      `${name}, the brother`
    ];

    const femaleRelationships = [
      `${name} was his wife`,
      `${name} was her wife`,
      `${name}'s husband`,
      `${name} was the mother`,
      `${name} was the daughter`,
      `${name} was the sister`,
      `${name} was the aunt`,
      `${name} was the grandmother`,
      `${name} was the granddaughter`,
      `${name} was the queen`,
      `${name} was the princess`,
      `${name} was the empress`,
      `${name} was the lady`,
      `${name} was the duchess`,
      `${name} was the girlfriend`,
      `${name}, the wife`,
      `${name}, the mother`,
      `${name}, the sister`
    ];

    // Check for male relationship indicators
    for (const relation of maleRelationships) {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        maleScore += 3;
        evidence = relation;
        break;
      }
    }

    // Check for female relationship indicators
    for (const relation of femaleRelationships) {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        femaleScore += 3;
        evidence = relation;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

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
      `\\b${this.escapeRegExp(name)}\\b[^.!?]{0,100}`,
      "gi"
    );
    const contextMatches = Array.from(text.matchAll(nameContext));
    let contextText = "";

    contextMatches.forEach((match) => {
      contextText += match[0] + " ";
    });

    const maleWords = [
      "handsome", "muscular", "beard", "moustache", "stubble", "broad-shouldered",
      "rugged", "masculine", "gentleman", "fellow", "stocky", "paternal", "strong",
      "manly", "chiseled", "goatee", "sideburns", "chest hair", "adam's apple",
      "baritone", "bass voice", "gruff", "virile", "brawny", "husky"
    ];

    const femaleWords = [
      "beautiful", "pretty", "gorgeous", "lovely", "pregnant", "makeup", "slender",
      "feminine", "graceful", "voluptuous", "maternal", "lady", "slim", "elegant",
      "petite", "curvy", "dress", "gown", "skirt", "blouse", "heels", "lipstick",
      "eyeliner", "mascara", "bosom", "breasts", "cleavage", "hips", "waist",
      "motherly", "womanly", "soft-spoken", "gentle", "dainty"
    ];

    // Check for male descriptors
    for (const word of maleWords) {
      const regex = new RegExp(
        `\\b${this.escapeRegExp(name)}[^.!?]*\\b${this.escapeRegExp(word)}\\b|\\b${this.escapeRegExp(word)}\\b[^.!?]*\\b${this.escapeRegExp(name)}\\b`,
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
        `\\b${this.escapeRegExp(name)}[^.!?]*\\b${this.escapeRegExp(word)}\\b|\\b${this.escapeRegExp(word)}\\b[^.!?]*\\b${this.escapeRegExp(name)}\\b`,
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
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Find appearance descriptions
    const appearanceRegex = new RegExp(
      `\\b${this.escapeRegExp(name)}(?:'s)?\\b[^.!?]*(\\bappearance\\b|\\blooked\\b|\\bdressed\\b|\\bwore\\b|\\bfigure\\b|\\bface\\b|\\bhair\\b|\\bfeatures\\b)[^.!?]*[.!?]`,
      "gi"
    );

    const appearanceMatches = Array.from(text.matchAll(appearanceRegex));
    let appearanceText = "";

    appearanceMatches.forEach((match) => {
      appearanceText += match[0] + " ";
    });

    const maleAppearance = [
      "short hair", "crew cut", "buzz cut", "flat chest", "broad shoulders",
      "tall and strong", "muscular build", "chiseled jaw", "square jaw", "strong jaw",
      "adam's apple", "facial hair", "stubble", "large hands", "barrel chest",
      "deep voice", "baritone", "bass voice", "men's clothing", "men's fashion",
      "suit and tie", "tuxedo", "male uniform", "his physique"
    ];

    const femaleAppearance = [
      "long hair", "flowing hair", "braided hair", "ponytail", "bun", "curves",
      "slender waist", "hourglass figure", "feminine figure", "soft features",
      "delicate features", "full lips", "long lashes", "high cheekbones", "smooth skin",
      "small hands", "narrow shoulders", "ample bosom", "bust", "breast", "cleavage",
      "hips", "women's clothing", "women's fashion", "dress", "skirt", "blouse",
      "her physique", "makeup", "painted nails", "manicure"
    ];

    // Check for male appearance descriptors
    for (const indicator of maleAppearance) {
      if (appearanceText.toLowerCase().includes(indicator)) {
        maleScore += 2;
        evidence = indicator;
        break;
      }
    }

    // Check for female appearance descriptors
    for (const indicator of femaleAppearance) {
      if (appearanceText.toLowerCase().includes(indicator)) {
        femaleScore += 2;
        evidence = indicator;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Generate a summary of character gender information for LLM prompting
   * @param {object} characterMap - Character information map
   * @return {string} - Formatted gender summary for LLM
   */
  generateCharacterGenderSummary(characterMap) {
    if (!characterMap || Object.keys(characterMap).length === 0) {
      return "";
    }

    const characters = Object.entries(characterMap).map(([name, info]) => {
      const gender = info.gender || "unknown";
      const confidence = info.confidence || 0;
      const evidence = info.evidence || [];
      const appearances = info.appearances || 0;
      
      return {
        name,
        gender,
        confidence,
        evidence,
        appearances
      };
    });

    // Sort by importance (appearances and confidence)
    characters.sort((a, b) => {
      if (b.appearances !== a.appearances) {
        return b.appearances - a.appearances;
      }
      return b.confidence - a.confidence;
    });

    // Limit to top 15 most important characters
    const topCharacters = characters.slice(0, 15);

    // Build summary
    let summary = "CHARACTER GENDER INFORMATION:\n";
    summary += "The following characters appear in the text with their determined genders:\n\n";

    topCharacters.forEach(char => {
      const confidenceStr = char.confidence > 0.8 ? "high confidence" : 
                           char.confidence > 0.5 ? "medium confidence" : "low confidence";
      
      summary += `- ${char.name}: ${char.gender.toUpperCase()}`; 
      summary += ` (${confidenceStr}, appears ${char.appearances} times)\n`;
      
      if (char.evidence && char.evidence.length > 0) {
        summary += `  Evidence: ${char.evidence.join(", ")}\n`;
      }
    });

    // Add statistics
    summary += "\nGENDER STATISTICS:\n";
    summary += `- Male characters: ${this.maleEvidenceCount}\n`;
    summary += `- Female characters: ${this.femaleEvidenceCount}\n`;
    summary += `- Unknown gender: ${this.unknownGenderCount}\n`;

    return summary;
  }

  /**
   * Helper function to escape regex special characters
   * @param {string} string - String to escape
   * @return {string} - Escaped string
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

if (typeof module !== "undefined") {
  module.exports = GenderUtils;
} else {
  window.genderUtils = GenderUtils;
}