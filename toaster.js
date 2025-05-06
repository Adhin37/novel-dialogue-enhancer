// toaster.js

/**
 * Toast notification module for Novel Dialogue Enhancer
 */
class Toaster {
  constructor() {
    this.toasterId = "novel-enhancer-toaster";
    this.progressId = "novel-enhancer-progress";
    this.iconId = "novel-enhancer-icon";
    this.textId = "novel-enhancer-text";
    this.toaster = null;
    this.progressBar = null;
    this.progressIcon = null;
    this.progressText = null;
    this.timeoutId = null;
    this.isActive = false;
  }

  createToaster() {
    this.removeToaster();

    this.toaster = document.createElement("div");
    this.toaster.id = this.toasterId;
    this.toaster.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #323232;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.3s ease-in-out;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 90%;
    `;

    this.progressIcon = document.createElement("div");
    this.progressIcon.id = this.iconId;
    this.progressIcon.innerHTML =
      '<svg class="gear" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="none"><circle cx="50" cy="50" r="10" stroke-width="4"/><g stroke-width="4"><line x1="50" y1="5" x2="50" y2="15"/><line x1="50" y1="85" x2="50" y2="95"/><line x1="5" y1="50" x2="15" y2="50"/><line x1="85" y1="50" x2="95" y2="50"/><line x1="20" y1="20" x2="28" y2="28"/><line x1="80" y1="20" x2="72" y2="28"/><line x1="20" y1="80" x2="28" y2="72"/><line x1="80" y1="80" x2="72" y2="72"/></g></svg>';
    this.progressIcon.style.cssText = `
      animation: spin 2s linear infinite;
      transform-origin: 50% 50%;
      transform-box: fill-box;
    `;

    this.progressText = document.createElement("div");
    this.progressText.id = this.textId;
    this.progressText.textContent = "Enhancing content...";
    this.progressText.style.cssText = `
      flex-grow: 1;
      font-size: 14px;
    `;

    this.progressBar = document.createElement("div");
    this.progressBar.id = this.progressId;
    this.progressBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      width: 0%;
      background-color: #4caf50;
      border-radius: 0 0 6px 6px;
      transition: width 0.5s ease;
    `;

    const closeButton = document.createElement("div");
    closeButton.innerHTML = "×";
    closeButton.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      margin-left: 5px;
      line-height: 1;
    `;
    closeButton.addEventListener("click", () => this.removeToaster());

    this.toaster.appendChild(this.progressIcon);
    this.toaster.appendChild(this.progressText);
    this.toaster.appendChild(closeButton);
    this.toaster.appendChild(this.progressBar);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      #${this.toasterId} {
        animation: toaster-in 0.3s ease-out;
      }
      @keyframes toaster-in {
        from { opacity: 0; transform: translate(-50%, -20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.toaster);
    this.isActive = true;
  }

  updateProgress(current, total) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    const percent = Math.min(100, Math.round((current / total) * 100));

    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }

    if (this.progressText) {
      if (current >= total) {
        this.progressText.textContent = `AI Enhancement complete!`;
      } else {
        this.progressText.textContent = `Enhancing with AI: ${current}/${total} paragraphs (${percent}%)`;
      }
    }

    if (current >= total) {
      this.finishProgress();
    }
  }

  finishProgress() {
    if (this.progressBar) {
      this.progressBar.style.width = "100%";
      this.progressBar.style.backgroundColor = "#4caf50";
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 3000);
  }

  showError(message) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    if (this.progressBar) {
      this.progressBar.style.width = "100%";
      this.progressBar.style.backgroundColor = "#f44336";
    }

    if (this.progressIcon) {
      this.progressIcon.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      this.progressIcon.style.animation = "none";
    }

    if (this.progressText) {
      this.progressText.textContent = message || "Enhancement failed";
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 5000);
  }

  showMessage(message, duration = 3000) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    if (this.progressIcon) {
      this.progressIcon.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      this.progressIcon.style.animation = "none";
    }

    if (this.progressText) {
      this.progressText.textContent = message;
    }

    if (this.progressBar) {
      this.progressBar.style.display = "none";
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, duration);
  }

  removeToaster() {
    if (this.toaster && this.toaster.parentNode) {
      this.toaster.style.opacity = "0";
      this.toaster.style.transform = "translate(-50%, -20px)";

      setTimeout(() => {
        if (this.toaster && this.toaster.parentNode) {
          this.toaster.parentNode.removeChild(this.toaster);
        }
        this.toaster = null;
        this.progressBar = null;
        this.progressIcon = null;
        this.progressText = null;
        this.isActive = false;
      }, 300);
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = Toaster;
} else {
  window.toaster = Toaster;
}
