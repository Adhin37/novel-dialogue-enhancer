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
      background-color: #4caf50;
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
      /* Make sure SVG elements are visible in both light and dark modes */
      #${this.iconId} svg {
        color-scheme: light dark;
      }
      #root {
        --gear-color: #ffffffe7;
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
        svg.setAttribute("stroke", "#4caf50");
        svg.setAttribute("stroke-width", "3");

        const successCircle = document.createElementNS(svgNS, "circle");
        successCircle.setAttribute("cx", "12");
        successCircle.setAttribute("cy", "12");
        successCircle.setAttribute("r", "10");
        successCircle.setAttribute("stroke", "#4caf50");
        successCircle.setAttribute("fill", "none");

        const checkmark = document.createElementNS(svgNS, "path");
        checkmark.setAttribute("d", "M8 12l3 3 6-6");
        checkmark.setAttribute("stroke", "#4caf50");
        checkmark.setAttribute("fill", "none");

        svg.appendChild(successCircle);
        svg.appendChild(checkmark);
        break;
      }

      case "error": {
        svg.setAttribute("stroke", "#f44336");
        svg.setAttribute("stroke-width", "3");

        const errorCircle = document.createElementNS(svgNS, "circle");
        errorCircle.setAttribute("cx", "12");
        errorCircle.setAttribute("cy", "12");
        errorCircle.setAttribute("r", "10");
        errorCircle.setAttribute("stroke", "#f44336");
        errorCircle.setAttribute("fill", "none");

        const line1 = document.createElementNS(svgNS, "line");
        line1.setAttribute("x1", "15");
        line1.setAttribute("y1", "9");
        line1.setAttribute("x2", "9");
        line1.setAttribute("y2", "15");
        line1.setAttribute("stroke", "#f44336");

        const line2 = document.createElementNS(svgNS, "line");
        line2.setAttribute("x1", "9");
        line2.setAttribute("y1", "9");
        line2.setAttribute("x2", "15");
        line2.setAttribute("y2", "15");
        line2.setAttribute("stroke", "#f44336");

        svg.appendChild(errorCircle);
        svg.appendChild(line1);
        svg.appendChild(line2);
        break;
      }

      case "info": {
        const iconColor = "#3498db";
        svg.setAttribute("stroke", iconColor);
        svg.setAttribute("stroke-width", "2");

        const infoCircle = document.createElementNS(svgNS, "circle");
        infoCircle.setAttribute("cx", "12");
        infoCircle.setAttribute("cy", "12");
        infoCircle.setAttribute("r", "10");
        infoCircle.setAttribute("stroke", iconColor);
        infoCircle.setAttribute("fill", "none");

        const infoLine1 = document.createElementNS(svgNS, "line");
        infoLine1.setAttribute("x1", "12");
        infoLine1.setAttribute("y1", "16");
        infoLine1.setAttribute("x2", "12");
        infoLine1.setAttribute("y2", "12");
        infoLine1.setAttribute("stroke", iconColor);

        const infoLine2 = document.createElementNS(svgNS, "line");
        infoLine2.setAttribute("x1", "12");
        infoLine2.setAttribute("y1", "8");
        infoLine2.setAttribute("x2", "12.01");
        infoLine2.setAttribute("y2", "8");
        infoLine2.setAttribute("stroke", iconColor);

        svg.appendChild(infoCircle);
        svg.appendChild(infoLine1);
        svg.appendChild(infoLine2);
        break;
      }

      case "warn": {
        const iconColor = "#ff9800";
        svg.setAttribute("stroke", iconColor);
        svg.setAttribute("stroke-width", "2");

        const triangle = document.createElementNS(svgNS, "path");
        triangle.setAttribute(
          "d",
          "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        );
        triangle.setAttribute("stroke", iconColor);
        triangle.setAttribute("fill", "none");

        const exclamation = document.createElementNS(svgNS, "line");
        exclamation.setAttribute("x1", "12");
        exclamation.setAttribute("y1", "9");
        exclamation.setAttribute("x2", "12");
        exclamation.setAttribute("y2", "13");
        exclamation.setAttribute("stroke", iconColor);

        const dot = document.createElementNS(svgNS, "line");
        dot.setAttribute("x1", "12");
        dot.setAttribute("y1", "17");
        dot.setAttribute("x2", "12.01");
        dot.setAttribute("y2", "17");
        dot.setAttribute("stroke", iconColor);

        svg.appendChild(triangle);
        svg.appendChild(exclamation);
        svg.appendChild(dot);
        break;
      }

      case "loading":
      default: {
        // Use a properly centered SVG for the gear
        svg.setAttribute("class", "gear");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");

        // Create a centered gear with proper rotation point
        const gear = document.createElementNS(svgNS, "g");
        const gearColor = "var(--gear-color)";

        // Center circle
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", "12");
        circle.setAttribute("cy", "12");
        circle.setAttribute("r", "2");
        circle.setAttribute("stroke-width", "2");
        circle.setAttribute("fill", gearColor);
        circle.setAttribute("stroke", gearColor);

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
          line.setAttribute("stroke", gearColor);
          line.setAttribute("stroke-width", "2");
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
      this.progressBar.style.backgroundColor = "#4caf50";
    }

    this.setIcon("success");

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 3000);
  }

  showMessage(message, severity = "info", duration = 3000) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    // Set up the progress bar based on severity
    if (this.progressBar) {
      switch (severity) {
        case "success":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor = "#4caf50";
          break;
        case "error":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor = "#f44336";
          break;
        case "warn":
          this.progressBar.style.width = "100%";
          this.progressBar.style.backgroundColor = "#ff9800";
          break;
        case "info":
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

    // Validate and set duration
    duration = typeof duration === "number" && duration > 0 ? duration : 3000;
    duration = Math.min(duration, 10000);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

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
