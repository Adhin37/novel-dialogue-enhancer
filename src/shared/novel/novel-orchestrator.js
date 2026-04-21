import { logger } from "../utils/logger.js";
import { GenderConfig } from "../gender/gender-config.js";
import { ExtensionConfig } from "../utils/extension-config.js";
import { TextLimits } from "../utils/text-limits.js";
import { StringUtils } from "../utils/string-utils.js";
import { GenderUtils } from "../gender/gender-utils.js";
import { CharacterUtils } from "../utils/character-utils.js";
import { IdGenerator } from "./id-generator.js";
import { ChapterDetector } from "./chapter-detector.js";
import { CharacterExtractor } from "./character-extractor.js";
import { StyleAnalyzer } from "./style-analyzer.js";

/**
 * Main orchestrator class for novel processing utilities
 * Coordinates specialized modules for different novel-related tasks
 */
export class NovelOrchestrator {
  /**
   * Creates a new NovelUtils instance
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   */
  constructor(url, title) {
    this.url = url;
    this.title = title || document.title || "";
    this.logger = logger;

    // Initialize specialized modules
    this.idGenerator = new IdGenerator();
    this.chapterDetector = new ChapterDetector();
    this.characterExtractor = new CharacterExtractor();
    this.styleAnalyzer = new StyleAnalyzer();

    // Generate initial novel ID
    this.novelId = this.updateNovelId(url, this.title);

    // Initialize other properties
    this.novelStyle = null;
    this.novelGenre = null;
    this.characterMap = {};
    this.chapterInfo = null;
    this.enhancedChapters = [];
    this.isCurrentChapterEnhanced = false;

    this.logger.debug("Novel Dialogue Enhancer: Novel Utils initialized");
  }

  /**
   * Updates the novel ID based on the provided URL and title
   * @param {string} url - URL of the novel page
   * @param {string} title - Title of the novel page
   * @returns {string} - Generated novel ID
   */
  updateNovelId(url, title) {
    const novelId = this.idGenerator.generateNovelId(url, title);

    if (novelId !== this.novelId) {
      this.logger.info(`Generated novel ID: ${novelId}`);
      this.novelId = novelId;
    }

    return this.novelId;
  }

