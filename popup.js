document.addEventListener("DOMContentLoaded", function () {
  const pauseButton = document.getElementById("pause-button");
  const whitelistButton = document.getElementById("whitelist-button");
  const whitelistText = document.getElementById("whitelist-text");
  const preserveNamesToggle = document.getElementById("preserve-names-toggle");
  const fixPronounsToggle = document.getElementById("fix-pronouns-toggle");
  const enhanceNowBtn = document.getElementById("enhance-now-btn");
  const statusMessage = document.getElementById("status-message");
  const currentSite = document.getElementById("current-site");
  const pauseBtn = document.getElementById("pause-button");

  let currentTabUrl = "";
  let currentTabHostname = "";
  let whitelistedSites = [];
  let isExtensionPaused = false;

  // First, load the whitelist data from storage
  chrome.storage.sync.get(
    {
      whitelistedSites: [],
      isExtensionPaused: true,
      preserveNames: true,
      fixPronouns: true
    },
    (items) => {
      // Store loaded data first
      whitelistedSites = items.whitelistedSites || [];
      isExtensionPaused = !items.isExtensionPaused;
      preserveNamesToggle.checked = items.preserveNames;
      fixPronounsToggle.checked = items.fixPronouns;
      
      // Now that we have the whitelist, process the current tab
      processCurrentTab();
      
      // Update UI states
      updatePauseButton();
    }
  );

  function processCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        const url = new URL(tabs[0].url);
        currentTabUrl = tabs[0].url;
        currentTabHostname = url.hostname;
        currentSite.textContent = currentTabHostname;

        updateStatus();

        // Check if the site is a chrome:// URL
        const isChromePage = currentTabUrl.startsWith("chrome");

        // Disable whitelist functionality for chrome:// pages
        if (isChromePage) {
          whitelistButton.disabled = true;
          whitelistButton.classList.add("disabled");
          whitelistText.textContent = "Not Available";
          enhanceNowBtn.disabled = true;
          enhanceNowBtn.classList.add("disabled");
          statusMessage.textContent = "Enhancement not available on this page";
        } else {
          // Check if the site is whitelisted using our loaded data
          const isWhitelisted = isSiteWhitelisted(currentTabHostname, whitelistedSites);
          updateWhitelistButton(isWhitelisted);
          updateEnhanceButton(isWhitelisted);

          // Check site permission status
          chrome.runtime.sendMessage(
            { action: "checkSitePermission", url: currentTabUrl },
            (response) => {
              if (!(response && response.hasPermission)) {
                updateWhitelistButton(false);
                updateEnhanceButton(false);
              }
            }
          );
        }
      }
    });
  }

  // Handle pause/resume button
  pauseButton.addEventListener("click", () => {
    isExtensionPaused = !isExtensionPaused;
    chrome.storage.sync.set({ isExtensionPaused: !isExtensionPaused });

    if (isExtensionPaused) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs.length > 0) {
          try {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "terminateOperations"
            });
            statusMessage.textContent =
              "Extension paused, operations terminated";
          } catch (error) {
            console.error("Failed to send termination signal:", error);
          }
        }
      });

      chrome.runtime.sendMessage({
        action: "terminateAllRequests"
      });
    }

    updatePauseButton();
    updateStatus();
  });

  pauseBtn.addEventListener("click", () => {
    document.getElementById("header").classList.toggle("paused");
  });

  // Handle whitelist button
  whitelistButton.addEventListener("click", () => {
    if (currentTabHostname) {
      const isCurrentlyWhitelisted = isSiteWhitelisted(
        currentTabHostname,
        whitelistedSites
      );

      if (isCurrentlyWhitelisted) {
        // Remove from whitelist
        chrome.runtime.sendMessage(
          {
            action: "removeSiteFromWhitelist",
            hostname: currentTabHostname
          },
          (response) => {
            if (response && response.success) {
              // Update the local whitelist array
              whitelistedSites = whitelistedSites.filter(
                (site) => site !== currentTabHostname
              );

              // Update UI
              updateWhitelistButton(false);
              updateEnhanceButton(false);

              // Show temporary status message
              statusMessage.textContent = `${currentTabHostname} removed from whitelist`;
              setTimeout(() => {
                updateStatus();
              }, 2000);

              // Send message to content script
              sendPageStatusUpdate(false);
            }
          }
        );
      } else {
        // Add to whitelist - first check if we need permissions
        chrome.runtime.sendMessage(
          {
            action: "addSiteToWhitelist",
            url: currentTabUrl
          },
          (response) => {
            if (response && response.success) {
              // Update the local whitelist array
              if (!whitelistedSites.includes(currentTabHostname)) {
                whitelistedSites.push(currentTabHostname);
              }

              // Update UI
              updateWhitelistButton(true);
              updateEnhanceButton(true);

              // Show temporary status message
              statusMessage.textContent =
                response.message || `${currentTabHostname} added to whitelist`;
              setTimeout(() => {
                updateStatus();
              }, 2000);

              // Send message to content script
              sendPageStatusUpdate(true);
            } else {
              // Show error
              statusMessage.textContent =
                response.message || "Failed to add site to whitelist";
              setTimeout(() => {
                updateStatus();
              }, 2000);
            }
          }
        );
      }
    }
  });

  // Toggle settings
  preserveNamesToggle.addEventListener("change", function() {
    chrome.storage.sync.set({ preserveNames: this.checked });
  });

  fixPronounsToggle.addEventListener("change", function() {
    chrome.storage.sync.set({ fixPronouns: this.checked });
  });

  // Enhance now button
  enhanceNowBtn.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        statusMessage.textContent = "Error: No active tab found";
        return;
      }

      try {
        chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            statusMessage.textContent = "Extension not ready on this page";
            setTimeout(() => {
              updateStatus();
            }, 2000);
            return;
          }

          chrome.tabs.sendMessage(tabs[0].id, {
            action: "enhanceNow",
            settings: {
              isExtensionPaused: !isExtensionPaused,
              preserveNames: preserveNamesToggle.checked,
              fixPronouns: fixPronounsToggle.checked
            }
          });

          statusMessage.textContent = "Enhancement applied!";
          setTimeout(() => {
            updateStatus();
          }, 2000);
        });
      } catch (error) {
        statusMessage.textContent = "Error: " + error.message;
        setTimeout(() => {
          updateStatus();
        }, 2000);
      }
    });
  });

  // Helper function to check if a site is whitelisted
  function isSiteWhitelisted(hostname, whitelistedSites) {
    return whitelistedSites.some(
      (site) => hostname === site || hostname.endsWith("." + site)
    );
  }

  // Update whitelist button
  function updateWhitelistButton(isWhitelisted) {
    if (isWhitelisted) {
      whitelistButton.classList.add("active");
      whitelistText.textContent = "Whitelisted";
    } else {
      whitelistButton.classList.remove("active");
      whitelistText.textContent = "Add to Whitelist";
    }
  }

  // Update enhance button status based on whitelist
  function updateEnhanceButton(isWhitelisted) {
    if (isWhitelisted && !isExtensionPaused) {
      enhanceNowBtn.disabled = false;
      enhanceNowBtn.classList.remove("disabled");
    } else {
      enhanceNowBtn.disabled = true;
      enhanceNowBtn.classList.add("disabled");
    }
  }

  // Update pause button
  function updatePauseButton() {
    if (isExtensionPaused) {
      pauseButton.classList.add("paused");
      pauseButton.title = "Resume Extension";
    } else {
      pauseButton.classList.remove("paused");
      pauseButton.title = "Pause Extension";
    }
    
    // Also update enhance button state when pause state changes
    const isWhitelisted = isSiteWhitelisted(currentTabHostname, whitelistedSites);
    updateEnhanceButton(isWhitelisted);
  }

  // Update status message
  function updateStatus() {
    if (isExtensionPaused) {
      statusMessage.textContent = "Extension paused";
      updateEnhanceButton(false); // Disable enhance button when paused
      return;
    }

    if (!currentTabHostname) {
      statusMessage.textContent = "Loading...";
      return;
    }

    const isWhitelisted = isSiteWhitelisted(currentTabHostname, whitelistedSites);
    if (isWhitelisted) {
      statusMessage.textContent = "Enhancement active";
      updateEnhanceButton(true);
      return;
    }

    statusMessage.textContent = "Please whitelist this site to enable enhancement";
    updateEnhanceButton(false);
  }

  // Send page status update to content script
  function sendPageStatusUpdate(isWhitelisted) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs.length > 0) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updatePageStatus",
            disabled: !isWhitelisted
          });
        } catch (error) {
          console.error("Failed to send page status update:", error);
        }
      }
    });
  }
});