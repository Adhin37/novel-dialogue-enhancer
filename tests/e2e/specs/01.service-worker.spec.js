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

  test('background.js hardcoded defaults match shared config source values', async ({ extensionContext }) => {
    const { background } = extensionContext;
    const defaults = await background.evaluate(() => ({
      url:         DEFAULT_OLLAMA_URL,
      model:       DEFAULT_MODEL_NAME,
      contextSize: DEFAULT_CONTEXT_SIZE,
      timeout:     DEFAULT_TIMEOUT_SEC,
      temperature: DEFAULT_TEMPERATURE,
      topP:        DEFAULT_TOP_P,
    }));
    expect(defaults.url).toBe('http://localhost:11434');
    expect(defaults.model).toBe('qwen3.5:4b');
    expect(defaults.contextSize).toBe(8192);
    expect(defaults.timeout).toBe(300);
    expect(defaults.temperature).toBe(0.4);
    expect(defaults.topP).toBe(0.9);
  });
});
