// tests/e2e/specs/08.model-guard.spec.js
// Test 14: warning toaster appears and DOM is unchanged when the configured model is not installed.
const { test, expect } = require('../fixtures/extension.fixture');
const { ChapterPage } = require('../pages/ChapterPage');
const { fetchOllamaModels } = require('../helpers/ollama');

const MOCK_URL = 'https://www.webnovel.com/book/11111111111111111/11111111111111111';
const UNAVAILABLE_MODEL = 'gemma3:4b';
const HOSTNAME = 'www.webnovel.com';

const MOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Chapter 1 — Model Guard Test</title></head>
<body>
  <div class="chapter-content">
    <p>Li Wei pushed open the hall door. He brows knit tightly as he survey the damage before him.</p>
    <p>Xu Mengyao feel her heart clench. "This lord not need explain himself to you."</p>
    <p>Silence fall over hall. Only wind howl outside could be hear.</p>
  </div>
</body></html>`;

test.describe('model-not-installed guardrail', () => {
  let ollamaAvailable = false;
  let previousModel = null;
  let chapterPage = null;

  test.beforeAll(async ({ extensionContext }) => {
    const { background, context } = extensionContext;

    const models = await fetchOllamaModels();
    ollamaAvailable = models.length > 0;
    if (!ollamaAvailable) return;

    // Sanity: gemma3:4b must NOT be installed, otherwise the test is a false positive.
    if (models.includes(UNAVAILABLE_MODEL)) {
      console.warn(`[model-guard] ${UNAVAILABLE_MODEL} is actually installed — test would be a false positive; skipping.`);
      ollamaAvailable = false;
      return;
    }

    previousModel = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get('modelName', (d) => resolve(d.modelName || null))
      )
    );

    await background.evaluate((model) =>
      new Promise((resolve) => chrome.storage.sync.set({ modelName: model }, resolve)),
      UNAVAILABLE_MODEL
    );

    await background.evaluate((host) =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = data.whitelistedSites || [];
          if (!sites.includes(host)) sites.push(host);
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      ),
      HOSTNAME
    );
    await background.evaluate(() => { whitelistCache.clear(); });

    await context.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: MOCK_HTML,
      });
    });
  });

  test.afterAll(async ({ extensionContext }) => {
    const { context, background } = extensionContext;

    if (chapterPage) await chapterPage.close();
    await context.unroute(MOCK_URL).catch(() => {});

    if (previousModel) {
      await background.evaluate((model) =>
        new Promise((resolve) => chrome.storage.sync.set({ modelName: model }, resolve)),
        previousModel
      );
    }

    await background.evaluate((host) =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = (data.whitelistedSites || []).filter((s) => s !== host);
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      ),
      HOSTNAME
    );
    await background.evaluate(() => { whitelistCache.clear(); });
  });

  test('shows warning toaster and stops enhancement when configured model is not installed', async ({ extensionContext }) => {
    test.skip(!ollamaAvailable, 'Skipped: Ollama not reachable, has no models, or gemma3:4b is actually installed.');
    test.setTimeout(30_000);

    const { context } = extensionContext;
    chapterPage = new ChapterPage(context);
    await chapterPage.open(MOCK_URL, {
      logConsole: true,
      logPrefix: '[model-guard]',
      logPattern: /Novel Dialogue|Ollama|model|enhancement|Enhancement/i,
    });

    const originalText = await chapterPage.chapterContent().textContent();
    expect(originalText).toContain('He brows knit tightly');

    await chapterPage.waitForModelGuardToast(UNAVAILABLE_MODEL);

    const toastText = await chapterPage.toasterText().textContent();
    expect(toastText).toContain(UNAVAILABLE_MODEL);

    const afterText = await chapterPage.chapterContent().textContent();
    expect(afterText).toContain('He brows knit tightly');
    expect(afterText).toContain('Silence fall over hall');
  });
});
