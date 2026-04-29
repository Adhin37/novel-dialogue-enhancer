// e2e/content/text-detection.spec.js
// Verifies that findContentElement() logic locates novel text on every manifest.json site.
// Uses a plain browser (no extension loaded) — tests the selector strategy only.
// Sites behind Cloudflare / bot-protection or login walls are skipped gracefully.
const { test, expect, chromium } = require('@playwright/test');

// ── Selector tables (kept in sync with content-selectors.js) ──────────────────

const SITE_SELECTORS = {
  'webnovel.com':        ['.chapter-content', '.cha-paragraph', '#chapter-content'],
  'fanmtl.com':          ['.chapter-content', '#chapter-content', '.reading-content', '.chapter-body'],
  'novelupdates.com':    ['.entry-content', '#nnv', '.novel_synopsis', '.text'],
  'wuxiaworld.com':      ['.chapter-content', '.chapter-body', '#chapter-content'],
  'royalroad.com':       ['.chapter-content', '#chapter-content'],
  'scribblehub.com':     ['.chp_raw', '.chapter-content'],
  'lightnovelworld.org': ['.chapter-content', '#chapter-content', '.chapter-body'],
  'novelbin.com':        ['#chr-content', '.chapter-content'],
  'novelbin.me':         ['#chr-content', '.chapter-content'],
  'novelfire.net':       ['.chapter-body', '.chapter-content', '#chapter-content'],
  'wtr-lab.com':         ['.reading-content', '.chapter-content', '#chapter-content'],
  'novelbuddy.com':      ['.novel-reader-content', '.novel-tts-content', '.chapter-body', '.chapter-content'],
  'novelpub.com':        ['.chapter-content', '#chapter-content', '.reading-content'],
};

const GENERIC_SELECTORS = [
  '.chapter-content', '#chapter-content', '.chp_raw', '#chr-content',
  '.chapter-body', '.cha-paragraph', '.reading-content',
  '.novel_content', '.chapter-text', '.entry-content', '.text-content',
  '.article-content', '.content-area', "article .content",
  "[class*='chapter-content']", "[id*='chapter-content']",
  "[class*='chapter-body']", "[class*='reading-content']", "[class*='novel-content']",
];

// ── Site definitions ───────────────────────────────────────────────────────────

const SITES = [
  {
    name: 'webnovel.com',
    url: 'https://www.webnovel.com/book/book-of-authors_10589139205070105/becoming-a-starter-level-author_28425258390308456',
  },
  {
    name: 'fanmtl.com',
    url: 'https://www.fanmtl.com/novel/ke383028_1.html',
  },
  {
    name: 'novelupdates.com',
    url: 'https://www.novelupdates.com/series/the-legendary-mechanic/',
    // Synopsis/description page — content found via .entry-content or fallback
    minLength: 100,
  },
  {
    name: 'wuxiaworld.com',
    url: 'https://www.wuxiaworld.com/novel/coiling-dragon/cd-book-1-chapter-1',
  },
  {
    name: 'royalroad.com',
    url: 'https://www.royalroad.com/fiction/21220/mother-of-learning/chapter/301778/1-good-morning-brother',
  },
  {
    name: 'scribblehub.com',
    url: 'https://www.scribblehub.com/read/26766-he-who-fights-with-monsters/chapter/80296/',
  },
  {
    name: 'lightnovelworld.org',
    url: 'https://lightnovelworld.org/novel/sss-talent-from-trash-to-tyrant/chapter/1/',
  },
  {
    name: 'novelbin.com',
    url: 'https://novelbin.com/b/global-game-afk-in-the-zombie-apocalypse-game/chapter-3137-expansion',
  },
  {
    name: 'novelfire.net',
    url: 'https://novelfire.net/book/the-more-tragic-i-act-the-stronger-i-get-my-fans-beg-me-to-stop-killing-off-my-roles/chapter-1',
  },
  {
    name: 'wtr-lab.com',
    url: 'https://www.wtr-lab.com/en/novel/65569/transmigrated-into-warhammer-commanding-hyper-zetton/chapter-1',
  },
  {
    name: 'novelbuddy.com',
    url: 'https://novelbuddy.com/omniscient-readers-viewpoint/chapter-0',
  },
  {
    name: 'novelpub.com',
    url: 'https://www.novelpub.com/novel/versatile-mage-25052292/chapter-1',
  },
];

// ── Detection logic (mirrors findContentElement from content-detector.js) ─────

/**
 * Runs the selector detection strategy inside the page context.
 * Returns { found, selector, textLength, text, finalUrl }.
 */
async function detectContent(page, siteSelectors) {
  return page.evaluate(({ siteSelSrc, genericSrc }) => {
    const MIN_LENGTH = 200;

    // Build deduped selector list: site-specific first, then generic remainder
    const seen = new Set(siteSelSrc);
    const allSelectors = [
      ...siteSelSrc,
      ...genericSrc.filter(s => !seen.has(s)),
    ];

    for (const sel of allSelectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.length >= MIN_LENGTH) {
            return {
              found: true,
              selector: sel,
              textLength: text.length,
              text: text.slice(0, 200),
              finalUrl: location.href,
            };
          }
        }
      } catch (_) { /* invalid selector — skip */ }
    }

    // Fallback: largest container with ≥5 paragraphs
    let best = null;
    let maxLen = 0;
    document.querySelectorAll('div, article, section').forEach(container => {
      const ps = container.querySelectorAll('p');
      if (ps.length >= 5) {
        let totalText = '';
        ps.forEach(p => { totalText += p.textContent; });
        if (totalText.length > maxLen) {
          maxLen = totalText.length;
          const tag = container.tagName.toLowerCase();
          const id = container.id ? '#' + container.id : '';
          const cls = container.className
            ? '.' + String(container.className).trim().split(/\s+/)[0]
            : '';
          best = `${tag}${id}${cls}`;
        }
      }
    });

    if (best && maxLen >= MIN_LENGTH) {
      return { found: true, selector: `fallback:${best}`, textLength: maxLen, text: '', finalUrl: location.href };
    }

    return { found: false, selector: null, textLength: 0, text: '', finalUrl: location.href };
  }, { siteSelSrc: siteSelectors, genericSrc: GENERIC_SELECTORS });
}

