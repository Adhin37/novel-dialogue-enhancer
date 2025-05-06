// background.js
let globalCharacterMap = {};
let activeRequestControllers = new Map();
const DEFAULT_OLLAMA_URL = "http://localhost:11434";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateCharacterMap") {
    globalCharacterMap = { ...globalCharacterMap, ...request.characters };

    chrome.storage.sync.set({ characterMap: globalCharacterMap });

    sendResponse({ status: "ok" });
    return false; // No async response needed
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
    return false; // No async response needed
  } else if (request.action === "checkOllamaAvailability") {
    const ollamaUrl = request.data?.ollamaUrl;

    if (ollamaUrl) {
      checkOllamaAvailability(ollamaUrl, sendResponse);
    } else {
      chrome.storage.sync.get(
        { ollamaUrl: DEFAULT_OLLAMA_URL },
        function (data) {
          checkOllamaAvailability(data.ollamaUrl, sendResponse);
        }
      );
    }
    return true; // We'll send a response asynchronously
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

function handleOllamaRequest(request, sendResponse) {
  chrome.storage.sync.get(
    {
      timeout: 180,
      ollamaUrl: DEFAULT_OLLAMA_URL
    },
    function (data) {
      const OLLAMA_REQUEST_TIMEOUT = data.timeout * 1000;
      const OLLAMA_BASE_URL = data.ollamaUrl;

      console.log("Sending Ollama request:", {
        model: request.data.model,
        promptLength: request.data.prompt.length,
        max_tokens: request.data.max_tokens,
        stream: request.data.stream || false,
        timeout: OLLAMA_REQUEST_TIMEOUT / 1000 + " seconds",
        ollamaUrl: OLLAMA_BASE_URL,
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
        fetch(OLLAMA_BASE_URL + "/api/generate", {
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
                const lines = rawText
                  .split("\n")
                  .filter((line) => line.trim());
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
                enhancedText =
                  data.response || data.choices?.[0]?.text?.trim();
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

function checkOllamaAvailability(ollamaUrl, sendResponse) {
  console.log(`Checking Ollama availability at ${ollamaUrl}/api/version`);
  
  fetch(ollamaUrl + "/api/version", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(10000)
  })
    .then((response) => {
      if (response.ok) {
        return response.json().then((data) => {
          console.log(`Ollama version check successful: ${data.version}`);
          
          fetch(ollamaUrl + "/api/tags", {
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
              console.log(`Ollama is available, version: ${data.version}, but couldn't fetch models: ${modelError.message}`);
              sendResponse({ available: true, version: data.version });
            });
        });
      } else {
        console.warn(`Ollama availability check failed with status: ${response.status}`);
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
      "ollamaUrl",
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
      if (data.ollamaUrl === undefined) defaults.ollamaUrl = DEFAULT_OLLAMA_URL;
      if (data.maxChunkSize === undefined) defaults.maxChunkSize = 4000;
      if (data.timeout === undefined) defaults.timeout = 180;
      if (data.disabledPages === undefined) defaults.disabledPages = [];

      if (Object.keys(defaults).length > 0) {
        chrome.storage.sync.set(defaults);
      }
    }
  );
});