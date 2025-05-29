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
    this.logger = window.logger;
  }

  /**
   * Initializes the dark mode manager
   */
  init() {
    if (this.initialized) {
      this.logger.debug("Dark mode manager already initialized, skipping");
      return;
    }
    
    this.logger.debug("Initializing dark mode manager");
    
    const prefersDarkMode = this.mediaQuery.matches;
    this.logger.debug("System preference for dark mode:", prefersDarkMode);
    
    chrome.storage.sync.get("darkMode", (data) => {
      if (chrome.runtime.lastError) {
        this.logger.error("Error loading dark mode setting:", chrome.runtime.lastError);
        this.logger.debug("Falling back to system preference");
        this.setTheme(prefersDarkMode);
        return;
      }

      const isDarkMode = data.darkMode !== undefined ? data.darkMode : prefersDarkMode;
      this.logger.debug("Dark mode setting loaded:", {
        storedValue: data.darkMode,
        systemPreference: prefersDarkMode,
        finalValue: isDarkMode
      });
      
      this.setTheme(isDarkMode);
    });
    
    this.mediaQuery.addEventListener("change", e => {
      const isDark = e.matches;
      this.logger.debug("System dark mode preference changed:", isDark);
      
      chrome.storage.sync.get("darkMode", (data) => {
        if (chrome.runtime.lastError) {
          this.logger.error("Error checking dark mode setting on system change:", chrome.runtime.lastError);
          return;
        }

        if (data.darkMode === undefined) {
          this.logger.debug("No stored preference, following system change");
          this.setTheme(isDark);
          chrome.storage.sync.set({ darkMode: isDark }, () => {
            if (chrome.runtime.lastError) {
              this.logger.error("Error saving system dark mode preference:", chrome.runtime.lastError);
            } else {
              this.logger.debug("Saved system dark mode preference:", isDark);
            }
          });
        } else {
          this.logger.debug("User has explicit preference, ignoring system change:", data.darkMode);
        }
      });
    });
    
    this.initialized = true;
    this.logger.info("Dark mode manager initialized successfully");
  }

  /**
   * Set theme based on dark mode state
   * @param {boolean} isDark - Whether dark mode is enabled
   */
  setTheme(isDark) {
    this.logger.debug("Setting theme:", isDark ? "dark" : "light");
    
    try {
      if (isDark) {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      
      document.dispatchEvent(new CustomEvent('themeChanged', { detail: { isDark } }));
      
      this.logger.debug("Theme applied successfully:", isDark ? "dark" : "light");
    } catch (error) {
      this.logger.error("Error applying theme:", error);
    }
  }
  
  /**
   * Get current theme
   * @param {function} callback - Callback function to receive the current theme state
   */
  getCurrentTheme(callback) {
    this.logger.debug("Getting current theme");
    
    chrome.storage.sync.get("darkMode", (data) => {
      if (chrome.runtime.lastError) {
        this.logger.error("Error getting current theme:", chrome.runtime.lastError);
        this.logger.debug("Falling back to system preference");
        callback(this.mediaQuery.matches);
        return;
      }

      const currentTheme = data.darkMode !== undefined ? data.darkMode : this.mediaQuery.matches;
      this.logger.debug("Current theme retrieved:", {
        storedValue: data.darkMode,
        systemPreference: this.mediaQuery.matches,
        finalValue: currentTheme
      });
      
      callback(currentTheme);
    });
  }
  
  /**
   * Toggle dark mode
   * @param {function} callback - Optional callback function to receive the new theme state
   */
  toggleDarkMode(callback) {
    this.logger.debug("Toggling dark mode");
    
    this.getCurrentTheme((isDark) => {
      const newState = !isDark;
      this.logger.info("Dark mode toggled:", {
        from: isDark ? "dark" : "light",
        to: newState ? "dark" : "light"
      });
      
      chrome.storage.sync.set({ darkMode: newState }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error("Error saving toggled dark mode setting:", chrome.runtime.lastError);
        } else {
          this.logger.debug("Dark mode preference saved:", newState);
        }
      });
      
      this.setTheme(newState);
      
      if (callback) {
        try {
          callback(newState);
        } catch (error) {
          this.logger.error("Error in dark mode toggle callback:", error);
        }
      }
    });
  }
  
  /**
   * Sync UI element with current theme state
   * @param {HTMLElement} element - The element to sync
   */
  syncUIWithTheme(element) {
    if (!element) {
      this.logger.warn("No element provided for theme sync");
      return;
    }

    this.logger.debug("Syncing UI element with theme:", element.tagName, element.id || element.className);
    
    this.getCurrentTheme((isDark) => {
      try {
        if (element.type === 'checkbox') {
          element.checked = isDark;
          this.logger.debug("UI element synced - checkbox set to:", isDark);
        } else {
          this.logger.warn("Unsupported element type for theme sync:", element.type);
        }
      } catch (error) {
        this.logger.error("Error syncing UI element with theme:", error);
      }
    });
  }
}

// Create singleton instance
const darkModeManager = new DarkModeManager();

if (typeof module !== "undefined") {
  module.exports = darkModeManager;
} else {
  window.darkModeManager = darkModeManager;
}