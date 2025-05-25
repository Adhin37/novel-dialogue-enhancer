// assets/js/utils/storage-manager.js
/**
 * Centralized storage manager for consistent data handling
 */
class StorageManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
  }

  /**
   * Get data from storage with caching
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if not found
   * @param {boolean} useCache - Whether to use cache
   * @param {boolean} useSession - Whether to use session storage for cache
   * @return {Promise<*>} - Retrieved data
   */
  async get(key, defaultValue = null, useCache = true, useSession = false) {
    if (useCache && this._isCacheValid(key)) {
      // Return a deep clone to prevent mutations to cached data
      return SharedUtils.deepClone(this.cache.get(key));
    }

    return new Promise((resolve) => {
      const storageArea = useSession
        ? chrome.storage.session
        : chrome.storage.sync;

      storageArea.get(key, (data) => {
        if (chrome.runtime.lastError) {
          console.warn(
            `Storage get error for ${key}:`,
            chrome.runtime.lastError
          );
          resolve(defaultValue);
          return;
        }

        const value = data[key] !== undefined ? data[key] : defaultValue;

        if (useCache) {
          this._setCache(key, value);
        }

        // Return a deep clone to prevent mutations
        resolve(SharedUtils.deepClone(value));
      });
    });
  }

  /**
   * Set data in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {boolean} updateCache - Whether to update cache
   * @param {boolean} useSession - Whether to use session storage
   * @return {Promise<boolean>} - Success status
   */
  async set(key, value, updateCache = true, useSession = false) {
    return new Promise((resolve) => {
      const storageArea = useSession
        ? chrome.storage.session
        : chrome.storage.sync;

      storageArea.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            `Storage set error for ${key}:`,
            chrome.runtime.lastError
          );
          resolve(false);
          return;
        }

        if (updateCache) {
          this._setCache(key, value);
        }

        resolve(true);
      });
    });
  }

  /**
   * Get multiple keys at once
   * @param {string[]} keys - Array of keys to retrieve
   * @param {object} defaults - Default values object
   * @param {boolean} useSession - Whether to use session storage
   * @return {Promise<object>} - Retrieved data object
   */
  async getMultiple(keys, defaults = {}, useSession = false) {
    return new Promise((resolve) => {
      const storageArea = useSession
        ? chrome.storage.session
        : chrome.storage.sync;

      storageArea.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          console.warn("Storage getMultiple error:", chrome.runtime.lastError);
          resolve(defaults);
          return;
        }

        const result = { ...defaults, ...data };
        resolve(result);
      });
    });
  }

  /**
   * Set multiple key-value pairs
   * @param {object} data - Data object to store
   * @param {boolean} useSession - Whether to use session storage
   * @return {Promise<boolean>} - Success status
   */
  async setMultiple(data, useSession = false) {
    return new Promise((resolve) => {
      const storageArea = useSession
        ? chrome.storage.session
        : chrome.storage.sync;

      storageArea.set(data, () => {
        if (chrome.runtime.lastError) {
          console.warn("Storage setMultiple error:", chrome.runtime.lastError);
          resolve(false);
          return;
        }
        resolve(true);
      });
    });
  }

  /**
   * Clear cache for a specific key
   * @param {string} key - Key to clear from cache
   */
  clearCache(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Check if cache is valid for a key
   * @param {string} key - Cache key to check
   * @return {boolean} - Whether cache is valid
   * @private
   */
  _isCacheValid(key) {
    if (!this.cache.has(key)) return false;

    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.clearCache(key);
      return false;
    }

    return true;
  }

  /**
   * Set value in cache with expiry
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @private
   */
  _setCache(key, value) {
    this.cache.set(key, SharedUtils.deepClone(value));
    this.cacheExpiry.set(key, Date.now() + Constants.STORAGE.CACHE_TTL_MS);
  }
}

if (typeof module !== "undefined") {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}
