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
        if (response && response.success) {
          // Hide modal
          siteModal.style.display = "none";
          siteUrlInput.value = "";

          window.feedbackManager.show(response.message, "success");

          loadWhitelist();
        } else {
          window.feedbackManager.show(
            response.message || "Error adding site",
            "warning"
          );

          siteModal.style.display = "none";
          siteUrlInput.value = "";
        }
      }
    );
  }

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
    chrome.storage.sync.set({ darkMode: themeSwitch.checked });
    darkModeManager.setTheme(themeSwitch.checked);
    updateAllSliderBackgrounds();
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
        if (data.darkMode === undefined) {
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
      const whitelistedSites = data.whitelistedSites || [];
      renderWhitelistedSites(whitelistedSites);

      clearAllBtn.disabled = whitelistedSites.length === 0;
    });
  }

  /**
   * Renders the whitelist data in the UI
   */
  function renderWhitelistedSites(sites) {
    whitelistItemsContainer.innerHTML = "";

    if (sites.length === 0) {
      whitelistItemsContainer.innerHTML =
        '<div class="empty-list">No sites in whitelist</div>';
      return;
    }

    sites.sort().forEach((site) => {
      const itemElement = document.createElement("div");
      itemElement.className = "whitelist-item";

      const siteNameElement = document.createElement("span");
      siteNameElement.textContent = site;
      siteNameElement.title = site; // Add tooltip for long domain names

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
        if (response && response.success) {
          window.feedbackManager.show(
            `Removed ${site} from whitelist`,
            "success"
          );

          loadWhitelist();
        }
      }
    );
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
        modelName: "qwen3:8b",
        maxChunkSize: 8000,
        timeout: 120,
        temperature: 0.4,
        topP: 0.9
      };

      chrome.storage.sync.set(defaultSettings, () => {
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

    // Sort novels by last access time (most recent first)
    novelIds.sort((a, b) => {
      const timeA = novelMaps[a].lastAccess || 0;
      const timeB = novelMaps[b].lastAccess || 0;
      return timeB - timeA;
    });

    novelIds.forEach((novelId) => {
      const novelData = novelMaps[novelId];

      // Skip if no characters or invalid data
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

      // Create details container (hidden by default)
      const detailsContainer = document.createElement("div");
      detailsContainer.className = "novel-details";
      detailsContainer.style.display = "none";
      novelElement.appendChild(detailsContainer);

      novelsContainer.appendChild(novelElement);

      // Add click event to toggle details
      novelItem.addEventListener("click", () => {
        if (detailsContainer.style.display === "none") {
          // Close any other open details first
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

    // Sort characters by appearance count (highest first)
    characters.sort((a, b) => (b.appearances || 0) - (a.appearances || 0));

    let html = '<div class="character-list">';

    characters.forEach((char) => {
      const name = char.name || "Unknown";
      const appearances = char.appearances || 0;
      const confidence = parseFloat(char.confidence) || 0;

      let gender = "unknown";
      if (char.gender === "m") gender = "male";
      if (char.gender === "f") gender = "female";

      let confidenceClass = "confidence-low";
      if (confidence >= 0.7) confidenceClass = "confidence-high";
      else if (confidence >= 0.4) confidenceClass = "confidence-medium";

      html += `
      <div class="character-card">
        <div class="gender-badge gender-${gender}">${gender}</div>
        <div class="character-name">${escapeHtml(name)}</div>
        <div class="character-info">
          <div><span class="confidence-indicator ${confidenceClass}"></span> Confidence: ${Math.round(
        confidence * 100
      )}%</div>
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
  }

  /**
   * Format novel ID to a more readable title
   * @param {string} novelId - The novel identifier
   * @return {string} - Formatted title
   */
  function formatNovelId(novelId) {
    if (!novelId) return "Unknown Novel";

    // Remove underscores and capitalize words
    let title = novelId
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    // Extract domain if present
    const domainMatch = title.match(/^([A-Za-z0-9.]+)\s/);
    if (domainMatch) {
      const domain = domainMatch[1];
      title = title.replace(
        domain,
        `<span style="color:var(--primary-color);">${domain}</span> |`
      );
    }

    return title;
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
   * Initialize all functionality
   */
  function init() {
    initTabs();
    loadNovelCharacterMaps();
    setupNovelSearch();

    syncThemeSwitchWithState();

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        chrome.storage.sync.get("darkMode", (data) => {
          if (data.darkMode === undefined) {
            themeSwitch.checked = e.matches;
            updateAllSliderBackgrounds();
          }
        });
      });

    loadWhitelist();

    modelSuggestions.forEach((suggestion) => {
      suggestion.addEventListener("click", () => {
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
          loadWhitelist();

          window.feedbackManager.show(
            "All sites removed from whitelist",
            "success"
          );
        });
      }
    });

    if (novelsTab) {
      novelsTab.addEventListener('click', () => {
        loadNovelCharacterMaps();
      });
    }

    resetButton.addEventListener("click", resetSettings);

    chrome.storage.sync.get(
      {
        modelName: "qwen3:8b",
        maxChunkSize: 8000,
        timeout: 120,
        temperature: 0.4,
        topP: 0.9
      },
      (data) => {
        modelNameInput.value = data.modelName;
        maxChunkSizeSlider.value = data.maxChunkSize;
        maxChunkSizeValue.textContent = data.maxChunkSize;
        timeoutSlider.value = data.timeout;
        timeoutValue.textContent = data.timeout;
        temperatureSlider.value = data.temperature;
        temperatureValue.textContent = data.temperature;
        topPSlider.value = data.topP;
        topPValue.textContent = data.topP;

        updateAllSliderBackgrounds();
      }
    );

    saveButton.addEventListener("click", () => {
      const maxChunkSize = parseInt(maxChunkSizeSlider.value);
      const timeout = parseInt(timeoutSlider.value);
      const temperature = parseFloat(temperatureSlider.value);
      const topP = parseFloat(topPSlider.value);

      chrome.storage.sync.set(
        {
          modelName: modelNameInput.value.trim() || "qwen3:8b",
          maxChunkSize: maxChunkSize,
          timeout: timeout,
          temperature: temperature,
          topP: topP
        },
        () => {
          window.feedbackManager.show(
            "Settings Saved Successfully!",
            "success"
          );
        }
      );
    });

    testOllamaButton.addEventListener("click", () => {
      ollamaStatus.textContent = "Testing Ollama connection...";
      ollamaStatus.className = "status-message pending";
      ollamaStatus.style.display = "block";

      try {
        chrome.runtime.sendMessage(
          {
            action: "checkOllamaAvailability"
          },
          (response) => {
            if (chrome.runtime.lastError) {
              ollamaStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
              ollamaStatus.className = "status-message error";
              return;
            }

            if (response.available) {
              ollamaStatus.textContent = `Connected successfully! Ollama version: ${response.version}`;
              if (response.models && response.models.length > 0) {
                ollamaStatus.textContent += `\nAvailable models: ${response.models.join(
                  ", "
                )}`;
              }
              ollamaStatus.className = "status-message success";
            } else {
              ollamaStatus.textContent = `Ollama not available: ${response.reason}`;
              ollamaStatus.className = "status-message error";
            }
          }
        );
      } catch (err) {
        ollamaStatus.textContent = `Error: ${err.message}`;
        ollamaStatus.className = "status-message error";
      }
    });
  }

  // Initialize everything
  init();
});
