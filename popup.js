document.addEventListener("DOMContentLoaded", function () {
  const pauseButton = document.getElementById("pause-button");
  const pauseIcon = document.getElementById("pause-icon");
  const whitelistButton = document.getElementById("whitelist-button");
  const whitelistText = document.getElementById("whitelist-text");
  const preserveNamesToggle = document.getElementById("preserve-names-toggle");
  const fixPronounsToggle = document.getElementById("fix-pronouns-toggle");
  const enhanceNowBtn = document.getElementById("enhance-now-btn");
  const statusMessage = document.getElementById("status-message");
  const currentSite = document.getElementById("current-site");
  const pauseBtn = document.getElementById("pause-button");

  let currentTabUrl = "";
  let whitelistedSites = [];
  let isExtensionPaused = false;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs && tabs.length > 0) {
      const url = new URL(tabs[0].url);
      currentTabUrl = url.hostname;
      currentSite.textContent = currentTabUrl;

      chrome.storage.sync.get("whitelistedSites", function (data) {
        whitelistedSites = data.whitelistedSites || [];
        updateWhitelistButton(whitelistedSites.includes(currentTabUrl));
      });
    }
  });

  chrome.storage.sync.get(
    {
      isExtensionPaused: true,
      preserveNames: true,
      fixPronouns: true
    },
    function (items) {
      isExtensionPaused = !items.isExtensionPaused;
      updatePauseButton();
      preserveNamesToggle.checked = items.preserveNames;
      fixPronounsToggle.checked = items.fixPronouns;
      updateStatus();
    }
  );

  pauseButton.addEventListener("click", function () {
    isExtensionPaused = !isExtensionPaused;
    chrome.storage.sync.set({ isExtensionPaused: !isExtensionPaused });

    if (isExtensionPaused) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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

  pauseBtn.addEventListener("click", function () {
    document.getElementById("header").classList.toggle("paused");
  });

  whitelistButton.addEventListener("click", function () {
    if (currentTabUrl) {
      const isCurrentlyWhitelisted = whitelistedSites.includes(currentTabUrl);

      if (isCurrentlyWhitelisted) {
        whitelistedSites = whitelistedSites.filter(
          (site) => site !== currentTabUrl
        );
      } else {
        whitelistedSites.push(currentTabUrl);
      }

      chrome.storage.sync.set({ whitelistedSites: whitelistedSites });

      updateWhitelistButton(!isCurrentlyWhitelisted);

      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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

  preserveNamesToggle.addEventListener("change", function () {
    chrome.storage.sync.set({ preserveNames: this.checked });
  });

  fixPronounsToggle.addEventListener("change", function () {
    chrome.storage.sync.set({ fixPronouns: this.checked });
  });

  enhanceNowBtn.addEventListener("click", function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (!tabs || tabs.length === 0) {
        statusMessage.textContent = "Error: No active tab found";
        return;
      }

      try {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "ping" },
          function (response) {
            if (chrome.runtime.lastError) {
              statusMessage.textContent = "Extension not ready on this page";
              setTimeout(() => {
                statusMessage.textContent = "Ready";
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

  function updateWhitelistButton(isWhitelisted) {
    if (isWhitelisted) {
      whitelistButton.classList.add("active");
      whitelistText.textContent = "Whitelisted";
    } else {
      whitelistButton.classList.remove("active");
      whitelistText.textContent = "Add to Whitelist";
    }
  }

  function updatePauseButton() {
    if (isExtensionPaused) {
      pauseButton.classList.add("paused");
      pauseButton.title = "Resume Extension";
    } else {
      pauseButton.classList.remove("paused");
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
