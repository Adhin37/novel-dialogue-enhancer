import { logger } from "./logger.js";
import { SharedUtils } from "./shared-utils.js";

/**
 * Utility class for tracking and managing statistics in the Novel Dialogue Enhancer
 */
export class StatsUtils {
  /**
   * Creates a new StatsUtils instance
   */
  constructor() {
    this.totalDialoguesEnhanced = 0;
    this.totalCharactersDetected = 0;
    this.processingTime = 0;
    this.totalWordsProcessed = 0;
    this.compressionRatio = 1.0;
    this.errorCount = 0;
    this.logger = logger;
  }

  #set(prop, value, label) {
    if (!SharedUtils.isValidNumber(value)) {
      this.logger.error(`Invalid ${label} value`);
      return;
    }
    this[prop] += value;
  }

  setTotalWordsProcessed(wordsProcessed) {
    this.#set("totalWordsProcessed", wordsProcessed, "wordsProcessed");
  }

  setCompressionRatio(ratio) {
    if (!SharedUtils.isValidNumber(ratio)) {
      this.logger.error("Invalid compressionRatio value");
      return;
    }
    this.compressionRatio = ratio;
  }

  setTotalDialoguesEnhanced(dialoguesEnhanced) {
    this.#set("totalDialoguesEnhanced", dialoguesEnhanced, "dialoguesEnhanced");
  }

  setTotalCharactersDetected(charactersDetected) {
    this.#set("totalCharactersDetected", charactersDetected, "charactersDetected");
  }

  setProcessingTime(processingTime) {
    this.#set("processingTime", processingTime, "processingTime");
  }

  /**
   * Increment error count
   */
  incrementErrorCount() {
    this.errorCount += 1;
  }

  /**
   * Get statistics
   * @return {object} - Statistics object
   */
  getStats() {
    return {
      totalDialoguesEnhanced: this.totalDialoguesEnhanced,
      totalCharactersDetected: this.totalCharactersDetected,
      processingTime: this.processingTime,
      totalWordsProcessed: this.totalWordsProcessed,
      compressionRatio: this.compressionRatio,
      errorCount: this.errorCount
    };
  }

}

