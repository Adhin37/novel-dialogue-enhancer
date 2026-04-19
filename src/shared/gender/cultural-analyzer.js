// culturalAnalyzer.js
/**
 * Specialized module for cultural origin detection and analysis
 * Identifies cultural contexts and specific cultural indicators
 */
import { BaseAnalyzer } from "./base-analyzer.js";
import { StringUtils } from "../utils/string-utils.js";
import { CULTURAL_GENDER_TERMS } from "./cultural-terms.js";

export class CulturalAnalyzer extends BaseAnalyzer {
  static #NAME_PATTERNS = {
    chinese: [
      /^(?:Wang|Li|Zhang|Liu|Chen|Yang|Zhao|Huang|Zhou|Wu|Xu|Sun|Hu|Zhu|Gao|Lin|He|Guo|Ma|Luo|Liang|Song|Zheng|Xie|Han|Tang|Feng|Yu|Dong|Xiao|Cao|Deng|Xu|Cheng|Wei|Shen|Luo|Jiang|Ye|Shi|Yan)/i,
      /^(?:Sect Master|Young Master|Elder|Ancestor|Grandmaster|Immortal|Dao Lord|Sovereign|Venerable|Imperial|Heavenly|Divine|Martial)/i,
      /^(?:Xiao|Lao|Da|Er|San|Si|Wu|Liu|Qi|Ba|Jiu|Shi)/i,
      /(?:Xiang|Tian|Jiang|Pan|Wei|Ye|Yuan|Lu|Deng|Yao|Peng|Cao|Zou|Xiong|Qian|Dai|Fu|Ding|Jiang)/i
    ],
    japanese: [
      /^(?:Sato|Suzuki|Takahashi|Tanaka|Watanabe|Ito|Yamamoto|Nakamura|Kobayashi|Kato|Yoshida|Yamada|Sasaki|Yamaguchi|Matsumoto|Inoue|Kimura|Hayashi|Shimizu|Yamazaki|Mori|Abe|Ikeda|Hashimoto|Ishikawa)/i,
      /(?:Akira|Yuki|Haruto|Soma|Yuma|Ren|Haru|Sora|Haruki|Ayumu|Riku|Taiyo|Hinata|Yamato|Minato|Yuto|Sota|Yui|Hina|Koharu|Mei|Mio|Rin|Miyu|Kokona|Hana|Yuna|Sakura|Saki|Ichika|Akari|Himari)/i,
      /(?:-san|-kun|-chan|-sama|-sensei|-senpai|-dono)$/i
    ],
    korean: [
      /^(?:Kim|Lee|Park|Choi|Jung|Kang|Cho|Yoon|Jang|Lim|Han|Oh|Seo|Shin|Kwon|Hwang|Ahn|Song|Yoo|Hong|Jeon|Moon|Baek|Chung|Bae|Ryu)/i,
      /(?:Min|Seung|Hyun|Sung|Young|Jin|Soo|Jun|Ji|Hye|Joon|Woo|Dong|Kyung|Jae|Eun|Yong|In|Ho|Chang|Hee|Hyung|Cheol|Kwang|Tae|Yeon)/i
    ]
  };

  static #CONTEXT_CLUES = {
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

  static #CULTURAL_INDICATORS = CULTURAL_GENDER_TERMS;

  static #CHINESE_PATTERN = /\b(dao|qi|cultivation|immortal|sect|martial arts|dantian|meridian|heaven|earth|profound|mystic|divine|spiritual energy|foundation establishment|core formation|nascent soul|spirit stone|pill|elixir|refining|alchemy|array|formation|tribulation|breakthrough|realm|stage|layer|level|peak|bottleneck|comprehension|enlightenment|technique|skill|art|way|path|law|rule|will|intent|aura|pressure|bloodline|physique|constitution|talent|genius|prodigy|waste|trash|cripple|mortal|cultivator|practitioner|expert|master|grandmaster|ancestor|elder|disciple|junior|senior|fellow|dao friend|brother|sister)\b/i;

  static #JAPANESE_PATTERN = /\b(senpai|kohai|sensei|sama|kun|chan|san|dono|baka|sugoi|kawaii|tsundere|yandere|otaku|anime|manga|ninja|samurai|katana|sakura|cherry blossom|shrine|temple|kami|yokai|oni|festival|matsuri|bento|sushi|ramen|onigiri|mochi|dojo|sensei|shihan|bushido|honor|duty|loyalty|family|clan|house|bloodline)\b/i;

  static #KOREAN_PATTERN = /\b(oppa|unni|hyung|dongsaeng|sunbae|hoobae|aigoo|daebak|kimchi|bulgogi|bibimbap|soju|makgeolli|hanbok|taekwondo|hallyu|k-pop|drama|chaebol|conglomerate|company|corporation|heir|successor|family|bloodline|honor|respect|hierarchy|status)\b/i;

  // Genre-level vocabulary unique to East Asian fantasy writing — scanned over full chapter text.
  // These appear even when the surface setting is medieval/western (isekai, Korean manhwa, xianxia).
  static #EASTERN_FANTASY_MARKERS = {
    chinese: /\b(cultivation|dantian|meridian|spirit\s*stone|pill\s*(?:refin|concoct)|wuxia|xianxia|nascent\s*soul|foundation\s*(?:establishment|building)|core\s*formation|dao\s*(?:heart|law|path|comprehension)|immortal\s*(?:realm|sect|path)|sect\s*(?:master|disciple|elder)|body\s*cultivation|sword\s*(?:cultivation|dao|intent|qi)|alchemy\s*(?:furnace|pill)|qi\s*(?:refin|cultivat|gather)|tribulation\s*(?:lightning|thunder)|demonic\s*cultivat)\b/gi,
    korean: /\b(regression|hunter(?:'s)?\s*(?:guild|rank|association)|awakened?\s*(?:human|ability|power|hunter)|S-rank|A-rank|B-rank|gate(?:s)?\s*(?:open|appear|form|crack)|dungeon\s*(?:break|raid|clear|hunter)|chaebol|manhwa|webtoon|returner|regresser|conglomerate\s*heir|system\s*(?:window|message|notification|alert))\b/gi,
    japanese: /\b(isekai|reincarnated?\s*(?:as|into|in)\s*a|transferred?\s*to\s*(?:another|a\s*different)\s*world|otome\s*(?:game|novel)|capture\s*target|demon\s*lord|hero(?:'s)?\s*party|job\s*class|divine\s*protection|cheat\s*(?:skill|ability)|death\s*march|dungeon\s*master\s*(?:floor|room))\b/gi,
    // Generic RPG-panel vocab shared across Eastern fantasy — only meaningful when paired with culture-specific signals
    generic: /\b(status\s*(?:window|screen|panel)|skill\s*(?:leveled?\s*up|points?|tree|window)|HP\b|MP\b|EXP\b|level(?:ed)?\s*up|exp\s*(?:gained?|points?)|achievement\s*(?:unlock|complet)|boss\s*(?:monster|floor|room)|floor\s*boss|quest\s*(?:complet|accept|fail|log)|respawn\s*point|game\s*(?:over|system|world))\b/gi,
  };

  /**
   * Creates a new CulturalAnalyzer instance
   */
  constructor() {
    super();
    this.characterPatterns = {
      chinese: /[\u4E00-\u9FFF]/,
      japanese: /[\u3040-\u309F\u30A0-\u30FF]/,
      korean:
        /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uD7B0-\uD7FF]/
    };
  }

  /**
   * Simplified cultural origin detection focused on non-western patterns
   * @param {string} name - The name to analyze
   * @param {string} text - Surrounding text context
   * @return {string} - Cultural origin (western, chinese, japanese, korean)
   */
  detectNameCulturalOrigin(name, text) {
    // Priority 1: Check for obvious character usage
    if (this.characterPatterns.chinese.test(name)) {
      return "chinese";
    }
    if (this.characterPatterns.japanese.test(name)) {
      return "japanese";
    }
    if (this.characterPatterns.korean.test(name)) {
      return "korean";
    }

    // Priority 2: Name pattern recognition (non-western only)
    const nameScores = { chinese: 0, japanese: 0, korean: 0 };

    for (const [culture, patterns] of Object.entries(CulturalAnalyzer.#NAME_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          nameScores[culture] += 2;
        }
      }
    }

    // Priority 3: Context analysis
    const contextScores = { chinese: 0, japanese: 0, korean: 0 };

    const nameProximityText = this._getProximityText(name, text, 200);
    const combinedText = nameProximityText.join(" ");

    for (const [culture, patterns] of Object.entries(CulturalAnalyzer.#CONTEXT_CLUES)) {
      for (const pattern of patterns) {
        const matches = combinedText.match(pattern) || [];
        contextScores[culture] += matches.length * 2;
      }
    }

    // Priority 4: Linguistic patterns
    const linguisticScores = this.#analyzeLinguisticPatterns(combinedText);

    // Combine all scores
    const finalScores = {};
    for (const culture of ["chinese", "japanese", "korean"]) {
      finalScores[culture] =
        nameScores[culture] * 3 +
        contextScores[culture] * 2 +
        linguisticScores[culture] * 1;
    }

    // Find the dominant non-western culture
    let dominantCulture = "western"; // Default fallback
    let maxScore = 0;

    for (const culture of ["chinese", "japanese", "korean"]) {
      if (finalScores[culture] > maxScore) {
        dominantCulture = culture;
        maxScore = finalScores[culture];
      }
    }

    // Priority 5: Eastern-authored fantasy genre detection.
    // Scans the full chapter text for genre-level vocabulary (cultivation, isekai, regression/hunter)
    // that persists even when the surface setting is medieval/western.
    // This handles Korean manhwa, Japanese isekai, and Chinese xianxia set in fantasy worlds.
    if (maxScore < 2) {
      const genreBoosts = this.#detectEasternFantasyMarkers(text);
      for (const culture of ["chinese", "japanese", "korean"]) {
        finalScores[culture] += genreBoosts[culture];
      }
      maxScore = 0;
      dominantCulture = "western";
      for (const culture of ["chinese", "japanese", "korean"]) {
        if (finalScores[culture] > maxScore) {
          dominantCulture = culture;
          maxScore = finalScores[culture];
        }
      }
    }

    // Return result with confidence threshold for non-western
    if (maxScore >= 2) {
      return dominantCulture;
    }

    return "western";
  }

  /**
   * Analyze linguistic patterns for non-western cultures only
   * @param {string} text - Text to analyze
   * @return {object} - Linguistic pattern scores
   * @private
   */
  #analyzeLinguisticPatterns(text) {
    const scores = { chinese: 0, japanese: 0, korean: 0 };
    if (CulturalAnalyzer.#CHINESE_PATTERN.test(text)) scores.chinese += 3;
    if (CulturalAnalyzer.#JAPANESE_PATTERN.test(text)) scores.japanese += 3;
    if (CulturalAnalyzer.#KOREAN_PATTERN.test(text)) scores.korean += 3;
    return scores;
  }

  /**
   * Check for cultural-specific character indicators
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Gender scores with evidence
   */
  checkCulturalSpecificIndicators(name, text, culturalOrigin) {
    const exactIndicators = this.#getExactIndicators(name);
    const specificCultureIndicators =
      exactIndicators[culturalOrigin] || exactIndicators.western;

    // Check for exact indicators first
    for (const indicator of specificCultureIndicators.male) {
      if (text.toLowerCase().includes(indicator.toLowerCase())) {
        return this._createResult(3, 0, indicator);
      }
    }

    for (const indicator of specificCultureIndicators.female) {
      if (text.toLowerCase().includes(indicator.toLowerCase())) {
        return this._createResult(0, 3, indicator);
      }
    }

    // Get proximity text using base class method
    const proximityText = this._getProximityText(name, text, 50);
    const combinedProximityText = proximityText.join(" ");

    // Check cultural specific indicators in proximity
    const cultureSpecific =
      CulturalAnalyzer.#CULTURAL_INDICATORS[culturalOrigin] ||
      CulturalAnalyzer.#CULTURAL_INDICATORS.western ||
      { male: [], female: [] };

    const proximityResult = this._analyzePatterns(
      [combinedProximityText],
      cultureSpecific.male,
      cultureSpecific.female
    );

    if (proximityResult.evidence) {
      return this._createResult(
        proximityResult.maleScore,
        proximityResult.femaleScore,
        `near term '${proximityResult.evidence}'`
      );
    }

    // Check Asian specific patterns for East Asian cultures
    if (["chinese", "japanese", "korean"].includes(culturalOrigin)) {
      const asianSpecificPatterns = this.#getAsianSpecificPatterns(name);

      for (const pattern of asianSpecificPatterns.male) {
        if (pattern.test(combinedProximityText)) {
          return this._createResult(
            2,
            0,
            `cultural pattern: ${pattern.toString().slice(1, -2)}`
          );
        }
      }

      for (const pattern of asianSpecificPatterns.female) {
        if (pattern.test(combinedProximityText)) {
          return this._createResult(
            0,
            2,
            `cultural pattern: ${pattern.toString().slice(1, -2)}`
          );
        }
      }

      // Check dialogue address terms for East Asian cultures
      const dialogResult = this.#checkDialogueAddressTerms(
        name,
        text,
        culturalOrigin
      );
      if (dialogResult.evidence) {
        return this._createResult(
          dialogResult.maleScore,
          dialogResult.femaleScore,
          dialogResult.evidence
        );
      }
    }

    return this._createResult(0, 0, null);
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
        new RegExp(`\\b${StringUtils.escapeRegExp(name)}-sama\\b`, "i"),
        new RegExp(`\\b${StringUtils.escapeRegExp(name)}-san\\b`, "i"),
        new RegExp(`\\b${StringUtils.escapeRegExp(name)}-kun\\b`, "i"),

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
        new RegExp(`\\b${StringUtils.escapeRegExp(name)}-chan\\b`, "i"),

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
   * Scan full chapter text for East Asian fantasy genre vocabulary.
   * Detects Eastern-authored stories even when the surface setting uses medieval/western trappings.
   * Returns per-culture score boosts; generic RPG-panel vocabulary only amplifies existing signals.
   * @param {string} text - Full chapter text
   * @return {object} - { chinese, japanese, korean } boost values
   * @private
   */
  #detectEasternFantasyMarkers(text) {
    const boosts = { chinese: 0, japanese: 0, korean: 0 };
    const cap = 6;

    for (const culture of ["chinese", "japanese", "korean"]) {
      const pattern = CulturalAnalyzer.#EASTERN_FANTASY_MARKERS[culture];
      pattern.lastIndex = 0;
      const count = (text.match(pattern) || []).length;
      boosts[culture] = Math.min(count * 2, cap);
    }

    // Generic RPG-panel markers (status window, HP, level up…) are not culture-specific alone,
    // but when any culture-specific marker is already present they strengthen that signal.
    const gp = CulturalAnalyzer.#EASTERN_FANTASY_MARKERS.generic;
    gp.lastIndex = 0;
    const genericCount = (text.match(gp) || []).length;
    if (genericCount > 0) {
      const genericBoost = Math.min(genericCount, 2);
      for (const culture of ["chinese", "japanese", "korean"]) {
        if (boosts[culture] > 0) {
          boosts[culture] = Math.min(boosts[culture] + genericBoost, cap);
        }
      }
    }

    return boosts;
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

    const dialogPattern = new RegExp(`"[^"]*\\b(${name})\\b[^"]*"`, "gi");
    const matches = text.match(dialogPattern) || [];
    const dialogText = matches.join(" ");

    if (dialogText) {
      const maleAddressTerms = {
        chinese: ["gege", "dage", "xiongzhang", "shixiong", "shidi", "shizun"],
        japanese: ["oniisan", "nii-san", "onii-chan", "aniki", "otouto", "kun"],
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
          if (dialogText.match(new RegExp(`"[^"]*\\b${term}\\b[^"]*"`, "i"))) {
            femaleScore += 2;
            evidence = `addressed as '${term}' in dialog`;
            break;
          }
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }
}
