// At the top of background/background.js, update the initialization
const activeRequestControllers = new Map();
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
let novelCharacterMaps = {};
let isBackgroundReady = false;
let globalStats = {
  totalParagraphsEnhanced: 0,
  totalChaptersEnhanced: 0,
  uniqueNovelsProcessed: 0,
  totalProcessingTime: 0,
  totalCharactersDetected: 0,
  enhancementSessions: 0,
  lastEnhancementDate: null,
  firstEnhancementDate: null
};

// Initialize background script properly
function initializeBackground() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["globalStats", "novelCharacterMaps"], (data) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Error loading background data:",
          chrome.runtime.lastError
        );
      } else {
        if (data.globalStats) {
          globalStats = { ...globalStats, ...data.globalStats };
        }
        if (data.novelCharacterMaps) {
          novelCharacterMaps = data.novelCharacterMaps;
        } else {
          novelCharacterMaps = {};
          chrome.storage.local.set({ novelCharacterMaps: {} });
        }
      }

      isBackgroundReady = true;
      console.log(
        "Background script initialized with",
        Object.keys(novelCharacterMaps).length,
        "novels"
      );
      resolve();
    });
  });
}

// Update the chrome.runtime.onInstalled listener
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(
    {
      isExtensionPaused: false,
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
    (data) => {
      chrome.storage.sync.set(data);
      console.log("Extension initialized with default settings:", data);

      // Initialize background data
      initializeBackground();
    }
  );
});

// Also initialize on startup
chrome.runtime.onStartup.addListener(() => {
  initializeBackground();
});

// Initialize immediately when script loads
initializeBackground();

// Add this function after the existing helper functions
function updateGlobalStats(statsUpdate) {
  const now = Date.now();

  if (statsUpdate.paragraphsEnhanced) {
    globalStats.totalParagraphsEnhanced += statsUpdate.paragraphsEnhanced;
  }

  if (statsUpdate.chaptersEnhanced) {
    globalStats.totalChaptersEnhanced += statsUpdate.chaptersEnhanced;
  }

  if (statsUpdate.charactersDetected) {
    globalStats.totalCharactersDetected += statsUpdate.charactersDetected;
  }

  if (statsUpdate.processingTime) {
    globalStats.totalProcessingTime += statsUpdate.processingTime;
  }

  if (statsUpdate.enhancementSession) {
    globalStats.enhancementSessions += 1;
    globalStats.lastEnhancementDate = now;

    if (!globalStats.firstEnhancementDate) {
      globalStats.firstEnhancementDate = now;
    }
  }

  // Calculate unique novels
  const uniqueNovels = new Set();
  Object.keys(novelCharacterMaps).forEach((novelId) => {
    if (
      novelCharacterMaps[novelId].chaps &&
      novelCharacterMaps[novelId].chaps.length > 0
    ) {
      uniqueNovels.add(novelId);
    }
  });
  globalStats.uniqueNovelsProcessed = uniqueNovels.size;

  // Store updated stats
  chrome.storage.local.set({ globalStats: globalStats });
}

function getNextCharacterId(charMap) {
  if (!charMap || typeof charMap !== "object") return 0;

  const existingIds = Object.keys(charMap)
    .map((id) => parseInt(id))
    .filter((id) => !isNaN(id));

  if (existingIds.length === 0) return 0;

  return Math.max(...existingIds) + 1;
}

function purgeOldNovels(maps, maxAge = 30 * 24 * 60 * 60 * 1000) {
  if (!maps || typeof maps !== "object") return {};

  const now = Date.now();
  // Use deepClone to avoid mutating the input parameter
  const purgedMaps = SharedUtils.deepClone(maps);
  let purgedCount = 0;

  Object.entries(purgedMaps).forEach(([novelId, data]) => {
    if (!data.lastAccess || now - data.lastAccess < maxAge) return;

    delete purgedMaps[novelId];
    purgedCount++;
  });

  if (purgedCount > 0) {
    console.log(
      `Purged ${purgedCount} novels that haven't been accessed in ${
        maxAge / (24 * 60 * 60 * 1000)
      } days`
    );
  }

  return purgedMaps;
}

