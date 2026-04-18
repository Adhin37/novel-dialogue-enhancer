const { test } = require('../fixtures/extension.fixture');

const REAL_URL = 'https://www.webnovel.com/book/book-of-authors_10589139205070105/becoming-a-starter-level-author_28425258390308456';
const HOSTNAME = 'www.webnovel.com';
const UNAVAILABLE_MODEL = 'gemma3:4b';

test('no addInitScript - check if toaster appears', async ({ extensionContext }) => {
  test.setTimeout(30_000);
  const { background, context } = extensionContext;

  await background.evaluate(
    (model) => new Promise((r) => chrome.storage.sync.set({ modelName: model }, r)),
    UNAVAILABLE_MODEL
  );
  await background.evaluate(
    (host) => new Promise((r) => chrome.storage.sync.get('whitelistedSites', (d) => {
      const s = d.whitelistedSites || [];
      if (!s.includes(host)) s.push(host);
      chrome.storage.sync.set({ whitelistedSites: s }, r);
    })),
    HOSTNAME
  );
  await background.evaluate(() => { whitelistCache.clear(); });

  const page = await context.newPage();
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(REAL_URL, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForTimeout(5_000);

  const toasterText = await page.evaluate(() => document.getElementById('novel-enhancer-text')?.textContent ?? 'NONE');
  const isWhitelisted = logs.some(l => l.includes('whitelisted'));
  const modelLog = logs.filter(l => /model|guard|install/i.test(l));
  console.log('IS WHITELISTED LOG:', isWhitelisted);
  console.log('TOASTER TEXT:', toasterText);
  console.log('MODEL RELATED LOGS:', modelLog);

  await page.close();
});
