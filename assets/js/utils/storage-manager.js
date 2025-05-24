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
   * @return {Promise<*>} - Retrieved data
   */
  async get(key, defaultValue = null, useCache = true) {
    if (useCache && this._isCacheValid(key)) {
      return this.cache.get(key);
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (data) => {
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

        resolve(value);
      });
    });
  }

  /**
   * Set data in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @param {boolean} updateCache - Whether to update cache
   * @return {Promise<boolean>} - Success status
   */
  async set(key, value, updateCache = true) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, () => {
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
   * @return {Promise<object>} - Retrieved data object
   */
  async getMultiple(keys, defaults = {}) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(keys, (data) => {
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
   * @return {Promise<boolean>} - Success status
   */
  async setMultiple(data) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => {
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
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + Constants.STORAGE.CACHE_TTL_MS);
  }
}

if (typeof module !== "undefined") {
  module.exports = StorageManager;
} else {
  window.StorageManager = StorageManager;
}
