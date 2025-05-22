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
  // Initialize components
  enhancerIntegration = new EnhancerIntegration();
  toaster = new Toaster();
  toaster.createToaster();

  // First check if current site is whitelisted with timeout handling
  checkSitePermissions()
    .then((isWhitelisted) => {
      isCurrentSiteWhitelisted = isWhitelisted;

      if (!isCurrentSiteWhitelisted) {
        console.log("Site not whitelisted, extension inactive");
        return;
      }

      console.log("Site is whitelisted, activating extension features");

      // Only load settings if the site is whitelisted
      loadSettings()
        .then(() => {
          // Use a shorter delay for better feedback
          setTimeout(async () => {
            if (!settings.isExtensionPaused) {
              console.log("Extension is enabled, checking Ollama availability");
              try {
                const isAvailable = await checkOllamaStatus();
                if (isAvailable) {
                  console.log("Ollama is available, starting page enhancement");
                  enhancePage();
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
        })
        .catch((error) => {
          console.error("Failed to load settings:", error);
        });
    })
    .catch((error) => {
      console.error("Fatal error during initialization:", error);
      toaster.showError(
        "Extension initialization failed. Please try refreshing the page."
      );
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
          settings = {
            isExtensionPaused: false,
            preserveNames: true,
            fixPronouns: true
          };
          reject(chrome.runtime.lastError);
        } else {
          settings = {
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
          resolve(settings);
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
    }, 5000); // 5 second timeout

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

        resolve(response && response.hasPermission);
      }
    );
  });
}

/**
 * Checks the availability of Ollama with timeout
 * @return {Promise<boolean>}
 */
async function checkOllamaStatus() {
  console.log("Checking Ollama status...");
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

  // Show initial progress message that won't disappear
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
    // Check Ollama availability
    const ollamaStatus =
      await enhancerIntegration.ollamaClient.checkOllamaAvailability();

    if (!ollamaStatus.available) {
      const safeReason = window.DOMPurify.sanitize(
        ollamaStatus.reason || "Unknown error"
      );
      toaster.showError(`Ollama not available: ${safeReason}`);
      throw new Error(`Ollama not available: ${safeReason}`);
    }

    // Get character context first to improve prompt quality
    toaster.showLoading("Analyzing characters...");
    await enhancerIntegration.setupCharacterContext();

    // Delegate to the appropriate enhancement method based on content structure
    const paragraphs = contentElement.querySelectorAll("p");

    if (paragraphs.length === 0) {
      await processSingleContentBlock();
    } else {
      await processMultipleParagraphs(paragraphs);
    }

    const stats = enhancerIntegration.statsUtils.getStats();
    console.log("Novel Dialogue Enhancer: Enhancement complete", stats);
    toaster.showSuccess("Enhancement complete!");
  } catch (error) {
    console.error("Novel Dialogue Enhancer: Enhancement error", error);
    toaster.showError(
      `Enhancement failed: ${window.DOMPurify.sanitize(error.message)}`
    );
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

  return true;
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

  // Show a persistent message that will stay visible during processing
  toaster.showLoading("Processing content...");

  try {
    // Use the enhancerIntegration to enhance the entire text
    const enhancedText = await enhancerIntegration.enhanceText(originalText);

    if (terminateRequested) {
      console.log("Enhancement terminated by user after processing");
      toaster.showWarning("Enhancement terminated by user");
      return;
    }

    // Update the DOM with the enhanced text
    contentElement.innerHTML = window.DOMPurify.sanitize(enhancedText);
    toaster.updateProgress(1, 1);
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
  // Only process if site is whitelisted, extension not paused, and not already enhancing
  if (
    isCurrentSiteWhitelisted &&
    !settings.isExtensionPaused &&
    !isEnhancing &&
    !terminateRequested
  ) {
    let newContentAdded = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        let hasRealContent = false;
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            hasRealContent = true;
          }
        });

        if (hasRealContent) {
          newContentAdded = true;
        }
      }
    });

    if (newContentAdded) {
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