// ── Bot / paywall / stale-URL detection ───────────────────────────────────────

/**
 * Returns flags describing why a page should be skipped.
 * @param {import('@playwright/test').Page} page
 * @param {string} originalUrl - The URL we tried to navigate to
 */
async function checkBlocked(page, originalUrl) {
  return page.evaluate((origUrl) => {
    const title = document.title.toLowerCase();
    const hasCfChallenge = !!document.querySelector(
      '#cf-challenge-running, #challenge-running, .cf-browser-verification'
    );
    const bodyText = (document.body || {}).innerText || '';
    const bodyLen = bodyText.trim().length;

    const isCloudflare =
      title.includes('just a moment') ||
      title.includes('attention required') ||
      hasCfChallenge;

    const isLoginWall = !!document.querySelector(
      'form[action*="login"], .login-wall, .paywall, [class*="paywall"], [class*="login-modal"]'
    );

    // True 404 / generic error pages
    const isErrorPage =
      title.includes('404') ||
      title.includes('not found') ||
      title.includes('page not found') ||
      title.includes('error 4') ||
      title.includes('forbidden') ||
      title.includes('access denied');

    // Empty / still-loading page
    const isEmptyPage = bodyLen < 300 && (title === '' || title === 'loading...');

    // Stale / wrong URL: the page loaded but has almost no text, so it can't
    // possibly be a chapter page (guards against wrong series IDs, etc.)
    const isTooSparse = bodyLen < 800;

    // Redirected away from the chapter path to a root/homepage
    let isRedirectedToRoot = false;
    try {
      const origPath = new URL(origUrl).pathname.replace(/\/$/, '');
      const curPath  = location.pathname.replace(/\/$/, '');
      isRedirectedToRoot = (curPath === '' || curPath === '/') && origPath.length > 3;
    } catch (_) {}

    return { isCloudflare, isLoginWall, isErrorPage, isEmptyPage, isTooSparse, isRedirectedToRoot, title, bodyLen };
  }, originalUrl);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('Text detection — all manifest.json sites', () => {
  let browser;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  test.afterAll(async () => {
    if (browser) await browser.close();
  });

  for (const site of SITES) {
    test(`detects novel content on ${site.name}`, async () => {
      test.setTimeout(60_000);

      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      const page = await context.newPage();

      try {
        // Navigate — follow CDN/redirect chains automatically
        await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45_000 });

        // Let CDN-loaded / JS-rendered content settle
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

        const finalUrl = page.url();
        console.log(`[${site.name}] final URL: ${finalUrl}`);

        // Skip if the site redirected us to a completely different domain (bot evasion)
        try {
          const expectedHost = new URL(site.url).hostname.replace(/^www\./, '');
          const actualHost   = new URL(finalUrl).hostname.replace(/^www\./, '');
          if (!actualHost.endsWith(expectedHost) && !expectedHost.endsWith(actualHost)) {
            test.skip(true, `${site.name} — redirected off-domain to ${actualHost} (bot detection)`);
            return;
          }
        } catch (_) {}

        // Skip if behind Cloudflare, login wall, 404, or clearly not a chapter page
        const blockState = await checkBlocked(page, site.url);
        console.log(`[${site.name}] title: "${blockState.title}" bodyLen: ${blockState.bodyLen}`);

        if (blockState.isCloudflare) {
          test.skip(true, `${site.name} — Cloudflare / bot-protection challenge`);
          return;
        }
        if (blockState.isLoginWall) {
          test.skip(true, `${site.name} — login wall or paywall detected`);
          return;
        }
        if (blockState.isErrorPage) {
          test.skip(true, `${site.name} — 404 / error page (stale URL)`);
          return;
        }
        if (blockState.isEmptyPage) {
          test.skip(true, `${site.name} — empty or still-loading page`);
          return;
        }
        if (blockState.isRedirectedToRoot) {
          test.skip(true, `${site.name} — redirected to homepage (stale URL)`);
          return;
        }
        if (blockState.isTooSparse) {
          test.skip(true, `${site.name} — page body too sparse to be a chapter (bodyLen: ${blockState.bodyLen})`);
          return;
        }

        // Dismiss any info/promotion popups (e.g. "Got it!", "×") before detection
        for (const sel of ['button:has-text("Got it")', 'button:has-text("OK")', 'button:has-text("Close")', '[class*="modal"] button:last-child', '[class*="modal"] [class*="close"]']) {
          await page.locator(sel).first().click({ timeout: 1000 }).catch(() => {});
        }

        // Run detection
        const siteSelectors = SITE_SELECTORS[site.name] ?? [];
        const result = await detectContent(page, siteSelectors);

        console.log(
          `[${site.name}] selector="${result.selector}" textLength=${result.textLength}`
        );
        if (result.text) {
          console.log(`[${site.name}] sample: "${result.text.slice(0, 200)}"`);
        }

        const minLength = site.minLength ?? 200;
        expect(result.found, `No content element found on ${site.name}`).toBe(true);
        expect(result.textLength).toBeGreaterThanOrEqual(minLength);
      } finally {
        await page.close().catch(() => {});
        await context.close().catch(() => {});
      }
    });
  }
});
