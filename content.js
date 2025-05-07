// content.js
let contentElement = null;
let settings = {
  enhancerEnabled: true,
  preserveNames: true,
  fixPronouns: true
};
let characterMap = {};
let isEnhancing = false;
let pendingEnhancement = false;
let terminateRequested = false;
let enhancerIntegration;
let toaster;
let ollamaClient;
let maxRetries = 3;

function init() {
  enhancerIntegration = new EnhancerIntegration();
  toaster = new Toaster();
  ollamaClient = new OllamaClient();
  chrome.storage.sync.get(
    ["enhancerEnabled", "preserveNames", "fixPronouns", "characterMap"],
    function (data) {
      settings = {
        enhancerEnabled:
          data.enhancerEnabled !== undefined ? data.enhancerEnabled : true,
        preserveNames:
          data.preserveNames !== undefined ? data.preserveNames : true,
        fixPronouns: data.fixPronouns !== undefined ? data.fixPronouns : true
      };

      characterMap = data.characterMap || {};

      setTimeout(() => {
        checkOllamaStatus();

        if (settings.enhancerEnabled) {
          enhancePage();
        }
      }, 1000);
    }
  );
}

async function checkOllamaStatus() {
  console.log("Checking Ollama status...");
  let retries = 0;
  let status = null;

  while (retries < maxRetries) {
    try {
      status = await ollamaClient.checkOllamaAvailability();
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
  } else {
    const reason = status ? status.reason : "Unknown error";
    console.warn(`Ollama is not available: ${reason}`);

    chrome.runtime.sendMessage(
      {
        action: "showNotification",
        data: {
          title: "Ollama Not Available",
          message: `LLM enhancement requires Ollama to be running. Ollama is not available (${reason}). Please start Ollama and try again.`
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Could not send notification:",
            chrome.runtime.lastError
          );
        }
      }
    );
  }
}

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

