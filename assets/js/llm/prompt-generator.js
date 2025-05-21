// promptGenerator.js
/**
 * Utility for generating consistent prompts for LLM processing
 */
class PromptGenerator {
  constructor() {
    console.log("Novel Dialogue Enhancer: Prompt Generator initialized");
  }

  /**
   * Creates a comprehensive prompt for text enhancement with proper instructions
   * @param {string} chunk - Text chunk to enhance
   * @param {string} characterContext - Character information
   * @param {string} contextInfo - Context from surrounding chunks
   * @param {object} novelInfo - Novel style information
   * @return {string} - Complete prompt for LLM
   */
  createEnhancementPrompt(chunk, characterContext, contextInfo, novelInfo) {
    if (!chunk) return "";

    // Default values for novelInfo
    const style = novelInfo?.style || "standard narrative";
    const tone = novelInfo?.tone || "neutral";
    
    return `You are a dialogue enhancer for translated web novels. Your task is to enhance the following web novel text to improve dialogue attribution and clarity.
The novel's style is ${style} with a ${tone} tone.

Characters information (name, gender, appearances):
${characterContext || "No character information available"}

${contextInfo || ""}

INSTRUCTIONS:
1. Improve dialogue naturalness while preserving the original meaning
2. Make dialogue flow better in English
3. Keep all character names in the same language and exactly as provided
4. Fix pronoun inconsistencies based on the character information above
5. Briefly translate any foreign titles/cities/terms to English
6. IMPORTANT: Return ONLY the enhanced text with no explanations, analysis, or commentary
7. IMPORTANT: Do not use markdown formatting or annotations
8. Maintain paragraph breaks as in the original text as much as possible
9. Focus especially on maintaining gender consistency based on the character information provided
10. Don't change the story or add new plot elements
11. Maintain the original tone and mood
/no_think

TEXT TO ENHANCE:
  
${chunk}`;
  }

  /**
   * Creates a prompt for analyzing novel style
   * @param {string} sample - Text sample to analyze
   * @return {string} - Style analysis prompt
   */
  createStyleAnalysisPrompt(sample) {
    if (!sample) return "";
    
    // Get a reasonable size sample for analysis
    const textSample = sample.substring(0, 2500);

    return `Analyze the style and tone of the following novel text sample. Respond in JSON format only with the following structure:
{
  "style": "genre or style name",
  "tone": "descriptive tone",
  "confidence": 0.0 to 1.0
}

Style should be one of: standard narrative, eastern cultivation, western fantasy, science fiction, historical fiction, romance, mystery, horror, thriller.
You may add qualifiers if relevant (like "first-person" or "dialogue-heavy").

Tone should be one of: formal, casual, humorous, dark, inspirational, melancholic, adventurous, romantic, technical.
You may also add qualifiers if needed.

Confidence should reflect how certain you are about the classification.

SAMPLE TEXT:
${textSample}
`;
  }

  /**
   * Create a prompt for character gender determination
   * @param {string} characterName - Character name
   * @param {string} contextText - Text surrounding the character
   * @return {string} - Gender analysis prompt
   */
  createGenderAnalysisPrompt(characterName, contextText) {
    if (!characterName) return "";
    
    // Limit context text to a reasonable size
    const limitedContext = contextText.substring(0, 2000);

    return `Determine the likely gender of the character "${characterName}" based on the following text. 
Respond in JSON format only with this structure:
{
  "gender": "male, female, or unknown",
  "confidence": 0.0 to 1.0,
  "evidence": ["reason 1", "reason 2"]
}

Keep evidence brief and list up to 3 specific reasons for your determination.
If uncertain, return "unknown" for gender and explain why.

CONTEXT TEXT:
${limitedContext}
`;
  }
}

if (typeof module !== "undefined") {
  module.exports = PromptGenerator;
} else {
  window.PromptGenerator = PromptGenerator;
}
