// content.js
let contentElement = null;
let settings = {
  isExtensionPaused: true,
  preserveNames: true,
  fixPronouns: true
};
let isEnhancing = false;
let pendingEnhancement = false;
let terminateRequested = false;
let enhancerIntegration;
let toaster;
let maxRetries = 3;

/**
 * Initializes the extension
 */
function init() {
  enhancerIntegration = new EnhancerIntegration();
  toaster = new Toaster();
  toaster.createToaster();

  chrome.storage.sync.get(
    ["isExtensionPaused", "preserveNames", "fixPronouns"],
    function (data) {
      settings = {
        isExtensionPaused:
          data.isExtensionPaused !== undefined ? data.isExtensionPaused : true,
        preserveNames:
          data.preserveNames !== undefined ? data.preserveNames : true,
        fixPronouns: data.fixPronouns !== undefined ? data.fixPronouns : true
      };

      setTimeout(async () => {
        const isAvailable = await checkOllamaStatus();

        if (!settings.isExtensionPaused && isAvailable) {
          enhancePage();
        }
      }, 1000);
    }
  );
}

/**
 * Checks the availability of Ollama
 * @return {Promise<void>}
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
    return true;
  } else {
    const reason = status ? status.reason : "Unknown error";
    console.warn(`Ollama is not available: ${reason}`);
    toaster.showError(`Ollama is not available: ${reason}`);

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
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  let largestTextBlock = null;
  let maxTextLength = 0;

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

  return largestTextBlock;
}

/**
 * Main function to enhance the page content using LLM
 */
