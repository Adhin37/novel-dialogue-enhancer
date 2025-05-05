document.addEventListener('DOMContentLoaded', function() {
  // Get all UI elements
  const enhancerToggle = document.getElementById('enhancerToggle');
  const disableOnPageToggle = document.getElementById('disableOnPageToggle');
  const preserveNamesToggle = document.getElementById('preserveNamesToggle');
  const fixPronounsToggle = document.getElementById('fixPronounsToggle');
  const useLLMToggle = document.getElementById('use-llm-checkbox');
  const enhanceNowBtn = document.getElementById('enhanceNowBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Store current tab URL to handle per-page settings
  let currentTabUrl = '';
  let disabledPages = [];

  // Get the current tab URL
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0) {
      currentTabUrl = new URL(tabs[0].url).hostname;
      
      // Check if current page is in disabled list
      chrome.storage.sync.get('disabledPages', function(data) {
        disabledPages = data.disabledPages || [];
        disableOnPageToggle.checked = disabledPages.includes(currentTabUrl);
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
    enhancerToggle.checked = items.enhancerEnabled;
    preserveNamesToggle.checked = items.preserveNames;
    fixPronounsToggle.checked = items.fixPronouns;
    useLLMToggle.checked = items.useLLM;
    updateStatus();
  });

  // Save settings when toggles change
  enhancerToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ enhancerEnabled: this.checked });
    updateStatus();
  });

  disableOnPageToggle.addEventListener('change', function() {
    if (currentTabUrl) {
      if (this.checked) {
        // Add current page to disabled list if not already there
        if (!disabledPages.includes(currentTabUrl)) {
          disabledPages.push(currentTabUrl);
        }
      } else {
        // Remove current page from disabled list
        disabledPages = disabledPages.filter(page => page !== currentTabUrl);
      }
      
      // Save updated list
      chrome.storage.sync.set({ disabledPages: disabledPages });
      
      // Notify content script about the change
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs.length > 0) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "updatePageStatus",
              disabled: disableOnPageToggle.checked
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
                enhancerEnabled: enhancerToggle.checked,
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

  function updateStatus() {
    if (!enhancerToggle.checked) {
      statusMessage.textContent = "Extension disabled";
      return;
    }
    
    if (disableOnPageToggle.checked && currentTabUrl) {
      statusMessage.textContent = "Disabled for this site";
      return;
    }
    
    statusMessage.textContent = "Auto-enhancement active";
  }
});