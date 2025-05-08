// genderUtils.js
/**
 * Enhanced gender utils module for Novel Dialogue Enhancer - LLM integration version
 * Focuses on extracting reliable gender information for LLM prompting
 */
class GenderUtils {
  constructor() {
    console.log(
      "Novel Dialogue Enhancer: Gender Utils initialized (LLM-optimized version)"
    );

    // Initialize gender evidence statistics
    this.maleEvidenceCount = 0;
    this.femaleEvidenceCount = 0;
    this.unknownGenderCount = 0;

    this.culturalOrigins = {
      western: 0,
      chinese: 0,
      japanese: 0,
      korean: 0
    };
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
    if (name.length <= 1)
      return { gender: "unknown", confidence: 0, evidence: [] };

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

    // Identify likely cultural origin of name
    const culturalOrigin = this.detectNameCulturalOrigin(name, text);

    // Check for definitive markers first
    const titleResult = this.checkTitlesAndHonorifics(name, culturalOrigin);
    if (titleResult.gender !== "unknown") {
      if (titleResult.gender === "male") {
        this.maleEvidenceCount++;
        return {
          gender: "male",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence} (${culturalOrigin})`]
        };
      }
      if (titleResult.gender === "female") {
        this.femaleEvidenceCount++;
        return {
          gender: "female",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence} (${culturalOrigin})`]
        };
      }
    }

    // Analyze name patterns based on cultural origin
    const namePatternResult = this.checkNamePatterns(name, culturalOrigin);
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

    // Analyze pronouns in context (accounting for mistranslation patterns)
    const pronounResult = this.analyzePronounContext(name, text);
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

    // Check for pronoun inconsistencies (common in translations)
    const inconsistencyResult = this.detectPronounInconsistencies(name, text);
    if (inconsistencyResult.correction) {
      // If we found an inconsistency correction, trust it highly
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

    // Check relationships
    const relationshipResult = this.checkRelationships(
      name,
      text,
      culturalOrigin
    );
    if (
      relationshipResult.maleScore > 0 ||
      relationshipResult.femaleScore > 0
    ) {
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

    // Check for cultural-specific character indicators
    const culturalResult = this.checkCulturalSpecificIndicators(
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
      evidence,
      culturalOrigin
    };
  }

  /**
   * Detect the likely cultural origin of a name
   * @param {string} name - The name to analyze
   * @param {string} text - Surrounding text context
   * @return {string} - Cultural origin (western, chinese, japanese, korean)
   */
  detectNameCulturalOrigin(name, text) {
    // Common character patterns in different languages
    const chineseChars = /[\u4E00-\u9FFF]/;
    const japaneseChars = /[\u3040-\u309F\u30A0-\u30FF]/;
    const koreanChars =
      /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/;

    // Check for obvious character usage
    if (chineseChars.test(name)) {
      this.culturalOrigins.chinese++;
      return "chinese";
    }
    if (japaneseChars.test(name)) {
      this.culturalOrigins.japanese++;
      return "japanese";
    }
    if (koreanChars.test(name)) {
      this.culturalOrigins.korean++;
      return "korean";
    }

    // Check for common East Asian name patterns
    const chineseNamePatterns = [
      /^(?:Wang|Li|Zhang|Liu|Chen|Yang|Zhao|Huang|Zhou|Wu|Xu|Sun|Hu|Zhu|Gao|Lin|He|Guo|Ma|Luo|Liang|Song|Zheng|Xie|Han|Tang|Feng|Yu|Dong|Xiao)/i,
      /(?:Xiang|Tian|Jiang|Pan|Wei|Ye|Yuan|Lu|Deng|Yao|Peng|Cao|Zou|Xiong|Qian|Dai|Fu|Ding|Jiang)/i
    ];

    const japaneseNamePatterns = [
      /(?:Sato|Suzuki|Takahashi|Tanaka|Watanabe|Ito|Yamamoto|Nakamura|Kobayashi|Kato|Yoshida|Yamada|Sasaki|Yamaguchi|Matsumoto|Inoue|Kimura|Hayashi|Shimizu|Yamazaki|Mori|Abe|Ikeda|Hashimoto|Ishikawa)/i,
      /(?:Akira|Yuki|Haruto|Soma|Yuma|Ren|Haru|Sora|Haruki|Ayumu|Riku|Taiyo|Hinata|Yamato|Minato|Yuto|Sota|Yui|Hina|Koharu|Mei|Mio|Rin|Miyu|Kokona|Hana|Yuna|Sakura|Saki|Ichika|Akari|Himari)/i,
      /(?:-san|-kun|-chan|-sama|-sensei|-senpai)/i
    ];

    const koreanNamePatterns = [
      /(?:Kim|Lee|Park|Choi|Jung|Kang|Cho|Yoon|Jang|Lim|Han|Oh|Seo|Shin|Kwon|Hwang|Ahn|Song|Yoo|Hong|Jeon|Moon|Baek|Chung|Bae|Ryu)/i,
      /(?:Min|Seung|Hyun|Sung|Young|Jin|Soo|Jun|Ji|Hye|Joon|Woo|Dong|Kyung|Jae|Eun|Yong|In|Ho|Chang|Hee|Hyung|Cheol|Kwang|Tae|Yeon)/i
    ];

    for (const pattern of chineseNamePatterns) {
      if (pattern.test(name)) {
        this.culturalOrigins.chinese++;
        return "chinese";
      }
    }

    for (const pattern of japaneseNamePatterns) {
      if (pattern.test(name)) {
        this.culturalOrigins.japanese++;
        return "japanese";
      }
    }

    for (const pattern of koreanNamePatterns) {
      if (pattern.test(name)) {
        this.culturalOrigins.korean++;
        return "korean";
      }
    }

    // Check context for cultural indicators
    const contextClues = {
      chinese: [
        /Shanghai|Beijing|Guangzhou|Chinese|China|Mandarin|Cantonese|Dynasty|Emperor|Immortal|Cultivation|Dao|Qi|Taoist|Daoist|Wuxia|Xianxia|Jianghu/gi,
        /Master|Shizun|Shifu|Shidi|Shixiong|Shimei|Shijie|Gongzi|Gongsun|Xiao|Lao|Da|Er|San|Si|Wu|Liu|Qi|Ba|Jiu|Shi/gi
      ],
      japanese: [
        /Tokyo|Osaka|Kyoto|Japanese|Japan|Senpai|Sensei|Sama|Kun|Chan|San|Dono|Hakase|Sushi|Ramen|Katana|Shinobi|Ninja|Samurai|Shogun|Daimyo|Ronin/gi,
        /Onee|Onii|Nee|Nii|Imouto|Otouto|Oba|Oji|Okaa|Otou|Obaa|Ojii|-san|-kun|-chan|-sama|-dono|-sensei/gi
      ],
      korean: [
        /Seoul|Busan|Incheon|Korean|Korea|Hangul|Hanbok|Kimchi|Chaebol|Manhwa|Webtoon|Noona|Hyung|Oppa|Unnie|Sunbae|Hoobae|Ahjussi|Ahjumma/gi,
        /Hyung|Noona|Oppa|Unnie|Sunbae|Hoobae|Dongsaeng|Chingu|Ahjussi|Ahjumma|Halmeoni|Harabeoji/gi
      ]
    };

    let culturalScores = {
      chinese: 0,
      japanese: 0,
      korean: 0,
      western: 0
    };

    // Count cultural references in surrounding text
    for (const culture in contextClues) {
      for (const pattern of contextClues[culture]) {
        const matches = text.match(pattern) || [];
        culturalScores[culture] += matches.length;
      }
    }

    // Get the dominant culture from the context
    const dominantCulture = Object.keys(culturalScores).reduce(
      (a, b) => (culturalScores[a] > culturalScores[b] ? a : b),
      "western"
    );

    if (dominantCulture !== "western") {
      this.culturalOrigins[dominantCulture]++;
      return dominantCulture;
    }

    // Default to western
    this.culturalOrigins.western++;
    return "western";
  }

  /**
   * Check for gendered titles and honorifics in name
   * @param {string} name - Name to check
   * @return {object} - Gender determination with evidence
   */
  checkTitlesAndHonorifics(name, culturalOrigin = "western") {
    const maleTitles = {
      western: [
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
        "Fellow"
      ],
      chinese: [
        "Dage",
        "Gege",
        "Shixiong",
        "Shidi",
        "Shizun",
        "Shifu",
        "Taoist",
        "Monk",
        "Young Master",
        "Gongzi",
        "Laoye",
        "Fujun",
        "Xiandi",
        "Huangdi",
        "Wang",
        "Shaoye",
        "Shibo",
        "Shishu",
        "Da-ge",
        "Er-ge",
        "San-ge",
        "Si-ge",
        "Wu-ge",
        "Liu-ge"
      ],
      japanese: [
        "Oniisan",
        "Onii-san",
        "Onii-sama",
        "Onii-chan",
        "Otouto",
        "Aniki",
        "-kun",
        "Oji-san",
        "Otou-san",
        "Otou-sama",
        "Ojii-san",
        "Ojii-sama",
        "Sensei",
        "Senpai",
        "Dono",
        "Sama",
        "Bocchama",
        "Shishou",
        "Daimyo",
        "Shogun",
        "Tono"
      ],
      korean: [
        "Oppa",
        "Hyung",
        "Ahjussi",
        "Harabeoji",
        "Samchon",
        "Appa",
        "Abeonim",
        "Seonsaengnim",
        "Sunbae",
        "Sajangnim",
        "Daejang",
        "Daegam"
      ]
    };

    const femaleTitles = {
      western: [
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
        "Dame"
      ],
      chinese: [
        "Jiejie",
        "Meimei",
        "Shijie",
        "Shimei",
        "Young Lady",
        "Young Miss",
        "Guniang",
        "Xiaojie",
        "Furen",
        "Taitai",
        "Niangniang",
        "Huanghou",
        "Gongzhu",
        "Wangfei",
        "Guifei",
        "Gupo",
        "Shenshen",
        "Da-jie",
        "Er-jie",
        "San-jie",
        "Si-jie",
        "Wu-jie",
        "Liu-jie"
      ],
      japanese: [
        "Oneesan",
        "Onee-san",
        "Onee-sama",
        "Onee-chan",
        "Imouto",
        "Aneue",
        "-chan",
        "Oba-san",
        "Okaa-san",
        "Okaa-sama",
        "Obaa-san",
        "Obaa-sama",
        "Ojou-sama",
        "Hime",
        "Fujin",
        "Himedono"
      ],
      korean: [
        "Unni",
        "Nuna",
        "Ahjumma",
        "Halmeoni",
        "Imo",
        "Eomma",
        "Eomeonim",
        "Seonsaengnim",
        "Sunbae",
        "Sajangnim"
      ]
    };

    // Check all cultural title sets, but prioritize the detected culture
    const culturesToCheck = [
      culturalOrigin,
      ...Object.keys(maleTitles).filter((c) => c !== culturalOrigin)
    ];

    for (const culture of culturesToCheck) {
      // Check if name starts with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(`^${this.escapeRegExp(title)}\\s+`, "i");
        if (titleRegex.test(name) || name === title) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(`^${this.escapeRegExp(title)}\\s+`, "i");
        if (titleRegex.test(name) || name === title) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }

      // Check if name ends with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(`\\s+${this.escapeRegExp(title)}$`, "i");
        if (titleRegex.test(name)) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(`\\s+${this.escapeRegExp(title)}$`, "i");
        if (titleRegex.test(name)) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }

      // Check if name contains a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${this.escapeRegExp(title)}\\s+`,
          "i"
        );
        if (titleRegex.test(name)) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${this.escapeRegExp(title)}\\s+`,
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
   * Check name patterns (endings, etc.) for gender clues
   * @param {string} name - Name to check
   * @return {object} - Gender determination with evidence
   */
  checkNamePatterns(name, culturalOrigin = "western") {
    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

    // Gender patterns by culture
    const femaleEndings = {
      western: [
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
        "issa",
        "ara",
        "lyn",
        "lynn",
        "lee"
      ],
      chinese: [
        "xia",
        "qian",
        "ying",
        "yan",
        "yun",
        "juan",
        "xin",
        "min",
        "ning",
        "ping",
        "zhen",
        "hua"
      ],
      japanese: [
        "ko",
        "mi",
        "ki",
        "na",
        "ka",
        "ri",
        "yo",
        "ho",
        "sa",
        "shi",
        "tsu",
        "chi"
      ],
      korean: [
        "mi",
        "hee",
        "jung",
        "young",
        "hyun",
        "jin",
        "eun",
        "seon",
        "yeon",
        "ji",
        "hye",
        "kyung"
      ]
    };

    const maleEndings = {
      western: [
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
      ],
      chinese: [
        "hao",
        "wei",
        "jian",
        "feng",
        "ming",
        "tao",
        "cheng",
        "jun",
        "gang",
        "long",
        "peng",
        "kun"
      ],
      japanese: [
        "ro",
        "ta",
        "to",
        "ki",
        "ji",
        "shi",
        "ya",
        "suke",
        "kazu",
        "hiro",
        "aki",
        "yuki"
      ],
      korean: [
        "ho",
        "seok",
        "woo",
        "jin",
        "joon",
        "sung",
        "hyun",
        "min",
        "seung",
        "jun",
        "cheol",
        "tae"
      ]
    };

    // First check specific culture's patterns
    for (const ending of femaleEndings[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "female",
          evidence: `${culturalOrigin} name ending with '${ending}'`
        };
      }
    }

    for (const ending of maleEndings[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "male",
          evidence: `${culturalOrigin} name ending with '${ending}'`
        };
      }
    }

    // If no match, try western patterns for names that might be westernized
    if (culturalOrigin !== "western") {
      for (const ending of femaleEndings.western) {
        if (nameLower.endsWith(ending)) {
          return {
            gender: "female",
            evidence: `western name ending with '${ending}'`
          };
        }
      }

      for (const ending of maleEndings.western) {
        if (nameLower.endsWith(ending)) {
          return {
            gender: "male",
            evidence: `western name ending with '${ending}'`
          };
        }
      }
    }

    // Check for East Asian single-character given names
    if (culturalOrigin === "chinese" && name.length <= 3) {
      // Common single-character male/female names in Chinese would go here
      // This would require a more extensive database to be accurate
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
    let inconsistencies = 0;

    // Find sentences containing the name
    const nameSentenceRegex = new RegExp(
      `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]*[.!?]`,
      "gi"
    );
    const matches = Array.from(text.matchAll(nameSentenceRegex));
    const contexts = [];

    // For each matching sentence, analyze pronouns in following text
    matches.forEach((match) => {
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

      // Determine score based on pronoun frequency
      if (malePronouns > femalePronouns) {
        maleScore += Math.min(4, malePronouns);
      } else if (femalePronouns > malePronouns) {
        femaleScore += Math.min(4, femalePronouns);
      }

      // Check for mixed pronouns in same context (potential translation errors)
      if (malePronouns > 0 && femalePronouns > 0) {
        inconsistencies++;
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

    return {
      maleScore,
      femaleScore,
      inconsistencies,
      contexts
    };
  }

  /**
   * Detect pronoun inconsistencies commonly found in translations
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Inconsistency detection results
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
   * Check for cultural-specific character indicators
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender scores with evidence
   */
  checkCulturalSpecificIndicators(name, text, culturalOrigin) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Mapping of cultural-specific indicators
    const culturalIndicators = {
      western: {
        male: [
          "man",
          "boy",
          "gentleman",
          "male",
          "lad",
          "groom",
          "bachelor",
          "Mr",
          "Mr.",
          "sir",
          "lord",
          "king",
          "prince",
          "duke",
          "emperor",
          "chairman",
          "master",
          "knight"
        ],
        female: [
          "woman",
          "girl",
          "lady",
          "female",
          "lass",
          "bride",
          "maiden",
          "Miss",
          "Mrs",
          "Ms",
          "madam",
          "ma'am",
          "queen",
          "princess",
          "duchess",
          "empress",
          "chairwoman",
          "mistress",
          "dame"
        ]
      },
      chinese: {
        male: [
          "shixiong",
          "shidi",
          "gege",
          "dage",
          "tangge",
          "shushu",
          "bobo",
          "yeye",
          "shifu",
          "gongzi",
          "laoye",
          "wangye",
          "shizi",
          "gongzi",
          "langjun",
          "xiansheng",
          "xiong",
          "shaoye",
          "gongzi",
          "shaoye",
          "xianzhu",
          "fuma"
        ],
        female: [
          "shijie",
          "shimei",
          "jiejie",
          "meimei",
          "tangjie",
          "tangmei",
          "ayi",
          "nainai",
          "guniang",
          "xiaojie",
          "furen",
          "taitai",
          "wangfei",
          "gongzhu",
          "xiaojie",
          "niangniang",
          "guifei",
          "gupo",
          "shitai",
          "shiniang"
        ]
      },
      japanese: {
        male: [
          "otoko",
          "shounen",
          "danshi",
          "oniisan",
          "otouto",
          "ojisan",
          "ojiisan",
          "otousan",
          "danna",
          "shujin",
          "otto",
          "senpai",
          "kohai",
          "sensei",
          "kun",
          "bocchama",
          "dono",
          "tono",
          "-kun",
          "-dono",
          "-sama",
          "-san"
        ],
        female: [
          "onna",
          "shoujo",
          "joshi",
          "oneesan",
          "imouto",
          "obasan",
          "obaasan",
          "okaasan",
          "tsuma",
          "okusan",
          "kanai",
          "senpai",
          "kohai",
          "sensei",
          "chan",
          "ojousama",
          "hime",
          "-chan",
          "-san",
          "-sama"
        ]
      },
      korean: {
        male: [
          "namja",
          "sonyeon",
          "abeoji",
          "hyeong",
          "oppa",
          "ajussi",
          "harabeoji",
          "abeoji",
          "nampyeon",
          "yeobo",
          "sunbae",
          "hubae",
          "seonsaengnim",
          "gun",
          "ssi"
        ],
        female: [
          "yeoja",
          "sonyeo",
          "eomeoni",
          "unni",
          "eonni",
          "ajumma",
          "halmeoni",
          "eomeoni",
          "anae",
          "yeobo",
          "sunbae",
          "hubae",
          "seonsaengnim",
          "yang",
          "ssi"
        ]
      }
    };

    const exactIndicators = {
      western: {
        male: [
          `${name} is a man`,
          `${name} is male`,
          `${name}, a man`,
          `${name}, a male`,
          `${name} was a man`,
          `${name} was male`,
          `${name}, the man`,
          `man named ${name}`
        ],
        female: [
          `${name} is a woman`,
          `${name} is female`,
          `${name}, a woman`,
          `${name}, a female`,
          `${name} was a woman`,
          `${name} was female`,
          `${name}, the woman`,
          `woman named ${name}`
        ]
      },
      chinese: {
        male: [
          `${name} xiong`,
          `${name} ge`,
          `${name} gege`,
          `${name} dage`,
          `${name} shixiong`,
          `${name} shidi`,
          `${name} shifu`,
          `${name} gongzi`
        ],
        female: [
          `${name} mei`,
          `${name} jie`,
          `${name} jiejie`,
          `${name} shimei`,
          `${name} shijie`,
          `${name} guniang`,
          `${name} xiaojie`,
          `${name} gongzhu`
        ]
      },
      japanese: {
        male: [
          `${name} kun`,
          `${name}-kun`,
          `${name} san`,
          `${name}-san`,
          `${name} sama`,
          `${name}-sama`,
          `${name} dono`,
          `${name}-dono`
        ],
        female: [
          `${name} chan`,
          `${name}-chan`,
          `${name} san`,
          `${name}-san`,
          `${name} sama`,
          `${name}-sama`,
          `${name} ojousama`
        ]
      },
      korean: {
        male: [
          `${name} gun`,
          `${name}-gun`,
          `${name} ssi`,
          `${name}-ssi`,
          `${name} hyung`,
          `${name} oppa`
        ],
        female: [
          `${name} yang`,
          `${name}-yang`,
          `${name} ssi`,
          `${name}-ssi`,
          `${name} unni`,
          `${name} eonni`
        ]
      }
    };

    // Check culture-specific direct indicators
    const specificCultureIndicators =
      exactIndicators[culturalOrigin] || exactIndicators.western;

    for (const indicator of specificCultureIndicators.male) {
      if (text.toLowerCase().includes(indicator.toLowerCase())) {
        maleScore += 3;
        evidence = indicator;
        break;
      }
    }

    for (const indicator of specificCultureIndicators.female) {
      if (text.toLowerCase().includes(indicator.toLowerCase())) {
        femaleScore += 3;
        evidence = indicator;
        break;
      }
    }

    // If no direct evidence found, look for nearby cultural indicators
    if (!evidence) {
      // Find text segments within 50 characters of name mentions
      const nameProximityRegex = new RegExp(
        `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]{0,50}`,
        "gi"
      );
      const proximityMatches = Array.from(text.matchAll(nameProximityRegex));
      let proximityText = "";

      proximityMatches.forEach((match) => {
        proximityText += match[0] + " ";
      });

      // Check for cultural indicators in proximity text
      const cultureSpecific =
        culturalIndicators[culturalOrigin] || culturalIndicators.western;

      for (const indicator of cultureSpecific.male) {
        const indicatorRegex = new RegExp(
          `\\b${this.escapeRegExp(indicator)}\\b`,
          "i"
        );
        if (indicatorRegex.test(proximityText)) {
          maleScore += 1;
          evidence = `near term '${indicator}'`;
          break;
        }
      }

      for (const indicator of cultureSpecific.female) {
        const indicatorRegex = new RegExp(
          `\\b${this.escapeRegExp(indicator)}\\b`,
          "i"
        );
        if (indicatorRegex.test(proximityText)) {
          femaleScore += 1;
          evidence = `near term '${indicator}'`;
          break;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
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

    // Check for male descriptors
    for (const word of maleWords) {
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
        evidence = `described as ${word}`;
        break;
      }
    }

    // Check for female descriptors
    for (const word of femaleWords) {
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
