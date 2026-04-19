import { logger } from "../utils/logger.js";
import { OllamaConfig } from "./ollama-config.js";

// ollamaClient.js
/**
 * Ollama client module for Novel Dialogue Enhancer
 * Handles API communication with Ollama service
 */
export class OllamaClient {
  /**
   * Creates a new OllamaClient instance
   * @param {object} options - Configuration options
   */
  constructor(options = {}) {
    this.API_ENDPOINT = options.endpoint || OllamaConfig.API.BASE + "/api";
    this.CLIENT_TIMEOUT = options.timeout || OllamaConfig.API.TIMEOUT;
    this.isCheckingAvailability = false;
    this.lastAvailabilityCheckTime = null;
    this.cachedAvailabilityStatus = null;
    this._checkPromise = null;
    this._resolveCheck = null;
    this.logger = logger;

    this.logger.debug("Novel Dialogue Enhancer: Ollama Client initialized");
  }

  #withTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
  }

  async checkOllamaAvailability() {
    const CACHE_TTL = 30000;
    const CHECK_TIMEOUT = 15000;

    const isCacheValid =
      this.lastAvailabilityCheckTime &&
      Date.now() - this.lastAvailabilityCheckTime < CACHE_TTL &&
      this.cachedAvailabilityStatus;

    if (isCacheValid) {
      return this.cachedAvailabilityStatus;
    }

    if (this.isCheckingAvailability) {
      this.logger.info("Ollama availability check already in progress, waiting...");
      try {
        const result = await this.#withTimeout(this._checkPromise, 5000, "Timed out waiting for availability check");
        return result || { available: false, reason: "Check failed" };
      } catch (error) {
        this.logger.warn("Waiting for Ollama check timed out:", error);
        this.isCheckingAvailability = false;
        return { available: false, reason: "Check timeout" };
      }
    }

    this.isCheckingAvailability = true;
    this._checkPromise = new Promise(resolve => { this._resolveCheck = resolve; });
    this.logger.debug("Checking Ollama availability...");

    try {
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

      const result = await this.#withTimeout(checkPromise, CHECK_TIMEOUT, "Ollama check timed out");
      this.lastAvailabilityCheckTime = Date.now();
      return result;
    } catch (err) {
      this.logger.warn("Ollama availability check failed:", err);
      const result = { available: false, reason: err.message };
      this.cachedAvailabilityStatus = result;
      return result;
    } finally {
      this._resolveCheck?.(this.cachedAvailabilityStatus);
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

    const requestPromise = new Promise((resolve, reject) => {
      const requestData = {
        model: model,
        prompt: prompt,
        num_predict: options.num_predict || options.max_tokens || 8192,
        num_ctx: options.num_ctx || OllamaConfig.LLM.CONTEXT_SIZE,
        temperature: options.temperature || OllamaConfig.LLM.TEMPERATURE,
        top_p: options.top_p || OllamaConfig.LLM.TOP_P,
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

    return this.#withTimeout(requestPromise, timeoutDuration * 1000, `LLM request timed out after ${timeoutDuration} seconds`);
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
          modelName:   OllamaConfig.LLM.MODEL_NAME,
          timeout:     OllamaConfig.LLM.TIMEOUT,
          temperature: OllamaConfig.LLM.TEMPERATURE,
          topP:        OllamaConfig.LLM.TOP_P,
          contextSize: OllamaConfig.LLM.CONTEXT_SIZE
        },
        (data) => {
          if (chrome.runtime.lastError) {
            this.logger.error(
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


