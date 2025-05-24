// novel-chapter-detector.js
/**
 * Detects chapter information from various sources
 */
class NovelChapterDetector {
    /**
     * Detect chapter information from title and content
     * @param {string} title - Page title
     * @param {string} content - Page content
     * @param {string} url - Current URL
     * @return {object} - Chapter information
     */
    detectChapterInfo(title, content, url) {
      const chapterInfo = {
        isChapter: false,
        chapterNumber: null
      };
  
      if (!title) return chapterInfo;
  
      // First check for standard chapter patterns in title
      const chapterPatterns = [
        /chapter\s+(\d+)/i,
        /ch\.?\s*(\d+)/i,
        /episode\s+(\d+)/i,
        /part\s+(\d+)/i
      ];
  
      for (const pattern of chapterPatterns) {
        const match = title.match(pattern);
        if (match) {
          chapterInfo.isChapter = true;
          chapterInfo.chapterNumber = parseInt(match[1], 10);
          break;
        }
      }
  
      // Check for chapter heading in content if not found in title
      if (!chapterInfo.isChapter && content) {
        const headingMatch = content.match(
          /\b(chapter|ch\.)\s+(\d+)[:\s]+(.*?)(\n|$)/i
        );
        if (headingMatch) {
          chapterInfo.isChapter = true;
          chapterInfo.chapterNumber = parseInt(headingMatch[2], 10);
        }
      }
  
      // Try to extract chapter numbers from URL if still not found
      if (!chapterInfo.isChapter || chapterInfo.chapterNumber === null) {
        const urlChapterInfo = this.#extractChapterFromUrl(url);
        if (urlChapterInfo.isChapter) {
          chapterInfo.isChapter = urlChapterInfo.isChapter;
          chapterInfo.chapterNumber = urlChapterInfo.chapterNumber;
        }
      }
  
      return chapterInfo;
    }
  
    /**
     * Extract chapter information from URL
     * @param {string} url - URL to analyze
     * @return {object} - Chapter information
     * @private
     */
    #extractChapterFromUrl(url) {
      const chapterInfo = {
        isChapter: false,
        chapterNumber: null
      };
  
      if (!url) return chapterInfo;
  
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split("/");
  
        // Look for patterns like /chapter-123/ or /123/ in the URL
        for (const part of pathParts) {
          // Check for chapter numbers in URL segments
          const chapterNumMatch =
            part.match(/chapter[\\-_]?(\d+)/i) ||
            part.match(/ch[\\-_]?(\d+)/i) ||
            part.match(/^(\d+)$/);
  
          if (chapterNumMatch) {
            chapterInfo.isChapter = true;
            chapterInfo.chapterNumber = parseInt(chapterNumMatch[1], 10);
            break;
          }
        }
  
        // Check for query parameters like ?chapter=123
        if (!chapterInfo.isChapter && urlObj.searchParams) {
          const chapterParam =
            urlObj.searchParams.get("chapter") ||
            urlObj.searchParams.get("chap") ||
            urlObj.searchParams.get("c");
  
          if (chapterParam && /^\d+$/.test(chapterParam)) {
            chapterInfo.isChapter = true;
            chapterInfo.chapterNumber = parseInt(chapterParam, 10);
          }
        }
      } catch (err) {
        console.warn("Error parsing URL for chapter info:", err);
      }
  
      return chapterInfo;
    }
  }
  
  if (typeof module !== "undefined") {
    module.exports = NovelChapterDetector;
  } else {
    window.NovelChapterDetector = NovelChapterDetector;
  }