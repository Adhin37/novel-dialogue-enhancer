// genderUtils.js
/**
 * Gender utils module for Novel Dialogue Enhancer
 */
class GenderUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Gender Utils initialized");
  }
  /**
   * Advanced character gender detection with improved accuracy and context awareness
   * @param {string} name - The character name
   * @param {string} text - Surrounding text context
   * @param {object} characterMap - Existing character data (optional)
   * @return {string} - Detected gender: 'male', 'female', or 'unknown'
   */
  guessGender(name, text, characterMap = {}) {
    if (name.length <= 1) return "unknown";

    if (characterMap[name] && characterMap[name].gender !== "unknown") {
      return characterMap[name].gender;
    }

    let maleScore = 0;
    let femaleScore = 0;

    const titleResult = this.checkTitlesAndHonorifics(name);
    if (titleResult === "male") return "male";
    if (titleResult === "female") return "female";

    const namePatternResult = this.checkNamePatterns(name);
    if (namePatternResult === "male") maleScore += 2;
    if (namePatternResult === "female") femaleScore += 2;

    const pronounResult = this.analyzePronounContext(name, text);
    maleScore += pronounResult.maleScore;
    femaleScore += pronounResult.femaleScore;

    const relationshipResult = this.checkRelationships(name, text);
    maleScore += relationshipResult.maleScore;
    femaleScore += relationshipResult.femaleScore;

    const descriptionResult = this.analyzeDescriptions(name, text);
    maleScore += descriptionResult.maleScore;
    femaleScore += descriptionResult.femaleScore;

    const referencesResult = this.analyzeCharacterReferences(name, text);
    maleScore += referencesResult.maleScore;
    femaleScore += referencesResult.femaleScore;

    const actionsResult = this.analyzeCharacterActions(name, text);
    maleScore += actionsResult.maleScore;
    femaleScore += actionsResult.femaleScore;

    const appearanceResult = this.analyzeAppearanceDescriptions(name, text);
    maleScore += appearanceResult.maleScore;
    femaleScore += appearanceResult.femaleScore;

    if (maleScore > femaleScore && maleScore >= 3) {
      return "male";
    } else if (femaleScore > maleScore && femaleScore >= 3) {
      return "female";
    } else {
      return "unknown";
    }
  }

  /**
   * Check for gendered titles and honorifics in name
   */
  checkTitlesAndHonorifics(name) {
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
      "Dad",
      "Daddy",
      "Papa",
      "Grandpa",
      "Grandfather",
      "Boy",
      "Son",
      "Husband",
      "Mister",
      "Gentleman",
      "Lad",
      "Fellow",

      "Dage",
      "Gege",
      "Oppa",
      "Hyung",
      "Nii",
      "Oniisan",
      "Otouto",
      "Aniki",
      "-kun",
      "Shixiong",
      "Shidi",
      "Shizun",
      "Shifu",
      "Taoist",
      "Monk",
      "Young Master"
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
      "Mommy",
      "Mama",
      "Grandma",
      "Grandmother",
      "Girl",
      "Daughter",
      "Wife",
      "Madam",
      "Madame",
      "Mistress",
      "Dame",

      "Jiejie",
      "Meimei",
      "Unni",
      "Nuna",
      "Nee",
      "Oneesan",
      "Imouto",
      "Aneue",
      "-chan",
      "Shimei",
      "Shijie",
      "Young Lady",
      "Young Miss"
    ];

    for (const title of maleTitles) {
      if (
        name.startsWith(title + " ") ||
        name.endsWith(" " + title) ||
        name === title
      ) {
        return "male";
      }
    }

    for (const title of femaleTitles) {
      if (
        name.startsWith(title + " ") ||
        name.endsWith(" " + title) ||
        name === title
      ) {
        return "female";
      }
    }

    for (const title of maleTitles) {
      if (name.includes(" " + title + " ")) return "male";
    }

    for (const title of femaleTitles) {
      if (name.includes(" " + title + " ")) return "female";
    }

    return "unknown";
  }

  /**
   * Check name patterns (endings, etc.) for gender clues
   */
  checkNamePatterns(name) {
    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

    const femaleEndings = [
      "a",
      "ia",
      "ie",
      "y",
      "ey",
      "i",
      "elle",
      "ette",
      "ine",
      "ell",
      "lyn",
      "ina",
      "ah",
      "ella",
      "anna",
      "enna",
      "anne",
      "ette",
      "issa",
      "ara",
      "lyn",
      "lynn",
      "lee"
    ];

    const maleEndings = [
      "o",
      "er",
      "on",
      "en",
      "us",
      "or",
      "k",
      "d",
      "t",
      "io",
      "ian",
      "im",
      "am",
      "ik",
      "to",
      "ro",
      "hn",
      "il",
      "rt",
      "ng",
      "ez",
      "an"
    ];

    for (const ending of femaleEndings) {
      if (nameLower.endsWith(ending)) {
        return "female";
      }
    }

    for (const ending of maleEndings) {
      if (nameLower.endsWith(ending)) {
        return "male";
      }
    }

    const maleStarts = [
      "jo",
      "ja",
      "mi",
      "da",
      "al",
      "ro",
      "wi",
      "ra",
      "br",
      "st"
    ];
    const femaleStarts = [
      "sa",
      "ma",
      "la",
      "ka",
      "em",
      "li",
      "el",
      "be",
      "je",
      "vi"
    ];

    for (const start of maleStarts) {
      if (nameLower.startsWith(start)) {
        return "male";
      }
    }

    for (const start of femaleStarts) {
      if (nameLower.startsWith(start)) {
        return "female";
      }
    }

    return "unknown";
  }

  /**
   * Analyze pronouns in context around the character name
   */
  analyzePronounContext(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

    const nameSentenceRegex = new RegExp(
      `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]*[.!?]`,
      "gi"
    );
    const matches = Array.from(text.matchAll(nameSentenceRegex));

    matches.forEach((match) => {
      const matchIndex = match.index;
      const sentenceWithName = match[0];

      const followingText = text.substring(
        matchIndex,
        matchIndex + sentenceWithName.length + 200
      );

      const malePronouns = (followingText.match(/\b(he|him|his)\b/gi) || [])
        .length;
      const femalePronouns = (followingText.match(/\b(she|her|hers)\b/gi) || [])
        .length;

      if (malePronouns > femalePronouns) {
        maleScore += Math.min(4, malePronouns);
      } else if (femalePronouns > malePronouns) {
        femaleScore += Math.min(4, femalePronouns);
      }

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
   * Analyze how other characters refer to this character
   */
  analyzeCharacterReferences(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

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
      `his name is ${name}`,
      `${name}, a man`,
      `${name}, a boy`
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
      `her name is ${name}`,
      `${name}, a woman`,
      `${name}, a girl`
    ];

    const textLower = text.toLowerCase();

    maleReferences.forEach((ref) => {
      if (textLower.includes(ref.toLowerCase())) {
        maleScore += 3;
      }
    });

    femaleReferences.forEach((ref) => {
      if (textLower.includes(ref.toLowerCase())) {
        femaleScore += 3;
      }
    });

    return { maleScore, femaleScore };
  }

  /**
   * Helper function to escape regex special characters
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Check for relationship descriptions that indicate gender
   */
  checkRelationships(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

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

    maleRelationships.forEach((relation) => {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        maleScore += 3;
      }
    });

    femaleRelationships.forEach((relation) => {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        femaleScore += 3;
      }
    });

    return { maleScore, femaleScore };
  }

  /**
   * Analyze physical or character descriptions for gender clues
   */
  analyzeDescriptions(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

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

    const femaleWords = [
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

    maleWords.forEach((word) => {
      const regex = new RegExp(
        `\\b${this.escapeRegExp(name)}[^.!?]*\\b${this.escapeRegExp(
          word
        )}\\b|\\b${this.escapeRegExp(word)}\\b[^.!?]*\\b${this.escapeRegExp(
          name
        )}\\b`,
        "i"
      );
      if (regex.test(contextText)) {
        maleScore += 2;
      } else if (contextText.toLowerCase().includes(word)) {
        maleScore += 1;
      }
    });

    femaleWords.forEach((word) => {
      const regex = new RegExp(
        `\\b${this.escapeRegExp(name)}[^.!?]*\\b${this.escapeRegExp(
          word
        )}\\b|\\b${this.escapeRegExp(word)}\\b[^.!?]*\\b${this.escapeRegExp(
          name
        )}\\b`,
        "i"
      );
      if (regex.test(contextText)) {
        femaleScore += 2;
      } else if (contextText.toLowerCase().includes(word)) {
        femaleScore += 1;
      }
    });

    return { maleScore, femaleScore };
  }

  /**
   * Analyze character actions that may be gender-indicative
   */
  analyzeCharacterActions(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

    const nameActionRegex = new RegExp(
      `\\b${this.escapeRegExp(
        name
      )}\\b[^.!?]*(\\bwent\\b|\\bcame\\b|\\bdid\\b|\\bperformed\\b|\\btook\\b|\\bgrabbed\\b|\\bpicked\\b|\\blifted\\b|\\bcarried\\b|\\bmoved\\b|\\bwore\\b|\\bput\\b|\\bapplied\\b)[^.!?]*[.!?]`,
      "gi"
    );

    const actionMatches = Array.from(text.matchAll(nameActionRegex));
    let actionText = "";

    actionMatches.forEach((match) => {
      actionText += match[0] + " ";
    });

    const maleActions = [
      "sword",
      "blade",
      "axe",
      "shield",
      "armor",
      "punched",
      "fought",
      "trained",
      "military",
      "battle",
      "war",
      "soldier",
      "commander",
      "general",
      "martial",
      "kung fu",
      "wrestling",
      "boxed",
      "sparred",
      "beard",
      "stubble",
      "shaved his",
      "tied his tie",
      "adjusted his cuffs",
      "suit",
      "tuxedo",
      "bowtie"
    ];

    const femaleActions = [
      "dress",
      "skirt",
      "gown",
      "makeup",
      "lipstick",
      "rouge",
      "blush",
      "eyeshadow",
      "mascara",
      "perfume",
      "earrings",
      "necklace",
      "jewelry",
      "braided",
      "styled her hair",
      "brushed her hair",
      "high heels",
      "purse",
      "handbag",
      "pregnant",
      "breastfeed",
      "nursed the baby",
      "curtsy",
      "curtseyed"
    ];

    maleActions.forEach((action) => {
      if (actionText.toLowerCase().includes(action)) {
        maleScore += 1;
      }
    });

    femaleActions.forEach((action) => {
      if (actionText.toLowerCase().includes(action)) {
        femaleScore += 1;
      }
    });

    return { maleScore, femaleScore };
  }

  /**
   * Analyze appearance descriptions for gender clues
   */
  analyzeAppearanceDescriptions(name, text) {
    let maleScore = 0;
    let femaleScore = 0;

    const appearanceRegex = new RegExp(
      `\\b${this.escapeRegExp(
        name
      )}(?:'s)?\\b[^.!?]*(\\bappearance\\b|\\blooked\\b|\\bdressed\\b|\\bwore\\b|\\bfigure\\b|\\bface\\b|\\bhair\\b|\\bfeatures\\b)[^.!?]*[.!?]`,
      "gi"
    );

    const appearanceMatches = Array.from(text.matchAll(appearanceRegex));
    let appearanceText = "";

    appearanceMatches.forEach((match) => {
      appearanceText += match[0] + " ";
    });

    const maleAppearance = [
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
      "his physique"
    ];

    const femaleAppearance = [
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
      "manicure"
    ];

    maleAppearance.forEach((indicator) => {
      if (appearanceText.toLowerCase().includes(indicator)) {
        maleScore += 2;
      }
    });

    femaleAppearance.forEach((indicator) => {
      if (appearanceText.toLowerCase().includes(indicator)) {
        femaleScore += 2;
      }
    });

    return { maleScore, femaleScore };
  }
}

if (typeof module !== "undefined") {
  module.exports = GenderUtils;
} else {
  window.genderUtils = GenderUtils;
}
