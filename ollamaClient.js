// ollamaClient.js
/**
 * Enhanced Ollama client module for Novel Dialogue Enhancer
 * Optimized for better integration with dialogueUtils and genderUtils
 */
class OllamaClient {
  constructor() {
    this.CLIENT_TIMEOUT = 200000; // Increased timeout for more complex prompts
    this.DEFAULT_CHUNK_SIZE = 8000;
    this.BATCH_DELAY = 800;
    this.API_ENDPOINT = "http://localhost:11434/api";
    this.cache = new Map(); // Simple cache for repeated prompts
    this.checkingAvailability = false;
    this.lastAvailabilityCheck = null;
    this.availabilityCache = null;

    console.log(
      "Novel Dialogue Enhancer: Ollama Client initialized with enhanced capabilities"
    );
  }

  /**
   * Get the configured LLM model name from storage
   * @return {Promise<string>} - Model name
   */
  async getModelName() {
    return new Promise((resolve) =>
      chrome.storage.sync.get({ modelName: "qwen3:8b" }, (data) =>
        resolve(data.modelName)
      )
    );
  }

  /**
   * Get the configured settings for LLM processing
   * @return {Promise<object>} - LLM settings
   */
  async getLLMSettings() {
    return new Promise((resolve) =>
      chrome.storage.sync.get(
        {
          modelName: "qwen3:8b",
          maxChunkSize: this.DEFAULT_CHUNK_SIZE,
          temperature: 0.3,
          topP: 0.9,
          contextSize: 8192
        },
        (data) => resolve(data)
      )
    );
  }

  /**
   * Enhanced text processing with LLM that integrates character information
   * @param {string} text - Text to enhance
   * @param {string} characterContext - Character information for context
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceWithLLM(text, characterContext = "") {
    console.time("enhanceWithLLM");
    try {
      // Make sure Ollama is available first
      const ollamaStatus = await this.checkOllamaAvailability();
      if (!ollamaStatus.available) {
        throw new Error(`Ollama not available: ${ollamaStatus.reason}`);
      }

      const settings = await this.getLLMSettings();
      console.log(
        `Using Ollama model: ${settings.modelName} with temperature: ${settings.temperature}`
      );

      const chunks = this.splitIntoChunks(text, settings.maxChunkSize);
      console.log(`Processing ${chunks.length} chunks with Ollama`);

      const enhancedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `Processing chunk ${i + 1}/${chunks.length} (size: ${chunk.length})`
        );

        // Build context that includes surrounding text and character information
        const contextInfo = this.buildChunkContext(chunks, i, characterContext);

        const prompt = this.createEnhancementPrompt(chunk, contextInfo);

        // Create cache key based on chunk content and prompt
        const cacheKey = this.hashString(chunk + contextInfo);

        let enhancedChunk;
        // Check if we have this result cached
        if (this.cache.has(cacheKey)) {
          console.log(`Using cached result for chunk ${i + 1}`);
          enhancedChunk = this.cache.get(cacheKey);
        } else {
          try {
            enhancedChunk = await this.processChunkWithLLM(
              settings.modelName,
              prompt,
              settings
            );
            // Cache the result
            this.cache.set(cacheKey, enhancedChunk);
            console.log(
              `Successfully enhanced chunk ${i + 1}/${chunks.length}`
            );
          } catch (chunkError) {
            console.warn(
              `Failed to enhance chunk ${i + 1}, using original:`,
              chunkError
            );
            enhancedChunk = chunk;
          }
        }

        enhancedChunks.push(enhancedChunk);

        if (i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY));
        }
      }

      const enhancedText = enhancedChunks.join("\n\n");
      console.timeEnd("enhanceWithLLM");
      return enhancedText;
    } catch (err) {
      console.timeEnd("enhanceWithLLM");
      console.error("LLM enhancement failed:", err);
      throw err; // Propagate error for better error handling in EnhancerIntegration
    }
  }

  /**
   * Build a context object that includes surrounding text chunks and character information
   * @param {Array<string>} chunks - All text chunks
   * @param {number} currentIndex - Current chunk index
   * @param {string} characterContext - Character information summary
   * @return {string} - Combined context information
   */
  buildChunkContext(chunks, currentIndex, characterContext) {
    let contextInfo = "";

    // Add character context if available
    if (characterContext && characterContext.trim().length > 0) {
      contextInfo += characterContext + "\n\n";
    }

    // Add previous chunk context for continuity
    if (currentIndex > 0 && chunks[currentIndex - 1]) {
      const prevChunkLines = chunks[currentIndex - 1].split("\n");
      // Get last paragraph or up to 3 sentences
      const lastParagraph = prevChunkLines.slice(-1)[0];
      if (lastParagraph && lastParagraph.length > 20) {
        contextInfo += `CONTEXT FROM PREVIOUS SECTION (for continuity reference only):\n${lastParagraph}\n\n`;
      }
    }

    // Add next chunk context for continuity
    if (currentIndex < chunks.length - 1 && chunks[currentIndex + 1]) {
      const nextChunkLines = chunks[currentIndex + 1].split("\n");
      // Get first paragraph or up to 3 sentences
      const firstParagraph = nextChunkLines[0];
      if (firstParagraph && firstParagraph.length > 20) {
        contextInfo += `CONTEXT FROM NEXT SECTION (for continuity reference only):\n${firstParagraph}\n\n`;
      }
    }

    return contextInfo;
  }

