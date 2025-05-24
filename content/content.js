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
let enhancerIntegration;
let toaster;
let isCurrentSiteWhitelisted = false;
const maxRetries = 3;

/**
 * Initializes the extension
 */
function init() {
  enhancerIntegration = new EnhancerIntegration();
  toaster = new Toaster();
  toaster.createToaster();

  checkSitePermissions()
    .then((isWhitelisted) => {
      // Use isWhitelisted parameter
      if (typeof isWhitelisted !== "boolean") {
        console.warn("Invalid whitelist result:", isWhitelisted);
        isCurrentSiteWhitelisted = false;
      } else {
        isCurrentSiteWhitelisted = isWhitelisted;
      }

      if (!isCurrentSiteWhitelisted) {
        console.log("Site not whitelisted, extension inactive");
        return;
      }

      console.log("Site is whitelisted, activating extension features");

      return loadSettings().then((loadedSettings) => {
        // Use loadedSettings parameter
        if (!loadedSettings || typeof loadedSettings !== "object") {
          console.warn("Invalid settings loaded:", loadedSettings);
        } else {
          console.log("Using loaded settings:", loadedSettings);
        }

        setTimeout(async () => {
          if (!settings.isExtensionPaused) {
            console.log("Extension is enabled, checking Ollama availability");
            try {
              const isAvailable = await checkOllamaStatus();
              // Use isAvailable parameter
              if (typeof isAvailable !== "boolean") {
                console.warn("Invalid Ollama status result:", isAvailable);
              } else if (isAvailable) {
                console.log("Ollama is available, starting page enhancement");
                const enhanceResult = await enhancePage();
                // Use enhanceResult parameter
                if (enhanceResult) {
                  console.log(
                    "Initial page enhancement completed successfully"
                  );
                } else {
                  console.log("Initial page enhancement failed");
                }
              } else {
                console.log(
                  "Ollama is not available, page enhancement skipped"
                );
              }
            } catch (error) {
              console.error("Error checking Ollama status:", error);
              toaster.showError(`Ollama check failed: ${error.message}`);
            }
          } else {
            console.log("Extension is paused in settings");
          }
        }, 800);
      });
    })
    .catch((error) => {
      // Use error parameter with validation
      if (!error) {
        console.error("Unknown error during initialization");
        toaster.showError("Unknown error during initialization");
      } else {
        console.error("Error during initialization:", error.message || error);
        toaster.showError(
          `Extension initialization failed: ${error.message || "Unknown error"}`
        );
      }
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
          console.warn("Error loading settings:", chrome.runtime.lastError);
          // Use defaults if settings can't be loaded
          const defaultSettings = {
            isExtensionPaused: false,
            preserveNames: true,
            fixPronouns: true
          };
          settings = defaultSettings;
          reject(chrome.runtime.lastError);
        } else {
          // Validate data parameter
          if (!data || typeof data !== "object") {
            console.warn("Invalid settings data received:", data);
            const defaultSettings = {
              isExtensionPaused: false,
              preserveNames: true,
              fixPronouns: true
            };
            settings = defaultSettings;
            resolve(defaultSettings);
            return;
          }

          const loadedSettings = {
            isExtensionPaused:
              data.isExtensionPaused !== undefined
                ? Boolean(data.isExtensionPaused)
                : false,
            preserveNames:
              data.preserveNames !== undefined
                ? Boolean(data.preserveNames)
                : true,
            fixPronouns:
              data.fixPronouns !== undefined ? Boolean(data.fixPronouns) : true
          };

          settings = loadedSettings;
          console.log("Settings loaded successfully:", loadedSettings);
          resolve(loadedSettings);
        }
      }
    );
  });
}

/**
 * Check site permissions with a timeout
 * @return {Promise<boolean>} - Whether the site is whitelisted
 */
function checkSitePermissions() {
  return new Promise((resolve) => {
    const permissionTimeout = setTimeout(() => {
      console.warn("Whitelist check timed out");
      resolve(false);
    }, 5000);

    chrome.runtime.sendMessage(
      { action: "checkSitePermission", url: window.location.href },
      (response) => {
        clearTimeout(permissionTimeout);

        if (chrome.runtime.lastError) {
          console.warn(
            "Error checking site permission:",
            chrome.runtime.lastError
          );
          resolve(false);
          return;
        }

        // Use response parameter with validation
        if (!response || typeof response !== "object") {
          console.warn(
            "Invalid response from site permission check:",
            response
          );
          resolve(false);
          return;
        }

        const hasPermission = Boolean(response.hasPermission);
        console.log(`Site permission check result: ${hasPermission}`);
        resolve(hasPermission);
      }
    );
  });
}

/**
 * Checks the availability of Ollama with timeout
 * @return {Promise<boolean>}
 */
