// detectDarkMode.js - Handles dark mode detection and application
// Adapted from options.js

function initDarkMode() {
  // Check for system preference
  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  // Check for saved theme preference
  chrome.storage.sync.get("darkMode", function(data) {
    const isDarkMode = data.darkMode !== undefined ? data.darkMode : prefersDarkMode;
    
    // Apply theme
    setTheme(isDarkMode);
  });
  
  // Listen for system preference changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", e => {
    const isDark = e.matches;
    setTheme(isDark);
    chrome.storage.sync.set({ darkMode: isDark });
  });
}

// Set theme based on dark mode state
function setTheme(isDark) {
  if (isDark) {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initDarkMode);
