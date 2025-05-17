// background.js
const activeRequestControllers = new Map();
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
let novelCharacterMaps = {};

/**
 * Stores novel character maps in Chrome storage with size management
 * @param {object} novelCharacterMaps - The character maps to store
 */
function storeNovelCharacterMaps(novelCharacterMaps) {
  try {
    const serialized = JSON.stringify(novelCharacterMaps);
    const sizeInBytes = new Blob([serialized]).size;

    if (sizeInBytes > 100000) {
      console.warn(
        "Character maps getting too large, pruning older/smaller entries"
      );

      if (!novelCharacterMaps || typeof novelCharacterMaps !== "object") {
        console.error("Invalid novelCharacterMaps object");
        return;
      }

      // Get novels with least characters and remove them
      const novelEntries = Object.entries(novelCharacterMaps);

      // Sort by character count (ascending)
      novelEntries.sort(
        (a, b) =>
          Object.keys(a[1] || {}).length - Object.keys(b[1] || {}).length
      );

      const toRemove = Math.max(1, Math.floor(novelEntries.length * 0.2));
      for (let i = 0; i < toRemove; i++) {
        if (novelEntries[i]) {
          delete novelCharacterMaps[novelEntries[i][0]];
        }
      }
    }

    chrome.storage.local.set({ novelCharacterMaps }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error storing character maps:",
          chrome.runtime.lastError
        );
      }
    });
  } catch (error) {
    console.error("Error processing character maps:", error);
  }
}

function handleOllamaRequest(request, sendResponse) {
  // Validate request data
  if (!request || !request.data) {
    sendResponse({ error: "Invalid request data" });
    return;
  }

  chrome.storage.sync.get(
    {
      timeout: 200,
      temperature: 0.4,
      topP: 0.9
    },
    (data) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          error:
            "Error retrieving settings: " + chrome.runtime.lastError.message
        });
        return;
      }

      try {
        const requestData = prepareRequestData(request.data, data);

        // Validate important fields
        if (!requestData.model || typeof requestData.model !== "string") {
          throw new Error("Invalid model specification");
        }

        if (!requestData.prompt || typeof requestData.prompt !== "string") {
          throw new Error("Invalid prompt");
        }

        // Limit prompt size
        if (requestData.prompt.length > 32000) {
          requestData.prompt = requestData.prompt.substring(0, 32000);
        }

        console.log("Sending Ollama request:", {
          model: requestData.model,
          promptLength: requestData.prompt.length,
          max_tokens: requestData.max_tokens,
          temperature: requestData.temperature,
          top_p: requestData.top_p,
          stream: requestData.stream || false,
          timeout: data.timeout + " seconds",
          options: requestData.options || {}
        });

        if (requestData.stream === false) {
          processNonStreamingRequest(requestData, data.timeout, sendResponse);
        } else {
          sendResponse({ error: "Invalid stream value" });
        }
      } catch (error) {
        sendResponse({ error: error.message });
      }
    }
  );
}

function prepareRequestData(requestData, settings) {
  return {
    ...requestData,
    temperature: requestData.temperature || settings.temperature,
    top_p: requestData.top_p || settings.topP
  };
}

