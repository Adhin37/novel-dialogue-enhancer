// content-element-cache.js
/**
 * Caches content elements to improve performance
 */
class ContentElementCache {
  constructor() {
    this.cache = new Map();
    this.lastCacheTime = 0;
    this.cacheTimeout = Constants.STORAGE.CACHE_TTL_MS;
  }

  /**
   * Get cached element or find and cache it
   * @param {string} selector - CSS selector
   * @param {boolean} forceRefresh - Force cache refresh
   * @return {HTMLElement|null} - Found element
   */
  getElement(selector, forceRefresh = false) {
    const now = Date.now();

    if (forceRefresh || now - this.lastCacheTime > this.cacheTimeout) {
      this.cache.clear();
      this.lastCacheTime = now;
    }

    if (this.cache.has(selector)) {
      const element = this.cache.get(selector);
      // Verify element is still in DOM
      if (element && document.contains(element)) {
        return element;
      }
      this.cache.delete(selector);
    }

    const element = document.querySelector(selector);
    if (element) {
      this.cache.set(selector, element);
    }

    return element;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.lastCacheTime = 0;
  }
}

if (typeof module !== "undefined") {
  module.exports = ContentElementCache;
} else {
  window.ContentElementCache = ContentElementCache;
}
