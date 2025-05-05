// options.js
document.addEventListener('DOMContentLoaded', function () {
  const modelNameInput = document.getElementById('model-name');
  const saveButton = document.getElementById('save');
  const maxChunkSizeSlider = document.getElementById('max-chunk-size');
  const maxChunkSizeValue = document.getElementById('max-chunk-size-value');
  const timeoutSlider = document.getElementById('timeout');
  const timeoutValue = document.getElementById('timeout-value');
  const testOllamaButton = document.getElementById('test-ollama');
  const ollamaStatus = document.getElementById('ollama-status');
  const whitelistItemsContainer = document.getElementById('whitelist-items');
  const clearAllBtn = document.getElementById('clear-all');
  const closeBtn = document.getElementById('close-btn');

  // Load whitelist data
  loadWhitelist();

  // Clear all whitelisted sites
  clearAllBtn.addEventListener('click', function () {
    if (confirm('Are you sure you want to remove all sites from the whitelist?')) {
      chrome.storage.sync.set({ whitelistedSites: [] }, function () {
        loadWhitelist();
      });
    }
  });

  // Close window
  closeBtn.addEventListener('click', function () {
    window.close();
  });

  // Load whitelist from storage
  function loadWhitelist() {
    chrome.storage.sync.get('whitelistedSites', function (data) {
      const whitelistedSites = data.whitelistedSites || [];
      renderWhitelistedSites(whitelistedSites);
    });
  }

  // Render whitelist items
  function renderWhitelistedSites(sites) {
    // Clear existing content
    whitelistItemsContainer.innerHTML = '';

    if (sites.length === 0) {
      // Show empty state
      whitelistItemsContainer.innerHTML = '<div class="empty-list">No sites in whitelist</div>';
      return;
    }

    // Create and append site items
    sites.forEach(site => {
      const itemElement = document.createElement('div');
      itemElement.className = 'whitelist-item';

      const siteNameElement = document.createElement('span');
      siteNameElement.textContent = site;

      const removeButton = document.createElement('button');
      removeButton.className = 'remove-btn';
      removeButton.textContent = 'Remove';
      removeButton.addEventListener('click', function () {
        removeSiteFromWhitelist(site);
      });

      itemElement.appendChild(siteNameElement);
      itemElement.appendChild(removeButton);
      whitelistItemsContainer.appendChild(itemElement);
    });
  }

  // Remove site from whitelist
  function removeSiteFromWhitelist(site) {
    chrome.storage.sync.get('whitelistedSites', function (data) {
      let whitelistedSites = data.whitelistedSites || [];
      whitelistedSites = whitelistedSites.filter(s => s !== site);

      chrome.storage.sync.set({ whitelistedSites }, function () {
        renderWhitelistedSites(whitelistedSites);
      });
    });
  }
  // Load saved settings
  chrome.storage.sync.get({
    modelName: 'qwen3:8b',
    maxChunkSize: 8000,
    timeout: 120
  }, function (data) {
    modelNameInput.value = data.modelName;
    maxChunkSizeSlider.value = data.maxChunkSize;
    maxChunkSizeValue.textContent = data.maxChunkSize;
    timeoutSlider.value = data.timeout;
    timeoutValue.textContent = data.timeout;
  });

  // Update value displays for sliders
  maxChunkSizeSlider.addEventListener('input', function () {
    maxChunkSizeValue.textContent = this.value;
  });

  timeoutSlider.addEventListener('input', function () {
    timeoutValue.textContent = this.value;
  });

  // Save settings
  saveButton.addEventListener('click', function () {
    const maxChunkSize = parseInt(maxChunkSizeSlider.value);
    const timeout = parseInt(timeoutSlider.value);

    chrome.storage.sync.set({
      modelName: modelNameInput.value.trim() || 'qwen3:8b',
      maxChunkSize: maxChunkSize,
      timeout: timeout
    }, function () {
      // Show temporary save confirmation
      const saveButton = document.getElementById('save');
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Settings Saved!';
      saveButton.style.backgroundColor = '#4CAF50';

      setTimeout(function () {
        saveButton.textContent = originalText;
        saveButton.style.backgroundColor = '#2196F3';
      }, 1500);
    });
  });

  // Test Ollama connection
  testOllamaButton.addEventListener('click', async function () {
    ollamaStatus.textContent = 'Testing Ollama connection...';
    ollamaStatus.className = 'status-message pending';

    try {
      // Send a message to the background script to check Ollama
      chrome.runtime.sendMessage({
        action: "checkOllamaAvailability"
      }, response => {
        if (chrome.runtime.lastError) {
          ollamaStatus.textContent = `Error: ${chrome.runtime.lastError.message}`;
          ollamaStatus.className = 'status-message error';
          return;
        }

        if (response.available) {
          ollamaStatus.textContent = `Connected successfully! Ollama version: ${response.version}`;
          if (response.models && response.models.length > 0) {
            ollamaStatus.textContent += `\nAvailable models: ${response.models.join(', ')}`;
          }
          ollamaStatus.className = 'status-message success';
        } else {
          ollamaStatus.textContent = `Ollama not available: ${response.reason}`;
          ollamaStatus.className = 'status-message error';
        }
      });
    } catch (err) {
      ollamaStatus.textContent = `Error: ${err.message}`;
      ollamaStatus.className = 'status-message error';
    }
  });
});