function processNonStreamingRequest(requestData, timeout, sendResponse) {
  // Validate Ollama URL
  const ollamaUrl = DEFAULT_OLLAMA_URL + "/api/generate";

  // Ensure timeout is a reasonable number
  timeout =
    typeof timeout === "number" && timeout > 0 && timeout < 300 ? timeout : 60;

  const controller = new AbortController();
  const requestId = Date.now().toString();
  activeRequestControllers.set(requestId, controller);

  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

  // Sanitize request data before sending
  const safeRequestData = {
    model: String(requestData.model || ""),
    prompt: String(requestData.prompt || ""),
    max_tokens: parseInt(requestData.max_tokens) || 1024,
    temperature: parseFloat(requestData.temperature) || 0.4,
    top_p: parseFloat(requestData.top_p) || 0.9,
    stream: false
  };

  fetch(ollamaUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeRequestData),
    signal: controller.signal
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Ollama HTTP error: ${response.status}`);
      }
      return response.text();
    })
    .then((rawText) => processOllamaResponse(rawText, sendResponse))
    .catch((error) =>
      handleOllamaError(error, controller, timeout, sendResponse)
    )
    .finally(() => {
      clearTimeout(timeoutId);
      activeRequestControllers.delete(requestId);
    });
}

function processOllamaResponse(rawText, sendResponse) {
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
    sendResponse({ error: `JSON parsing error: ${parseError.message}` });
  }
}

function handleOllamaError(error, controller, timeout, sendResponse) {
  if (error.name === "AbortError") {
    const isUserTerminated = controller.signal.reason === "USER_TERMINATED";

    if (isUserTerminated) {
      console.log("Ollama request was manually terminated");
      sendResponse({ error: "Request was terminated", terminated: true });
    } else {
      console.error("Ollama request timed out after", timeout, "ms");
      sendResponse({
        error: `Request timed out after ${timeout / 1000} seconds`
      });
    }
  } else {
    console.error("Ollama request failed:", error);
    sendResponse({ error: error.message });
  }
}

function checkOllamaAvailability(sendResponse) {
  console.log(
    `Checking Ollama availability at ${DEFAULT_OLLAMA_URL}/api/version`
  );

  // Create AbortController with reasonable timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

  fetch(DEFAULT_OLLAMA_URL + "/api/version", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal
  })
    .then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          console.log(`Ollama version check successful: ${data.version}`);

          // Create new controller for models request
          const modelsController = new AbortController();
          const modelsTimeoutId = setTimeout(
            () => modelsController.abort(),
            5000
          );

          fetch(DEFAULT_OLLAMA_URL + "/api/tags", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            signal: modelsController.signal
          })
            .then((modelsResponse) => modelsResponse.json())
            .then((modelsData) => {
              // Validate model data
              const availableModels = Array.isArray(modelsData.models)
                ? modelsData.models
                    .filter((m) => m && m.name)
                    .map((m) => m.name)
                : [];

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
            })
            .finally(() => clearTimeout(modelsTimeoutId));
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
    })
    .finally(() => clearTimeout(timeoutId));
}

// Function to check if a site is whitelisted
function isSiteWhitelisted(url) {
  try {
    // Validate URL format
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      console.warn("Invalid URL format:", url);
      return Promise.resolve(false);
    }

    const hostname = new URL(url).hostname;

    if (!hostname) {
      console.warn("No hostname found in URL:", url);
      return Promise.resolve(false);
    }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.get("whitelistedSites", (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error retrieving whitelisted sites:",
            chrome.runtime.lastError
          );
          return reject(false);
        }

        const whitelistedSites = Array.isArray(data.whitelistedSites)
          ? data.whitelistedSites
          : [];

        // Check if hostname or any of its parent domains are in the whitelist
        const isWhitelisted = whitelistedSites.some(
          (whitelistedSite) =>
            hostname === whitelistedSite ||
            hostname.endsWith("." + whitelistedSite)
        );
        resolve(isWhitelisted);
      });
    });
  } catch (e) {
    console.error("Error checking if site is whitelisted:", e);
    return Promise.resolve(false);
  }
}

// Check and handle site permissions
async function checkSitePermission(url) {
  // First, check if the site is whitelisted
  const isWhitelisted = await isSiteWhitelisted(url);
  if (isWhitelisted) {
    return true; // Site is already whitelisted
  }

  // Check if we have permissions for this host
  const origin = new URL(url).origin + "/*";
  const hasPermission = await chrome.permissions.contains({
    origins: [origin]
  });

  return hasPermission;
}

// Function to request permissions for a domain
async function requestPermission(domain) {
  const origin = `*://*.${domain}/*`;

  return new Promise((resolve) =>
    chrome.permissions.request(
      {
        origins: [origin]
      },
      (granted) => {
        if (granted) {
          resolve(true);
        } else {
          resolve(false);
        }
      }
    )
  );
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    {
      isExtensionPaused: true,
      preserveNames: true,
      fixPronouns: true,
      modelName: "qwen3:8b",
      maxChunkSize: 4000,
      timeout: 180,
      disabledPages: [],
      temperature: 0.4,
      topP: 0.9,
      whitelistedSites: []
    },
    (data) => chrome.storage.sync.set(data)
  );
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.tabs
      .sendMessage(tabId, {
        action: "checkCurrentSiteWhitelist",
        isWhitelisted: isSiteWhitelisted(tab.url)
      })
      .catch(() => {
        // Suppress errors when content script isn't ready or available
      });
  }
});

