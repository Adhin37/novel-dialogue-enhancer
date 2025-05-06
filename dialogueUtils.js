// dialogueUtils.js
/**
 * Dialogue enhancement utilities for Novel Dialogue Enhancer
 */
class DialogueUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Dialogue Utils initialized");
  }

  /**
   * Extract dialogue patterns from text
   * @param {string} text - The text to analyze
   * @return {object} - Extracted dialogue data
   */
  extractDialoguePatterns(text) {
    const dialoguePatterns = {
      quotedDialogue: [],
      colonSeparatedDialogue: [],
      actionDialogue: []
    };

    // Extract quoted dialogue: "This is dialogue," said Character.
    const quotedPattern = /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      dialoguePatterns.quotedDialogue.push({
        full: match[0],
        dialogue: match[1],
        attribution: match[2].trim()
      });
    }

    // Extract colon dialogue: Character: "This is dialogue."
    const colonPattern = /([^:]+):\s*"([^"]+)"/g;
    while ((match = colonPattern.exec(text)) !== null) {
      dialoguePatterns.colonSeparatedDialogue.push({
        full: match[0],
        character: match[1].trim(),
        dialogue: match[2]
      });
    }

    // Extract action dialogue: Character did something. "This is dialogue."
    const actionPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})\s+([^.!?]*[.!?])\s+"([^"]+)"/g;
    while ((match = actionPattern.exec(text)) !== null) {
      dialoguePatterns.actionDialogue.push({
        full: match[0],
        character: match[1],
        action: match[2],
        dialogue: match[3]
      });
    }

    return dialoguePatterns;
  }

  /**
   * Extract named characters from dialogue patterns
   * @param {object} dialoguePatterns - Extracted dialogue patterns
   * @return {Set} - Set of character names
   */
  extractCharactersFromDialogue(dialoguePatterns) {
    const characters = new Set();

    // Extract from quoted dialogue
    dialoguePatterns.quotedDialogue.forEach(item => {
      const attributionParts = item.attribution.split(/\s+/);
      if (attributionParts.length > 0) {
        const lastVerb = attributionParts[attributionParts.length - 1];
        const dialogueVerbs = ['said', 'asked', 'replied', 'shouted', 'whispered', 
                             'exclaimed', 'muttered', 'responded', 'commented'];
        
        if (dialogueVerbs.includes(lastVerb.toLowerCase())) {
          const potentialName = attributionParts.slice(0, -1).join(' ');
          if (this.isLikelyName(potentialName)) {
            characters.add(potentialName);
          }
        }
      }
    });

    // Extract from colon dialogue
    dialoguePatterns.colonSeparatedDialogue.forEach(item => {
      if (this.isLikelyName(item.character)) {
        characters.add(item.character);
      }
    });

    // Extract from action dialogue
    dialoguePatterns.actionDialogue.forEach(item => {
      if (this.isLikelyName(item.character)) {
        characters.add(item.character);
      }
    });

    return characters;
  }

  /**
   * Check if a string is likely to be a character name
   * @param {string} text - The text to check
   * @return {boolean} - True if likely a name
   */
  isLikelyName(text) {
    if (!text) return false;
    
    const nonNameWords = [
      "The", "Then", "This", "That", "These", "Those", "There", "Their", "They",
      "However", "Suddenly", "Finally", "Eventually", "Certainly", "Perhaps", 
      "Maybe", "While", "When", "After", "Before", "During", "Within", "Without",
      "Also", "Thus", "Therefore", "Hence", "Besides", "Moreover", "Although",
      "Despite", "Since", "Because", "Nonetheless", "Nevertheless", "Regardless",
      "Consequently", "Accordingly", "Meanwhile", "Afterwards", "Beforehand"
    ];
    
    // Check if it's a common non-name word
    if (nonNameWords.includes(text.trim())) {
      return false;
    }
    
    // Check if it starts with capital letter (typical for names)
    if (!/^[A-Z]/.test(text.trim())) {
      return false;
    }
    
    return true;
  }

  /**
   * Create a dialogue summary for LLM context
   * @param {Array} characters - Array of character objects with names and genders
   * @return {string} - Formatted dialogue summary for LLM
   */
  createDialogueSummary(characters) {
    let summary = "CHARACTER INFORMATION (to help maintain proper pronouns and gender references):\n";
    
    characters.forEach(char => {
      const pronounInfo = char.gender === 'male' ? 
          "he/him/his" : 
          char.gender === 'female' ? 
              "she/her/her" : 
              "unknown pronouns";
              
      summary += `- ${char.name}: ${char.gender || 'unknown'} (${pronounInfo}), appeared ${char.appearances || 'unknown'} times\n`;
    });
    
    return summary;
  }
}

if (typeof module !== "undefined") {
  module.exports = DialogueUtils;
} else {
  window.dialogueUtils = DialogueUtils;
}
