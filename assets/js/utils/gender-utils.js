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

    // Return existing gender if available with high confidence
    if (
      characterMap[name] &&
      characterMap[name].gender !== "unknown" &&
      characterMap[name].confidence &&
      characterMap[name].confidence > 0.75
    ) {
      return {
        gender: characterMap[name].gender,
        confidence: characterMap[name].confidence,
        evidence: characterMap[name].evidence || ["previously determined"]
      };
    }

    if (
      characterMap[name] &&
      characterMap[name].gender !== "unknown" &&
      characterMap[name].appearances &&
      characterMap[name].appearances >= 5
    ) {
      return {
        gender: characterMap[name].gender,
        confidence: Math.max(0.7, characterMap[name].confidence || 0),
        evidence: characterMap[name].evidence || [
          "frequent appearances with consistent gender"
        ]
      };
    }

    let maleScore = 0;
    let femaleScore = 0;
    const evidence = [];

    // Identify likely cultural origin of name
    const culturalOrigin = this.detectNameCulturalOrigin(name, text);
    console.log(`Cultural origin for ${name}: ${culturalOrigin}`);

    // Check for definitive markers first
    const titleResult = this.checkTitlesAndHonorifics(name, culturalOrigin);
    if (titleResult.gender !== "unknown") {
      if (titleResult.gender === "male") {
        this.maleEvidenceCount++;
        return {
          gender: "male",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence} (${culturalOrigin})`],
          culturalOrigin
        };
      }
      if (titleResult.gender === "female") {
        this.femaleEvidenceCount++;
        return {
          gender: "female",
          confidence: 0.95,
          evidence: [`title: ${titleResult.evidence} (${culturalOrigin})`],
          culturalOrigin
        };
      }
    }

    const relationshipPattern = this.checkRelationships(
      name,
      text,
      culturalOrigin
    );
    if (
      relationshipPattern.maleScore >= 3 ||
      relationshipPattern.femaleScore >= 3
    ) {
      if (relationshipPattern.maleScore > relationshipPattern.femaleScore) {
        this.maleEvidenceCount++;
        return {
          gender: "male",
          confidence: 0.9,
          evidence: [`relationship: ${relationshipPattern.evidence}`],
          culturalOrigin
        };
      }
      if (relationshipPattern.femaleScore > relationshipPattern.maleScore) {
        this.femaleEvidenceCount++;
        return {
          gender: "female",
          confidence: 0.9,
          evidence: [`relationship: ${relationshipPattern.evidence}`],
          culturalOrigin
        };
      }
    }

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

    const roleResult = this.#analyzeCharacterRole(name, text, culturalOrigin);
    if (roleResult.maleScore > 0 || roleResult.femaleScore > 0) {
      maleScore += roleResult.maleScore;
      femaleScore += roleResult.femaleScore;

      if (roleResult.evidence) {
        evidence.push(`role: ${roleResult.evidence}`);
      }
    }

    if (Object.keys(characterMap).length > 0) {
      const inferenceResult = this.#inferGenderFromRelated(
        name,
        text,
        characterMap
      );
      if (inferenceResult.maleScore > 0 || inferenceResult.femaleScore > 0) {
        maleScore += inferenceResult.maleScore;
        femaleScore += inferenceResult.femaleScore;

        if (inferenceResult.evidence) {
          evidence.push(`inference: ${inferenceResult.evidence}`);
        }
      }
    }

    let gender = "unknown";
    let confidence = 0;

    const translationAdjustment = culturalOrigin !== "western" ? 1 : 0;

    if (maleScore > femaleScore && maleScore >= 3 + translationAdjustment) {
      gender = "male";
      confidence = Math.min(0.9, 0.5 + (maleScore - femaleScore) * 0.05);
      this.maleEvidenceCount++;
    } else if (
      femaleScore > maleScore &&
      femaleScore >= 3 + translationAdjustment
    ) {
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
   * Infer gender from relationships with other characters
   * @param {string} name - The character name
   * @param {string} text - Text context
   * @param {object} characterMap - Map of known characters
   * @return {object} - Analysis results with scores and evidence
   */
  #inferGenderFromRelated(name, text, characterMap) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const romanticPatterns = [
      // Male-female pair patterns
      {
        maleSide: [
          `${name}[^.!?]*\\b(and|with)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(and|with)\\b[^.!?]*${name}`
        ],
        femaleSide: [
          `${name}[^.!?]*\\b(loved|kissed|embraced|married)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(loved|kissed|embraced|married)\\b[^.!?]*${name}`
        ],
        relationship: "romantic pairing"
      },
      // Sibling patterns
      {
        maleSide: [
          `${name}[^.!?]*\\b(brother)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(sister)\\b[^.!?]*${name}`
        ],
        femaleSide: [
          `${name}[^.!?]*\\b(sister)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(brother)\\b[^.!?]*${name}`
        ],
        relationship: "sibling relationship"
      }
    ];

    // Get only characters with known gender and reasonable confidence
    const knownCharacters = Object.entries(characterMap).filter(
      ([charName, data]) =>
        charName !== name &&
        data.gender !== "unknown" &&
        data.confidence >= 0.7 &&
        data.appearances >= 3
    );

    if (knownCharacters.length === 0) {
      return { maleScore: 0, femaleScore: 0, evidence: null };
    }

    // Look for relationship patterns with known-gender characters
    for (const [charName, data] of knownCharacters) {
      // Skip self-references
      if (charName === name) continue;

      // Check for romantic/relationship patterns
      for (const pattern of romanticPatterns) {
        // Check if the known character is male
        if (data.gender === "male") {
          // Check patterns that would make the current character female
          for (const femaleSidePattern of pattern.femaleSide) {
            const regex = new RegExp(
              femaleSidePattern.replace(
                /\(NAME\)/g,
                this.escapeRegExp(charName)
              ),
              "i"
            );
            if (regex.test(text)) {
              femaleScore += 2;
              evidence = `${pattern.relationship} with male character ${charName}`;
              break;
            }
          }
        }

        // Check if the known character is female
        else if (data.gender === "female") {
          // Check patterns that would make the current character male
          for (const maleSidePattern of pattern.maleSide) {
            const regex = new RegExp(
              maleSidePattern.replace(/\(NAME\)/g, this.escapeRegExp(charName)),
              "i"
            );
            if (regex.test(text)) {
              maleScore += 2;
              evidence = `${pattern.relationship} with female character ${charName}`;
              break;
            }
          }
        }

        if (evidence) break;
      }

      if (evidence) break;
    }

    // If no strong evidence found, look for group affiliations
    if (!evidence) {
      // Count gender distributions in character groups
      let maleGroupMembers = 0;
      let femaleGroupMembers = 0;

      // Look for group scenes containing multiple characters
      const groupScenePattern = new RegExp(
        `[^.!?]*\\b${this.escapeRegExp(
          name
        )}\\b[^.!?]*(?:\\b(and|with|alongside)\\b|,)[^.!?]*`,
        "gi"
      );
      const groupScenes = Array.from(text.matchAll(groupScenePattern));

      for (const scene of groupScenes) {
        const sceneText = scene[0];
        let malesInScene = 0;
        let femalesInScene = 0;

        // Count known characters in this scene
        for (const [charName, data] of knownCharacters) {
          if (sceneText.includes(charName)) {
            if (data.gender === "male") malesInScene++;
            else if (data.gender === "female") femalesInScene++;
          }
        }

        // If we have at least 2 characters with known gender in the scene
        if (malesInScene + femalesInScene >= 2) {
          // If mostly male group, slightly increase female score for this character (and vice versa)
          if (malesInScene > femalesInScene * 2) {
            femaleScore += 1; // In male-dominated groups, slightly more likely to be female
            maleGroupMembers += malesInScene;
          } else if (femalesInScene > malesInScene * 2) {
            maleScore += 1; // In female-dominated groups, slightly more likely to be male
            femaleGroupMembers += femalesInScene;
          }
        }
      }

      // Only use group evidence if we have enough data
      if (maleGroupMembers >= 3 || femaleGroupMembers >= 3) {
        if (maleGroupMembers > femaleGroupMembers * 2) {
          evidence = `often appears in male-dominated groups`;
        } else if (femaleGroupMembers > maleGroupMembers * 2) {
          evidence = `often appears in female-dominated groups`;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze character roles and positions that indicate gender
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Analysis results with scores and evidence
   */
  #analyzeCharacterRole(name, text, culturalOrigin = "western") {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Define role patterns by culture
    const maleRoles = {
      western: [
        "king",
        "prince",
        "duke",
        "lord",
        "emperor",
        "knight",
        "wizard",
        "sorcerer",
        "warrior",
        "hunter",
        "guard",
        "soldier",
        "general"
      ],
      chinese: [
        "sect leader",
        "patriarch",
        "young master",
        "elder",
        "immortal",
        "emperor",
        "king",
        "prince",
        "disciple",
        "cultivator",
        "hero",
        "swordsman",
        "senior brother",
        "junior brother",
        "master"
      ],
      japanese: [
        "shogun",
        "daimyo",
        "samurai",
        "ninja",
        "ronin",
        "sensei",
        "sempai",
        "master",
        "lord",
        "warrior",
        "hero",
        "monk",
        "priest"
      ],
      korean: [
        "king",
        "prince",
        "general",
        "warrior",
        "master",
        "hero",
        "hunter",
        "lord",
        "scholar",
        "minister"
      ]
    };

    const femaleRoles = {
      western: [
        "queen",
        "princess",
        "duchess",
        "lady",
        "empress",
        "witch",
        "sorceress",
        "priestess",
        "maiden",
        "huntress",
        "maid",
        "nurse"
      ],
      chinese: [
        "sect mistress",
        "matriarch",
        "young miss",
        "fairy",
        "immortal maiden",
        "empress",
        "queen",
        "princess",
        "concubine",
        "disciple",
        "senior sister",
        "junior sister",
        "mistress"
      ],
      japanese: [
        "princess",
        "empress",
        "geisha",
        "miko",
        "kunoichi",
        "lady",
        "mistress",
        "sorceress",
        "priestess",
        "shrine maiden"
      ],
      korean: [
        "queen",
        "princess",
        "lady",
        "empress",
        "maiden",
        "sorceress",
        "priestess",
        "shaman"
      ]
    };

    // Check role mentions in proximity to name
    const nameProximity = new RegExp(
      `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]{0,100}`,
      "gi"
    );
    const proximityMatches = Array.from(text.matchAll(nameProximity));
    let proximityText = "";

    proximityMatches.forEach((match) => {
      proximityText += match[0] + " ";
    });

    // Check for explicit role assignments
    // Patterns like "X was the emperor" or "the princess X"
    const explicitRolePatterns = [
      new RegExp(
        `\\b${this.escapeRegExp(
          name
        )}\\b[^.!?]{0,20}\\b(was|is)\\b[^.!?]{0,20}\\b(the|a)\\b[^.!?]{0,10}\\b(\\w+)\\b`,
        "i"
      ),
      new RegExp(
        `\\b(the|a)\\b[^.!?]{0,10}\\b(\\w+)\\b[^.!?]{0,20}\\b${this.escapeRegExp(
          name
        )}\\b`,
        "i"
      )
    ];

    for (const pattern of explicitRolePatterns) {
      const match = proximityText.match(pattern);
      if (match) {
        const potentialRole = match[3] || match[2];
        if (potentialRole) {
          const roleLower = potentialRole.toLowerCase();

          // Check if the role is in our gender lists
          for (const culture in maleRoles) {
            if (maleRoles[culture].includes(roleLower)) {
              maleScore += 3;
              evidence = `described as ${roleLower}`;
              break;
            }
          }

          if (!evidence) {
            for (const culture in femaleRoles) {
              if (femaleRoles[culture].includes(roleLower)) {
                femaleScore += 3;
                evidence = `described as ${roleLower}`;
                break;
              }
            }
          }
        }
      }
    }

    // Check for culture-specific roles in proximity
    if (!evidence) {
      const cultureRoles = {
        male: maleRoles[culturalOrigin] || maleRoles.western,
        female: femaleRoles[culturalOrigin] || femaleRoles.western
      };

      for (const role of cultureRoles.male) {
        if (
          new RegExp(
            `\\b${this.escapeRegExp(
              name
            )}\\b[^.!?]*\\b${role}\\b|\\b${role}\\b[^.!?]*\\b${this.escapeRegExp(
              name
            )}\\b`,
            "i"
          ).test(proximityText)
        ) {
          maleScore += 2;
          evidence = `associated with role: ${role}`;
          break;
        }
      }

      if (!evidence) {
        for (const role of cultureRoles.female) {
          if (
            new RegExp(
              `\\b${this.escapeRegExp(
                name
              )}\\b[^.!?]*\\b${role}\\b|\\b${role}\\b[^.!?]*\\b${this.escapeRegExp(
                name
              )}\\b`,
              "i"
            ).test(proximityText)
          ) {
            femaleScore += 2;
            evidence = `associated with role: ${role}`;
            break;
          }
        }
      }
    }

    return { maleScore, femaleScore, evidence };
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

    // Check for obvious character usage first
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

    // Enhanced name pattern recognition for romanized East Asian names
    const chineseNamePatterns = [
      // Common Chinese surnames
      /^(?:Wang|Li|Zhang|Liu|Chen|Yang|Zhao|Huang|Zhou|Wu|Xu|Sun|Hu|Zhu|Gao|Lin|He|Guo|Ma|Luo|Liang|Song|Zheng|Xie|Han|Tang|Feng|Yu|Dong|Xiao|Cao|Deng|Xu|Cheng|Wei|Shen|Luo|Jiang|Ye|Shi|Yan)/i,
      // Common cultivation novel prefixes
      /^(?:Sect Master|Young Master|Elder|Ancestor|Grandmaster|Immortal|Dao Lord|Sovereign|Venerable|Imperial|Heavenly|Divine|Martial)/i,
      // Special prefixes common in Chinese novels
      /^(?:Xiao|Lao|Da|Er|San|Si|Wu|Liu|Qi|Ba|Jiu|Shi)/i,
      // Common name particles
      /(?:Xiang|Tian|Jiang|Pan|Wei|Ye|Yuan|Lu|Deng|Yao|Peng|Cao|Zou|Xiong|Qian|Dai|Fu|Ding|Jiang)/i
    ];

    const japaneseNamePatterns = [
      // Common Japanese surnames
      /^(?:Sato|Suzuki|Takahashi|Tanaka|Watanabe|Ito|Yamamoto|Nakamura|Kobayashi|Kato|Yoshida|Yamada|Sasaki|Yamaguchi|Matsumoto|Inoue|Kimura|Hayashi|Shimizu|Yamazaki|Mori|Abe|Ikeda|Hashimoto|Ishikawa)/i,
      // Common Japanese given names
      /(?:Akira|Yuki|Haruto|Soma|Yuma|Ren|Haru|Sora|Haruki|Ayumu|Riku|Taiyo|Hinata|Yamato|Minato|Yuto|Sota|Yui|Hina|Koharu|Mei|Mio|Rin|Miyu|Kokona|Hana|Yuna|Sakura|Saki|Ichika|Akari|Himari)/i,
      // Honorifics that identify Japanese names
      /(?:-san|-kun|-chan|-sama|-sensei|-senpai|-dono)$/i
    ];

    const koreanNamePatterns = [
      // Common Korean surnames
      /^(?:Kim|Lee|Park|Choi|Jung|Kang|Cho|Yoon|Jang|Lim|Han|Oh|Seo|Shin|Kwon|Hwang|Ahn|Song|Yoo|Hong|Jeon|Moon|Baek|Chung|Bae|Ryu)/i,
      // Common Korean name components
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

    // Check context for cultural indicators when name pattern doesn't give a clear result
    const contextClues = {
      chinese: [
        // Common Chinese cultural and cultivation terms
        /Shanghai|Beijing|Guangzhou|Chinese|China|Mandarin|Cantonese|Dynasty|Emperor|Immortal|Cultivation|Dao|Qi|Taoist|Daoist|Wuxia|Xianxia|Jianghu/gi,
        // Common titles and forms of address
        /Master|Shizun|Shifu|Shidi|Shixiong|Shimei|Shijie|Gongzi|Gongsun|Xiao|Lao|Da|Er|San|Si|Wu|Liu|Qi|Ba|Jiu|Shi/gi
      ],
      japanese: [
        // Japanese locations and terms
        /Tokyo|Osaka|Kyoto|Japanese|Japan|Senpai|Sensei|Sama|Kun|Chan|San|Dono|Hakase|Sushi|Ramen|Katana|Shinobi|Ninja|Samurai|Shogun|Daimyo|Ronin/gi,
        // Japanese forms of address and suffixes
        /Onee|Onii|Nee|Nii|Imouto|Otouto|Oba|Oji|Okaa|Otou|Obaa|Ojii|-san|-kun|-chan|-sama|-dono|-sensei/gi
      ],
      korean: [
        // Korean locations and cultural terms
        /Seoul|Busan|Incheon|Korean|Korea|Hangul|Hanbok|Kimchi|Chaebol|Manhwa|Webtoon|Noona|Hyung|Oppa|Unnie|Sunbae|Hoobae|Ahjussi|Ahjumma/gi,
        // Korean forms of address
        /Hyung|Noona|Oppa|Unnie|Sunbae|Hoobae|Dongsaeng|Chingu|Ahjussi|Ahjumma|Halmeoni|Harabeoji/gi
      ]
    };

    const culturalScores = {
      chinese: 0,
      japanese: 0,
      korean: 0,
      western: 0
    };

    // Count matches of cultural references in the surrounding text
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

    if (dominantCulture !== "western" && culturalScores[dominantCulture] > 0) {
      this.culturalOrigins[dominantCulture]++;
      return dominantCulture;
    }

    // Default to western when no strong indicators exist
    this.culturalOrigins.western++;
    return "western";
  }

  /**
   * Check for gendered titles and honorifics in name
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
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
        "Liu-ge",
        "Sect Master",
        "Elder"
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
        "Tono",
        "Oyaji",
        "Otokonoko"
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
        "Liu-jie",
        "Aunt",
        "Fairy Maiden"
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
        "Himedono",
        "Onna",
        "Shoujo",
        "Okaasan"
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
        "Sajangnim",
        "Yeoja",
        "Agassi"
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
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkNamePatterns(name, culturalOrigin = "western") {
    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

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
        "ara"
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
        "hua",
        "jiao",
        "qiao",
        "mei",
        "yue",
        "lian",
        "wei"
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
        "chi",
        "haru",
        "kana",
        "saki",
        "yuki",
        "nami"
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
        "kyung",
        "ah",
        "soo",
        "joo"
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
        "kun",
        "fei",
        "tai",
        "bo",
        "hai",
        "yu",
        "bang",
        "chen"
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
        "yuki",
        "ma",
        "ichi",
        "dai",
        "suke",
        "nobu"
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
        "tae",
        "hwan",
        "gyu",
        "yong"
      ]
    };

    // Additional specific patterns by culture for first name detection
    const culturalSpecificPatterns = {
      chinese: {
        male: [
          /^(Li|Wang|Zhang|Chen|Zhao|Yang|Liu)\s/i,
          /^(Wu|Sun|Xu|Yu|Hu)\s/i
        ],
        female: [/^(Lin|Ying|Qian|Mei|Xia|Yun|Yan)\s/i, /^(Zhen|Hua|Xiao)\s/i]
      },
      japanese: {
        male: [
          /^(Taka|Hiro|Yoshi|Kazu|Masa|Nobu|Haru)/i,
          /(suke|hiko|taro|maro|shi)$/i
        ],
        female: [/^(Saku|Yuki|Haru|Mao|Rin|Miku|Yui)/i, /(ko|mi|ka|na|yo)$/i]
      },
      korean: {
        male: [
          /^(Min|Seung|Hyun|Jung|Jae|Do|Woo|Tae)\s/i,
          /(ho|hwan|jun|min|seok)$/i
        ],
        female: [/^(Seo|Ji|Hye|Yeon|Min|Hee|Eun)\s/i, /(mi|hee|jung|ah|soo)$/i]
      }
    };

    // First check specific cultural name structures
    if (culturalOrigin in culturalSpecificPatterns) {
      for (const pattern of culturalSpecificPatterns[culturalOrigin].male) {
        if (pattern.test(name)) {
          return {
            gender: "male",
            evidence: `${culturalOrigin} name pattern: ${pattern.toString()}`
          };
        }
      }

      for (const pattern of culturalSpecificPatterns[culturalOrigin].female) {
        if (pattern.test(name)) {
          return {
            gender: "female",
            evidence: `${culturalOrigin} name pattern: ${pattern.toString()}`
          };
        }
      }
    }

    // Check for culture-specific endings
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

    // If no match with the specific culture, try western patterns for names that might be westernized
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

    // Check East Asian common single-character names
    if (culturalOrigin === "chinese" && name.length <= 3) {
      // Common single-character male names in Chinese
      const chineseSingleCharMale = [
        "Bo",
        "Yi",
        "Yu",
        "Lei",
        "Hao",
        "Jie",
        "Jun",
        "Wei"
      ];
      // Common single-character female names in Chinese
      const chineseSingleCharFemale = [
        "Yan",
        "Yu",
        "Xin",
        "Mei",
        "Li",
        "Jing",
        "Ying"
      ];

      if (chineseSingleCharMale.includes(name)) {
        return {
          gender: "male",
          evidence: "single-character Chinese male name"
        };
      }
      if (chineseSingleCharFemale.includes(name)) {
        return {
          gender: "female",
          evidence: "single-character Chinese female name"
        };
      }
    }

    return { gender: "unknown", evidence: null };
  }

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
      `[^.!?]{0,100}\\b${this.escapeRegExp(name)}\\b[^.!?]*[.!?]`,
      "gi"
    );

    const nameProximityRegex = new RegExp(
      `[^.!?]*\\b${this.escapeRegExp(name)}\\b[^.!?]{0,200}`,
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
          `\\b${this.escapeRegExp(name)}\\b[^.!?]{0,30}\\b(he|him|his)\\b`,
          "i"
        )
      );

      const directFemaleConnection = followingText.match(
        new RegExp(
          `\\b${this.escapeRegExp(name)}\\b[^.!?]{0,30}\\b(she|her|hers)\\b`,
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
    for (const match of proximityMatches) {
      const proximityText = match[0];

      if (
        proximityText.match(
          new RegExp(
            `\\b${this.escapeRegExp(
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
            `\\b${this.escapeRegExp(
              name
            )}'s\\b[^.!?]*\\b(husband|boyfriend|son|brother|father)\\b`,
            "i"
          )
        )
      ) {
        femaleScore += 3;
      }

      if (
        proximityText.match(
          new RegExp(
            `"[^"]*"\\s*,?\\s*${this.escapeRegExp(
              name
            )}\\s+said,?\\s+(he|his)\\b`,
            "i"
          )
        )
      ) {
        maleScore += 2;
      }

      if (
        proximityText.match(
          new RegExp(
            `"[^"]*"\\s*,?\\s*${this.escapeRegExp(
              name
            )}\\s+said,?\\s+(she|her)\\b`,
            "i"
          )
        )
      ) {
        femaleScore += 2;
      }
    }

    const maleArchetypes = [
      `\\b${this.escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b`,
      `\\b(young master|male lead|hero|protagonist|cultivator|master|patriarch)\\b[^.!?]*\\b${this.escapeRegExp(
        name
      )}\\b`
    ];

    const femaleArchetypes = [
      `\\b${this.escapeRegExp(
        name
      )}\\b[^.!?]*\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b`,
      `\\b(young miss|young lady|female lead|heroine|maiden|matriarch)\\b[^.!?]*\\b${this.escapeRegExp(
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

    // Enhanced translation error detection for East Asian novels
    // Look for common translation software error patterns
    const knownErrorPatterns = [
      // Check for machine translation errors with alternating pronouns
      {
        pattern: new RegExp(
          `\\b${this.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bhe\\b[^.!?]{0,50}\\b${this.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "machine translation alternating"
      },
      {
        pattern: new RegExp(
          `\\b${this.escapeRegExp(
            name
          )}\\b[^.!?]{0,20}\\bshe\\b[^.!?]{0,50}\\b${this.escapeRegExp(
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
          `"[^"]+", (he|his)\\b[^.!?]{0,20}\\b${this.escapeRegExp(
            name
          )}\\b[^.!?]*\\bshe\\b`,
          "i"
        ),
        dominantGender: "male",
        errorType: "dialogue-attribution error"
      },
      {
        pattern: new RegExp(
          `"[^"]+", (she|her)\\b[^.!?]{0,20}\\b${this.escapeRegExp(
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
          correction: `detected ${errorPattern.errorType} error - corrected to ${errorPattern.dominantGender}`,
          inconsistencies: pronounResult.inconsistencies
        };
      }
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
          "langjun",
          "xiansheng",
          "xiong",
          "shaoye",
          "xianzhu",
          "fuma",
          "shizun",
          "dizi",
          "men",
          "nanren",
          "xiongdi",
          "dizi",
          "shishu",
          "shibo",
          "shiye",
          "fuqin",
          "guan"
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
          "niangniang",
          "guifei",
          "gupo",
          "shitai",
          "shiniang",
          "shitai",
          "dimei",
          "nu",
          "nuren",
          "jiemei",
          "nunu",
          "niangzi",
          "niangchan"
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
          "-san",
          "ani",
          "nii"
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
          "-sama",
          "ane",
          "nee"
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

    if (!evidence) {
      const nameProximityRegex = new RegExp(
        `[^.!?]{0,50}\\b${this.escapeRegExp(name)}\\b[^.!?]{0,50}`,
        "gi"
      );
      const proximityMatches = Array.from(text.matchAll(nameProximityRegex));
      let proximityText = "";

      proximityMatches.forEach((match) => {
        proximityText += match[0] + " ";
      });

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

      if (
        !evidence &&
        (culturalOrigin === "chinese" ||
          culturalOrigin === "japanese" ||
          culturalOrigin === "korean")
      ) {
        const asianSpecificPatterns = {
          male: [
            /\bthis young master\b/i,
            /\bthis master\b/i,
            /\bthis lord\b/i,
            /\bthis prince\b/i,
            /\bthis humble one\b/i,
            /\bthis lowly one\b/i,

            /\bsenior brother\b/i,
            /\bjunior brother\b/i,
            /\bdisciple brother\b/i,
            new RegExp(`\\b${this.escapeRegExp(name)}-sama\\b`, "i"),
            new RegExp(`\\b${this.escapeRegExp(name)}-san\\b`, "i"),
            new RegExp(`\\b${this.escapeRegExp(name)}-kun\\b`, "i"),

            // Common positional references
            /\bhe cultivated\b/i,
            /\bhis cultivation\b/i,
            /\bhis martial arts\b/i,
            /\bhis sword\b/i,
            /\bhis qi\b/i,
            /\bhis dao\b/i,
            /\bhis blade\b/i
          ],
          female: [
            /\bthis young lady\b/i,
            /\bthis miss\b/i,
            /\bthis princess\b/i,
            /\bthis maiden\b/i,
            /\bthis fairy\b/i,
            /\bthis concubine\b/i,

            /\bsenior sister\b/i,
            /\bjunior sister\b/i,
            /\bdisciple sister\b/i,
            new RegExp(`\\b${this.escapeRegExp(name)}-chan\\b`, "i"),

            // Common positional references
            /\bher fairy\b/i,
            /\bher beauty\b/i,
            /\bher cultivation\b/i,
            /\bher slender\b/i,
            /\bher jade\b/i,
            /\bher fragrance\b/i
          ]
        };

        for (const pattern of asianSpecificPatterns.male) {
          if (pattern.test(proximityText)) {
            maleScore += 2;
            evidence = `cultural pattern: ${pattern.toString().slice(1, -2)}`;
            break;
          }
        }

        if (!evidence) {
          for (const pattern of asianSpecificPatterns.female) {
            if (pattern.test(proximityText)) {
              femaleScore += 2;
              evidence = `cultural pattern: ${pattern.toString().slice(1, -2)}`;
              break;
            }
          }
        }
      }
    }

    if (
      !evidence &&
      (culturalOrigin === "chinese" ||
        culturalOrigin === "japanese" ||
        culturalOrigin === "korean")
    ) {
      const dialogPatterns = [new RegExp(`"[^"]*\\b(${name})\\b[^"]*"`, "gi")];

      let dialogText = "";
      for (const pattern of dialogPatterns) {
        const matches = text.match(pattern) || [];
        matches.forEach((match) => {
          dialogText += match + " ";
        });
      }

      if (dialogText) {
        const maleAddressTerms = {
          chinese: [
            "gege",
            "dage",
            "xiongzhang",
            "shixiong",
            "shidi",
            "shizun"
          ],
          japanese: [
            "oniisan",
            "nii-san",
            "onii-chan",
            "aniki",
            "otouto",
            "kun"
          ],
          korean: ["oppa", "hyung", "orabeoni"]
        };

        const femaleAddressTerms = {
          chinese: ["jiejie", "dajie", "meimei", "shijie", "shimei", "guniang"],
          japanese: [
            "oneesan",
            "nee-san",
            "onee-chan",
            "aneue",
            "imouto",
            "chan"
          ],
          korean: ["unni", "eonni", "nuna", "agassi"]
        };

        const addressTerms = {
          male: maleAddressTerms[culturalOrigin] || [],
          female: femaleAddressTerms[culturalOrigin] || []
        };

        for (const term of addressTerms.male) {
          if (dialogText.match(new RegExp(`"[^"]*\\b${term}\\b[^"]*"`, "i"))) {
            maleScore += 2;
            evidence = `addressed as '${term}' in dialog`;
            break;
          }
        }

        if (!evidence) {
          for (const term of addressTerms.female) {
            if (
              dialogText.match(new RegExp(`"[^"]*\\b${term}\\b[^"]*"`, "i"))
            ) {
              femaleScore += 2;
              evidence = `addressed as '${term}' in dialog`;
              break;
            }
          }
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

    // Define appearance indicators
    const maleAppearance = [
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

    const femaleAppearance = [
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

    // Check for descriptive appearanceas
    if (appearanceText) {
      // Check for male appearance descriptors
      for (const indicator of maleAppearance) {
        if (appearanceText.toLowerCase().includes(indicator)) {
          maleScore += 2;
          evidence = indicator;
          break;
        }
      }

      // Check for female appearance descriptors
      if (!evidence) {
        for (const indicator of femaleAppearance) {
          if (appearanceText.toLowerCase().includes(indicator)) {
            femaleScore += 2;
            evidence = indicator;
            break;
          }
        }
      }
    }

    // If no specific appearance description is found, search more broadly for proximity descriptions
    if (!evidence) {
      const proximityRegex = new RegExp(
        `[^.!?]{0,30}\\b${this.escapeRegExp(name)}\\b[^.!?]{0,100}`,
        "gi"
      );
      const proximityMatches = Array.from(text.matchAll(proximityRegex));
      let proximityText = "";

      proximityMatches.forEach((match) => {
        proximityText += match[0] + " ";
      });

      // Cultural specific appearance patterns
      const culturalAppearance = {
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

      // First check general patterns
      for (const indicator of maleAppearance) {
        if (proximityText.toLowerCase().includes(indicator)) {
          maleScore += 1;
          evidence = indicator;
          break;
        }
      }

      if (!evidence) {
        for (const indicator of femaleAppearance) {
          if (proximityText.toLowerCase().includes(indicator)) {
            femaleScore += 1;
            evidence = indicator;
            break;
          }
        }
      }

      // Then check cultural specific patterns
      if (!evidence) {
        for (const culture in culturalAppearance) {
          for (const indicator of culturalAppearance[culture].male) {
            if (proximityText.toLowerCase().includes(indicator)) {
              maleScore += 1;
              evidence = `${culture} style: ${indicator}`;
              break;
            }
          }

          if (evidence) break;

          for (const indicator of culturalAppearance[culture].female) {
            if (proximityText.toLowerCase().includes(indicator)) {
              femaleScore += 1;
              evidence = `${culture} style: ${indicator}`;
              break;
            }
          }

          if (evidence) break;
        }
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
