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

    // Create spinning gear icon for initial loading state
    this.setIcon("loading");

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
      background-color: var(--toaster-success-color);
      border-radius: 0 0 6px 6px;
      transition: width 0.5s ease;
    `;

    const closeButton = document.createElement("div");
    closeButton.textContent = "×";
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
      :root {
        --toaster-success-color: #4caf50;
        --toaster-error-color: #f44336;
        --toaster-info-color: #3498db;
        --toaster-warn-color: #ff9800;
        --toaster-loading-color: #ffffffe7;
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --toaster-success-color: #4caf50;
          --toaster-error-color: #f44336;
          --toaster-info-color: #3498db;
          --toaster-warn-color: #ff9800;
          --toaster-loading-color: #ffffff;
          --toaster-gear-color: #ffffffe7;
        }
      }
      
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
      #${this.iconId} svg.gear {
        transform-origin: center center;
        animation: spin 2s linear infinite;
      }
      #${this.iconId} svg {
        color-scheme: light dark;
      }

      #${this.iconId} {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        min-height: 24px;
      }

      #${this.iconId} svg {
        color-scheme: light dark;
        width: 24px;
        height: 24px;
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.toaster);
    this.isActive = true;
  }

  setIcon(severity) {
    if (!this.progressIcon) return;

    this.progressIcon.innerHTML = "";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");

    // Default styles that will be overridden as needed
    svg.setAttribute("width", "20");
    svg.setAttribute("height", "20");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "#ffffff");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    switch (severity) {
      case "success": {
        // Use direct hex color instead of CSS variable
        const successColor = "var(--toaster-success-color) !important";
        svg.setAttribute("stroke", successColor);
        svg.setAttribute("stroke-width", "2.5");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        const successCircle = document.createElementNS(svgNS, "circle");
        successCircle.setAttribute("cx", "12");
        successCircle.setAttribute("cy", "12");
        successCircle.setAttribute("r", "10");
        successCircle.setAttribute("stroke", successColor);
        successCircle.setAttribute("fill", "none");

        // Use path element instead of separate lines for checkmark
        const checkmark = document.createElementNS(svgNS, "path");
        checkmark.setAttribute("d", "M8 12L11 15L16 9");
        checkmark.setAttribute("stroke", successColor);
        checkmark.setAttribute("stroke-width", "2.5");
        checkmark.setAttribute("stroke-linecap", "round");
        checkmark.setAttribute("stroke-linejoin", "round");
        checkmark.setAttribute("fill", "none");

        svg.appendChild(successCircle);
        svg.appendChild(checkmark);
        break;
      }

      case "error": {
        // Use direct hex color instead of CSS variable
        const errorColor = "var(--toaster-error-color) !important";
        svg.setAttribute("stroke", errorColor);
        svg.setAttribute("stroke-width", "2.5");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");

        const errorCircle = document.createElementNS(svgNS, "circle");
        errorCircle.setAttribute("cx", "12");
        errorCircle.setAttribute("cy", "12");
        errorCircle.setAttribute("r", "10");
        errorCircle.setAttribute("stroke", errorColor);
        errorCircle.setAttribute("fill", "none");

        // Use path element instead of separate lines for X mark
        const xMark = document.createElementNS(svgNS, "path");
        xMark.setAttribute("d", "M15 9L9 15M9 9L15 15");
        xMark.setAttribute("stroke", errorColor);
        xMark.setAttribute("stroke-width", "2.5");
        xMark.setAttribute("stroke-linecap", "round");
        xMark.setAttribute("stroke-linejoin", "round");
        xMark.setAttribute("fill", "none");

        svg.appendChild(errorCircle);
        svg.appendChild(xMark);
        break;
      }

      case "info": {
        const infoColor = "var(--toaster-info-color) !important";
        svg.setAttribute("stroke", infoColor);
        
        // Add style to ensure color is respected
        svg.setAttribute("style", `stroke: ${infoColor} !important;`);
        
        const infoCircle = document.createElementNS(svgNS, "circle");
        infoCircle.setAttribute("cx", "12");
        infoCircle.setAttribute("cy", "12");
        infoCircle.setAttribute("r", "10");
        infoCircle.setAttribute("stroke", infoColor);
        infoCircle.setAttribute("fill", "none");
        // Add inline style to force color
        infoCircle.setAttribute("style", `stroke: ${infoColor} !important;`);
        
        // Use path element instead of lines for better consistency
        const infoSymbol = document.createElementNS(svgNS, "path");
        infoSymbol.setAttribute("d", "M12 16L12 12M12 8L12.01 8");
        infoSymbol.setAttribute("stroke", infoColor);
        infoSymbol.setAttribute("stroke-width", "3");
        infoSymbol.setAttribute("stroke-linecap", "round");
        infoSymbol.setAttribute("fill", "none");
        // Add inline style to force color
        infoSymbol.setAttribute("style", `stroke: ${infoColor} !important;`);
        
        svg.appendChild(infoCircle);
        svg.appendChild(infoSymbol);
        break;
      }
  
      case "warn": {
        const warnColor = "var(--toaster-warn-color) !important";
        svg.setAttribute("stroke", warnColor);
        
        // Add style to ensure color is respected
        svg.setAttribute("style", `stroke: ${warnColor} !important;`);
        
        // Triangle for warning
        const triangle = document.createElementNS(svgNS, "path");
        triangle.setAttribute(
          "d",
          "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        );
        triangle.setAttribute("stroke", warnColor);
        triangle.setAttribute("fill", "none");
        triangle.setAttribute("stroke-width", "2");
        // Add inline style to force color
        triangle.setAttribute("style", `stroke: ${warnColor} !important;`);
        
        // Use path element for exclamation mark instead of separate lines
        const exclamation = document.createElementNS(svgNS, "path");
        exclamation.setAttribute("d", "M12 9L12 13M12 17L12.01 17");
        exclamation.setAttribute("stroke", warnColor);
        exclamation.setAttribute("stroke-width", "2");
        exclamation.setAttribute("stroke-linecap", "round");
        exclamation.setAttribute("fill", "none");
        // Add inline style to force color
        exclamation.setAttribute("style", `stroke: ${warnColor} !important;`);
        
        svg.appendChild(triangle);
        svg.appendChild(exclamation);
        break;
      }

      case "loading":
      default: {
        const loadingColor = "var(--toaster-loading-color) !important";
        // Use a properly centered SVG for the gear
        svg.setAttribute("class", "gear");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");

        // Create a centered gear with proper rotation point
        const gear = document.createElementNS(svgNS, "g");

        // Center circle
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "12");
        circle.setAttribute("r", "2");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("fill", loadingColor);
        circle.setAttribute("stroke", loadingColor);

        // Create spokes/teeth for the gear at equal angles
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * 2 * Math.PI;
          const innerX = 12 + 4 * Math.cos(angle);
          const innerY = 12 + 4 * Math.sin(angle);
          const outerX = 12 + 9 * Math.cos(angle);
          const outerY = 12 + 9 * Math.sin(angle);

          const line = document.createElementNS(svgNS, "line");
          line.setAttribute("x1", innerX);
          line.setAttribute("y1", innerY);
          line.setAttribute("x2", outerX);
          line.setAttribute("y2", outerY);
          line.setAttribute("stroke", loadingColor);
          line.setAttribute("stroke-width", "1");
          line.setAttribute("stroke-linecap", "round");

          gear.appendChild(line);
        }

        gear.appendChild(circle);
        svg.appendChild(gear);
        break;
      }
    }

    this.progressIcon.appendChild(svg);
  }

  updateProgress(current, total) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    // Validate inputs
    current = parseInt(current);
    total = parseInt(total);

    if (isNaN(current) || isNaN(total) || current < 0 || total <= 0) {
      console.warn("Invalid progress values:", { current, total });
      current = 0;
      total = 1;
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
      this.progressBar.style.backgroundColor = "var(--toaster-success-color)";
    }

    this.setIcon("success");

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 3000);
  }

  /**
   * Main message display method for the toaster
   * @param {string} message - Message to display
   * @param {string} severity - Message severity: "info", "success", "error", "warn", "loading"
   * @param {number} duration - Display duration in ms, 0 for persistent
   */
  showMessage(message, severity = "info", duration = 3000) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.progressBar) {
      switch (severity) {
        case "success":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor =
            "var(--toaster-success-color)";
          this.progressBar.style.display = "block";
          break;
        case "error":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor = "var(--toaster-error-color)";
          this.progressBar.style.display = "block";
          break;
        case "warn":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor = "var(--toaster-warn-color)";
          this.progressBar.style.display = "block";
          break;
        case "loading":
          this.progressBar.style.backgroundColor =
            "var(--toaster-loading-color)";
          break;
        case "info":
          this.progressBar.style.backgroundColor = "var(--toaster-info-color)";
          break;
        default:
          this.progressBar.style.display = "none";
          break;
      }
    }

    // Set the appropriate icon
    this.setIcon(severity);

    // Set the message text
    if (this.progressText) {
      this.progressText.textContent = message ? String(message) : "";
    }

    if (duration === 0) {
      return;
    }

    // Validate and set duration
    duration = typeof duration === "number" && duration > 0 ? duration : 3000;
    duration = Math.min(duration, 10000);

    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, duration);
  }

  // Convenience methods that use the core showMessage function
  showSuccess(message) {
    this.showMessage(message || "Operation successful!", "success", 3000);
  }

  showError(message) {
    this.showMessage(message || "Operation failed", "error", 5000);
  }

  showWarning(message) {
    this.showMessage(message || "Warning", "warn", 4000);
  }

  showInfo(message) {
    this.showMessage(message || "Information", "info", 3000);
  }

  showLoading(message) {
    this.showMessage(message || "Loading...", "loading", 0);
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
