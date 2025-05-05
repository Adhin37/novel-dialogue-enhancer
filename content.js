// Content script for Novel Dialogue Enhancer - Modified to use advanced modules including Ollama LLM
// Added improved LLM integration and error handling

// Global variables
let contentElement = null;
let settings = {
  enhancerEnabled: true,
  preserveNames: true,
  fixPronouns: true,
  useLLM: false // Added LLM setting
};
let characterMap = {};
let isEnhancing = false; // Flag to prevent recursive enhancement
let pendingEnhancement = false; // Flag to track if another enhancement was requested while one is in progress
let terminateRequested = false; // Flag to track if termination was requested
let enhancerIntegration;
let toaster;
let ollamaClient;
// Initialize
function init() {
  enhancerIntegration = new EnhancerIntegration();
  toaster = new Toaster();
  ollamaClient = new OllamaClient();
  // Load settings
  chrome.storage.sync.get([
    'enhancerEnabled',
    'preserveNames',
    'fixPronouns',
    'useLLM', // Added LLM setting
    'characterMap'
  ], function (data) {
    settings = {
      enhancerEnabled: data.enhancerEnabled !== undefined ? data.enhancerEnabled : true,
      preserveNames: data.preserveNames !== undefined ? data.preserveNames : true,
      fixPronouns: data.fixPronouns !== undefined ? data.fixPronouns : true,
      useLLM: data.useLLM !== undefined ? data.useLLM : false // Load LLM setting
    };

    characterMap = data.characterMap || {};

    // Check Ollama availability if LLM is enabled
    if (settings.useLLM) {
      checkOllamaStatus();
    }

    // If enabled, enhance the page
    if (settings.enhancerEnabled) {
      enhancePage();
    }

  });
}

// Check if Ollama is running and working properly
async function checkOllamaStatus() {
  try {
    const status = await ollamaClient.checkOllamaAvailability();
    if (status.available) {
      console.log(`Ollama is running (v${status.version})`);
    } else {
      console.warn(`Ollama is not available: ${status.reason}`);
      // Notify user if they have LLM enabled but Ollama isn't working
      chrome.runtime.sendMessage({
        action: "showNotification",
        data: {
          title: "Ollama Not Available",
          message: `LLM enhancement is enabled but Ollama is not available (${status.reason}). Rule-based enhancement will be used instead.`
        }
      });
    }
  } catch (err) {
    console.error("Failed to check Ollama status:", err);
  }
}

