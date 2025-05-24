// novel-platform-detector.js
/**
 * Detects the platform hosting the novel
 */
class NovelPlatformDetector {
    /**
     * Detect the platform hosting the novel
     * @param {string} url - URL of the novel page
     * @return {string} - Platform name
     */
    detectPlatform(url) {
      if (!url) return "unknown";
  
      try {
        const hostname = new URL(url).hostname.toLowerCase();
  
        const platformPatterns = this.#getPlatformPatterns();
  
        for (const [platform, pattern] of Object.entries(platformPatterns)) {
          if (pattern.test(hostname)) {
            return platform;
          }
        }
  
        return hostname.replace(/^www\./, "").split(".")[0];
      } catch (error) {
        console.error("Error detecting platform:", error);
        return "unknown";
      }
    }
  
    /**
     * Get platform detection patterns
     * @return {object} - Platform patterns
     * @private
     */
    #getPlatformPatterns() {
      return {
        royalroad: /royalroad\.com/i,
        wuxiaworld: /wuxiaworld\.com/i,
        webnovel: /webnovel\.com/i,
        scribblehub: /scribblehub\.com/i,
        novelpub: /novelpub\.com/i,
        novelupdates: /novelupdates\.com/i,
        mtlnovel: /mtlnovel\.com/i,
        qidian: /qidian\.com/i,
        fanmtl: /fanmtl\.com/i
      };
    }
  }
  
  if (typeof module !== "undefined") {
    module.exports = NovelPlatformDetector;
  } else {
    window.NovelPlatformDetector = NovelPlatformDetector;
  }