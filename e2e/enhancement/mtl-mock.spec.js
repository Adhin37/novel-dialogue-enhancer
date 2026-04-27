// tests/e2e/specs/06.mtl-mock.spec.js
// Test 12: MTL enhancement — WebNovel chapter served from mock HTML.
const { test, expect } = require('../fixtures/extension.fixture');
const { ChapterPage } = require('../pages/chapter-page');
const { resolveOllamaModel } = require('../helpers/ollama');

// A real chapter URL pattern so the manifest content_script rule fires.
const MOCK_URL = 'https://www.webnovel.com/book/00000000000000000/00000000000000000';

// Typical MTL defects used as ground-truth assertions.
const MTL_TEXT = [
  'Li Wei pushed open the hall door. He brows knit tightly as he survey the damage before him.',
  '"You actually dare show your face here!" The cold voice belong to Xu Mengyao, who stand in center of hall, hand clasped behind her back. "After what you do to this lord\'s city?"',
  'Li Wei let out cold snort. "This lord not need explain himself to you, a mere cultivator of third realm."',
  'Xu Mengyao feel her heart clench. The rage inside she was almost too much to control. He breath came out ragged.',
  '"You..." He voice tremble. The eyes of Xu Mengyao become red. "You kill him. You kill my brother!"',
  'Zhang Hu, who stand silently by doorframe, feel uncomfortable with scene. He watch as tears begin to fall from Xu Mengyao eye. He heart feel heavy.',
  '"The weak exist to be consumed by strong." Li Wei voice was without mercy. "Your brother was weak. He die as is natural."',
  'Xu Mengyao clench his fist. The nails dig deep into palm, and pain clear she head. She look straight into eye of Li Wei, and he saw determination there.',
  '"I will become stronger than you." She say, voice quiet but firm. "And on that day, this lord will make you understand what regret feel like."',
  'Silence fall over hall. Only wind howl outside could be hear.',
].join('\n\n');

const MOCK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chapter 1: The Hall — MTL E2E Test</title>
</head>
<body>
  <div class="chapter-content">${MTL_TEXT.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</div>
</body>
</html>`;

test.describe('MTL enhancement — WebNovel chapter (mock)', () => {
  let ollamaAvailable = false;
  let proxyInstalled = false;
  let chapterPage = null;
  let resolvedModel = null;

  test.beforeAll(async ({ extensionContext }) => {
    const { background, context } = extensionContext;

    const storedModel = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get('modelName', (d) => resolve(d.modelName || 'qwen3.5:4b'))
      )
    );

    const result = await resolveOllamaModel(storedModel, context, '[MTL]');
    resolvedModel = result.model;
    proxyInstalled = result.proxyInstalled;
    ollamaAvailable = resolvedModel !== null;

    if (resolvedModel && resolvedModel !== storedModel) {
      await background.evaluate(
        (model) => new Promise((resolve) => chrome.storage.sync.set({ modelName: model }, resolve)),
        resolvedModel
      );
    }

    await context.route(MOCK_URL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: MOCK_HTML,
      });
    });

    await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = data.whitelistedSites || [];
          if (!sites.includes('www.webnovel.com')) sites.push('www.webnovel.com');
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      )
    );
    await background.evaluate(() => { whitelistCache.clear(); });
  });

  test.afterAll(async ({ extensionContext }) => {
    const { context, background } = extensionContext;

    if (chapterPage) await chapterPage.close();

    await context.unroute(MOCK_URL).catch(() => {});

    await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = (data.whitelistedSites || []).filter((s) => s !== 'www.webnovel.com');
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      )
    );
    await background.evaluate(() => { whitelistCache.clear(); });

    if (proxyInstalled) {
      await context.unroute('http://localhost:11434/**').catch(() => {});
    }
  });

  test('extension rewrites MTL chapter DOM and fixes known translation defects', async ({ extensionContext }) => {
    if (!ollamaAvailable) {
      test.skip(true, [
        'Skipped: Ollama not reachable, no models found,',
        'or POST /api/generate returned 403.',
        'To enable: restart Ollama with OLLAMA_ORIGINS=chrome-extension://*',
        '  e.g.  OLLAMA_ORIGINS=chrome-extension://* ollama serve',
      ].join(' '));
    }

    test.setTimeout(180_000);

    const { context } = extensionContext;
    chapterPage = new ChapterPage(context);
    await chapterPage.open(MOCK_URL, {
      logConsole: true,
      logPrefix: '[MTL-page]',
      logPattern: /Novel Dialogue|Ollama|whiteList|whitelist|Site|enhancement|Enhancement/i,
    });

    const originalText = await chapterPage.chapterContent().textContent();
    expect(originalText).toContain('He brows knit tightly');
    expect(originalText).toContain('This lord not need explain');
    expect(originalText).toContain('He breath came out ragged');
    expect(originalText).toContain('Silence fall over hall');

    await chapterPage.waitForEnhancement('.chapter-content', originalText, 120_000);

    const enhancedText = await chapterPage.chapterContent().textContent();
    expect(enhancedText).not.toBe(originalText);
    expect(enhancedText.length).toBeGreaterThan(100);
    expect(enhancedText).not.toContain('He brows knit tightly');
    expect(enhancedText).not.toContain('He breath came out ragged');
    expect(enhancedText).not.toContain('Silence fall over hall');
  });
});
