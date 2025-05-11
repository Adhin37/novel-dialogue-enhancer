// novelUtils.js
/**
 * Utility functions for novel processing
 */
class NovelUtils {
  constructor(url,title) {
    this.url = url;
    this.title = title;
    this.novelId = "";
    console.log("Novel Dialogue Enhancer: Novel Utils initialized");
  }

  /**
   * Update the novel identifier based on URL and title
   * @param {string} url - URL of the novel
   * @param {string} title - Title of the novel
   * @return {string} - Unique novel identifier
   */
  updateNovelId(url,title) {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    let novelName = "";

    if (title) {
      const titleParts = title.split(/[|\-–—:]/);
      if (titleParts.length > 0) {
        novelName = titleParts[0].trim();
      }
    }

    if (!novelName) {
      novelName = title.replace(/[^\w\s]/g, "").trim();
    }

    const novelId = `${domain}_${novelName}`
      .toLowerCase()
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_")
      .replace(/_(\d+)(?=\.\w+$)/, "")
      .substring(0, 50);

    if (novelId !== this.novelId) {
      console.log(`Generated novel ID: ${novelId}`);
      this.novelId=novelId;
    }
    return novelId;
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelUtils;
} else {
  window.novelUtils = NovelUtils;
}
