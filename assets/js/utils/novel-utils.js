// novelUtils.js
/**
 * Main orchestrator class for novel processing utilities
 * Coordinates specialized modules for different novel-related tasks
 */
class NovelUtils {
  /**
   * Creates a new NovelUtils instance
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   */
  // Fix 1: Initialize novelId in constructor
  constructor(url, title) {
    this.url = url;
    this.title = title || document.title || "";

    // Initialize specialized modules first
    this.idGenerator = new NovelIdGenerator();
    this.chapterDetector = new NovelChapterDetector();
    this.platformDetector = new NovelPlatformDetector();
    this.characterExtractor = new NovelCharacterExtractor();
    this.styleAnalyzer = new NovelStyleAnalyzer();
    this.storageManager = new StorageManager();

    // Generate initial novel ID
    this.novelId = this.updateNovelId(url, this.title);

    // Initialize other properties
    this.novelStyle = null;
    this.novelGenre = null;
    this.characterMap = {};
    this.chapterInfo = null;
    this.enhancedChapters = [];
    this.isCurrentChapterEnhanced = false;

    console.debug("Novel Dialogue Enhancer: Novel Utils initialized");
  }

  /**
   * Update the novel identifier based on URL and title
   * @param {string} url - URL of the novel
   * @param {string} title - Title of the novel
   * @return {string} - Unique novel identifier
   */
  updateNovelId(url, title) {
    const novelId = this.idGenerator.generateNovelId(url, title);

    if (novelId !== this.novelId) {
      console.log(`Generated novel ID: ${novelId}`);
      this.novelId = novelId;
      this.storageManager.setNovelId(novelId);
    }

    return this.novelId;
  }

  /**
   * Extract novel metadata from the page
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   * @return {object} - Novel metadata
   */
  extractNovelMetadata(url, title) {
    const textContent = document.body.textContent || "";
    const workingTitle = title || document.title;
    const generatedNovelId = this.updateNovelId(url, workingTitle);

    const metadata = {
      novelId: this.novelId || generatedNovelId || "unknown_novel",
      title: workingTitle,
      platform: this.detectPlatform(url),
      chapterInfo: this.detectChapterInfo(workingTitle, textContent),
      wordCount: this.estimateWordCount(textContent)
    };

    console.log(
      `Extracted metadata for novel: ${metadata.title} (${metadata.wordCount} words)`
    );
    return metadata;
  }

  /**
   * Detect the platform hosting the novel
   * @param {string} url - URL of the novel page
   * @return {string} - Platform name
   */
  detectPlatform(url) {
    return this.platformDetector.detectPlatform(url);
  }

  /**
   * Detect chapter information from title and content
   * @param {string} title - Page title
   * @param {string} content - Page content
   * @return {object} - Chapter information
   */
  detectChapterInfo(title, content) {
    return this.chapterDetector.detectChapterInfo(title, content, this.url);
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
        const existingStyle = await this.storageManager.getExistingNovelStyle();
        if (existingStyle) {
          if (novelId === this.novelId) {
            this.novelStyle = existingStyle;
          }
          return existingStyle;
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

    // Analyze the style using the style analyzer
    const styleInfo = this.styleAnalyzer.analyzeNovelStyle(text);

    if (novelId === this.novelId) {
      this.novelStyle = styleInfo;
    }

    this.syncNovelStyle(novelId, styleInfo);
    return styleInfo;
  }

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
    const initialized = this.#initializeNovelContext();
    if (!initialized) {
      return characterMap;
    }

    // Check if chapter was already enhanced and get existing data
    const alreadyEnhanced = await this.#checkChapterEnhancementStatus(
      characterMap
    );
    if (alreadyEnhanced) {
      return this.characterMap;
    }

    // Load existing character data from storage and merge it
    characterMap = await this.loadExistingCharacterData(characterMap);

    // Extract character names using the character extractor
    const extractedCharacters =
      this.characterExtractor.extractCharacterNames(text);

    // Merge extracted characters with existing character map
    Object.entries(extractedCharacters).forEach(([name, data]) => {
      if (!characterMap[name]) {
        characterMap[name] = data;
      } else {
        characterMap[name].appearances += data.appearances;
      }
    });