  /**
   * Detects the platform of the novel based on the URL
   * @param {string} url - URL of the novel page
   * @returns {string} - Detected platform (e.g., "novel", "chapter")
   */
  detectPlatform(url) {
    if (!url) return "unknown";

    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname.replace(/^www\./, "").split(".")[0];
    } catch (error) {
      this.logger.error("Error detecting platform:", error);
      return "unknown";
    }
  }

  /**
   * Analyzes the novel style based on the provided text
   * @param {string} text - Text of the novel page
   * @param {string} novelId - ID of the novel (optional)
   * @returns {object} - Analyzed novel style
   */
  async analyzeNovelStyle(text, novelId = this.novelId) {
    if (
      this.novelStyle &&
      this.novelStyle.analyzed &&
      novelId === this.novelId
    ) {
      return this.novelStyle;
    }

    // Try to fetch existing style from background if novelId is provided
    if (novelId) {
      try {
        const response = await this.#sendBackgroundMessage({
          action: "getNovelStyle",
          novelId: novelId
        });

        if (response && response.status === "ok" && response.style) {
          if (novelId === this.novelId) {
            this.novelStyle = response.style;
          }
          return response.style;
        }
      } catch (err) {
        this.logger.warn("Failed to fetch existing novel style:", err);
        // Continue to analyze instead of failing
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
   * Extracts character names from the provided text
   * @param {string} text - Text of the novel page
   * @param {object} existingCharacterMap - Existing character map (optional)
   * @returns {object} - Extracted character map
   */
  async extractCharacterNames(text, existingCharacterMap = {}) {
    this.logger.info("Extracting character names...");
    let characterMap = this.#optimizeCharacterMap(existingCharacterMap);

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

    // Load existing character data from background and merge it
    characterMap = await this.loadExistingCharacterData(characterMap);

    // Extract character names using the character extractor
    const extractedCharacters =
      this.characterExtractor.extractCharacterNames(text);

    // Merge extracted characters with existing character map
    Object.entries(extractedCharacters).forEach(([name, data]) => {
      const key = CharacterUtils.normalizeName(name);
      if (!characterMap[key]) {
        characterMap[key] = data;
      } else {
        characterMap[key].appearances += data.appearances;
      }
    });

    // Store character map in background
    if (this.novelId && Object.keys(characterMap).length > 0) {
      this.syncCharacterMap(characterMap);
    }

    this.characterMap = characterMap;
    return characterMap;
  }

  /**
   * Initializes the novel context by updating the novel ID and chapter info
   * @returns {boolean} - True if initialization was successful, false otherwise
   */
  #initializeNovelContext() {
    if (!this.novelId) {
      const currentTitle = this.title || document.title || "";
      if (!currentTitle.trim()) {
        this.logger.warn("No valid title available for novel ID generation");
        const urlTitle = this.#extractTitleFromUrl(this.url);
        if (urlTitle) {
          this.title = urlTitle;
          this.updateNovelId(this.url, urlTitle);
        } else {
          this.logger.error(
            "Could not generate novel ID - no valid title found"
          );
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
   * Extracts the title from the provided URL
   * @param {string} url - URL of the novel page
   * @returns {string} - Extracted title
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
      this.logger.warn("Failed to extract title from URL:", error);
      return null;
    }
  }

  /**
   * Checks if the current chapter has already been enhanced
   * @param {object} characterMap - Character map
   * @returns {boolean} - True if the chapter has already been enhanced, false otherwise
   */
  async #checkChapterEnhancementStatus(characterMap) {
    if (!this.novelId) {
      return false;
    }

    const novelData = await this.loadExistingNovelData();

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
          await this.verifyChapterEnhancementStatus(currentChapter);
      }

      if (this.isCurrentChapterEnhanced) {
        this.logger.info(
          `Chapter ${currentChapter} was previously enhanced, using existing character data (${
            Object.keys(mergedCharacterMap).length
          } characters)`
        );
        // Still return false so character processing continues with existing data
        return false;
      }
    }

    return false;
  }

  /**
   * Loads existing character data from the background script
   * @param {object} characterMap - Character map
   * @returns {object} - Merged character map
   */
  async loadExistingCharacterData(characterMap) {
    // Check if background is responsive first
    const isConnected = await this.#checkBackgroundConnection();
    if (!isConnected) {
      this.logger.warn(
        "Background script not responsive, using local data only"
      );
      return characterMap;
    }

    const novelData = await this.loadExistingNovelData();
    const existingMap = novelData.characterMap || {};

    const normalizedKeys = new Set(
      Object.keys(characterMap).map(CharacterUtils.normalizeName)
    );
    const mergedMap = {
      ...characterMap,
      ...Object.fromEntries(
        Object.entries(existingMap)
          .filter(([name]) => !normalizedKeys.has(CharacterUtils.normalizeName(name)))
          .map(([name, data]) => [CharacterUtils.normalizeName(name), data])
      )
    };

    return mergedMap;
  }

  /**
   * Loads existing novel data from the background script
   * @returns {object} - Novel data
   */
  async loadExistingNovelData() {
    if (!this.novelId) {
      return { characterMap: {}, enhancedChapters: [] };
    }

    try {
      const response = await this.#sendBackgroundMessage({
        action: "getNovelData",
        novelId: this.novelId
      });

      if (response && response.status === "ok") {
        return {
          characterMap: response.characterMap || {},
          enhancedChapters: response.enhancedChapters || []
        };
      }

      this.logger.warn("Invalid response from background:", response);
      return { characterMap: {}, enhancedChapters: [] };
    } catch (error) {
      this.logger.error("Error loading novel data:", error);
      return { characterMap: {}, enhancedChapters: [] };
    }
  }

  /**
   * Verifies the enhancement status of a specific chapter
   * @param {number} chapterNumber - Number of the chapter to verify
   * @returns {boolean} - True if the chapter has been enhanced, false otherwise
   */
  async verifyChapterEnhancementStatus(chapterNumber) {
    if (!this.novelId || !chapterNumber) {
      return false;
    }

    try {
      const response = await this.#sendBackgroundMessage({
        action: "getNovelData",
        novelId: this.novelId,
        checkChapter: true,
        chapterNumber: chapterNumber
      });

      return response && response.status === "ok"
        ? Boolean(response.isChapterEnhanced)
        : false;
    } catch (error) {
      this.logger.warn("Error checking chapter status:", error);
      return false;
    }
  }

  /**
   * Syncs the character map to the background script
   * @param {object} characterMap - Character map to sync
   */
  syncCharacterMap(characterMap) {
    const chapterNumber = this.chapterInfo?.chapterNumber;
    if (
      StringUtils.validateObject(characterMap) &&
      Object.keys(characterMap).length > 0
    ) {
      this.logger.info("Syncing character map to background:", characterMap);

      const optimizedChars = this.#createOptimizedCharacterData(characterMap);

      this.#sendBackgroundMessage({
        action: "updateNovelData",
        chars: optimizedChars,
        novelId: this.novelId,
        chapterNumber: chapterNumber
      })
        .then((response) => {
          if (response && response.status === "ok") {
            this.logger.success("Character map synced successfully");
          } else {
            this.logger.warn("Failed to sync character map:", response);
          }
        })
        .catch((error) => {
          this.logger.warn("Error syncing character map:", error);
        });
    }
  }

  /**
   * Checks the connection to the background script
   * @returns {boolean} - True if the connection is successful, false otherwise
   */
  async #checkBackgroundConnection() {
    try {
      const response = await this.#sendBackgroundMessage(
        { action: "ping" },
        1 // Only try once for ping
      );
      return response && response.status;
    } catch (error) {
      this.logger.warn("Background connection check failed:", error);
      return false;
    }
  }

  /**
   * Syncs the novel style to the background script
   * @param {string} novelId - ID of the novel
   * @param {object} styleInfo - Style information to sync
   */
  syncNovelStyle(novelId, styleInfo) {
    this.#sendBackgroundMessage({
      action: "updateNovelStyle",
      novelId: novelId,
      style: styleInfo
    })
      .then((response) => {
        if (response && response.status === "ok") {
          this.logger.success("Novel style synced successfully");
        } else {
          this.logger.warn("Failed to sync novel style:", response);
        }
      })
      .catch((error) => {
        this.logger.warn("Error syncing novel style:", error);
      });
  }

  /**
   * Sends a message to the background script
   * @param {object} message - Message to send
   * @param {number} retries - Number of retries to attempt
   * @returns {Promise} - Promise that resolves with the response from the background script
   */
  async #sendBackgroundMessage(message, retries = 3) {
    return new Promise((resolve, reject) => {
      let timeoutId;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const safeResolve = (value) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(value);
        }
      };

      const safeReject = (error) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          reject(error);
        }
      };

      const attemptSend = () => {
        if (resolved) return;

        timeoutId = setTimeout(() => {
          if (!resolved && retries > 0) {
            this.logger.warn(`Message timeout, retrying... (${retries} left)`);
            setTimeout(() => {
              this.#sendBackgroundMessage(message, retries - 1)
                .then(safeResolve)
                .catch(safeReject);
            }, 1000);
          } else if (!resolved) {
            safeReject(
              new Error("Background message timeout after all retries")
            );
          }
        }, 8000); // Increased timeout to 8 seconds

        try {
          chrome.runtime.sendMessage(message, (response) => {
            if (resolved) return;

            cleanup();

            if (chrome.runtime.lastError) {
              this.logger.warn(
                "Chrome runtime error:",
                chrome.runtime.lastError
              );

              // Check for specific error types
              const errorMessage = chrome.runtime.lastError.message || "";
              const isConnectionError =
                errorMessage.includes("message port closed") ||
                errorMessage.includes("Extension context invalidated") ||
                errorMessage.includes("receiving end does not exist");

              if (isConnectionError && retries > 0) {
                this.logger.warn(
                  `Connection error, retrying... (${retries} left)`
                );
                setTimeout(() => {
                  this.#sendBackgroundMessage(message, retries - 1)
                    .then(safeResolve)
                    .catch(safeReject);
                }, 2000); // Longer delay for connection errors
              } else {
                safeReject(chrome.runtime.lastError);
              }
              return;
            }

            if (!response) {
              if (retries > 0) {
                this.logger.warn(
                  `Empty response, retrying... (${retries} left)`
                );
                setTimeout(() => {
                  this.#sendBackgroundMessage(message, retries - 1)
                    .then(safeResolve)
                    .catch(safeReject);
                }, 1500);
              } else {
                safeReject(new Error("Empty response from background script"));
              }
              return;
            }

            safeResolve(response);
          });
        } catch (error) {
          cleanup();

          if (retries > 0) {
            this.logger.warn(
              `Exception during message send, retrying... (${retries} left)`,
              error
            );
            setTimeout(() => {
              this.#sendBackgroundMessage(message, retries - 1)
                .then(safeResolve)
                .catch(safeReject);
            }, 1500);
          } else {
            safeReject(error);
          }
        }
      };

      attemptSend();
    });
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

    this.logger.info(
      `Extracted metadata for novel: ${metadata.title} (${metadata.wordCount} words)`
    );
    return metadata;
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

    const sampleContent = content.substring(0, TextLimits.VALIDATION.MAX_TEXT_SAMPLE);
    const cleanContent = sampleContent.replace(/<[^>]*>/g, " ");
    const words = cleanContent
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    if (content.length > TextLimits.VALIDATION.MAX_TEXT_SAMPLE) {
      return Math.round(words.length * (content.length / TextLimits.VALIDATION.MAX_TEXT_SAMPLE));
    }

    return words.length;
  }

  /**
   * Create optimized character data using shared utilities
   * @param {object} characterMap - Raw character map
   * @return {object} - Optimized character data
   * @private
   */
  #createOptimizedCharacterData(characterMap) {
    const optimized = {};

    Object.entries(characterMap).forEach(([name, data], index) => {
      if (CharacterUtils.validateCharacterName(name)) {
        optimized[index] = {
          name: name,
          gender: GenderUtils.compressGender(data.gender),
          confidence: CharacterUtils.validateConfidence(data.confidence)
            ? data.confidence
            : 0,
          appearances: CharacterUtils.validateAppearances(data.appearances)
            ? data.appearances
            : 1
        };

        if (Array.isArray(data.evidence) && data.evidence.length > 0) {
          optimized[index].evidences = data.evidence.slice(
            0,
            ExtensionConfig.STORAGE.MAX_EVIDENCE_ENTRIES
          );
        }
      }
    });

    return optimized;
  }

  /**
   * Optimized character map conversion
   * @param {object} characterMap - Raw character data
   * @return {object} - Optimized character map
   * @private
   */
  #optimizeCharacterMap(characterMap) {
    const optimized = {};

    Object.entries(StringUtils.deepClone(characterMap) || {}).forEach(
      ([name, data]) => {
        if (CharacterUtils.validateCharacterName(name)) {
          optimized[name] = {
            name: name,
            gender: GenderUtils.compressGender(data.gender),
            confidence: CharacterUtils.validateConfidence(data.confidence)
              ? data.confidence
              : 0,
            appearances: CharacterUtils.validateAppearances(data.appearances)
              ? data.appearances
              : 1,
            evidence: Array.isArray(data.evidence)
              ? data.evidence.slice(0, 5)
              : []
          };
        }
      }
    );

    return optimized;
  }

  /**
   * Create a dialogue summary for characters
   * @param {Array} characters - Array of character objects
   * @return {string} - Formatted character summary
   */
  createCharacterSummary(characters, text = null) {
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return "";
    }

    // When text is provided, prefer characters that appear in it
    let pool = characters;
    if (text && text.length > 0) {
      const textLower = text.toLowerCase();
      const mentioned = characters.filter(
        (c) => c.name && textLower.includes(c.name.toLowerCase())
      );
      if (mentioned.length > 0) pool = mentioned;
    }

    const sortedCharacters = [...pool].sort(
      (a, b) => (b.appearances || 0) - (a.appearances || 0)
    );
    const significantCharacters = sortedCharacters.filter(
      (c) => c.appearances > 1
    );
    const displayCharacters =
      significantCharacters.length > 0
        ? significantCharacters.slice(0, 10)
        : sortedCharacters.slice(0, 10);

    return displayCharacters
      .map((char) => {
        const expandedGender = GenderUtils.expandGender(char.gender);
        const pronouns =
          expandedGender === GenderConfig.CODES.MALE_FULL
            ? "he/him"
            : expandedGender === GenderConfig.CODES.FEMALE_FULL
            ? "she/her"
            : "unknown";
        return `- ${char.name}: ${pronouns}`;
      })
      .join("\n");
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


