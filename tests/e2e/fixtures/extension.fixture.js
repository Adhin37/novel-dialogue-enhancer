// tests/e2e/fixtures/extension.fixture.js
// Worker-scoped fixture: launched once, shared across all spec files (workers: 1).
const { test: base, chromium } = require('@playwright/test');
const path = require('path');

const extensionPath = path.resolve(__dirname, '../../..');

exports.test = base.extend({
  extensionContext: [async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    // Wake the service worker
    const triggerPage = await context.newPage();
    await triggerPage.goto('about:blank');
    await triggerPage.close();

    // Poll until service worker is available
    let sw = null;
    const deadline = Date.now() + 20000;
    while (!sw && Date.now() < deadline) {
      [sw] = context.serviceWorkers();
      if (!sw) await new Promise((r) => setTimeout(r, 500));
    }
    if (!sw) throw new Error('Extension service worker never became available');

    const background = sw;
    const extensionId = background.url().split('/')[2];

    // Wait for background.js to finish its async init
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

    // Open the popup page and keep it alive as a chrome.runtime message relay
    const msgPage = await context.newPage();
    await msgPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await msgPage.waitForLoadState('domcontentloaded');

    await use({ context, background, msgPage, extensionId });

    await context.close();
  }, { scope: 'worker' }],
});

exports.expect = base.expect;