async function checkOllamaStatus() {
  console.debug("Checking Ollama status...");
  let retries = 0;
  let status = null;

  while (retries < maxRetries) {
    try {
      status = await enhancerIntegration.ollamaClient.checkOllamaAvailability();
      break;
    } catch (err) {
      console.warn(
        `Ollama check failed (attempt ${retries + 1}/${maxRetries}):`,
        err
      );
      retries++;

      if (retries < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retries));
      }
    }
  }

  if (status && status.available) {
    console.log(`Ollama is running (v${status.version})`);
    toaster.showSuccess(`Ollama is running (v${status.version})`);
    return true;
  } else {
    const reason = status
      ? window.DOMPurify.sanitize(status.reason || "Unknown error")
      : "Unknown error";
    console.info(`Ollama is not available: ${reason}`);
    toaster.showError(`Ollama is not available: ${reason}`);

    // If we reached the maximum retries or got a definitive "not available" response
    return false;
  }
}

/**
 * Finds the main content element of the page
 * @return {HTMLElement|null} - The content element or null if not found
 */
function findContentElement() {
  const contentSelectors = [
    ".chapter-content",
    "#chapter-content",
    ".novel_content",
    ".chapter-text",
    ".entry-content",
    ".text-content",
    ".article-content",
    ".content-area",
    "article .content"
  ];

  for (const selector of contentSelectors) {
    try {
      const element = document.querySelector(selector);
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

  isEnhancing = true;
  terminateRequested = false;

  toaster.showLoading("Starting enhancement process...");

  if (typeof observer !== "undefined" && observer) {
    observer.disconnect();
  }

  contentElement = findContentElement();

  if (!contentElement) {
    console.log("Novel Dialogue Enhancer: Couldn't find content element");
    toaster.showError("Couldn't find content to enhance");
    isEnhancing = false;

    if (typeof observer !== "undefined" && observer) {
      setTimeout(
        () =>
          observer.observe(contentElement, { childList: true, subtree: true }),
        100
      );
    }

    console.timeEnd("enhancePage");
    return false;
  }

  try {
    const ollamaStatus =
      await enhancerIntegration.ollamaClient.checkOllamaAvailability();

    // Use ollamaStatus parameter with validation
    if (!ollamaStatus || typeof ollamaStatus !== "object") {
      const errorMsg = "Invalid Ollama status response";
      console.error(errorMsg);
      toaster.showError(errorMsg);
      throw new Error(errorMsg);
    }

    if (!ollamaStatus.available) {
      const safeReason = window.DOMPurify.sanitize(
        ollamaStatus.reason || "Unknown error"
      );
      toaster.showError(`Ollama not available: ${safeReason}`);
      throw new Error(`Ollama not available: ${safeReason}`);
    }

    toaster.showLoading("Analyzing characters...");
    const contextResult = await enhancerIntegration.setupCharacterContext();

    // Use contextResult parameter
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
      await processSingleContentBlock();
    } else {
      await processMultipleParagraphs(paragraphs);
    }

    const stats = enhancerIntegration.statsUtils.getStats();
    console.log("Novel Dialogue Enhancer: Enhancement complete", stats);
    toaster.showSuccess("Enhancement complete!");

    return true; // Use this return value in callers
  } catch (error) {
    console.error("Novel Dialogue Enhancer: Enhancement error", error);
    toaster.showError(
      `Enhancement failed: ${window.DOMPurify.sanitize(error.message)}`
    );
    return false; // Use this return value in callers
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
    return;
  }

  console.log("Processing full content as a single block");
  toaster.updateProgress(0, 1);
  toaster.showLoading("Processing content...");

  try {
    const enhancedText = await enhancerIntegration.enhanceText(originalText);

    // Use enhancedText parameter with validation
    if (!enhancedText || typeof enhancedText !== "string") {
      console.warn("Invalid enhanced text received:", typeof enhancedText);
      enhancerIntegration.statsUtils.incrementErrorCount();
      throw new Error("Invalid enhanced text format");
    }

    if (enhancedText.trim() === "") {
      console.warn("Empty enhanced text received");
      enhancerIntegration.statsUtils.incrementErrorCount();
      throw new Error("Enhancement produced empty result");
    }

    if (terminateRequested) {
      console.log("Enhancement terminated by user after processing");
      toaster.showWarning("Enhancement terminated by user");
      return;
    }

    contentElement.innerHTML = window.DOMPurify.sanitize(enhancedText);
    console.log(`Content updated with ${enhancedText.length} characters`);
    toaster.updateProgress(1, 1);
  } catch (error) {
    console.error("Failed to enhance content block:", error);
    enhancerIntegration.statsUtils.incrementErrorCount();
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

  // Update progress bar first
  toaster.updateProgress(startIndex, totalParagraphs);

  // Then update the message text with batch info (persistent, duration=0)
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

  try {
    console.log(
      `Processing batch ${startIndex}-${startIndex + batch.length - 1} (${
        batchText.length
      } chars)`
    );

    const enhancedText = await enhancerIntegration.enhanceText(batchText);

    if (terminateRequested) {
      console.log(
        `Enhancement terminated by user during batch ${startIndex}-${
          startIndex + batch.length - 1
        }`
      );
      toaster.showWarning("Enhancement terminated by user");
      return;
    }

    const enhancedParagraphs = enhancedText.split("\n\n");

    for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
      batch[j].innerHTML = window.DOMPurify.sanitize(enhancedParagraphs[j]);
    }

    toaster.updateProgress(
      Math.min(startIndex + batch.length, totalParagraphs),
      totalParagraphs
    );
  } catch (error) {
    console.error(
      `Enhancement failed for batch ${startIndex}-${startIndex + chunkSize}:`,
      error
    );

    // Increment error count for batch failures
    enhancerIntegration.statsUtils.incrementErrorCount();

    toaster.showMessage(
      `Batch ${startIndex}-${
        startIndex + batch.length
      } failed. Skipping this batch and continuing...`,
      "warn",
      4000
    );
  }
}

/**
 * Handles termination requests from the background script
 */
function handleTerminationRequest() {
  if (isEnhancing) {
    console.log("Termination requested while enhancement in progress");
    terminateRequested = true;

    toaster.showMessage("Terminating enhancement...", "warn", 2000);

    chrome.runtime.sendMessage({
      action: "terminateAllRequests"
    });

    setTimeout(() => {
      if (isEnhancing) {
        console.warn(
          "Enhancement process didn't terminate properly, forcing reset"
        );
        isEnhancing = false;
        pendingEnhancement = false;

        toaster.showError("Enhancement process forced to terminate");
      }
    }, 2000);
  } else {
    console.log("Termination requested but no enhancement in progress");
    terminateRequested = false;
    pendingEnhancement = false;
  }
}

// Message handler for communication with popup and background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || typeof request !== "object" || !request.action) {
    console.error("Invalid message format received");
    sendResponse({ status: "error", error: "Invalid message format" });
    return false;
  }

  if (request.action === "ping") {
    sendResponse({ status: "active", whitelisted: isCurrentSiteWhitelisted });
    return false; // Synchronous response
  } else if (request.action === "checkCurrentSiteWhitelist") {
    isCurrentSiteWhitelisted = request.isWhitelisted;
    console.log(`Site whitelist status updated: ${isCurrentSiteWhitelisted}`);
    sendResponse({ status: "updated" });
    return false; // Synchronous response
  } else if (request.action === "enhanceNow") {
    // First check if site is whitelisted
    if (!isCurrentSiteWhitelisted) {
      toaster.showWarning(
        "This site is not whitelisted. Please whitelist it first."
      );
      sendResponse({
        status: "failed",
        error: "This site is not whitelisted. Please whitelist it first."
      });
      return false;
    }

    // Validate settings object before applying
    if (request.settings && typeof request.settings === "object") {
      // Use safe defaults if properties are missing
      settings = {
        isExtensionPaused: Boolean(
          request.settings.isExtensionPaused ?? settings.isExtensionPaused
        ),
        preserveNames: Boolean(
          request.settings.preserveNames ?? settings.preserveNames
        ),
        fixPronouns: Boolean(
          request.settings.fixPronouns ?? settings.fixPronouns
        )
      };
    }

    // Async operation - return true to keep channel open
    enhancePage()
      .then((result) => {
        const stats = enhancerIntegration.statsUtils.getStats();
        sendResponse({
          status: "enhanced",
          stats: stats
        });
      })
      .catch((error) => {
        console.error("Enhancement failed:", error);
        try {
          sendResponse({
            status: "failed",
            error: error.message
          });
        } catch (err) {
          console.warn(
            "Failed to send error response, port may be closed:",
            err
          );
        }
      });

    return true; // Keep message channel open for async response
  } else if (request.action === "terminateOperations") {
    console.log("Termination request received from popup");
    handleTerminationRequest();
    sendResponse({ status: "terminating" });
    return false; // Synchronous response
  } else if (request.action === "updatePageStatus") {
    console.log(`Page status updated: disabled=${Boolean(request.disabled)}`);

    // Update whitelist status
    isCurrentSiteWhitelisted = !request.disabled;

    if (request.disabled) {
      handleTerminationRequest();
    }

    sendResponse({ status: "updated" });
    return false; // Synchronous response
  }

  // Default for unhandled actions
  sendResponse({ status: "error", error: "Unknown action" });
  return false;
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
