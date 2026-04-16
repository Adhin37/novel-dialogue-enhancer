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
    expect(settings.modelName).toBe('qwen3.5:4b');
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
    await expect(page.locator('#model-name')).toHaveValue('qwen3.5:4b', { timeout: 8000 });
    await expect(page.locator('#temperature-value')).toHaveText('0.4');

    await page.close();
  });

  // -------------------------------------------------------------------------
  // 12. MTL enhancement — WebNovel page with realistic bad translation
  //
  // Strategy:
  //   • beforeAll probes real Ollama (127.0.0.1:11434) to confirm it is
  //     running and the required model is loaded.  Skipped if not available.
  //   • context.route() intercepts the webnovel.com URL and serves local HTML
  //     so the manifest content_script rule fires automatically.
  //   • www.webnovel.com is whitelisted so the content script passes its
  //     site-permission gate.
  //   • The browser window stays visible (headless: false) so the DOM
  //     rewrite can be observed in real time.
  //   • Assertions are structural: DOM changed + known MTL patterns removed.
  // -------------------------------------------------------------------------
  test.describe('MTL enhancement — WebNovel chapter', () => {
    // A real chapter URL pattern so the manifest content_script rule fires.
    const MOCK_URL = 'https://www.webnovel.com/book/00000000000000000/00000000000000000';
    // Resolved in beforeAll from chrome.storage.sync so it matches whatever
    // the user has configured in the extension options.
    let REQUIRED_MODEL = 'qwen3.5:4b'; // default fallback

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

    let ollamaAvailable = false;
    let chapterPage = null;
    let ollamaCorsRouteAdded = false; // true if we installed an Origin-stripping route

    /** GET /api/tags → array of model name strings, or [] on error. */
    function fetchOllamaModels() {
      return new Promise((resolve) => {
        const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            try { resolve(JSON.parse(data).models?.map((m) => m.name) ?? []); }
            catch { resolve([]); }
          });
        });
        req.on('error', () => resolve([]));
        req.setTimeout(3000, () => { req.destroy(); resolve([]); });
      });
    }

    /**
     * POST /api/generate with a chrome-extension Origin header to simulate
     * exactly what the background service worker sends.
     * Returns the HTTP status code, or 0 on network error.
     */
    function probeGenerate(model) {
      const body = JSON.stringify({ model, prompt: 'Hi', stream: false, options: { num_predict: 1 } });
      return new Promise((resolve) => {
        const req = http.request(
          {
            hostname: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'Origin': 'chrome-extension://testprobeorigin',
            },
          },
          (res) => { res.resume(); resolve(res.statusCode); }
        );
        req.on('error', () => resolve(0));
        req.setTimeout(15000, () => { req.destroy(); resolve(0); });
        req.write(body);
        req.end();
      });
    }

    /**
     * Resolve which Ollama model to use, and ensure the extension can reach it.
     *
     * Ollama 0.6+ blocks requests with Origin: chrome-extension:// (403).
     * Since Playwright 1.36, context.route() intercepts service worker fetches,
     * so when 403 is detected we install a route that strips the Origin header
     * before forwarding — no Ollama restart required.
     *
     * Returns the chosen model name, or null if Ollama is unavailable.
     */
    async function resolveOllamaModel() {
      const models = await fetchOllamaModels();
      if (models.length === 0) return null;

      const chosen = models.includes(REQUIRED_MODEL) ? REQUIRED_MODEL : models[0];

      const status = await probeGenerate(chosen);
      if (status === 0) return null; // connection error

      if (status === 403) {
        // Install a context-level route that strips the chrome-extension Origin
        // header so Ollama accepts the request.  This intercepts both page and
        // service-worker fetches (Playwright ≥ 1.36).
        console.log('[MTL] Ollama returned 403 — installing proxy route for localhost:11434');
        // Full-proxy approach: intercept the service worker's request entirely,
        // make a fresh Node.js HTTP request to Ollama (no Origin header), and
        // return the response via route.fulfill().
        // route.continue() cannot remove Origin because Chrome re-adds it at the
        // network layer for cross-origin extension requests.
        await context.route('http://localhost:11434/**', async (route) => {
          const req = route.request();
          const url = new URL(req.url());

          let postBody = req.method() !== 'GET' ? await req.postDataBuffer() : null;

          // For /api/generate, ensure think:false is set so qwen3 skips reasoning.
          // background.js now sets it directly, but the proxy guarantees it even
          // if the background request omits it for some reason.
          if (url.pathname === '/api/generate' && postBody) {
            try {
              const json = JSON.parse(postBody.toString());
              const hadThink = 'think' in json;
              json.think = false;
              postBody = Buffer.from(JSON.stringify(json));
              const opts = json.options || {};
              console.log(
                `[proxy] /api/generate | model:${json.model} | think_was_set:${hadThink}(${json.think}) | ` +
                `num_ctx:${opts.num_ctx ?? '?'} | num_predict:${opts.num_predict ?? '?'} | prompt_len:${json.prompt?.length ?? 0}`
              );
            } catch { /* leave body unchanged if not valid JSON */ }
          } else {
            console.log(`[proxy] ${req.method()} ${url.pathname}`);
          }

          const t0 = Date.now();
          const responseData = await new Promise((resolve) => {
            const options = {
              hostname: '127.0.0.1',
              port: 11434,
              path: url.pathname + url.search,
              method: req.method(),
              headers: {
                'content-type': 'application/json',
                ...(postBody ? { 'content-length': String(postBody.length) } : {}),
              },
            };
            const proxyReq = http.request(options, (res) => {
              const chunks = [];
              res.on('data', (c) => chunks.push(c));
              res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
            });
            proxyReq.on('error', (e) => resolve({ status: 502, headers: {}, body: Buffer.from(e.message) }));
            if (postBody) proxyReq.write(postBody);
            proxyReq.end();
          });

          if (url.pathname === '/api/generate') {
            console.log(`[proxy] ← ${responseData.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s | resp_len:${responseData.body.length}`);
          }

          await route.fulfill({
            status: responseData.status,
            headers: responseData.headers,
            body: responseData.body,
          });
        });
        ollamaCorsRouteAdded = true;
      }

      return chosen;
    }

    test.beforeAll(async () => {
      // ── 0. Read the model name the user has configured in the extension ───
      const storedModel = await background.evaluate(() =>
        new Promise((resolve) =>
          chrome.storage.sync.get('modelName', (d) => resolve(d.modelName || null))
        )
      );
      if (storedModel) REQUIRED_MODEL = storedModel;

      // ── 1. Resolve which Ollama model to use (also checks CORS) ──────────
      const resolvedModel = await resolveOllamaModel();
      ollamaAvailable = resolvedModel !== null;

      // If a different model was chosen (configured one not installed), sync
      // the extension's modelName setting so the content script uses it too.
      if (resolvedModel && resolvedModel !== REQUIRED_MODEL) {
        REQUIRED_MODEL = resolvedModel;
        await background.evaluate((model) =>
          new Promise((resolve) => chrome.storage.sync.set({ modelName: model }, resolve)),
          REQUIRED_MODEL
        );
      }

      // ── 2. Route the target webnovel URL to local MTL HTML ────────────────
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

      // Clear the background's whitelist cache so the fresh storage value is
      // used when the content script calls checkSitePermission() on navigation.
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

      // Remove the Origin-stripping Ollama route if we installed one.
      if (ollamaCorsRouteAdded) {
        await context.unroute('http://localhost:11434/**').catch(() => {});
        ollamaCorsRouteAdded = false;
      }
    });

    test('extension rewrites MTL chapter DOM and fixes known translation defects', async () => {
      if (!ollamaAvailable) {
        test.skip(true, [
          'Skipped: Ollama not reachable, no models found,',
          'or POST /api/generate returned 403.',
          'To enable: restart Ollama with OLLAMA_ORIGINS=chrome-extension://*',
          '  e.g.  OLLAMA_ORIGINS=chrome-extension://* ollama serve',
        ].join(' '));
      }

      // Real LLM inference can take several minutes — override the global 60 s limit.
      test.setTimeout(180_000);

      // Navigate to the page — the browser window stays open (headless: false)
      // so the enhancement can be observed in real time as the LLM rewrites it.
      chapterPage = await context.newPage();

      // Capture page console so test output shows content-script progress.
      chapterPage.on('console', (msg) => {
        const text = msg.text();
        if (text.includes('Novel Dialogue') || text.includes('Ollama') ||
            text.includes('whiteList') || text.includes('whitelist') ||
            text.includes('Site') || text.includes('enhancement') ||
            text.includes('Enhancement')) {
          console.log(`[page] ${msg.type()}: ${text}`);
        }
      });

      await chapterPage.goto(MOCK_URL, { waitUntil: 'domcontentloaded' });

      // Confirm the MTL HTML loaded and original defects are present.
      const originalText = await chapterPage.locator('.chapter-content').textContent();
      expect(originalText).toContain('He brows knit tightly');
      expect(originalText).toContain('This lord not need explain');
      expect(originalText).toContain('He breath came out ragged');
      expect(originalText).toContain('Silence fall over hall');

      // Wait for the content script to finish enhancement (800 ms init delay +
      // LLM round-trip). Generous timeout for real model inference.
      await chapterPage.waitForFunction(
        (orig) => {
          const el = document.querySelector('.chapter-content');
          return el !== null && el.textContent.trim() !== orig.trim();
        },
        originalText,
        { timeout: 120_000 }
      );

      const enhancedText = await chapterPage.locator('.chapter-content').textContent();

      // ── Metric 1: the DOM was actually rewritten ────────────────────────
      expect(enhancedText).not.toBe(originalText);
      expect(enhancedText.length).toBeGreaterThan(100);

      // ── Metric 2: known MTL defect patterns removed by the LLM ─────────
      expect(enhancedText).not.toContain('He brows knit tightly');
      expect(enhancedText).not.toContain('He breath came out ragged');
      expect(enhancedText).not.toContain('Silence fall over hall');
    });
  });
});
