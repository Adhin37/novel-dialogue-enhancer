// tests/e2e/specs/09.whitelist-add.spec.js
// Full UI-driven whitelist lifecycle:
//   1. Popup   — add custom site → chrome.permissions.request fires → button shows "Whitelisted"
//   2. Options — site visible → remove it → re-add via modal → permissions.request fires again
//   3. Popup   — reload confirms site still shows as "Whitelisted"

const { test, expect } = require('../fixtures/extension.fixture');
const { OptionsPage } = require('../pages/OptionsPage');

// Domain absent from MANIFEST_SITES so requestPermission() always fires.
const CUSTOM_SITE = 'customnoveltest.example.com';

test.describe('whitelist: add/remove/re-add via popup and options UI', () => {
  let popupPage;
  let optionsPage; // kept open across the options tests (tests 3-5)

  test.beforeAll(async ({ extensionContext }) => {
    const { background, context, extensionId } = extensionContext;

    // Spy: replace chrome.permissions.request in the service-worker with a version
    // that auto-grants and records every call for later assertion.
    // The real implementation uses the callback form so the spy must call it too.
    await background.evaluate(() => {
      self._origPermRequest = chrome.permissions.request.bind(chrome.permissions);
      self._permRequestCalls = [];
      chrome.permissions.request = (permissions, callback) => {
        self._permRequestCalls.push(permissions);
        if (typeof callback === 'function') callback(true);
        return Promise.resolve(true);
      };
    });

    // Create a dedicated popup page that believes CUSTOM_SITE is the active tab.
    // addInitScript fires before popup.js DOMContentLoaded, so chrome.tabs.query
    // is already mocked when the extension reads it.
    popupPage = await context.newPage();
    await popupPage.addInitScript(({ fullUrl }) => {
      const _orig = chrome.tabs.query.bind(chrome.tabs);
      chrome.tabs.query = (queryInfo, callback) => {
        if (queryInfo.active && queryInfo.currentWindow) {
          callback([{ id: 1, windowId: 1, active: true, url: fullUrl }]);
        } else {
          _orig(queryInfo, callback);
        }
      };
    }, { fullUrl: `https://${CUSTOM_SITE}/chapter/1` });

    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async ({ extensionContext }) => {
    const { background } = extensionContext;

    if (optionsPage) await optionsPage.close().catch(() => {});
    if (popupPage)  await popupPage.close().catch(() => {});

    // Restore the real chrome.permissions.request
    await background.evaluate(() => {
      if (self._origPermRequest) {
        chrome.permissions.request = self._origPermRequest;
        delete self._origPermRequest;
        delete self._permRequestCalls;
      }
    });

    // Remove the test site so it does not leak into later specs
    await background.evaluate((h) =>
      new Promise((resolve) =>
        chrome.storage.sync.get('whitelistedSites', (data) => {
          const sites = (data.whitelistedSites || []).filter((s) => s !== h);
          chrome.storage.sync.set({ whitelistedSites: sites }, resolve);
        })
      ),
      CUSTOM_SITE
    );
    await background.evaluate(() => { whitelistCache.clear(); });
  });

  // ── Popup: add flow ───────────────────────────────────────────────────────

  test('popup shows the custom site as the active tab', async () => {
    await expect(popupPage.locator('[data-testid="current-site"]'))
      .toHaveText(CUSTOM_SITE, { timeout: 5000 });
  });

  test('clicking Add to Whitelist triggers chrome.permissions.request', async ({ extensionContext }) => {
    const { background } = extensionContext;

    await expect(popupPage.locator('[data-testid="whitelist-text"]'))
      .toHaveText('Add to Whitelist', { timeout: 5000 });

    await popupPage.locator('[data-testid="whitelist-button"]').click();

    // Background responds success → button text updates
    await expect(popupPage.locator('[data-testid="whitelist-text"]'))
      .toHaveText('Whitelisted', { timeout: 8000 });

    const calls = await background.evaluate(() => self._permRequestCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].origins[0]).toBe(`*://*.${CUSTOM_SITE}/*`);
  });

  // ── Options: remove then re-add flow ─────────────────────────────────────

  test('options Sites tab shows the site added via popup', async ({ extensionContext }) => {
    const { context, extensionId } = extensionContext;
    optionsPage = new OptionsPage(context, extensionId);
    await optionsPage.open();
    await optionsPage.switchTab('sites');
    await expect(optionsPage.whitelistItem(CUSTOM_SITE)).toBeVisible({ timeout: 5000 });
  });

  test('remove button removes the site from the options list', async () => {
    await optionsPage.removeWhitelistBtn(CUSTOM_SITE).click();
    await expect(optionsPage.whitelistItem(CUSTOM_SITE)).toBeHidden({ timeout: 5000 });
  });

  test('Add Site Manually re-adds site and triggers chrome.permissions.request', async ({ extensionContext }) => {
    const { background } = extensionContext;

    // Reset spy call log so we can assert exactly one new call from this options flow
    await background.evaluate(() => { self._permRequestCalls = []; });

    await optionsPage.addSiteBtn().click();
    await expect(optionsPage.siteModal()).toBeVisible({ timeout: 3000 });

    await optionsPage.siteUrlInput().fill(CUSTOM_SITE);
    await optionsPage.addSiteConfirmBtn().click();

    // Modal closes and list reloads
    await expect(optionsPage.siteModal()).toBeHidden({ timeout: 5000 });
    await expect(optionsPage.whitelistItem(CUSTOM_SITE)).toBeVisible({ timeout: 5000 });

    const calls = await background.evaluate(() => self._permRequestCalls);
    expect(calls).toHaveLength(1);
    expect(calls[0].origins[0]).toBe(`*://*.${CUSTOM_SITE}/*`);

    await optionsPage.close();
    optionsPage = null;
  });

  // ── Popup: confirm site still whitelisted after options re-add ────────────

  test('popup shows Whitelisted after site re-added via options', async () => {
    // Reload the popup page — addInitScript re-runs so tabs.query still returns
    // CUSTOM_SITE; popup.js re-reads storage which now contains the site again.
    await popupPage.reload();
    await popupPage.waitForLoadState('domcontentloaded');
    await expect(popupPage.locator('[data-testid="whitelist-text"]'))
      .toHaveText('Whitelisted', { timeout: 8000 });
  });
});
