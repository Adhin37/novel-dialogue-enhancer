// assets/js/novel/novel-storage-manager.js
/**
 * Manages novel data storage and retrieval
 */
class NovelStorageManager extends StorageManager {
  constructor() {
    super();
    this.novelId = null;
    this.characterIdMap = new Map();
  }

  /**
   * Set the novel ID for this storage manager
   * @param {string} novelId - The novel ID to set
   */
  setNovelId(novelId) {
    this.novelId = novelId;
    // Clear the character ID map when novel ID changes
    this.characterIdMap.clear();
  }

  /**
   * Get existing novel style from storage with caching
   * @return {Promise<object|null>} - Novel style or null
   */
  async getExistingNovelStyle() {
    if (!this.novelId) {
      return null;
    }

    const cacheKey = `novelStyle_${this.novelId}`;

    try {
      // Try to get from session cache first
      const cachedStyle = await this.get(cacheKey, null, true, true);
      if (cachedStyle) {
        return cachedStyle;
      }

      // If not in cache, fetch from background
      const response = await this.#sendBackgroundMessage({
        action: "getNovelStyle",
        novelId: this.novelId
      });

      if (response && response.status === "ok" && response.style) {
        // Store in session cache
        await this.set(cacheKey, response.style, true, true);
        return response.style;
      }

