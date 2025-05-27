// error-handler.js
/**
 * Error handling system with user feedback
 */
class ErrorHandler {
    constructor(toaster) {
      this.toaster = toaster;
      this.errorHistory = [];
      this.maxErrorHistory = 10;
      this.errorCounts = new Map();
      this.suppressedErrors = new Set();
      
      // Error severity levels
      this.severityLevels = {
        LOW: 'low',
        MEDIUM: 'medium',
        HIGH: 'high',
        CRITICAL: 'critical'
      };
  
      // Error categories with user-friendly messages
      this.errorCategories = {
        NETWORK: {
          severity: this.severityLevels.HIGH,
          userMessage: 'Network connection issue',
          suggestions: ['Check your internet connection', 'Try again in a moment'],
          recoverable: true
        },
        OLLAMA_UNAVAILABLE: {
          severity: this.severityLevels.CRITICAL,
          userMessage: 'AI service unavailable',
          suggestions: [
            'Make sure Ollama is running on your computer',
            'Run "ollama serve" in your terminal',
            'Check if your AI model is downloaded'
          ],
          recoverable: false
        },
        PROCESSING_ERROR: {
          severity: this.severityLevels.MEDIUM,
          userMessage: 'Text processing error',
          suggestions: ['Try enhancing a smaller section', 'Refresh the page and try again'],
          recoverable: true
        },
        PERMISSION_DENIED: {
          severity: this.severityLevels.HIGH,
          userMessage: 'Site not whitelisted',
          suggestions: ['Add this site to your whitelist', 'Click the extension icon to whitelist'],
          recoverable: true
        },
        INVALID_CONTENT: {
          severity: this.severityLevels.MEDIUM,
          userMessage: 'Content not suitable for enhancement',
          suggestions: ['Try a different page with novel content', 'Check if the page has readable text'],
          recoverable: false
        },
        TIMEOUT: {
          severity: this.severityLevels.MEDIUM,
          userMessage: 'Request timed out',
          suggestions: ['Try again with a smaller text section', 'Check your timeout settings'],
          recoverable: true
        },
        UNKNOWN: {
          severity: this.severityLevels.LOW,
          userMessage: 'Unexpected error occurred',
          suggestions: ['Try refreshing the page', 'Check browser console for details'],
          recoverable: true
        }
      };
    }
  
    /**
     * Handle error with enhanced user feedback
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     * @param {object} options - Additional options
     */
    handleError(error, context = 'general', options = {}) {
      const errorInfo = this.#analyzeError(error, context);
      const shouldShow = this.#shouldShowError(errorInfo);
  
      // Log error for debugging
      this.#logError(errorInfo, options);
  
      // Add to error history
      this.#addToHistory(errorInfo);
  
      if (shouldShow) {
        this.#showUserFriendlyError(errorInfo, options);
      }
  
      // Attempt recovery if possible
      if (errorInfo.category.recoverable && options.attemptRecovery !== false) {
        this.#attemptErrorRecovery(errorInfo, options);
      }
  
      return errorInfo;
    }
  
    /**
     * Handle enhancement-specific errors with progress context
     * @param {Error} error - Error object
     * @param {object} enhancementContext - Enhancement context
     */
    handleEnhancementError(error, enhancementContext = {}) {
      const { currentChunk = 0, totalChunks = 0, enhancementId = 'unknown' } = enhancementContext;
      
      const errorInfo = this.#analyzeError(error, 'enhancement');
      errorInfo.enhancementContext = enhancementContext;
  
      // Special handling for enhancement errors
      if (errorInfo.category.severity === this.severityLevels.CRITICAL) {
        this.toaster.showError(
          `Enhancement stopped: ${errorInfo.category.userMessage}`,
          0 // Persistent message
        );
      } else if (currentChunk > 0) {
        // Partial enhancement failure
        this.toaster.showWarning(
          `Enhancement partially failed at chunk ${currentChunk}/${totalChunks}. Continuing with remaining content.`
        );
      } else {
        // Early failure
        this.toaster.showError(
          `Enhancement failed to start: ${errorInfo.category.userMessage}`
        );
      }
  
      // Show suggestions for recovery
      this.#showRecoverySuggestions(errorInfo);
  
      return errorInfo;
    }
  
    /**
     * Handle network-related errors specifically
     * @param {Error} error - Network error
     * @param {object} requestContext - Request context
     */
    handleNetworkError(error, requestContext = {}) {
      const errorInfo = this.#analyzeError(error, 'network');
      errorInfo.requestContext = requestContext;
  
      // Determine if this is a temporary or persistent network issue
      const isTemporary = this.#isTemporaryNetworkError(error);
      
      if (isTemporary) {
        this.toaster.showWarning(
          'Temporary network issue. Enhancement will retry automatically.',
          3000
        );
      } else {
        this.toaster.showError(
          'Network connection problem. Please check your connection and try again.'
        );
      }
  
      return errorInfo;
    }
  
