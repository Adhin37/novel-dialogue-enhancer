// background.js
let activeRequestControllers = new Map();
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
let novelCharacterMaps = {};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCharacterMap") {
    const novelId = request.novelId;

    if (!novelId) {
      console.warn("No novel ID provided for character map update");
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Create or update the character map for this novel
    if (!novelCharacterMaps[novelId]) {
      novelCharacterMaps[novelId] = {};
    }

    novelCharacterMaps[novelId] = {
      ...novelCharacterMaps[novelId],
      ...request.characters
    };

    // Store in sync storage (with size limit handling)
    storeNovelCharacterMaps();

    sendResponse({ status: "ok" });
    return false;
  } else if (request.action === "getCharacterMap") {
    const novelId = request.novelId;

    if (!novelId) {
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    sendResponse({
      status: "ok",
      characterMap: novelCharacterMaps[novelId] || {}
    });
    return false;
  } else if (request.action === "ollamaRequest") {
    handleOllamaRequest(request, sendResponse);
    return true; // We'll send a response asynchronously
  } else if (request.action === "terminateAllRequests") {
    console.log(`Terminating ${activeRequestControllers.size} active requests`);

    for (const controller of activeRequestControllers.values()) {
      controller.abort("USER_TERMINATED");
    }

    activeRequestControllers.clear();

    sendResponse({
      status: "terminated",
      count: activeRequestControllers.size
    });
    return false;
  } else if (request.action === "checkOllamaAvailability") {
    checkOllamaAvailability(sendResponse);
    return true;
  } else if (request.action === "showNotification") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/icon128.png",
      title: request.data.title,
      message: request.data.message
    });

    sendResponse({ status: "notification_sent" });
    return false; // No async response needed
  }
  return false; // Default case
});

function storeNovelCharacterMaps() {
  // Chrome storage has limits, so we need to manage size
  // Calculate size of all character maps
  const serialized = JSON.stringify(novelCharacterMaps);
  const sizeInBytes = new Blob([serialized]).size;

  // If we're approaching size limits (100KB is a safe limit)
  if (sizeInBytes > 100000) {
    console.warn(
      "Character maps getting too large, pruning older/smaller entries"
    );

    // Get novels with least characters and remove them
    const novelEntries = Object.entries(novelCharacterMaps);

    // Sort by character count (ascending)
    novelEntries.sort(
      (a, b) => Object.keys(a[1]).length - Object.keys(b[1]).length
    );

    // Remove bottom 20% of novels
    const toRemove = Math.max(1, Math.floor(novelEntries.length * 0.2));
    for (let i = 0; i < toRemove; i++) {
      if (novelEntries[i]) {
        delete novelCharacterMaps[novelEntries[i][0]];
      }
    }
  }

  // Store the updated maps
  chrome.storage.local.set({ novelCharacterMaps });
}

// Load character maps on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("novelCharacterMaps", (data) => {
    if (data.novelCharacterMaps) {
      novelCharacterMaps = data.novelCharacterMaps;
    }
  });
});

