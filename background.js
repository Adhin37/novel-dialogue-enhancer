// background.js
// Keep track of character maps across pages
let globalCharacterMap = {};

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCharacterMap") {
    // Merge the new character data with the global map
    globalCharacterMap = { ...globalCharacterMap, ...request.characters };
    
    // Save to storage for persistence
    chrome.storage.sync.set({ characterMap: globalCharacterMap });
    
    // Acknowledge the update
    sendResponse({ status: "ok" });
    
  } else if (request.action === "ollamaRequest") {
    // This is a proxy for the content script to make requests to Ollama
    // This works because background scripts aren't subject to the same CORS restrictions
    
    fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Ollama HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Extract the response text and send it back to the content script
      const enhancedText = data.response || data.choices?.[0]?.text?.trim();
      sendResponse({ enhancedText });
    })
    .catch(error => {
      console.error("Ollama request failed:", error);
      sendResponse({ error: error.message });
    });
    
    // Return true to indicate we'll send the response asynchronously
    return true;
  }
});

// Listen for installation event
chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.get([
    'enhancerEnabled', 
    'preserveNames', 
    'fixPronouns',
    'useLLM',
    'modelName'
  ], data => {
    // Only set if not already set
    const defaults = {};
    
    if (data.enhancerEnabled === undefined) defaults.enhancerEnabled = true;
    if (data.preserveNames === undefined) defaults.preserveNames = true;
    if (data.fixPronouns === undefined) defaults.fixPronouns = true;
    if (data.useLLM === undefined) defaults.useLLM = false;
    if (data.modelName === undefined) defaults.modelName = 'qwen3:8b';
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});