// options.js
const input = document.getElementById('modelName');
const saveBtn = document.getElementById('save');

// Load existing value
chrome.storage.sync.get({ modelName: 'qwen3:8b' }, ({ modelName }) => {
    input.value = modelName;
});

saveBtn.onclick = () => {
    chrome.storage.sync.set({ modelName: input.value.trim() || 'qwen3:8b' });
};

document.getElementById('testOllama').addEventListener('click', async function() {
  const statusElement = document.getElementById('ollamaStatus');
  statusElement.textContent = 'Testing Ollama connection...';
  statusElement.className = 'status-message pending';
  
  try {
    // Send a message to the background script to check Ollama
    chrome.runtime.sendMessage({
      action: "checkOllamaAvailability"
    }, response => {
      if (chrome.runtime.lastError) {
        statusElement.textContent = `Error: ${chrome.runtime.lastError.message}`;
        statusElement.className = 'status-message error';
        return;
      }
      
      if (response.available) {
        statusElement.textContent = `Connected successfully! Ollama version: ${response.version}`;
        if (response.models && response.models.length > 0) {
          statusElement.textContent += `\nAvailable models: ${response.models.join(', ')}`;
        }
        statusElement.className = 'status-message success';
      } else {
        statusElement.textContent = `Ollama not available: ${response.reason}`;
        statusElement.className = 'status-message error';
      }
    });
  } catch (err) {
    statusElement.textContent = `Error: ${err.message}`;
    statusElement.className = 'status-message error';
  }
});

// Load the maxChunkSize setting
chrome.storage.sync.get(['maxChunkSize'], function(data) {
  if (data.maxChunkSize) {
    document.getElementById('maxChunkSize').value = data.maxChunkSize;
  }
});

// Save the maxChunkSize setting when changed
document.getElementById('maxChunkSize').addEventListener('change', function() {
  const value = parseInt(this.value);
  if (value >= 500 && value <= 8000) {
    chrome.storage.sync.set({ maxChunkSize: value });
  }
});