async function enhancePage() {
  console.log("Novel Dialogue Enhancer: Starting enhancement process");
  console.time("enhancePage");

  toaster.createToaster();

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

    if (typeof observer !== "undefined" && observer && contentElement) {
      setTimeout(() => {
        observer.observe(contentElement, { childList: true, subtree: true });
      }, 100);
    }

    console.timeEnd("enhancePage");
    return false;
  }

  try {
    const ollamaStatus = await ollamaClient.checkOllamaAvailability();
    if (!ollamaStatus.available) {
      console.warn("Ollama not available, cannot enhance content");
      toaster.showError(`Ollama not available: ${ollamaStatus.reason}`);
      throw new Error(`Ollama not available: ${ollamaStatus.reason}`);
    }

    await enhancePageWithLLM();

    chrome.runtime.sendMessage({
      action: "updateCharacterMap",
      characters: characterMap
    });

    const stats = enhancerIntegration.getEnhancementStats();
    console.log("Novel Dialogue Enhancer: Enhancement complete", stats);

    toaster.finishProgress();
  } catch (error) {
    console.error("Novel Dialogue Enhancer: Enhancement error", error);
    toaster.showError(`Enhancement failed: ${error.message}`);
  } finally {
    if (typeof observer !== "undefined" && observer && contentElement) {
      setTimeout(() => {
        observer.observe(contentElement, { childList: true, subtree: true });
      }, 100);
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

async function enhancePageWithLLM() {
  console.log("Novel Dialogue Enhancer: Using LLM enhancement");
  console.time("LLMEnhancement");

  try {
    const { batchSize = 1 } = await new Promise((resolve) =>
      chrome.storage.sync.get({ batchSize: 1 }, resolve)
    );

    const paragraphs = contentElement.querySelectorAll("p");
    const totalParagraphs = paragraphs.length || 1;

    toaster.updateProgress(0, totalParagraphs, true);

    if (paragraphs.length === 0) {
      const originalText = contentElement.innerHTML;

      // Extract character data before LLM enhancement
      if (settings.preserveNames || settings.fixPronouns) {
        const result = enhancerIntegration.extractCharacterNames(
          originalText,
          characterMap
        );
        characterMap = result;
      }

      try {
        if (terminateRequested) {
          console.log("LLM enhancement terminated by user before processing");
          toaster.showError("Enhancement terminated by user");
          return;
        }

        console.log("Sending content to LLM for full-content enhancement");
        toaster.updateProgress(0, 1, true);

        // Create character context for this content
        const characterContext =
          settings.preserveNames || settings.fixPronouns
            ? enhancerIntegration.createDialogueSummary(characterMap)
            : "";

        // Use enhancerIntegration instead of direct ollamaClient call
        const llmEnhancedText = await enhancerIntegration.enhanceText(
          originalText,
          characterContext
        );

        if (terminateRequested) {
          console.log("LLM enhancement terminated by user after processing");
          toaster.showError("Enhancement terminated by user");
          return;
        }

        contentElement.innerHTML = llmEnhancedText;
        toaster.updateProgress(1, 1, true);
      } catch (error) {
        console.error("LLM enhancement failed:", error);
        toaster.showError("LLM enhancement failed: " + error.message);
        throw error;
      }
    } else {
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

        console.log(
          `LLM enhancement progress: ${i}/${paragraphs.length} paragraphs`
        );
        toaster.updateProgress(i, totalParagraphs, true);

        const batch = Array.from(paragraphs).slice(i, i + chunkSize);

        let batchText = "";
        batch.forEach((p) => {
          batchText += p.innerHTML + "\n\n";
        });

        // Extract character data for this batch before LLM enhancement
        if (settings.preserveNames || settings.fixPronouns) {
          const result = enhancerIntegration.extractCharacterNames(
            batchText,
            characterMap
          );
          characterMap = result;
        }

        try {
          console.log(
            `Sending large batch ${i}-${i + batch.length - 1} to LLM (${
              batchText.length
            } chars)`
          );

          // Create character context for this batch
          const characterContext =
            settings.preserveNames || settings.fixPronouns
              ? enhancerIntegration.createDialogueSummary(characterMap)
              : "";

          // Use enhancerIntegration instead of direct ollamaClient call
          const llmEnhanced = await enhancerIntegration.enhanceText(
            batchText,
            characterContext
          );

          if (terminateRequested) {
            console.log(
              `LLM enhancement terminated by user during batch ${i}-${
                i + batch.length - 1
              }`
            );
            toaster.showError("Enhancement terminated by user");
            break;
          }

          const enhancedParagraphs = llmEnhanced.split("\n\n");

          for (
            let j = 0;
            j < batch.length && j < enhancedParagraphs.length;
            j++
          ) {
            batch[j].innerHTML = enhancedParagraphs[j];
          }

          toaster.updateProgress(
            Math.min(i + batch.length, totalParagraphs),
            totalParagraphs,
            true
          );
        } catch (error) {
          console.error(
            `LLM enhancement failed for batch ${i}-${i + chunkSize}:`,
            error
          );

          toaster.showMessage(
            `Batch ${i}-${
              i + batch.length
            } failed. Skipping this batch and continuing...`,
            2000
          );
        }

        if (i + chunkSize < paragraphs.length && !terminateRequested) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }

    enhancerIntegration.setTotalDialoguesEnhanced(
      enhancerIntegration.getTotalDialoguesEnhanced() + paragraphs.length || 1
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
  } else if (request.action === "enhanceNow") {
    settings = request.settings;

    enhancePage()
      .then(() => {
        const stats = enhancerIntegration.getEnhancementStats();
        sendResponse({
          status: "enhanced",
          stats: stats
        });
      })
      .catch((error) => {
        console.error("Enhancement failed:", error);
        sendResponse({
          status: "failed",
          error: error.message
        });
      });
  } else if (request.action === "terminateOperations") {
    console.log("Termination request received from popup");
    handleTerminationRequest();
    sendResponse({ status: "terminating" });
  } else if (request.action === "updatePageStatus") {
    console.log(`Page status updated: disabled=${request.disabled}`);

    if (request.disabled) {
      handleTerminationRequest();
    }

    sendResponse({ status: "updated" });
  }

  return true;
});

init();

const observer = new MutationObserver(function (mutations) {
  if (settings.enhancerEnabled && !isEnhancing && !terminateRequested) {
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
