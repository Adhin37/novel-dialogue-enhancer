// tests/e2e/specs/07.mtl-real.spec.js
// Test 13: MTL enhancement — real NovelBin chapter (no mock, live network).
const { test, expect } = require('../fixtures/extension.fixture');
const { ChapterPage } = require('../pages/ChapterPage');
const { resolveOllamaModel } = require('../helpers/ollama');

const REAL_URL =
  'https://novelbin.com/b/global-game-afk-in-the-zombie-apocalypse-game/chapter-3137-expansion';
const HOSTNAME = 'novelbin.com';
const CONTENT_SELECTOR = '#chr-content';

test.describe('MTL enhancement — real NovelBin chapter (no mock)', () => {
  let ollamaAvailable = false;
  let proxyInstalled = false;
  let realChapterPage = null;
  let resolvedModel = null;

  test.beforeAll(async ({ extensionContext }) => {
    const { background, context } = extensionContext;

    const storedModel = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get('modelName', (d) => resolve(d.modelName || 'qwen3.5:4b'))
      )
    );

    const result = await resolveOllamaModel(storedModel, context, '[real-url]');
    resolvedModel = result.model;
    proxyInstalled = result.proxyInstalled;
    ollamaAvailable = resolvedModel !== null;

    if (resolvedModel && resolvedModel !== storedModel) {
      await background.evaluate(
        (model) => new Promise((resolve) => chrome.storage.sync.set({ modelName: model }, resolve)),
        resolvedModel
      );
    }

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
  });

  test.afterAll(async ({ extensionContext }) => {
    const { context, background } = extensionContext;

    if (realChapterPage) await realChapterPage.close();

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

    if (proxyInstalled) {
      await context.unroute('http://localhost:11434/**').catch(() => {});
    }
  });

  test('extension enhances real MTL chapter on NovelBin', async ({ extensionContext }) => {
    test.skip(!ollamaAvailable, [
      'Skipped: Ollama not reachable, no models found,',
      'or POST /api/generate returned a connection error.',
      'Start Ollama with: OLLAMA_ORIGINS=chrome-extension://* ollama serve',
    ].join(' '));

    test.setTimeout(300_000);

    const { context } = extensionContext;
    realChapterPage = new ChapterPage(context);
    await realChapterPage.open(REAL_URL, {
      logConsole: true,
      logPrefix: '[real-page]',
      logPattern: /Novel Dialogue|Ollama|whitelist|nhancement|chapter|chr-content|num_ctx/i,
      waitUntil: 'load',
      navTimeout: 30_000,
      networkIdle: true,
    });

    const finalUrl = realChapterPage.page.url();
    console.log(`[real-url] Final URL after navigation: ${finalUrl}`);

    const pageState = await realChapterPage.page.evaluate(() => ({
      title: document.title,
      has_chr_content:   !!document.querySelector('#chr-content'),
      has_cha_page_in:   !!document.querySelector('#cha-page-in'),
      has_cha_paragraph: document.querySelectorAll('.cha-paragraph').length,
      body_classes:      document.body.className.split(' ').slice(0, 5).join(' '),
    }));
    console.log('[real-url] Page state:', JSON.stringify(pageState));

    const contentVisible = await realChapterPage.chrContent()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    console.log(`[real-url] Debug: ${CONTENT_SELECTOR} visible = ${contentVisible}`);

    test.skip(
      !contentVisible,
      `${CONTENT_SELECTOR} not found — page may have redirected, shown a login wall, ` +
      'or changed its DOM structure. Check "Page state" and "Final URL" in the log above.'
    );

    const originalText = await realChapterPage.chrContent().textContent();
    console.log(`[real-url] Original content sample (first 200 chars): "${originalText?.slice(0, 200)}"`);
    expect(originalText).toBeTruthy();
    expect(originalText.trim().length).toBeGreaterThan(100);

    await realChapterPage.waitForEnhancement(CONTENT_SELECTOR, originalText, 240_000);

    const enhancedText = await realChapterPage.chrContent().textContent();
    console.log(`[real-url] Enhanced content sample (first 200 chars): "${enhancedText?.slice(0, 200)}"`);

    expect(enhancedText).not.toBe(originalText);
    expect(enhancedText.trim().length).toBeGreaterThan(100);
  });
});
