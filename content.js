// Content script for Novel Dialogue Enhancer

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
  
  return true;
}

// Enhance text by improving dialogues
function enhanceText(text) {
  // 1. Extract character names
  if (settings.preserveNames || settings.fixPronouns) {
    extractCharacterNames(text);
  }
  
  // 2. Fix dialogue patterns
  text = fixDialoguePatterns(text);
  
  // 3. Fix pronouns if enabled
  if (settings.fixPronouns) {
    text = fixPronouns(text);
  }
  
  return text;
}

// Extract character names from text
function extractCharacterNames(text) {
  // Pattern to match: "Character name" followed by speech patterns
  const namePatterns = [
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)(?:\s*said|\s*replied|\s*asked|\s*shouted|\s*exclaimed|\s*whispered|\s*spoke|\s*muttered)/g,
    /"([^"]+)"\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said/g,
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*):.*?"/g
  ];
  
  namePatterns.forEach(pattern => {
    const matches = [...text.matchAll(pattern)];
    matches.forEach(match => {
      const name = match[1].trim();
      if (name.length > 1 && !characterMap[name]) {
        // Guess gender based on common name endings or context
        const gender = guessGender(name, text);
        characterMap[name] = { gender };
      }
    });
  });
}

// Guess gender based on name patterns and context
function guessGender(name, text) {
  // Common Chinese, Korean, Japanese name patterns
  // This is an oversimplification, but can help in many cases
  const malePrefixes = ['Mr', 'Mr.', 'Lord', 'Master', 'Brother', 'Uncle', 'Father', 'King', 'Prince', 'Duke'];
  const femalePrefixes = ['Mrs', 'Mrs.', 'Ms', 'Ms.', 'Miss', 'Lady', 'Sister', 'Aunt', 'Mother', 'Queen', 'Princess', 'Duchess'];
  
  // Check for titles
  for (const prefix of malePrefixes) {
    if (name.startsWith(prefix + ' ')) return 'male';
  }
  
  for (const prefix of femalePrefixes) {
    if (name.startsWith(prefix + ' ')) return 'female';
  }
  
  // Check context for pronouns used with this character
  const contextRegex = new RegExp(`${name}[^.!?]*?\\s(he|she|his|her|him)\\s`, 'i');
  const contextMatch = text.match(contextRegex);
  
  if (contextMatch) {
    const pronoun = contextMatch[1].toLowerCase();
    if (['he', 'his', 'him'].includes(pronoun)) return 'male';
    if (['she', 'her'].includes(pronoun)) return 'female';
  }
  
  // Check for common pronouns in subsequent sentences
  const paragraphWithName = text.split('.').find(sentence => sentence.includes(name));
  if (paragraphWithName) {
    const nextSentences = text.split('.').slice(text.split('.').indexOf(paragraphWithName) + 1, text.split('.').indexOf(paragraphWithName) + 3).join('.');
    
    if (nextSentences.match(/\bhe\b|\bhis\b|\bhim\b/i)) return 'male';
    if (nextSentences.match(/\bshe\b|\bher\b/i)) return 'female';
  }
  
  // Default to unknown
  return 'unknown';
}

// Fix dialogue patterns to be more natural
function fixDialoguePatterns(text) {
  // Replace awkward dialogue patterns
  text = text.replace(/"([^"]+)"\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said/g, (match, dialogue, name) => {
    // Enhance the dialogue
    const enhancedDialogue = enhanceDialogue(dialogue);
    return `"${enhancedDialogue}" ${name} said`;
  });
  
  // Fix patterns like "Ye Tian said coldly"
  text = text.replace(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*said\s*coldly\s*[.,]/g, (match, name) => {
    return `${name} said coldly,`;
  });
  
  // Fix patterns like "Character snorted coldly"
  text = text.replace(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s*snorted\s*coldly/g, (match, name) => {
    const options = [
      `${name} scoffed`,
      `${name} sneered`,
      `${name} laughed derisively`,
      `${name} gave a cold snort`
    ];
    return options[Math.floor(Math.random() * options.length)];
  });
  
  // Fix awkward exaggerated punctuation
  text = text.replace(/!{2,}/g, '!');
  text = text.replace(/\?{2,}/g, '?');
  
  // Fix spacing around punctuation
  text = text.replace(/([.,!?;:])(\w)/g, '$1 $2');
  
  // Fix common awkward phrasings
  text = text.replace(/not small/g, 'significant');
  text = text.replace(/let out an? ([a-z]+)/g, (match, emotion) => {
    if (['angry', 'furious', 'rage'].includes(emotion)) {
      return 'let out a roar of anger';
    } else if (['cold', 'chill'].includes(emotion)) {
      return 'spoke with cold disdain';
    } else {
      return `let out a ${emotion}`;
    }
  });
  
  return text;
}

// Enhance dialogue to be more natural
function enhanceDialogue(dialogue) {
  // Remove excessive punctuation
  dialogue = dialogue.replace(/!{2,}/g, '!');
  dialogue = dialogue.replace(/\?{2,}/g, '?');
  
  // Fix common awkward translations
  dialogue = dialogue.replace(/look for death/i, 'you\'re seeking death');
  dialogue = dialogue.replace(/seeking for death/i, 'seeking death');
  dialogue = dialogue.replace(/no way/i, 'impossible');
  dialogue = dialogue.replace(/it's not good/i, 'this is bad');
  dialogue = dialogue.replace(/you guys are not small/i, 'you guys are bold');
  
  // Fix common speech patterns
  dialogue = dialogue.replace(/^([A-Za-z]+),\s*([a-z])/g, '$1, $2');
  
  return dialogue;
}

// Fix pronouns based on character map
function fixPronouns(text) {
  Object.keys(characterMap).forEach(name => {
    if (characterMap[name].gender === 'unknown') return;
    
    const gender = characterMap[name].gender;
    const incorrectPronouns = gender === 'male' ? ['she', 'her'] : ['he', 'his', 'him'];
    const correctPronouns = gender === 'male' ? ['he', 'his', 'him'] : ['she', 'her', 'her'];
    
    // Find sentences with character name
    const nameSentenceRegex = new RegExp(`([^.!?]*${name}[^.!?]*)[.!?]`, 'g');
    const nameSentences = [...text.matchAll(nameSentenceRegex)];
    
    nameSentences.forEach(match => {
      const sentence = match[1];
      const sentenceIndex = match.index;
      
      // Check next few sentences for pronouns
      const followingSentences = text.substring(sentenceIndex, sentenceIndex + sentence.length + 200);
      
      // Fix incorrect pronouns
      incorrectPronouns.forEach((incorrect, i) => {
        const correct = correctPronouns[i];
        const pronounRegex = new RegExp(`\\b${incorrect}\\b`, 'g');
        
        if (followingSentences.match(pronounRegex)) {
          text = text.replace(
            new RegExp(`${escapeRegExp(sentence)}([^.!?]*${incorrect}\\b)`, 'g'),
            `${sentence}$1`.replace(pronounRegex, correct)
          );
        }
      });
    });
  });
  
  return text;
}

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "enhanceNow") {
    settings = request.settings;
    const success = enhancePage();
    // Send a response back to the popup
    sendResponse({ success: success });
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