function handleOllamaRequest(request, sendResponse) {
  chrome.storage.sync.get(
    {
      timeout: 180
    },
    function (data) {
      const OLLAMA_REQUEST_TIMEOUT = data.timeout * 1000;

      console.log("Sending Ollama request:", {
        model: request.data.model,
        promptLength: request.data.prompt.length,
        max_tokens: request.data.max_tokens,
        stream: request.data.stream || false,
        timeout: OLLAMA_REQUEST_TIMEOUT / 1000 + " seconds",
        options: request.data.options || {}
      });

      const controller = new AbortController();
      const requestId = Date.now().toString();
      activeRequestControllers.set(requestId, controller);

      const timeoutId = setTimeout(
        () => controller.abort(),
        OLLAMA_REQUEST_TIMEOUT
      );

      if (request.data.stream == false) {
        fetch(DEFAULT_OLLAMA_URL + "/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request.data),
          signal: controller.signal
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Ollama HTTP error: ${response.status}`);
            }
            return response.text();
          })
          .then((rawText) => {
            console.log(
              "Raw Ollama response (first 100 chars):",
              rawText.substring(0, 100)
            );
            try {
              let enhancedText = "";

              if (rawText.includes("\n")) {
                const lines = rawText.split("\n").filter((line) => line.trim());
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
                const data = JSON.parse(rawText);
                enhancedText = data.response || data.choices?.[0]?.text?.trim();
              }

              if (!enhancedText) {
                console.warn(
                  "No text found in Ollama response:",
                  rawText.substring(0, 200)
                );
                throw new Error("No text found in Ollama response");
              }

              console.log(
                "Ollama request successful, response length:",
                enhancedText.length
              );
              sendResponse({ enhancedText });
            } catch (parseError) {
              console.error("JSON parsing error:", parseError);
              console.error(
                "Raw response that caused parsing error:",
                rawText.substring(0, 500)
              );
              sendResponse({
                error: `JSON parsing error: ${parseError.message}`
              });
            }
          })
          .catch((error) => {
            if (error.name === "AbortError") {
              const isUserTerminated =
                controller.signal.reason === "USER_TERMINATED";

              if (isUserTerminated) {
                console.log("Ollama request was manually terminated");
                sendResponse({
                  error: "Request was terminated",
                  terminated: true
                });
              } else {
                console.error(
                  "Ollama request timed out after",
                  OLLAMA_REQUEST_TIMEOUT,
                  "ms"
                );
                sendResponse({
                  error: `Request timed out after ${
                    OLLAMA_REQUEST_TIMEOUT / 1000
                  } seconds`
                });
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
      } else {
        sendResponse({ error: "Invalid stream value" });
      }
    }
  );
}

function checkOllamaAvailability(sendResponse) {
  console.log(
    `Checking Ollama availability at ${DEFAULT_OLLAMA_URL}/api/version`
  );

  fetch(DEFAULT_OLLAMA_URL + "/api/version", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000)
  })
    .then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          console.log(`Ollama version check successful: ${data.version}`);

          fetch(DEFAULT_OLLAMA_URL + "/api/tags", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: AbortSignal.timeout(5000)
          })
            .then((modelsResponse) => modelsResponse.json())
            .then((modelsData) => {
              const availableModels =
                modelsData.models?.map((m) => m.name) || [];
              console.log(
                `Ollama is available, version: ${
                  data.version
                }, models: ${availableModels.join(", ")}`
              );
              sendResponse({
                available: true,
                version: data.version,
                models: availableModels
              });
            })
            .catch((modelError) => {
              console.log(
                `Ollama is available, version: ${data.version}, but couldn't fetch models: ${modelError.message}`
              );
              sendResponse({ available: true, version: data.version });
            });
        });
      } else {
        console.warn(
          `Ollama availability check failed with status: ${response.status}`
        );
        sendResponse({
          available: false,
          reason: `HTTP error: ${response.status}`
        });
      }
    })
    .catch((err) => {
      console.warn("Ollama availability check failed:", err);
      sendResponse({ available: false, reason: err.message });
    });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    [
      "enhancerEnabled",
      "preserveNames",
      "fixPronouns",
      "modelName",
      "maxChunkSize",
      "timeout",
      "disabledPages"
    ],
    (data) => {
      const defaults = {};

      if (data.enhancerEnabled === undefined) defaults.enhancerEnabled = true;
      if (data.preserveNames === undefined) defaults.preserveNames = true;
      if (data.fixPronouns === undefined) defaults.fixPronouns = true;
      if (data.modelName === undefined) defaults.modelName = "qwen3:8b";
      if (data.maxChunkSize === undefined) defaults.maxChunkSize = 4000;
      if (data.timeout === undefined) defaults.timeout = 180;
      if (data.disabledPages === undefined) defaults.disabledPages = [];

      if (Object.keys(defaults).length > 0) {
        chrome.storage.sync.set(defaults);
      }
    }
  );
});
