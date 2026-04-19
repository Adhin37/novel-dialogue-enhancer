// CSS selectors for novel content detection, listed in priority order — first match wins
export const ContentSelectors = {
  CONTENT: [
    // Generic (covers royalroad, lightnovelworld, wuxiaworld, novelbuddy, novelpub, wtr-lab…)
    ".chapter-content",
    "#chapter-content",
    // ScribbleHub
    ".chp_raw",
    // NovelBin
    "#chr-content",
    // NovelFire / NovelBuddy variants
    ".chapter-body",
    // WebNovel (fallback container)
    ".cha-paragraph",
    // WTR-LAB / misc reading sites
    ".reading-content",
    // Generic fallbacks
    ".novel_content",
    ".chapter-text",
    ".entry-content",
    ".text-content",
    ".article-content",
    ".content-area",
    "article .content"
  ],
  FALLBACK: "div, article, section"
};
