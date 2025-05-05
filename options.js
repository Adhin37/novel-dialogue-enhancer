// options.js
document.addEventListener('DOMContentLoaded', function() {
  const modelNameInput = document.getElementById('modelName');
  const saveButton = document.getElementById('save');
  const maxChunkSizeSlider = document.getElementById('maxChunkSize');
  const maxChunkSizeValue = document.getElementById('maxChunkSizeValue');
  const timeoutSlider = document.getElementById('timeout');
  const timeoutValue = document.getElementById('timeoutValue');
  const testOllamaButton = document.getElementById('testOllama');
  const ollamaStatus = document.getElementById('ollamaStatus');

  // Load saved settings
  chrome.storage.sync.get({
    modelName: 'qwen3:8b',
    maxChunkSize: 8000,
    timeout: 120
  }, function(data) {
    modelNameInput.value = data.modelName;
    maxChunkSizeSlider.value = data.maxChunkSize;
    maxChunkSizeValue.textContent = data.maxChunkSize;
    timeoutSlider.value = data.timeout;
    timeoutValue.textContent = data.timeout;
  });

  // Update value displays for sliders
  maxChunkSizeSlider.addEventListener('input', function() {
    maxChunkSizeValue.textContent = this.value;
  });

  timeoutSlider.addEventListener('input', function() {
    timeoutValue.textContent = this.value;
  });

  // Save settings
  saveButton.addEventListener('click', function() {
    const maxChunkSize = parseInt(maxChunkSizeSlider.value);
    const timeout = parseInt(timeoutSlider.value);
    
    chrome.storage.sync.set({
      modelName: modelNameInput.value.trim() || 'qwen3:8b',
      maxChunkSize: maxChunkSize,
      timeout: timeout
    }, function() {
      // Show temporary save confirmation
      const saveButton = document.getElementById('save');
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Settings Saved!';
      saveButton.style.backgroundColor = '#4CAF50';
      
      setTimeout(function() {
        saveButton.textContent = originalText;
        saveButton.style.backgroundColor = '#2196F3';
      }, 1500);
    });
  });

  // Test Ollama connection
  testOllamaButton.addEventListener('click', async function() {
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