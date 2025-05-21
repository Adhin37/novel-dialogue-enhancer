// nameAnalyzer.js
/**
 * Specialized module for character name pattern analysis
 * Identifies titles, honorifics, and name patterns that indicate gender
 */
class NameAnalyzer {
  /**
   * Check for gendered titles and honorifics in name
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkTitlesAndHonorifics(name, culturalOrigin = "western") {
    const maleTitles = this.#getMaleTitles();
    const femaleTitles = this.#getFemaleTitles();

    // Check all cultural title sets, but prioritize the detected culture
    const culturesToCheck = [
      culturalOrigin,
      ...Object.keys(maleTitles).filter((c) => c !== culturalOrigin)
    ];

    for (const culture of culturesToCheck) {
      // Check if name starts with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(`^${this.#escapeRegExp(title)}\\s+`, "i");
        if (titleRegex.test(name) || name === title) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(`^${this.#escapeRegExp(title)}\\s+`, "i");
        if (titleRegex.test(name) || name === title) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }

      // Check if name ends with a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(`\\s+${this.#escapeRegExp(title)}$`, "i");
        if (titleRegex.test(name)) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(`\\s+${this.#escapeRegExp(title)}$`, "i");
        if (titleRegex.test(name)) {
          return { gender: "female", evidence: `${title} (${culture})` };
        }
      }

      // Check if name contains a title
      for (const title of maleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${this.#escapeRegExp(title)}\\s+`,
          "i"
        );
        if (titleRegex.test(name)) {
          return { gender: "male", evidence: `${title} (${culture})` };
        }
      }

      for (const title of femaleTitles[culture]) {
        const titleRegex = new RegExp(
          `\\s+${this.#escapeRegExp(title)}\\s+`,
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

    const femaleEndings = this.#getFemaleEndings();
    const maleEndings = this.#getMaleEndings();

    // Additional specific patterns by culture for first name detection
    const culturalSpecificPatterns = this.#getCulturalSpecificPatterns();

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
      const result = this.#checkChineseSingleCharNames(name);
      if (result.gender !== "unknown") {
        return result;
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Get female name endings for different cultures
   * @return {object} - Female name endings by culture
   * @private
   */
  #getFemaleEndings() {
    return {
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
  }

  /**
   * Get male name endings for different cultures
   * @return {object} - Male name endings by culture
   * @private
   */
  #getMaleEndings() {
    return {
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
  }

  /**
   * Get cultural-specific pattern regexes
   * @return {object} - Patterns by culture
   * @private
   */
  #getCulturalSpecificPatterns() {
    return {
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
  }

  /**
   * Check Chinese single-character names
   * @param {string} name - Name to check
   * @return {object} - Gender determination with evidence
   * @private
   */
  #checkChineseSingleCharNames(name) {
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

    return { gender: "unknown", evidence: null };
  }

  /**
   * Get male titles for different cultures
   * @return {object} - Male titles by culture
   * @private
   */
  #getMaleTitles() {
    return {
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
  }

  /**
   * Get female titles for different cultures
   * @return {object} - Female titles by culture
   * @private
   */
  #getFemaleTitles() {
    return {
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
  module.exports = NameAnalyzer;
} else {
  window.NameAnalyzer = NameAnalyzer;
}