    /**
     * Analyze error to determine category and severity
     * @param {Error} error - Error object
     * @param {string} context - Error context
     * @return {object} - Error analysis
     * @private
     */
    #analyzeError(error, context) {
      let category = this.errorCategories.UNKNOWN;
      let categoryName = 'UNKNOWN';
  
      // Analyze error message and type
      const errorMessage = error.message?.toLowerCase() || '';
      const errorName = error.name?.toLowerCase() || '';
  
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || 
          errorMessage.includes('connection') || errorName.includes('networkerror')) {
        category = this.errorCategories.NETWORK;
        categoryName = 'NETWORK';
      } else if (errorMessage.includes('ollama') || errorMessage.includes('not available') ||
                 errorMessage.includes('llm') || errorMessage.includes('model')) {
        category = this.errorCategories.OLLAMA_UNAVAILABLE;
        categoryName = 'OLLAMA_UNAVAILABLE';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        category = this.errorCategories.TIMEOUT;
        categoryName = 'TIMEOUT';
      } else if (errorMessage.includes('permission') || errorMessage.includes('whitelist') ||
                 errorMessage.includes('not allowed')) {
        category = this.errorCategories.PERMISSION_DENIED;
        categoryName = 'PERMISSION_DENIED';
      } else if (errorMessage.includes('content') || errorMessage.includes('element') ||
                 errorMessage.includes('text')) {
        category = this.errorCategories.INVALID_CONTENT;
        categoryName = 'INVALID_CONTENT';
      } else if (context === 'enhancement' || context === 'processing') {
        category = this.errorCategories.PROCESSING_ERROR;
        categoryName = 'PROCESSING_ERROR';
      }
  
      return {
        originalError: error,
        category: category,
        categoryName: categoryName,
        context: context,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        id: this.#generateErrorId()
      };
    }
  
    /**
     * Determine if error should be shown to user
     * @param {object} errorInfo - Error information
     * @return {boolean} - Whether to show error
     * @private
     */
    #shouldShowError(errorInfo) {
      const errorKey = `${errorInfo.categoryName}_${errorInfo.context}`;
      
      // Check if this error type is suppressed
      if (this.suppressedErrors.has(errorKey)) {
        return false;
      }
  
      // Check error frequency to avoid spam
      const count = this.errorCounts.get(errorKey) || 0;
      this.errorCounts.set(errorKey, count + 1);
  
      // Show first 3 occurrences, then suppress for 5 minutes
      if (count >= 3) {
        this.suppressedErrors.add(errorKey);
        setTimeout(() => {
          this.suppressedErrors.delete(errorKey);
          this.errorCounts.delete(errorKey);
        }, 5 * 60 * 1000); // 5 minutes
        
        return false;
      }
  
      return true;
    }
  
    /**
     * Show user-friendly error message
     * @param {object} errorInfo - Error information
     * @param {object} options - Display options
     * @private
     */
    #showUserFriendlyError(errorInfo, options = {}) {
      const { category, categoryName } = errorInfo;
      const duration = options.duration || this.#getErrorDisplayDuration(category.severity);
  
      // Choose appropriate toaster method based on severity
      switch (category.severity) {
        case this.severityLevels.CRITICAL:
          this.toaster.showError(category.userMessage, duration);
          break;
        case this.severityLevels.HIGH:
          this.toaster.showError(category.userMessage, duration);
          break;
        case this.severityLevels.MEDIUM:
          this.toaster.showWarning(category.userMessage, duration);
          break;
        case this.severityLevels.LOW:
          this.toaster.showInfo(category.userMessage, duration);
          break;
      }
    }
  
    /**
     * Show recovery suggestions to user
     * @param {object} errorInfo - Error information
     * @private
     */
    #showRecoverySuggestions(errorInfo) {
      const { category } = errorInfo;
      
      if (category.suggestions && category.suggestions.length > 0) {
        // Show suggestions after a short delay
        setTimeout(() => {
          const suggestionText = `Suggestions: ${category.suggestions.join(' • ')}`;
          this.toaster.showInfo(suggestionText, 8000);
        }, 1500);
      }
    }
  
    /**
     * Attempt automatic error recovery
     * @param {object} errorInfo - Error information
     * @param {object} options - Recovery options
     * @private
     */
    #attemptErrorRecovery(errorInfo, options = {}) {
      const { categoryName } = errorInfo;
      const recoveryFunction = options.recoveryFunction;
  
      switch (categoryName) {
        case 'NETWORK':
          this.#attemptNetworkRecovery(errorInfo, options);
          break;
        case 'TIMEOUT':
          this.#attemptTimeoutRecovery(errorInfo, options);
          break;
        case 'PROCESSING_ERROR':
          this.#attemptProcessingRecovery(errorInfo, options);
          break;
        default:
          if (recoveryFunction && typeof recoveryFunction === 'function') {
            try {
              recoveryFunction(errorInfo);
            } catch (recoveryError) {
              console.warn('Recovery function failed:', recoveryError);
            }
          }
      }
    }
  
    /**
     * Attempt network error recovery
     * @param {object} errorInfo - Error information
     * @param {object} options - Recovery options
     * @private
     */
    #attemptNetworkRecovery(errorInfo, options) {
      const maxRetries = options.maxRetries || 3;
      const retryDelay = options.retryDelay || 2000;
      const retryFunction = options.retryFunction;
  
      if (retryFunction && typeof retryFunction === 'function') {
        console.log(`Attempting network recovery for error ${errorInfo.id}`);
        
        setTimeout(() => {
          retryFunction()
            .then(() => {
              this.toaster.showSuccess('Connection restored!', 3000);
            })
            .catch((retryError) => {
              console.warn('Network recovery failed:', retryError);
            });
        }, retryDelay);
      }
    }
  
    /**
     * Attempt timeout error recovery
     * @param {object} errorInfo - Error information
     * @param {object} options - Recovery options
     * @private
     */
    #attemptTimeoutRecovery(errorInfo, options) {
      this.toaster.showInfo(
        'Timeout occurred. Try processing smaller sections or increasing timeout in settings.',
        6000
      );
    }
  
    /**
     * Attempt processing error recovery
     * @param {object} errorInfo - Error information
     * @param {object} options - Recovery options
     * @private
     */
    #attemptProcessingRecovery(errorInfo, options) {
      // Suggest processing in smaller chunks
      this.toaster.showInfo(
        'Processing failed. Try enhancing a smaller section of text.',
        5000
      );
    }
  
    /**
     * Check if network error is temporary
     * @param {Error} error - Network error
     * @return {boolean} - Whether error is temporary
     * @private
     */
    #isTemporaryNetworkError(error) {
      const tempErrorIndicators = [
        'timeout',
        'aborted',
        'network error',
        'connection refused',
        'temporarily unavailable'
      ];
  
      const errorMessage = error.message?.toLowerCase() || '';
      return tempErrorIndicators.some(indicator => errorMessage.includes(indicator));
    }
  
    /**
     * Get error display duration based on severity
     * @param {string} severity - Error severity
     * @return {number} - Display duration in milliseconds
     * @private
     */
    #getErrorDisplayDuration(severity) {
      switch (severity) {
        case this.severityLevels.CRITICAL:
          return 0; // Persistent
        case this.severityLevels.HIGH:
          return 8000;
        case this.severityLevels.MEDIUM:
          return 5000;
        case this.severityLevels.LOW:
          return 3000;
        default:
          return 4000;
      }
    }
  
    /**
     * Log error for debugging
     * @param {object} errorInfo - Error information
     * @param {object} options - Logging options
     * @private
     */
    #logError(errorInfo, options = {}) {
      const logLevel = options.logLevel || 'error';
      const logData = {
        errorId: errorInfo.id,
        category: errorInfo.categoryName,
        context: errorInfo.context,
        message: errorInfo.originalError.message,
        stack: errorInfo.originalError.stack,
        url: errorInfo.url,
        timestamp: new Date(errorInfo.timestamp).toISOString(),
        userAgent: errorInfo.userAgent
      };
  
      if (logLevel === 'warn') {
        console.warn('Enhanced Error Handler:', logData);
      } else {
        console.error('Enhanced Error Handler:', logData);
      }
  
      // Send to background for potential telemetry (without personal data)
      if (options.reportToBackground !== false) {
        try {
          chrome.runtime.sendMessage({
            action: 'reportError',
            errorCategory: errorInfo.categoryName,
            errorContext: errorInfo.context,
            severity: errorInfo.category.severity
          });
        } catch (backgroundError) {
          console.warn('Failed to report error to background:', backgroundError);
        }
      }
    }
  
    /**
     * Add error to history
     * @param {object} errorInfo - Error information
     * @private
     */
    #addToHistory(errorInfo) {
      this.errorHistory.unshift(errorInfo);
      
      if (this.errorHistory.length > this.maxErrorHistory) {
        this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
      }
    }
  
    /**
     * Generate unique error ID
     * @return {string} - Error ID
     * @private
     */
    #generateErrorId() {
      return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  
    /**
     * Get error statistics
     * @return {object} - Error statistics
     */
    getErrorStats() {
      const categoryCounts = {};
      this.errorHistory.forEach(error => {
        categoryCounts[error.categoryName] = (categoryCounts[error.categoryName] || 0) + 1;
      });
  
      return {
        totalErrors: this.errorHistory.length,
        categoryCounts: categoryCounts,
        suppressedErrorTypes: Array.from(this.suppressedErrors),
        recentErrors: this.errorHistory.slice(0, 5).map(error => ({
          id: error.id,
          category: error.categoryName,
          context: error.context,
          timestamp: error.timestamp
        }))
      };
    }
  
    /**
     * Clear error history and reset counters
     */
    clearErrorHistory() {
      this.errorHistory = [];
      this.errorCounts.clear();
      this.suppressedErrors.clear();
    }
  }
  
  // Export for use in content.js
  if (typeof module !== "undefined") {
    module.exports = ErrorHandler;
  } else {
    window.ErrorHandler = ErrorHandler;
  }