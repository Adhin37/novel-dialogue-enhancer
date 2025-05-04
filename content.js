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

// FIXED: Removed the recursive call to enhancerIntegration
// This function now uses a direct implementation instead of calling back to enhancerIntegration
function extractCharacterNames(text, existingMap = {}) {
  const characterMap = {...existingMap};
  
  // Pattern to match potential character names
  // Looks for capitalized words followed by dialogue or speech verbs
  const namePatterns = [
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered|spoke|declared|answered)/g,
    /"([^"]+)"\s*,?\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+(?:said|replied|asked|shouted|exclaimed|whispered|muttered)/g,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s*:\s*"([^"]+)"/g
  ];
  
  // Process each pattern
  for (const pattern of namePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // The name is either in group 1 or 2 depending on the pattern
      const name = match[1].includes('"') ? match[2] : match[1];
      
      // Skip if it's not a name (common false positives)
      if (isCommonNonName(name)) continue;
      
      // Add to character map if not already present
      if (!characterMap[name]) {
        const gender = guessGender(name, text);
        characterMap[name] = {
          gender,
          appearances: 1
        };
      } else {
        // Update existing character data
        characterMap[name].appearances = (characterMap[name].appearances || 0) + 1;
      }
    }
  }
  
  return characterMap;
}

// Check if a potential name is actually a common word or phrase
// that shouldn't be considered a character name
function isCommonNonName(word) {
  const commonNonNames = [
    "The", "Then", "This", "That", "These", "Those", "There", "Their", "They",
    "However", "Suddenly", "Finally", "Eventually", "Certainly", "Perhaps",
    "Maybe", "While", "When", "After", "Before", "During", "Within", "Without",
    "Also", "Thus", "Therefore", "Hence", "Besides", "Moreover", "Although",
    "Despite", "Since", "Because", "Nonetheless", "Nevertheless", "Regardless",
    "Consequently", "Accordingly", "Meanwhile", "Afterwards", "Beforehand",
    "Likewise", "Similarly", "Alternatively", "Conversely", "Instead",
    "Otherwise", "Particularly", "Specifically", "Generally", "Usually",
    "Typically", "Rarely", "Frequently", "Occasionally", "Normally"
  ];
  
  return commonNonNames.includes(word);
}

// Guess gender based on name patterns and context - relies on genderUtils
function guessGender(name, text) {
  return window.genderUtils.guessGender(name, text, characterMap);
}

// Fix dialogue patterns to be more natural - delegated to dialogueUtils
function fixDialoguePatterns(text) {
  return window.dialogueUtils.fixDialoguePatterns(text);
}

// Enhance dialogue to be more natural - delegated to dialogueUtils
function enhanceDialogue(dialogue) {
  return window.dialogueUtils.enhanceDialogue(dialogue);
}

// Fix pronouns based on character map
function fixPronouns(text) {
  // Direct implementation to avoid circular dependency
  let fixedText = text;
  
  // Process each character in the map
  Object.keys(characterMap).forEach(name => {
    const character = characterMap[name];
    
    // Skip if gender is unknown
    if (character.gender === "unknown") return;
    
    // Create a regex to find sentences with the character name
    const nameRegex = new RegExp(`([^.!?]*\\b${escapeRegExp(name)}\\b[^.!?]*(?:[.!?]))`, "g");
    
    // Find all sentences containing the character name
    const matches = Array.from(fixedText.matchAll(nameRegex));
    
    // For each match, check the following text for pronoun consistency
    matches.forEach(match => {
      const sentence = match[0];
      const sentenceIndex = match.index;
      
      // Look at the text after this sentence
      const followingText = fixedText.substring(sentenceIndex + sentence.length);
      
      // Apply pronoun fixes based on gender
      if (character.gender === "male") {
        // Fix instances where female pronouns are used for male characters
        const fixedFollowing = followingText
          .replace(/\b(She|she)\b(?=\s)(?![^<]*>)/g, "He")
          .replace(/\b(Her|her)\b(?=\s)(?![^<]*>)/g, match => {
            // Determine if it's a possessive or object pronoun
            return /\b(Her|her)\b\s+([\w-]+)/i.test(match) ? "His" : "Him";
          })
          .replace(/\b(herself)\b(?=\s)(?![^<]*>)/g, "himself");
        
        if (followingText !== fixedFollowing) {
          fixedText = fixedText.substring(0, sentenceIndex + sentence.length) + fixedFollowing;
        }
      } else if (character.gender === "female") {
        // Fix instances where male pronouns are used for female characters
        const fixedFollowing = followingText
          .replace(/\b(He|he)\b(?=\s)(?![^<]*>)/g, "She")
          .replace(/\b(His|his)\b(?=\s)(?![^<]*>)/g, "Her")
          .replace(/\b(Him|him)\b(?=\s)(?![^<]*>)/g, "Her")
          .replace(/\b(himself)\b(?=\s)(?![^<]*>)/g, "herself");
        
        if (followingText !== fixedFollowing) {
          fixedText = fixedText.substring(0, sentenceIndex + sentence.length) + fixedFollowing;
        }
      }
    });
  });
  
  return fixedText;
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