/**
 * Stores novel character maps with purging old entries
 * @param {object} novelCharacterMaps - Character maps to store
 */
function storeNovelCharacterMaps(novelCharacterMaps) {
  try {
    const purgedMaps = purgeOldNovels(novelCharacterMaps);

    const serialized = JSON.stringify(purgedMaps);
    const sizeInBytes = new Blob([serialized]).size;

    if (sizeInBytes > 100000) {
      console.warn(
        "Character maps getting too large, pruning older/smaller entries"
      );

      if (!purgedMaps || typeof purgedMaps !== "object") {
        console.error("Invalid novelCharacterMaps object");
        return;
      }

      const novelEntries = Object.entries(purgedMaps);

      if (!Array.isArray(novelEntries) || novelEntries.length === 0) {
        console.warn("No valid novel entries found for pruning");
        return;
      }

      novelEntries.sort((a, b) => {
        if (!a[1] || !b[1]) {
          console.warn("Invalid entry data during sorting:", a[0], b[0]);
          return 0;
        }

        const aLastAccess = a[1].lastAccess || 0;
        const bLastAccess = b[1].lastAccess || 0;

        if (aLastAccess !== bLastAccess) {
          return aLastAccess - bLastAccess;
        }

        const aCharCount = a[1].chars ? Object.keys(a[1].chars).length : 0;
        const bCharCount = b[1].chars ? Object.keys(b[1].chars).length : 0;
        return aCharCount - bCharCount;
      });

      const toRemove = Math.max(1, Math.floor(novelEntries.length * 0.2));
      for (let i = 0; i < toRemove; i++) {
        if (novelEntries[i] && novelEntries[i][0]) {
          const entryId = novelEntries[i][0];
          console.log(`Removing novel entry: ${entryId}`);
          delete purgedMaps[entryId];
        }
      }
    }

    chrome.storage.local.set({ novelCharacterMaps: purgedMaps }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error storing character maps:",
          chrome.runtime.lastError
        );
      } else {
        console.log(
          `Successfully stored ${Object.keys(purgedMaps).length} novel entries`
        );
      }
    });
  } catch (error) {
    console.error("Error processing character maps:", error);
  }
}

/**
 * Handles Ollama requests for text generation
 * @param {object} request - Request object containing data
 * @param {function} sendResponse - Function to send response
 */
function handleOllamaRequest(request, sendResponse) {
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

      // Validate retrieved data
      if (!data || typeof data !== "object") {
        console.warn("Invalid settings data retrieved:", data);
        sendResponse({ error: "Invalid settings configuration" });
        return;
      }

      try {
        const requestData = prepareRequestData(request.data, data);

        if (!requestData.model || typeof requestData.model !== "string") {
          throw new Error("Invalid model specification");
        }

        if (!requestData.prompt || typeof requestData.prompt !== "string") {
          throw new Error("Invalid prompt");
        }

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
        console.error("Error preparing request:", error);
        sendResponse({ error: error.message });
      }
    }
  );
}

/**
 * Prepares request data for Ollama
 * @param {object} requestData - Request data
 * @param {object} settings - Settings object
 * @return {object} - Prepared request data
 */
function prepareRequestData(requestData, settings) {
  return {
    ...requestData,
    temperature: requestData.temperature || settings.temperature,
    top_p: requestData.top_p || settings.topP
  };
}

function processNonStreamingRequest(requestData, timeout, sendResponse) {
  const ollamaUrl = DEFAULT_OLLAMA_URL + "/api/generate";

  const validatedTimeout =
    typeof timeout === "number" && timeout > 0 && timeout < 300 ? timeout : 60;

  const controller = new AbortController();
  const requestId = Date.now().toString();
  activeRequestControllers.set(requestId, controller);

  const timeoutId = setTimeout(
    () => controller.abort(),
    validatedTimeout * 1000
  );

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
      handleOllamaError(error, controller, validatedTimeout, sendResponse)
    )
    .finally(() => {
      clearTimeout(timeoutId);
      activeRequestControllers.delete(requestId);
    });
}

