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
    this.logger = window.logger;
    this.logger.debug("Novel Dialogue Enhancer: Stats Utils initialized");
  }

  /**
   * Set total number of words processed
   * @param {number} wordsProcessed - New count value
   */
  setTotalWordsProcessed(wordsProcessed) {
    if (!SharedUtils.isValidNumber(wordsProcessed)) {
      this.logger.error("Invalid wordsProcessed value");
      return;
    }
    this.totalWordsProcessed += wordsProcessed;
  }

  /**
   * Set compression ratio
   * @param {number} ratio - New compression ratio value
   */
  setCompressionRatio(ratio) {
    if (!SharedUtils.isValidNumber(ratio)) {
      this.logger.error("Invalid compressionRatio value");
      return;
    }
    this.compressionRatio = ratio;
  }

  /**
   * Set total number of dialogues enhanced
   * @param {number} dialoguesEnhanced - New count value
   */
  setTotalDialoguesEnhanced(dialoguesEnhanced) {
    if (!SharedUtils.isValidNumber(dialoguesEnhanced)) {
      this.logger.error("Invalid dialoguesEnhanced value");
      return;
    }
    this.totalDialoguesEnhanced += dialoguesEnhanced;
  }

  /**
   * Set total number of characters detected
   * @param {number} charactersDetected - New count value
   */
  setTotalCharactersDetected(charactersDetected) {
    if (!SharedUtils.isValidNumber(charactersDetected)) {
      this.logger.error("Invalid charactersDetected value");
      return;
    }
    this.totalCharactersDetected += charactersDetected;
  }

  /**
   * Set total processing time
   * @param {number} processingTime - New processing time in milliseconds
   */
  setProcessingTime(processingTime) {
    if (!SharedUtils.isValidNumber(processingTime)) {
      this.logger.error("Invalid processingTime value");
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
      this.logger.error("Invalid statistics object");
      return;
    }
    this.totalDialoguesEnhanced = stats.totalDialoguesEnhanced || 0;
    this.totalCharactersDetected = stats.totalCharactersDetected || 0;
    this.processingTime = stats.processingTime || 0;
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
   * Get total number of characters detected
   * @return {number} Total characters detected
   */
  getTotalCharactersDetected() {
    return this.totalCharactersDetected;
  }

  /**
   * Get total processing time
   * @return {number} Total processing time in milliseconds
   */
  getProcessingTime() {
    return this.processingTime;
  }
}

if (typeof module !== "undefined") {
  module.exports = StatsUtils;
} else {
  window.StatsUtils = StatsUtils;
}
