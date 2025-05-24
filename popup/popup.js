document.addEventListener("DOMContentLoaded", async () => {
  const pauseButton = document.getElementById("pause-button");
  const whitelistButton = document.getElementById("whitelist-button");
  const whitelistText = document.getElementById("whitelist-text");
  const preserveNamesToggle = document.getElementById("preserve-names-toggle");
  const fixPronounsToggle = document.getElementById("fix-pronouns-toggle");
  const enhanceNowBtn = document.getElementById("enhance-now-btn");
  const statusMessage = document.getElementById("status-message");
  const currentSite = document.getElementById("current-site");

  let currentTabUrl = "";
  let currentTabHostname = "";
  let whitelistedSites = [];
  let isExtensionPaused = false;
  const storage = new StorageManager();

  // Initialize dark mode manager if available
  if (window.darkModeManager) {
    window.darkModeManager.init();
  }

  try {
    // Load all settings at once using StorageManager
    const settings = await storage.getMultiple(
      ["whitelistedSites", "isExtensionPaused", "preserveNames", "fixPronouns"],
      {
        whitelistedSites: [],
        isExtensionPaused: false,
        preserveNames: true,
        fixPronouns: true
      }
    );

    whitelistedSites = Array.isArray(settings.whitelistedSites)
      ? settings.whitelistedSites
      : [];
    isExtensionPaused = Boolean(settings.isExtensionPaused);
    preserveNamesToggle.checked = Boolean(settings.preserveNames);
    fixPronounsToggle.checked = Boolean(settings.fixPronouns);

    console.log("Loaded settings:", {
      whitelistedSites: whitelistedSites.length,
      isExtensionPaused,
      preserveNames: preserveNamesToggle.checked,
      fixPronouns: fixPronounsToggle.checked
    });

    processCurrentTab();
    updatePauseButton();
  } catch (error) {
    console.error("Error loading initial settings:", error);
    // Use defaults on error
    whitelistedSites = [];
    isExtensionPaused = false;
    preserveNamesToggle.checked = true;
    fixPronounsToggle.checked = true;

    processCurrentTab();
    updatePauseButton();
  }

  // Update settings using StorageManager
  preserveNamesToggle.addEventListener("change", async function () {
    try {
      await storage.set("preserveNames", this.checked);
      console.log(`Preserve names setting updated: ${this.checked}`);
    } catch (error) {
      console.error("Error saving preserve names setting:", error);
    }
  });

  fixPronounsToggle.addEventListener("change", async function () {
    try {
      await storage.set("fixPronouns", this.checked);
      console.log(`Fix pronouns setting updated: ${this.checked}`);
    } catch (error) {
      console.error("Error saving fix pronouns setting:", error);
    }
  });

  // Handle whitelist button click
  whitelistButton.addEventListener("click", handleWhitelistButtonClick);

  // Handle pause/resume button
  pauseButton.addEventListener("click", async () => {
    // Toggle paused CSS class for visual feedback
    document.getElementById("header").classList.toggle("paused");

    isExtensionPaused = !isExtensionPaused;

    try {
      await storage.set("isExtensionPaused", isExtensionPaused);
      console.log(`Extension paused state set to: ${isExtensionPaused}`);

      if (isExtensionPaused) {
        await terminateActiveOperations();
      }

      updatePauseButton();
      updateStatus();
    } catch (error) {
      console.error("Failed to save pause state:", error);
      statusMessage.textContent = "Error saving pause state";
      setTimeout(() => updateStatus(), 2000);
    }
  });

  enhanceNowBtn.addEventListener("click", handleEnhanceNowClick);

  /**
   * Terminate active operations when pausing extension
   */
  async function terminateActiveOperations() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
          console.error("No active tabs found for termination:", tabs);
          statusMessage.textContent = "Extension paused (no active tab)";
          resolve();
          return;
        }

        const activeTab = tabs[0];
        if (!activeTab || !activeTab.id) {
          console.error("Invalid active tab for termination:", activeTab);
          statusMessage.textContent = "Extension paused (invalid tab)";
          resolve();
          return;
        }

        try {
          chrome.tabs.sendMessage(
            activeTab.id,
            { action: "terminateOperations" },
            (terminateResponse) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "Failed to send termination signal:",
                  chrome.runtime.lastError
                );
              } else if (terminateResponse) {
                console.log(
                  "Termination signal sent successfully:",
                  terminateResponse
                );
              }
              resolve();
            }
          );

          statusMessage.textContent = "Extension paused, operations terminated";
        } catch (error) {
          console.error("Failed to send termination signal:", error);
          statusMessage.textContent = "Extension paused (termination failed)";
          resolve();
        }
      });

      // Also terminate background requests
      chrome.runtime.sendMessage(
        { action: "terminateAllRequests" },
        (terminateResponse) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Failed to terminate background requests:",
              chrome.runtime.lastError
            );
          } else if (terminateResponse) {
            console.log("Background requests terminated:", terminateResponse);
          }
        }
      );
    });
  }

  /**
   * Handle whitelist button click with proper error handling
   */
  function handleWhitelistButtonClick() {
    if (!currentTabHostname) {
      statusMessage.textContent = "No valid hostname detected";
      return;
    }

    const isCurrentlyWhitelisted = isSiteWhitelisted(
      currentTabHostname,
      whitelistedSites
    );

    if (isCurrentlyWhitelisted) {
      removeFromWhitelist();
    } else {
      addToWhitelist();
    }
  }

  /**
   * Add current site to whitelist
   */
  function addToWhitelist() {
    chrome.runtime.sendMessage(
      {
        action: "addSiteToWhitelist",
        url: currentTabUrl
      },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          statusMessage.textContent = "Error communicating with extension";
          setTimeout(() => updateStatus(), 2000);
          return;
        }

        if (!response || typeof response !== "object") {
          console.warn("Invalid add whitelist response:", response);
          statusMessage.textContent = "Invalid response format";
          setTimeout(() => updateStatus(), 2000);
          return;
        }

        if (response.success) {
          console.log(`Successfully added ${currentTabHostname} to whitelist`);

          // Update local whitelist array and storage
          if (!whitelistedSites.includes(currentTabHostname)) {
            whitelistedSites.push(currentTabHostname);

            try {
              await storage.set("whitelistedSites", whitelistedSites);
              console.log(`Whitelist updated: added ${currentTabHostname}`);
            } catch (error) {
              console.error("Error updating local whitelist storage:", error);
            }
          }

          updateWhitelistButton(true);
          updateEnhanceButton(true);
          statusMessage.textContent =
            response.message || `${currentTabHostname} added to whitelist`;
          setTimeout(() => updateStatus(), 2000);
          sendPageStatusUpdate(true);
        } else {
          console.warn("Failed to add to whitelist:", response.message);
          statusMessage.textContent =
            response.message || "Failed to add site to whitelist";
          setTimeout(() => updateStatus(), 2000);
        }
      }
    );
  }

  /**
   * Remove current site from whitelist
   */
  function removeFromWhitelist() {
    chrome.runtime.sendMessage(
      {
        action: "removeSiteFromWhitelist",
        hostname: currentTabHostname
      },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          statusMessage.textContent = "Error communicating with extension";
          setTimeout(() => updateStatus(), 2000);
          return;
        }

        if (!response || typeof response !== "object") {
          console.warn("Invalid remove whitelist response:", response);
          statusMessage.textContent = "Invalid response format";
          setTimeout(() => updateStatus(), 2000);
          return;
        }

        if (response.success) {
          console.log(
            `Successfully removed ${currentTabHostname} from whitelist`
          );

          // Update local whitelist array and storage
          const originalLength = whitelistedSites.length;
          whitelistedSites = whitelistedSites.filter(
            (site) => site !== currentTabHostname
          );

          if (whitelistedSites.length < originalLength) {
            try {
              await storage.set("whitelistedSites", whitelistedSites);
              console.log(`Whitelist updated: removed ${currentTabHostname}`);
            } catch (error) {
              console.error("Error updating local whitelist storage:", error);
            }
          }

          updateWhitelistButton(false);
          updateEnhanceButton(false);
          statusMessage.textContent = `${currentTabHostname} removed from whitelist`;
          setTimeout(() => updateStatus(), 2000);
          sendPageStatusUpdate(false);
        } else {
          console.warn("Failed to remove from whitelist:", response.message);
          statusMessage.textContent =
            response.message || "Failed to remove site";
          setTimeout(() => updateStatus(), 2000);
        }
      }
    );
  }

  /**
   * Enhanced enhance now button handler with better error handling
   */
  function handleEnhanceNowClick() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
        console.error("No active tabs found for enhancement:", tabs);
        statusMessage.textContent = "Error: No active tab found";
        setTimeout(() => updateStatus(), 2000);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        console.error("Invalid active tab for enhancement:", activeTab);
        statusMessage.textContent = "Error: Invalid active tab";
        setTimeout(() => updateStatus(), 2000);
        return;
      }

      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "ping" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Content script ping failed:",
                chrome.runtime.lastError
              );
              statusMessage.textContent = "Extension not ready on this page";
              setTimeout(() => updateStatus(), 2000);
              return;
            }

            if (!response || typeof response !== "object") {
              console.warn("Invalid ping response:", response);
              statusMessage.textContent = "Invalid extension response";
              setTimeout(() => updateStatus(), 2000);
              return;
            }

            if (!response.whitelisted) {
              console.log("Site not whitelisted for enhancement");
              statusMessage.textContent = "Site must be whitelisted first";
              setTimeout(() => updateStatus(), 2000);
              return;
            }

            console.log("Sending enhancement request...");
            chrome.tabs.sendMessage(
              activeTab.id,
              {
                action: "enhanceNow",
                settings: {
                  isExtensionPaused: isExtensionPaused,
                  preserveNames: preserveNamesToggle.checked,
                  fixPronouns: fixPronounsToggle.checked
                }
              },
              (enhanceResponse) => {
                if (chrome.runtime.lastError) {
                  console.error(
                    "Enhancement request failed:",
                    chrome.runtime.lastError
                  );
                  statusMessage.textContent = "Enhancement failed";
                  setTimeout(() => updateStatus(), 2000);
                  return;
                }

                if (!enhanceResponse || typeof enhanceResponse !== "object") {
                  console.warn(
                    "Invalid enhancement response:",
                    enhanceResponse
                  );
                  statusMessage.textContent = "Enhancement started...";
                  setTimeout(() => updateStatus(), 2000);
                  return;
                }

                if (enhanceResponse.status === "enhanced") {
                  console.log(
                    "Enhancement completed successfully:",
                    enhanceResponse.stats
                  );
                  statusMessage.textContent = "Enhancement applied!";
                } else if (enhanceResponse.status === "failed") {
                  console.error("Enhancement failed:", enhanceResponse.error);
                  statusMessage.textContent = `Enhancement failed: ${
                    enhanceResponse.error || "Unknown error"
                  }`;
                } else {
                  console.log("Enhancement status:", enhanceResponse.status);
                  statusMessage.textContent = "Enhancement started...";
                }

                setTimeout(() => updateStatus(), 2000);
              }
            );
          }
        );
      } catch (error) {
        console.error("Exception in handleEnhanceNowClick:", error);
        statusMessage.textContent = "Error: " + error.message;
        setTimeout(() => updateStatus(), 2000);
      }
    });
  }

  /**
   * Check whitelist status with background page fallback and error handling
   */
  function checkWhitelistWithBackground() {
    const isWhitelisted = isSiteWhitelisted(
      currentTabHostname,
      whitelistedSites
    );
    updateWhitelistButton(isWhitelisted);
    updateEnhanceButton(isWhitelisted);

    chrome.runtime.sendMessage(
      { action: "checkSitePermission", url: currentTabUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Permission check failed:", chrome.runtime.lastError);
          updateStatus();
          return;
        }

        if (!response || typeof response !== "object") {
          console.warn("Invalid permission check response:", response);
          updateStatus();
          return;
        }

        const hasPermission = Boolean(response.hasPermission);
        console.log(
          `Permission check result for ${currentTabHostname}: ${hasPermission}`
        );

        if (hasPermission) {
          updateWhitelistButton(true);
          updateEnhanceButton(true);
        } else {
          updateWhitelistButton(false);
          updateEnhanceButton(false);
        }
        updateStatus();
      }
    );
  }

  /**
   * Process current tab with improved error handling
   */
  function processCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
        console.error("No active tabs found:", tabs);
        statusMessage.textContent = "No active tab found";
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab || !activeTab.url) {
        console.error("Invalid active tab:", activeTab);
        statusMessage.textContent = "Invalid tab URL";
        return;
      }

      try {
        const url = new URL(activeTab.url);
        currentTabUrl = activeTab.url;
        currentTabHostname = url.hostname;
        currentSite.textContent = currentTabHostname;

        console.log(`Processing tab: ${currentTabHostname}`);

        const isChromePage = currentTabUrl.startsWith("chrome");
        if (isChromePage) {
          console.log("Chrome page detected, disabling features");
          whitelistButton.disabled = true;
          whitelistButton.classList.add("disabled");
          whitelistText.textContent = "Not Available";
          enhanceNowBtn.disabled = true;
          enhanceNowBtn.classList.add("disabled");
          statusMessage.textContent = "Enhancement not available on this page";
          return;
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          { action: "ping" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.log(
                "Content script not available, using background check"
              );
              checkWhitelistWithBackground();
              return;
            }

            if (!response || typeof response !== "object") {
              console.warn("Invalid content script response:", response);
              checkWhitelistWithBackground();
              return;
            }

            const isWhitelisted = Boolean(response.whitelisted);
            console.log(`Content script whitelist status: ${isWhitelisted}`);

            updateWhitelistButton(isWhitelisted);
            updateEnhanceButton(isWhitelisted);
            updateStatus();
          }
        );
      } catch (error) {
        console.error("Error processing current tab:", error);
        statusMessage.textContent = "Error processing current page";
      }
    });
  }

  /**
   * Helper function to check if a site is whitelisted
   * @param {string} hostname - The hostname to check
   * @param {Array} whitelistedSites - Array of whitelisted sites
   * @return {boolean} - Whether the site is whitelisted
   */
  function isSiteWhitelisted(hostname, whitelistedSites) {
    if (!hostname || !Array.isArray(whitelistedSites)) {
      return false;
    }

    return whitelistedSites.some(
      (site) => site && (hostname === site || hostname.endsWith("." + site))
    );
  }

  /**
   * Update whitelist button state based on whitelist status
   * @param {boolean} isWhitelisted - Whether the site is whitelisted
   */
  function updateWhitelistButton(isWhitelisted) {
    const whitelistedState = Boolean(isWhitelisted);
    if (whitelistedState) {
      whitelistButton.classList.add("active");
      whitelistText.textContent = "Whitelisted";
    } else {
      whitelistButton.classList.remove("active");
      whitelistText.textContent = "Add to Whitelist";
    }
  }

  /**
   * Update enhance button state based on whitelist status and pause state
   * @param {boolean} isWhitelisted - Whether the site is whitelisted
   */
  function updateEnhanceButton(isWhitelisted) {
    const shouldEnable = Boolean(isWhitelisted) && !isExtensionPaused;

    if (shouldEnable) {
      enhanceNowBtn.disabled = false;
      enhanceNowBtn.classList.remove("disabled");
    } else {
      enhanceNowBtn.disabled = true;
      enhanceNowBtn.classList.add("disabled");
    }
  }

  /**
   * Update pause button state based on pause state
   */
  function updatePauseButton() {
    if (isExtensionPaused) {
      pauseButton.classList.add("paused");
      pauseButton.title = "Resume Extension";
    } else {
      pauseButton.classList.remove("paused");
      pauseButton.title = "Pause Extension";
    }

    const isWhitelisted = isSiteWhitelisted(
      currentTabHostname,
      whitelistedSites
    );
    updateEnhanceButton(isWhitelisted);
  }

  /**
   * Update status message based on extension state and whitelist status
   */
  function updateStatus() {
    if (isExtensionPaused) {
      statusMessage.textContent = "Extension paused";
      updateEnhanceButton(false);
      return;
    }

    if (!currentTabHostname) {
      statusMessage.textContent = "Loading...";
      return;
    }

    const isWhitelisted = isSiteWhitelisted(
      currentTabHostname,
      whitelistedSites
    );
    if (isWhitelisted) {
      statusMessage.textContent = "Enhancement active";
      updateEnhanceButton(true);
      return;
    }

    statusMessage.textContent =
      "Please whitelist this site to enable enhancement";
    updateEnhanceButton(false);
  }

  /**
   * Send page status update to content script
   * @param {boolean} isWhitelisted - Whether the site is whitelisted
   */
  function sendPageStatusUpdate(isWhitelisted) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !Array.isArray(tabs) || tabs.length === 0) {
        console.error("No active tabs found for status update:", tabs);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) {
        console.error("Invalid active tab for status update:", activeTab);
        return;
      }

      try {
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            action: "updatePageStatus",
            disabled: !isWhitelisted
          },
          (updateResponse) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Failed to send page status update:",
                chrome.runtime.lastError
              );
            } else if (updateResponse) {
              console.log(
                `Page status update sent successfully: ${updateResponse.status}`
              );
            }
          }
        );
      } catch (error) {
        console.error("Failed to send page status update:", error);
      }
    });
  }
});
