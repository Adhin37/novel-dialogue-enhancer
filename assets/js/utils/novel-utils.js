// novelUtils.js
/**
 * Utility functions for novel processing
 */
class NovelUtils {
  /**
   * Creates a new NovelUtils instance
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   */
  constructor(url, title) {
    this.url = url;
    this.title = title;
    this.novelId = "";
    this.novelStyle = null;
    this.novelGenre = null;
    this.characterMap = {};
    this.chapterInfo = null;
    this.enhancedChapters = [];
    this.isCurrentChapterEnhanced = false;
    console.log("Novel Dialogue Enhancer: Novel Utils initialized");
  }

  /**
   * Update the novel identifier based on URL and title
   * @param {string} url - URL of the novel
   * @param {string} title - Title of the novel
   * @return {string} - Unique novel identifier
   */
  updateNovelId(url, title) {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    let novelName = "";

    if (title) {
      const titleParts = title.split(/[|\-–—:]/);
      if (titleParts.length > 0) {
        novelName = titleParts[0].trim();
      }
    }

    if (!novelName) {
      novelName = title.replace(/[^\w\s]/g, "").trim();
    }

    const novelId = `${domain}__${novelName}`
      .toLowerCase()
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_")
      .replace(/_(\d+)(?=\.\w+$)/, "")
      .substring(0, 50);

    if (novelId !== this.novelId) {
      console.log(`Generated novel ID: ${novelId}`);
      this.novelId = novelId;
    }
    return novelId;
  }

  /**
   * Extract novel metadata from the page
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   * @return {object} - Novel metadata
   */
  extractNovelMetadata(url, title) {
    const metadata = {
      novelId: this.novelId || this.updateNovelId(url, title),
      title: title || document.title,
      platform: this.detectPlatform(url),
      chapterInfo: this.detectChapterInfo(title, document.body.textContent),
      wordCount: this.estimateWordCount(document.body.textContent)
    };

    console.log(`Extracted metadata for novel: ${metadata.title}`);
    return metadata;
  }

  /**
   * Detect the platform hosting the novel
   * @param {string} url - URL of the novel page
   * @return {string} - Platform name
   */
  detectPlatform(url) {
    if (!url) return "unknown";

    try {
      const hostname = new URL(url).hostname.toLowerCase();

      const platformPatterns = {
        royalroad: /royalroad\.com/i,
        wuxiaworld: /wuxiaworld\.com/i,
        webnovel: /webnovel\.com/i,
        scribblehub: /scribblehub\.com/i,
        novelpub: /novelpub\.com/i,
        novelupdates: /novelupdates\.com/i,
        mtlnovel: /mtlnovel\.com/i,
        qidian: /qidian\.com/i
      };

      for (const [platform, pattern] of Object.entries(platformPatterns)) {
        if (pattern.test(hostname)) {
          return platform;
        }
      }

      return hostname.replace(/^www\./, "").split(".")[0];
    } catch (error) {
      console.error("Error detecting platform:", error);
      return "unknown";
    }
  }

