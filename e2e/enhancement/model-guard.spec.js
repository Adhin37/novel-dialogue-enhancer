// tests/e2e/specs/08.model-guard.spec.js
// Test 14: warning toaster appears and DOM is unchanged when the configured model is not installed.
const { test, expect } = require('../fixtures/extension.fixture');
const { ChapterPage } = require('../pages/chapter-page');
const { fetchOllamaModels, probeGenerate, installOllamaProxyRoute } = require('../helpers/ollama');

// Public WebNovel chapter — free, no login required, 59 .cha-paragraph elements.
const REAL_URL = 'https://www.webnovel.com/book/book-of-authors_10589139205070105/becoming-a-starter-level-author_28425258390308456';
const UNAVAILABLE_MODEL = 'gemma3:4b';
const HOSTNAME = 'www.webnovel.com';

test.describe('model-not-installed guardrail', () => {
  let ollamaAvailable = false;
  let proxyInstalled = false;
  let previousModel = null;
  let chapterPage = null;

  test.beforeAll(async ({ extensionContext }) => {
    const { background, context } = extensionContext;

    const models = await fetchOllamaModels();
    ollamaAvailable = models.length > 0;
    if (!ollamaAvailable) return;

    // gemma3:4b must NOT be installed — otherwise the guard never fires (false positive).
    if (models.includes(UNAVAILABLE_MODEL)) {
      console.warn(`[model-guard] ${UNAVAILABLE_MODEL} is installed — skipping to avoid false positive.`);
      ollamaAvailable = false;
      return;
    }

    // Probe with a chrome-extension:// Origin.
    // status 0  → Ollama does a TCP RST (no HTTP response) — Ollama 0.6+ blocks at socket level.
    // status 403 → Ollama responds with HTTP 403.
    // Since fetchOllamaModels() confirmed Ollama is reachable, both mean the extension
    // context is blocked and the proxy is needed. Any other status (200) means direct access works.
    const probeStatus = await probeGenerate(models[0]);
    if (probeStatus === 0 || probeStatus === 403) {
      await installOllamaProxyRoute(context, '[model-guard]');
      proxyInstalled = true;
    }

    previousModel = await background.evaluate(() =>
      new Promise((r) => chrome.storage.sync.get('modelName', (d) => r(d.modelName ?? null)))
    );

    await background.evaluate(
      (model) => new Promise((r) => chrome.storage.sync.set({ modelName: model }, r)),
      UNAVAILABLE_MODEL
    );

    await background.evaluate(
      (host) => new Promise((r) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = data.whitelistedSites || [];
          if (!sites.includes(host)) sites.push(host);
          chrome.storage.sync.set({ whitelistedSites: sites }, r);
        })
      ),
      HOSTNAME
    );
    await background.evaluate(() => { whitelistCache.clear(); });
  });

  test.afterAll(async ({ extensionContext }) => {
    const { context, background } = extensionContext;

    if (chapterPage) await chapterPage.close();

    if (previousModel !== null) {
      await background.evaluate(
        (model) => new Promise((r) => chrome.storage.sync.set({ modelName: model }, r)),
        previousModel
      );
    }

    await background.evaluate(
      (host) => new Promise((r) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = (data.whitelistedSites || []).filter((s) => s !== host);
          chrome.storage.sync.set({ whitelistedSites: sites }, r);
        })
      ),
      HOSTNAME
    );
    await background.evaluate(() => { whitelistCache.clear(); });

    if (proxyInstalled) await context.unroute('http://localhost:11434/**').catch(() => {});
  });

  test('shows warning toaster and leaves DOM unchanged when configured model is not installed', async ({ extensionContext }) => {
    test.skip(!ollamaAvailable, 'Skipped: Ollama unavailable, no models found, or gemma3:4b is installed.');
    test.setTimeout(30_000);

    const { context } = extensionContext;
    chapterPage = new ChapterPage(context);
    await chapterPage.open(REAL_URL, {
      logConsole: true,
      logPrefix: '[model-guard]',
      logPattern: /Novel Dialogue|Ollama|model|enhancement|Enhancement|model-guard/i,
      waitUntil: 'domcontentloaded',
      navTimeout: 15_000,
      detectModelGuard: UNAVAILABLE_MODEL,
    });

    const contentVisible = await chapterPage.page
      .locator('.cha-paragraph')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);

    test.skip(!contentVisible, 'Chapter content (.cha-paragraph) not visible — page may have redirected or shown a login wall.');

    const originalText = await chapterPage.page.locator('.cha-paragraph').first().textContent();

    await chapterPage.waitForModelGuardToast(UNAVAILABLE_MODEL);

    // waitForModelGuardToast resolves only after detecting the [model-guard] warn.
    expect(chapterPage._modelGuardDetected).toBe(true);

    // DOM content must be identical to the original — enhancement was blocked.
    const afterText = await chapterPage.page.locator('.cha-paragraph').first().textContent();
    expect(afterText).toBe(originalText);
  });
});
