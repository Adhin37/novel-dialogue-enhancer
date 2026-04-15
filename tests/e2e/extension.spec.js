/**
 * E2E tests for Novel Dialogue Enhancer Chrome extension.
 * Tests major features via Playwright + a live Chromium instance.
 */
const { test, expect, chromium } = require('@playwright/test');
const path = require('path');

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
    expect(settings.modelName).toBe('qwen3:8b');
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
    await expect(page.locator('#model-name')).toHaveValue('qwen3:8b', { timeout: 8000 });
    await expect(page.locator('#temperature-value')).toHaveText('0.4');

    await page.close();
  });
});