// Load character maps on startup
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("novelCharacterMaps", (data) => {
    if (data.novelCharacterMaps) {
      novelCharacterMaps = data.novelCharacterMaps;
    }
  });
});

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

    // For each character in the new map
    Object.entries(request.characters).forEach(([charName, charData]) => {
      // If character already exists in our stored map
      if (novelCharacterMaps[novelId][charName]) {
        const existingChar = novelCharacterMaps[novelId][charName];

        // Merge appearances count
        const newAppearances =
          (existingChar.appearances || 0) + (charData.appearances || 1);

        // Keep the higher confidence gender assessment
        let mergedGender = existingChar.gender;
        let mergedConfidence = existingChar.confidence || 0;
        let mergedEvidence = existingChar.evidence || [];

        // If new data has better confidence, use it instead
        if (charData.confidence > mergedConfidence) {
          mergedGender = charData.gender;
          mergedConfidence = charData.confidence;
          mergedEvidence = charData.evidence || [];
        }
        // If new data has same confidence but more evidence, include new evidence
        else if (
          charData.confidence === mergedConfidence &&
          charData.evidence
        ) {
          // Add new evidence that doesn't already exist
          charData.evidence.forEach((item) => {
            if (!mergedEvidence.includes(item)) {
              mergedEvidence.push(item);
            }
          });
        }

        // Update the existing character with merged data
        novelCharacterMaps[novelId][charName] = {
          ...existingChar,
          gender: mergedGender,
          confidence: mergedConfidence,
          appearances: newAppearances,
          evidence: mergedEvidence
        };
      } else {
        novelCharacterMaps[novelId][charName] = charData;
      }
    });

    // Store in sync storage (with size limit handling)
    storeNovelCharacterMaps(novelCharacterMaps);

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
  } else if (request.action === "checkSitePermission") {
    checkSitePermission(request.url).then((hasPermission) => {
      sendResponse({ hasPermission });
    });
    return true;
  } else if (request.action === "addSiteToWhitelist") {
    const url = request.url;
    try {
      const hostname = new URL(url).hostname;
      chrome.storage.sync.get("whitelistedSites", async (data) => {
        const whitelistedSites = data.whitelistedSites || [];

        if (!whitelistedSites.includes(hostname)) {
          if (await requestPermission(hostname)) {
            whitelistedSites.push(hostname);
            chrome.storage.sync.set({ whitelistedSites }, () => {
              sendResponse({
                success: true,
                message: `${hostname} added to whitelist`
              });
            });
          } else {
            sendResponse({
              success: false,
              message: `Permission denied for ${hostname}`
            });
          }
        } else {
          sendResponse({
            success: false,
            message: `${hostname} is already whitelisted`
          });
        }
      });
    } catch (e) {
      sendResponse({ success: false, message: `Invalid URL: ${e.message}` });
    }
    return true; // Will send response asynchronously
  } else if (request.action === "removeSiteFromWhitelist") {
    const hostname = request.hostname;
    chrome.storage.sync.get("whitelistedSites", (data) => {
      let whitelistedSites = data.whitelistedSites || [];
      whitelistedSites = whitelistedSites.filter((site) => site !== hostname);
      chrome.storage.sync.set({ whitelistedSites }, () => {
        sendResponse({ success: true });
      });
    });
    return true; // Will send response asynchronously
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
  }

  return false;
});