  /**
   * Detect chapter information from title and content
   * @param {string} title - Page title
   * @param {string} content - Page content
   * @return {object} - Chapter information
   */
  detectChapterInfo(title, content) {
    const chapterInfo = {
      isChapter: false,
      chapterNumber: null
    };

    if (!title) return chapterInfo;

    // First check for standard chapter patterns in title
    const chapterPatterns = [
      /chapter\s+(\d+)/i,
      /ch\.?\s*(\d+)/i,
      /episode\s+(\d+)/i,
      /part\s+(\d+)/i
    ];

    for (const pattern of chapterPatterns) {
      const match = title.match(pattern);
      if (match) {
        chapterInfo.isChapter = true;
        chapterInfo.chapterNumber = parseInt(match[1], 10);
        break;
      }
    }

    // Check for chapter heading in content if not found in title
    if (!chapterInfo.isChapter && content) {
      const headingMatch = content.match(
        /\b(chapter|ch\.)\s+(\d+)[:\s]+(.*?)(\n|$)/i
      );
      if (headingMatch) {
        chapterInfo.isChapter = true;
        chapterInfo.chapterNumber = parseInt(headingMatch[2], 10);
      }
    }

    // Try to extract chapter numbers from URL if still not found
    if (!chapterInfo.isChapter || chapterInfo.chapterNumber === null) {
      try {
        const url = new URL(this.url);
        const pathParts = url.pathname.split("/");

        // Look for patterns like /chapter-123/ or /123/ in the URL
        for (const part of pathParts) {
          // Check for chapter numbers in URL segments
          const chapterNumMatch =
            part.match(/chapter[\\-_]?(\d+)/i) ||
            part.match(/ch[\\-_]?(\d+)/i) ||
            part.match(/^(\d+)$/);

          if (chapterNumMatch) {
            chapterInfo.isChapter = true;
            chapterInfo.chapterNumber = parseInt(chapterNumMatch[1], 10);
            break;
          }
        }

        // Check for query parameters like ?chapter=123
        if (!chapterInfo.isChapter && url.searchParams) {
          const chapterParam =
            url.searchParams.get("chapter") ||
            url.searchParams.get("chap") ||
            url.searchParams.get("c");

          if (chapterParam && /^\d+$/.test(chapterParam)) {
            chapterInfo.isChapter = true;
            chapterInfo.chapterNumber = parseInt(chapterParam, 10);
          }
        }
      } catch (err) {
        console.warn("Error parsing URL for chapter info:", err);
      }
    }

    return chapterInfo;
  }

  /**
   * Estimate word count of the content
   * @param {string} content - Page content
   * @return {number} - Estimated word count
   */
  estimateWordCount(content) {
    if (!content) return 0;

    const sampleContent = content.substring(0, 50000);
    const cleanContent = sampleContent.replace(/<[^>]*>/g, " ");
    const words = cleanContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (content.length > 50000) {
      return Math.round(words.length * (content.length / 50000));
    }

    return words.length;
  }