async function enhancePage() {
  console.log("Novel Dialogue Enhancer: Starting enhancement process");
  console.time("enhancePage");

  if (isEnhancing) {
    pendingEnhancement = true;
    console.log("Enhancement already in progress, queuing request");
    toaster.showMessage(
      "Enhancement already in progress, queued for later",
      2000
    );
    return false;
  }

  isEnhancing = true;
  terminateRequested = false;

  if (typeof observer !== "undefined" && observer) {
    observer.disconnect();
  }

  contentElement = findContentElement();

  if (!contentElement) {
    console.log("Novel Dialogue Enhancer: Couldn't find content element");
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
    if (!ollamaStatus.available) {
      toaster.showError(`Ollama not available: ${ollamaStatus.reason}`);
      throw new Error(`Ollama not available: ${ollamaStatus.reason}`);
    }

    await enhancePageWithLLM();
    const stats = enhancerIntegration.getStats();
    console.log("Novel Dialogue Enhancer: Enhancement complete", stats);
    toaster.finishProgress();
  } catch (error) {
    console.error("Novel Dialogue Enhancer: Enhancement error", error);
    toaster.showError(`Enhancement failed: ${error.message}`);
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
 * Enhances the page content using LLM
 */
async function enhancePageWithLLM() {
  console.log("Novel Dialogue Enhancer: Using LLM enhancement");
  console.time("LLMEnhancement");

  try {
    const paragraphs = contentElement.querySelectorAll("p");
    const totalParagraphs = paragraphs.length || 1;

    toaster.updateProgress(0, totalParagraphs, true);

    if (paragraphs.length === 0) {
      await processSingleContentBlock();
    } else {
      await processMultipleParagraphs(paragraphs);
    }

    enhancerIntegration.statsUtils.setTotalDialoguesEnhanced(
      enhancerIntegration.statsUtils.getTotalDialoguesEnhanced() +
        (paragraphs.length || 1)
    );
    console.log("Novel Dialogue Enhancer: LLM enhancement complete");
  } catch (error) {
    console.error(
      "Novel Dialogue Enhancer: LLM enhancement failed completely",
      error
    );
    toaster.showError("LLM enhancement failed: " + error.message);
    throw error;
  } finally {
    console.timeEnd("LLMEnhancement");
  }
}

async function processSingleContentBlock() {
  const originalText = contentElement.innerHTML;

  if (terminateRequested) {
    console.log("LLM enhancement terminated by user before processing");
    toaster.showError("Enhancement terminated by user");
    return;
  }

  console.log("Sending content to LLM for full-content enhancement");
  toaster.updateProgress(0, 1, true);

  const llmEnhancedText = await enhancerIntegration.enhanceText(originalText);

  if (terminateRequested) {
    console.log("LLM enhancement terminated by user after processing");
    toaster.showError("Enhancement terminated by user");
    return;
  }

  contentElement.innerHTML = llmEnhancedText;
  toaster.updateProgress(1, 1, true);
}

async function processMultipleParagraphs(paragraphs) {
  const totalParagraphs = paragraphs.length;
  const idealChunkSize = Math.max(5, Math.ceil(totalParagraphs / 3));
  const chunkSize = Math.min(idealChunkSize, 15);

  console.log(
    `Processing ${totalParagraphs} paragraphs in chunks of ${chunkSize}`
  );

  for (let i = 0; i < paragraphs.length; i += chunkSize) {
    if (terminateRequested) {
      console.log(
        `LLM enhancement terminated by user at batch ${i}/${paragraphs.length}`
      );
      toaster.showError("Enhancement terminated by user");
      break;
    }

    await processParagraphBatch(paragraphs, i, chunkSize, totalParagraphs);

    if (i + chunkSize < paragraphs.length && !terminateRequested) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function processParagraphBatch(
  paragraphs,
  startIndex,
  chunkSize,
  totalParagraphs
) {
  console.log(
    `LLM enhancement progress: ${startIndex}/${paragraphs.length} paragraphs`
  );
  toaster.updateProgress(startIndex, totalParagraphs, true);

  const batch = Array.from(paragraphs).slice(
    startIndex,
    startIndex + chunkSize
  );

  let batchText = batch.map((p) => p.innerHTML).join("\n\n");

  try {
    console.log(
      `Sending large batch ${startIndex}-${
        startIndex + batch.length - 1
      } to LLM (${batchText.length} chars)`
    );

    const llmEnhanced = await enhancerIntegration.enhanceText(batchText);

    if (terminateRequested) {
      console.log(
        `LLM enhancement terminated by user during batch ${startIndex}-${
          startIndex + batch.length - 1
        }`
      );
      toaster.showError("Enhancement terminated by user");
      return;
    }

    const enhancedParagraphs = llmEnhanced.split("\n\n");

    for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
      batch[j].innerHTML = enhancedParagraphs[j];
    }

    toaster.updateProgress(
      Math.min(startIndex + batch.length, totalParagraphs),
      totalParagraphs,
      true
    );
  } catch (error) {
    console.error(
      `LLM enhancement failed for batch ${startIndex}-${
        startIndex + chunkSize
      }:`,
      error
    );
    toaster.showMessage(
      `Batch ${startIndex}-${
        startIndex + batch.length
      } failed. Skipping this batch and continuing...`,
      2000
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

    toaster.showMessage("Terminating enhancement...", 2000);

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

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "ping") {
    sendResponse({ status: "ok" });
    return false;
  } else if (request.action === "enhanceNow") {
    settings = request.settings;

    enhancePage()
      .then((result) => {
        const stats = enhancerIntegration.statsUtils.getStats();
        try {
          sendResponse({
            status: "enhanced",
            stats: stats
          });
        } catch (err) {
          console.warn("Failed to send response, port may be closed:", err);
        }
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

    return true;
  } else if (request.action === "terminateOperations") {
    console.log("Termination request received from popup");
    handleTerminationRequest();
    sendResponse({ status: "terminating" });
    return false;
  } else if (request.action === "updatePageStatus") {
    console.log(`Page status updated: disabled=${request.disabled}`);

    if (request.disabled) {
      handleTerminationRequest();
    }

    sendResponse({ status: "updated" });
    return false;
  }

  return false;
});

init();

const observer = new MutationObserver(function (mutations) {
  if (!settings.isExtensionPaused && !isEnhancing && !terminateRequested) {
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

setTimeout(() => {
  const contentElement = findContentElement();
  if (contentElement) {
    observer.observe(contentElement, { childList: true, subtree: true });
  }
}, 1000);
