// novel-storage-manager.js
/**
 * Manages novel data storage and retrieval
 */
class NovelStorageManager {
    /**
     * Creates a new NovelStorageManager instance
     */
    constructor() {
      this.novelId = null;
    }
  
    /**
     * Set the novel ID for storage operations
     * @param {string} novelId - Novel identifier
     */
    setNovelId(novelId) {
      this.novelId = novelId;
    }
  
    /**
     * Sync character map with background storage
     * @param {object} characterMap - Character map to sync
     * @param {number} chapterNumber - Current chapter number
     */
    syncCharacterMap(characterMap, chapterNumber = null) {
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
          gender: this.#compressGender(data.gender),
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
     * Sync novel style with background storage
     * @param {object} styleInfo - The style information to sync
     */
    syncNovelStyle(styleInfo) {
      if (!this.novelId || !styleInfo) {
        console.warn("Cannot sync novel style: missing novelId or styleInfo");
        return;
      }
  
      try {
        chrome.runtime.sendMessage(
          {
            action: "updateNovelStyle",
            novelId: this.novelId,
            style: styleInfo
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Failed to sync novel style:",
                chrome.runtime.lastError
              );
            } else if (response && response.status === "ok") {
              console.log(`Novel style synced for ${this.novelId}`);
            }
          }
        );
      } catch (error) {
        console.warn("Error syncing novel style:", error);
      }
    }
  
    /**
     * Load existing novel data from storage
     * @return {Promise<object>} - Novel data including character map and enhanced chapters
     */
    async loadExistingNovelData() {
      if (!this.novelId) {
        return { characterMap: {}, enhancedChapters: [] };
      }
  
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
     * Get existing novel style from storage
     * @return {Promise<object|null>} - Novel style or null
     */
    async getExistingNovelStyle() {
      if (!this.novelId) {
        return null;
      }
  
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Message port closed before response was received"));
          }, 5000);
  
          try {
            chrome.runtime.sendMessage(
              { action: "getNovelStyle", novelId: this.novelId },
              (response) => {
                clearTimeout(timeoutId);
  
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
          return response.style;
        }
      } catch (err) {
        console.warn("Failed to fetch existing novel style:", err);
      }
  
      return null;
    }
  
    /**
     * Check if a chapter has been enhanced
     * @param {number} chapterNumber - Chapter number to check
     * @return {Promise<boolean>} - Whether the chapter is enhanced
     */
    async verifyChapterEnhancementStatus(chapterNumber) {
      if (!this.novelId || !chapterNumber) {
        return false;
      }
  
      return new Promise((resolve) => {
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
     * Compress gender string to single character code
     * @param {string} gender - The gender string to compress
     * @return {string} - Single character gender code
     * @private
     */
    #compressGender(gender) {
      if (!gender || typeof gender !== "string") return "u";
  
      const genderLower = gender.toLowerCase();
      if (genderLower === "male") return "m";
      if (genderLower === "female") return "f";
      return "u"; // unknown or other
    }
  }
  
  if (typeof module !== "undefined") {
    module.exports = NovelStorageManager;
  } else {
    window.NovelStorageManager = NovelStorageManager;
  }