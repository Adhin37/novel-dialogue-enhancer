// darkModeManager.js - Main class for dark mode functionality

/**
 * Dark mode manager class
 */
class DarkModeManager {
  /**
   * Creates a new DarkModeManager instance
   */
  constructor() {
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.initialized = false;
  }

  /**
   * Initializes the dark mode manager
   */
  init() {
    if (this.initialized) return;
    
    const prefersDarkMode = this.mediaQuery.matches;
    
    chrome.storage.sync.get("darkMode", (data) => {
      const isDarkMode = data.darkMode !== undefined ? data.darkMode : prefersDarkMode;
      
      this.setTheme(isDarkMode);
    });
    
    this.mediaQuery.addEventListener("change", e => {
      const isDark = e.matches;
      
      chrome.storage.sync.get("darkMode", (data) => {
        if (data.darkMode === undefined) {
          this.setTheme(isDark);
          chrome.storage.sync.set({ darkMode: isDark });
        }
      });
    });
    
    this.initialized = true;
  }

  /**
   * Set theme based on dark mode state
   * @param {boolean} isDark - Whether dark mode is enabled
   */
  setTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    
    document.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
  }
  
  /**
   * Get current theme
   * @param {function} callback - Callback function to receive the current theme state
   */
  getCurrentTheme(callback) {
    chrome.storage.sync.get("darkMode", (data) => {
      if (data.darkMode === undefined) {
        callback(this.mediaQuery.matches);
      } else {
        callback(data.darkMode);
      }
    });
  }
  
  /**
   * Toggle dark mode
   * @param {function} callback - Optional callback function to receive the new theme state
   */
  toggleDarkMode(callback) {
    this.getCurrentTheme((isDark) => {
      const newState = !isDark;
      chrome.storage.sync.set({ darkMode: newState });
      this.setTheme(newState);
      if (callback) callback(newState);
    });
  }
  
  /**
   * Sync UI element with current theme state
   * @param {HTMLElement} element - The element to sync
   */
  syncUIWithTheme(element) {
    this.getCurrentTheme((isDark) => {
      if (element.type === 'checkbox') {
        element.checked = isDark;
      }
    });
  }
}

// Create singleton instance
const darkModeManager = new DarkModeManager();
document.addEventListener("DOMContentLoaded", () => darkModeManager.init());

if (typeof module !== "undefined") {
  module.exports = darkModeManager;
} else {
  window.darkModeManager = darkModeManager;
}