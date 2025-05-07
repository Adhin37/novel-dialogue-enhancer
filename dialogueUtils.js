// dialogueUtils.js
/**
 * Dialogue enhancement utilities for Novel Dialogue Enhancer
 */
class DialogueUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Dialogue Utils initialized");
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

    // Extract quoted dialogue: "This is dialogue," said Character.
    const quotedPattern = /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      dialoguePatterns.quotedDialogue.push({
        full: match[0],
        dialogue: match[1],
        attribution: match[2].trim()
      });
    }

    // Extract colon dialogue: Character: "This is dialogue."
    const colonPattern = /([^:]+):\s*"([^"]+)"/g;
    while ((match = colonPattern.exec(text)) !== null) {
      dialoguePatterns.colonSeparatedDialogue.push({
        full: match[0],
        character: match[1].trim(),
        dialogue: match[2]
      });
    }

    // Extract action dialogue: Character did something. "This is dialogue."
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
   * @return {Array} - Array of character names
   */
  extractCharactersFromDialogue(dialoguePatterns) {
    const characters = new Set();

    // Extract from quoted dialogue
    dialoguePatterns.quotedDialogue.forEach((item) => {
      const attribution = item.attribution.trim();

      // Skip if attribution is too long (likely not a simple attribution)
      if (attribution.length > 100) return;

      // Check for common dialogue attribution patterns
      const patterns = [
        // "Text," said Character.
        /\b(said|asked|replied|shouted|whispered|exclaimed|muttered|responded|commented)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})/i,
        // "Text," Character said.
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

    // Extract from colon dialogue
    dialoguePatterns.colonSeparatedDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    // Extract from action dialogue
    dialoguePatterns.actionDialogue.forEach((item) => {
      const extractedName = this.extractCharacterName(item.character);
      if (extractedName) {
        characters.add(extractedName);
      }
    });

    return characters;
  }

  /**
   * Extract a proper character name from text
   * @param {string} text - Text that may contain a character name
   * @return {string|null} - Extracted character name or null
   */
  extractCharacterName(text) {
    if (!text) return null;

    // Clean up the text
    text = text.trim();

    // Handle common cases where we get paragraphs or sentences instead of names
    if (text.length > 50) {
      // Too long to be a reasonable name, try to extract name patterns
      const namePatterns = [
        // Match titles followed by names: "Master Wong", "Lady Chen"
        /\b(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)[\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
        // Match common East Asian name patterns (2-3 characters, capitalized)
        /\b([A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/,
        // Match a character name at the beginning of a sentence
        /^([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+/
      ];

      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match) {
          // For title matches, return the full title + name
          if (pattern === namePatterns[0]) {
            return match[0].trim();
          }
          // Otherwise return just the name portion
          return match[1] ? match[1].trim() : match[0].trim();
        }
      }

      // If we can't find a clear name pattern, this is probably not a character name
      return null;
    }

    // Check for individual pronouns which are not character names
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
    if (pronouns.includes(text)) {
      return null;
    }

    // Check if it's a common non-name word or sentence starter
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

    if (nonNameWords.includes(text)) {
      return null;
    }

    // Check if text is a sentence (contains certain verbs or ending punctuation)
    if (
      text.includes(" ") &&
      (/\s(is|was|are|were|have|had|do|did|can|could|will|would|should|shall|may|might|must)\s/.test(
        text
      ) ||
        /[.!?]/.test(text))
    ) {
      // This is likely a sentence, not a name
      return null;
    }

    // Check if it starts with capital letter (typical for names)
    if (!/^[A-Z]/.test(text)) {
      return null;
    }

    // If there's a period at the end, remove it (could be from a title abbreviation)
    if (text.endsWith(".")) {
      text = text.slice(0, -1).trim();
    }

    // Check if it looks like a composite name (e.g. "Yue Zhong")
    // Common pattern for character names in novels, especially Asian novels
    if (/^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/.test(text)) {
      return text;
    }

    // Check if it's a single capitalized word (Western first names or single-character names)
    if (/^[A-Z][a-z]+$/.test(text)) {
      return text;
    }

    // Check for name with title
    const titlePattern =
      /^(Master|Lady|Lord|Sir|Madam|Miss|Mr\.|Mrs\.|Ms\.)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/;
    const titleMatch = text.match(titlePattern);
    if (titleMatch) {
      return text;
    }

    // Check for "Xiao" prefix (common in Chinese novels)
    if (/^Xiao\s[A-Z][a-z]+$/.test(text)) {
      return text;
    }

    // If we got here but the text is short (less than 20 chars) and capitalized,
    // it might still be a name, but let's do one more check to exclude short sentences
    if (
      text.length < 20 &&
      !text.includes(",") &&
      !text.includes("!") &&
      !text.includes("?")
    ) {
      return text;
    }

    return null;
  }

  /**
   * Analyze novel style from text and history
   * @param {string} text - Current text to analyze
   * @param {string} novelId - Novel identifier
   * @return {object} - Novel style information
   */
  /**
   * Analyze novel style from text and history
   * @param {string} text - Current text to analyze
   * @param {string} novelId - Novel identifier
   * @return {object} - Novel style information
   */
  async analyzeNovelStyle(text, novelId) {
    try {
      // Check if we have stored style information
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "getNovelStyle", novelId: novelId },
          resolve
        );
      });

      if (response && response.style) {
        return response.style;
      }

      // Initialize style detection variables
      let style = "standard narrative";
      let tone = "neutral";
      let confidence = 0;

      // Extract a sample for analysis (max 5000 chars to avoid performance issues)
      const sample = text.substring(0, 5000);

      // Genre pattern detection (weighted scoring system)
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
          regex:
            /\b(wizard|witch|mage|spell|magic|wand|elf|dwarf|orc|goblin)\b/i
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
          regex:
            /\b(love|heart|kiss|embrace|passion|desire|romance|romantic)\b/i
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

      // Score each genre
      const genreScores = {};
      for (const [genre, patterns] of Object.entries(genrePatterns)) {
        let score = 0;

        // Check for regex patterns
        if (patterns.regex.test(sample)) {
          score += 3;
        }

        // Count keyword occurrences
        for (const keyword of patterns.keywords) {
          const regex = new RegExp("\\b" + keyword + "\\b", "gi");
          const matches = sample.match(regex);
          if (matches) {
            score += matches.length;
          }
        }

        genreScores[genre] = score;
      }

      // Find the genre with the highest score
      let maxScore = 0;
      for (const [genre, score] of Object.entries(genreScores)) {
        if (score > maxScore) {
          maxScore = score;
          style = genre;
          confidence = Math.min(score / 10, 1); // Normalize confidence (0-1)
        }
      }

      // Additional style indicators

      // First person narrative check
      const firstPersonIndicators = [
        "I said",
        "I replied",
        "I asked",
        "I thought",
        "I felt",
        "I saw"
      ];
      const firstPersonCount = firstPersonIndicators.reduce(
        (count, indicator) => {
          return (
            count +
            (sample.match(new RegExp("\\b" + indicator + "\\b", "gi")) || [])
              .length
          );
        },
        0
      );

      if (firstPersonCount > 5) {
        style = style + " (first-person)";
      }

      // Check for present tense narration
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
        (count, regex) => {
          return count + (sample.match(regex) || []).length;
        },
        0
      );

      if (presentTenseCount > 5) {
        style = style + " (present tense)";
      }

      // Analyze writing style (dialogue-heavy vs descriptive)
      const dialogueMarks = (sample.match(/["']/g) || []).length;
      const sentenceCount = (sample.match(/[.!?]/g) || []).length;

      if (dialogueMarks > sentenceCount * 0.4) {
        style = style + " (dialogue-heavy)";
      } else if (dialogueMarks < sentenceCount * 0.2) {
        style = style + " (descriptive)";
      }

      // Tone analysis
      // Check for emotional words
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

      // Score each tone
      const toneScores = {};
      for (const [toneName, patterns] of Object.entries(tonePatterns)) {
        let score = 0;

        for (const pattern of patterns) {
          const matches = sample.match(pattern) || [];
          score += matches.length;
        }

        toneScores[toneName] = score;
      }

      // Find the tone with the highest score
      maxScore = 0;
      for (const [toneName, score] of Object.entries(toneScores)) {
        if (score > maxScore) {
          maxScore = score;
          tone = toneName;
        }
      }

      // Check for sentence length (short sentences often indicate action-oriented or tense writing)
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

      // Check capitalization patterns for emphasis style
      const allCapsWords = sample.match(/\b[A-Z]{2,}\b/g) || [];
      if (allCapsWords.length > 5) {
        tone = tone + " with emphasis";
      }

      // Check for unusual punctuation patterns
      const ellipses = (sample.match(/\.\.\./g) || []).length;
      const exclamations = (sample.match(/!/g) || []).length;

      if (ellipses > 10) {
        tone = tone + " with pauses";
      }

      if (exclamations > 10) {
        tone = tone + " with intensity";
      }

      // Save this analysis for future use
      const styleInfo = {
        style,
        tone,
        confidence,
        analyzed: true
      };

      chrome.runtime.sendMessage({
        action: "updateNovelStyle",
        novelId: novelId,
        style: styleInfo
      });

      return styleInfo;
    } catch (err) {
      console.warn("Failed to analyze novel style:", err);
      return { style: "standard narrative", tone: "neutral", confidence: 0 };
    }
  }

  /**
   * Create a dialogue summary for LLM context
   * @param {Array} characters - Array of character objects with names and genders
   * @return {string} - Formatted dialogue summary for LLM
   */
  createDialogueSummary(characters) {
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return "";
    }

    let summary =
      "CHARACTER INFORMATION (to help maintain proper pronouns and gender references):\n";

    // Create a copy of the array before sorting to avoid modifying the original
    const sortedCharacters = [...characters].sort(
      (a, b) => (b.appearances || 0) - (a.appearances || 0)
    );

    // Only include significant characters (appeared more than once)
    const significantCharacters = sortedCharacters.filter(
      (c) => c.appearances > 1
    );

    // Limit to top 10 characters to keep the summary concise
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
}

if (typeof module !== "undefined") {
  module.exports = DialogueUtils;
} else {
  window.dialogueUtils = DialogueUtils;
}