  /**
   * Create a comprehensive prompt for text enhancement that includes all necessary instructions
   * @param {string} chunk - Text chunk to enhance
   * @param {string} contextInfo - Context information including characters
   * @return {string} - Complete prompt for LLM
   */
  createEnhancementPrompt(chunk, contextInfo) {
    return `You are a dialogue enhancer for translated web novels. Your task is to enhance the following text to make it sound more natural in English.

${contextInfo}

INSTRUCTIONS:
0. IMPORTANT: Do not omit or remove any sentences or paragraphs. Every original paragraph must appear in the output, even if lightly edited for style or clarity.
1. Improve dialogue naturalness while preserving the original meaning
2. Make dialogue flow better in English
3. Keep all character names in the same language and exactly as provided
4. Fix pronoun inconsistencies based on the character information above
5. Briefly translate any foreign titles/cities/terms to English
6. IMPORTANT: Return ONLY the enhanced text with no explanations, analysis, or commentary
7. IMPORTANT: Do not use markdown formatting or annotations
8. Maintain paragraph breaks as in the original text as much as possible
9. Focus especially on maintaining gender consistency based on the character information provided
/no_think

TEXT TO ENHANCE:
  
${chunk}`;
  }

  /**
   * Split text into manageable chunks for processing
   * @param {string} text - Full text to split
   * @param {number} maxChunkSize - Maximum chunk size in characters
   * @return {Array<string>} - Array of text chunks
   */
  splitIntoChunks(text, maxChunkSize = 4000) {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    // Try to split on paragraph boundaries first
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      // If adding this paragraph would exceed the chunk size, start a new chunk
      if (
        currentChunk.length + paragraph.length + 2 > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }

      // Handle extremely long paragraphs by splitting on sentence boundaries
      if (paragraph.length > maxChunkSize) {
        if (currentChunk === paragraph) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          currentChunk = "";

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
            currentChunk = "";
          }
        }
      }
    }

    // Add any remaining text as the final chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log(
      `Split text into ${chunks.length} chunks (avg size: ${Math.round(
        text.length / chunks.length
      )})`
    );
    return chunks;
  }

  /**
   * Process a single chunk with the LLM
   * @param {string} model - Model name to use
   * @param {string} prompt - Prompt text for LLM
   * @param {object} settings - LLM settings (temperature, etc.)
   * @return {Promise<string>} - Enhanced text from LLM
   */
  async processChunkWithLLM(model, prompt, settings) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `LLM request timed out after ${
                this.CLIENT_TIMEOUT / 1000
              } seconds`
            )
          ),
        this.CLIENT_TIMEOUT
      );
    });

    const requestPromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "ollamaRequest",
          data: {
            model,
            prompt,
            max_tokens: Math.min(settings.contextSize, 4096),
            temperature: settings.temperature,
            top_p: settings.topP,
            stream: false
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("LLM communication error:", chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }

          if (response && response.error) {
            console.warn("LLM request failed:", response.error);
            return reject(new Error(response.error));
          }

          if (!response || !response.enhancedText) {
            console.warn("Invalid LLM response:", response);
            return reject(new Error("Invalid response from Ollama"));
          }

          const enhancedText = this.cleanLLMResponse(
            response.enhancedText || ""
          );
          resolve(enhancedText);
        }
      );
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  /**
   * Clean the LLM response to extract only the enhanced text
   * @param {string} llmResponse - Raw LLM response
   * @return {string} - Cleaned enhanced text
   */
  cleanLLMResponse(llmResponse) {
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

  /**
   * Check Ollama API availability
   * @return {Promise<object>} - Availability status
   */
  async checkOllamaAvailability() {
    // Return cached result if we checked recently (within 30 seconds)
    const now = Date.now();
    if (
      this.lastAvailabilityCheck &&
      now - this.lastAvailabilityCheck < 30000 &&
      this.availabilityCache
    ) {
      console.log(
        "Using cached Ollama availability result:",
        this.availabilityCache
      );
      return this.availabilityCache;
    }

    // Don't allow concurrent checks
    if (this.checkingAvailability) {
      console.log("Ollama availability check already in progress, waiting...");
      // Wait for the existing check to complete
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.checkingAvailability) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      return (
        this.availabilityCache || { available: false, reason: "Check failed" }
      );
    }

    this.checkingAvailability = true;
    console.log("Checking Ollama availability...");

    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "checkOllamaAvailability"
          },
          (response) => {
            this.checkingAvailability = false;
            this.lastAvailabilityCheck = Date.now();

            if (chrome.runtime.lastError) {
              console.warn(
                "Ollama check communication error:",
                chrome.runtime.lastError
              );

              const result = {
                available: false,
                reason: chrome.runtime.lastError.message
              };

              this.availabilityCache = result;
              resolve(result);
              return;
            }

            this.availabilityCache = response;
            resolve(response);
          }
        );
      });
    } catch (err) {
      this.checkingAvailability = false;
      console.warn("Ollama availability check failed:", err);

      const result = { available: false, reason: err.message };
      this.availabilityCache = result;
      return result;
    }
  }

  /**
   * Create a hash string for caching purposes
   * @param {string} input - String to hash
   * @return {string} - Hash string
   */
  hashString(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    console.log("Cleared OllamaClient cache");
  }
}

if (typeof module !== "undefined") {
  module.exports = OllamaClient;
} else {
  window.ollamaClient = OllamaClient;
}
