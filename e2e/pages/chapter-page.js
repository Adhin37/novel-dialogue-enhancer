// tests/e2e/pages/ChapterPage.js

class ChapterPage {
  /**
   * @param {import('@playwright/test').BrowserContext} context
   */
  constructor(context) {
    this._context = context;
    this.page = null;
  }

  /**
   * Open a chapter URL.
   * @param {string} url
   * @param {object} [options]
   * @param {boolean} [options.logConsole=false] - Forward relevant console messages
   * @param {RegExp}  [options.logPattern]       - Pattern to filter console messages
   * @param {string}  [options.logPrefix='[page]'] - Prefix for forwarded messages
   * @param {string}  [options.waitUntil='domcontentloaded']
   * @param {number}  [options.navTimeout=30000]
   * @param {boolean} [options.networkIdle=false] - Also wait for networkidle
   * @param {string}  [options.detectModelGuard]  - If set, listen for the
   *   [model-guard] console.warn emitted by the content script when the
   *   configured model is not installed. Sets this._modelGuardDetected = true
   *   the instant it fires (sticky — survives toaster auto-dismiss).
   */
  async open(url, options = {}) {
    const {
      logConsole = false,
      logPattern = /Novel Dialogue|Ollama|whitelist|nhancement|chapter/i,
      logPrefix = '[page]',
      waitUntil = 'domcontentloaded',
      navTimeout = 30_000,
      networkIdle = false,
      detectModelGuard = null,
    } = options;

    this._modelGuardDetected = false;
    this.page = await this._context.newPage();

    // Listen for the [model-guard] console.warn BEFORE navigation so we
    // never miss it even if it fires during the very first enhancement cycle.
    if (detectModelGuard) {
      this.page.on('console', (msg) => {
        if (msg.type() === 'warning' && msg.text().includes('[model-guard]')) {
          this._modelGuardDetected = true;
        }
      });
    }

    if (logConsole) {
      this.page.on('console', (msg) => {
        if (logPattern.test(msg.text())) {
          console.log(`${logPrefix} ${msg.type()}: ${msg.text()}`);
        }
      });
    }

    await this.page.goto(url, { waitUntil, timeout: navTimeout });

    if (networkIdle) {
      await this.page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    }

    return this;
  }

  async close() {
    if (this.page) {
      await this.page.close().catch(() => {});
      this.page = null;
    }
  }

  // ── Locators ───────────────────────────────────────────────────────────────
  chapterContent() { return this.page.locator('.chapter-content'); }
  chrContent()     { return this.page.locator('#chr-content'); }
  toasterText()    { return this.page.locator('#novel-enhancer-text'); }

  /**
   * Wait for the element at `selector` to have text different from `originalText`.
   * Used to detect when the content script has finished rewriting the DOM.
   */
  async waitForEnhancement(selector, originalText, timeout = 120_000) {
    await this.page.waitForFunction(
      ({ sel, orig }) => {
        const el = document.querySelector(sel);
        return el !== null && el.textContent.trim() !== (orig || '').trim();
      },
      { sel: selector, orig: originalText },
      { timeout }
    );
  }

  /**
   * Wait for the model-guard warning to have appeared at least once.
   * Requires that open() was called with detectModelGuard set to the model name.
   * Detection is via the [model-guard] console.warn the content script emits,
   * which is sticky (survives toaster auto-dismiss and re-enhancement cycles).
   */
  async waitForModelGuardToast(modelName, timeout = 20_000) {
    const deadline = Date.now() + timeout;
    while (!this._modelGuardDetected) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out after ${timeout}ms waiting for [model-guard] console.warn`);
      }
      await this.page.waitForTimeout(200);
    }
  }
}

module.exports = { ChapterPage };
