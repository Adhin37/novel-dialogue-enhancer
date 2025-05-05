// toaster.js - Snackbar/toaster notification system for Novel Dialogue Enhancer

// Create and manage a snackbar/toaster notification at the top of the page
class EnhancementToaster {
  constructor() {
    this.toasterId = 'novel-enhancer-toaster';
    this.progressId = 'novel-enhancer-progress';
    this.iconId = 'novel-enhancer-icon';
    this.textId = 'novel-enhancer-text';
    this.toaster = null;
    this.progressBar = null;
    this.progressIcon = null;
    this.progressText = null;
    this.timeoutId = null;
    this.isActive = false;
  }

  // Create the toaster element and add it to the page
  createToaster() {
    // Remove any existing toaster
    this.removeToaster();

    // Create main toaster container
    this.toaster = document.createElement('div');
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

    // Create progress icon (rotating)
    this.progressIcon = document.createElement('div');
    this.progressIcon.id = this.iconId;
    this.progressIcon.innerHTML = '<svg class="gear" width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" fill="none"><circle cx="50" cy="50" r="10" stroke-width="4"/><g stroke-width="4"><line x1="50" y1="5" x2="50" y2="15"/><line x1="50" y1="85" x2="50" y2="95"/><line x1="5" y1="50" x2="15" y2="50"/><line x1="85" y1="50" x2="95" y2="50"/><line x1="20" y1="20" x2="28" y2="28"/><line x1="80" y1="20" x2="72" y2="28"/><line x1="20" y1="80" x2="28" y2="72"/><line x1="80" y1="80" x2="72" y2="72"/></g></svg>';
    this.progressIcon.style.cssText = `
      animation: spin 2s linear infinite;
      transform-origin: 50% 50%;
      transform-box: fill-box;
    `;

    // Create text element
    this.progressText = document.createElement('div');
    this.progressText.id = this.textId;
    this.progressText.textContent = 'Enhancing content...';
    this.progressText.style.cssText = `
      flex-grow: 1;
      font-size: 14px;
    `;

    // Create progress bar
    this.progressBar = document.createElement('div');
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

    // Create close button
    const closeButton = document.createElement('div');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      margin-left: 5px;
      line-height: 1;
    `;
    closeButton.addEventListener('click', () => this.removeToaster());

    // Assemble the toaster
    this.toaster.appendChild(this.progressIcon);
    this.toaster.appendChild(this.progressText);
    this.toaster.appendChild(closeButton);
    this.toaster.appendChild(this.progressBar);

    // Add CSS for animations
    const style = document.createElement('style');
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

    // Add to page
    document.body.appendChild(this.toaster);
    this.isActive = true;
  }

  // Update the progress and text of the toaster
  updateProgress(current, total, useLLM = false) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }

    // Calculate progress percentage
    const percent = Math.min(100, Math.round((current / total) * 100));
    
    // Update progress bar
    if (this.progressBar) {
      this.progressBar.style.width = `${percent}%`;
    }

    // Update text message based on processing type
    const enhancementType = useLLM ? 'AI' : 'rule-based';
    if (this.progressText) {
      if (current >= total) {
        this.progressText.textContent = `Enhancement complete! (${enhancementType} mode)`;
      } else {
        this.progressText.textContent = `Enhancing with ${enhancementType}: ${current}/${total} paragraphs (${percent}%)`;
      }
    }

    // If progress is 100%, set a timeout to hide the toaster
    if (current >= total) {
      this.finishProgress();
    }
  }

  // Set progress to 100% and prepare to hide
  finishProgress() {
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
      this.progressBar.style.backgroundColor = '#4caf50';
    }
    
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    
    // Set timeout to hide the toaster after 3 seconds
    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 3000);
  }

  // Show error in the toaster
  showError(message) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }
    
    // Change style to indicate error
    if (this.progressBar) {
      this.progressBar.style.width = '100%';
      this.progressBar.style.backgroundColor = '#f44336';
    }
    
    // Update icon to error symbol
    if (this.progressIcon) {
      this.progressIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      this.progressIcon.style.animation = 'none';
    }
    
    // Update text
    if (this.progressText) {
      this.progressText.textContent = message || 'Enhancement failed';
    }
    
    // Set timeout to hide the toaster after 5 seconds
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, 5000);
  }

  // Show a simple notification message
  showMessage(message, duration = 3000) {
    if (!this.toaster || !this.isActive) {
      this.createToaster();
    }
    
    // Update icon to info symbol
    if (this.progressIcon) {
      this.progressIcon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      this.progressIcon.style.animation = 'none';
    }
    
    // Update text
    if (this.progressText) {
      this.progressText.textContent = message;
    }
    
    // Hide progress bar
    if (this.progressBar) {
      this.progressBar.style.display = 'none';
    }
    
    // Set timeout to hide the toaster
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.removeToaster();
    }, duration);
  }

  // Remove the toaster from the page
  removeToaster() {
    if (this.toaster && this.toaster.parentNode) {
      // First animate out
      this.toaster.style.opacity = '0';
      this.toaster.style.transform = 'translate(-50%, -20px)';
      
      // Then remove from DOM after animation completes
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

// Export the toaster as a singleton
window.enhancementToaster = new EnhancementToaster();
