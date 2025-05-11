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

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "gear");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("fill", "none");

    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "10");
    circle.setAttribute("stroke-width", "4");

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("stroke-width", "4");

    // Create lines
    const linePositions = [
      ["50", "5", "50", "15"],
      ["50", "85", "50", "95"],
      ["5", "50", "15", "50"],
      ["85", "50", "95", "50"],
      ["20", "20", "28", "28"],
      ["80", "20", "72", "28"],
      ["20", "80", "28", "72"],
      ["80", "80", "72", "72"]
    ];

    linePositions.forEach((pos) => {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", pos[0]);
      line.setAttribute("y1", pos[1]);
      line.setAttribute("x2", pos[2]);
      line.setAttribute("y2", pos[3]);
      g.appendChild(line);
    });

    svg.appendChild(circle);
    svg.appendChild(g);
    this.progressIcon.appendChild(svg);

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
    `;
    document.head.appendChild(style);

    document.body.appendChild(this.toaster);
    this.isActive = true;
  }

  updateProgress(current, total) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }
  
    // Validate inputs
    current = parseInt(current);
    total = parseInt(total);
    
    if (isNaN(current) || isNaN(total) || current < 0 || total <= 0) {
      console.warn("Invalid progress values:", {current, total});
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
      this.progressIcon.innerHTML = "";

      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");

      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "10");

      const line1 = document.createElementNS(svgNS, "line");
      line1.setAttribute("x1", "15");
      line1.setAttribute("y1", "9");
      line1.setAttribute("x2", "9");
      line1.setAttribute("y2", "15");

      const line2 = document.createElementNS(svgNS, "line");
      line2.setAttribute("x1", "9");
      line2.setAttribute("y1", "9");
      line2.setAttribute("x2", "15");
      line2.setAttribute("y2", "15");

      svg.appendChild(circle);
      svg.appendChild(line1);
      svg.appendChild(line2);

      this.progressIcon.appendChild(svg);
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
      this.progressIcon.innerHTML = '';
      
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "20");
      svg.setAttribute("height", "20");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "2");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      
      const circle = document.createElementNS(svgNS, "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "10");
      
      const line1 = document.createElementNS(svgNS, "line");
      line1.setAttribute("x1", "12");
      line1.setAttribute("y1", "16");
      line1.setAttribute("x2", "12");
      line1.setAttribute("y2", "12");
      
      const line2 = document.createElementNS(svgNS, "line");
      line2.setAttribute("x1", "12");
      line2.setAttribute("y1", "8");
      line2.setAttribute("x2", "12.01");
      line2.setAttribute("y2", "8");
      
      svg.appendChild(circle);
      svg.appendChild(line1);
      svg.appendChild(line2);
      
      this.progressIcon.appendChild(svg);
      this.progressIcon.style.animation = "none";
    }
  
    if (this.progressText) {
      // Sanitize message
      this.progressText.textContent = message ? String(message) : "";
    }
  
    if (this.progressBar) {
      this.progressBar.style.display = "none";
    }
  
    // Validate duration
    duration = typeof duration === 'number' && duration > 0 ? duration : 3000;
    duration = Math.min(duration, 10000);
    
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
