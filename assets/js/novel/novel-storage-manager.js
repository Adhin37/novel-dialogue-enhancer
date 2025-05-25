// In assets/js/novel/novel-storage-manager.js - Properly use parent caching
/**
 * Manages novel data storage and retrieval
 */
class NovelStorageManager extends StorageManager {
  constructor() {
    super();
    this.novelId = null;
  }

  /**
   * Set the novel ID for this storage manager
   * @param {string} novelId - The novel ID to set
   */
  setNovelId(novelId) {
    this.novelId = novelId;
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
      // Try to get from cache first using parent class method
      const cachedStyle = await this.get(cacheKey, null, true);
      if (cachedStyle) {
        return cachedStyle;
      }

      // If not in cache, fetch from background
      const response = await this.#sendBackgroundMessage({
        action: "getNovelStyle",
        novelId: this.novelId
      });

      if (response && response.status === "ok" && response.style) {
        // Store in cache using parent class method
        await this.set(cacheKey, response.style, true);
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
      // Try to get from cache first using parent class method
      const cachedData = await this.get(cacheKey, null, true);
      if (cachedData) {
        return cachedData;
      }

      // If not in cache, fetch from background
      const response = await this.#sendBackgroundMessage({
        action: "getNovelData",
        novelId: this.novelId
      });

      const novelData =
        response && response.status === "ok"
          ? {
              characterMap: response.characterMap || {},
              enhancedChapters: response.enhancedChapters || []
            }
          : { characterMap: {}, enhancedChapters: [] };

      // Store in cache using parent class method
      await this.set(cacheKey, novelData, true);
      return novelData;
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
      // Try to get from cache first using parent class method
      const cachedStatus = await this.get(cacheKey, null, true);
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

      // Store in cache using parent class method
      await this.set(cacheKey, isEnhanced, true);
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
        // Update cache using parent class method
        const cacheKey = `novelStyle_${this.novelId}`;
        await this.set(cacheKey, styleInfo, true);
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

    const optimizedChars = this.#createOptimizedCharacterData(characterMap);

    try {
      const response = await this.#sendBackgroundMessage({
        action: "updateNovelData",
        chars: optimizedChars,
        novelId: this.novelId,
        chapterNumber: chapterNumber
      });

      const success = response && response.status === "ok";

      if (success) {
        // Update cache - clear novel data cache so it gets refreshed next time
        const novelDataCacheKey = `novelData_${this.novelId}`;
        this.clearCache(novelDataCacheKey);

        // If we have a chapter number, update that cache too
        if (chapterNumber) {
          const chapterCacheKey = `chapterStatus_${this.novelId}_${chapterNumber}`;
          await this.set(chapterCacheKey, true, true);
        }
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
   * Create optimized character data using shared utilities
   * @param {object} characterMap - Raw character map
   * @return {object} - Optimized character data
   * @private
   */
  #createOptimizedCharacterData(characterMap) {
    const optimized = {};

    Object.entries(characterMap).forEach(([name, data], index) => {
      if (SharedUtils.validateCharacterName(name)) {
        optimized[index] = {
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
          optimized[index].evidences = data.evidence.slice(
            0,
            Constants.STORAGE.MAX_EVIDENCE_ENTRIES
          );
        }
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
