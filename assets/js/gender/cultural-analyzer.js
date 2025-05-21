// culturalAnalyzer.js
/**
 * Specialized module for cultural origin detection and analysis
 * Identifies cultural contexts and specific cultural indicators
 */
class CulturalAnalyzer {
  constructor() {
    // Common character patterns in different languages
    this.characterPatterns = {
      chinese: /[\u4E00-\u9FFF]/,
      japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
      korean: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/
    };
  }

  /**
   * Detect the likely cultural origin of a name
   * @param {string} name - The name to analyze
   * @param {string} text - Surrounding text context
   * @return {string} - Cultural origin (western, chinese, japanese, korean)
   */
  detectNameCulturalOrigin(name, text) {
    // Check for obvious character usage first
    if (this.characterPatterns.chinese.test(name)) {
      return "chinese";
    }
    if (this.characterPatterns.japanese.test(name)) {
      return "japanese";
    }
    if (this.characterPatterns.korean.test(name)) {
      return "korean";
    }

    // Enhanced name pattern recognition for romanized East Asian names
    const namePatterns = this.#getNamePatterns();
    
    for (const pattern of namePatterns.chinese) {
      if (pattern.test(name)) {
        return "chinese";
      }
    }

    for (const pattern of namePatterns.japanese) {
      if (pattern.test(name)) {
        return "japanese";
      }
    }

    for (const pattern of namePatterns.korean) {
      if (pattern.test(name)) {
        return "korean";
      }
    }

    // Check context for cultural indicators when name pattern doesn't give a clear result
    const contextClues = this.#getContextClues();
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
      return dominantCulture;
    }

    // Default to western when no strong indicators exist
    return "western";
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

    const culturalIndicators = this.#getCulturalIndicators();

    const exactIndicators = this.#getExactIndicators(name);

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
        `[^.!?]{0,50}\\b${this.#escapeRegExp(name)}\\b[^.!?]{0,50}`,
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
          `\\b${this.#escapeRegExp(indicator)}\\b`,
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
          `\\b${this.#escapeRegExp(indicator)}\\b`,
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
        const asianSpecificPatterns = this.#getAsianSpecificPatterns(name);

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
      const dialogResult = this.#checkDialogueAddressTerms(name, text, culturalOrigin);
      if (dialogResult.evidence) {
        maleScore += dialogResult.maleScore;
        femaleScore += dialogResult.femaleScore;
        evidence = dialogResult.evidence;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Get the name patterns for different cultures
   * @return {object} - Object with name patterns for each culture
   * @private
   */
  #getNamePatterns() {
    return {
      chinese: [
        // Common Chinese surnames
        /^(?:Wang|Li|Zhang|Liu|Chen|Yang|Zhao|Huang|Zhou|Wu|Xu|Sun|Hu|Zhu|Gao|Lin|He|Guo|Ma|Luo|Liang|Song|Zheng|Xie|Han|Tang|Feng|Yu|Dong|Xiao|Cao|Deng|Xu|Cheng|Wei|Shen|Luo|Jiang|Ye|Shi|Yan)/i,
        // Common cultivation novel prefixes
        /^(?:Sect Master|Young Master|Elder|Ancestor|Grandmaster|Immortal|Dao Lord|Sovereign|Venerable|Imperial|Heavenly|Divine|Martial)/i,
        // Special prefixes common in Chinese novels
        /^(?:Xiao|Lao|Da|Er|San|Si|Wu|Liu|Qi|Ba|Jiu|Shi)/i,
        // Common name particles
        /(?:Xiang|Tian|Jiang|Pan|Wei|Ye|Yuan|Lu|Deng|Yao|Peng|Cao|Zou|Xiong|Qian|Dai|Fu|Ding|Jiang)/i
      ],
      japanese: [
        // Common Japanese surnames
        /^(?:Sato|Suzuki|Takahashi|Tanaka|Watanabe|Ito|Yamamoto|Nakamura|Kobayashi|Kato|Yoshida|Yamada|Sasaki|Yamaguchi|Matsumoto|Inoue|Kimura|Hayashi|Shimizu|Yamazaki|Mori|Abe|Ikeda|Hashimoto|Ishikawa)/i,
        // Common Japanese given names
        /(?:Akira|Yuki|Haruto|Soma|Yuma|Ren|Haru|Sora|Haruki|Ayumu|Riku|Taiyo|Hinata|Yamato|Minato|Yuto|Sota|Yui|Hina|Koharu|Mei|Mio|Rin|Miyu|Kokona|Hana|Yuna|Sakura|Saki|Ichika|Akari|Himari)/i,
        // Honorifics that identify Japanese names
        /(?:-san|-kun|-chan|-sama|-sensei|-senpai|-dono)$/i
      ],
      korean: [
        // Common Korean surnames
        /^(?:Kim|Lee|Park|Choi|Jung|Kang|Cho|Yoon|Jang|Lim|Han|Oh|Seo|Shin|Kwon|Hwang|Ahn|Song|Yoo|Hong|Jeon|Moon|Baek|Chung|Bae|Ryu)/i,
        // Common Korean name components
        /(?:Min|Seung|Hyun|Sung|Young|Jin|Soo|Jun|Ji|Hye|Joon|Woo|Dong|Kyung|Jae|Eun|Yong|In|Ho|Chang|Hee|Hyung|Cheol|Kwang|Tae|Yeon)/i
      ]
    };
  }

  /**
   * Get context clues for cultural detection
   * @return {object} - Object with cultural context patterns
   * @private
   */
  #getContextClues() {
    return {
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
  }

  /**
   * Get cultural indicators for different cultures
   * @return {object} - Object with cultural indicators
   * @private
   */
  #getCulturalIndicators() {
    return {
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
  }

  /**
   * Get exact indicators for a character
   * @param {string} name - Character name
   * @return {object} - Object with exact indicators
   * @private
   */
  #getExactIndicators(name) {
    return {
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
  }

  /**
   * Get Asian-specific patterns for gender detection
   * @param {string} name - Character name
   * @return {object} - Object with Asian-specific patterns
   * @private
   */
  #getAsianSpecificPatterns(name) {
    return {
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
        new RegExp(`\\b${this.#escapeRegExp(name)}-sama\\b`, "i"),
        new RegExp(`\\b${this.#escapeRegExp(name)}-san\\b`, "i"),
        new RegExp(`\\b${this.#escapeRegExp(name)}-kun\\b`, "i"),

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
        new RegExp(`\\b${this.#escapeRegExp(name)}-chan\\b`, "i"),

        // Common positional references
        /\bher fairy\b/i,
        /\bher beauty\b/i,
        /\bher cultivation\b/i,
        /\bher slender\b/i,
        /\bher jade\b/i,
        /\bher fragrance\b/i
      ]
    };
  }

  /**
   * Check dialogue for address terms
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Results with scores and evidence
   * @private
   */
  #checkDialogueAddressTerms(name, text, culturalOrigin) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;
    
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

    return { maleScore, femaleScore, evidence };
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
  module.exports = CulturalAnalyzer;
} else {
  window.CulturalAnalyzer = CulturalAnalyzer;
}