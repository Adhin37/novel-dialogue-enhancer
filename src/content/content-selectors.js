// Per-site selector maps — tried before the generic CONTENT list.
// Keys are canonical hostnames without "www." prefix; values are ordered by confidence.
// Subdomain variants (e.g. m.novelbin.com) are matched automatically.
export const SiteSelectors = {
  'webnovel.com':        ['.chapter-content', '.cha-paragraph', '#chapter-content'],
  'fanmtl.com':          ['.chapter-content', '#chapter-content', '.reading-content', '.chapter-body'],
  'novelupdates.com':    ['.entry-content', '#nnv', '.novel_synopsis', '.text'],
  'wuxiaworld.com':      ['.chapter-content', '.chapter-body', '#chapter-content'],
  'royalroad.com':       ['.chapter-content', '#chapter-content'],
  'scribblehub.com':     ['.chp_raw', '.chapter-content'],
  'lightnovelworld.org': ['.chapter-content', '#chapter-content', '.chapter-body'],
  'novelbin.com':        ['#chr-content', '.chapter-content'],
  'novelbin.me':         ['#chr-content', '.chapter-content'],
  'novelfire.net':       ['.chapter-body', "[class*='chapter-content']", '.chapter-content', '#chapter-content'],
  'wtr-lab.com':         ['.chapter-body', '.reading-content', '.chapter-content', '#chapter-content'],
  'novelbuddy.com':      ['.novel-reader-content', '.novel-tts-content', '.chapter-body', '.chapter-content'],
  'novelpub.com':        ['.chapter-content', '#chapter-content', '.reading-content'],
};

// CSS selectors for novel content detection, listed in priority order — first match wins.
// Used as fallback after site-specific selectors, and as the full list for unknown/whitelisted sites.
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
    "article .content",
    // Attribute-substring fallbacks — cover user-whitelisted sites with non-standard class names
    "[class*='chapter-content']",
    "[id*='chapter-content']",
    "[class*='chapter-body']",
    "[class*='reading-content']",
    "[class*='novel-content']",
  ],
  FALLBACK: "div, article, section"
};