  /**
   * Analyze novel style and genre from text
   * @param {string} text - Text to analyze
   * @param {string} [novelId] - Optional novel identifier for fetching existing style info
   * @return {Promise<object>} - Novel style information
   */
  async analyzeNovelStyle(text, novelId = this.novelId) {
    // If we already have style data and explicitly analyzing the same novel, return it
    if (
      this.novelStyle &&
      this.novelStyle.analyzed &&
      novelId === this.novelId
    ) {
      return this.novelStyle;
    }

    // Try to fetch existing style from storage if novelId is provided
    if (novelId) {
      try {
        const response = await new Promise((resolve, reject) => {
          // Add a timeout to handle message port closure
          const timeoutId = setTimeout(() => {
            reject(
              new Error("Message port closed before response was received")
            );
          }, 5000);

          try {
            chrome.runtime.sendMessage(
              { action: "getNovelStyle", novelId: novelId },
              (response) => {
                clearTimeout(timeoutId);

                // Check for runtime error
                if (chrome.runtime.lastError) {
                  console.error(
                    "Error getting novel style:",
                    chrome.runtime.lastError
                  );
                  return reject(chrome.runtime.lastError);
                }

                resolve(response);
              }
            );
          } catch (err) {
            clearTimeout(timeoutId);
            reject(err);
          }
        });

        if (response && response.style) {
          if (novelId === this.novelId) {
            this.novelStyle = response.style;
          }
          return response.style;
        }
      } catch (err) {
        console.warn("Failed to fetch existing novel style:", err);
        // Return a default style instead of failing
        const defaultStyle = {
          style: "standard narrative",
          tone: "neutral",
          confidence: 0,
          analyzed: true
        };

        if (novelId === this.novelId) {
          this.novelStyle = defaultStyle;
        }

        return defaultStyle;
      }
    }

    let style = "standard narrative";
    let tone = "neutral";
    let confidence = 0;

    const sample = text.substring(0, 5000);
    const genrePatterns = {
      "eastern cultivation": {
        keywords: [
          "cultivation",
          "qi",
          "dao",
          "spiritual energy",
          "sect",
          "immortal",
          "meridian",
          "pill",
          "disciple",
          "master",
          "senior",
          "junior",
          "cultivation base",
          "core formation",
          "nascent soul",
          "tribulation",
          "heavenly",
          "divine",
          "sacred",
          "foundation establishment",
          "realm",
          "martial",
          "profound",
          "inner",
          "outer"
        ],
        regex:
          /\b(cultivation|qi|dao|meridians?|spiritual\s+energy|inner\s+force|outer\s+force|profound\s+strength)\b/i
      },
      "western fantasy": {
        keywords: [
          "spell",
          "magic",
          "wizard",
          "sorcerer",
          "witch",
          "mage",
          "enchant",
          "potion",
          "wand",
          "staff",
          "elf",
          "dwarf",
          "orc",
          "goblin",
          "dragon",
          "quest",
          "kingdom",
          "castle",
          "knight",
          "sword",
          "shield",
          "bow",
          "arrow"
        ],
        regex: /\b(wizard|witch|mage|spell|magic|wand|elf|dwarf|orc|goblin)\b/i
      },
      "science fiction": {
        keywords: [
          "ship",
          "space",
          "planet",
          "star",
          "galaxy",
          "universe",
          "tech",
          "robot",
          "android",
          "AI",
          "artificial",
          "laser",
          "beam",
          "energy",
          "system",
          "future",
          "captain",
          "officer",
          "commander",
          "fleet",
          "alien"
        ],
        regex:
          /\b(spacecraft|starship|planet|galaxy|universe|robot|android|technology|system|alien)\b/i
      },
      "historical fiction": {
        keywords: [
          "lord",
          "lady",
          "majesty",
          "highness",
          "count",
          "countess",
          "duke",
          "duchess",
          "baron",
          "baroness",
          "sir",
          "madam",
          "century",
          "kingdom",
          "empire"
        ],
        regex:
          /\b(lord|lady|majesty|highness|count|countess|duke|duchess|century)\b/i
      },
      romance: {
        keywords: [
          "love",
          "heart",
          "kiss",
          "embrace",
          "caress",
          "passion",
          "desire",
          "romantic",
          "beauty",
          "handsome",
          "relationship",
          "marriage",
          "wedding"
        ],
        regex: /\b(love|heart|kiss|embrace|passion|desire|romance|romantic)\b/i
      },
      mystery: {
        keywords: [
          "detective",
          "investigate",
          "murder",
          "crime",
          "suspect",
          "evidence",
          "clue",
          "mystery",
          "suspicion",
          "case",
          "solve",
          "witness"
        ],
        regex:
          /\b(detective|investigate|murder|crime|suspect|evidence|clue|mystery)\b/i
      },
      horror: {
        keywords: [
          "fear",
          "terror",
          "horror",
          "scream",
          "blood",
          "dark",
          "shadow",
          "evil",
          "monster",
          "ghost",
          "spirit",
          "haunt",
          "nightmare",
          "dread"
        ],
        regex:
          /\b(fear|terror|horror|scream|blood|dark|shadow|evil|monster|ghost)\b/i
      },
      thriller: {
        keywords: [
          "chase",
          "escape",
          "run",
          "hide",
          "danger",
          "threat",
          "risk",
          "survival",
          "enemy",
          "target",
          "weapon",
          "attack",
          "defend",
          "agent",
          "mission"
        ],
        regex:
          /\b(chase|escape|danger|threat|risk|survival|enemy|weapon|attack)\b/i
      }
    };

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

    const firstPersonIndicators = [
      "I said",
      "I replied",
      "I asked",
      "I thought",
      "I felt",
      "I saw"
    ];

    const firstPersonCount = firstPersonIndicators.reduce(
      (count, indicator) =>
        count +
        (sample.match(new RegExp("\\b" + indicator + "\\b", "gi")) || [])
          .length,
      0
    );

    if (firstPersonCount > 5) {
      style = style + " (first-person)";
    }

    const presentTenseIndicators = [
      /\bI say\b/,
      /\bhe says\b/,
      /\bshe says\b/,
      /\bthey say\b/,
      /\bI am\b/,
      /\bhe is\b/,
      /\bshe is\b/,
      /\bthey are\b/
    ];

    const presentTenseCount = presentTenseIndicators.reduce(
      (count, regex) => count + (sample.match(regex) || []).length,
      0
    );

    if (presentTenseCount > 5) {
      style = style + " (present tense)";
    }

    const dialogueMarks = (sample.match(/["']/g) || []).length;
    const sentenceCount = (sample.match(/[.!?]/g) || []).length;

    if (dialogueMarks > sentenceCount * 0.4) {
      style = style + " (dialogue-heavy)";
    } else if (dialogueMarks < sentenceCount * 0.2) {
      style = style + " (descriptive)";
    }

    const tonePatterns = {
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

    const toneScores = {};
    for (const [toneName, patterns] of Object.entries(tonePatterns)) {
      let score = 0;

      for (const pattern of patterns) {
        const matches = sample.match(pattern) || [];
        score += matches.length;
      }

      toneScores[toneName] = score;
    }

    maxScore = 0;
    for (const [toneName, score] of Object.entries(toneScores)) {
      if (score > maxScore) {
        maxScore = score;
        tone = toneName;
      }
    }

    const sentences = sample.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length > 0) {
      const avgSentenceLength = sample.length / sentences.length;

      if (avgSentenceLength < 50) {
        if (["dark", "adventurous", "technical"].includes(tone)) {
          tone = "tense " + tone;
        }
      } else if (avgSentenceLength > 100) {
        tone = "elaborate " + tone;
      }
    }

    const allCapsWords = sample.match(/\b[A-Z]{2,}\b/g) || [];
    if (allCapsWords.length > 5) {
      tone = tone + " with emphasis";
    }

    const ellipses = (sample.match(/\.\.\./g) || []).length;
    const exclamations = (sample.match(/!/g) || []).length;

    if (ellipses > 10) {
      tone = tone + " with pauses";
    }

    if (exclamations > 10) {
      tone = tone + " with intensity";
    }

    const styleInfo = {
      style,
      tone,
      confidence,
      analyzed: true
    };

    if (novelId) {
      try {
        chrome.runtime.sendMessage({
          action: "updateNovelStyle",
          novelId: novelId,
          style: styleInfo
        });
      } catch (err) {
        console.warn("Failed to sync novel style:", err);
      }
    }

    if (novelId === this.novelId) {
      this.novelStyle = styleInfo;
    }

    return styleInfo;
  }

  /**
   * Extract character names from text
   * @param {string} text - Text to analyze
   * @param {object} existingCharacterMap - Existing character data
   * @return {Promise<object>} - Updated character map
   */
  /**
   * Extract character names from text
   * @param {string} text - Text to analyze
   * @param {object} existingCharacterMap - Existing character data
   * @return {Promise<object>} - Updated character map
   */
  async extractCharacterNames(text, existingCharacterMap = {}) {
    console.log("Extracting character names...");
    let characterMap = { ...existingCharacterMap };
    const startCharCount = Object.keys(characterMap).length;

    // Initialize novel ID and chapter info
    this.#initializeNovelContext();

    // Check if chapter was already enhanced and get existing data
    const alreadyEnhanced = await this.#checkChapterEnhancementStatus(
      characterMap
    );
    if (alreadyEnhanced) {
      return this.characterMap;
    }

    // Process text to extract character names
    characterMap = this.#extractNamesFromText(text, characterMap);

    // Clean up and finalize character map
    characterMap = this.#finalizeCharacterMap(characterMap, startCharCount);

    return characterMap;
  }

  /**
   * Initialize novel ID and chapter info if not already set
   * @private
   */
  #initializeNovelContext() {
    if (!this.novelId) {
      this.updateNovelId(window.location.href, document.title);
    }

    // Get chapter information if not already set
    if (!this.chapterInfo) {
      this.chapterInfo = this.detectChapterInfo(
        document.title,
        document.body.textContent
      );
    }
  }

  /**
   * Check if the current chapter has already been enhanced
   * @param {object} characterMap - Current character map to update
   * @return {Promise<boolean>} - Whether the chapter was already enhanced
   * @private
   */
  async #checkChapterEnhancementStatus(characterMap) {
    if (!this.novelId) {
      return false;
    }

    const novelData = await this.#loadExistingNovelData();

    Object.assign(characterMap, novelData.characterMap || {});
    this.enhancedChapters = novelData.enhancedChapters || [];

    // Check if this chapter has already been enhanced
    if (this.chapterInfo && this.chapterInfo.chapterNumber) {
      const currentChapter = parseInt(this.chapterInfo.chapterNumber, 10);

      this.isCurrentChapterEnhanced = this.enhancedChapters.some(
        (chapter) => parseInt(chapter.chapterNumber, 10) === currentChapter
      );

      if (!this.isCurrentChapterEnhanced) {
        this.isCurrentChapterEnhanced =
          await this.#verifyChapterEnhancementStatus(currentChapter);
      }

      if (this.isCurrentChapterEnhanced) {
        console.log(
          `Chapter ${currentChapter} was previously enhanced, using existing character data`
        );
        this.characterMap = characterMap;
        return true;
      }
    }

    return false;
  }

