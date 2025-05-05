document.addEventListener('DOMContentLoaded', function() {
  // Get all UI elements
  const pauseButton = document.getElementById('pauseButton');
  const pauseIcon = document.getElementById('pauseIcon');
  const whitelistButton = document.getElementById('whitelistButton');
  const whitelistText = document.getElementById('whitelistText');
  const preserveNamesToggle = document.getElementById('preserveNamesToggle');
  const fixPronounsToggle = document.getElementById('fixPronounsToggle');
  const useLLMToggle = document.getElementById('use-llm-checkbox');
  const enhanceNowBtn = document.getElementById('enhanceNowBtn');
  const statusMessage = document.getElementById('statusMessage');
  const currentSite = document.getElementById('currentSite');

  // Store current tab URL for whitelist functionality
  let currentTabUrl = '';
  let whitelistedSites = [];
  let isExtensionPaused = false;

  // Get the current tab URL and display it
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0) {
      const url = new URL(tabs[0].url);
      currentTabUrl = url.hostname;
      currentSite.textContent = currentTabUrl;
      
      // Check if current page is in whitelist
      chrome.storage.sync.get('whitelistedSites', function(data) {
        whitelistedSites = data.whitelistedSites || [];
        updateWhitelistButton(whitelistedSites.includes(currentTabUrl));
      });
    }
  });

  // Load saved settings
  chrome.storage.sync.get({
    enhancerEnabled: true,
    preserveNames: true,
    fixPronouns: true,
    useLLM: false
  }, function(items) {
    isExtensionPaused = !items.enhancerEnabled;
    updatePauseButton();
    preserveNamesToggle.checked = items.preserveNames;
    fixPronounsToggle.checked = items.fixPronouns;
    useLLMToggle.checked = items.useLLM;
    updateStatus();
  });

  // Pause/Resume button
  pauseButton.addEventListener('click', function() {
    isExtensionPaused = !isExtensionPaused;
    chrome.storage.sync.set({ enhancerEnabled: !isExtensionPaused });
    
    // If pausing the extension, send signal to terminate any in-progress operations
    if (isExtensionPaused) {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "terminateOperations"
            });
            statusMessage.textContent = "Extension paused, operations terminated";
          } catch (error) {
            console.error("Failed to send termination signal:", error);
          }
        }
      });
      
      // Also notify background script to abort any pending requests
      chrome.runtime.sendMessage({
        action: "terminateAllRequests"
      });
    }
    
    updatePauseButton();
    updateStatus();
  });

  document.getElementById("pauseButton").addEventListener("click", function () {
    document.getElementById("header").classList.toggle("paused");
  });

  // Whitelist toggle
  whitelistButton.addEventListener('click', function() {
    if (currentTabUrl) {
      const isCurrentlyWhitelisted = whitelistedSites.includes(currentTabUrl);
      
      if (isCurrentlyWhitelisted) {
        // Remove from whitelist
        whitelistedSites = whitelistedSites.filter(site => site !== currentTabUrl);
      } else {
        // Add to whitelist
        whitelistedSites.push(currentTabUrl);
      }
      
      // Save updated list
      chrome.storage.sync.set({ whitelistedSites: whitelistedSites });
      
      // Update UI
      updateWhitelistButton(!isCurrentlyWhitelisted);
      
      // Notify content script about the change
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "updatePageStatus",
              disabled: !isCurrentlyWhitelisted
            });
          } catch (error) {
            console.error("Failed to send page status update:", error);
          }
        }
      });
      
      updateStatus();
    }
  });

  preserveNamesToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ preserveNames: this.checked });
  });

  fixPronounsToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ fixPronouns: this.checked });
  });

  useLLMToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ useLLM: this.checked });
  });

  // Handle enhance now button
  enhanceNowBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        statusMessage.textContent = "Error: No active tab found";
        return;
      }
      
      // Try to send message to content script with error handling
      try {
        // First check if connection is possible
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: "ping" }, 
          function(response) {
            // If there's an error in the messaging, handle it here
            if (chrome.runtime.lastError) {
              statusMessage.textContent = "Extension not ready on this page";
              setTimeout(() => {
                statusMessage.textContent = "Ready";
              }, 2000);
              return;
            }
            
            // If we got here, connection works, so send the main message
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "enhanceNow",
              settings: {
                enhancerEnabled: !isExtensionPaused,
                preserveNames: preserveNamesToggle.checked,
                fixPronouns: fixPronounsToggle.checked,
                useLLM: useLLMToggle.checked
              }
            });
            
            // Update UI
            statusMessage.textContent = "Enhancement applied!";
            setTimeout(() => {
              statusMessage.textContent = "Ready";
            }, 2000);
          }
        );
      } catch (error) {
        statusMessage.textContent = "Error: " + error.message;
        setTimeout(() => {
          statusMessage.textContent = "Ready";
        }, 2000);
      }
    });
  });

  // Helper function to update whitelist button state
  function updateWhitelistButton(isWhitelisted) {
    if (isWhitelisted) {
      whitelistButton.classList.add('active');
      whitelistText.textContent = 'Whitelisted';
    } else {
      whitelistButton.classList.remove('active');
      whitelistText.textContent = 'Add to Whitelist';
    }
  }
  
  // Helper function to update pause button state
  function updatePauseButton() {
    if (isExtensionPaused) {
      pauseButton.classList.add('paused');
      pauseButton.title = "Resume Extension";
    } else {
      pauseButton.classList.remove('paused');
      pauseButton.title = "Pause Extension";
    }
  }

  function updateStatus() {
    if (isExtensionPaused) {
      statusMessage.textContent = "Extension paused";
      return;
    }
    
    if (whitelistedSites.includes(currentTabUrl)) {
      statusMessage.textContent = "Whitelisted site - enhancement active";
      return;
    }
    
    statusMessage.textContent = "Ready to enhance";
  }
});