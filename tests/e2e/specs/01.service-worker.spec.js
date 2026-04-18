// tests/e2e/specs/01.service-worker.spec.js
// Tests 1–3: service worker bootstrap, default sync settings, cleanup alarm.
const { test, expect } = require('../fixtures/extension.fixture');

test.describe('service worker & bootstrap', () => {
  test('service worker initialises and background is ready', async ({ extensionContext }) => {
    const { background, extensionId } = extensionContext;
    const { ready } = await background.evaluate(() => ({ ready: isBackgroundReady }));
    expect(ready).toBe(true);
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });

  test('sync settings are initialised with correct defaults', async ({ extensionContext }) => {
    const { background } = extensionContext;
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
    expect(settings.contextSize).toBe(8192);
    expect(settings.timeout).toBe(300);
    expect(settings.preserveNames).toBe(true);
    expect(settings.fixPronouns).toBe(true);
  });

  test('periodic cleanup alarm is registered with a 24-hour period', async ({ extensionContext }) => {
    const { background } = extensionContext;
    const alarms = await background.evaluate(() =>
      new Promise((resolve) => chrome.alarms.getAll(resolve))
    );
    const alarm = alarms.find((a) => a.name === 'periodicStorageCleanup');
    expect(alarm).toBeDefined();
    expect(alarm.periodInMinutes).toBe(1440);
  });
});
