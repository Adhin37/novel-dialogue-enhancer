// genderUtils.js - Advanced gender detection functions for Novel Dialogue Enhancer

/**
 * Advanced character gender detection
 * @param {string} name - The character name
 * @param {string} text - Surrounding text context
 * @param {object} characterMap - Existing character data (optional)
 * @return {string} - Detected gender: 'male', 'female', or 'unknown'
 */
function guessGender(name, text, characterMap = {}) {
  // Skip gender detection for very short names (likely not actual character names)
  if (name.length <= 1) return "unknown";

  // Check if we already have this character in our map
  if (characterMap[name] && characterMap[name].gender !== "unknown") {
    return characterMap[name].gender;
  }

  // Create a confidence score system
  let maleScore = 0;
  let femaleScore = 0;

  // 1. Check for titles and honorifics
  const titleResult = checkTitlesAndHonorifics(name);
  if (titleResult === "male") return "male";
  if (titleResult === "female") return "female";

  // 2. Check for name patterns (common endings etc.)
  const namePatternResult = checkNamePatterns(name);
  if (namePatternResult === "male") maleScore += 2;
  if (namePatternResult === "female") femaleScore += 2;

  // 3. Check for pronouns in context
  const pronounResult = analyzePronounContext(name, text);
  maleScore += pronounResult.maleScore;
  femaleScore += pronounResult.femaleScore;

  // 4. Check for relationship references
  const relationshipResult = checkRelationships(name, text);
  maleScore += relationshipResult.maleScore;
  femaleScore += relationshipResult.femaleScore;

  // 5. Check descriptions in text
  const descriptionResult = analyzeDescriptions(name, text);
  maleScore += descriptionResult.maleScore;
  femaleScore += descriptionResult.femaleScore;

  // 6. Check other characters' references
  const referencesResult = analyzeCharacterReferences(name, text);
  maleScore += referencesResult.maleScore;
  femaleScore += referencesResult.femaleScore;

  // Make decision based on scores
  if (maleScore > femaleScore && maleScore >= 2) {
    return "male";
  } else if (femaleScore > maleScore && femaleScore >= 2) {
    return "female";
  } else {
    return "unknown";
  }
}

/**
 * Check for gendered titles and honorifics in name
 */
function checkTitlesAndHonorifics(name) {
  // Common titles, by gender
  const maleTitles = [
    "Mr",
    "Mr.",
    "Sir",
    "Lord",
    "Master",
    "Prince",
    "King",
    "Duke",
    "Count",
    "Baron",
    "Emperor",
    "Brother",
    "Uncle",
    "Father",
    "Grandpa",
    "Grandfather",
    "Boy",
    "Son",
    // Common Eastern honorifics
    "Dage",
    "Gege",
    "Oppa",
    "Hyung",
    "Nii",
    "Oniisan",
    "Otouto",
  ];

  const femaleTitles = [
    "Mrs",
    "Mrs.",
    "Ms",
    "Ms.",
    "Miss",
    "Lady",
    "Princess",
    "Queen",
    "Duchess",
    "Countess",
    "Baroness",
    "Empress",
    "Sister",
    "Aunt",
    "Mother",
    "Mom",
    "Grandma",
    "Grandmother",
    "Girl",
    "Daughter",
    // Common Eastern honorifics
    "Jiejie",
    "Meimei",
    "Unni",
    "Nuna",
    "Nee",
    "Oneesan",
    "Imouto",
  ];

  // Check for title at the beginning of the name
  for (const title of maleTitles) {
    if (name.startsWith(title + " ")) return "male";
  }

  for (const title of femaleTitles) {
    if (name.startsWith(title + " ")) return "female";
  }

  // Check for title in the name (for cases like "Young Master Li" or "Princess Anna")
  for (const title of maleTitles) {
    if (name.includes(" " + title + " ") || name === title) return "male";
  }

  for (const title of femaleTitles) {
    if (name.includes(" " + title + " ") || name === title) return "female";
  }

  return "unknown";
}

