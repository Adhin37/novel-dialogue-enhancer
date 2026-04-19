import { logger } from "../shared/utils/logger.js";
import { ExtensionConfig } from "../shared/utils/extension-config.js";
import { Toaster } from "../shared/ui/toaster.js";
import { ErrorHandler } from "./error-handler.js";
import { OllamaClient } from "../shared/llm/ollama-client.js";
import { ContentEnhancer } from "../shared/content/enhancer.js";
import { findContentElement, clearDetectorCache } from "./content-detector.js";
import { loadSettings, validateBooleanSetting, checkSitePermissions } from "./page-settings.js";
import { processSingleContentBlock, processMultipleParagraphs } from "./enhancement-runner.js";

// content.js — orchestrator: state management, init, enhancement flow, messaging, observer

let contentElement = null;
let settings = { ...ExtensionConfig.DEFAULTS };
let isEnhancing = false;
let pendingEnhancement = false;
let terminateRequested = false;
let contentEnhancerIntegration;
let ollamaClient;
let toaster;
let isCurrentSiteWhitelisted = false;
let errorHandler;

function getOllamaClient() {
  if (!ollamaClient) ollamaClient = new OllamaClient();
  return ollamaClient;
}

// ---------------------------------------------------------------------------
// Ollama status check
// ---------------------------------------------------------------------------

