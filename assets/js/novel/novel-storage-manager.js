// In assets/js/novel/novel-storage-manager.js - Extend StorageManager
/**
 * Manages novel data storage and retrieval
 */
class NovelStorageManager extends StorageManager {
  constructor() {
    super();
    this.novelId = null;
  }

  /**
   * Sync character map using parent class storage methods
   * @param {object} characterMap - Character map to sync
   * @param {number} chapterNumber - Current chapter number
   */
  async syncCharacterMap(characterMap, chapterNumber = null) {
    if (!this.novelId || !SharedUtils.validateObject(characterMap)) {
      console.warn("Invalid novel ID or character map for sync");
      return false;
    }

    const optimizedChars = this.#createOptimizedCharacterData(characterMap);

    const success = await chrome.runtime.sendMessage({
      action: "updateNovelData",
      chars: optimizedChars,
      novelId: this.novelId,
      chapterNumber: chapterNumber
    });

    return success;
  }

  /**
   * Create optimized character data using shared utilities
   * @param {object} characterMap - Raw character map
   * @return {object} - Optimized character data
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