/**
 * Processes Ollama response
 * @param {string} rawText - Raw response text
 * @param {function} sendResponse - Function to send response
 */
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

/**
 * Handles Ollama request errors
 * @param {Error} error - Error object
 * @param {AbortController} controller - Abort controller
 * @param {number} timeout - Request timeout
 * @param {function} sendResponse - Function to send response
 */
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

/**
 * Checks Ollama availability
 * @param {function} sendResponse - Function to send response
 */
function checkOllamaAvailability(sendResponse) {
  console.log(
    `Checking Ollama availability at ${DEFAULT_OLLAMA_URL}/api/version`
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  fetch(DEFAULT_OLLAMA_URL + "/api/version", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal
  })
    .then((response) => {
      if (!response) {
        throw new Error("No response received from Ollama");
      }

      if (response.ok) {
        return response.json().then((data) => {
          // Validate data parameter
          if (!data || typeof data !== "object") {
            console.warn("Invalid version data received:", data);
            sendResponse({
              available: false,
              reason: "Invalid version data format"
            });
            return;
          }

          console.log(
            `Ollama version check successful: ${data.version || "unknown"}`
          );

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
            .then((modelsResponse) => {
              if (!modelsResponse || !modelsResponse.ok) {
                console.warn(
                  "Models endpoint not accessible:",
                  modelsResponse?.status
                );
                sendResponse({
                  available: true,
                  version: data.version,
                  reason: "Could not fetch models list"
                });
                return;
              }

              return modelsResponse.json();
            })
            .then((modelsData) => {
              // Use modelsData parameter with validation
              if (!modelsData || typeof modelsData !== "object") {
                console.warn("Invalid models data:", modelsData);
                sendResponse({
                  available: true,
                  version: data.version,
                  models: []
                });
                return;
              }

              const availableModels = Array.isArray(modelsData.models)
                ? modelsData.models
                    .filter((model) => model && model.name)
                    .map((model) => model.name)
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
              sendResponse({
                available: true,
                version: data.version,
                reason: `Models fetch failed: ${modelError.message}`
              });
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
    .catch((error) => {
      // Use error parameter
      if (!error) {
        console.warn("Unknown error during Ollama check");
        sendResponse({ available: false, reason: "Unknown error" });
        return;
      }

      console.warn("Ollama availability check failed:", error.message || error);
      sendResponse({
        available: false,
        reason: error.message || "Connection failed"
      });
    })
    .finally(() => clearTimeout(timeoutId));
}

/**
 * Checks if a site is whitelisted
 * @param {string} url - URL to check
 * @return {Promise<boolean>} - Whether the site is whitelisted
 */
function isSiteWhitelisted(url) {
  try {
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      console.warn("Invalid URL format:", url);
      return Promise.resolve(false);
    }

    const hostname = new URL(url).hostname;

    if (!hostname) {
      console.warn("No hostname found in URL:", url);
      return Promise.resolve(false);
    }

    const cachedResult = whitelistCache.get(hostname);
    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
      return Promise.resolve(cachedResult.isWhitelisted);
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get("whitelistedSites", (data) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error retrieving whitelisted sites:",
            chrome.runtime.lastError
          );
          whitelistCache.set(hostname, {
            isWhitelisted: false,
            timestamp: Date.now()
          });
          return resolve(false);
        }

        const whitelistedSites = Array.isArray(data.whitelistedSites)
          ? data.whitelistedSites
          : [];

        const isWhitelisted = whitelistedSites.some(
          (whitelistedSite) =>
            hostname === whitelistedSite ||
            hostname.endsWith("." + whitelistedSite)
        );

        whitelistCache.set(hostname, {
          isWhitelisted,
          timestamp: Date.now()
        });

        resolve(isWhitelisted);
      });
    });
  } catch (e) {
    console.error("Error checking if site is whitelisted:", e);
    return Promise.resolve(false);
  }
}

/**
 * Checks site permission
 * @param {string} url - URL to check
 * @return {Promise<boolean>} - Whether the site is whitelisted
 */
async function checkSitePermission(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const hostname = new URL(url).hostname;
    const cachedResult = whitelistCache.get(hostname);

    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
      return cachedResult.isWhitelisted;
    }

    const isWhitelisted = await isSiteWhitelisted(url);

    whitelistCache.set(hostname, {
      isWhitelisted,
      timestamp: Date.now()
    });

    return isWhitelisted;
  } catch (error) {
    console.error("Error in checkSitePermission:", error);
    return false;
  }
}

