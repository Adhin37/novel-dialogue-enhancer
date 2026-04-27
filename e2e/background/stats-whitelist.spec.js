// tests/e2e/specs/03.stats-whitelist.spec.js
// Tests 8–9: stats accumulation and whitelist site removal.
const { test, expect } = require('../fixtures/extension.fixture');
const { makeSendBgMessage } = require('../helpers/background');

test.describe('stats & whitelist management', () => {
  test('paragraph and processing-time stats accumulate correctly', async ({ extensionContext }) => {
    const { msgPage } = extensionContext;
    const send = makeSendBgMessage(msgPage);

    const before = await send({ action: 'getGlobalStats' });

    await send({ action: 'updateParagraphStats', paragraphCount: 7, processingTime: 1234 });
    await send({ action: 'updateParagraphStats', paragraphCount: 3, processingTime: 500 });

    const after = await send({ action: 'getGlobalStats' });
    expect(after.stats.totalParagraphsEnhanced).toBe(before.stats.totalParagraphsEnhanced + 10);
    expect(after.stats.totalProcessingTime).toBe(before.stats.totalProcessingTime + 1734);
  });

  test('whitelist: site can be removed via message handler', async ({ extensionContext }) => {
    const { background, msgPage } = extensionContext;
    const send = makeSendBgMessage(msgPage);
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

    const res = await send({ action: 'removeSiteFromWhitelist', hostname });
    expect(res.success).toBe(true);

    const after = await background.evaluate(() =>
      new Promise((r) => chrome.storage.sync.get('whitelistedSites', (d) => r(d.whitelistedSites)))
    );
    expect(after).not.toContain(hostname);
  });
});
