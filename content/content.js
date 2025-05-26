// content.js
/**
 * Content script for Novel Dialogue Enhancer
 * Orchestrates the enhancement process on web pages
 */
let contentElement = null;
let settings = {
  isExtensionPaused: false,
  preserveNames: true,
  fixPronouns: true
};
let isEnhancing = false;
let pendingEnhancement = false;
let terminateRequested = false;
let contentEnhancerIntegration;
let ollamaClient;
let toaster;
let isCurrentSiteWhitelisted = false;
let elementCache;
let errorHandler;

/**
 * Gets the element cache instance
 * @return {ContentElementCache} - Element cache instance
 */
function getElementCache() {
  if (!elementCache) {
    elementCache = new ContentElementCache();
  }
  return elementCache;
}

/**
 * Finds the content element on the page
 * @return {HTMLElement|null} - Content element or null
 */
function findContentElement() {
  const contentSelectors = Constants.SELECTORS.CONTENT;

  for (const selector of contentSelectors) {
    try {
      const element = getElementCache().getElement(selector);
      if (element) {
        return element;
      }
    } catch (error) {
      console.error(`Error with selector "${selector}":`, error);
    }
  }

  // Find largest text block as fallback
  return findLargestTextBlock();
}

/**
 * Initializes the extension
 */
function init() {
  toaster = new Toaster();
  toaster.createToaster();

  // Initialize enhanced error handling
  errorHandler = new ErrorHandler(toaster);

  checkSitePermissions()
    .then((isWhitelisted) => {
      if (typeof isWhitelisted !== "boolean") {
        const error = new Error("Invalid whitelist result received");
        errorHandler.handleError(error, "initialization");
        isCurrentSiteWhitelisted = false;
      } else {
        isCurrentSiteWhitelisted = isWhitelisted;
      }

      if (!isCurrentSiteWhitelisted) {
        console.log("Site not whitelisted, extension inactive");
        return;
      }

      return loadSettings().then((loadedSettings) => {
        if (!loadedSettings || typeof loadedSettings !== "object") {
          const error = new Error("Failed to load extension settings");
          errorHandler.handleError(error, "initialization", {
            recoveryFunction: () => {
              settings = {
                isExtensionPaused: false,
                preserveNames: true,
                fixPronouns: true
              };
            }
          });
        }

        setTimeout(async () => {
          if (!settings.isExtensionPaused) {
            try {
              const isAvailable = await checkOllamaStatus();
              if (isAvailable) {
                const enhanceResult = await enhancePage();
                if (enhanceResult) {
                  console.log(
                    "Initial page enhancement completed successfully"
                  );
                }
              }
            } catch (error) {
              errorHandler.handleError(error, "initialization");
            }
          }
        }, 800);
      });
    })
    .catch((error) => {
      errorHandler.handleError(error, "initialization");
    });
}

/**
 * Load extension settings from storage
 * @return {Promise} - Promise resolving with loaded settings
 */
function loadSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      ["isExtensionPaused", "preserveNames", "fixPronouns"],
      (data) => {
        if (chrome.runtime.lastError) {
          const settingsError = new Error(
            `Settings load failed: ${chrome.runtime.lastError.message}`
          );
          errorHandler.handleError(settingsError, "settings_load", {
            recoveryFunction: () => {
              const defaultSettings = {
                isExtensionPaused: false,
                preserveNames: true,
                fixPronouns: true
              };
              settings = defaultSettings;
              resolve(defaultSettings);
            }
          });
          return;
        }

        if (!data || typeof data !== "object") {
          const validationError = new Error(
            "Invalid settings data format received"
          );
          errorHandler.handleError(validationError, "settings_validation", {
            recoveryFunction: () => {
              const defaultSettings = {
                isExtensionPaused: false,
                preserveNames: true,
                fixPronouns: true
              };
              settings = defaultSettings;
              resolve(defaultSettings);
            }
          });
          return;
        }

        const loadedSettings = {
          isExtensionPaused: validateBooleanSetting(
            data.isExtensionPaused,
            false
          ),
          preserveNames: validateBooleanSetting(data.preserveNames, true),
          fixPronouns: validateBooleanSetting(data.fixPronouns, true)
        };

        settings = loadedSettings;
        console.log("Settings loaded successfully:", loadedSettings);
        resolve(loadedSettings);
      }
    );
  });
}