  /**
   * Extract names from text using various patterns
   * @param {string} text - Text to analyze
   * @param {object} characterMap - Current character map to update
   * @return {object} - Updated character map
   * @private
   */
  #extractNamesFromText(text, characterMap) {
    const namePatterns = this.#getNamePatterns();
    const maxTextLength = 100000;
    const processedText = text.substring(0, maxTextLength);
    const maxMatches = 1000;
    let totalMatches = 0;

    for (const pattern of namePatterns) {
      let match;
      let patternMatches = 0;

      while (
        (match = pattern.exec(processedText)) !== null &&
        totalMatches < maxMatches &&
        patternMatches < 200
      ) {
        patternMatches++;
        totalMatches++;

        const name = this.#extractNameFromMatch(match, pattern, namePatterns);

        if (!name || name.length > 30) continue;

        const sanitizedName = this.#sanitizeText(name);
        const extractedName = this.extractCharacterName(sanitizedName);

        if (extractedName) {
          this.#addOrUpdateCharacter(characterMap, extractedName);
        }
      }
    }

    return characterMap;
  }

  /**
   * Get the regex patterns used for name extraction
   * @return {Array<RegExp>} - Array of regex patterns
   * @private
   */
  #getNamePatterns() {
    return [
      // Character said pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered|spoke|declared|answered)/g,

      // "Text" attribution pattern
      /"([^"]+)"\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered)/g,

      // Character: "Text" pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s*:\s*"([^"]+)"/g,

      // Character's possession pattern
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})'s\s+(?:face|eyes|voice|body|hand|arm|leg|hair|head|mouth|mind|heart|soul|gaze|attention)/g,

      // Title + name pattern
      /(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/g,

      // "Xiao" prefix common in Chinese novels
      /(Xiao\s[A-Z][a-z]+)/g
    ];
  }

  /**
   * Extract the name from a regex match based on the pattern
   * @param {Array} match - The regex match result
   * @param {RegExp} pattern - The pattern that produced the match
   * @param {Array<RegExp>} patterns - Array of all patterns for index comparison
   * @return {string|null} - Extracted name or null
   * @private
   */
  #extractNameFromMatch(match, pattern, patterns) {
    if (pattern === patterns[1]) {
      // "Text" attribution pattern
      return match[2];
    } else if (pattern === patterns[4]) {
      // Title + name pattern
      return match[2] ? `${match[1]} ${match[2]}` : match[1];
    } else {
      // All other patterns
      return match[1];
    }
  }

  /**
   * Add or update a character in the character map
   * @param {object} characterMap - Character map to update
   * @param {string} characterName - Character name to add/update
   * @private
   */
  #addOrUpdateCharacter(characterMap, characterName) {
    if (!characterMap[characterName]) {
      characterMap[characterName] = {
        gender: "unknown",
        appearances: 1
      };
    } else {
      characterMap[characterName].appearances =
        (characterMap[characterName].appearances || 0) + 1;
    }
  }

  /**
   * Finalize the character map by cleaning up and syncing
   * @param {object} characterMap - Character map to finalize
   * @param {number} startCharCount - Initial character count for logging
   * @return {object} - Finalized character map
   * @private
   */
  #finalizeCharacterMap(characterMap, startCharCount) {
    characterMap = this.#cleanupCharacterMap(characterMap);

    const newCharCount = Object.keys(characterMap).length - startCharCount;
    console.log(
      `Extracted ${newCharCount} new characters, total: ${
        Object.keys(characterMap).length
      }`
    );

    if (this.novelId && Object.keys(characterMap).length > 0) {
      this.syncCharacterMap(characterMap);
    }

    this.characterMap = characterMap;
    return characterMap;
  }

  /**
   * Extract a character name from text
   * @param {string} text - Text that may contain a character name
   * @return {string|null} - Extracted character name or null
   */
  extractCharacterName(text) {
    if (!text) return null;
    let _text = text;

    _text = _text.trim();

    if (_text.length > 50) {
      const namePatterns = [
        /\b(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)[\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/,
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+/
      ];

      for (const pattern of namePatterns) {
        const match = _text.match(pattern);
        if (match) {
          if (pattern === namePatterns[0]) {
            return match[0].trim();
          }
          return match[1] ? match[1].trim() : match[0].trim();
        }
      }

      return null;
    }

    const pronouns = [
      "He",
      "She",
      "It",
      "They",
      "I",
      "You",
      "We",
      "His",
      "Her",
      "Their",
      "My",
      "Your",
      "Our"
    ];

    if (pronouns.includes(_text)) {
      return null;
    }

    const nonNameWords = [
      "The",
      "Then",
      "This",
      "That",
      "These",
      "Those",
      "There",
      "Their",
      "They",
      "However",
      "Suddenly",
      "Finally",
      "Eventually",
      "Certainly",
      "Perhaps",
      "Maybe",
      "While",
      "When",
      "After",
      "Before",
      "During",
      "Within",
      "Without",
      "Also",
      "Thus",
      "Therefore",
      "Hence",
      "Besides",
      "Moreover",
      "Although",
      "Despite",
      "Since",
      "Because",
      "Nonetheless",
      "Nevertheless",
      "Regardless",
      "Consequently",
      "Accordingly",
      "Meanwhile",
      "Afterwards",
      "Beforehand",
      "In",
      "As",
      "But",
      "Or",
      "And",
      "So",
      "Yet",
      "For",
      "Nor",
      "If",
      "From",
      "At",
      "Old",
      "Well",
      "Sister"
    ];

    if (nonNameWords.includes(_text)) {
      return null;
    }

    if (
      _text.includes(" ") &&
      (/\s(is|was|are|were|have|had|do|did|can|could|will|would|should|shall|may|might|must)\s/.test(
        _text
      ) ||
        /[.!?]/.test(_text))
    ) {
      return null;
    }

    if (!/^[A-Z]/.test(_text)) {
      return null;
    }

    if (_text.endsWith(".")) {
      _text = _text.slice(0, -1).trim();
    }

    if (/^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(_text)) {
      return _text;
    }

    if (/^[A-Z][a-z]+$/.test(_text)) {
      return _text;
    }

    const titlePattern =
      /^(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const titleMatch = _text.match(titlePattern);
    if (titleMatch) {
      return _text;
    }

    if (/^Xiao\s[A-Z][a-z]+$/.test(_text)) {
      return _text;
    }

    if (
      _text.length < 20 &&
      !_text.includes(",") &&
      !_text.includes("!") &&
      !_text.includes("?")
    ) {
      return _text;
    }

    return null;
  }

  /**
   * Clean up character map by removing invalid entries
   * @param {object} characterMap - Character map to clean up
   * @return {object} - Cleaned character map
   */
  #cleanupCharacterMap(characterMap) {
    const invalidKeys = [];

    for (const name in characterMap) {
      if (name.length > 30) {
        invalidKeys.push(name);
        continue;
      }

      if (
        name.includes(". ") ||
        name.includes("! ") ||
        name.includes("? ") ||
        name.includes(", ") ||
        name.match(/\w+\s+\w+\s+\w+\s+\w+\s+\w+/)
      ) {
        invalidKeys.push(name);
        continue;
      }

      const commonNonNames = [
        "The",
        "Then",
        "This",
        "Well",
        "From",
        "At",
        "Old",
        "Sister"
      ];
      if (commonNonNames.includes(name)) {
        invalidKeys.push(name);
        continue;
      }
    }

    const cleanedMap = { ...characterMap };
    invalidKeys.forEach((key) => {
      delete cleanedMap[key];
    });

    return cleanedMap;
  }

  /**
   * Verify directly with storage if a chapter has been enhanced
   * @param {number} chapterNumber - The chapter number to verify
   * @return {Promise<boolean>} - Whether the chapter is enhanced
   */
  async #verifyChapterEnhancementStatus(chapterNumber) {
    return new Promise((resolve) => {
      if (!this.novelId || !chapterNumber) {
        resolve(false);
        return;
      }

      chrome.runtime.sendMessage(
        {
          action: "getNovelData",
          novelId: this.novelId,
          checkChapter: true,
          chapterNumber: chapterNumber
        },
        (response) => {
          if (
            chrome.runtime.lastError ||
            !response ||
            response.status !== "ok"
          ) {
            resolve(false);
            return;
          }

          resolve(response.isChapterEnhanced === true);
        }
      );
    }).catch(() => false);
  }

  /**
   * Load existing novel data from storage including character map and enhanced chapters
   * @return {Promise<object>} - Novel data including character map and enhanced chapters
   */
  async #loadExistingNovelData() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getNovelData", novelId: this.novelId },
        (response) => {
          if (
            chrome.runtime.lastError ||
            !response ||
            response.status !== "ok"
          ) {
            console.warn("Failed to fetch existing novel data");
            resolve({ characterMap: {}, enhancedChapters: [] });
            return;
          }

          const characterMap = response.characterMap || {};
          const enhancedChapters = response.enhancedChapters || [];

          console.log(
            `Retrieved ${
              Object.keys(characterMap).length
            } existing characters and ${
              enhancedChapters.length
            } enhanced chapters`
          );

          resolve({
            characterMap: characterMap,
            enhancedChapters: enhancedChapters
          });
        }
      );
    }).catch((err) => {
      console.warn("Error loading novel data:", err);
      return { characterMap: {}, enhancedChapters: [] };
    });
  }

  /**
   * Load existing character data from storage
   * @param {object} characterMap - Current character map
   * @return {Promise<object>} - Updated character map with existing data
   */
  async loadExistingCharacterData(characterMap) {
    const novelData = await this.#loadExistingNovelData();
    const existingMap = novelData.characterMap || {};

    const mergedMap = {
      ...characterMap,
      ...Object.fromEntries(
        Object.entries(existingMap).filter(([name]) => !characterMap[name])
      )
    };

    return mergedMap;
  }

  /**
   * Sync character map with background storage
   * @param {object} characterMap - Character map to sync
   */
  syncCharacterMap(characterMap) {
    if (!this.novelId) {
      console.warn("No novel ID for character map sync");
      return;
    }

    if (!characterMap || typeof characterMap !== "object") {
      console.warn("Invalid character map for sync");
      return;
    }

    // Convert to the optimized format
    const optimizedChars = {};

    Object.entries(characterMap).forEach(([name, data], index) => {
      // Skip invalid entries
      if (!name || typeof name !== "string" || name.length > 50) return;

      // Create optimized character entry
      optimizedChars[index] = {
        name: name,
        gender: this.compressGender(data.gender),
        confidence: parseFloat(data.confidence) || 0,
        appearances: parseInt(data.appearances) || 1
      };

      // Add evidence if available (limited to 5)
      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        optimizedChars[index].evidences = data.evidence
          .filter((e) => typeof e === "string")
          .slice(0, 5);
      }
    });

    // If we have chapter info, include it in the update
    const chapterNumber = this.chapterInfo?.chapterNumber;

    console.log(
      `Syncing ${Object.keys(optimizedChars).length} characters for novel: ${
        this.novelId
      }, chapter: ${chapterNumber || "unknown"}`
    );

    chrome.runtime.sendMessage({
      action: "updateNovelData",
      chars: optimizedChars,
      novelId: this.novelId,
      chapterNumber: chapterNumber
    });
  }

  /**
   * Compress gender string to single character code
   * @param {string} gender - The gender string to compress
   * @return {string} - Single character gender code
   */
  compressGender(gender) {
    if (!gender || typeof gender !== "string") return "u";

    const genderLower = gender.toLowerCase();
    if (genderLower === "male") return "m";
    if (genderLower === "female") return "f";
    return "u"; // unknown or other
  }

  /**
   * Sync novel style with background storage
   */
  #syncNovelStyle() {
    if (!this.novelId || !this.novelStyle) {
      return;
    }

    chrome.runtime.sendMessage({
      action: "updateNovelStyle",
      novelId: this.novelId,
      style: this.novelStyle
    });
  }

  /**
   * Expands compressed gender code to full form
   * @param {string} code - Compressed gender code ("m", "f", "u")
   * @return {string} - Full gender string ("male", "female", "unknown")
   */
  #expandGender(code) {
    if (!code || typeof code !== "string") return "unknown";

    if (code === "m") return "male";
    if (code === "f") return "female";
    return "unknown";
  }

  /**
   * Create a dialogue summary for characters
   * @param {Array} characters - Array of character objects
   * @return {string} - Formatted character summary
   */
  createCharacterSummary(characters) {
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return "";
    }

    let summary =
      "CHARACTER INFORMATION (to help maintain proper pronouns and gender references):\n";

    const sortedCharacters = [...characters].sort(
      (a, b) => (b.appearances || 0) - (a.appearances || 0)
    );
    const significantCharacters = sortedCharacters.filter(
      (c) => c.appearances > 1
    );
    const displayCharacters =
      significantCharacters.length > 0
        ? significantCharacters.slice(0, 10)
        : sortedCharacters.slice(0, 10);

    displayCharacters.forEach((char) => {
      const pronounInfo =
        char.gender === "male"
          ? "he/him/his"
          : char.gender === "female"
          ? "she/her/her"
          : "unknown pronouns";

      summary += `- ${char.name}: ${
        char.gender || "unknown"
      } (${pronounInfo}), appeared ${char.appearances || "unknown"} times\n`;
    });

    return summary;
  }

  /**
   * Sanitize text to prevent injection issues
   * @param {string} text - Text to sanitize
   * @return {string} - Sanitized text
   */
  #sanitizeText(text) {
    if (!text || typeof text !== "string") return "";

    const container = document.createElement("div");
    container.textContent = text;
    return container.innerHTML;
  }

  /**
   * Extract dialogue patterns from text
   * @param {string} text - The text to analyze
   * @return {object} - Extracted dialogue data
   */
  extractDialoguePatterns(text) {
    const dialoguePatterns = {
      quotedDialogue: [],
      colonSeparatedDialogue: [],
      actionDialogue: []
    };

    const quotedPattern = /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      dialoguePatterns.quotedDialogue.push({
        full: match[0],
        dialogue: match[1],
        attribution: match[2].trim()
      });
    }

    const colonPattern = /([^:]+):\s*"([^"]+)"/g;
    while ((match = colonPattern.exec(text)) !== null) {
      dialoguePatterns.colonSeparatedDialogue.push({
        full: match[0],
        character: match[1].trim(),
        dialogue: match[2]
      });
    }

    const actionPattern =
      /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+([^.!?]*[.!?])\s+"([^"]+)"/g;
    while ((match = actionPattern.exec(text)) !== null) {
      dialoguePatterns.actionDialogue.push({
        full: match[0],
        character: match[1],
        action: match[2],
        dialogue: match[3]
      });
    }

    return dialoguePatterns;
  }

  /**
   * Extract named characters from dialogue patterns
   * @param {object} dialoguePatterns - Extracted dialogue patterns
   * @return {Set} - Set of character names
   */
  #extractCharactersFromDialogue(dialoguePatterns) {
    const characters = new Set();

    dialoguePatterns.quotedDialogue.forEach((item) => {
      const attribution = item.attribution.trim();

      if (attribution.length > 100) return;

      const patterns = [
        /\b(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i,
        /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)/i
      ];

      for (const pattern of patterns) {
        const match = attribution.match(pattern);
        if (match) {
          const potentialName = pattern === patterns[0] ? match[2] : match[1];
          const extractedName = this.extractCharacterName(potentialName);
          if (extractedName) {
            characters.add(extractedName);
          }
          break;
        }
      }
    });

    dialoguePatterns.colonSeparatedDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    dialoguePatterns.actionDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    return characters;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelUtils;
} else {
  window.novelUtils = NovelUtils;
}
