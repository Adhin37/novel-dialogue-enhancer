// tests/e2e/pages/OptionsPage.js

class OptionsPage {
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
    return `chrome-extension://${this._extensionId}/src/options/options.html`;
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

  // ── Tab navigation ─────────────────────────────────────────────────────────
  tab(name)           { return this.page.locator(`[data-testid="tab-btn-${name}"]`); }
  async switchTab(name) {
    await this.tab(name).click();
  }

  // ── General tab ────────────────────────────────────────────────────────────
  themeSwitch()       { return this.page.locator('[data-testid="theme-switch"]'); }
  modelNameInput()    { return this.page.locator('[data-testid="model-name"]'); }
  modelSuggestion(model) { return this.page.locator(`[data-testid="model-suggestion-${model}"]`); }
  temperatureSlider() { return this.page.locator('[data-testid="temperature"]'); }
  temperatureValue()  { return this.page.locator('[data-testid="temperature-value"]'); }
  topPSlider()        { return this.page.locator('[data-testid="top-p"]'); }
  topPValue()         { return this.page.locator('[data-testid="top-p-value"]'); }

  // ── Advanced tab ───────────────────────────────────────────────────────────
  contextSizeSlider() { return this.page.locator('[data-testid="context-size"]'); }
  contextSizeValue()  { return this.page.locator('[data-testid="context-size-value"]'); }
  timeoutSlider()     { return this.page.locator('[data-testid="timeout"]'); }
  timeoutValue()      { return this.page.locator('[data-testid="timeout-value"]'); }
  debugModeCheckbox() { return this.page.locator('[data-testid="debug-mode"]'); }
  testOllamaBtn()     { return this.page.locator('[data-testid="test-ollama"]'); }
  ollamaStatus()      { return this.page.locator('[data-testid="ollama-status"]'); }

  // ── Novels tab ─────────────────────────────────────────────────────────────
  novelsSearch()      { return this.page.locator('[data-testid="novels-search"]'); }
  novelsContainer()   { return this.page.locator('[data-testid="novels-container"]'); }
  novelItem(novelId)  { return this.page.locator(`[data-testid="novel-item-${novelId}"]`); }
  characterCard(novelId, charId) {
    return this.page.locator(`[data-testid="character-card-${novelId}-${charId}"]`);
  }
  genderSelect(novelId, charId) {
    return this.page.locator(`[data-testid="gender-select-${novelId}-${charId}"]`);
  }

  // ── Sites tab ──────────────────────────────────────────────────────────────
  whitelistItems()    { return this.page.locator('[data-testid="whitelist-items"]'); }
  whitelistItem(site) { return this.page.locator(`[data-testid="whitelist-item-${site}"]`); }
  removeWhitelistBtn(site) { return this.page.locator(`[data-testid="whitelist-remove-${site}"]`); }
  addSiteBtn()        { return this.page.locator('[data-testid="add-site"]'); }
  clearAllBtn()       { return this.page.locator('[data-testid="clear-all"]'); }

  // ── Site modal ─────────────────────────────────────────────────────────────
  siteModal()         { return this.page.locator('[data-testid="site-modal"]'); }
  siteUrlInput()      { return this.page.locator('[data-testid="site-url"]'); }
  modalError()        { return this.page.locator('[data-testid="modal-error"]'); }
  addSiteConfirmBtn() { return this.page.locator('[data-testid="add-site-confirm"]'); }
  cancelAddSiteBtn()  { return this.page.locator('[data-testid="cancel-add-site"]'); }
  closeModalBtn()     { return this.page.locator('[data-testid="close-modal"]'); }

  // ── Stats tab ──────────────────────────────────────────────────────────────
  statParagraphs()    { return this.page.locator('[data-testid="stat-paragraphs"]'); }
  statChapters()      { return this.page.locator('[data-testid="stat-chapters"]'); }
  statNovels()        { return this.page.locator('[data-testid="stat-novels"]'); }
  statCharacters()    { return this.page.locator('[data-testid="stat-characters"]'); }
  statSessions()      { return this.page.locator('[data-testid="stat-sessions"]'); }
  statTime()          { return this.page.locator('[data-testid="stat-time"]'); }
  statFirstDate()     { return this.page.locator('[data-testid="stat-first-date"]'); }
  statLastDate()      { return this.page.locator('[data-testid="stat-last-date"]'); }
  refreshStatsBtn()   { return this.page.locator('[data-testid="refresh-stats"]'); }
  resetStatsBtn()     { return this.page.locator('[data-testid="reset-stats"]'); }

  // ── Footer actions ─────────────────────────────────────────────────────────
  saveBtn()           { return this.page.locator('[data-testid="save"]'); }
  resetBtn()          { return this.page.locator('[data-testid="reset"]'); }
}

module.exports = { OptionsPage };
