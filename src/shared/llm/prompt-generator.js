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
   * Creates a prompt for text enhancement
   * @param {string} chunk - Text chunk to enhance
   * @param {string} characterContext - Character information
   * @param {object} novelInfo - Novel style information
   * @return {string} - Complete prompt for LLM
   */
  createEnhancementPrompt(chunk, characterContext, novelInfo) {
    if (!chunk) return "";

    const rawStyle = novelInfo?.style || "standard narrative";
    const tone = novelInfo?.tone || "neutral";

    // Strip parenthetical modifiers for the genre label; extract as explicit rules instead
    const baseStyle = rawStyle.replace(/\s*\([^)]*\)/g, "").trim();

    const cultivationNote = rawStyle.includes("cultivation")
      ? "\n- Keep cultivation terms (qi, dao, dantian, nascent soul, etc.) unchanged"
      : "";
    const perspectiveNote = rawStyle.includes("first-person")
      ? "\n- Maintain first-person perspective (I/me/my)"
      : "";
    const tenseNote = rawStyle.includes("present tense")
      ? "\n- Maintain present tense throughout"
      : "";

    return `Enhance this ${baseStyle} translated novel excerpt to read naturally in English. Tone: ${tone}.

Characters and pronouns:
${characterContext || "None provided"}

Rules:
- Never alter character names, plot events, or paragraph count
- Fix pronoun errors using the character list above
- Translate relationship honorifics (Shixiong → Senior Brother, Shifu → Master, etc.)${cultivationNote}${perspectiveNote}${tenseNote}
- Improve awkward phrasing; leave natural sentences unchanged
- Output only the enhanced text — no explanations or markdown
/no_think

TEXT:
${chunk}`;
  }
}


