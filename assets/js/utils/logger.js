// assets/js/utils/logger.js
/**
 * Centralized logging utility for Novel Dialogue Enhancer
 * Separates user-facing messages from technical logs
 */
class Logger {
    constructor(toaster = null) {
      this.toaster = toaster;
      this.debugMode = false; // Can be toggled via settings
      this.logHistory = [];
      this.maxHistorySize = 100;
    }
  
    /**
     * Set toaster instance for user messages
     * @param {Toaster} toaster - Toaster instance
     */
    setToaster(toaster) {
      this.toaster = toaster;
    }
  
    /**
     * Enable/disable debug mode
     * @param {boolean} enabled - Debug mode state
     */
    setDebugMode(enabled) {
      this.debugMode = enabled;
    }
  
    // ============ USER-FACING MESSAGES ============
    // These show in toaster - should be simple and actionable
  
    /**
     * Show success message to user
     * @param {string} message - User-friendly success message
     */
    userSuccess(message) {
      if (this.toaster) {
        this.toaster.showSuccess(message);
      }
      this.#addToHistory('user-success', message);
    }
  
    /**
     * Show error message to user
     * @param {string} message - User-friendly error message
     */
    userError(message) {
      if (this.toaster) {
        this.toaster.showError(message);
      }
      this.#addToHistory('user-error', message);
    }
  
    /**
     * Show warning message to user
     * @param {string} message - User-friendly warning message
     */
    userWarning(message) {
      if (this.toaster) {
        this.toaster.showWarning(message);
      }
      this.#addToHistory('user-warning', message);
    }
  
    /**
     * Show info message to user
     * @param {string} message - User-friendly info message
     */
    userInfo(message) {
      if (this.toaster) {
        this.toaster.showInfo(message);
      }
      this.#addToHistory('user-info', message);
    }
  
    /**
     * Show loading message to user
     * @param {string} message - User-friendly loading message
     */
    userLoading(message) {
      if (this.toaster) {
        this.toaster.showLoading(message);
      }
      this.#addToHistory('user-loading', message);
    }
  
    /**
     * Update progress for user
     * @param {number} current - Current progress
     * @param {number} total - Total items
     */
    userProgress(current, total) {
      if (this.toaster) {
        this.toaster.updateProgress(current, total);
      }
    }
  
    // ============ TECHNICAL CONSOLE LOGS ============
    // These go to console for developers/debugging
  
    /**
     * Log technical information
     * @param {string} message - Technical message
     * @param {*} data - Optional data to log
     */
    info(message, data = null) {
      console.log(`[Novel Enhancer] ${message}`, data || '');
      this.#addToHistory('info', message, data);
    }
  
    /**
     * Log technical warning
     * @param {string} message - Warning message
     * @param {*} data - Optional data to log
     */
    warn(message, data = null) {
      console.warn(`[Novel Enhancer] ${message}`, data || '');
      this.#addToHistory('warn', message, data);
    }
  
    /**
     * Log technical error
     * @param {string} message - Error message
     * @param {Error|*} error - Error object or data
     */
    error(message, error = null) {
      console.error(`[Novel Enhancer] ${message}`, error || '');
      this.#addToHistory('error', message, error);
    }
  
    /**
     * Log technical success/completion
     * @param {string} message - Success message
     * @param {*} data - Optional data to log
     */
    success(message, data = null) {
      console.log(`[Novel Enhancer] ✓ ${message}`, data || '');
      this.#addToHistory('success', message, data);
    }
  
    // ============ DEBUG LOGS ============
    // These only show when debug mode is enabled
  
    /**
     * Log debug information (only in debug mode)
     * @param {string} message - Debug message
     * @param {*} data - Optional data to log
     */
    debug(message, data = null) {
      if (this.debugMode) {
        console.debug(`[Novel Enhancer DEBUG] ${message}`, data || '');
        this.#addToHistory('debug', message, data);
      }
    }
  
    /**
     * Log timing information (only in debug mode)
     * @param {string} operation - Operation name
     * @param {number} timeMs - Time in milliseconds
     */
    timing(operation, timeMs) {
      if (this.debugMode) {
        console.debug(`[Novel Enhancer TIMING] ${operation}: ${timeMs.toFixed(2)}ms`);
        this.#addToHistory('timing', operation, timeMs);
      }
    }
  
    /**
     * Log performance metrics (only in debug mode)
     * @param {string} operation - Operation name
     * @param {object} metrics - Performance metrics
     */
    performance(operation, metrics) {
      if (this.debugMode) {
        console.debug(`[Novel Enhancer PERF] ${operation}:`, metrics);
        this.#addToHistory('performance', operation, metrics);
      }
    }
  
    // ============ UTILITY METHODS ============
  
    /**
     * Add entry to log history
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {*} data - Optional data
     * @private
     */
    #addToHistory(level, message, data = null) {
      this.logHistory.unshift({
        timestamp: Date.now(),
        level,
        message,
        data
      });
  
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory = this.logHistory.slice(0, this.maxHistorySize);
      }
    }
  
    /**
     * Get recent log history
     * @param {number} count - Number of recent logs to return
     * @return {Array} Recent log entries
     */
    getRecentLogs(count = 20) {
      return this.logHistory.slice(0, count);
    }
  
    /**
     * Clear log history
     */
    clearHistory() {
      this.logHistory = [];
    }
  }
  
  // Create singleton instance
  const logger = new Logger();
  
  if (typeof module !== "undefined") {
    module.exports = logger;
  } else {
    window.logger = logger;
  }