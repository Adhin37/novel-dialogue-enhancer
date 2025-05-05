// background.js
// Keep track of character maps across pages
let globalCharacterMap = {};

// Timeout for Ollama requests (milliseconds)
const OLLAMA_REQUEST_TIMEOUT = 30000;

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
    
    console.log("Sending Ollama request:", {
      model: request.data.model,
      promptLength: request.data.prompt.length,
      max_tokens: request.data.max_tokens
    });
    
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_REQUEST_TIMEOUT);
    
    fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data),
      signal: controller.signal
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Ollama HTTP error: ${response.status}`);
      }
      return response.text(); // Get raw text first to inspect response
    })
    .then(rawText => {
      console.log("Raw Ollama response (first 100 chars):", rawText.substring(0, 100));
      try {
        // Parse the JSON response
        const data = JSON.parse(rawText);
        // Extract the response text and send it back to the content script
        const enhancedText = data.response || data.choices?.[0]?.text?.trim();
        
        if (!enhancedText) {
          console.warn("No text found in Ollama response:", data);
          throw new Error("No text found in Ollama response");
        }
        
        console.log("Ollama request successful, response length:", enhancedText.length);
        sendResponse({ enhancedText });
      } catch (parseError) {
        console.error("JSON parsing error:", parseError);
        console.error("Raw response that caused parsing error:", rawText);
        sendResponse({ error: `JSON parsing error: ${parseError.message}` });
      }
    })
    .catch(error => {
      // Check if this is a timeout
      if (error.name === 'AbortError') {
        console.error("Ollama request timed out after", OLLAMA_REQUEST_TIMEOUT, "ms");
        sendResponse({ error: `Request timed out after ${OLLAMA_REQUEST_TIMEOUT/1000} seconds` });
      } else {
        console.error("Ollama request failed:", error);
        sendResponse({ error: error.message });
      }
    })
    .finally(() => {
      clearTimeout(timeoutId);
    });
    
    // Return true to indicate we'll send the response asynchronously
    return true;
  } else if (request.action === "checkOllamaAvailability") {
    // New handler for checking Ollama availability
    fetch('http://localhost:11434/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    })
    .then(response => {
      if (response.ok) {
        return response.json().then(data => {
          console.log(`Ollama is available, version: ${data.version}`);
          sendResponse({ available: true, version: data.version });
        });
      } else {
        sendResponse({ available: false, reason: `HTTP error: ${response.status}` });
      }
    })
    .catch(err => {
      console.warn('Ollama availability check failed:', err);
      sendResponse({ available: false, reason: err.message });
    });
    
    // Return true to indicate we'll send the response asynchronously
    return true;
  } else if (request.action === "showNotification") {
    // Handle showing notifications
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon128.png',
      title: request.data.title,
      message: request.data.message
    });
    
    sendResponse({ status: "notification_sent" });
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
    if (data.modelName === undefined) defaults.modelName = 'qwen3:8b'; // Updated to use a more common model
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});