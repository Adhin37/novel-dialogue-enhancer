document.addEventListener('DOMContentLoaded', function() {
  const enhancerToggle = document.getElementById('enhancerToggle');
  const preserveNamesToggle = document.getElementById('preserveNamesToggle');
  const fixPronounsToggle = document.getElementById('fixPronounsToggle');
  const enhanceNowBtn = document.getElementById('enhanceNowBtn');
  const statusMessage = document.getElementById('statusMessage');

  // Load saved settings
  chrome.storage.sync.get({
    enhancerEnabled: true,
    preserveNames: true,
    fixPronouns: true
  }, function(items) {
    enhancerToggle.checked = items.enhancerEnabled;
    preserveNamesToggle.checked = items.preserveNames;
    fixPronounsToggle.checked = items.fixPronouns;
  });

  // Save settings when toggles change
  enhancerToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ enhancerEnabled: this.checked });
    updateStatus();
  });

  preserveNamesToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ preserveNames: this.checked });
  });

  fixPronounsToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ fixPronouns: this.checked });
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
                fixPronouns: fixPronounsToggle.checked
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
    if (enhancerToggle.checked) {
      statusMessage.textContent = "Auto-enhancement active";
    } else {
      statusMessage.textContent = "Extension disabled";
    }
  }

  updateStatus();
});