// novel-style-analyzer.js
/**
 * Analyzes novel style and genre from text
 */
class NovelStyleAnalyzer {
    /**
     * Analyze novel style and genre from text
     * @param {string} text - Text to analyze
     * @return {object} - Novel style information
     */
    analyzeNovelStyle(text) {
      let style = "standard narrative";
      let tone = "neutral";
      let confidence = 0;
  
      const sample = text.substring(0, 5000);
      const genrePatterns = this.#getGenrePatterns();
  
      const genreScores = {};
      for (const [genre, patterns] of Object.entries(genrePatterns)) {
        let score = 0;
  
        if (patterns.regex.test(sample)) {
          score += 3;
        }
  
        for (const keyword of patterns.keywords) {
          const regex = new RegExp("\\b" + keyword + "\\b", "gi");
          const matches = sample.match(regex);
          if (matches) {
            score += matches.length;
          }
        }
  
        genreScores[genre] = score;
      }
  
      let maxScore = 0;
      for (const [genre, score] of Object.entries(genreScores)) {
        if (score > maxScore) {
          maxScore = score;
          style = genre;
          confidence = Math.min(score / 10, 1);
        }
      }
  
      // Check for narrative perspective
      style = this.#analyzeNarrativePerspective(sample, style);
  
      // Check for tense
      style = this.#analyzeNarrativeTense(sample, style);
  
      // Check for dialogue density
      style = this.#analyzeDialogueDensity(sample, style);
  
      // Analyze tone
      tone = this.#analyzeTone(sample);
  
      // Check for sentence characteristics
      tone = this.#analyzeSentenceCharacteristics(sample, tone);
  
      // Check for emphasis patterns
      tone = this.#analyzeEmphasisPatterns(sample, tone);
  
      return {
        style,
        tone,
        confidence,
        analyzed: true
      };
    }
  
