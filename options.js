document.addEventListener("DOMContentLoaded", function () {
  const modelNameInput = document.getElementById("model-name");
  const saveButton = document.getElementById("save");
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
  const closeBtn = document.getElementById("close-btn");

  loadWhitelist();

  clearAllBtn.addEventListener("click", function () {
    if (
      confirm("Are you sure you want to remove all sites from the whitelist?")
    ) {
      chrome.storage.sync.set({ whitelistedSites: [] }, function () {
        loadWhitelist();
      });
    }
  });

  closeBtn.addEventListener("click", function () {
    window.close();
  });

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
    }
  );

  maxChunkSizeSlider.addEventListener("input", function () {
    maxChunkSizeValue.textContent = this.value;
  });

  timeoutSlider.addEventListener("input", function () {
    timeoutValue.textContent = this.value;
  });

  temperatureSlider.addEventListener("input", function () {
    temperatureValue.textContent = this.value;
  });

  topPSlider.addEventListener("input", function () {
    topPValue.textContent = this.value;
  });

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
        const saveButton = document.getElementById("save");
        const originalText = saveButton.textContent;
        saveButton.textContent = "Settings Saved!";
        saveButton.style.backgroundColor = "#4CAF50";

        setTimeout(function () {
          saveButton.textContent = originalText;
          saveButton.style.backgroundColor = "#2196F3";
        }, 1500);
      }
    );
  });

  testOllamaButton.addEventListener("click", async function () {
    ollamaStatus.textContent = "Testing Ollama connection...";
    ollamaStatus.className = "status-message pending";

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
});
