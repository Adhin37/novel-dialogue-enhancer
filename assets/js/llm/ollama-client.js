// ollamaClient.js
/**
 * Ollama client module for Novel Dialogue Enhancer
 * Handles API communication with Ollama service
 */
class OllamaClient {
  /**
   * Creates a new OllamaClient instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.API_ENDPOINT = options.endpoint || Constants.API.OLLAMA_BASE + "/api";
    this.CLIENT_TIMEOUT = options.timeout || Constants.API.TIMEOUT;
    this.isCheckingAvailability = false;
    this.lastAvailabilityCheckTime = null;
    this.cachedAvailabilityStatus = null;
    this.logger = window.logger;

    this.logger.debug("Novel Dialogue Enhancer: Ollama Client initialized");
  }

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
      this.logger.info(
        "Ollama availability check already in progress, waiting..."
      );

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
        this.logger.warn("Waiting for Ollama check timed out:", error);
        // Reset the flag if we timed out waiting
        this.isCheckingAvailability = false;
        return { available: false, reason: "Check timeout" };
      }
    }

    // Set checking flag and clear it in case of errors
    this.isCheckingAvailability = true;
    this.logger.debug("Checking Ollama availability...");

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
              this.logger.warn(
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
      this.logger.warn("Ollama availability check failed:", err);
      const result = { available: false, reason: err.message };
      this.cachedAvailabilityStatus = result;
      return result;
    } finally {
      // Always reset the checking flag when we're done
      this.isCheckingAvailability = false;
    }
  }

  /**
   * Processes text with LLM
   * @param {string} model - LLM model name
   * @param {string} prompt - LLM prompt
   * @param {object} options - LLM options
   * @param {number} options.timeout - Request timeout in seconds
   * @param {number} options.max_tokens - Maximum tokens
   * @param {number} options.temperature - Temperature
   * @param {number} options.top_p - Top P
   * @returns {Promise<string>} - Processed text
   */
  async processWithLLM(model, prompt, options = {}) {
    const timeoutDuration = options.timeout || 60;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(`LLM request timed out after ${timeoutDuration} seconds`)
          ),
        timeoutDuration * 1000
      );
    });

    const requestPromise = new Promise((resolve, reject) => {
      const requestData = {
        model: model,
        prompt: prompt,
        max_tokens: options.max_tokens || 4096,
        temperature: options.temperature || 0.4,
        top_p: options.top_p || 0.9,
        stream: false
      };

      chrome.runtime.sendMessage(
        {
          action: "ollamaRequest",
          data: requestData,
          cacheKey: options.cacheKey
        },
        (response) => {
          if (chrome.runtime.lastError) {
            this.logger.warn(
              "LLM communication error:",
              chrome.runtime.lastError
            );
            return reject(chrome.runtime.lastError);
          }

          if (response && response.error) {
            this.logger.warn("LLM request failed:", response.error);
            return reject(new Error(response.error));
          }

          if (!response || !response.enhancedText) {
            this.logger.warn("Invalid LLM response:", response);
            return reject(new Error("Invalid response from Ollama"));
          }

          resolve(response.enhancedText);
        }
      );
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  /**
   * Get the available models from Ollama
   * @return {Promise<Array<string>>} - List of available models
   */
  async getAvailableModels() {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: "getOllamaModels" }, (response) => {
        if (chrome.runtime.lastError) {
          this.logger.warn(
            "Error getting Ollama models:",
            chrome.runtime.lastError
          );
          return reject(chrome.runtime.lastError);
        }

        if (!response || !response.models) {
          return resolve([]);
        }

        resolve(response.models);
      });
    });
  }

  /**
   * Get the configured settings for LLM processing
   * @return {Promise<object>} - LLM settings
   */
  async getLLMSettings() {
    return new Promise((resolve, reject) =>
      chrome.storage.sync.get(
        {
          modelName: "qwen3:8b",
          timeout: 200,
          temperature: 0.4,
          topP: 0.9,
          contextSize: 8192
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
}

if (typeof module !== "undefined") {
  module.exports = OllamaClient;
} else {
  window.OllamaClient = OllamaClient;
}
