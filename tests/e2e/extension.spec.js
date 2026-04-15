/**
 * E2E tests for Novel Dialogue Enhancer Chrome extension.
 * Tests major features via Playwright + a live Chromium instance.
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');
const http = require('http');

const extensionPath = path.resolve(__dirname, '../..');

/** Shared browser state across all tests (one context = one Chrome session). */
let context;
let background; // service worker Worker handle
let msgPage;    // popup page kept open for chrome.runtime.sendMessage relay
let extensionId;

/**
 * Send a message to the background service worker from the popup page context.
 * Using the popup page guarantees the message goes through the real chrome.runtime
 * message-passing pipeline (not a same-process shortcut).
 */
async function sendBgMessage(message) {
  return msgPage.evaluate(
    (msg) => new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve)),
    message
  );
}

// ---------------------------------------------------------------------------
// Suite setup / teardown
// ---------------------------------------------------------------------------

test.describe('Novel Dialogue Enhancer — E2E', () => {
  test.beforeAll(async () => {
    context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    // Navigate to a page — this wakes the service worker if it hasn't started yet
    const triggerPage = await context.newPage();
    await triggerPage.goto('about:blank');
    await triggerPage.close();

    // Poll for the service worker (may already have activated before we can attach a listener)
    let sw = null;
    const swDeadline = Date.now() + 20000;
    while (!sw && Date.now() < swDeadline) {
      [sw] = context.serviceWorkers();
      if (!sw) await new Promise((r) => setTimeout(r, 500));
    }
    if (!sw) throw new Error('Extension service worker never became available');
    background = sw;

    // Derive the extension ID from the service worker URL
    // e.g. "chrome-extension://abcdefgh.../background/background.js"
    extensionId = background.url().split('/')[2];

    // Wait for the background to finish initializing (polls isBackgroundReady)
    await background.evaluate(async () => {
      await new Promise((resolve) => {
        const id = setInterval(() => {
          if (typeof isBackgroundReady !== 'undefined' && isBackgroundReady) {
            clearInterval(id);
            resolve();
          }
        }, 100);
      });
    });

    // Open the popup page and keep it alive as a message relay
    msgPage = await context.newPage();
    await msgPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await msgPage.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await context.close();
  });

  // -------------------------------------------------------------------------
  // 1. Extension bootstraps correctly
  // -------------------------------------------------------------------------
  test('service worker initialises and background is ready', async () => {
    const { ready } = await background.evaluate(() => ({ ready: isBackgroundReady }));
    expect(ready).toBe(true);
    // Extension ID must be a 32-char lowercase string
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });

  // -------------------------------------------------------------------------
  // 2. Default sync settings
  // -------------------------------------------------------------------------
  test('sync settings are initialised with correct defaults', async () => {
    const settings = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.sync.get(
          ['modelName', 'temperature', 'topP', 'contextSize', 'timeout', 'preserveNames', 'fixPronouns'],
          resolve
        )
      )
    );
    expect(settings.modelName).toBe('qwen3:8b-q4_K_M');
    expect(settings.temperature).toBe(0.4);
    expect(settings.topP).toBe(0.9);
    expect(settings.contextSize).toBe(32768);
    expect(settings.timeout).toBe(300);
    expect(settings.preserveNames).toBe(true);
    expect(settings.fixPronouns).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. Periodic cleanup alarm is registered
  // -------------------------------------------------------------------------
  test('periodic cleanup alarm is registered with a 24-hour period', async () => {
    const alarms = await background.evaluate(() =>
      new Promise((resolve) => chrome.alarms.getAll(resolve))
    );
    const alarm = alarms.find((a) => a.name === 'periodicStorageCleanup');
    expect(alarm).toBeDefined();
    expect(alarm.periodInMinutes).toBe(1440); // 24 * 60
  });

  // -------------------------------------------------------------------------
  // 4. Novel data — round-trip via message handlers
  // -------------------------------------------------------------------------
  test('novel character data can be stored and retrieved via messages', async () => {
    const novelId = 'e2e_test__round_trip';

    const stored = await sendBgMessage({
      action: 'updateNovelData',
      novelId,
      chars: {
        Alice: { name: 'Alice', gender: 'f', confidence: 0.9, appearances: 10, evidences: ['she smiled'] },
        Bob:   { name: 'Bob',   gender: 'm', confidence: 0.8, appearances: 5,  evidences: ['he ran'] },
      },
      chapterNumber: 1,
    });
    expect(stored.status).toBe('ok');

    const retrieved = await sendBgMessage({ action: 'getNovelData', novelId });
    expect(retrieved.status).toBe('ok');
    expect(retrieved.characterMap['Alice'].gender).toBe('f');
    expect(retrieved.characterMap['Bob'].gender).toBe('m');
    expect(retrieved.enhancedChapters).toContainEqual({ chapterNumber: 1 });

    // Cleanup so later tests start clean
    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, novelId);
  });

  // -------------------------------------------------------------------------
  // 5. Cleanup purges novels not read for 90+ days
  // -------------------------------------------------------------------------
  test('periodic cleanup removes novels with lastAccess > 90 days ago', async () => {
    const staleId = 'e2e_test__stale_91d';
    const now = Date.now();

    // Inject a stale novel directly into the in-memory map
    await background.evaluate(({ id, ts }) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Old Hero', gender: 'm', appearances: 3, evidences: [] } },
        chaps: [1],
        style: null,
        lastAccess: ts,
      };
    }, { id: staleId, ts: now - 91 * 24 * 60 * 60 * 1000 });

    await background.evaluate(() => runPeriodicCleanup());
    await msgPage.waitForTimeout(800); // allow the async storage write to settle

    const stored = await background.evaluate(() =>
      new Promise((resolve) =>
        chrome.storage.local.get('novelCharacterMaps', (d) => resolve(d.novelCharacterMaps ?? {}))
      )
    );
    expect(Object.keys(stored)).not.toContain(staleId);
  });

  // -------------------------------------------------------------------------
  // 6. Cleanup preserves novels read within 90 days
  // -------------------------------------------------------------------------
  test('periodic cleanup keeps novels with lastAccess within 90 days', async () => {
    const freshId = 'e2e_test__fresh_30d';
    const now = Date.now();

    await background.evaluate(({ id, ts }) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Active Hero', gender: 'f', appearances: 5, evidences: [] } },
        chaps: [1, 2],
        style: null,
        lastAccess: ts,
      };
    }, { id: freshId, ts: now - 30 * 24 * 60 * 60 * 1000 });

    await background.evaluate(() => runPeriodicCleanup());
    await msgPage.waitForTimeout(800);

    // When nothing is removed, cleanup skips the storage write.
    // The in-memory map is the authoritative source — verify the novel is still there.
    const preserved = await background.evaluate((id) => id in novelCharacterMaps, freshId);
    expect(preserved).toBe(true);

    // Cleanup
    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, freshId);
  });

  // -------------------------------------------------------------------------
  // 7. Character gender manual override
  // -------------------------------------------------------------------------
  test('character gender can be manually overridden via message', async () => {
    const novelId = 'e2e_test__gender_override';

    // Seed with an ambiguous character (charId = 0)
    await background.evaluate((id) => {
      novelCharacterMaps[id] = {
        chars: { 0: { name: 'Jordan', gender: 'u', confidence: 0.5, appearances: 3, evidences: [] } },
        chaps: [1],
        style: null,
        lastAccess: Date.now(),
      };
    }, novelId);

    const result = await sendBgMessage({
      action: 'updateCharacterGender',
      novelId,
      charId: '0',
      newGender: 'female',
      isManualOverride: true,
    });
    expect(result.status).toBe('ok');

    const char = await background.evaluate((id) => novelCharacterMaps[id].chars[0], novelId);
    expect(char.gender).toBe('f');
    expect(char.manualOverride).toBe(true);
    expect(char.confidence).toBe(1.0);

    await background.evaluate((id) => { delete novelCharacterMaps[id]; }, novelId);
  });

  // -------------------------------------------------------------------------
  // 8. Stats tracking — paragraphs and processing time accumulate
  // -------------------------------------------------------------------------
  test('paragraph and processing-time stats accumulate correctly', async () => {
    const before = await sendBgMessage({ action: 'getGlobalStats' });

    await sendBgMessage({ action: 'updateParagraphStats', paragraphCount: 7, processingTime: 1234 });
    await sendBgMessage({ action: 'updateParagraphStats', paragraphCount: 3, processingTime: 500 });

    const after = await sendBgMessage({ action: 'getGlobalStats' });
    expect(after.stats.totalParagraphsEnhanced).toBe(before.stats.totalParagraphsEnhanced + 10);
    expect(after.stats.totalProcessingTime).toBe(before.stats.totalProcessingTime + 1734);
  });

  // -------------------------------------------------------------------------
  // 9. Whitelist management — add directly, remove via message
  // -------------------------------------------------------------------------
  test('whitelist: site can be removed via message handler', async () => {
    const hostname = 'e2etest.example.com';

    // Add directly to storage (bypasses chrome.permissions.request UI)
    await background.evaluate((h) =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = data.whitelistedSites || [];
          if (!sites.includes(h)) sites.push(h);
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      ),
      hostname
    );

    const before = await background.evaluate(() =>
      new Promise((r) => chrome.storage.sync.get('whitelistedSites', (d) => r(d.whitelistedSites)))
    );
    expect(before).toContain(hostname);

    // Remove via the message handler
    const res = await sendBgMessage({ action: 'removeSiteFromWhitelist', hostname });
    expect(res.success).toBe(true);

    const after = await background.evaluate(() =>
      new Promise((r) => chrome.storage.sync.get('whitelistedSites', (d) => r(d.whitelistedSites)))
    );
    expect(after).not.toContain(hostname);
  });

  // -------------------------------------------------------------------------
  // 10. Popup renders
  // -------------------------------------------------------------------------
  test('popup page renders with status and control elements', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('#status-message')).toBeVisible();
    await expect(page.locator('#pause-button')).toBeVisible();
    await expect(page.locator('#enhance-now-btn')).toBeVisible();

    await page.close();
  });

  // -------------------------------------------------------------------------
  // 11. Options page — model name input shows the default value
  // -------------------------------------------------------------------------
  test('options page shows default model name and temperature', async () => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/src/options/options.html`);
    await page.waitForLoadState('domcontentloaded');
    // toHaveValue auto-retries until the storage callback populates the input
    await expect(page.locator('#model-name')).toHaveValue('qwen3:8b-q4_K_M', { timeout: 8000 });
    await expect(page.locator('#temperature-value')).toHaveText('0.4');

    await page.close();
  });

  // -------------------------------------------------------------------------
  // 12. MTL enhancement — mock WebNovel page with realistic bad translation
  //
  // Strategy:
  //   • A mock HTTP server on port 11434 stands in for Ollama (skipped if the
  //     port is already occupied by a real Ollama instance).
  //   • context.route() intercepts the webnovel.com URL and returns a local
  //     HTML page so the extension's content script is injected automatically
  //     (it matches *://*.webnovel.com/* in the manifest).
  //   • www.webnovel.com is added to whitelistedSites so the content script
  //     proceeds past its site-permission gate.
  //   • After the 800 ms init delay the content script calls the mock Ollama,
  //     receives deterministic "enhanced" text, and rewrites the DOM.
  //   • Assertions verify both that the DOM changed and that specific MTL
  //     defects present in the original are absent in the enhancement.
  // -------------------------------------------------------------------------
  test.describe('MTL enhancement — mock WebNovel chapter', () => {
    // A real chapter URL pattern so the manifest content_script rule fires.
    const MOCK_URL = 'https://www.webnovel.com/book/00000000000000000/00000000000000000';

    // ---------- source text: typical MTL from a cultivation novel ----------
    // Hallmarks of bad machine translation used as ground-truth defects:
    //   • "He brows knit tightly"  — wrong pronoun + missing article
    //   • "This lord not need explain"  — literal CN self-referential speech
    //   • "He breath came out ragged"  — pronoun swap (她→he instead of she)
    //   • "Silence fall over hall"  — missing article + wrong tense
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

    // ---------- deterministic mock response returned by the fake Ollama ----------
    // Fixes every defect above so assertions are precise and stable.
    const ENHANCED_TEXT = [
      'Li Wei pushed open the hall door. His brows knitted tightly as he surveyed the damage before him.',
      '"You actually dare show your face here!" The cold voice belonged to Xu Mengyao, who stood in the center of the hall, her hands clasped behind her back. "After what you did to this city?"',
      'Li Wei let out a cold snort. "I don\'t need to explain myself to you, a mere third-realm cultivator."',
      'Xu Mengyao felt her heart clench. The rage inside her was almost too much to control. Her breath came out ragged.',
      '"You..." Her voice trembled. Xu Mengyao\'s eyes turned red. "You killed him. You killed my brother!"',
      'Zhang Hu, who stood silently by the doorframe, felt uncomfortable with the scene. He watched as tears began to fall from Xu Mengyao\'s eyes. His heart felt heavy.',
      '"The weak exist to be consumed by the strong." Li Wei\'s voice was without mercy. "Your brother was weak. He died as was natural."',
      'Xu Mengyao clenched her fist. Her nails dug deep into her palm, and the pain cleared her head. She looked straight into Li Wei\'s eyes, and he saw determination there.',
      '"I will become stronger than you." She said, her voice quiet but firm. "And on that day, I will make you understand what regret feels like."',
      'Silence fell over the hall. Only the howl of the wind outside could be heard.',
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

    let ollamaMockServer = null;
    let ollamaMockStarted = false;
    let chapterPage = null;

    test.beforeAll(async () => {
      // ── 1. Start mock Ollama server ────────────────────────────────────────
      ollamaMockServer = http.createServer((req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        if (req.url === '/api/version' && req.method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({ version: '0.6.0' }));
          return;
        }

        if (req.url === '/api/tags' && req.method === 'GET') {
          res.writeHead(200);
          res.end(JSON.stringify({
            models: [{ name: 'qwen3:8b-q4_K_M', modified_at: '2024-01-01T00:00:00Z', size: 1 }],
          }));
          return;
        }

        if (req.url === '/api/generate' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            res.writeHead(200);
            // Non-streaming response: single JSON object, no literal newlines in
            // the outer JSON so processOllamaResponse() hits the else branch.
            res.end(JSON.stringify({ model: 'qwen3:8b-q4_K_M', response: ENHANCED_TEXT, done: true }));
          });
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'not found' }));
      });

      await new Promise((resolve, reject) => {
        ollamaMockServer.listen(11434, '127.0.0.1', () => {
          ollamaMockStarted = true;
          resolve();
        });
        ollamaMockServer.once('error', reject);
      }).catch(() => {
        // Port 11434 already occupied (real Ollama running).
        // The test will be skipped via the guard inside the test body.
        ollamaMockStarted = false;
      });

      // ── 2. Route the target webnovel URL to local mock HTML ───────────────
      await context.route(MOCK_URL, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: MOCK_HTML,
        });
      });

      // ── 3. Whitelist www.webnovel.com ─────────────────────────────────────
      await background.evaluate(() =>
        new Promise((resolve) =>
          chrome.storage.sync.get('whitelistedSites', (data) => {
            const sites = data.whitelistedSites || [];
            if (!sites.includes('www.webnovel.com')) sites.push('www.webnovel.com');
            chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
          })
        )
      );

      // Clear the background's whitelist cache so the fresh storage value is used
      // when the content script calls checkSitePermission() on navigation.
      await background.evaluate(() => { whitelistCache.clear(); });
    });

    test.afterAll(async () => {
      if (chapterPage) await chapterPage.close().catch(() => {});

      // Remove the webnovel route so it doesn't bleed into other tests.
      await context.unroute(MOCK_URL).catch(() => {});

      // Restore whitelist to its pre-test state.
      await background.evaluate(() =>
        new Promise((resolve) =>
          chrome.storage.sync.get('whitelistedSites', (data) => {
            const sites = (data.whitelistedSites || []).filter(
              (s) => s !== 'www.webnovel.com'
            );
            chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
          })
        )
      );
      await background.evaluate(() => { whitelistCache.clear(); });

      if (ollamaMockServer) {
        await new Promise((resolve) => ollamaMockServer.close(resolve));
      }
    });

    test('extension rewrites MTL chapter DOM and fixes known translation defects', async () => {
      if (!ollamaMockStarted) {
        test.skip(true, 'Port 11434 is occupied — cannot start mock Ollama server. Run with Ollama stopped.');
      }

      chapterPage = await context.newPage();
      await chapterPage.goto(MOCK_URL, { waitUntil: 'domcontentloaded' });

      // Confirm the mock HTML loaded and original defects are present.
      const originalText = await chapterPage.locator('.chapter-content').textContent();
      expect(originalText).toContain('He brows knit tightly');
      expect(originalText).toContain('This lord not need explain');
      expect(originalText).toContain('He breath came out ragged');
      expect(originalText).toContain('Silence fall over hall');

      // Wait for the content script to finish enhancement (800 ms init delay +
      // mock Ollama round-trip). The DOM must differ from the original snapshot.
      await chapterPage.waitForFunction(
        (orig) => {
          const el = document.querySelector('.chapter-content');
          return el !== null && el.textContent.trim() !== orig.trim();
        },
        originalText,
        { timeout: 30_000 }
      );

      const enhancedText = await chapterPage.locator('.chapter-content').textContent();

      // ── Metric 1: the DOM was actually rewritten ────────────────────────
      expect(enhancedText).not.toBe(originalText);
      expect(enhancedText.length).toBeGreaterThan(100);

      // ── Metric 2: pronoun / article defects removed ─────────────────────
      expect(enhancedText).not.toContain('He brows knit tightly');
      expect(enhancedText).not.toContain('He breath came out ragged');

      // ── Metric 3: correct English introduced by the mock response ────────
      expect(enhancedText).toContain('His brows knitted tightly');
      expect(enhancedText).toContain('Her breath came out ragged');

      // ── Metric 4: tense / article corrections ───────────────────────────
      expect(enhancedText).not.toContain('Silence fall over hall');
      expect(enhancedText).toContain('Silence fell over the hall');
    });
  });
});