function validateBooleanSetting(value, defaultValue) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  console.warn(
    `Invalid boolean setting: ${value}, using default: ${defaultValue}`
  );
  return defaultValue;
}

/**
 * Check site permissions with a timeout
 * @return {Promise<boolean>} - Whether the site is whitelisted
 */
function checkSitePermissions() {
  return new Promise((resolve) => {
    const permissionTimeout = setTimeout(() => {
      const timeoutError = new Error("Whitelist check timed out");
      errorHandler.handleError(timeoutError, "permission_timeout", {
        recoveryFunction: () => resolve(false)
      });
    }, 8000);

    try {
      chrome.runtime.sendMessage(
        { action: "checkSitePermission", url: window.location.href },
        (response) => {
          clearTimeout(permissionTimeout);

          if (chrome.runtime.lastError) {
            const permissionError = new Error(
              `Permission check failed: ${chrome.runtime.lastError.message}`
            );
            errorHandler.handleError(permissionError, "permission_check", {
              recoveryFunction: () => resolve(false)
            });
            return;
          }

          if (!response || typeof response !== "object") {
            const responseError = new Error(
              "Invalid response from site permission check"
            );
            errorHandler.handleError(responseError, "permission_response", {
              recoveryFunction: () => resolve(false)
            });
            return;
          }

          const hasPermission = Boolean(response.hasPermission);
          console.log(`Site permission check result: ${hasPermission}`);
          resolve(hasPermission);
        }
      );
    } catch (error) {
      clearTimeout(permissionTimeout);
      errorHandler.handleError(error, "permission_check_exception", {
        recoveryFunction: () => resolve(false)
      });
    }
  });
}

/**
 * Get Ollama client instance
 * @return {OllamaClient} - Ollama client instance
 */
function getOllamaClient() {
  if (!ollamaClient) {
    ollamaClient = new OllamaClient();
  }
  return ollamaClient;
}

/**
 * Checks the availability of Ollama with timeout
 * @return {Promise<boolean>}
 */
async function checkOllamaStatus() {
  console.debug("Checking Ollama status...");

  try {
    const status = await getOllamaClient().checkOllamaAvailability();

    if (status && status.available) {
      console.log(`Ollama is running (v${status.version})`);
      toaster.showSuccess(`Ollama is running (v${status.version})`);
      return true;
    } else {
      const ollamaError = new Error(
        status?.reason || "Ollama service unavailable"
      );
      errorHandler.handleError(ollamaError, "ollama_check", {
        retryFunction: () => checkOllamaStatus(),
        maxRetries: 3,
        retryDelay: 2000
      });
      return false;
    }
  } catch (error) {
    errorHandler.handleNetworkError(error, {
      service: "Ollama",
      endpoint: "availability check"
    });
    return false;
  }
}

/**
 * Finds the largest text block on the page as a fallback
 * @return {HTMLElement|null} - Largest text block or null
 */
function findLargestTextBlock() {
  let largestTextBlock = null;
  let maxTextLength = 0;

  try {
    const paragraphContainers = document.querySelectorAll(
      "div, article, section"
    );

    paragraphContainers.forEach((container) => {
      const paragraphs = container.querySelectorAll("p");
      if (paragraphs.length >= 5) {
        let totalText = "";
        paragraphs.forEach((p) => {
          totalText += p.textContent;
        });

        if (totalText.length > maxTextLength) {
          maxTextLength = totalText.length;
          largestTextBlock = container;
        }
      }
    });
  } catch (error) {
    console.error("Error finding content element:", error);
  }

  return largestTextBlock;
}

