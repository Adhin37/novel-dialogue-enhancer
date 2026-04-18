// tests/e2e/helpers/background.js

/**
 * Returns a function that sends a message to the background service worker
 * via the popup relay page, using the real chrome.runtime pipeline.
 *
 * @param {import('@playwright/test').Page} msgPage - Popup page kept alive as relay
 * @returns {(message: object) => Promise<any>}
 */
function makeSendBgMessage(msgPage) {
  return (msg) =>
    msgPage.evaluate(
      (m) => new Promise((resolve) => chrome.runtime.sendMessage(m, resolve)),
      msg
    );
}

module.exports = { makeSendBgMessage };
