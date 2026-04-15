import { logger } from "../utils/logger.js";

// promptGenerator.js
/**
 * Utility for generating consistent prompts for LLM processing
 */
export class PromptGenerator {
  /**
   * Creates a new PromptGenerator instance
   */
  constructor() {
    this.logger = logger;
    this.logger.debug("Novel Dialogue Enhancer: Prompt Generator initialized");
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

    return `You are an expert at enhancing translated web novels. Your task is to improve the following ${contextInfo ? "text section" : "chapter"} to make dialogue and narration sound more natural in English.
The novel's style is ${style} with a ${tone} tone.

Characters (name, gender):
${characterContext || "No character information available"}

${contextInfo ? contextInfo + "\n" : ""}CRITICAL RULES:
- Keep ALL character names exactly as written — never translate or change them
- Preserve EVERY story event, plot detail, and sentence meaning
- Maintain the exact number of paragraphs — do not merge or split paragraphs
- Maintain the same emotional tone and mood throughout
- If a sentence is already natural, leave it unchanged
- Return ONLY the enhanced text, no explanations, headers, or commentary

INSTRUCTIONS:
1. Make dialogue feel natural in English while preserving the original meaning
2. Fix pronoun inconsistencies using the character information above
3. Translate inline foreign titles, honorifics, and place names to English
4. Preserve paragraph breaks exactly as in the original
5. Do not use markdown formatting, annotations, or code blocks
6. Maintain gender consistency throughout based on the character list above
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


