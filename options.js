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
  const siteModal = document.getElementById("site-modal");
  const siteUrlInput = document.getElementById("site-url");
  const addSiteConfirmBtn = document.getElementById("add-site-confirm");
  const cancelAddSiteBtn = document.getElementById("cancel-add-site");
  const closeModalBtn = document.querySelector(".close-modal");

  addSiteBtn.addEventListener("click", function () {
    siteModal.style.display = "block";
    setTimeout(() => siteUrlInput.focus(), 100);
  });

  closeModalBtn.addEventListener("click", function () {
    siteModal.style.display = "none";
    siteUrlInput.value = "";
  });

  cancelAddSiteBtn.addEventListener("click", function () {
    siteModal.style.display = "none";
    siteUrlInput.value = "";
  });

  // Fix for the modal closing issue: check if the click target is part of the modal content
  window.addEventListener("click", function (event) {
    if (event.target === siteModal) {
      // Only close if clicking on the modal background (not its content)
      // This stops clicks from bubbling up when interacting with form elements
      siteModal.style.display = "none";
      siteUrlInput.value = "";
    }
  });

  // Prevent paste events from bubbling up to the window
  siteUrlInput.addEventListener("paste", function (event) {
    event.stopPropagation();
  });

  addSiteConfirmBtn.addEventListener("click", function () {
    addSiteManually();
  });

  siteUrlInput.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
      addSiteManually();
    }
  });

  // Add this new function to handle manual site addition
  function addSiteManually() {
    let domain = siteUrlInput.value.trim();

    // Simple domain validation
    if (!domain) {
      // Show error message in the input field
      siteUrlInput.classList.add("input-error");
      setTimeout(() => siteUrlInput.classList.remove("input-error"), 1500);
      return;
    }

    // Remove protocol if present
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");

    // Remove paths, query parameters, etc.
    domain = domain.split("/")[0];

    chrome.runtime.sendMessage(
      {
        action: "addSiteToWhitelist",
        url: "https://" + domain // Adding protocol for URL parsing in background.js
      },
      (response) => {
        if (response && response.success) {
          // Hide modal
          siteModal.style.display = "none";
          siteUrlInput.value = "";

          // Show feedback
          const feedback = document.createElement("div");
          feedback.className = "save-feedback";
          feedback.textContent = response.message;
          document.body.appendChild(feedback);

          setTimeout(() => {
            if (feedback && feedback.parentNode) {
              feedback.parentNode.removeChild(feedback);
            }
          }, 2500);

          // Reload the list
          loadWhitelist();
        } else {
          // Show error
          const feedback = document.createElement("div");
          feedback.className = "save-feedback warning";
          feedback.textContent = response.message || "Error adding site";
          document.body.appendChild(feedback);

          setTimeout(() => {
            if (feedback && feedback.parentNode) {
              feedback.parentNode.removeChild(feedback);
            }
          }, 2500);

          siteModal.style.display = "none";
          siteUrlInput.value = "";
        }
      }
    );
  }

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

      // Update UI based on count
      clearAllBtn.disabled = whitelistedSites.length === 0;
    });
  }

  function renderWhitelistedSites(sites) {
    whitelistItemsContainer.innerHTML = "";

    if (sites.length === 0) {
      whitelistItemsContainer.innerHTML =
        '<div class="empty-list">No sites in whitelist</div>';
      return;
    }

    // Sort sites alphabetically for better usability
    sites.sort().forEach((site) => {
      const itemElement = document.createElement("div");
      itemElement.className = "whitelist-item";

      const siteNameElement = document.createElement("span");
      siteNameElement.textContent = site;
      siteNameElement.title = site; // Add tooltip for long domain names

      const removeButton = document.createElement("button");
      removeButton.className = "remove-btn";
      removeButton.textContent = "Remove";
      removeButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent event bubbling
        removeSiteFromWhitelist(site);
      });

      itemElement.appendChild(siteNameElement);
      itemElement.appendChild(removeButton);
      whitelistItemsContainer.appendChild(itemElement);
    });
  }

  function removeSiteFromWhitelist(site) {
    chrome.runtime.sendMessage(
      {
        action: "removeSiteFromWhitelist",
        hostname: site
      },
      (response) => {
        if (response && response.success) {
          // Show feedback
          const feedback = document.createElement("div");
          feedback.className = "save-feedback";
          feedback.textContent = `Removed ${site} from whitelist`;
          document.body.appendChild(feedback);

          setTimeout(() => {
            if (feedback && feedback.parentNode) {
              feedback.parentNode.removeChild(feedback);
            }
          }, 2500);

          // Reload the list
          loadWhitelist();
        }
      }
    );
  }

  // Add current site to whitelist
  function addCurrentSiteToWhitelist() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0] && tabs[0].url) {
        chrome.runtime.sendMessage(
          {
            action: "addSiteToWhitelist",
            url: tabs[0].url
          },
          (response) => {
            if (response && response.success) {
              // Show feedback
              const feedback = document.createElement("div");
              feedback.className = "save-feedback";
              feedback.textContent = response.message;
              document.body.appendChild(feedback);

              setTimeout(() => {
                if (feedback && feedback.parentNode) {
                  feedback.parentNode.removeChild(feedback);
                }
              }, 2500);

              // Reload the list
              loadWhitelist();
            }
          }
        );
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
    initTabs();
  
    syncThemeSwitchWithState();
  
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        chrome.storage.sync.get("darkMode", function (data) {
          if (data.darkMode === undefined) {
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
  
    clearAllBtn.addEventListener("click", function () {
      if (
        confirm("Are you sure you want to remove all sites from the whitelist?")
      ) {
        chrome.storage.sync.set({ whitelistedSites: [] }, function () {
          loadWhitelist();
          
          const feedback = document.createElement("div");
          feedback.className = "save-feedback";
          feedback.textContent = "All sites removed from whitelist";
          document.body.appendChild(feedback);
  
          setTimeout(() => {
            if (feedback && feedback.parentNode) {
              feedback.parentNode.removeChild(feedback);
            }
          }, 2500);
        });
      }
    });
  
    resetButton.addEventListener("click", resetSettings);
  
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
          const feedback = document.createElement("div");
          feedback.className = "save-feedback";
          feedback.textContent = "Settings Saved Successfully!";
          document.body.appendChild(feedback);
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
