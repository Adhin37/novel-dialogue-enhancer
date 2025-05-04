// enhancerIntegration.js - Integration module for Novel Dialogue Enhancer
// This module combines the functionality of dialogueUtils and genderUtils
// to provide a unified interface for text enhancement

// Enhancement statistics tracking
const enhancementStats = {
  totalDialoguesEnhanced: 0,
  totalPronounsFixed: 0,
  totalCharactersDetected: 0,
  processingTime: 0
};

/**
 * Initialize the enhancer integration
 */
function initEnhancerIntegration() {
  // Reset stats
  enhancementStats.totalDialoguesEnhanced = 0;
  enhancementStats.totalPronounsFixed = 0;
  enhancementStats.totalCharactersDetected = 0;
  enhancementStats.processingTime = 0;

  console.log("Novel Dialogue Enhancer: Integration module initialized");
}

/**
 * Enhance text with all available improvements
 * @param {string} text - The text to enhance
 * @param {object} settings - Enhancement settings
 * @param {object} characterMap - Existing character data
 * @return {object} - Enhanced text and updated character map
 */
function enhanceTextIntegrated(text, settings, characterMap = {}) {
  const startTime = performance.now();

  // Extract character names and update map if needed
  if (settings.preserveNames || settings.fixPronouns) {
    // FIXED: Don't call back to content.js's extractCharacterNames
    // Instead use our own implementation directly
    characterMap = extractCharacterNamesInternal(text, characterMap);
  }

  // First, fix overall dialogue patterns
  let enhancedText = text;

  // Find and enhance dialogue
  enhancedText = enhancedText.replace(/"([^"]+)"/g, (match, dialogue) => {
    const enhanced = window.dialogueUtils.enhanceDialogue(dialogue);
    if (enhanced !== dialogue) {
      enhancementStats.totalDialoguesEnhanced++;
    }
    return `"${enhanced}"`;
  });

  // Apply overall dialogue pattern fixes
  enhancedText = window.dialogueUtils.fixDialoguePatterns(enhancedText);

  // Fix pronouns if enabled
  if (settings.fixPronouns) {
    enhancedText = fixPronounsIntegrated(enhancedText, characterMap);
  }

  // Calculate processing time
  enhancementStats.processingTime += performance.now() - startTime;

  return {
    enhancedText,
    characterMap
  };
}

/**
 * Extract character names from text and determine their gender
 * @param {string} text - The text to analyze
 * @param {object} existingMap - Existing character data
 * @return {object} - Updated character map
 */
function extractCharacterNamesInternal(text, existingMap = {}) {
  const characterMap = { ...existingMap };

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
        const gender = window.genderUtils.guessGender(name, text, characterMap);
        characterMap[name] = {
          gender,
          appearances: 1
        };
        enhancementStats.totalCharactersDetected++;
      } else {
        // Update existing character data
        characterMap[name].appearances = (characterMap[name].appearances || 0) + 1;
      }
    }
  }

  return characterMap;
}

/**
 * Check if a potential name is actually a common word or phrase
 * that shouldn't be considered a character name
 */
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

/**
 * Fix pronouns based on character map
 * @param {string} text - The text to fix
 * @param {object} characterMap - Character data with gender information
 * @return {string} - Text with fixed pronouns
 */
function fixPronounsIntegrated(text, characterMap) {
  let fixedText = text;
  let fixCount = 0;

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
          fixCount++;
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
          fixCount++;
        }
      }
    });
  });

  enhancementStats.totalPronounsFixed += fixCount;
  return fixedText;
}

/**
 * Escape special characters for regex
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get the current enhancement statistics
 * @return {object} - Enhancement statistics
 */
function getEnhancementStats() {
  return {
    totalDialoguesEnhanced: enhancementStats.totalDialoguesEnhanced,
    totalPronounsFixed: enhancementStats.totalPronounsFixed,
    totalCharactersDetected: enhancementStats.totalCharactersDetected,
    processingTime: Math.round(enhancementStats.processingTime)
  };
}

// Export functions for content script
if (typeof module !== 'undefined') {
  module.exports = {
    initEnhancerIntegration,
    enhanceTextIntegrated,
    extractCharacterNamesInternal, // Renamed to avoid confusion
    fixPronounsIntegrated,
    getEnhancementStats
  };
} else {
  // For direct browser usage
  window.enhancerIntegration = {
    initEnhancerIntegration,
    enhanceTextIntegrated,
    extractCharacterNames: extractCharacterNamesInternal, // For backward compatibility 
    fixPronounsIntegrated,
    getEnhancementStats
  };
}