/**
 * Check name patterns (endings, etc.) for gender clues
 */
function checkNamePatterns(name) {
  // This is a simplified approach - real implementation would be more comprehensive
  // and might use datasets for different language names

  // Some common female name endings in English
  const femaleEndings = [
    "a",
    "ie",
    "y",
    "ey",
    "i",
    "elle",
    "ette",
    "ine",
    "ell",
  ];

  // Some common male name endings in English
  const maleEndings = ["o", "er", "on", "en", "us", "or", "k", "d", "t"];

  // Use only for single names (not for full names like "John Smith")
  if (!name.includes(" ")) {
    // Get the ending of the name (last 1-3 characters)
    const nameLower = name.toLowerCase();

    // Check female endings
    for (const ending of femaleEndings) {
      if (nameLower.endsWith(ending)) {
        return "female";
      }
    }

    // Check male endings
    for (const ending of maleEndings) {
      if (nameLower.endsWith(ending)) {
        return "male";
      }
    }
  }

  return "unknown";
}

/**
 * Analyze pronouns in context around the character name
 */
function analyzePronounContext(name, text) {
  let maleScore = 0;
  let femaleScore = 0;

  // Create a regex to find sentences containing the character name
  const nameSentenceRegex = new RegExp(
    `[^.!?]*\\b${escapeRegExp(name)}\\b[^.!?]*[.!?]`,
    "gi"
  );
  const matches = Array.from(text.matchAll(nameSentenceRegex));

  // For each matching sentence, check the following 2-3 sentences for pronouns
  matches.forEach((match) => {
    const matchIndex = match.index;
    const sentenceWithName = match[0];

    // Look at the following text (approximately 200 chars)
    const followingText = text.substring(
      matchIndex,
      matchIndex + sentenceWithName.length + 200
    );

    // Count gendered pronouns in the nearby context
    const malePronouns = (followingText.match(/\b(he|him|his)\b/gi) || [])
      .length;
    const femalePronouns = (followingText.match(/\b(she|her|hers)\b/gi) || [])
      .length;

    // Add weighted scores based on pronoun counts
    if (malePronouns > femalePronouns) {
      maleScore += Math.min(3, malePronouns);
    } else if (femalePronouns > malePronouns) {
      femaleScore += Math.min(3, femalePronouns);
    }
  });

  return { maleScore, femaleScore };
}

/**
 * Analyze how other characters refer to this character
 */
function analyzeCharacterReferences(name, text) {
  let maleScore = 0;
  let femaleScore = 0;

  // Common reference patterns
  const maleReferences = [
    `the man named ${name}`,
    `the gentleman named ${name}`,
    `the young man named ${name}`,
    `the old man named ${name}`,
    `the boy named ${name}`,
    `the male ${name}`,
    `the man, ${name}`,
    `mister ${name}`,
    `mr. ${name}`,
    `sir ${name}`,
    `king ${name}`,
    `prince ${name}`,
    `lord ${name}`,
    `master ${name}`,
    `brother ${name}`,
  ];

  const femaleReferences = [
    `the woman named ${name}`,
    `the lady named ${name}`,
    `the young woman named ${name}`,
    `the old woman named ${name}`,
    `the girl named ${name}`,
    `the female ${name}`,
    `the woman, ${name}`,
    `miss ${name}`,
    `ms. ${name}`,
    `mrs. ${name}`,
    `madam ${name}`,
    `queen ${name}`,
    `princess ${name}`,
    `lady ${name}`,
    `mistress ${name}`,
    `sister ${name}`,
  ];

  // Check for matches in a case-insensitive way
  const textLower = text.toLowerCase();

  maleReferences.forEach((ref) => {
    if (textLower.includes(ref.toLowerCase())) {
      maleScore += 2;
    }
  });

  femaleReferences.forEach((ref) => {
    if (textLower.includes(ref.toLowerCase())) {
      femaleScore += 2;
    }
  });

  return { maleScore, femaleScore };
}

