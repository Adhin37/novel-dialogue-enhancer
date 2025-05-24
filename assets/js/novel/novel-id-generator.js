/**
 * Simple novel ID generator utility
 */
class NovelIdGenerator {
  /**
   * Generate a unique novel ID from URL and title
   * @param {string} url - Current page URL
   * @param {string} title - Page title
   * @return {string} - Unique novel identifier
   */
  static generateNovelId(url, title) {
    if (!url || typeof url !== "string") {
      console.warn("Invalid URL provided for novel ID generation");
      return null;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");

      // Extract novel name from title or URL
      const novelName = this.#extractNovelName(title, urlObj);

      if (!novelName) {
        console.warn("Could not extract novel name from title or URL");
        return null;
      }

      // Create clean novel ID
      const novelId = `${domain}__${novelName}`
        .toLowerCase()
        .replace(/[^\w]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .substring(0, 50);

      return novelId;
    } catch (error) {
      console.error("Error generating novel ID:", error);
      return null;
    }
  }

  /**
   * Extract novel name from title or URL
   * @param {string} title - Page title
   * @param {URL} urlObj - URL object
   * @return {string|null} - Extracted novel name
   * @private
   */
  static #extractNovelName(title, urlObj) {
    // Try to extract from title first
    if (title && typeof title === "string" && title.trim()) {
      const novelName = this.#cleanTitleForNovelName(title);
      if (novelName && novelName.length >= 3) {
        return novelName;
      }
    }

    // Fallback to URL path extraction
    return this.#extractFromUrlPath(urlObj);
  }

  /**
   * Clean title to extract novel name
   * @param {string} title - Raw title
   * @return {string|null} - Cleaned novel name
   * @private
   */
  static #cleanTitleForNovelName(title) {
    // Remove common chapter indicators and separators
    let cleaned = title
      .replace(/\s*[-–—|:]\s*(chapter|ch\.?|episode|part)\s*\d+.*$/i, "")
      .replace(/\s*[-–—|:]\s*.*$/, "")
      .trim();

    // If title starts with chapter info, try to extract novel name after it
    const chapterMatch = title.match(
      /^(chapter|ch\.?|episode|part)\s*\d+\s*[-–—|:]\s*(.+)$/i
    );
    if (chapterMatch && chapterMatch[2]) {
      cleaned = chapterMatch[2].trim();
    }

    // Remove common suffixes
    cleaned = cleaned
      .replace(
        /\s*[-–—|:]\s*(read online|free|novel|story|web novel|light novel).*$/i,
        ""
      )
      .replace(/\s*\(.*\)$/, "")
      .trim();

    return cleaned.length >= 3 ? cleaned : null;
  }

  /**
   * Extract novel name from URL path as fallback
   * @param {URL} urlObj - URL object
   * @return {string|null} - Extracted name from URL
   * @private
   */
  static #extractFromUrlPath(urlObj) {
    const pathSegments = urlObj.pathname
      .split("/")
      .filter((segment) => segment.length > 3 && !segment.match(/^\d+$/));

    // Look for the longest meaningful segment
    let bestSegment = null;
    let maxLength = 0;

    pathSegments.forEach((segment) => {
      const decoded = decodeURIComponent(segment).replace(/[-_]/g, " ");
      if (decoded.length > maxLength && decoded.length >= 3) {
        bestSegment = decoded;
        maxLength = decoded.length;
      }
    });

    return bestSegment;
  }

  /**
   * Check if current page is likely a different novel than the stored one
   * @param {string} currentNovelId - Current novel ID
   * @param {string} storedNovelId - Previously stored novel ID
   * @return {boolean} - Whether this appears to be a different novel
   */
  static isDifferentNovel(currentNovelId, storedNovelId) {
    if (!currentNovelId || !storedNovelId) {
      return true;
    }

    // If domains are different, definitely different novels
    const currentDomain = currentNovelId.split("__")[0];
    const storedDomain = storedNovelId.split("__")[0];

    if (currentDomain !== storedDomain) {
      return true;
    }

    // If novel names are different, different novels
    return currentNovelId !== storedNovelId;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelIdGenerator;
} else {
  window.NovelIdGenerator = NovelIdGenerator;
}
