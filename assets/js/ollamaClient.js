// ollamaClient.js
/**
 * Enhanced Ollama client module for Novel Dialogue Enhancer
 * Optimized for better integration with genderUtils and novelUtils
 */
class OllamaClient {
  constructor() {
    this.CLIENT_TIMEOUT = 200000;
    this.DEFAULT_CHUNK_SIZE = 8000;
    this.DEFAULT_TIMEOUT = 200;
    this.DEFAULT_TEMPERATURE = 0.4;
    this.DEFAULT_TOP_P = 0.9;
    this.DEFAULT_CONTEXT_SIZE = 8192;
    this.DEFAULT_MODEL = "qwen3:8b";
    this.BATCH_DELAY = 800;
    this.API_ENDPOINT = "http://localhost:11434/api";
    this.responseCache = new Map(); // Simple cache for repeated prompts
    this.isCheckingAvailability = false;
    this.lastAvailabilityCheckTime = null;
    this.cachedAvailabilityStatus = null;

    console.log(
      "Novel Dialogue Enhancer: Ollama Client initialized with enhanced capabilities"
    );
  }

  /**
   * Get the configured settings for LLM processing
   * @return {Promise<object>} - LLM settings
   */
  async getLLMSettings() {
    return new Promise((resolve, reject) =>
      chrome.storage.sync.get(
        {
          modelName: this.DEFAULT_MODEL,
          maxChunkSize: this.DEFAULT_CHUNK_SIZE,
          timeout: this.DEFAULT_TIMEOUT,
          temperature: this.DEFAULT_TEMPERATURE,
          topP: this.DEFAULT_TOP_P,
          contextSize: this.DEFAULT_CONTEXT_SIZE
        },
        (data) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error getting LLM settings:",
              chrome.runtime.lastError
            );
            return reject(chrome.runtime.lastError);
          }
          resolve(data);
        }
      )
    );
  }

  /**
   * Enhanced text processing with LLM that integrates character information
   * @param {string} text - Text to enhance
   * @param {string} characterContext - Character information for context
   * @param {object} novelInfo - Novel style information
   * @return {Promise<string>} - Enhanced text
   */
  async enhanceWithLLM(
    text,
    characterContext = "",
    novelInfo = { style: "standard narrative", tone: "neutral" }
  ) {
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

      const textChunks = this.splitIntoChunks(text, settings.maxChunkSize);
      const enhancedChunks = await this.processChunks(
        textChunks,
        characterContext,
        novelInfo,
        settings
      );

      const enhancedText = enhancedChunks.join("\n\n");
      console.timeEnd("enhanceWithLLM");
      return this.cleanLLMResponse(enhancedText);
    } catch (err) {
      console.timeEnd("enhanceWithLLM");
      console.error("LLM enhancement failed:", err);
      throw err;
    }
  }

  /**
   * Process all text chunks sequentially
   * @param {Array<string>} chunks - Text chunks to process
   * @param {string} characterContext - Character information
   * @param {object} novelInfo - Novel style information
   * @param {object} settings - LLM settings
   * @return {Promise<Array<string>>} - Array of enhanced text chunks
   */
  async processChunks(chunks, characterContext, novelInfo, settings) {
    const enhancedChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(
        `Processing chunk ${i + 1}/${chunks.length} (size: ${chunk.length})`
      );

      // Build context that includes surrounding text and character information
      const contextInfo = this.buildChunkContext(chunks, i);
      const prompt = this.createEnhancedPrompt(
        chunk,
        characterContext,
        contextInfo,
        novelInfo
      );

      // Create cache key based on chunk content and prompt
      const cacheKey = this.hashString(chunk + contextInfo);

      const enhancedChunk = await this.getEnhancedChunk(
        cacheKey,
        settings.modelName,
        prompt,
        settings,
        chunk
      );
      enhancedChunks.push(enhancedChunk);

      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY));
      }
    }

    return enhancedChunks;
  }

  /**
   * Get enhanced version of a single chunk, using cache when possible
   * @param {string} cacheKey - Unique key for caching
   * @param {string} modelName - LLM model to use
   * @param {string} prompt - Prompt for the LLM
   * @param {object} settings - LLM settings
   * @param {string} originalChunk - Original text chunk as fallback
   * @return {Promise<string>} - Enhanced text chunk
   */
  async getEnhancedChunk(cacheKey, modelName, prompt, settings, originalChunk) {
    // Check if we have this result cached
    if (this.responseCache.has(cacheKey)) {
      console.log("Using cached result for chunk");
      return this.responseCache.get(cacheKey);
    }

    try {
      const enhancedChunk = await this.processChunkWithLLM(
        modelName,
        prompt,
        settings
      );
      // Cache the result
      this.responseCache.set(cacheKey, enhancedChunk);
      console.log("Successfully enhanced chunk");
      return enhancedChunk;
    } catch (chunkError) {
      console.warn("Failed to enhance chunk, using original:", chunkError);
      return originalChunk;
    }
  }

  /**
   * Build a context object that includes surrounding text chunks for coherence
   * @param {Array<string>} chunks - All text chunks
   * @param {number} currentIndex - Current chunk index
   * @return {string} - Combined context information
   */
  buildChunkContext(chunks, currentIndex) {
    let contextInfo = "";

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
   * Create a comprehensive prompt for text enhancement with proper instructions
   * @param {string} chunk - Text chunk to enhance
   * @param {string} characterContext - Character information
   * @param {string} contextInfo - Context from surrounding chunks
   * @param {object} novelInfo - Novel style information
   * @return {string} - Complete prompt for LLM
   */
  createEnhancedPrompt(chunk, characterContext, contextInfo, novelInfo) {
    return `You are a dialogue enhancer for translated web novels. Your task is to enhance the following web novel text to improve dialogue attribution and clarity.
The novel's style is ${novelInfo.style} with a ${novelInfo.tone} tone.

Characters information (name, gender, appearances):
${characterContext}

${contextInfo}

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
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      // Handle normal paragraphs
      if (paragraph.length <= maxChunkSize) {
        if (
          currentChunk.length + paragraph.length + 2 > maxChunkSize &&
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

        this.splitLongParagraph(paragraph, maxChunkSize, chunks);
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
   * Split a very long paragraph into sentence-based chunks
   * @param {string} paragraph - Long paragraph to split
   * @param {number} maxChunkSize - Maximum chunk size
   * @param {Array<string>} chunks - Array to populate with chunks
   */
  splitLongParagraph(paragraph, maxChunkSize, chunks) {
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
              `LLM request timed out after ${settings.timeout / 1000} seconds`
            )
          ),
        settings.timeout * 1000
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

          const enhancedText = this.cleanLLMResponse(response.enhancedText);
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
   * Check Ollama API availability with caching
   * @return {Promise<object>} - Availability status
   */
  async checkOllamaAvailability() {
    const CACHE_TTL = 30000; // 30 seconds
    const CHECK_TIMEOUT = 15000; // 15 seconds timeout

    // Return cached result if it's recent enough
    const isCacheValid =
      this.lastAvailabilityCheckTime &&
      Date.now() - this.lastAvailabilityCheckTime < CACHE_TTL &&
      this.cachedAvailabilityStatus;

    if (isCacheValid) {
      return this.cachedAvailabilityStatus;
    }

    // If a check is already in progress, don't start another one
    if (this.isCheckingAvailability) {
      console.log("Ollama availability check already in progress, waiting...");

      try {
        // Wait for the existing check to complete with a timeout
        const result = await Promise.race([
          // Wait for the check to complete
          new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              if (!this.isCheckingAvailability) {
                clearInterval(checkInterval);
                resolve(this.cachedAvailabilityStatus);
              }
            }, 100);
          }),
          // Timeout after 5 seconds of waiting
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new Error("Timed out waiting for availability check")),
              5000
            )
          )
        ]);

        return result || { available: false, reason: "Check failed" };
      } catch (error) {
        console.warn("Waiting for Ollama check timed out:", error);
        // Reset the flag if we timed out waiting
        this.isCheckingAvailability = false;
        return { available: false, reason: "Check timeout" };
      }
    }

    // Set checking flag and clear it in case of errors
    this.isCheckingAvailability = true;
    console.log("Checking Ollama availability...");

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Ollama check timed out")),
          CHECK_TIMEOUT
        );
      });

      // Create the actual check promise
      const checkPromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "checkOllamaAvailability" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Ollama check communication error:",
                chrome.runtime.lastError
              );

              const result = {
                available: false,
                reason: chrome.runtime.lastError.message
              };

              this.cachedAvailabilityStatus = result;
              resolve(result);
              return;
            }

            this.cachedAvailabilityStatus = response;
            resolve(response);
          }
        );
      });

      // Race the promises
      const result = await Promise.race([checkPromise, timeoutPromise]);
      this.lastAvailabilityCheckTime = Date.now();
      return result;
    } catch (err) {
      console.warn("Ollama availability check failed:", err);
      const result = { available: false, reason: err.message };
      this.cachedAvailabilityStatus = result;
      return result;
    } finally {
      // Always reset the checking flag when we're done
      this.isCheckingAvailability = false;
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
   * Clear the response cache
   */
  clearCache() {
    this.responseCache.clear();
    console.log("Cleared OllamaClient cache");
  }
}

if (typeof module !== "undefined") {
  module.exports = OllamaClient;
} else {
  window.ollamaClient = OllamaClient;
}
