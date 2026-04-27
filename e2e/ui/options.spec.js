// tests/e2e/specs/05.ui-options.spec.js
// Test 11: options page shows default model name and temperature.
const { test, expect } = require('../fixtures/extension.fixture');
const { OptionsPage } = require('../pages/options-page');

test.describe('options page UI', () => {
  test('options page shows default model name and temperature', async ({ extensionContext }) => {
    const { context, extensionId } = extensionContext;
    const options = new OptionsPage(context, extensionId);
    await options.open();
    try {
      // toHaveValue auto-retries until the storage callback populates the input
      await expect(options.modelNameInput()).toHaveValue('qwen3.5:4b', { timeout: 8000 });
      await expect(options.temperatureValue()).toHaveText('0.4');
    } finally {
      await options.close();
    }
  });
});
