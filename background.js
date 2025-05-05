// background.js
// Keep track of character maps across pages
let globalCharacterMap = {};

// Track active AbortControllers to allow terminating requests
let activeRequestControllers = new Map();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCharacterMap") {
    // Merge the new character data with the global map
    globalCharacterMap = { ...globalCharacterMap, ...request.characters };
    
    // Save to storage for persistence
    chrome.storage.sync.set({ characterMap: globalCharacterMap });
    
    // Acknowledge the update
    sendResponse({ status: "ok" });
    
  } else if (request.action === "ollamaRequest") {
    // Get timeout setting, default to 180 seconds if not set
    chrome.storage.sync.get({ timeout: 180 }, function(data) {
      const OLLAMA_REQUEST_TIMEOUT = data.timeout * 1000; // Convert to milliseconds
      
      console.log("Sending Ollama request:", {
        model: request.data.model,
        promptLength: request.data.prompt.length,
        max_tokens: request.data.max_tokens,
        stream: request.data.stream || false,
        timeout: OLLAMA_REQUEST_TIMEOUT / 1000 + " seconds",
        options: request.data.options || {}
      });
      
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const requestId = Date.now().toString();
      activeRequestControllers.set(requestId, controller);
      
      const timeoutId = setTimeout(() => controller.abort(), OLLAMA_REQUEST_TIMEOUT);
      
      // Handle streamed responses if enabled
      if (request.data.stream) {
        let fullResponse = "";
        let responseStarted = false;
        
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
          
          // Create a reader for the response stream
          const reader = response.body.getReader();
          
          // Process the stream
          function processStream() {
            return reader.read().then(({ done, value }) => {
              if (done) {
                console.log("Stream complete, total response length:", fullResponse.length);
                sendResponse({ enhancedText: fullResponse });
                return;
              }
              
              // Decode and process this chunk
              const chunk = new TextDecoder().decode(value);
              try {
                // Split by newlines since Ollama streams JSON objects
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                  const data = JSON.parse(line);
                  if (data.response) {
                    fullResponse += data.response;
                    responseStarted = true;
                  }
                  // Check for done status
                  if (data.done) {
                    console.log("Ollama indicated completion");
                  }
                }
              } catch (parseError) {
                console.warn("Error parsing stream chunk:", parseError);
              }
              
              // Continue processing the stream
              return processStream();
            });
          }
          
          // Start processing the stream
          return processStream();
        })
        .catch(error => {
          const isAborted = error.name === 'AbortError';
          
          if (isAborted && controller.signal.reason === 'USER_TERMINATED') {
            console.log("Ollama request was manually terminated");
            sendResponse({ 
              error: "Request was terminated",
              terminated: true,
              enhancedText: responseStarted ? fullResponse : null
            });
          } else if (isAborted) {
            console.error("Ollama request timed out after", OLLAMA_REQUEST_TIMEOUT, "ms");
            sendResponse({ 
              error: `Request timed out after ${OLLAMA_REQUEST_TIMEOUT/1000} seconds`,
              // Return partial response if we have one
              enhancedText: responseStarted ? fullResponse : null
            });
          } else {
            console.error("Ollama request failed:", error);
            sendResponse({ error: error.message });
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
          activeRequestControllers.delete(requestId);
        });
      } else {
        // Non-streaming implementation
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
            // Parse the JSON response - handle both streaming and non-streaming responses
            let enhancedText = '';
            
            // If it looks like a streaming response (multiple JSON objects)
            if (rawText.includes('\n')) {
              const lines = rawText.split('\n').filter(line => line.trim());
              for (const line of lines) {
                try {
                  const data = JSON.parse(line);
                  if (data.response) {
                    enhancedText += data.response;
                  }
                } catch (lineError) {
                  console.warn("Error parsing JSON line:", lineError);
                }
              }
            } else {
              // Single JSON object
              const data = JSON.parse(rawText);
              enhancedText = data.response || data.choices?.[0]?.text?.trim();
            }
            
            if (!enhancedText) {
              console.warn("No text found in Ollama response:", rawText.substring(0, 200));
              throw new Error("No text found in Ollama response");
            }
            
            console.log("Ollama request successful, response length:", enhancedText.length);
            sendResponse({ enhancedText });
          } catch (parseError) {
            console.error("JSON parsing error:", parseError);
            console.error("Raw response that caused parsing error:", rawText.substring(0, 500));
            sendResponse({ error: `JSON parsing error: ${parseError.message}` });
          }
        })
        .catch(error => {
          // Check if this is a timeout or user-initiated abort
          if (error.name === 'AbortError') {
            const isUserTerminated = controller.signal.reason === 'USER_TERMINATED';
            
            if (isUserTerminated) {
              console.log("Ollama request was manually terminated");
              sendResponse({ 
                error: "Request was terminated",
                terminated: true
              });
            } else {
              console.error("Ollama request timed out after", OLLAMA_REQUEST_TIMEOUT, "ms");
              sendResponse({ error: `Request timed out after ${OLLAMA_REQUEST_TIMEOUT/1000} seconds` });
            }
          } else {
            console.error("Ollama request failed:", error);
            sendResponse({ error: error.message });
          }
        })
        .finally(() => {
          clearTimeout(timeoutId);
          activeRequestControllers.delete(requestId);
        });
      }
    });
    
    // Return true to indicate we'll send the response asynchronously
    return true;
  } else if (request.action === "terminateAllRequests") {
    // Terminate all active requests
    console.log(`Terminating ${activeRequestControllers.size} active requests`);
    
    for (const controller of activeRequestControllers.values()) {
      // Set reason so we can distinguish from timeouts
      controller.abort('USER_TERMINATED');
    }
    
    // Clear the collection
    activeRequestControllers.clear();
    
    sendResponse({ status: "terminated", count: activeRequestControllers.size });
  } else if (request.action === "checkOllamaAvailability") {
    // Handler for checking Ollama availability
    fetch('http://localhost:11434/api/version', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    })
    .then(response => {
      if (response.ok) {
        return response.json().then(data => {
          // Also try to get the list of models to help with troubleshooting
          fetch('http://localhost:11434/api/tags', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          })
          .then(modelsResponse => modelsResponse.json())
          .then(modelsData => {
            const availableModels = modelsData.models?.map(m => m.name) || [];
            console.log(`Ollama is available, version: ${data.version}, models: ${availableModels.join(', ')}`);
            sendResponse({ 
              available: true, 
              version: data.version,
              models: availableModels
            });
          })
          .catch(() => {
            // If we can't get models list, just return the version info
            console.log(`Ollama is available, version: ${data.version}`);
            sendResponse({ available: true, version: data.version });
          });
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
    'modelName',
    'maxChunkSize',
    'timeout',
    'disabledPages'
  ], data => {
    // Only set if not already set
    const defaults = {};
    
    if (data.enhancerEnabled === undefined) defaults.enhancerEnabled = true;
    if (data.preserveNames === undefined) defaults.preserveNames = true;
    if (data.fixPronouns === undefined) defaults.fixPronouns = true;
    if (data.useLLM === undefined) defaults.useLLM = false;
    if (data.modelName === undefined) defaults.modelName = 'qwen3:8b';
    if (data.maxChunkSize === undefined) defaults.maxChunkSize = 4000;
    if (data.timeout === undefined) defaults.timeout = 180;
    if (data.disabledPages === undefined) defaults.disabledPages = [];
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.sync.set(defaults);
    }
  });
});