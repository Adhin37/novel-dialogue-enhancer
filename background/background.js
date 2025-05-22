const activeRequestControllers = new Map();
const DEFAULT_OLLAMA_URL = "http://localhost:11434";
let novelCharacterMaps = {};

function compressGender(gender) {
  if (!gender || typeof gender !== "string") return "u";

  const genderLower = gender.toLowerCase();
  if (genderLower === "male") return "m";
  if (genderLower === "female") return "f";
  return "u";
}

function expandGender(code) {
  if (!code || typeof code !== "string") return "unknown";

  if (code === "m") return "male";
  if (code === "f") return "female";
  return "unknown";
}

function getNextCharacterId(charMap) {
  if (!charMap || typeof charMap !== "object") return 0;

  const existingIds = Object.keys(charMap)
    .map((id) => parseInt(id))
    .filter((id) => !isNaN(id));

  if (existingIds.length === 0) return 0;

  return Math.max(...existingIds) + 1;
}

function migrateToNewFormat(oldMap) {
  if (!oldMap || typeof oldMap !== "object")
    return { chars: {}, chaps: [], lastAccess: Date.now() };

  if (oldMap.chars) return oldMap;

  const newMap = {
    chars: {},
    chaps: [],
    lastAccess: Date.now()
  };

  if (oldMap.characters && typeof oldMap.characters === "object") {
    Object.entries(oldMap.characters).forEach(([name, data], index) => {
      newMap.chars[index] = {
        name: name,
        gender: compressGender(data.gender),
        confidence: parseFloat(data.confidence) || 0,
        appearances: parseInt(data.appearances) || 1
      };

      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        newMap.chars[index].evidences = data.evidence.slice(0, 5);
      }
    });

    if (Array.isArray(oldMap.enhancedChapters)) {
      newMap.chaps = oldMap.enhancedChapters
        .map((chapter) => chapter.chapterNumber)
        .filter((num) => typeof num === "number");
    }

    if (oldMap.style) {
      newMap.style = oldMap.style;
    }
  } else {
    Object.entries(oldMap).forEach(([name, data], index) => {
      newMap.chars[index] = {
        name: name,
        gender: compressGender(data.gender),
        confidence: parseFloat(data.confidence) || 0,
        appearances: parseInt(data.appearances) || 1
      };

      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        newMap.chars[index].evidences = data.evidence.slice(0, 5);
      }
    });
  }

  return newMap;
}

