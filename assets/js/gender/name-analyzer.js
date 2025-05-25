// nameAnalyzer.js
/**
 * Specialized module for character name pattern analysis
 * Identifies titles, honorifics, and name patterns that indicate gender
 */
class NameAnalyzer {
  /**
   * Check for gendered titles and honorifics in name (non-western only)
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkTitlesAndHonorifics(name, culturalOrigin = "western") {
    // Skip analysis for western origin - no patterns defined
    if (culturalOrigin === "western") {
      return { gender: "unknown", evidence: null };
    }

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
   * Check name patterns for non-western cultures only
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender determination with evidence
   */
  checkNamePatterns(name, culturalOrigin = "western") {
    // Skip analysis for western origin
    if (culturalOrigin === "western") {
      return { gender: "unknown", evidence: null };
    }

    const firstName = name.split(" ")[0];
    const nameLower = firstName.toLowerCase();

    const femaleEndings = this.#getFemaleEndings();
    const maleEndings = this.#getMaleEndings();
    const culturalSpecificPatterns = this.#getCulturalSpecificPatterns();

    // Check specific cultural name structures
    if (culturalOrigin in culturalSpecificPatterns) {
      for (const pattern of culturalSpecificPatterns[culturalOrigin].male) {
        if (pattern.test(name)) {
          return {
            gender: "male",
            evidence: `${culturalOrigin} male name pattern`
          };
        }
      }

      for (const pattern of culturalSpecificPatterns[culturalOrigin].female) {
        if (pattern.test(name)) {
          return {
            gender: "female",
            evidence: `${culturalOrigin} female name pattern`
          };
        }
      }
    }

    // Check for culture-specific endings
    for (const ending of femaleEndings[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "female",
          evidence: `${culturalOrigin} name ending '${ending}'`
        };
      }
    }

    for (const ending of maleEndings[culturalOrigin] || []) {
      if (nameLower.endsWith(ending)) {
        return {
          gender: "male",
          evidence: `${culturalOrigin} name ending '${ending}'`
        };
      }
    }

    // Check East Asian single-character names
    if (
      ["chinese", "japanese", "korean"].includes(culturalOrigin) &&
      name.length <= 3
    ) {
      const result = this.#checkEastAsianSingleCharNames(name, culturalOrigin);
      if (result.gender !== "unknown") {
        return result;
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Check East Asian single-character names for gender patterns
   * @param {string} name - Name to check
   * @param {string} culturalOrigin - Cultural origin
   * @return {object} - Gender determination with evidence
   * @private
   */
  #checkEastAsianSingleCharNames(name, culturalOrigin) {
    const culturalSingleChars = {
      chinese: {
        male: [
          "Bo",
          "Yi",
          "Yu",
          "Lei",
          "Hao",
          "Jie",
          "Jun",
          "Wei",
          "Feng",
          "Long",
          "Peng",
          "Kun",
          "Fei",
          "Tai",
          "Hai",
          "Gang",
          "Ming",
          "Tao",
          "Cheng",
          "Qiang",
          "Bin",
          "Jian",
          "Dong",
          "Qing",
          "Kai",
          "Yong",
          "Shan"
        ],
        female: [
          "Yan",
          "Yu",
          "Xin",
          "Mei",
          "Li",
          "Jing",
          "Ying",
          "Yue",
          "Hua",
          "Qian",
          "Min",
          "Ning",
          "Ping",
          "Zhen",
          "Jiao",
          "Qiao",
          "Lian",
          "Wei",
          "Na",
          "Xia",
          "Juan",
          "Fang",
          "Lan",
          "Hong",
          "Rui",
          "Xue"
        ]
      },
      japanese: {
        male: [
          "Hiro",
          "Yuki",
          "Taka",
          "Kazu",
          "Masa",
          "Aki",
          "Dai",
          "Ken",
          "Shin",
          "Ryu",
          "Go",
          "Jin",
          "Ren",
          "Sho",
          "Taro",
          "Jiro",
          "Ichiro"
        ],
        female: [
          "Yuki",
          "Hana",
          "Miku",
          "Rin",
          "Saki",
          "Yui",
          "Kana",
          "Mao",
          "Rei",
          "Ai",
          "Emi",
          "Nana",
          "Mami",
          "Saya",
          "Moe",
          "Ami"
        ]
      },
      korean: {
        male: [
          "Min",
          "Jun",
          "Woo",
          "Jin",
          "Seung",
          "Hyun",
          "Tae",
          "Ho",
          "Joon",
          "Seok",
          "Yong",
          "Cheol",
          "Hwan",
          "Gyu",
          "Dong",
          "Chang"
        ],
        female: [
          "Min",
          "Hee",
          "Jung",
          "Yeon",
          "Ji",
          "Soo",
          "Eun",
          "Ah",
          "Young",
          "Kyung",
          "Sun",
          "Ok",
          "Ja",
          "Seon",
          "Hyun"
        ]
      }
    };

    if (!(culturalOrigin in culturalSingleChars)) {
      return { gender: "unknown", evidence: null };
    }

    const chars = culturalSingleChars[culturalOrigin];

    // Check for exact matches in male names
    if (chars.male.includes(name)) {
      return {
        gender: "male",
        evidence: `${culturalOrigin} single-character male name`
      };
    }

    // Check for exact matches in female names
    if (chars.female.includes(name)) {
      return {
        gender: "female",
        evidence: `${culturalOrigin} single-character female name`
      };
    }

    // For compound names, check if the first character matches
    if (name.length > 1) {
      const firstChar =
        name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

      if (chars.male.includes(firstChar)) {
        return {
          gender: "male",
          evidence: `${culturalOrigin} name starts with male character '${firstChar}'`
        };
      }

      if (chars.female.includes(firstChar)) {
        return {
          gender: "female",
          evidence: `${culturalOrigin} name starts with female character '${firstChar}'`
        };
      }
    }

    return { gender: "unknown", evidence: null };
  }

  /**
   * Get female name endings for non-western cultures only
   * @return {object} - Female name endings by culture
   * @private
   */
  #getFemaleEndings() {
    return {
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
   * Get male name endings for non-western cultures only
   * @return {object} - Male name endings by culture
   * @private
   */
  #getMaleEndings() {
    return {
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
   * Get male titles for non-western cultures only
   * @return {object} - Male titles by culture
   * @private
   */
  #getMaleTitles() {
    return {
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
   * Get female titles for non-western cultures only
   * @return {object} - Female titles by culture
   * @private
   */
  #getFemaleTitles() {
    return {
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
   * Get cultural-specific pattern regexes (non-western only)
   * @return {object} - Patterns by culture
   * @private
   */
  #getCulturalSpecificPatterns() {
    return {
      chinese: {
        male: [
          /^(Li|Wang|Zhang|Chen|Zhao|Yang|Liu)\s/i,
          /^(Wu|Sun|Xu|Yu|Hu)\s/i,
          /^(Young Master|Sect Master|Elder)\s/i
        ],
        female: [
          /^(Lin|Ying|Qian|Mei|Xia|Yun|Yan)\s/i,
          /^(Zhen|Hua|Xiao)\s/i,
          /^(Young Miss|Young Lady|Fairy)\s/i
        ]
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
}

if (typeof module !== "undefined") {
  module.exports = NameAnalyzer;
} else {
  window.NameAnalyzer = NameAnalyzer;
}