/**
 * Helper function to escape regex special characters
 */
function escapeRegExp(string) {
  return string.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\  return { maleScore, femaleScore };"
  );
}

/**
 * Check for relationship descriptions that indicate gender
 */
function checkRelationships(name, text) {
  let maleScore = 0;
  let femaleScore = 0;

  // Male relationship indicators (when name is the subject)
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
  ];

  // Female relationship indicators (when name is the subject)
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
  ];

  // Check for male relationship indicators
  maleRelationships.forEach((relation) => {
    if (text.includes(relation)) {
      maleScore += 3; // Strong indicator
    }
  });

  // Check for female relationship indicators
  femaleRelationships.forEach((relation) => {
    if (text.includes(relation)) {
      femaleScore += 3; // Strong indicator
    }
  });

  return { maleScore, femaleScore };
}

/**
 * Analyze physical or character descriptions for gender clues
 */
function analyzeDescriptions(name, text) {
  let maleScore = 0;
  let femaleScore = 0;

  // Look for gendered descriptions within approximately 60 characters of the name
  const nameContext = new RegExp(
    `\\b${escapeRegExp(name)}\\b[^.!?]{0,60}`,
    "gi"
  );
  const contextMatches = Array.from(text.matchAll(nameContext));

  // Male-associated words
  const maleWords = [
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
  ];

  // Female-associated words
  const femaleWords = [
    "beautiful",
    "pretty",
    "gorgeous",
    "lovely",
    "she was pregnant",
    "her makeup",
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
    "her dress",
    "her gown",
    "her hair",
  ];

  // Check for male-associated words
  maleWords.forEach((word) => {
    if (text.includes(word)) {
      maleScore += 1;
    }
  });

  // Check for female-associated words
  femaleWords.forEach((word) => {
    if (text.includes(word)) {
      femaleScore += 1;
    }
  });

  return { maleScore, femaleScore };
}

/**
 * Analyze how other characters refer to this character
 * @param {string} name - The character name
 * @param {string} text - Surrounding text context
 * @return {object} - Male and female scores
 */
function analyzeCharacterReferences(name, text) {
  let maleScore = 0;
  let femaleScore = 0;

  // Common reference patterns
  const maleReferences = [
    `the man named ${name}`,
    `the gentleman named ${name}`,
    `the young man named ${name}`,
    `the old man named ${name}`,
    `the boy named ${name}`,
    `the male ${name}`,
    `the man, ${name}`,
    `mister ${name}`,
    `mr. ${name}`,
    `sir ${name}`,
    `king ${name}`,
    `prince ${name}`,
    `lord ${name}`,
    `master ${name}`,
    `brother ${name}`,
  ];

  const femaleReferences = [
    `the woman named ${name}`,
    `the lady named ${name}`,
    `the young woman named ${name}`,
    `the old woman named ${name}`,
    `the girl named ${name}`,
    `the female ${name}`,
    `the woman, ${name}`,
    `miss ${name}`,
    `ms. ${name}`,
    `mrs. ${name}`,
    `madam ${name}`,
    `queen ${name}`,
    `princess ${name}`,
    `lady ${name}`,
    `mistress ${name}`,
    `sister ${name}`,
  ];

  // Check for matches in a case-insensitive way
  const textLower = text.toLowerCase();

  maleReferences.forEach((ref) => {
    if (textLower.includes(ref.toLowerCase())) {
      maleScore += 1;
    }
  });

  femaleReferences.forEach((ref) => {
    if (textLower.includes(ref.toLowerCase())) {
      femaleScore += 1;
    }
  });

  return { maleScore, femaleScore };
}

// Export functions
if (typeof module !== "undefined") {
  module.exports = { guessGender };
} else {
  // For direct browser usage
  window.genderUtils = { guessGender };
}