function purgeOldNovels(maps, maxAge = 30 * 24 * 60 * 60 * 1000) {
  if (!maps || typeof maps !== "object") return {};

  const now = Date.now();
  const purgedMaps = { ...maps };
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

function storeNovelCharacterMaps(novelCharacterMaps) {
  try {
    const purgedMaps = purgeOldNovels(novelCharacterMaps);

    Object.entries(purgedMaps).forEach(([novelId, data]) => {
      purgedMaps[novelId] = migrateToNewFormat(data);
    });

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

      novelEntries.sort((a, b) => {
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
        if (novelEntries[i]) {
          delete purgedMaps[novelEntries[i][0]];
        }
      }
    }

    chrome.storage.local.set({ novelCharacterMaps: purgedMaps }, () => {
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
  const ollamaUrl = DEFAULT_OLLAMA_URL + "/api/generate";

  timeout =
    typeof timeout === "number" && timeout > 0 && timeout < 300 ? timeout : 60;

  const controller = new AbortController();
  const requestId = Date.now().toString();
  activeRequestControllers.set(requestId, controller);

  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  fetch(DEFAULT_OLLAMA_URL + "/api/version", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: controller.signal
  })
    .then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          console.log(`Ollama version check successful: ${data.version}`);

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

function sendWhitelistStatus(tabId, isWhitelisted) {
  chrome.tabs
    .sendMessage(tabId, {
      action: "checkCurrentSiteWhitelist",
      isWhitelisted: isWhitelisted
    })
    .catch(() => {});
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("novelCharacterMaps", (data) => {
    if (data.novelCharacterMaps) {
      const convertedMaps = {};

      Object.entries(data.novelCharacterMaps).forEach(
        ([novelId, novelData]) => {
          if (!novelData.chars && !novelData.characters) {
            convertedMaps[novelId] = {
              chars: {},
              chaps: [],
              lastAccess: Date.now()
            };

            Object.entries(novelData).forEach(([name, data], index) => {
              if (name && typeof name === "string") {
                convertedMaps[novelId].chars[index] = {
                  name: name,
                  gender: compressGender(data.gender),
                  confidence: parseFloat(data.confidence) || 0,
                  appearances: parseInt(data.appearances) || 1
                };

                if (Array.isArray(data.evidence) && data.evidence.length > 0) {
                  convertedMaps[novelId].chars[index].evidences =
                    data.evidence.slice(0, 5);
                }
              }
            });
          } else if (novelData.characters && !novelData.chars) {
            convertedMaps[novelId] = {
              chars: {},
              chaps: [],
              lastAccess: Date.now()
            };

            Object.entries(novelData.characters).forEach(
              ([name, data], index) => {
                convertedMaps[novelId].chars[index] = {
                  name: name,
                  gender: compressGender(data.gender),
                  confidence: parseFloat(data.confidence) || 0,
                  appearances: parseInt(data.appearances) || 1
                };

                if (Array.isArray(data.evidence) && data.evidence.length > 0) {
                  convertedMaps[novelId].chars[index].evidences =
                    data.evidence.slice(0, 5);
                }
              }
            );

            if (Array.isArray(novelData.enhancedChapters)) {
              convertedMaps[novelId].chaps = novelData.enhancedChapters
                .map((chapter) => chapter.chapterNumber)
                .filter((num) => typeof num === "number");
            }

            if (novelData.style) {
              convertedMaps[novelId].style = novelData.style;
            }
          } else if (novelData.chars) {
            convertedMaps[novelId] = novelData;

            if (!convertedMaps[novelId].lastAccess) {
              convertedMaps[novelId].lastAccess = Date.now();
            }
          }
        }
      );

      novelCharacterMaps = convertedMaps;

      chrome.storage.local.set({ novelCharacterMaps: convertedMaps });
      console.log("Character data converted to optimized format");
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateNovelData") {
    const novelId = request.novelId;

    if (!novelId) {
      console.warn("No novel ID provided for novel data update");
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Synchronous operation - return false immediately
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

      if (!novelCharacterMaps[novelId].chaps.includes(request.chapterNumber)) {
        novelCharacterMaps[novelId].chaps.push(request.chapterNumber);
      }
    }

    if (request.chars && typeof request.chars === "object") {
      Object.entries(request.chars).forEach(([charId, charData]) => {
        let existingCharId = null;

        for (const [id, character] of Object.entries(
          novelCharacterMaps[novelId].chars
        )) {
          if (character.name === charData.name) {
            existingCharId = id;
            break;
          }
        }

        if (existingCharId !== null) {
          const existingChar =
            novelCharacterMaps[novelId].chars[existingCharId];

          const newAppearances =
            (existingChar.appearances || 0) + (charData.appearances || 1);

          let mergedGender = existingChar.gender;
          let mergedConfidence = existingChar.confidence || 0;
          let mergedEvidences = existingChar.evidences || [];

          const newConfidence = parseFloat(charData.confidence) || 0;
          if (newConfidence > mergedConfidence) {
            mergedGender = charData.gender;
            mergedConfidence = newConfidence;
            mergedEvidences = Array.isArray(charData.evidences)
              ? charData.evidences
              : [];
          } else if (
            newConfidence === mergedConfidence &&
            Array.isArray(charData.evidences)
          ) {
            charData.evidences.forEach((item) => {
              if (
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
            novelCharacterMaps[novelId].chars[nextId].evidences =
              charData.evidences.slice(0, 5);
          }
        }
      });
    }

    storeNovelCharacterMaps(novelCharacterMaps);

    sendResponse({ status: "ok" });
    return false; // Synchronous operation
  } else if (request.action === "getNovelData") {
    const novelId = request.novelId;

    if (!novelId) {
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Synchronous operation - return false immediately
    if (!novelCharacterMaps[novelId]) {
      sendResponse({
        status: "ok",
        characterMap: {},
        enhancedChapters: [],
        isChapterEnhanced: false
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

    if (request.checkChapter && request.chapterNumber) {
      const checkChapterNum = parseInt(request.chapterNumber, 10);
      const isEnhanced =
        Array.isArray(novelCharacterMaps[novelId].chaps) &&
        novelCharacterMaps[novelId].chaps.includes(checkChapterNum);

      response.isChapterEnhanced = isEnhanced;
    }

    Object.entries(novelCharacterMaps[novelId].chars).forEach(
      ([charId, charData]) => {
        const characterName = charData.name;
        response.characterMap[characterName] = {
          gender: expandGender(charData.gender),
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
  } else if (request.action === "getNovelStyle") {
    const novelId = request.novelId;

    if (!novelId) {
      sendResponse({ status: "error", message: "No novel ID provided" });
      return false;
    }

    // Synchronous operation - return false immediately
    const novelData = novelCharacterMaps[novelId] || {};

    const migratedData = migrateToNewFormat(novelData);

    migratedData.lastAccess = Date.now();
    novelCharacterMaps[novelId] = migratedData;

    if (migratedData.style) {
      sendResponse({ status: "ok", style: migratedData.style });
    } else {
      sendResponse({ status: "ok", style: null });
    }

    return false; // Synchronous operation
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

    // Synchronous operation - return false immediately
    if (!novelCharacterMaps[novelId]) {
      novelCharacterMaps[novelId] = {
        chars: {},
        chaps: [],
        style: style,
        lastAccess: Date.now()
      };
    } else {
      const migratedData = migrateToNewFormat(novelCharacterMaps[novelId]);
      migratedData.style = style;
      migratedData.lastAccess = Date.now();
      novelCharacterMaps[novelId] = migratedData;
    }

    storeNovelCharacterMaps(novelCharacterMaps);

    sendResponse({ status: "ok" });
    return false; // Synchronous operation
  }

  return false; // Default for unhandled actions
});
