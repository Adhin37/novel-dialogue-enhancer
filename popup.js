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
    statusMessage.textContent = "Applying enhancement...";
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || tabs.length === 0) {
        updateStatusWithError("No active tab found");
        return;
      }
      
      const activeTab = tabs[0];
      
      // Check if we can access this tab (depends on permissions in manifest)
      const url = new URL(activeTab.url);
      const canAccess = [
        "fanmtl.com",
        "novelupdates.com",
        "wuxiaworld.com",
        "webnovel.com"
      ].some(domain => url.hostname.includes(domain));
      
      if (!canAccess) {
        updateStatusWithError("Extension not enabled for this site");
        return;
      }
      
      // Send message with error handling
      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            action: "enhanceNow",
            settings: {
              enhancerEnabled: enhancerToggle.checked,
              preserveNames: preserveNamesToggle.checked,
              fixPronouns: fixPronounsToggle.checked
            }
          },
          // Add response callback
          function(response) {
            if (chrome.runtime.lastError) {
              // Handle error if content script isn't ready
              console.error(chrome.runtime.lastError.message);
              updateStatusWithError("Content script not ready. Try reloading the page.");
              return;
            }
            
            // Only update status on successful response
            statusMessage.textContent = "Enhancement applied!";
            setTimeout(() => {
              statusMessage.textContent = "Ready";
            }, 2000);
          }
        );
      } catch (error) {
        updateStatusWithError("Error: " + error.message);
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
  
  function updateStatusWithError(message) {
    statusMessage.textContent = message;
    statusMessage.style.color = "red";
    setTimeout(() => {
      statusMessage.style.color = "";
      updateStatus();
    }, 3000);
  }

  updateStatus();
});