// textProcessor.js
/**
 * Utility for processing text in manageable chunks for LLM processing
 */
class TextProcessor {
  /**
   * Creates a new TextProcessor instance
   * @param {object} options - Configuration options
   * @param {number} options.maxChunkSize - Maximum chunk size in characters (default: 4000)
   */
  constructor(options = {}) {
    this.maxChunkSize =
      options.maxChunkSize || Constants.DEFAULTS.MAX_CHUNK_SIZE;
    this.logger = window.logger;

    this.logger.debug(
      `Novel Dialogue Enhancer: Text Processor initialized (max chunk size: ${this.maxChunkSize})`
    );
  }

  /**
   * Split text into manageable chunks for processing
   * @param {string} text - Full text to split
   * @param {number} [maxChunkSize] - Override default maximum chunk size
   * @return {Array<string>} - Array of text chunks
   */
  splitIntoChunks(text, maxChunkSize) {
    const chunkSize = maxChunkSize || this.maxChunkSize;

    if (!text || text.length <= 0) {
      return [];
    }

    if (text.length <= chunkSize) {
      return [text];
    }

    const chunks = [];
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      // Handle normal paragraphs
      if (paragraph.length <= chunkSize) {
        if (
          currentChunk.length + paragraph.length + 2 > chunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        }
      }
      // Handle extremely long paragraphs by splitting on sentence boundaries
      else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }

        this.#splitLongParagraph(paragraph, chunkSize, chunks);
      }
    }

    // Add any remaining text as the final chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    this.logger.info(
      `Split text into ${chunks.length} chunks (avg size: ${Math.round(
        text.length / chunks.length
      )})`
    );
    return chunks;
  }

  /**
   * Split a very long paragraph into sentence-based chunks
   * @param {string} paragraph - Long paragraph to split
   * @param {number} maxChunkSize - Maximum chunk size
   * @param {Array<string>} chunks - Array to populate with chunks
   * @private
   */
  #splitLongParagraph(paragraph, maxChunkSize, chunks) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    let currentChunk = "";

    for (const sentence of sentences) {
      if (
        currentChunk.length + sentence.length > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
  }

  /**
   * Build a context object that includes surrounding text chunks for coherence
   * @param {Array<string>} chunks - All text chunks (may include enhanced and original)
   * @param {number} currentIndex - Current chunk index
   * @return {string} - Combined context information
   */
  buildChunkContext(chunks, currentIndex) {
    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return "";
    }

    let contextInfo = "";

    // Add previous chunk context for continuity (use enhanced version if available)
    if (currentIndex > 0 && chunks[currentIndex - 1]) {
      const prevChunkLines = chunks[currentIndex - 1].split("\n");
      // Get last paragraph or up to 3 sentences
      const lastParagraph = prevChunkLines.slice(-1)[0];
      if (lastParagraph && lastParagraph.length > 20) {
        contextInfo += `CONTEXT FROM PREVIOUS SECTION (enhanced, for continuity reference only):\n${lastParagraph}\n\n`;
      }
    }

    // Add next chunk context for continuity (will be original text)
    if (currentIndex < chunks.length - 1 && chunks[currentIndex + 1]) {
      const nextChunkLines = chunks[currentIndex + 1].split("\n");
      // Get first paragraph or up to 3 sentences
      const firstParagraph = nextChunkLines[0];
      if (firstParagraph && firstParagraph.length > 20) {
        contextInfo += `CONTEXT FROM NEXT SECTION (original, for continuity reference only):\n${firstParagraph}\n\n`;
      }
    }

    return contextInfo;
  }

  /**
   * Clean the LLM response to extract only the enhanced text
   * @param {string} llmResponse - Raw LLM response
   * @return {string} - Cleaned enhanced text
   */
  cleanLLMResponse(llmResponse) {
    if (!llmResponse) return "";

    // If the response contains markdown code blocks, remove them
    let cleanedText = llmResponse.replace(/```[\s\S]*?```/g, "");

    // Remove potential explanations or notes at the beginning/end
    cleanedText = cleanedText.replace(
      /^(Here is the enhanced text:|The enhanced text:|Enhanced text:|Enhanced version:)/i,
      ""
    );

    // Remove any final notes
    cleanedText = cleanedText.replace(
      /(Note:.*$)|(I hope this helps.*$)/im,
      ""
    );

    return cleanedText.trim();
  }
}

if (typeof module !== "undefined") {
  module.exports = TextProcessor;
} else {
  window.TextProcessor = TextProcessor;
}