// Find the content element based on the website
function findContentElement() {
  // Common content selectors for various novel sites
  const contentSelectors = [
    '.chapter-content', // FanMTL
    '#chapter-content',
    '.novel_content',
    '.chapter-text',
    '.entry-content',
    '.text-content',
    '.article-content',
    '.content-area',
    'article .content'
  ];

  // Try each selector
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  // If no exact match, try finding by content type
  // Look for the largest text block
  let largestTextBlock = null;
  let maxTextLength = 0;

  const paragraphContainers = document.querySelectorAll('div, article, section');

  paragraphContainers.forEach(container => {
    const paragraphs = container.querySelectorAll('p');
    if (paragraphs.length >= 5) { // Minimum number of paragraphs to be considered content
      let totalText = '';
      paragraphs.forEach(p => {
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

// Enhance the page content
async function enhancePage() {
  console.log("Novel Dialogue Enhancer: Starting enhancement process");
  console.time('enhancePage');

  // Show the toaster notification at the start of the process
  toaster.createToaster();

  // Guard against recursive enhancement
  if (isEnhancing) {
    pendingEnhancement = true;
    console.log("Enhancement already in progress, queuing request");
    toaster.showMessage("Enhancement already in progress, queued for later", 2000);
    return false;
  }

  isEnhancing = true;
  terminateRequested = false; // Reset termination flag

  // Temporarily disconnect observer to prevent triggering while we update content
  if (typeof observer !== 'undefined' && observer) {
    observer.disconnect();
  }

  contentElement = findContentElement();

  if (!contentElement) {
    console.log("Novel Dialogue Enhancer: Couldn't find content element");
    isEnhancing = false;

    // Reconnect observer
    if (typeof observer !== 'undefined' && observer && contentElement) {
      setTimeout(() => {
        observer.observe(contentElement, { childList: true, subtree: true });
      }, 100);
    }

    console.timeEnd('enhancePage');
    return false;
  }

  try {
    // Process the content
    if (settings.useLLM) {
      // If LLM is enabled, we'll use it to enhance the content
      await enhancePageWithLLM();
    } else {
      // Standard rule-based enhancement
      enhancePageWithRules();
    }

    // Update character map in storage
    chrome.runtime.sendMessage({
      action: "updateCharacterMap",
      characters: characterMap
    });

    // Log enhancement statistics
    const stats = enhancerIntegration.getEnhancementStats();
    console.log("Novel Dialogue Enhancer: Enhancement complete", stats);

    // Show success message
    toaster.finishProgress();
  } catch (error) {
    console.error("Novel Dialogue Enhancer: Enhancement error", error);
    // If there was an error with LLM enhancement, fall back to rule-based
    if (settings.useLLM) {
      console.log("Novel Dialogue Enhancer: Falling back to rule-based enhancement");
      toaster.showMessage("Falling back to rule-based enhancement", 2000);
      enhancePageWithRules();
    } else {
      toaster.showError("Enhancement failed: " + error.message);
    }
  } finally {
    // Reconnect observer after enhancement
    if (typeof observer !== 'undefined' && observer && contentElement) {
      setTimeout(() => {
        observer.observe(contentElement, { childList: true, subtree: true });
      }, 100);
    }

    isEnhancing = false;
    console.timeEnd('enhancePage');

    // If another enhancement was requested while this one was in progress, do it now
    if (pendingEnhancement && !terminateRequested) {
      pendingEnhancement = false;
      setTimeout(enhancePage, 10);
    }
  }

  return true;
}

// Standard rule-based enhancement
function enhancePageWithRules() {
  console.log("Novel Dialogue Enhancer: Using rule-based enhancement");
  console.time('ruleBasedEnhancement');

  const paragraphs = contentElement.querySelectorAll('p');
  const totalParagraphs = paragraphs.length || 1;

  // Initialize the toaster with 0 progress
  toaster.updateProgress(0, totalParagraphs, false);

  if (paragraphs.length === 0) {
    // If there are no paragraph elements, split by newlines
    const text = contentElement.innerHTML;
    const enhancedText = enhanceText(text);
    contentElement.innerHTML = enhancedText;

    // Update toaster to show completion
    toaster.updateProgress(1, 1, false);
  } else {
    // Process each paragraph
    paragraphs.forEach((paragraph, index) => {
      // Check if termination was requested during processing
      if (terminateRequested) {
        console.log("Rule-based enhancement terminated by user");
        toaster.showError("Enhancement terminated by user");
        return;
      }

      const originalText = paragraph.innerHTML;
      const enhancedText = enhanceText(originalText);
      paragraph.innerHTML = enhancedText;

      // Update progress in toaster after each paragraph (or every few paragraphs for performance)
      if (paragraphs.length > 20) {
        if (index % 5 === 0 || index === paragraphs.length - 1) {
          toaster.updateProgress(index + 1, totalParagraphs, false);
        }
      } else {
        toaster.updateProgress(index + 1, totalParagraphs, false);
      }

      // Log progress for large pages
      if (paragraphs.length > 20 && index % 10 === 0) {
        console.log(`Rule-based enhancement progress: ${index}/${paragraphs.length} paragraphs`);
      }
    });
  }

  console.timeEnd('ruleBasedEnhancement');
}

async function enhancePageWithLLM() {
  console.log("Novel Dialogue Enhancer: Using LLM enhancement");
  console.time('llmEnhancement');

  try {
    // Get batch size setting
    const { batchSize = 1 } = await new Promise(resolve =>
      chrome.storage.sync.get({ batchSize: 1 }, resolve)
    );

    // Process with paragraphs if available
    const paragraphs = contentElement.querySelectorAll('p');
    const totalParagraphs = paragraphs.length || 1;

    // Initialize the toaster with 0 progress
    toaster.updateProgress(0, totalParagraphs, true);

    if (paragraphs.length === 0) {
      // If there are no paragraph elements, enhance the whole content
      const originalText = contentElement.innerHTML;

      // First apply rule-based enhancements
      const initialEnhancedText = enhanceText(originalText);

      // Then apply LLM enhancement
      try {
        // Check if termination was requested
        if (terminateRequested) {
          console.log("LLM enhancement terminated by user before processing");
          contentElement.innerHTML = initialEnhancedText;
          toaster.showError("Enhancement terminated by user");
          return;
        }

        console.log("Sending content to LLM for full-content enhancement");
        toaster.updateProgress(0, 1, true);
        const llmEnhancedText = await enhanceWithLLM(initialEnhancedText);

        // Check again if termination was requested during LLM processing
        if (terminateRequested) {
          console.log("LLM enhancement terminated by user after processing");
          contentElement.innerHTML = initialEnhancedText;
          toaster.showError("Enhancement terminated by user");
          return;
        }

        contentElement.innerHTML = llmEnhancedText;
        toaster.updateProgress(1, 1, true);
      } catch (error) {
        console.warn("LLM enhancement failed, using rule-based result:", error);
        contentElement.innerHTML = initialEnhancedText;
        toaster.showError("LLM enhancement failed: " + error.message);
      }
    } else {
      // Process in larger chunks for better context
      // Get paragraphs in larger segments
      const totalParagraphs = paragraphs.length;
      const idealChunkSize = Math.max(5, Math.ceil(totalParagraphs / 3)); // Aim for 3 chunks or fewer
      const chunkSize = Math.min(idealChunkSize, 15); // Cap at 15 paragraphs per chunk

      console.log(`Processing ${totalParagraphs} paragraphs in chunks of ${chunkSize}`);

      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        // Check if termination was requested before processing this batch
        if (terminateRequested) {
          console.log(`LLM enhancement terminated by user at batch ${i}/${paragraphs.length}`);
          toaster.showError("Enhancement terminated by user");
          break;
        }

        // Log progress
        console.log(`LLM enhancement progress: ${i}/${paragraphs.length} paragraphs`);
        toaster.updateProgress(i, totalParagraphs, true);

        // Get this batch of paragraphs
        const batch = Array.from(paragraphs).slice(i, i + chunkSize);

        // Combine the batch into a single text
        let batchText = '';
        batch.forEach(p => {
          batchText += p.innerHTML + '\n\n';
        });

        // First apply rule-based enhancements
        const initialEnhanced = enhanceText(batchText);

        // Then apply LLM enhancement
        try {
          console.log(`Sending large batch ${i}-${i + batch.length - 1} to LLM (${batchText.length} chars)`);
          const llmEnhanced = await ollamaClient.enhanceWithLLM(initialEnhanced);

          // Check if termination was requested during LLM processing
          if (terminateRequested) {
            console.log(`LLM enhancement terminated by user during batch ${i}-${i + batch.length - 1}`);
            toaster.showError("Enhancement terminated by user");
            break;
          }

          // Split the enhanced text back into paragraphs
          const enhancedParagraphs = llmEnhanced.split('\n\n');

          // Apply the enhanced text to each paragraph
          for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
            batch[j].innerHTML = enhancedParagraphs[j];
          }

          // Update progress after this batch
          toaster.updateProgress(Math.min(i + batch.length, totalParagraphs), totalParagraphs, true);
        } catch (error) {
          console.warn(`LLM enhancement failed for batch ${i}-${i + chunkSize}, using rule-based result:`, error);

          // Apply rule-based enhancements instead
          const enhancedParagraphs = initialEnhanced.split('\n\n');
          for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
            batch[j].innerHTML = enhancedParagraphs[j];
          }

          // Show warning but continue processing
          toaster.showMessage(`Batch ${i}-${i + batch.length} failed, using rule-based result. Continuing...`, 2000);
        }

        // Add a small delay between batches to avoid overwhelming the API
        if (i + chunkSize < paragraphs.length && !terminateRequested) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // Update enhancement stats
    enhancerIntegration.setTotalDialoguesEnhanced(enhancerIntegration.getTotalDialoguesEnhanced() + paragraphs.length || 1);
    console.log("Novel Dialogue Enhancer: LLM enhancement complete");

  } catch (error) {
    console.error("Novel Dialogue Enhancer: LLM enhancement failed completely", error);
    // Fall back to standard enhancement
    toaster.showError("LLM enhancement failed: " + error.message);
    enhancePageWithRules();
  } finally {
    console.timeEnd('llmEnhancement');
  }
}

// Function to handle termination requests
function handleTerminationRequest() {
  if (isEnhancing) {
    console.log("Termination requested while enhancement in progress");
    terminateRequested = true;

    // Show termination message in toaster
    toaster.showMessage("Terminating enhancement...", 2000);

    // Notify the background script to terminate any pending LLM requests
    chrome.runtime.sendMessage({
      action: "terminateAllRequests"
    });

    // Set a timeout to reset the flag if the enhancement process doesn't end
    setTimeout(() => {
      if (isEnhancing) {
        console.warn("Enhancement process didn't terminate properly, forcing reset");
        isEnhancing = false;
        pendingEnhancement = false;

        // Update toaster to show error
        toaster.showError("Enhancement process forced to terminate");
      }
    }, 2000);
  } else {
    console.log("Termination requested but no enhancement in progress");
    terminateRequested = false;
    pendingEnhancement = false;
  }
}

// Enhance text by improving dialogues - updated to use integration module
function enhanceText(text) {
  // Check if termination was requested
  if (terminateRequested) {
    return text; // Return the original text without enhancement
  }

  // Use the integrated enhancer function
  const result = enhancerIntegration.enhanceTextIntegrated(text, settings, characterMap);

  // Update the character map
  characterMap = result.characterMap;

  return result.enhancedText;
}

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "ping") {
    // Respond to ping to check if content script is ready
    sendResponse({ status: "ok" });
  } else if (request.action === "enhanceNow") {
    settings = request.settings;
    // Also get the LLM setting since it might have been updated
    chrome.storage.sync.get({ useLLM: false }, function (data) {
      settings.useLLM = data.useLLM;

      // Start the enhancement process
      enhancePage().then(() => {
        const stats = enhancerIntegration.getEnhancementStats();
        sendResponse({
          status: "enhanced",
          stats: stats,
          usedLLM: settings.useLLM
        });
      }).catch(error => {
        console.error("Enhancement failed:", error);
        sendResponse({
          status: "failed",
          error: error.message
        });
      });
    });
  } else if (request.action === "terminateOperations") {
    // NEW: Handle termination requests from popup
    console.log("Termination request received from popup");
    handleTerminationRequest();
    sendResponse({ status: "terminating" });
  } else if (request.action === "updatePageStatus") {
    // Handle page status updates
    console.log(`Page status updated: disabled=${request.disabled}`);

    // If page is being disabled, terminate any operations
    if (request.disabled) {
      handleTerminationRequest();
    }

    sendResponse({ status: "updated" });
  }
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Initialize the extension
init();

// Add mutation observer to handle dynamic content
const observer = new MutationObserver(function (mutations) {
  if (settings.enhancerEnabled && !isEnhancing && !terminateRequested) {
    // Check if new paragraphs were added
    let newContentAdded = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if the added nodes are actual content, not our own modifications
        let hasRealContent = false;
        mutation.addedNodes.forEach(node => {
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
      // Wait a bit for all content to be loaded
      clearTimeout(window.enhancementTimer);
      window.enhancementTimer = setTimeout(enhancePage, 500);
    }
  }
});

// Start observing after a delay to allow the page to fully load
setTimeout(() => {
  const contentElement = findContentElement();
  if (contentElement) {
    observer.observe(contentElement, { childList: true, subtree: true });
  }
}, 1000);