/**
 * Main function to enhance the page content using LLM
 * @return {boolean} - Whether enhancement was successful
 */
async function enhancePage() {
  console.log("Novel Dialogue Enhancer: Starting enhancement process");
  console.time("enhancePage");

  if (isEnhancing) {
    pendingEnhancement = true;
    console.log("Enhancement already in progress, queuing request");
    toaster.showInfo("Enhancement already in progress, queued for later");
    return false;
  }

  if (!contentEnhancerIntegration) {
    contentEnhancerIntegration = new ContentEnhancerIntegration();
  }

  isEnhancing = true;
  terminateRequested = false;
  let enhancementSuccessful = false;

  toaster.showLoading("Starting enhancement process...");

  if (typeof observer !== "undefined" && observer) {
    observer.disconnect();
  }

  contentElement = findContentElement();

  if (!contentElement) {
    const contentError = new Error(
      "Couldn't find content element for enhancement"
    );
    errorHandler.handleError(contentError, "content_detection");
    toaster.showError("Couldn't find content to enhance");
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

    toaster.showLoading("Analyzing characters...");
    const contextResult =
      await contentEnhancerIntegration.setupCharacterContext();

    if (!contextResult || typeof contextResult !== "object") {
      console.warn("Invalid character context result:", contextResult);
    } else {
      console.log(
        `Character context established: ${
          Object.keys(contextResult).length
        } characters`
      );
    }

    const paragraphs = contentElement.querySelectorAll("p");

    if (paragraphs.length === 0) {
      enhancementSuccessful = await processSingleContentBlock();
    } else {
      enhancementSuccessful = await processMultipleParagraphs(paragraphs);
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
      console.warn(
        "Novel Dialogue Enhancer: Enhancement completed with issues"
      );
      toaster.showWarning("Enhancement completed with some issues");
    }

    return enhancementSuccessful;
  } catch (error) {
    errorHandler.handleEnhancementError(error, {
      enhancementId: `enh_${Date.now()}`,
      currentChunk: 0,
      totalChunks: 0
    });
    return false;
  } finally {
    if (typeof observer !== "undefined" && observer) {
      setTimeout(
        () =>
          observer.observe(contentElement, { childList: true, subtree: true }),
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

/**
 * Processes a single content block for enhancement
 */
async function processSingleContentBlock() {
  const originalText = contentElement.textContent;

  if (terminateRequested) {
    console.log("Enhancement terminated by user before processing");
    toaster.showWarning("Enhancement terminated by user");
    return false;
  }

  console.log("Processing full content as a single block");
  toaster.updateProgress(0, 1);
  toaster.showLoading("Processing content...");

  try {
    const enhancedText = await contentEnhancerIntegration.enhanceText(
      originalText
    );

    if (!enhancedText || typeof enhancedText !== "string") {
      console.warn("Invalid enhanced text received:", typeof enhancedText);
      throw new Error("Invalid enhanced text format");
    }

    if (enhancedText.trim() === "") {
      console.warn("Empty enhanced text received");
      throw new Error("Enhancement produced empty result");
    }

    if (terminateRequested) {
      console.log("Enhancement terminated by user after processing");
      toaster.showWarning("Enhancement terminated by user");
      return false;
    }

    // Apply the enhancement with verification
    contentElement.innerHTML = window.DOMPurify.sanitize(enhancedText);

    // Verify the update was successful
    const updateVerified = verifyAndHandleDOMUpdate(
      contentElement,
      originalText,
      enhancedText
    );

    if (!updateVerified) {
      throw new Error("Text update verification failed");
    }

    console.log(
      `Content updated and verified with ${enhancedText.length} characters`
    );
    toaster.updateProgress(1, 1);

    // Report paragraph statistics
    const paragraphCount = (enhancedText.match(/\n\n/g) || []).length + 1;
    const stats = contentEnhancerIntegration.statsUtils.getStats();

    chrome.runtime.sendMessage({
      action: "updateParagraphStats",
      paragraphCount: paragraphCount,
      processingTime: stats.processingTime || 0
    });

    return true;
  } catch (error) {
    console.error("Failed to enhance content block:", error);
    throw error;
  }
}

/**
 * Processes multiple paragraphs for enhancement by breaking them into batches
 * @param {NodeList} paragraphs - The paragraphs to process
 */
async function processMultipleParagraphs(paragraphs) {
  const totalParagraphs = paragraphs.length;
  const idealChunkSize = Math.max(5, Math.ceil(totalParagraphs / 3));
  const chunkSize = Math.min(idealChunkSize, 15);

  console.log(
    `Processing ${totalParagraphs} paragraphs in chunks of ${chunkSize}`
  );

  // Show a persistent message at the start that won't auto-disappear
  toaster.showLoading(`Preparing to process ${totalParagraphs} paragraphs...`);

  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    if (terminateRequested) {
      console.log(
        `Enhancement terminated by user at batch ${i}/${paragraphs.length}`
      );
      toaster.showWarning("Enhancement terminated by user");
      break;
    }

    await processParagraphBatch(paragraphs, i, chunkSize, totalParagraphs);

    if (i + chunkSize < paragraphs.length && !terminateRequested) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Processes a batch of paragraphs for enhancement
 * @param {NodeList} paragraphs - The paragraphs to process
 * @param {number} startIndex - The starting index of the batch
 * @param {number} chunkSize - The size of the batch
 * @param {number} totalParagraphs - The total number of paragraphs
 */
async function processParagraphBatch(
  paragraphs,
  startIndex,
  chunkSize,
  totalParagraphs
) {
  console.log(
    `Enhancement progress: ${startIndex}/${paragraphs.length} paragraphs`
  );

  toaster.updateProgress(startIndex, totalParagraphs);
  toaster.showLoading(
    `Processing paragraphs ${startIndex + 1}-${Math.min(
      startIndex + chunkSize,
      paragraphs.length
    )}...`
  );

  const batch = Array.from(paragraphs).slice(
    startIndex,
    startIndex + chunkSize
  );
  const batchText = batch.map((p) => p.textContent).join("\n\n");
  const originalTexts = batch.map((p) => p.textContent); // Store original texts

  try {
    console.log(
      `Processing batch ${startIndex}-${startIndex + batch.length - 1} (${
        batchText.length
      } chars)`
    );

    const batchStartTime = performance.now();
    const enhancedText = await contentEnhancerIntegration.enhanceText(
      batchText
    );
    const batchEndTime = performance.now();
    const batchProcessingTime = batchEndTime - batchStartTime;

    if (terminateRequested) {
      console.log(
        `Enhancement terminated by user during batch ${startIndex}-${
          startIndex + batch.length - 1
        }`
      );
      toaster.showWarning("Enhancement terminated by user");
      return false;
    }

    const enhancedParagraphs = enhancedText.split("\n\n");
    let successfulUpdates = 0;

    // Apply enhancements with verification
    for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
      try {
        batch[j].innerHTML = window.DOMPurify.sanitize(enhancedParagraphs[j]);

        // Verify each paragraph update
        const updateVerified = verifyAndHandleDOMUpdate(
          batch[j],
          originalTexts[j],
          enhancedParagraphs[j]
        );

        if (updateVerified) {
          successfulUpdates++;
        } else {
          console.warn(
            `Failed to verify update for paragraph ${startIndex + j}`
          );
        }
      } catch (updateError) {
        console.error(
          `Failed to update paragraph ${startIndex + j}:`,
          updateError
        );
        // Try to restore original text
        try {
          batch[j].innerHTML = window.DOMPurify.sanitize(originalTexts[j]);
        } catch (restoreError) {
          console.error(
            `Failed to restore paragraph ${startIndex + j}:`,
            restoreError
          );
        }
      }
    }

    console.log(
      `Batch ${startIndex}-${
        startIndex + batch.length - 1
      }: ${successfulUpdates}/${batch.length} paragraphs updated successfully`
    );

    toaster.updateProgress(
      Math.min(startIndex + batch.length, totalParagraphs),
      totalParagraphs
    );

    // Report paragraph statistics for this batch with actual processing time
    chrome.runtime.sendMessage({
      action: "updateParagraphStats",
      paragraphCount: successfulUpdates, // Report actual successful updates
      processingTime: batchProcessingTime
    });

    // Return true if at least some paragraphs were updated successfully
    return successfulUpdates > 0;
  } catch (error) {
    console.error(
      `Enhancement failed for batch ${startIndex}-${startIndex + chunkSize}:`,
      error
    );
    toaster.showMessage(
      `Batch ${startIndex}-${
        startIndex + batch.length
      } failed. Skipping this batch and continuing...`,
      "warn",
      4000
    );
    return false;
  }
}

/**
 * Handles termination requests from the background script
 */
function handleTerminationRequest() {
  try {
    if (isEnhancing) {
      console.log("Termination requested while enhancement in progress");
      terminateRequested = true;

      toaster.showMessage("Terminating enhancement...", "warn", 2000);

      chrome.runtime.sendMessage(
        {
          action: "terminateAllRequests"
        },
        (response) => {
          if (chrome.runtime.lastError) {
            const terminationError = new Error(
              `Termination failed: ${chrome.runtime.lastError.message}`
            );
            errorHandler.handleError(terminationError, "termination");
          }
        }
      );

      setTimeout(() => {
        if (isEnhancing) {
          console.warn(
            "Enhancement process didn't terminate properly, forcing reset"
          );

          isEnhancing = false;
          pendingEnhancement = false;
          terminateRequested = false;

          if (window.enhancementTimer) {
            clearTimeout(window.enhancementTimer);
            window.enhancementTimer = null;
          }

          toaster.showError("Enhancement process forced to terminate");

          const forcedTerminationError = new Error(
            "Enhancement process required forced termination"
          );
          errorHandler.handleError(
            forcedTerminationError,
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

/**
 * Verify that text was successfully updated in the DOM
 * @param {HTMLElement} element - Element to verify
 * @param {string} expectedText - Expected text content
 * @return {boolean} - Whether update was successful
 */
function verifyTextUpdate(element, expectedText) {
  if (!element || !expectedText) {
    console.warn("Invalid parameters for text verification");
    return false;
  }

  try {
    const actualText = element.textContent || element.innerText || "";
    const expectedTextClean = expectedText.replace(/<[^>]*>/g, "").trim();
    const actualTextClean = actualText.trim();

    // Check if the text was meaningfully updated (not just whitespace changes)
    const textWasUpdated =
      actualTextClean.length > 0 &&
      actualTextClean !== expectedTextClean &&
      Math.abs(actualTextClean.length - expectedTextClean.length) > 10;

    if (!textWasUpdated) {
      console.warn("Text update verification failed:", {
        expectedLength: expectedTextClean.length,
        actualLength: actualTextClean.length,
        element: element.tagName
      });
      return false;
    }

    console.log("Text update verified successfully");
    return true;
  } catch (error) {
    console.error("Error during text verification:", error);
    return false;
  }
}

/**
 * Verify DOM update and handle failures
 * @param {HTMLElement} element - Element that was updated
 * @param {string} originalText - Original text before enhancement
 * @param {string} enhancedText - Enhanced text that was applied
 * @return {boolean} - Whether verification passed
 */
function verifyAndHandleDOMUpdate(element, originalText, enhancedText) {
  const updateSuccessful = verifyTextUpdate(element, enhancedText);

  if (!updateSuccessful) {
    console.warn("DOM update verification failed, attempting recovery");

    // Try to restore original text if enhancement failed
    try {
      element.innerHTML = window.DOMPurify.sanitize(originalText);
      console.log("Restored original text after failed enhancement");
      return false;
    } catch (restoreError) {
      console.error("Failed to restore original text:", restoreError);
      return false;
    }
  }

  return true;
}

// Message handler for communication with popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (!request || typeof request !== "object" || !request.action) {
      const messageError = new Error("Invalid message format received");
      errorHandler.handleError(messageError, "message_handling");
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
        const permissionError = new Error(
          "Site not whitelisted for enhancement"
        );
        errorHandler.handleError(permissionError, "permission_check");
        sendResponse({
          status: "failed",
          error: "This site is not whitelisted. Please whitelist it first."
        });
        return false;
      }

      if (request.settings && typeof request.settings === "object") {
        try {
          settings = {
            isExtensionPaused: validateBooleanSetting(
              request.settings.isExtensionPaused,
              settings.isExtensionPaused
            ),
            preserveNames: validateBooleanSetting(
              request.settings.preserveNames,
              settings.preserveNames
            ),
            fixPronouns: validateBooleanSetting(
              request.settings.fixPronouns,
              settings.fixPronouns
            )
          };
        } catch (settingsError) {
          errorHandler.handleError(settingsError, "settings_update");
        }
      }

      enhancePage()
        .then((result) => {
          if (result) {
            const stats =
              contentEnhancerIntegration?.statsUtils?.getStats() || {};
            sendResponse({ status: "enhanced", stats: stats });
          } else {
            sendResponse({
              status: "failed",
              error: "Enhancement process completed but returned false"
            });
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
            console.warn(
              "Failed to send error response, port may be closed:",
              responseError
            );
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

      if (request.disabled) {
        handleTerminationRequest();
      }

      sendResponse({ status: "updated" });
      return false;
    }

    if (request.action === "getErrorStats") {
      const errorStats = errorHandler ? errorHandler.getErrorStats() : {};
      sendResponse({ status: "ok", errorStats: errorStats });
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

// Create a MutationObserver to detect page changes
const observer = new MutationObserver((mutations) => {
  if (
    isCurrentSiteWhitelisted &&
    !settings.isExtensionPaused &&
    !isEnhancing &&
    !terminateRequested
  ) {
    let newContentAdded = false;

    // Use mutations parameter with validation
    if (!Array.isArray(mutations) || mutations.length === 0) {
      console.warn("Invalid mutations received in observer:", mutations);
      return;
    }

    mutations.forEach((mutation) => {
      // Use mutation parameter with validation
      if (!mutation || typeof mutation !== "object") {
        console.warn("Invalid mutation object:", mutation);
        return;
      }

      if (
        mutation.type === "childList" &&
        mutation.addedNodes &&
        mutation.addedNodes.length > 0
      ) {
        let hasRealContent = false;

        // Convert NodeList to Array and use addedNodes
        const addedNodesArray = Array.from(mutation.addedNodes);
        addedNodesArray.forEach((node) => {
          if (node && node.nodeType === Node.ELEMENT_NODE) {
            hasRealContent = true;
            console.log(`New content detected: ${node.tagName || "unknown"}`);
          }
        });

        if (hasRealContent) {
          newContentAdded = true;
        }
      }
    });

    if (newContentAdded) {
      console.log("New content detected, scheduling enhancement");
      clearTimeout(window.enhancementTimer);
      window.enhancementTimer = setTimeout(enhancePage, 500);
    }
  }
});

// Start safely with DOMPurify loaded
init();

// Set up observer after a short delay
setTimeout(() => {
  // Only set up observer if the site is whitelisted
  if (isCurrentSiteWhitelisted) {
    const contentElement = findContentElement();
    if (contentElement) {
      observer.observe(contentElement, { childList: true, subtree: true });
    }
  }
}, 1000);