    /**
     * Get genre detection patterns
     * @return {object} - Genre patterns
     * @private
     */
    #getGenrePatterns() {
      return {
        "eastern cultivation": {
          keywords: [
            "cultivation", "qi", "dao", "spiritual energy", "sect", "immortal", "meridian",
            "pill", "disciple", "master", "senior", "junior", "cultivation base",
            "core formation", "nascent soul", "tribulation", "heavenly", "divine",
            "sacred", "foundation establishment", "realm", "martial", "profound", "inner", "outer"
          ],
          regex: /\b(cultivation|qi|dao|meridians?|spiritual\s+energy|inner\s+force|outer\s+force|profound\s+strength)\b/i
        },
        "western fantasy": {
          keywords: [
            "spell", "magic", "wizard", "sorcerer", "witch", "mage", "enchant", "potion",
            "wand", "staff", "elf", "dwarf", "orc", "goblin", "dragon", "quest",
            "kingdom", "castle", "knight", "sword", "shield", "bow", "arrow"
          ],
          regex: /\b(wizard|witch|mage|spell|magic|wand|elf|dwarf|orc|goblin)\b/i
        },
        "science fiction": {
          keywords: [
            "ship", "space", "planet", "star", "galaxy", "universe", "tech", "robot",
            "android", "AI", "artificial", "laser", "beam", "energy", "system",
            "future", "captain", "officer", "commander", "fleet", "alien"
          ],
          regex: /\b(spacecraft|starship|planet|galaxy|universe|robot|android|technology|system|alien)\b/i
        },
        "historical fiction": {
          keywords: [
            "lord", "lady", "majesty", "highness", "count", "countess", "duke",
            "duchess", "baron", "baroness", "sir", "madam", "century", "kingdom", "empire"
          ],
          regex: /\b(lord|lady|majesty|highness|count|countess|duke|duchess|century)\b/i
        },
        romance: {
          keywords: [
            "love", "heart", "kiss", "embrace", "caress", "passion", "desire",
            "romantic", "beauty", "handsome", "relationship", "marriage", "wedding"
          ],
          regex: /\b(love|heart|kiss|embrace|passion|desire|romance|romantic)\b/i
        },
        mystery: {
          keywords: [
            "detective", "investigate", "murder", "crime", "suspect", "evidence",
            "clue", "mystery", "suspicion", "case", "solve", "witness"
          ],
          regex: /\b(detective|investigate|murder|crime|suspect|evidence|clue|mystery)\b/i
        },
        horror: {
          keywords: [
            "fear", "terror", "horror", "scream", "blood", "dark", "shadow",
            "evil", "monster", "ghost", "spirit", "haunt", "nightmare", "dread"
          ],
          regex: /\b(fear|terror|horror|scream|blood|dark|shadow|evil|monster|ghost)\b/i
        },
        thriller: {
          keywords: [
            "chase", "escape", "run", "hide", "danger", "threat", "risk",
            "survival", "enemy", "target", "weapon", "attack", "defend", "agent", "mission"
          ],
          regex: /\b(chase|escape|danger|threat|risk|survival|enemy|weapon|attack)\b/i
        }
      };
    }
  
    /**
     * Analyze narrative perspective
     * @param {string} sample - Text sample
     * @param {string} style - Current style
     * @return {string} - Updated style
     * @private
     */
    #analyzeNarrativePerspective(sample, style) {
      const firstPersonIndicators = [
        "I said", "I replied", "I asked", "I thought", "I felt", "I saw"
      ];
  
      const firstPersonCount = firstPersonIndicators.reduce(
        (count, indicator) =>
          count + (sample.match(new RegExp("\\b" + indicator + "\\b", "gi")) || []).length,
        0
      );
  
      if (firstPersonCount > 5) {
        return style + " (first-person)";
      }
  
      return style;
    }
  
    /**
     * Analyze narrative tense
     * @param {string} sample - Text sample
     * @param {string} style - Current style
     * @return {string} - Updated style
     * @private
     */
    #analyzeNarrativeTense(sample, style) {
      const presentTenseIndicators = [
        /\bI say\b/, /\bhe says\b/, /\bshe says\b/, /\bthey say\b/,
        /\bI am\b/, /\bhe is\b/, /\bshe is\b/, /\bthey are\b/
      ];
  
      const presentTenseCount = presentTenseIndicators.reduce(
        (count, regex) => count + (sample.match(regex) || []).length,
        0
      );
  
      if (presentTenseCount > 5) {
        return style + " (present tense)";
      }
  
      return style;
    }
  
    /**
     * Analyze dialogue density
     * @param {string} sample - Text sample
     * @param {string} style - Current style
     * @return {string} - Updated style
     * @private
     */
    #analyzeDialogueDensity(sample, style) {
      const dialogueMarks = (sample.match(/["']/g) || []).length;
      const sentenceCount = (sample.match(/[.!?]/g) || []).length;
  
      if (dialogueMarks > sentenceCount * 0.4) {
        return style + " (dialogue-heavy)";
      } else if (dialogueMarks < sentenceCount * 0.2) {
        return style + " (descriptive)";
      }
  
      return style;
    }
  
    /**
     * Analyze tone patterns
     * @param {string} sample - Text sample
     * @return {string} - Detected tone
     * @private
     */
    #analyzeTone(sample) {
      const tonePatterns = this.#getTonePatterns();
  
      const toneScores = {};
      for (const [toneName, patterns] of Object.entries(tonePatterns)) {
        let score = 0;
  
        for (const pattern of patterns) {
          const matches = sample.match(pattern) || [];
          score += matches.length;
        }
  
        toneScores[toneName] = score;
      }
  
      let maxScore = 0;
      let tone = "neutral";
      for (const [toneName, score] of Object.entries(toneScores)) {
        if (score > maxScore) {
          maxScore = score;
          tone = toneName;
        }
      }
  
      return tone;
    }
  
    /**
     * Get tone detection patterns
     * @return {object} - Tone patterns
     * @private
     */
    #getTonePatterns() {
      return {
        formal: [
          /\b(therefore|thus|hence|accordingly|consequently|nevertheless|moreover|furthermore)\b/i,
          /\b(request|require|inform|advise|state|declare|announce|proclaim)\b/i
        ],
        casual: [
          /\b(yeah|nah|hey|cool|awesome|okay|ok|yep|nope|gonna|wanna|gotta)\b/i,
          /\b(like|so|pretty much|kind of|sort of|you know|I mean)\b/i
        ],
        humorous: [
          /\b(laugh|joke|funny|hilarious|amused|grin|chuckle|snort|giggle)\b/i,
          /\b(ridiculous|absurd|silly|comical|witty|sarcastic|ironic)\b/i
        ],
        dark: [
          /\b(dark|grim|bleak|dismal|gloomy|somber|dreary|dire|grave)\b/i,
          /\b(death|dead|kill|murder|blood|pain|suffer|torture|agony)\b/i
        ],
        inspirational: [
          /\b(hope|dream|inspire|believe|faith|courage|strength|persevere)\b/i,
          /\b(overcome|achieve|success|triumph|victory|determination|spirit)\b/i
        ],
        melancholic: [
          /\b(sad|sorrow|grief|loss|regret|despair|melancholy|longing)\b/i,
          /\b(tearful|weep|cry|mourn|miss|lonely|alone|abandoned)\b/i
        ],
        adventurous: [
          /\b(adventure|journey|quest|explore|discover|seek|find|brave)\b/i,
          /\b(danger|risk|peril|challenge|obstacle|overcome|triumph)\b/i
        ],
        romantic: [
          /\b(love|passion|desire|yearn|adore|cherish|embrace|caress)\b/i,
          /\b(heart|soul|spirit|emotion|feeling|intimate|tender|gentle)\b/i
        ],
        technical: [
          /\b(analyze|calculate|measure|determine|evaluate|assess|process)\b/i,
          /\b(system|function|mechanism|procedure|operation|component|element)\b/i
        ]
      };
    }

    /**
   * Analyze sentence characteristics
   * @param {string} sample - Text sample
   * @param {string} tone - Current tone
   * @return {string} - Updated tone
   * @private
   */
  #analyzeSentenceCharacteristics(sample, tone) {
    const sentences = sample.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 0) {
      const avgSentenceLength = sample.length / sentences.length;

      if (avgSentenceLength < 50) {
        if (["dark", "adventurous", "technical"].includes(tone)) {
          return "tense " + tone;
        }
      } else if (avgSentenceLength > 100) {
        return "elaborate " + tone;
      }
    }

    return tone;
  }

  /**
   * Analyze emphasis patterns
   * @param {string} sample - Text sample
   * @param {string} tone - Current tone
   * @return {string} - Updated tone
   * @private
   */
  #analyzeEmphasisPatterns(sample, tone) {
    const allCapsWords = sample.match(/\b[A-Z]{2,}\b/g) || [];
    let newTone = tone;
    if (allCapsWords.length > 5) {
      newTone = newTone + " with emphasis";
    }

    const ellipses = (sample.match(/\.\.\./g) || []).length;
    const exclamations = (sample.match(/!/g) || []).length;

    if (ellipses > 10) {
      newTone = newTone + " with pauses";
    }

    if (exclamations > 10) {
      newTone = newTone + " with intensity";
    }

    return newTone;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelStyleAnalyzer;
} else {
  window.NovelStyleAnalyzer = NovelStyleAnalyzer;
}