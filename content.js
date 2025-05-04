// Content script for Novel Dialogue Enhancer - Modified to use advanced modules

// Global variables
let contentElement = null;
let settings = {
  enhancerEnabled: true,
  preserveNames: true,
  fixPronouns: true
};
let characterMap = {};

// Initialize
function init() {
  // Load settings
  chrome.storage.sync.get([
    'enhancerEnabled',
    'preserveNames',
    'fixPronouns',
    'characterMap'
  ], function(data) {
    settings = {
      enhancerEnabled: data.enhancerEnabled !== undefined ? data.enhancerEnabled : true,
      preserveNames: data.preserveNames !== undefined ? data.preserveNames : true,
      fixPronouns: data.fixPronouns !== undefined ? data.fixPronouns : true
    };
    
    characterMap = data.characterMap || {};
    
    // Initialize the integration module
    window.enhancerIntegration.initEnhancerIntegration();
    
    // If enabled, enhance the page
    if (settings.enhancerEnabled) {
      enhancePage();
    }
  });
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
function enhancePage() {
  contentElement = findContentElement();
  
  if (!contentElement) {
    console.log("Novel Dialogue Enhancer: Couldn't find content element");
    return false;
  }
  
  // Process the content
  const paragraphs = contentElement.querySelectorAll('p');
  if (paragraphs.length === 0) {
    // If there are no paragraph elements, split by newlines
    const text = contentElement.innerHTML;
    const enhancedText = enhanceText(text);
    contentElement.innerHTML = enhancedText;
  } else {
    // Process each paragraph
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.innerHTML;
      const enhancedText = enhanceText(originalText);
      paragraph.innerHTML = enhancedText;
    });
  }
  
  // Update character map in storage
  chrome.runtime.sendMessage({
    action: "updateCharacterMap",
    characters: characterMap
  });
  
  // Log enhancement statistics
  const stats = window.enhancerIntegration.getEnhancementStats();
  console.log("Novel Dialogue Enhancer: Enhancement complete", stats);
  
  return true;
}

// Enhance text by improving dialogues - updated to use integration module
function enhanceText(text) {
  // Use the integrated enhancer function
  const result = window.enhancerIntegration.enhanceTextIntegrated(text, settings, characterMap);
  
  // Update the character map
  characterMap = result.characterMap;
  
  return result.enhancedText;
}

// The following legacy functions are kept for backward compatibility
// but their implementation is delegated to the new utility modules

// Extract character names from text - now delegated to integration module
function extractCharacterNames(text) {
  const result = window.enhancerIntegration.enhanceTextIntegrated(text, { preserveNames: true }, characterMap);
  characterMap = result.characterMap;
}

// Guess gender based on name patterns and context - now delegated to genderUtils
function guessGender(name, text) {
  return window.genderUtils.guessGender(name, text, characterMap);
}

// Fix dialogue patterns to be more natural - now delegated to dialogueUtils
function fixDialoguePatterns(text) {
  return window.dialogueUtils.fixDialoguePatterns(text);
}

// Enhance dialogue to be more natural - now delegated to dialogueUtils
function enhanceDialogue(dialogue) {
  return window.dialogueUtils.enhanceDialogue(dialogue);
}

// Fix pronouns based on character map - now handled by integration module
function fixPronouns(text) {
  const result = window.enhancerIntegration.enhanceTextIntegrated(
    text, 
    { fixPronouns: true }, 
    characterMap
  );
  
  return result.enhancedText;
}

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "ping") {
    // Respond to ping to check if content script is ready
    sendResponse({status: "ok"});
  } else if (request.action === "enhanceNow") {
    settings = request.settings;
    const success = enhancePage();
    
    if (success) {
      const stats = window.enhancerIntegration.getEnhancementStats();
      sendResponse({
        status: "enhanced",
        stats: stats
      });
    } else {
      sendResponse({status: "failed"});
    }
  }
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Initialize the extension
init();

// Add mutation observer to handle dynamic content
const observer = new MutationObserver(function(mutations) {
  if (settings.enhancerEnabled) {
    // Check if new paragraphs were added
    let newContentAdded = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        newContentAdded = true;
      }
    });
    
    if (newContentAdded) {
      // Wait a bit for all content to be loaded
      setTimeout(enhancePage, 500);
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