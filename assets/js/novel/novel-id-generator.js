/**
 * Simple novel ID generator utility
 */
class NovelIdGenerator {
  /**
   * Creates a new NovelIdGenerator instance
   */
  constructor() {
    this.novelId = "";
    this.logger = window.logger;

    this.logger.debug(
      "Novel Dialogue Enhancer: Novel ID Generator initialized"
    );
  }

  /**
   * Generate a unique novel ID from URL and title
   * @param {string} url - Current page URL
   * @param {string} title - Page title
   * @return {string} - Unique novel identifier
   */
  generateNovelId(url, title) {
    if (!url || typeof url !== "string") {
      this.logger.warn("Invalid URL provided for novel ID generation");
      return null;
    }

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, "");

      const novelName = this.#extractNovelName(title, urlObj);

      if (!novelName) {
        this.logger.warn("Could not extract novel name from title or URL");
        const pathSegment =
          urlObj.pathname.split("/").filter((s) => s.length > 0)[0] ||
          "unknown";
        const fallbackNovelId = this.#createCleanId(domain, pathSegment);

        this.logger.warn(`Using fallback novel ID: ${fallbackNovelId}`);
        this.novelId = fallbackNovelId;
        return fallbackNovelId;
      }

      this.novelId = this.#createCleanId(domain, novelName);

      return this.novelId;
    } catch (error) {
      this.logger.error("Error generating novel ID:", error);
      return null;
    }
  }

  /**
   * Create a clean novel ID from domain and novel name
   * @param {string} domain - Domain name
   * @param {string} novelName - Novel name
   * @return {string} - Clean novel ID
   * @private
   */
  #createCleanId(domain, novelName) {
    const clean = (str) =>
      str
        .toLowerCase()
        .replace(/[^\w]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    const cleanDomain = clean(domain);
    let cleanNovelName = clean(novelName);
    let novelId = `${cleanDomain}__${cleanNovelName}`;

    if (novelId.length > 50) {
      const initials = novelName.match(/\b\w/g)?.join("").toLowerCase() || "x";
      cleanNovelName = initials;
      novelId = `${cleanDomain}__${cleanNovelName}`;
    }

    return novelId;
  }

  /**
   * Extract novel name from title or URL
   * @param {string} title - Page title
   * @param {URL} urlObj - URL object
   * @return {string|null} - Extracted novel name
   * @private
   */
  #extractNovelName(title, urlObj) {
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
  #cleanTitleForNovelName(title) {
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
  #extractFromUrlPath(urlObj) {
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
  isDifferentNovel(currentNovelId, storedNovelId) {
    if (!currentNovelId || !storedNovelId) {
      return true;
    }

    const currentDomain = currentNovelId.split("__")[0];
    const storedDomain = storedNovelId.split("__")[0];

    if (currentDomain !== storedDomain) {
      return true;
    }

    return currentNovelId !== storedNovelId;
  }

  getNovelId() {
    return this.novelId;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelIdGenerator;
} else {
  window.NovelIdGenerator = NovelIdGenerator;
}
