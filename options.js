document.addEventListener("DOMContentLoaded", function () {
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

  // Initialize tabs functionality
  function initTabs() {
    tabButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Remove active class from all tab buttons and content panes
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        tabPanes.forEach((pane) => pane.classList.remove("active"));

        // Add active class to clicked button
        this.classList.add("active");

        // Show corresponding tab content
        const tabId = this.getAttribute("data-tab");
        document.getElementById(`${tabId}-tab`).classList.add("active");
      });
    });
  }

  // Listen for theme toggle changes
  themeSwitch.addEventListener("change", function () {
    chrome.storage.sync.set({ darkMode: themeSwitch.checked });
    setTheme(themeSwitch.checked);
    updateAllSliderBackgrounds();
  });

  // Set theme based on dark mode state (reference to the function in detectDarkMode.js)
  function setTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }

  // Sync theme switch UI with the actual theme
  function syncThemeSwitchWithState() {
    chrome.storage.sync.get("darkMode", function (data) {
      // Default to system preference if not set
      if (data.darkMode === undefined) {
        const prefersDarkMode = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        themeSwitch.checked = prefersDarkMode;
      } else {
        themeSwitch.checked = data.darkMode;
      }

      // Make sure theme is applied
      setTheme(themeSwitch.checked);
      updateAllSliderBackgrounds();
    });
  }

  // Update all slider backgrounds at once
  function updateAllSliderBackgrounds() {
    updateSliderBackground(temperatureSlider);
    updateSliderBackground(topPSlider);
    updateSliderBackground(maxChunkSizeSlider);
    updateSliderBackground(timeoutSlider);
  }

  // Apply dynamic gradient to sliders
  function updateSliderBackground(slider) {
    const value =
      ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${value}%, var(--slider-track-bg) ${value}%, var(--slider-track-bg) 100%)`;
  }

  // Update sliders on input
  function setupSlider(slider, valueElement) {
    updateSliderBackground(slider);
    slider.addEventListener("input", function () {
      valueElement.textContent = this.value;
      updateSliderBackground(this);
    });
  }

  // Load whitelist data
  function loadWhitelist() {
    chrome.storage.sync.get("whitelistedSites", function (data) {
      const whitelistedSites = data.whitelistedSites || [];
      renderWhitelistedSites(whitelistedSites);
    });
  }

  function renderWhitelistedSites(sites) {
    whitelistItemsContainer.innerHTML = "";

    if (sites.length === 0) {
      whitelistItemsContainer.innerHTML =
        '<div class="empty-list">No sites in whitelist</div>';
      return;
    }

    sites.forEach((site) => {
      const itemElement = document.createElement("div");
      itemElement.className = "whitelist-item";

      const siteNameElement = document.createElement("span");
      siteNameElement.textContent = site;

      const removeButton = document.createElement("button");
      removeButton.className = "remove-btn";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", function () {
        removeSiteFromWhitelist(site);
      });

      itemElement.appendChild(siteNameElement);
      itemElement.appendChild(removeButton);
      whitelistItemsContainer.appendChild(itemElement);
    });
  }

  function removeSiteFromWhitelist(site) {
    chrome.storage.sync.get("whitelistedSites", function (data) {
      let whitelistedSites = data.whitelistedSites || [];
      whitelistedSites = whitelistedSites.filter((s) => s !== site);

      chrome.storage.sync.set({ whitelistedSites }, function () {
        renderWhitelistedSites(whitelistedSites);
      });
    });
  }

  // Add current site to whitelist
  function addCurrentSiteToWhitelist() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;

        chrome.storage.sync.get("whitelistedSites", function (data) {
          let whitelistedSites = data.whitelistedSites || [];

          // Check if site is already in whitelist
          if (!whitelistedSites.includes(domain)) {
            whitelistedSites.push(domain);
            chrome.storage.sync.set({ whitelistedSites }, function () {
              renderWhitelistedSites(whitelistedSites);

              // Show feedback
              const feedback = document.createElement("div");
              feedback.className = "save-feedback";
              feedback.textContent = `Added ${domain} to whitelist!`;
              document.body.appendChild(feedback);

              setTimeout(() => {
                if (feedback && feedback.parentNode) {
                  feedback.parentNode.removeChild(feedback);
                }
              }, 2500);
            });
          }
        });
      }
    });
  }

  // Reset settings to defaults
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

      chrome.storage.sync.set(defaultSettings, function () {
        // Update UI
        modelNameInput.value = defaultSettings.modelName;
        maxChunkSizeSlider.value = defaultSettings.maxChunkSize;
        maxChunkSizeValue.textContent = defaultSettings.maxChunkSize;
        timeoutSlider.value = defaultSettings.timeout;
        timeoutValue.textContent = defaultSettings.timeout;
        temperatureSlider.value = defaultSettings.temperature;
        temperatureValue.textContent = defaultSettings.temperature;
        topPSlider.value = defaultSettings.topP;
        topPValue.textContent = defaultSettings.topP;

        // Update slider backgrounds
        updateAllSliderBackgrounds();

        // Show feedback
        const feedback = document.createElement("div");
        feedback.className = "save-feedback";
        feedback.textContent = "Settings Reset to Defaults!";
        document.body.appendChild(feedback);

        setTimeout(() => {
          if (feedback && feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
          }
        }, 2500);
      });
    }
  }

  // Initialize all functionality
  function init() {
    // Initialize tabs
    initTabs();

    // Sync the theme switch with the actual state
    syncThemeSwitchWithState();

    // Listen for system preference changes (in addition to the listener in detectDarkMode.js)
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        // Only update the switch if there's no explicit user preference
        chrome.storage.sync.get("darkMode", function (data) {
          if (data.darkMode === undefined) {
            themeSwitch.checked = e.matches;
            updateAllSliderBackgrounds();
          }
        });
      });

    // Load whitelist
    loadWhitelist();

    // Setup model suggestions
    modelSuggestions.forEach((suggestion) => {
      suggestion.addEventListener("click", function () {
        modelNameInput.value = this.dataset.model;
        // Add small feedback animation
        this.style.transform = "scale(0.95)";
        setTimeout(() => {
          this.style.transform = "scale(1)";
        }, 150);
      });
    });

    // Initialize sliders
    setupSlider(temperatureSlider, temperatureValue);
    setupSlider(topPSlider, topPValue);
    setupSlider(maxChunkSizeSlider, maxChunkSizeValue);
    setupSlider(timeoutSlider, timeoutValue);

    // Set up event listeners
    clearAllBtn.addEventListener("click", function () {
      if (
        confirm("Are you sure you want to remove all sites from the whitelist?")
      ) {
        chrome.storage.sync.set({ whitelistedSites: [] }, function () {
          loadWhitelist();
        });
      }
    });

    addSiteBtn.addEventListener("click", addCurrentSiteToWhitelist);
    resetButton.addEventListener("click", resetSettings);

    // Load saved settings
    chrome.storage.sync.get(
      {
        modelName: "qwen3:8b",
        maxChunkSize: 8000,
        timeout: 120,
        temperature: 0.4,
        topP: 0.9
      },
      function (data) {
        modelNameInput.value = data.modelName;
        maxChunkSizeSlider.value = data.maxChunkSize;
        maxChunkSizeValue.textContent = data.maxChunkSize;
        timeoutSlider.value = data.timeout;
        timeoutValue.textContent = data.timeout;
        temperatureSlider.value = data.temperature;
        temperatureValue.textContent = data.temperature;
        topPSlider.value = data.topP;
        topPValue.textContent = data.topP;

        // Update slider backgrounds after loading values
        updateAllSliderBackgrounds();
      }
    );

    saveButton.addEventListener("click", function () {
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
        function () {
          // Show save feedback
          const feedback = document.createElement("div");
          feedback.className = "save-feedback";
          feedback.textContent = "Settings Saved Successfully!";
          document.body.appendChild(feedback);

          // Remove feedback after animation completes
          setTimeout(() => {
            if (feedback && feedback.parentNode) {
              feedback.parentNode.removeChild(feedback);
            }
          }, 2500);
        }
      );
    });

    testOllamaButton.addEventListener("click", function () {
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