      return null;
    } catch (error) {
      console.warn("Error getting novel style:", error);
      return null;
    }
  }

  /**
   * Load existing novel data from storage with caching
   * @return {Promise<object>} - Novel data object
   */
  async loadExistingNovelData() {
    if (!this.novelId) {
      return { characterMap: {}, enhancedChapters: [] };
    }

    const cacheKey = `novelData_${this.novelId}`;

    try {
      // Try to get from session cache first
      const cachedData = await this.get(cacheKey, null, true, true);
      if (cachedData && Object.keys(cachedData.characterMap).length > 0) {
        console.log("Using cached novel data:", cachedData);
        this.#updateCharacterIdMap(cachedData.characterMap);
        return cachedData;
      }

      // If not in cache, fetch from background
      console.log("Fetching novel data from background for:", this.novelId);
      const response = await this.#sendBackgroundMessage({
        action: "getNovelData",
        novelId: this.novelId,
        includeRawData: true
      });

      if (response && response.status === "ok") {
        const novelData = {
          characterMap: response.characterMap || {},
          enhancedChapters: response.enhancedChapters || []
        };

        console.log("Received novel data from background:", novelData);

        // Update character ID map from raw data if available
        if (response.rawCharacterData) {
          this.#buildCharacterIdMapFromRaw(response.rawCharacterData);
        } else {
          this.#updateCharacterIdMap(novelData.characterMap);
        }

        // Only cache if we have actual data
        if (Object.keys(novelData.characterMap).length > 0) {
          await this.set(cacheKey, novelData, true, true);
        }

        return novelData;
      }

      return { characterMap: {}, enhancedChapters: [] };
    } catch (error) {
      console.warn("Error getting novel data:", error);
      return { characterMap: {}, enhancedChapters: [] };
    }
  }

  /**
   * Verify if a chapter has been enhanced with caching
   * @param {number} chapterNumber - Chapter number to check
   * @return {Promise<boolean>} - Whether the chapter was enhanced
   */
  async verifyChapterEnhancementStatus(chapterNumber) {
    if (!this.novelId || !chapterNumber) {
      return false;
    }

    const cacheKey = `chapterStatus_${this.novelId}_${chapterNumber}`;

    try {
      // Try to get from session cache first
      const cachedStatus = await this.get(cacheKey, null, true, true);
      if (cachedStatus !== null) {
        return Boolean(cachedStatus);
      }

      // If not in cache, fetch from background
      const response = await this.#sendBackgroundMessage({
        action: "getNovelData",
        novelId: this.novelId,
        checkChapter: true,
        chapterNumber: chapterNumber
      });

      const isEnhanced =
        response && response.status === "ok"
          ? Boolean(response.isChapterEnhanced)
          : false;

      // Store in session cache
      await this.set(cacheKey, isEnhanced, true, true);
      return isEnhanced;
    } catch (error) {
      console.warn("Error checking chapter status:", error);
      return false;
    }
  }

  /**
   * Sync novel style to storage and update cache
   * @param {object} styleInfo - Style information to sync
   * @return {Promise<boolean>} - Success status
   */
  async syncNovelStyle(styleInfo) {
    if (!this.novelId || !styleInfo) {
      return false;
    }

    try {
      const response = await this.#sendBackgroundMessage({
        action: "updateNovelStyle",
        novelId: this.novelId,
        style: styleInfo
      });

      const success = response && response.status === "ok";

      if (success) {
        // Update session cache
        const cacheKey = `novelStyle_${this.novelId}`;
        await this.set(cacheKey, styleInfo, true, true);
      }

      return success;
    } catch (error) {
      console.warn("Error syncing novel style:", error);
      return false;
    }
  }

  /**
   * Sync character map and update cache
   * @param {object} characterMap - Character map to sync
   * @param {number} chapterNumber - Current chapter number
   * @return {Promise<boolean>} - Success status
   */
  async syncCharacterMap(characterMap, chapterNumber = null) {
    if (!this.novelId || !SharedUtils.validateObject(characterMap)) {
      console.warn("Invalid novel ID or character map for sync");
      return false;
    }

    console.log("Syncing character map:", characterMap);
    const optimizedChars = this.#createOptimizedCharacterData(characterMap);
    console.log("Optimized character data:", optimizedChars);

    try {
      const response = await this.#sendBackgroundMessage({
        action: "updateNovelData",
        chars: optimizedChars,
        novelId: this.novelId,
        chapterNumber: chapterNumber
      });

      const success = response && response.status === "ok";

      if (success) {
        console.log("Character map synced successfully");

        // Update character ID map with any new assignments
        this.#updateCharacterIdMap(characterMap);

        // Clear session cache so it gets refreshed next time
        const novelDataCacheKey = `novelData_${this.novelId}`;
        this.clearCache(novelDataCacheKey);

        // If we have a chapter number, update that cache too
        if (chapterNumber) {
          const chapterCacheKey = `chapterStatus_${this.novelId}_${chapterNumber}`;
          await this.set(chapterCacheKey, true, true, true);
        }
      } else {
        console.warn("Failed to sync character map:", response);
      }

      return success;
    } catch (error) {
      console.warn("Error syncing character map:", error);
      return false;
    }
  }

  /**
   * Send message to background script with timeout
   * @param {object} message - Message to send
   * @return {Promise<object>} - Response from background
   * @private
   */
  async #sendBackgroundMessage(message) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Background message timeout"));
      }, 10000);

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeoutId);

          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }

          resolve(response);
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Update character ID map from character map data
   * @param {object} characterMap - Character map with name keys
   * @private
   */
  #updateCharacterIdMap(characterMap) {
    if (!characterMap || typeof characterMap !== "object") {
      return;
    }

    // For existing characters, preserve their mappings
    Object.keys(characterMap).forEach((name) => {
      if (!this.characterIdMap.has(name)) {
        // Will be assigned in createOptimizedCharacterData
      }
    });
  }

  /**
   * Build character ID map from raw storage data
   * @param {object} rawCharacterData - Raw character data from storage
   * @private
   */
  #buildCharacterIdMapFromRaw(rawCharacterData) {
    if (!rawCharacterData || typeof rawCharacterData !== "object") {
      return;
    }

    console.log("Building character ID map from raw data:", rawCharacterData);
    this.characterIdMap.clear();

    Object.entries(rawCharacterData).forEach(([numericId, charData]) => {
      if (charData && charData.name) {
        this.characterIdMap.set(charData.name, parseInt(numericId, 10));
      }
    });

    console.log("Character ID map built:", this.characterIdMap);
  }

  /**
   * Get the next available character ID
   * @return {number} - Next available ID
   * @private
   */
  #getNextCharacterId() {
    if (this.characterIdMap.size === 0) {
      return 0;
    }

    const existingIds = Array.from(this.characterIdMap.values());
    return Math.max(...existingIds) + 1;
  }

  /**
   * Create optimized character data preserving existing IDs
   * @param {object} characterMap - Raw character map
   * @return {object} - Optimized character data
   * @private
   */
  #createOptimizedCharacterData(characterMap) {
    const optimized = {};

    Object.entries(characterMap).forEach(([name, data]) => {
      if (!SharedUtils.validateCharacterName(name)) {
        return;
      }

      // Use existing ID or assign new one
      let numericId = this.characterIdMap.get(name);
      if (numericId === undefined) {
        numericId = this.#getNextCharacterId();
        this.characterIdMap.set(name, numericId);
        console.log(`Assigned new ID ${numericId} to character: ${name}`);
      }

      optimized[numericId] = {
        name: name,
        gender: SharedUtils.compressGender(data.gender),
        confidence: SharedUtils.validateConfidence(data.confidence)
          ? data.confidence
          : 0,
        appearances: SharedUtils.validateAppearances(data.appearances)
          ? data.appearances
          : 1
      };

      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        optimized[numericId].evidences = data.evidence.slice(
          0,
          Constants.STORAGE.MAX_EVIDENCE_ENTRIES
        );
      }
    });

    return optimized;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelStorageManager;
} else {
  window.NovelStorageManager = NovelStorageManager;
}
