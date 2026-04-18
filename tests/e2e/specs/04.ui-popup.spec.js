// tests/e2e/specs/04.ui-popup.spec.js
// Test 10: popup page renders with expected UI elements.
const { test, expect } = require('../fixtures/extension.fixture');
const { PopupPage } = require('../pages/PopupPage');

test.describe('popup UI', () => {
  test('popup page renders with status and control elements', async ({ extensionContext }) => {
    const { context, extensionId } = extensionContext;
    const popup = new PopupPage(context, extensionId);
    await popup.open();
    try {
      await expect(popup.statusMessage()).toBeVisible();
      await expect(popup.pauseButton()).toBeVisible();
      await expect(popup.enhanceNowBtn()).toBeVisible();
    } finally {
      await popup.close();
    }
  });
});
