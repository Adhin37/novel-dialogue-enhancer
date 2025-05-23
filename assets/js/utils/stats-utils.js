/**
 * Utility class for tracking and managing statistics in the Novel Dialogue Enhancer
 */
class StatsUtils {
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
  }

  /**
   * Set total number of words processed
   * @param {number} wordsProcessed - New count value
   */
  setTotalWordsProcessed(wordsProcessed) {
    if (!this.#isNumber(wordsProcessed)) {
      console.error("Invalid wordsProcessed value");
      return;
    }
    this.totalWordsProcessed += wordsProcessed;
  }

  /**
   * Set compression ratio
   * @param {number} ratio - New compression ratio value
   */
  setCompressionRatio(ratio) {
    if (!this.#isNumber(ratio)) {
      console.error("Invalid compressionRatio value");
      return;
    }
    this.compressionRatio = ratio;
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

  /**
   * Get total number of dialogues enhanced
   * @return {number} Total dialogues enhanced
   */
  getTotalDialoguesEnhanced() {
    return this.totalDialoguesEnhanced;
  }

  /**
   * Set total number of dialogues enhanced
   * @param {number} dialoguesEnhanced - New count value
   */
  setTotalDialoguesEnhanced(dialoguesEnhanced) {
    if (!this.#isNumber(dialoguesEnhanced)) {
      console.error("Invalid dialoguesEnhanced value");
      return;
    }
    this.totalDialoguesEnhanced += dialoguesEnhanced;
  }

  /**
   * Get total number of characters detected
   * @return {number} Total characters detected
   */
  getTotalCharactersDetected() {
    return this.totalCharactersDetected;
  }

  /**
   * Set total number of characters detected
   * @param {number} charactersDetected - New count value
   */
  setTotalCharactersDetected(charactersDetected) {
    if (!this.#isNumber(charactersDetected)) {
      console.error("Invalid charactersDetected value");
      return;
    }
    this.totalCharactersDetected += charactersDetected;
  }

  /**
   * Get total processing time
   * @return {number} Total processing time in milliseconds
   */
  getProcessingTime() {
    return this.processingTime;
  }

  /**
   * Set total processing time
   * @param {number} processingTime - New processing time in milliseconds
   */
  setProcessingTime(processingTime) {
    if (!this.#isNumber(processingTime)) {
      console.error("Invalid processingTime value");
      return;
    }
    this.processingTime += processingTime;
  }

  /**
   * Set all statistics from an object
   * @param {Object} stats - Statistics object containing:
   *   - totalDialoguesEnhanced
   *   - totalCharactersDetected
   *   - processingTime
   */
  setStats(stats) {
    if (!stats || Object.keys(stats).length === 0) {
      console.error("Invalid statistics object");
      return;
    }
    this.totalDialoguesEnhanced = stats.totalDialoguesEnhanced || 0;
    this.totalCharactersDetected = stats.totalCharactersDetected || 0;
    this.processingTime = stats.processingTime || 0;
  }

  #isNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }
}

if (typeof module !== "undefined") {
  module.exports = StatsUtils;
} else {
  window.StatsUtils = StatsUtils;
}