    // Track statistics
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
   * Initialize novel ID and chapter info if not already set
   * @return {boolean} - Whether initialization was successful
   * @private
   */
  #initializeNovelContext() {
    if (!this.novelId) {
      const currentTitle = this.title || document.title || "";
      if (!currentTitle.trim()) {
        console.warn("No valid title available for novel ID generation");
        const urlTitle = this.#extractTitleFromUrl(this.url);
        if (urlTitle) {
          this.title = urlTitle;
          this.updateNovelId(this.url, urlTitle);
        } else {
          console.error("Could not generate novel ID - no valid title found");
          return false;
        }
      } else {
        this.updateNovelId(this.url, currentTitle);
      }
    }

    if (!this.chapterInfo) {
      this.chapterInfo = this.detectChapterInfo(
        this.title || document.title,
        document.body.textContent
      );
    }

    return true;
  }

  /**
   * Extract a potential title from URL as fallback
   * @param {string} url - The URL to extract from
   * @return {string|null} - Extracted title or null
   * @private
   */
  #extractTitleFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // Look for novel/chapter patterns in URL
      const segments = pathname
        .split("/")
        .filter((segment) => segment.length > 0);

      // Find the longest segment that might be a novel title
      let potentialTitle = null;
      let maxLength = 0;

      segments.forEach((segment) => {
        // Decode URL encoding and replace hyphens/underscores with spaces
        const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
        if (decoded.length > maxLength && decoded.length > 3) {
          potentialTitle = decoded;
          maxLength = decoded.length;
        }
      });

      return potentialTitle;
    } catch (error) {
      console.warn("Failed to extract title from URL:", error);
      return null;
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

    const novelData = await this.storageManager.loadExistingNovelData();

    // Merge character maps
    const mergedCharacterMap = {
      ...characterMap,
      ...(novelData.characterMap || {})
    };
    this.characterMap = mergedCharacterMap;

    this.enhancedChapters = novelData.enhancedChapters || [];

    // Check if this chapter has already been enhanced
    if (this.chapterInfo && this.chapterInfo.chapterNumber) {
      const currentChapter = parseInt(this.chapterInfo.chapterNumber, 10);

      this.isCurrentChapterEnhanced = this.enhancedChapters.some(
        (chapter) => parseInt(chapter.chapterNumber, 10) === currentChapter
      );

      if (!this.isCurrentChapterEnhanced) {
        this.isCurrentChapterEnhanced =
          await this.storageManager.verifyChapterEnhancementStatus(
            currentChapter
          );
      }

      if (this.isCurrentChapterEnhanced) {
        console.log(
          `Chapter ${currentChapter} was previously enhanced, using existing character data`
        );
        return true;
      }
    }

    return false;
  }

  /**
   * Load existing character data from storage
   * @param {object} characterMap - Current character map
   * @return {Promise<object>} - Updated character map with existing data
   */
  async loadExistingCharacterData(characterMap) {
    const novelData = await this.storageManager.loadExistingNovelData();
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
    const chapterNumber = this.chapterInfo?.chapterNumber;
    if (SharedUtils.validateObject(characterMap) && Object.keys(characterMap).length > 0) {
      this.storageManager.syncCharacterMap(characterMap, chapterNumber);
    }
  }

  /**
   * Sync novel style with background storage
   * @param {string} novelId - The novel ID to sync
   * @param {object} styleInfo - The style information to sync
   */
  syncNovelStyle(novelId, styleInfo) {
    this.storageManager.syncNovelStyle(styleInfo);
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
   * Extract character name - delegated to character extractor
   * @param {string} text - Text that may contain a character name
   * @return {string|null} - Extracted character name or null
   */
  extractCharacterName(text) {
    return this.characterExtractor.extractCharacterName(text);
  }

  /**
   * Extract dialogue patterns - delegated to character extractor
   * @param {string} text - The text to analyze
   * @return {object} - Extracted dialogue data
   */
  extractDialoguePatterns(text) {
    return this.characterExtractor.extractDialoguePatterns(text);
  }

  /**
   * Extract characters from dialogue - delegated to character extractor
   * @param {object} dialoguePatterns - Extracted dialogue patterns
   * @return {Set} - Set of character names
   */
  extractCharactersFromDialogue(dialoguePatterns) {
    return this.characterExtractor.extractCharactersFromDialogue(
      dialoguePatterns
    );
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelUtils;
} else {
  window.NovelUtils = NovelUtils;
}
