document.addEventListener("DOMContentLoaded", () => {
  const modelNameInput = document.getElementById("model-name");
  const saveButton = document.getElementById("save");
  const resetButton = document.getElementById("reset");
  const maxChunkSizeSlider = document.getElementById("max-chunk-size");
  const maxChunkSizeValue = document.getElementById("max-chunk-size-value");
  const timeoutSlider = document.getElementById("timeout");
  const timeoutValue = document.getElementById("timeout-value");
  const temperatureSlider = document.getElementById("temperature");
  const temperatureValue = document.getElementById("temperature-value");
  const topPSlider = document.getElementById("top-p");
  const topPValue = document.getElementById("top-p-value");
  const testOllamaButton = document.getElementById("test-ollama");
  const ollamaStatus = document.getElementById("ollama-status");
  const whitelistItemsContainer = document.getElementById("whitelist-items");
  const clearAllBtn = document.getElementById("clear-all");
  const addSiteBtn = document.getElementById("add-site");
  const modelSuggestions = document.querySelectorAll(".model-suggestion");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const themeSwitch = document.getElementById("theme-switch");
  const siteModal = document.getElementById("site-modal");
  const siteUrlInput = document.getElementById("site-url");
  const addSiteConfirmBtn = document.getElementById("add-site-confirm");
  const cancelAddSiteBtn = document.getElementById("cancel-add-site");
  const closeModalBtn = document.querySelector(".close-modal");
  const novelsTab = document.querySelector('.tab-btn[data-tab="novels"]');
  const statsTab = document.querySelector('.tab-btn[data-tab="stats"]');
  const refreshStatsBtn = document.getElementById("refresh-stats");
  const resetStatsBtn = document.getElementById("reset-stats");
  const logger = window.logger;

  addSiteBtn.addEventListener("click", () => {
    addCurrentSiteToWhitelist();
  });

  closeModalBtn.addEventListener("click", () => {
    siteModal.style.display = "none";
    siteUrlInput.value = "";
  });

  cancelAddSiteBtn.addEventListener("click", () => {
    siteModal.style.display = "none";
    siteUrlInput.value = "";
  });

  window.addEventListener("click", (event) => {
    if (event.target === siteModal) {
      siteModal.style.display = "none";
      siteUrlInput.value = "";
    }
  });

  siteUrlInput.addEventListener("paste", (event) => {
    event.stopPropagation();
  });

  addSiteConfirmBtn.addEventListener("click", () => {
    addSiteManually();
  });

  siteUrlInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
      addSiteManually();
    }
  });

  chrome.storage.sync.get("debugMode", (data) => {
    logger.setDebugMode(data.debugMode || false);
  });

  function testOllamaConnection() {
    logger.debug("Testing Ollama connection from options page");

    ollamaStatus.textContent = "Testing Ollama connection...";
    ollamaStatus.className = "status-message pending";

    chrome.runtime.sendMessage(
      { action: "checkOllamaAvailability" },
      (response) => {
        if (response.available) {
          logger.success("Ollama connection test successful", response);
          ollamaStatus.textContent = `Connected successfully! Ollama version: ${response.version}`;
          ollamaStatus.className = "status-message success";
        } else {
          logger.warn("Ollama connection test failed", response);
          ollamaStatus.textContent = `Ollama not available: ${response.reason}`;
          ollamaStatus.className = "status-message error";
        }
      }
    );
  }

  /**
   * Adds a site manually to the whitelist
   */
  function addSiteManually() {
    let domain = siteUrlInput.value.trim();

    if (!domain) {
      siteUrlInput.classList.add("input-error");
      setTimeout(() => siteUrlInput.classList.remove("input-error"), 1500);
      return;
    }

    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");
    domain = domain.split("/")[0];

    if (domain.startsWith("chrome")) {
      window.feedbackManager.show(
        "Chrome internal pages cannot be added to whitelist",
        "warning"
      );

      siteModal.style.display = "none";
      siteUrlInput.value = "";
      return;
    }

    chrome.runtime.sendMessage(
      {
        action: "addSiteToWhitelist",
        url: "https://" + domain
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          window.feedbackManager.show(
            "Error communicating with extension",
            "warning"
          );
          siteModal.style.display = "none";
          siteUrlInput.value = "";
          return;
        }

        if (response && response.success) {
          siteModal.style.display = "none";
          siteUrlInput.value = "";

          window.feedbackManager.show(response.message, "success");
          loadWhitelist();
        } else {
          window.feedbackManager.show(
            response?.message || "Error adding site",
            "warning"
          );

          siteModal.style.display = "none";
          siteUrlInput.value = "";
        }
      }
    );
  }

  /**
   * Removes a site from the whitelist
   */
  function removeSiteFromWhitelist(site) {
    chrome.runtime.sendMessage(
      {
        action: "removeSiteFromWhitelist",
        hostname: site
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          window.feedbackManager.show(
            "Error communicating with extension",
            "warning"
          );
          return;
        }

        if (response && response.success) {
          window.feedbackManager.show(
            `Removed ${site} from whitelist`,
            "success"
          );
          loadWhitelist();
        } else {
          window.feedbackManager.show(
            response?.message || "Error removing site",
            "warning"
          );
        }
      }
    );
  }

  testOllamaButton.addEventListener("click", testOllamaConnection);

  /**
   * Initializes the tabs functionality
   */
  function initTabs() {
    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabPanes.forEach((pane) => pane.classList.remove("active"));

        this.classList.add("active");

        const tabId = this.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  themeSwitch.addEventListener("change", () => {
    chrome.storage.sync.set({ darkMode: themeSwitch.checked }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error saving dark mode setting:",
          chrome.runtime.lastError
        );
      } else {
        darkModeManager.setTheme(themeSwitch.checked);
        updateAllSliderBackgrounds();
        console.log(`Dark mode setting updated: ${themeSwitch.checked}`);
      }
    });
  });

  /**
   * Synchronizes the theme switch state with the UI
   */
  function syncThemeSwitchWithState() {
    darkModeManager.syncUIWithTheme(themeSwitch);
    updateAllSliderBackgrounds();
  }

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      chrome.storage.sync.get("darkMode", (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error checking dark mode setting:",
            chrome.runtime.lastError
          );
          return;
        }

        if (data.darkMode === undefined || data.darkMode === null) {
          themeSwitch.checked = e.matches;
          updateAllSliderBackgrounds();
        }
      });
    });

  document.addEventListener("themeChanged", () => {
    darkModeManager.syncUIWithTheme(themeSwitch);
    updateAllSliderBackgrounds();
  });

  /**
   * Updates all slider backgrounds at once
   */
  function updateAllSliderBackgrounds() {
    updateSliderBackground(temperatureSlider);
    updateSliderBackground(topPSlider);
    updateSliderBackground(maxChunkSizeSlider);
    updateSliderBackground(timeoutSlider);
  }

  /**
   * Updates the slider background based on its value
   */
  function updateSliderBackground(slider) {
    const value =
      ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${value}%, var(--slider-track-bg) ${value}%, var(--slider-track-bg) 100%)`;
  }

  /**
   * Updates the slider background and value on input
   */
  function setupSlider(slider, valueElement) {
    updateSliderBackground(slider);
    slider.addEventListener("input", function () {
      valueElement.textContent = this.value;
      updateSliderBackground(this);
    });
  }

  /**
   * Loads the whitelist data from storage and renders it
   */
  function loadWhitelist() {
    chrome.storage.sync.get("whitelistedSites", (data) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading whitelist:", chrome.runtime.lastError);
        renderWhitelistedSites([]);
        clearAllBtn.disabled = true;
      } else {
        const whitelistedSites = data.whitelistedSites || [];
        renderWhitelistedSites(whitelistedSites);
        clearAllBtn.disabled = whitelistedSites.length === 0;
      }
    });
  }

  /**
   * Renders the whitelist data in the UI
   */
  function renderWhitelistedSites(sites) {
    whitelistItemsContainer.innerHTML = "";

    if (!Array.isArray(sites) || sites.length === 0) {
      whitelistItemsContainer.innerHTML =
        '<div class="empty-list">No sites in whitelist</div>';
      return;
    }

    sites.sort().forEach((site) => {
      const itemElement = document.createElement("div");
      itemElement.className = "whitelist-item";

      const siteNameElement = document.createElement("span");
      siteNameElement.textContent = site;
      siteNameElement.title = site;

      const removeButton = document.createElement("button");
      removeButton.className = "remove-btn";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        removeSiteFromWhitelist(site);
      });

      itemElement.appendChild(siteNameElement);
      itemElement.appendChild(removeButton);
      whitelistItemsContainer.appendChild(itemElement);
    });
  }

  function focusModal(errorMessage = null) {
    siteModal.style.display = "block";
    setTimeout(() => siteUrlInput.focus(), 100);

    const errorElement = document.getElementById("modal-error");
    if (errorMessage && errorElement) {
      errorElement.textContent = errorMessage;
      errorElement.style.display = "block";
      console.warn(errorMessage);

      setTimeout(() => {
        errorElement.style.display = "none";
      }, 5000);
    } else if (errorElement) {
      errorElement.style.display = "none";
    }
  }

  /**
   * Adds the current site to the whitelist
   */
  function addCurrentSiteToWhitelist() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);

          if (url.protocol.startsWith("chrome")) {
            focusModal("Chrome pages can't be added to the whitelist");
            window.feedbackManager.show(
              "Chrome pages can't be added. Enter a site manually.",
              "warning"
            );
            return;
          }

          const domain = url.hostname.replace(/^www\./, "");
          siteUrlInput.value = domain;
          focusModal();
        } catch (e) {
          focusModal(`Invalid URL: ${e.message}`);
        }
      } else {
        focusModal("No active tab or URL detected");
      }
    });
  }

  /**
   * Reset settings to defaults
   */
  function resetSettings() {
    if (
      confirm("Are you sure you want to reset all settings to default values?")
    ) {
      const defaultSettings = {
        modelName: Constants.DEFAULTS.MODEL_NAME,
        maxChunkSize: Constants.DEFAULTS.MAX_CHUNK_SIZE,
        timeout: Constants.DEFAULTS.TIMEOUT,
        temperature: Constants.DEFAULTS.TEMPERATURE,
        topP: Constants.DEFAULTS.TOP_P
      };

      chrome.storage.sync.set(defaultSettings, () => {
        if (chrome.runtime.lastError) {
          console.error("Error resetting settings:", chrome.runtime.lastError);
          window.feedbackManager.show("Error resetting settings", "error");
        } else {
          modelNameInput.value = defaultSettings.modelName;
          maxChunkSizeSlider.value = defaultSettings.maxChunkSize;
          maxChunkSizeValue.textContent = defaultSettings.maxChunkSize;
          timeoutSlider.value = defaultSettings.timeout;
          timeoutValue.textContent = defaultSettings.timeout;
          temperatureSlider.value = defaultSettings.temperature;
          temperatureValue.textContent = defaultSettings.temperature;
          topPSlider.value = defaultSettings.topP;
          topPValue.textContent = defaultSettings.topP;

          updateAllSliderBackgrounds();

          window.feedbackManager.show("Settings Reset to Defaults!", "success");
          console.log("Settings reset to defaults successfully");
        }
      });
    }
  }

  /**
   * Loads and displays novel character maps
   */
  function loadNovelCharacterMaps() {
    chrome.storage.local.get("novelCharacterMaps", (data) => {
      const novelMaps = data.novelCharacterMaps || {};
      renderNovelMaps(novelMaps);
    });
  }

  /**
   * Renders novel maps in the UI
   * @param {Object} novelMaps - The novel character maps data
   */
  function renderNovelMaps(novelMaps) {
    const novelsContainer = document.getElementById("novels-container");
    novelsContainer.innerHTML = "";

    const novelIds = Object.keys(novelMaps);

    if (novelIds.length === 0) {
      novelsContainer.innerHTML =
        '<div class="empty-list">No novels detected yet</div>';
      return;
    }

    novelIds.sort((a, b) => {
      const timeA = novelMaps[a].lastAccess || 0;
      const timeB = novelMaps[b].lastAccess || 0;
      return timeB - timeA;
    });

    novelIds.forEach((novelId) => {
      const novelData = novelMaps[novelId];

      if (!novelData.chars || Object.keys(novelData.chars).length === 0) {
        return;
      }

      const displayName = formatNovelId(novelId);
      const charCount = Object.keys(novelData.chars).length;
      const lastAccess = novelData.lastAccess
        ? new Date(novelData.lastAccess).toLocaleDateString()
        : "Unknown";

      const novelElement = document.createElement("div");
      novelElement.className = "novel-container";

      const novelItem = document.createElement("div");
      novelItem.className = "novel-item";
      novelItem.dataset.novelId = novelId;

      novelItem.innerHTML = `
      <div class="novel-title">${displayName}</div>
      <div class="novel-metadata">
        <span class="novel-last-access">Last read: ${lastAccess}</span>
        <span class="character-count">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
          </svg>
          ${charCount}
        </span>
      </div>
    `;

      novelElement.appendChild(novelItem);

      const detailsContainer = document.createElement("div");
      detailsContainer.className = "novel-details";
      detailsContainer.style.display = "none";
      novelElement.appendChild(detailsContainer);

      novelsContainer.appendChild(novelElement);

      novelItem.addEventListener("click", () => {
        if (detailsContainer.style.display === "none") {
          document.querySelectorAll(".novel-details").forEach((el) => {
            if (el !== detailsContainer) {
              el.style.display = "none";
            }
          });

          renderNovelDetails(detailsContainer, novelData);
          detailsContainer.style.display = "block";
        } else {
          detailsContainer.style.display = "none";
        }
      });
    });
  }

  /**
   * Renders novel character details
   * @param {HTMLElement} container - The container element
   * @param {Object} novelData - Novel data with characters
   */
  function renderNovelDetails(container, novelData) {
    if (!container || !novelData || !novelData.chars) return;

    const characters = Object.values(novelData.chars);
    const novelId = container
      .closest(".novel-container")
      .querySelector(".novel-item").dataset.novelId;

    characters.sort((a, b) => (b.appearances || 0) - (a.appearances || 0));

    let html = '<div class="character-list">';

    characters.forEach((char, index) => {
      const name = char.name || "Unknown";
      const appearances = char.appearances || 0;
      const confidence = parseFloat(char.confidence) || 0;
      const isManualOverride = char.manualOverride || false;

      let gender = "unknown";
      if (char.gender === "m") gender = "male";
      if (char.gender === "f") gender = "female";

      let confidenceClass = "confidence-low";
      if (confidence >= 0.7) confidenceClass = "confidence-high";
      else if (confidence >= 0.4) confidenceClass = "confidence-medium";

      // Create unique ID for this character
      const charId = Object.keys(novelData.chars).find(
        (id) => novelData.chars[id] === char
      );

      html += `
      <div class="character-card" data-novel-id="${novelId}" data-char-id="${charId}">
        <div class="gender-badge gender-${gender}">${gender}</div>
        <div class="character-name">${escapeHtml(name)}</div>
        <div class="character-info">
          <div class="character-gender-controls">
            <label class="gender-select-label">Gender:</label>
            <select class="gender-select" data-current-gender="${gender}" ${
        isManualOverride ? 'data-manual="true"' : ""
      }>
              <option value="auto" ${
                !isManualOverride ? "selected" : ""
              }>Auto-detect</option>
              <option value="male" ${
                isManualOverride && gender === "male" ? "selected" : ""
              }>Male</option>
              <option value="female" ${
                isManualOverride && gender === "female" ? "selected" : ""
              }>Female</option>
              <option value="unknown" ${
                isManualOverride && gender === "unknown" ? "selected" : ""
              }>Unknown</option>
            </select>
          </div>
          <div class="confidence-info">
            <span class="confidence-indicator ${confidenceClass}"></span> 
            Confidence: ${Math.round(confidence * 100)}%
            ${
              isManualOverride
                ? '<span class="manual-override-badge">Manual</span>'
                : ""
            }
          </div>
          <div class="character-appearances">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="currentColor"/>
            </svg>
            ${appearances} appearances
          </div>
        </div>
      </div>
    `;
    });

    html += "</div>";
    container.innerHTML = html;

    // Add event listeners for gender selection changes
    container.querySelectorAll(".gender-select").forEach((select) => {
      select.addEventListener("change", handleGenderChange);
    });
  }

  /**
   * Handles manual gender changes for characters
   * @param {Event} event - The change event from the select element
   */
  function handleGenderChange(event) {
    const select = event.target;
    const characterCard = select.closest(".character-card");
    const novelId = characterCard.dataset.novelId;
    const charId = characterCard.dataset.charId;
    const newGender = select.value;

    if (!novelId || !charId) {
      console.error("Missing novel ID or character ID");
      window.feedbackManager.show("Error updating character gender", "error");
      return;
    }

    // Show loading state
    select.disabled = true;
    const originalText = select.parentElement.querySelector(
      ".gender-select-label"
    ).textContent;
    select.parentElement.querySelector(".gender-select-label").textContent =
      "Updating...";

    // Prepare the update data
    const updateData = {
      action: "updateCharacterGender",
      novelId: novelId,
      charId: charId,
      newGender: newGender,
      isManualOverride: newGender !== "auto"
    };

    chrome.runtime.sendMessage(updateData, (response) => {
      // Re-enable the select
      select.disabled = false;
      select.parentElement.querySelector(".gender-select-label").textContent =
        originalText;

      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError);
        window.feedbackManager.show(
          "Error communicating with extension",
          "error"
        );
        // Revert the select value
        select.value = select.dataset.currentGender;
        return;
      }

      if (response && response.status === "ok") {
        // Update the current gender data attribute
        select.dataset.currentGender =
          newGender === "auto"
            ? response.detectedGender || "unknown"
            : newGender;

        // Update manual override indication
        if (newGender === "auto") {
          select.removeAttribute("data-manual");
        } else {
          select.setAttribute("data-manual", "true");
        }

        // Update the gender badge
        const genderBadge = characterCard.querySelector(".gender-badge");
        const displayGender =
          newGender === "auto"
            ? response.detectedGender || "unknown"
            : newGender;
        genderBadge.className = `gender-badge gender-${displayGender}`;
        genderBadge.textContent = displayGender;

        // Update manual override badge
        const confidenceInfo = characterCard.querySelector(".confidence-info");
        const existingBadge = confidenceInfo.querySelector(
          ".manual-override-badge"
        );

        if (newGender !== "auto") {
          if (!existingBadge) {
            confidenceInfo.insertAdjacentHTML(
              "beforeend",
              '<span class="manual-override-badge">Manual</span>'
            );
          }
        } else {
          if (existingBadge) {
            existingBadge.remove();
          }
        }

        const message =
          newGender === "auto"
            ? "Gender detection re-enabled for character"
            : `Character gender manually set to ${newGender}`;

        window.feedbackManager.show(message, "success");
        console.log(
          `Character gender updated: ${novelId}/${charId} -> ${newGender}`
        );
      } else {
        console.error("Failed to update character gender:", response);
        window.feedbackManager.show(
          response?.message || "Failed to update character gender",
          "error"
        );
        // Revert the select value
        select.value = select.dataset.currentGender;
      }
    });
  }

  /**
   * Format novel ID to a more readable title
   * @param {string} novelId - The novel identifier
   * @return {string} - Formatted title
   */
  function formatNovelId(novelId) {
    if (!novelId) return "Unknown Novel";

    const [domainPart, novelPart] = novelId.split("__");

    const domain = domainPart.replace(/_/g, ".");

    const novelName = novelPart
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return `<span style="color:var(--primary-color);">${domain}</span> | ${novelName}`;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} unsafe - Potentially unsafe string
   * @return {string} - Safe HTML string
   */
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Sets up search functionality for novels
   */
  function setupNovelSearch() {
    const searchInput = document.getElementById("novels-search");
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.toLowerCase();
      const novelItems = document.querySelectorAll(".novel-item");

      novelItems.forEach((item) => {
        const novelContainer = item.closest(".novel-container");
        const title = item
          .querySelector(".novel-title")
          .textContent.toLowerCase();

        if (title.includes(searchTerm)) {
          novelContainer.style.display = "block";
        } else {
          novelContainer.style.display = "none";
        }
      });
    });
  }

  /**
   * Loads and displays global statistics
   */
  function loadGlobalStats() {
    chrome.runtime.sendMessage({ action: "getGlobalStats" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error loading stats:", chrome.runtime.lastError);
        window.feedbackManager.show("Error loading statistics", "error");
        return;
      }

      if (response && response.status === "ok" && response.stats) {
        renderGlobalStats(response.stats);
        console.log("Global stats loaded successfully");
      } else {
        console.warn("Invalid stats response:", response);
        window.feedbackManager.show("Invalid statistics response", "warning");
      }
    });
  }

  /**
   * Renders the global statistics in the UI
   * @param {Object} stats - The statistics object
   */
  function renderGlobalStats(stats) {
    updateStatValue("stat-paragraphs", stats.totalParagraphsEnhanced || 0);
    updateStatValue("stat-chapters", stats.totalChaptersEnhanced || 0);
    updateStatValue("stat-novels", stats.uniqueNovelsProcessed || 0);
    updateStatValue("stat-characters", stats.totalCharactersDetected || 0);
    updateStatValue("stat-sessions", stats.enhancementSessions || 0);

    const totalMinutes = Math.round(
      (stats.totalProcessingTime || 0) / (1000 * 60)
    );
    const timeDisplay =
      totalMinutes >= 60
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : `${totalMinutes}m`;
    updateStatValue("stat-time", timeDisplay);

    const firstDate = stats.firstEnhancementDate
      ? new Date(stats.firstEnhancementDate).toLocaleDateString()
      : "Never";
    const lastDate = stats.lastEnhancementDate
      ? new Date(stats.lastEnhancementDate).toLocaleDateString()
      : "Never";

    document.getElementById("stat-first-date").textContent = firstDate;
    document.getElementById("stat-last-date").textContent = lastDate;

    const errorCountElement = document.getElementById("stat-error-count");
    if (errorCountElement && stats.totalErrorCount !== undefined) {
      errorCountElement.textContent = stats.totalErrorCount || 0;
    }

    console.log("Stats rendered successfully:", stats);
  }

  /**
   * Updates a stat value with animation
   * @param {string} elementId - The element ID
   * @param {string|number} value - The new value
   */
  function updateStatValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.classList.add("updating");
    element.textContent = value;

    setTimeout(() => {
      element.classList.remove("updating");
    }, 600);
  }

  /**
   * Resets all global statistics
   */
  function resetGlobalStats() {
    if (
      confirm(
        "Are you sure you want to reset all statistics? This action cannot be undone."
      )
    ) {
      chrome.runtime.sendMessage({ action: "resetGlobalStats" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error resetting stats:", chrome.runtime.lastError);
          window.feedbackManager.show("Error resetting statistics", "error");
          return;
        }

        if (response && response.status === "ok") {
          window.feedbackManager.show(
            "Statistics reset successfully!",
            "success"
          );
          loadGlobalStats();
        }
      });
    }
  }

  /**
   * Initialize all functionality
   */
  async function init() {
    initTabs();
    loadNovelCharacterMaps();
    setupNovelSearch();
    syncThemeSwitchWithState();

    const debugModeCheckbox = document.getElementById("debug-mode");

    // Load debug mode setting
    chrome.storage.sync.get('debugMode', (data) => {
      debugModeCheckbox.checked = data.debugMode || false;
      logger.setDebugMode(data.debugMode || false);
    });

    // Save debug mode setting
    debugModeCheckbox.addEventListener('change', () => {
      const debugMode = debugModeCheckbox.checked;
      chrome.storage.sync.set({ debugMode }, () => {
        logger.setDebugMode(debugMode);
        logger.debug("Debug mode toggled", { enabled: debugMode });
        window.feedbackManager.show(
          `Debug logging ${debugMode ? 'enabled' : 'disabled'}`,
          'success'
        );
      });
    });

    chrome.storage.sync.get("darkMode", (data) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error loading dark mode setting:",
          chrome.runtime.lastError
        );
        // Use system preference as fallback
        themeSwitch.checked = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        darkModeManager.setTheme(themeSwitch.checked);
      } else {
        if (data.darkMode !== undefined) {
          themeSwitch.checked = data.darkMode;
          darkModeManager.setTheme(data.darkMode);
        } else {
          // Use system preference
          themeSwitch.checked = window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches;
          darkModeManager.setTheme(themeSwitch.checked);
        }
      }
      updateAllSliderBackgrounds();
    });

    // Update theme switch handler
    themeSwitch.addEventListener("change", () => {
      chrome.storage.sync.set({ darkMode: themeSwitch.checked }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error saving dark mode setting:",
            chrome.runtime.lastError
          );
        } else {
          darkModeManager.setTheme(themeSwitch.checked);
          updateAllSliderBackgrounds();
          console.log(`Dark mode setting updated: ${themeSwitch.checked}`);
        }
      });
    });

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        chrome.storage.sync.get("darkMode", (data) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error checking dark mode setting:",
              chrome.runtime.lastError
            );
            return;
          }

          if (data.darkMode === undefined || data.darkMode === null) {
            themeSwitch.checked = e.matches;
            updateAllSliderBackgrounds();
          }
        });
      });

    loadWhitelist();

    modelSuggestions.forEach((suggestion) => {
      suggestion.addEventListener("click", function () {
        modelNameInput.value = this.dataset.model;
        this.style.transform = "scale(0.95)";
        setTimeout(() => {
          this.style.transform = "scale(1)";
        }, 150);
      });
    });

    setupSlider(temperatureSlider, temperatureValue);
    setupSlider(topPSlider, topPValue);
    setupSlider(maxChunkSizeSlider, maxChunkSizeValue);
    setupSlider(timeoutSlider, timeoutValue);

    clearAllBtn.addEventListener("click", () => {
      if (
        confirm("Are you sure you want to remove all sites from the whitelist?")
      ) {
        chrome.storage.sync.set({ whitelistedSites: [] }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error clearing whitelist:",
              chrome.runtime.lastError
            );
            window.feedbackManager.show("Error clearing whitelist", "error");
          } else {
            loadWhitelist();
            window.feedbackManager.show(
              "All sites removed from whitelist",
              "success"
            );
            console.log("Whitelist cleared successfully");
          }
        });
      }
    });

    if (novelsTab) {
      novelsTab.addEventListener("click", () => {
        loadNovelCharacterMaps();
      });
    }

    resetButton.addEventListener("click", resetSettings);

    try {
      // Load initial settings directly
      chrome.storage.sync.get(
        ["modelName", "maxChunkSize", "timeout", "temperature", "topP"],
        (data) => {
          if (chrome.runtime.lastError) {
            console.error("Error loading settings:", chrome.runtime.lastError);
            // Use fallback values
            modelNameInput.value = Constants.DEFAULTS.MODEL_NAME;
            maxChunkSizeSlider.value = Constants.DEFAULTS.MAX_CHUNK_SIZE;
            maxChunkSizeValue.textContent = Constants.DEFAULTS.MAX_CHUNK_SIZE;
            timeoutSlider.value = Constants.DEFAULTS.TIMEOUT;
            timeoutValue.textContent = Constants.DEFAULTS.TIMEOUT;
            temperatureSlider.value = Constants.DEFAULTS.TEMPERATURE;
            temperatureValue.textContent = Constants.DEFAULTS.TEMPERATURE;
            topPSlider.value = Constants.DEFAULTS.TOP_P;
            topPValue.textContent = Constants.DEFAULTS.TOP_P;
          } else {
            modelNameInput.value =
              data.modelName || Constants.DEFAULTS.MODEL_NAME;
            maxChunkSizeSlider.value =
              data.maxChunkSize || Constants.DEFAULTS.MAX_CHUNK_SIZE;
            maxChunkSizeValue.textContent =
              data.maxChunkSize || Constants.DEFAULTS.MAX_CHUNK_SIZE;
            timeoutSlider.value = data.timeout || Constants.DEFAULTS.TIMEOUT;
            timeoutValue.textContent =
              data.timeout || Constants.DEFAULTS.TIMEOUT;
            temperatureSlider.value =
              data.temperature || Constants.DEFAULTS.TEMPERATURE;
            temperatureValue.textContent =
              data.temperature || Constants.DEFAULTS.TEMPERATURE;
            topPSlider.value = data.topP || Constants.DEFAULTS.TOP_P;
            topPValue.textContent = data.topP || Constants.DEFAULTS.TOP_P;

            console.log("Initial settings loaded successfully:", data);
          }

          updateAllSliderBackgrounds();
        }
      );
    } catch (error) {
      console.error("Error loading initial settings:", error);
    }

    saveButton.addEventListener("click", () => {
      const maxChunkSize = parseInt(maxChunkSizeSlider.value);
      const timeout = parseInt(timeoutSlider.value);
      const temperature = parseFloat(temperatureSlider.value);
      const topP = parseFloat(topPSlider.value);

      const settingsToSave = {
        modelName: modelNameInput.value.trim() || Constants.DEFAULTS.MODEL_NAME,
        maxChunkSize: maxChunkSize,
        timeout: timeout,
        temperature: temperature,
        topP: topP
      };

      chrome.storage.sync.set(settingsToSave, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving settings:", chrome.runtime.lastError);
          window.feedbackManager.show("Error saving settings", "error");
        } else {
          window.feedbackManager.show(
            "Settings Saved Successfully!",
            "success"
          );
          console.log("Settings saved successfully:", settingsToSave);
        }
      });
    });

    if (statsTab) {
      statsTab.addEventListener("click", () => {
        loadGlobalStats();
      });
    }

    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener("click", loadGlobalStats);
    }

    if (resetStatsBtn) {
      resetStatsBtn.addEventListener("click", resetGlobalStats);
    }

    testOllamaButton.addEventListener("click", testOllamaConnection);

    if (document.getElementById("stats-tab").classList.contains("active")) {
      loadGlobalStats();
    }
  }

  // Initialize everything
  init();
});