/**
 * Requests permission for a domain
 * @param {string} domain - Domain to request permission for
 * @return {Promise<boolean>} - Whether permission was granted
 */
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
      isExtensionPaused: false,
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
    (data) => {
      chrome.storage.sync.set(data);
      console.log("Extension initialized with default settings:", data);
    }
  );
});

const whitelistCache = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000;

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const cacheKey = new URL(tab.url).hostname;
    const cachedResult = whitelistCache.get(cacheKey);

    if (cachedResult && Date.now() - cachedResult.timestamp < CACHE_EXPIRY) {
      sendWhitelistStatus(tabId, cachedResult.isWhitelisted);
      return;
    }

    isSiteWhitelisted(tab.url)
      .then((isWhitelisted) => {
        whitelistCache.set(cacheKey, {
          isWhitelisted,
          timestamp: Date.now()
        });

        sendWhitelistStatus(tabId, isWhitelisted);
      })
      .catch((error) => {
        console.error("Error checking whitelist status:", error);
      });
  }
});

/**
 * Sends whitelist status to a tab
 * @param {number} tabId - Tab ID
 * @param {boolean} isWhitelisted - Whether the site is whitelisted
 */
function sendWhitelistStatus(tabId, isWhitelisted) {
  chrome.tabs
    .sendMessage(tabId, {
      action: "checkCurrentSiteWhitelist",
      isWhitelisted: isWhitelisted
    })
    .catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("globalStats", (data) => {
    if (data.globalStats) {
      globalStats = { ...globalStats, ...data.globalStats };
    }
  });
  chrome.storage.local.get("novelCharacterMaps", (data) => {
    if (data.novelCharacterMaps) {
      novelCharacterMaps = data.novelCharacterMaps;
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Check if background is ready for data operations
  if (
    !isBackgroundReady &&
    [
      "getNovelData",
      "updateNovelData",
      "getNovelStyle",
      "updateNovelStyle"
    ].includes(request.action)
  ) {
    console.warn("Background not ready, waiting...");
    initializeBackground().then(() => {
      // Retry the operation after initialization
      handleMessage(request, sender, sendResponse);
    });
    return true; // Keep channel open
  }

  return handleMessage(request, sender, sendResponse);
});

function handleMessage(request, sender, sendResponse) {
  if (request.action === "updateNovelData") {
    const novelId = request.novelId;

    if (!novelId) {
      console.warn("No novel ID provided for novel data update");
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Ensure novelCharacterMaps is initialized
    if (!novelCharacterMaps) {
      novelCharacterMaps = {};
    }

    if (!novelCharacterMaps[novelId]) {
      novelCharacterMaps[novelId] = {
        chars: {},
        chaps: [],
        lastAccess: Date.now()
      };
    }

    novelCharacterMaps[novelId].lastAccess = Date.now();

    if (request.chapterNumber) {
      if (!novelCharacterMaps[novelId].chaps) {
        novelCharacterMaps[novelId].chaps = [];
      }

      const chapterNum = parseInt(request.chapterNumber, 10);
      if (
        !isNaN(chapterNum) &&
        !novelCharacterMaps[novelId].chaps.includes(chapterNum)
      ) {
        novelCharacterMaps[novelId].chaps.push(chapterNum);
        console.log(`Added chapter ${chapterNum} to novel ${novelId}`);
      }
    }

    if (request.chars && typeof request.chars === "object") {
      Object.entries(request.chars).forEach(([charId, charData]) => {
        // Skip invalid entries
        if (!charId || charId.trim() === "") {
          console.warn("Invalid character ID provided:", charId);
          return;
        }

        if (!charData || typeof charData !== "object" || !charData.name) {
          console.warn(`Invalid character data for ID ${charId}:`, charData);
          return;
        }

        let existingCharId = null;

        for (const [id, character] of Object.entries(
          novelCharacterMaps[novelId].chars
        )) {
          if (character && character.name === charData.name) {
            existingCharId = id;
            break;
          }
        }

        if (existingCharId !== null) {
          const existingChar =
            novelCharacterMaps[novelId].chars[existingCharId];

          if (!existingChar) {
            console.warn(
              `Existing character data missing for ID ${existingCharId}`
            );
            return;
          }

          const newAppearances =
            (existingChar.appearances || 0) + (charData.appearances || 1);

          let mergedGender = existingChar.gender;
          let mergedConfidence = existingChar.confidence || 0;
          let mergedEvidences = [...(existingChar.evidences || [])];

          const newConfidence = parseFloat(charData.confidence) || 0;
          if (newConfidence > mergedConfidence) {
            mergedGender = charData.gender;
            mergedConfidence = newConfidence;
            mergedEvidences = Array.isArray(charData.evidences)
              ? [...charData.evidences]
              : [];
          } else if (
            newConfidence === mergedConfidence &&
            Array.isArray(charData.evidences)
          ) {
            charData.evidences.forEach((item) => {
              if (
                item &&
                !mergedEvidences.includes(item) &&
                mergedEvidences.length < 5
              ) {
                mergedEvidences.push(item);
              }
            });
          }

          novelCharacterMaps[novelId].chars[existingCharId] = {
            name: charData.name,
            gender: mergedGender,
            confidence: mergedConfidence,
            appearances: newAppearances
          };

          if (mergedEvidences.length > 0) {
            novelCharacterMaps[novelId].chars[existingCharId].evidences =
              mergedEvidences.slice(0, 5);
          }

          console.log(
            `Updated existing character: ${charData.name} (ID: ${existingCharId})`
          );
        } else {
          const nextId = getNextCharacterId(novelCharacterMaps[novelId].chars);

          novelCharacterMaps[novelId].chars[nextId] = {
            name: charData.name,
            gender: charData.gender,
            confidence: parseFloat(charData.confidence) || 0,
            appearances: parseInt(charData.appearances) || 1
          };

          if (
            Array.isArray(charData.evidences) &&
            charData.evidences.length > 0
          ) {
            novelCharacterMaps[novelId].chars[nextId].evidences = [
              ...charData.evidences.slice(0, 5)
            ];
          }

          console.log(`Added new character: ${charData.name} (ID: ${nextId})`);
        }
      });
    }

    storeNovelCharacterMaps(novelCharacterMaps);

    // Add stats tracking
    const statsUpdate = {
      enhancementSession: true
    };

    if (request.chapterNumber) {
      const chapterNum = parseInt(request.chapterNumber, 10);
      if (
        !isNaN(chapterNum) &&
        !novelCharacterMaps[novelId].chaps.includes(chapterNum)
      ) {
        statsUpdate.chaptersEnhanced = 1;
      }
    }

    if (request.chars) {
      statsUpdate.charactersDetected = Object.keys(request.chars).length;
    }

    updateGlobalStats(statsUpdate);

    sendResponse({ status: "ok" });
    return false;
  } else if (request.action === "getGlobalStats") {
    const uniqueNovels = new Set();
    Object.keys(novelCharacterMaps).forEach((novelId) => {
      if (
        novelCharacterMaps[novelId].chaps &&
        novelCharacterMaps[novelId].chaps.length > 0
      ) {
        uniqueNovels.add(novelId);
      }
    });
    globalStats.uniqueNovelsProcessed = uniqueNovels.size;

    sendResponse({ status: "ok", stats: globalStats });
    return false;
  } else if (request.action === "updateParagraphStats") {
    const statsUpdate = {
      paragraphsEnhanced: request.paragraphCount || 0,
      processingTime: request.processingTime || 0
    };

    updateGlobalStats(statsUpdate);

    sendResponse({ status: "ok" });
    return false;
  } else if (request.action === "resetGlobalStats") {
    globalStats = {
      totalParagraphsEnhanced: 0,
      totalChaptersEnhanced: 0,
      uniqueNovelsProcessed: 0,
      totalProcessingTime: 0,
      totalCharactersDetected: 0,
      enhancementSessions: 0,
      lastEnhancementDate: null,
      firstEnhancementDate: null
    };

    chrome.storage.local.set({ globalStats: globalStats });
    sendResponse({ status: "ok" });
    return false;
  } else if (request.action === "getNovelData") {
    const novelId = request.novelId;

    if (!novelId) {
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Ensure novelCharacterMaps is initialized
    if (!novelCharacterMaps) {
      novelCharacterMaps = {};
    }

    // Synchronous operation - return false immediately
    if (!novelCharacterMaps[novelId]) {
      sendResponse({
        status: "ok",
        characterMap: {},
        enhancedChapters: [],
        isChapterEnhanced: false,
        rawCharacterData: {}
      });
      return false;
    }

    novelCharacterMaps[novelId].lastAccess = Date.now();

    const response = {
      status: "ok",
      characterMap: {},
      enhancedChapters: [],
      isChapterEnhanced: false
    };

    // Include raw character data if requested
    if (request.includeRawData) {
      response.rawCharacterData = novelCharacterMaps[novelId].chars || {};
    }

    if (request.checkChapter && request.chapterNumber) {
      const checkChapterNum = parseInt(request.chapterNumber, 10);
      const isEnhanced =
        Array.isArray(novelCharacterMaps[novelId].chaps) &&
        novelCharacterMaps[novelId].chaps.includes(checkChapterNum);

      response.isChapterEnhanced = isEnhanced;
    }

    Object.entries(novelCharacterMaps[novelId].chars || {}).forEach(
      ([charId, charData]) => {
        const characterName = charData.name;
        response.characterMap[characterName] = {
          gender: SharedUtils.expandGender(charData.gender),
          confidence: charData.confidence,
          appearances: charData.appearances,
          evidence: charData.evidences || []
        };
      }
    );

    if (Array.isArray(novelCharacterMaps[novelId].chaps)) {
      response.enhancedChapters = novelCharacterMaps[novelId].chaps.map(
        (num) => ({
          chapterNumber: parseInt(num, 10)
        })
      );
    }

    sendResponse(response);
    return false; // Synchronous operation
  } else if (request.action === "checkSitePermission") {
    // Async operation - return true to keep channel open
    checkSitePermission(request.url)
      .then((hasPermission) => {
        sendResponse({ hasPermission });
      })
      .catch((error) => {
        console.error("Error in checkSitePermission:", error);
        sendResponse({ hasPermission: false, error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "addSiteToWhitelist") {
    const url = request.url;
    try {
      const hostname = new URL(url).hostname;
      chrome.storage.sync.get("whitelistedSites", async (data) => {
        try {
          const whitelistedSites = data.whitelistedSites || [];

          if (!whitelistedSites.includes(hostname)) {
            const permissionGranted = await requestPermission(hostname);
            if (permissionGranted) {
              whitelistedSites.push(hostname);
              chrome.storage.sync.set({ whitelistedSites }, () => {
                whitelistCache.set(hostname, {
                  isWhitelisted: true,
                  timestamp: Date.now()
                });

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
        } catch (error) {
          sendResponse({
            success: false,
            message: `Error processing request: ${error.message}`
          });
        }
      });
    } catch (e) {
      sendResponse({ success: false, message: `Invalid URL: ${e.message}` });
    }
    return true; // Keep message channel open for async response
  } else if (request.action === "removeSiteFromWhitelist") {
    const hostname = request.hostname;
    chrome.storage.sync.get("whitelistedSites", (data) => {
      try {
        let whitelistedSites = data.whitelistedSites || [];
        whitelistedSites = whitelistedSites.filter((site) => site !== hostname);
        chrome.storage.sync.set({ whitelistedSites }, () => {
          whitelistCache.set(hostname, {
            isWhitelisted: false,
            timestamp: Date.now()
          });

          sendResponse({ success: true });
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true; // Keep message channel open for async response
  } else if (request.action === "ollamaRequest") {
    // Async operation - return true to keep channel open
    handleOllamaRequest(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === "checkActiveTabPermission") {
    if (!request.url) {
      sendResponse({ hasPermission: false, error: "No URL provided" });
      return false;
    }

    try {
      const url = request.url;
      // Async operation - return true to keep channel open
      isSiteWhitelisted(url)
        .then((isWhitelisted) => {
          if (isWhitelisted) {
            sendResponse({ hasPermission: true, whitelisted: true });
            return;
          }

          const origin = new URL(url).origin + "/*";
          return chrome.permissions
            .contains({
              origins: [origin]
            })
            .then((hasPermission) => {
              sendResponse({
                hasPermission: hasPermission,
                whitelisted: false
              });
            });
        })
        .catch((error) => {
          console.error("Error checking active tab permission:", error);
          sendResponse({
            hasPermission: false,
            error: error.message || "Unknown error occurred"
          });
        });
    } catch (error) {
      console.error("Exception in checkActiveTabPermission:", error);
      sendResponse({
        hasPermission: false,
        error: error.message || "Invalid URL format"
      });
      return false;
    }

    return true; // Keep message channel open for async response
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
    return false; // Synchronous operation
  } else if (request.action === "checkOllamaAvailability") {
    // Async operation - return true to keep channel open
    checkOllamaAvailability(sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === "getOllamaModels") {
    // Async operation - return true to keep channel open
    fetch(DEFAULT_OLLAMA_URL + "/api/tags", {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const models = data.models
          ? data.models.map((model) => model.name)
          : [];
        sendResponse({ models });
      })
      .catch((error) => {
        console.error("Error fetching Ollama models:", error);
        sendResponse({ models: [], error: error.message });
      });
    return true; // Keep message channel open for async response
  } else if (request.action === "getNovelStyle") {
    const novelId = request.novelId;

    if (!novelId) {
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Ensure novelCharacterMaps is initialized
    if (!novelCharacterMaps) {
      novelCharacterMaps = {};
    }

    const novelData = novelCharacterMaps[novelId] || {};
    novelData.lastAccess = Date.now();

    if (!novelCharacterMaps[novelId]) {
      novelCharacterMaps[novelId] = novelData;
    }

    if (novelData.style) {
      sendResponse({ status: "ok", style: novelData.style });
    } else {
      sendResponse({ status: "ok", style: null });
    }

    return false;
  } else if (request.action === "updateNovelStyle") {
    const novelId = request.novelId;
    const style = request.style;

    if (!novelId || !style) {
      sendResponse({
        status: "error",
        message: "Missing novel ID or style data"
      });
      return false;
    }

    // Ensure novelCharacterMaps is initialized
    if (!novelCharacterMaps) {
      novelCharacterMaps = {};
    }

    if (!novelCharacterMaps[novelId]) {
      novelCharacterMaps[novelId] = {
        chars: {},
        chaps: [],
        style: style,
        lastAccess: Date.now()
      };
    } else {
      novelCharacterMaps[novelId].style = style;
      novelCharacterMaps[novelId].lastAccess = Date.now();
    }

    storeNovelCharacterMaps(novelCharacterMaps);

    sendResponse({ status: "ok" });
    return false;
  }

  // Default for unhandled actions
  sendResponse({ status: "error", error: "Unknown action" });
  return false;
}
