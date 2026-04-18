// tests/e2e/pages/PopupPage.js

class PopupPage {
  /**
   * @param {import('@playwright/test').BrowserContext} context
   * @param {string} extensionId
   */
  constructor(context, extensionId) {
    this._context = context;
    this._extensionId = extensionId;
    this.page = null;
  }

  get url() {
    return `chrome-extension://${this._extensionId}/src/popup/popup.html`;
  }

  async open() {
    this.page = await this._context.newPage();
    await this.page.goto(this.url);
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async close() {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
  }

  // ── Locators ───────────────────────────────────────────────────────────────
  statusMessage()     { return this.page.locator('[data-testid="status-message"]'); }
  pauseButton()       { return this.page.locator('[data-testid="pause-button"]'); }
  pauseIcon()         { return this.page.locator('[data-testid="pause-icon"]'); }
  enhanceNowBtn()     { return this.page.locator('[data-testid="enhance-now-btn"]'); }
  currentSite()       { return this.page.locator('[data-testid="current-site"]'); }
  whitelistButton()   { return this.page.locator('[data-testid="whitelist-button"]'); }
  whitelistText()     { return this.page.locator('[data-testid="whitelist-text"]'); }
  preserveToggle()    { return this.page.locator('[data-testid="preserve-names-toggle"]'); }
  fixPronounsToggle() { return this.page.locator('[data-testid="fix-pronouns-toggle"]'); }
}

module.exports = { PopupPage };