async function checkOllamaStatus() {
  logger.debug("Checking Ollama status...");

  try {
    const status = await getOllamaClient().checkOllamaAvailability();

    if (!status || typeof status !== "object") {
      const error = new Error("Invalid Ollama status response received");
      logger.error("Invalid Ollama status response", { response: status, type: typeof status });
      errorHandler.handleError(error, "ollama_check", {
        retryFunction: () => checkOllamaStatus(),
        maxRetries: 2,
        retryDelay: 3000
      });
      logger.userError("Unable to connect to AI service");
      return false;
    }

    if (status.available) {
      const version = status.version || "unknown";
      const modelCount = status.models ? status.models.length : 0;
      logger.success(`Ollama is running (v${version})`, {
        version,
        modelCount,
        models: status.models || []
      });

      if (modelCount > 0) {
        logger.userSuccess(`AI service ready (${modelCount} models available)`);
      } else {
        logger.userSuccess(`AI service connected (v${version})`);
        logger.warn("No models detected in Ollama", status);
      }
      return true;
    }

    const reason = status.reason || "Unknown reason";
    logger.warn("Ollama not available", { reason, fullStatus: status });
    const ollamaError = new Error(`Ollama service unavailable: ${reason}`);

    const retryableReasons = ["connection refused", "network error", "timeout", "temporarily unavailable"];
    if (retryableReasons.some((r) => reason.toLowerCase().includes(r))) {
      errorHandler.handleError(ollamaError, "ollama_check", {
        retryFunction: () => checkOllamaStatus(),
        maxRetries: 3,
        retryDelay: 2000
      });
      logger.userWarning("AI service temporarily unavailable, retrying...");
    } else {
      errorHandler.handleError(ollamaError, "ollama_check");
      if (reason.includes("connection") || reason.includes("refused")) {
        logger.userError("AI service not running. Please start Ollama and try again.");
      } else if (reason.includes("model") || reason.includes("models")) {
        logger.userError("No AI models found. Please install a model using Ollama.");
      } else {
        logger.userError("AI service unavailable. Check Ollama installation.");
      }
    }
    return false;
  } catch (error) {
    logger.error("Exception during Ollama status check", { error: error.message, name: error.name });

    if (error.name === "TypeError" && error.message.includes("fetch")) {
      errorHandler.handleNetworkError(error, {
        service: "Ollama",
        endpoint: "availability check",
        retryFunction: () => checkOllamaStatus(),
        maxRetries: 2,
        retryDelay: 3000
      });
      logger.userError("Network error connecting to AI service");
    } else if (error.name === "AbortError" || error.message.includes("timeout")) {
      errorHandler.handleError(error, "ollama_timeout", {
        retryFunction: () => checkOllamaStatus(),
        maxRetries: 1,
        retryDelay: 5000
      });
      logger.userWarning("AI service check timed out, retrying...");
    } else {
      errorHandler.handleError(error, "ollama_check");
      logger.userError("Unexpected error checking AI service");
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main enhancement orchestrator
// ---------------------------------------------------------------------------

/**
 * @param {object} [opts]
 * @param {boolean} [opts.silent=false] Suppress toasts and error handler for auto/observer calls.
 */
async function enhancePage({ silent = false } = {}) {
  console.log("Novel Dialogue Enhancer: Starting enhancement process");
  console.time("enhancePage");

  if (isEnhancing) {
    pendingEnhancement = true;
    console.log("Enhancement already in progress, queuing request");
    if (!silent) toaster.showInfo("Enhancement already in progress, queued for later");
    return false;
  }

  if (!contentEnhancerIntegration) {
    contentEnhancerIntegration = new ContentEnhancer();
  }

  isEnhancing = true;
  terminateRequested = false;
  let enhancementSuccessful = false;

  if (typeof observer !== "undefined" && observer) {
    observer.disconnect();
  }

  contentElement = findContentElement();

  if (!contentElement) {
    if (silent) {
      console.log("Auto-enhancement: content element not ready yet, waiting for observer retry");
    } else {
      const contentError = new Error("Couldn't find content element for enhancement");
      errorHandler.handleError(contentError, "content_detection");
      toaster.showError("Couldn't find content to enhance");
    }
    isEnhancing = false;
    console.timeEnd("enhancePage");
    return false;
  }

  try {
    const ollamaStatus = await getOllamaClient().checkOllamaAvailability();

    if (!ollamaStatus || typeof ollamaStatus !== "object") {
      throw new Error("Invalid Ollama status response");
    }

    if (!ollamaStatus.available) {
      throw new Error(`Ollama not available: ${ollamaStatus.reason}`);
    }

    const availableModels = ollamaStatus.models;
    const llmSettings = await getOllamaClient().getLLMSettings();
    const configuredModel = llmSettings.modelName;
    if (!Array.isArray(availableModels) || !availableModels.includes(configuredModel)) {
      const msg = !Array.isArray(availableModels) || availableModels.length === 0
        ? "No models installed in Ollama. Install one with: ollama pull <model-name>"
        : `Model "${configuredModel}" is not installed. Install it with: ollama pull ${configuredModel}`;
      console.warn(`[model-guard] ${msg}`);
      toaster.showWarning(msg);
      return false;
    }

    // Model confirmed — begin processing.
    toaster.showLoading("Analyzing characters...");
    const contextResult = await contentEnhancerIntegration.setupCharacterContext();

    if (!contextResult || typeof contextResult !== "object") {
      console.warn("Invalid character context result:", contextResult);
    } else {
      console.log(`Character context established: ${Object.keys(contextResult).length} characters`);
    }

    const runnerCtx = {
      contentElement,
      isTerminated: () => terminateRequested,
      toaster,
      contentEnhancerIntegration
    };

    const paragraphs = contentElement.querySelectorAll("p");
    if (paragraphs.length === 0) {
      enhancementSuccessful = await processSingleContentBlock(runnerCtx);
    } else {
      enhancementSuccessful = await processMultipleParagraphs(runnerCtx, paragraphs);
    }

    if (enhancementSuccessful) {
      const finalStats = contentEnhancerIntegration.statsUtils.getStats();
      chrome.runtime.sendMessage({
        action: "updateFinalEnhancementStats",
        stats: finalStats,
        enhancementSession: true
      });
      const stats = contentEnhancerIntegration.statsUtils.getStats();
      console.log("Novel Dialogue Enhancer: Enhancement complete", stats);
      toaster.showSuccess("Enhancement complete!");
    } else {
      console.warn("Novel Dialogue Enhancer: Enhancement completed with issues");
      toaster.showWarning("Enhancement completed with some issues");
    }

    return enhancementSuccessful;
  } catch (error) {
    const isOllamaError =
      error.message.toLowerCase().includes("ollama") ||
      error.message.includes("not available") ||
      error.message.includes("Invalid Ollama");

    if (isOllamaError) {
      const msg = error.message.toLowerCase().includes("model")
        ? "No AI models found. Please install a model using Ollama."
        : "Ollama is unavailable. Please start Ollama and try again.";
      toaster.showError(msg);
    } else if (silent) {
      console.warn("Auto-enhancement failed:", error.message);
    } else {
      errorHandler.handleEnhancementError(error, {
        enhancementId: `enh_${Date.now()}`,
        currentChunk: 0,
        totalChunks: 0
      });
    }
    return false;
  } finally {
    if (typeof observer !== "undefined" && observer) {
      setTimeout(
        () => observer.observe(contentElement, { childList: true, subtree: true }),
        100
      );
    }

    isEnhancing = false;
    console.timeEnd("enhancePage");

    if (pendingEnhancement && !terminateRequested) {
      pendingEnhancement = false;
      setTimeout(enhancePage, 10);
    }
  }
}

// ---------------------------------------------------------------------------
// Termination handler
// ---------------------------------------------------------------------------

function handleTerminationRequest() {
  try {
    if (isEnhancing) {
      console.log("Termination requested while enhancement in progress");
      terminateRequested = true;
      toaster.showMessage("Terminating enhancement...", "warn", 2000);

      chrome.runtime.sendMessage({ action: "terminateAllRequests" }, (response) => {
        if (response) console.log("Termination response:", response);
        if (chrome.runtime.lastError) {
          errorHandler.handleError(
            new Error(`Termination failed: ${chrome.runtime.lastError.message}`),
            "termination"
          );
        }
      });

      setTimeout(() => {
        if (isEnhancing) {
          console.warn("Enhancement process didn't terminate properly, forcing reset");
          isEnhancing = false;
          pendingEnhancement = false;
          terminateRequested = false;
          if (window.enhancementTimer) {
            clearTimeout(window.enhancementTimer);
            window.enhancementTimer = null;
          }
          toaster.showError("Enhancement process forced to terminate");
          errorHandler.handleError(
            new Error("Enhancement process required forced termination"),
            "forced_termination"
          );
        }
      }, 3000);
    } else {
      console.log("Termination requested but no enhancement in progress");
      terminateRequested = false;
      pendingEnhancement = false;
    }
  } catch (error) {
    errorHandler.handleError(error, "termination_handler");
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

function init() {
  logger.debug("Starting Novel Dialogue Enhancer initialization");

  try {
    toaster = new Toaster();
    logger.setToaster(toaster);
    logger.debug("Logger connected to toaster");

    chrome.storage.sync.get("debugMode", (data) => {
      if (chrome.runtime.lastError) {
        logger.warn("Failed to load debug mode setting", chrome.runtime.lastError);
      } else {
        const debugMode = data.debugMode || false;
        logger.setDebugMode(debugMode);
        logger.debug(`Debug mode set to: ${debugMode}`);
      }
    });

    errorHandler = new ErrorHandler(toaster);
    logger.debug("Error handler initialized");

    checkSitePermissions(errorHandler)
      .then((isWhitelisted) => {
        logger.debug("Site permission check completed", { isWhitelisted, url: window.location.href });

        if (typeof isWhitelisted !== "boolean") {
          logger.error("Site permission check returned invalid result", {
            result: isWhitelisted,
            type: typeof isWhitelisted
          });
          errorHandler.handleError(new Error("Invalid whitelist result received"), "initialization", {
            recoveryFunction: () => { isCurrentSiteWhitelisted = false; }
          });
          isCurrentSiteWhitelisted = false;
        } else {
          isCurrentSiteWhitelisted = isWhitelisted;
        }

        if (!isCurrentSiteWhitelisted) {
          logger.debug("Site not whitelisted, extension will remain inactive", {
            hostname: window.location.hostname
          });
          logger.success("Extension loaded but inactive (site not whitelisted)");
          return Promise.resolve();
        }

        logger.info("Site is whitelisted, proceeding with full initialization", {
          hostname: window.location.hostname
        });

        return loadSettings(errorHandler)
          .then((loadedSettings) => {
            logger.debug("Settings loaded, checking validity", loadedSettings);

            if (!loadedSettings || typeof loadedSettings !== "object") {
              logger.error("Invalid settings object received", { settings: loadedSettings });
              errorHandler.handleError(
                new Error("Failed to load extension settings"),
                "initialization",
                {
                  recoveryFunction: () => {
                    settings = { ...ExtensionConfig.DEFAULTS };
                  }
                }
              );
              return Promise.resolve();
            }

            settings = loadedSettings;
            logger.success("Extension settings loaded successfully", {
              isPaused: settings.isExtensionPaused,
              preserveNames: settings.preserveNames,
              fixPronouns: settings.fixPronouns
            });

            if (!settings.isExtensionPaused) {
              logger.debug("Extension not paused, scheduling auto-enhancement check");

              setTimeout(async () => {
                logger.debug("Starting auto-enhancement check");
                try {
                  const el = findContentElement();
                  if (!el) {
                    logger.debug("No suitable content found for auto-enhancement");
                    return;
                  }

                  const contentLength = el.textContent?.length || 0;
                  logger.debug("Content found for potential enhancement", {
                    contentLength,
                    elementTag: el.tagName,
                    hasText: contentLength > 0
                  });

                  if (contentLength < 500) {
                    logger.debug("Content too short for auto-enhancement", {
                      contentLength,
                      minimumRequired: 500
                    });
                    return;
                  }

                  logger.debug("Checking AI service availability for auto-enhancement");
                  const isAvailable = await checkOllamaStatus();

                  if (isAvailable) {
                    logger.info("AI service available, starting auto-enhancement");
                    const enhanceResult = await enhancePage({ silent: true });
                    if (enhanceResult) {
                      logger.success("Auto-enhancement completed successfully");
                    } else {
                      logger.warn("Auto-enhancement completed but returned false result");
                    }
                  } else {
                    logger.debug("AI service not available, skipping auto-enhancement");
                  }
                } catch (error) {
                  logger.error("Auto-enhancement failed during initialization", {
                    error: error.message,
                    stack: error.stack
                  });
                  errorHandler.handleError(error, "initialization", { attemptRecovery: false });
                }
              }, 800);
            } else {
              logger.debug("Extension is paused, skipping auto-enhancement");
              logger.info("Extension loaded successfully (paused mode)");
            }

            return Promise.resolve();
          })
          .catch((settingsError) => {
            logger.error("Critical error during settings loading", {
              error: settingsError.message,
              stack: settingsError.stack
            });
            errorHandler.handleError(settingsError, "initialization", {
              recoveryFunction: () => {
                settings = { ...ExtensionConfig.DEFAULTS };
              }
            });
            return Promise.resolve();
          });
      })
      .catch((permissionError) => {
        logger.error("Critical error during site permission check", {
          error: permissionError.message,
          stack: permissionError.stack,
          url: window.location.href
        });
        errorHandler.handleError(permissionError, "initialization", {
          recoveryFunction: () => { isCurrentSiteWhitelisted = false; }
        });
        logger.warn("Extension initialized with limited functionality due to permission check failure");
      })
      .finally(() => {
        const initEndTime = performance.now();
        logger.timing("Extension initialization", initEndTime - (window.initStartTime || initEndTime));
        logger.success("Extension initialization completed", {
          siteWhitelisted: isCurrentSiteWhitelisted,
          isPaused: settings.isExtensionPaused || false,
          timestamp: new Date().toISOString()
        });
      });
  } catch (criticalError) {
    logger.error("Critical synchronous error during initialization", {
      error: criticalError.message,
      stack: criticalError.stack
    });
    try {
      if (toaster) {
        toaster.showError("Extension failed to initialize properly");
      } else {
        console.error("Novel Dialogue Enhancer: Critical initialization failure", criticalError);
      }
    } catch (displayError) {
      console.error("Novel Dialogue Enhancer: Failed to display error message", displayError);
    }
    isCurrentSiteWhitelisted = false;
    settings = { ...ExtensionConfig.DEFAULTS, isExtensionPaused: true };
  }
}

// ---------------------------------------------------------------------------
// Chrome message handler
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  try {
    if (!request || typeof request !== "object" || !request.action) {
      errorHandler.handleError(new Error("Invalid message format received"), "message_handling");
      sendResponse({ status: "error", error: "Invalid message format" });
      return false;
    }

    if (request.action === "ping") {
      sendResponse({ status: "active", whitelisted: isCurrentSiteWhitelisted });
      return false;
    }

    if (request.action === "checkCurrentSiteWhitelist") {
      isCurrentSiteWhitelisted = request.isWhitelisted;
      console.log(`Site whitelist status updated: ${isCurrentSiteWhitelisted}`);
      sendResponse({ status: "updated" });
      return false;
    }

    if (request.action === "enhanceNow") {
      if (!isCurrentSiteWhitelisted) {
        errorHandler.handleError(new Error("Site not whitelisted for enhancement"), "permission_check");
        sendResponse({ status: "failed", error: "This site is not whitelisted. Please whitelist it first." });
        return false;
      }

      if (request.settings && typeof request.settings === "object") {
        try {
          settings = {
            isExtensionPaused: validateBooleanSetting(
              request.settings.isExtensionPaused,
              settings.isExtensionPaused
            ),
            preserveNames: validateBooleanSetting(request.settings.preserveNames, settings.preserveNames),
            fixPronouns: validateBooleanSetting(request.settings.fixPronouns, settings.fixPronouns)
          };
        } catch (settingsError) {
          errorHandler.handleError(settingsError, "settings_update");
        }
      }

      enhancePage()
        .then((result) => {
          if (result) {
            const stats = contentEnhancerIntegration?.statsUtils?.getStats() || {};
            sendResponse({ status: "enhanced", stats });
          } else {
            sendResponse({ status: "failed", error: "Enhancement process completed but returned false" });
          }
        })
        .catch((error) => {
          errorHandler.handleEnhancementError(error, {
            enhancementId: `msg_${Date.now()}`,
            currentChunk: 0,
            totalChunks: 0
          });
          try {
            sendResponse({ status: "failed", error: error.message });
          } catch (responseError) {
            console.warn("Failed to send error response, port may be closed:", responseError);
          }
        });

      return true;
    }

    if (request.action === "terminateOperations") {
      console.log("Termination request received from popup");
      handleTerminationRequest();
      sendResponse({ status: "terminating" });
      return false;
    }

    if (request.action === "updatePageStatus") {
      console.log(`Page status updated: disabled=${Boolean(request.disabled)}`);
      isCurrentSiteWhitelisted = !request.disabled;
      if (request.disabled) handleTerminationRequest();
      sendResponse({ status: "updated" });
      return false;
    }

    if (request.action === "getErrorStats") {
      const errorStats = errorHandler ? errorHandler.getErrorStats() : {};
      sendResponse({ status: "ok", errorStats });
      return false;
    }

    sendResponse({ status: "error", error: "Unknown action" });
    return false;
  } catch (handlerError) {
    if (errorHandler) {
      errorHandler.handleError(handlerError, "message_handler");
    } else {
      console.error("Critical error in message handler:", handlerError);
    }
    try {
      sendResponse({ status: "error", error: "Internal handler error" });
    } catch (responseError) {
      console.error("Failed to send error response:", responseError);
    }
    return false;
  }
});

// ---------------------------------------------------------------------------
// MutationObserver — detects SPA content changes and triggers re-enhancement
// ---------------------------------------------------------------------------

const observer = new MutationObserver((mutations) => {
  if (
    isCurrentSiteWhitelisted &&
    !settings.isExtensionPaused &&
    !isEnhancing &&
    !terminateRequested
  ) {
    if (!Array.isArray(mutations) || mutations.length === 0) {
      console.warn("Invalid mutations received in observer:", mutations);
      return;
    }

    let newContentAdded = false;
    mutations.forEach((mutation) => {
      if (!mutation || typeof mutation !== "object") return;
      if (
        mutation.type === "childList" &&
        mutation.addedNodes?.length > 0 &&
        Array.from(mutation.addedNodes).some((n) => n?.nodeType === Node.ELEMENT_NODE)
      ) {
        newContentAdded = true;
      }
    });

    // Also trigger when content appears after a removal-only SPA batch.
    clearDetectorCache();
    const contentNowReady = !newContentAdded &&
      (findContentElement()?.textContent?.length ?? 0) >= 500;

    if (newContentAdded || contentNowReady) {
      console.log("New content detected, scheduling enhancement");
      clearTimeout(window.enhancementTimer);
      window.enhancementTimer = setTimeout(() => enhancePage({ silent: true }), 500);
    }
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

init();

setTimeout(() => {
  if (isCurrentSiteWhitelisted) {
    // Always observe document.body so SPA navigation that replaces the content
    // container element is detected (observing the old element misses replacements).
    observer.observe(document.body, { childList: true, subtree: true });
  }
}, 1000);
