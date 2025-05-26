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
  
  /**
   * Enhanced content script error handling integration
   */
  class EnhancedContentScript {
    constructor() {
      this.errorHandler = new ErrorHandler(toaster);
      this.retryAttempts = new Map();
      this.maxRetries = 3;
    }
  
    /**
     * Enhanced page enhancement with comprehensive error handling
     * @return {Promise<boolean>} - Enhancement success
     */
    async enhancePageWithErrorHandling() {
      const enhancementId = `enh_${Date.now()}`;
      
      try {
        console.log(`Starting enhancement ${enhancementId}`);
        
        // Pre-enhancement checks
        await this.#performPreEnhancementChecks();
        
        // Main enhancement logic with error handling
        const result = await this.#enhancePageSafely(enhancementId);
        
        console.log(`Enhancement ${enhancementId} completed successfully`);
        return result;
        
      } catch (error) {
        const errorInfo = this.errorHandler.handleEnhancementError(error, {
          enhancementId: enhancementId,
          currentChunk: 0,
          totalChunks: 0
        });
  
        // Attempt retry if appropriate
        if (this.#shouldRetryEnhancement(errorInfo)) {
          return await this.#retryEnhancement(enhancementId, error);
        }
  
        return false;
      }
    }
  
    /**
     * Perform pre-enhancement checks
     * @return {Promise<void>} - Throws if checks fail
     * @private
     */
    async #performPreEnhancementChecks() {
      // Check if site is whitelisted
      if (!isCurrentSiteWhitelisted) {
        throw new Error('Site not whitelisted for enhancement');
      }
  
      // Check if extension is paused
      if (settings.isExtensionPaused) {
        throw new Error('Extension is currently paused');
      }
  
      // Check if content is available
      const contentElement = findContentElement();
      if (!contentElement) {
        throw new Error('No suitable content found for enhancement');
      }
  
      // Check Ollama availability
      const ollamaStatus = await checkOllamaStatus();
      if (!ollamaStatus) {
        throw new Error('Ollama AI service is not available');
      }
    }
  
    /**
     * Safely enhance page with error boundaries
     * @param {string} enhancementId - Enhancement identifier
     * @return {Promise<boolean>} - Enhancement result
     * @private
     */
    async #enhancePageSafely(enhancementId) {
      try {
        // Initialize enhancement with error handling
        if (!contentEnhancerIntegration) {
          contentEnhancerIntegration = new ContentEnhancerIntegration();
        }
  
        // Set up character context with error handling
        toaster.showLoading("Analyzing characters...");
        const contextResult = await this.#setupCharacterContextSafely();
  
        // Process content based on type
        const paragraphs = contentElement.querySelectorAll("p");
        
        if (paragraphs.length === 0) {
          return await this.#processSingleContentBlockSafely(enhancementId);
        } else {
          return await this.#processMultipleParagraphsSafely(paragraphs, enhancementId);
        }
  
      } catch (error) {
        console.error(`Enhancement ${enhancementId} failed in main process:`, error);
        throw error;
      }
    }
  
    /**
     * Set up character context with error handling
     * @return {Promise<object>} - Character context
     * @private
     */
    async #setupCharacterContextSafely() {
      try {
        const contextResult = await contentEnhancerIntegration.setupCharacterContext();
        
        if (!contextResult || typeof contextResult !== 'object') {
          console.warn('Invalid character context result, using empty context');
          return {};
        }
  
        console.log(`Character context established: ${Object.keys(contextResult).length} characters`);
        return contextResult;
  
      } catch (error) {
        this.errorHandler.handleError(error, 'character_analysis', {
          recoveryFunction: () => {
            console.log('Using empty character context as fallback');
            return {};
          }
        });
        
        // Return empty context as fallback
        return {};
      }
    }
  
    /**
     * Process single content block with error handling
     * @param {string} enhancementId - Enhancement identifier
     * @return {Promise<boolean>} - Success result
     * @private
     */
    async #processSingleContentBlockSafely(enhancementId) {
      try {
        const originalText = contentElement.textContent;
        
        if (!originalText || originalText.trim().length === 0) {
          throw new Error('No text content found to enhance');
        }
  
        toaster.updateProgress(0, 1);
        toaster.showLoading("Processing content...");
  
        const enhancedText = await contentEnhancerIntegration.enhanceText(originalText);
  
        if (!enhancedText || typeof enhancedText !== 'string' || enhancedText.trim() === '') {
          throw new Error('Enhancement produced empty or invalid result');
        }
  
        // Apply enhancement with verification
        contentElement.innerHTML = window.DOMPurify.sanitize(enhancedText);
        const updateVerified = verifyAndHandleDOMUpdate(contentElement, originalText, enhancedText);
  
        if (!updateVerified) {
          throw new Error('Text update verification failed');
        }
  
        toaster.updateProgress(1, 1);
        
        // Report statistics
        this.#reportEnhancementStats(enhancementId, enhancedText);
        
        return true;
  
      } catch (error) {
        this.errorHandler.handleError(error, 'single_block_processing', {
          enhancementId: enhancementId,
          retryFunction: () => this.#processSingleContentBlockSafely(enhancementId)
        });
        throw error;
      }
    }
  
    /**
     * Process multiple paragraphs with enhanced error handling
     * @param {NodeList} paragraphs - Paragraphs to process
     * @param {string} enhancementId - Enhancement identifier
     * @return {Promise<boolean>} - Success result
     * @private
     */
    async #processMultipleParagraphsSafely(paragraphs, enhancementId) {
      const totalParagraphs = paragraphs.length;
      const idealChunkSize = Math.max(5, Math.ceil(totalParagraphs / 3));
      const chunkSize = Math.min(idealChunkSize, 15);
  
      console.log(`Enhancement ${enhancementId}: Processing ${totalParagraphs} paragraphs in chunks of ${chunkSize}`);
  
      let successfulChunks = 0;
      let failedChunks = 0;
  
      toaster.showLoading(`Preparing to process ${totalParagraphs} paragraphs...`);
  
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        if (terminateRequested) {
          console.log(`Enhancement ${enhancementId} terminated by user at chunk ${i}`);
          break;
        }
  
        try {
          const chunkResult = await this.#processParagraphBatchSafely(
            paragraphs, i, chunkSize, totalParagraphs, enhancementId
          );
  
          if (chunkResult) {
            successfulChunks++;
          } else {
            failedChunks++;
          }
  
        } catch (chunkError) {
          failedChunks++;
          
          this.errorHandler.handleEnhancementError(chunkError, {
            enhancementId: enhancementId,
            currentChunk: Math.floor(i / chunkSize) + 1,
            totalChunks: Math.ceil(paragraphs.length / chunkSize)
          });
  
          // Continue with next chunk unless too many failures
          if (failedChunks > successfulChunks && failedChunks > 3) {
            throw new Error(`Too many chunk failures (${failedChunks} failed, ${successfulChunks} succeeded)`);
          }
        }
  
        // Add delay between chunks
        if (i + chunkSize < paragraphs.length && !terminateRequested) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
  
      const totalChunks = Math.ceil(paragraphs.length / chunkSize);
      console.log(`Enhancement ${enhancementId}: Completed ${successfulChunks}/${totalChunks} chunks successfully`);
  
      return successfulChunks > 0;
    }
  
    /**
     * Process paragraph batch with error handling
     * @param {NodeList} paragraphs - All paragraphs
     * @param {number} startIndex - Start index
     * @param {number} chunkSize - Chunk size
     * @param {number} totalParagraphs - Total paragraph count
     * @param {string} enhancementId - Enhancement identifier
     * @return {Promise<boolean>} - Batch success
     * @private
     */
    async #processParagraphBatchSafely(paragraphs, startIndex, chunkSize, totalParagraphs, enhancementId) {
      try {
        toaster.updateProgress(startIndex, totalParagraphs);
        toaster.showLoading(
          `Processing paragraphs ${startIndex + 1}-${Math.min(startIndex + chunkSize, paragraphs.length)}...`
        );
  
        const batch = Array.from(paragraphs).slice(startIndex, startIndex + chunkSize);
        const batchText = batch.map(p => p.textContent).join("\n\n");
        const originalTexts = batch.map(p => p.textContent);
  
        if (!batchText.trim()) {
          console.warn(`Enhancement ${enhancementId}: Batch ${startIndex} has no content, skipping`);
          return false;
        }
  
        const enhancedText = await contentEnhancerIntegration.enhanceText(batchText);
        const enhancedParagraphs = enhancedText.split("\n\n");
        
        let successfulUpdates = 0;
  
        // Apply enhancements with individual error handling
        for (let j = 0; j < batch.length && j < enhancedParagraphs.length; j++) {
          try {
            batch[j].innerHTML = window.DOMPurify.sanitize(enhancedParagraphs[j]);
            
            const updateVerified = verifyAndHandleDOMUpdate(
              batch[j], originalTexts[j], enhancedParagraphs[j]
            );
  
            if (updateVerified) {
              successfulUpdates++;
            }
          } catch (updateError) {
            console.warn(`Enhancement ${enhancementId}: Failed to update paragraph ${startIndex + j}:`, updateError);
            
            // Restore original text on failure
            try {
              batch[j].innerHTML = window.DOMPurify.sanitize(originalTexts[j]);
            } catch (restoreError) {
              console.error(`Enhancement ${enhancementId}: Failed to restore paragraph ${startIndex + j}:`, restoreError);
            }
          }
        }
  
        console.log(`Enhancement ${enhancementId}: Batch ${startIndex}: ${successfulUpdates}/${batch.length} paragraphs updated`);
  
        // Report batch statistics
        this.#reportBatchStats(enhancementId, successfulUpdates, startIndex);
  
        return successfulUpdates > 0;
  
      } catch (error) {
        console.error(`Enhancement ${enhancementId}: Batch ${startIndex} failed:`, error);
        throw error;
      }
    }
  
    /**
     * Check if enhancement should be retried
     * @param {object} errorInfo - Error information
     * @return {boolean} - Whether to retry
     * @private
     */
    #shouldRetryEnhancement(errorInfo) {
      const retryableCategories = ['NETWORK', 'TIMEOUT', 'PROCESSING_ERROR'];
      const currentRetries = this.retryAttempts.get(errorInfo.context) || 0;
      
      return retryableCategories.includes(errorInfo.categoryName) && 
             currentRetries < this.maxRetries;
    }
  
    /**
     * Retry enhancement with exponential backoff
     * @param {string} enhancementId - Enhancement identifier
     * @param {Error} originalError - Original error
     * @return {Promise<boolean>} - Retry result
     * @private
     */
    async #retryEnhancement(enhancementId, originalError) {
      const retryCount = this.retryAttempts.get(enhancementId) || 0;
      this.retryAttempts.set(enhancementId, retryCount + 1);
  
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      
      console.log(`Enhancement ${enhancementId}: Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      toaster.showInfo(`Retrying enhancement... (attempt ${retryCount + 1}/${this.maxRetries})`, 3000);
  
      await new Promise(resolve => setTimeout(resolve, delay));
  
      try {
        return await this.#enhancePageSafely(`${enhancementId}_retry_${retryCount + 1}`);
      } catch (retryError) {
        console.error(`Enhancement ${enhancementId} retry ${retryCount + 1} failed:`, retryError);
        
        if (retryCount + 1 >= this.maxRetries) {
          this.errorHandler.handleError(
            new Error(`Enhancement failed after ${this.maxRetries} attempts: ${originalError.message}`),
            'enhancement_final_failure'
          );
        }
        
        throw retryError;
      }
    }
  
    /**
     * Report enhancement statistics
     * @param {string} enhancementId - Enhancement identifier
     * @param {string} enhancedText - Enhanced text
     * @private
     */
    #reportEnhancementStats(enhancementId, enhancedText) {
      const paragraphCount = (enhancedText.match(/\n\n/g) || []).length + 1;
      const stats = contentEnhancerIntegration.statsUtils.getStats();
  
      chrome.runtime.sendMessage({
        action: "updateParagraphStats",
        paragraphCount: paragraphCount,
        processingTime: stats.processingTime || 0
      });
    }
  
    /**
     * Report batch statistics
     * @param {string} enhancementId - Enhancement identifier
     * @param {number} successfulUpdates - Number of successful updates
     * @param {number} batchIndex - Batch starting index
     * @private
     */
    #reportBatchStats(enhancementId, successfulUpdates, batchIndex) {
      chrome.runtime.sendMessage({
        action: "updateParagraphStats",
        paragraphCount: successfulUpdates,
        processingTime: 0 // Will be aggregated later
      });
    }
  
    /**
     * Get error statistics
     * @return {object} - Error statistics
     */
    getErrorStats() {
      return {
        errorHandlerStats: this.errorHandler.getErrorStats(),
        retryAttempts: Object.fromEntries(this.retryAttempts),
        maxRetries: this.maxRetries
      };
    }
  
    /**
     * Reset error tracking
     */
    resetErrorTracking() {
      this.errorHandler.clearErrorHistory();
      this.retryAttempts.clear();
    }
  }
  
  // Export for use in content.js
  if (typeof module !== "undefined") {
    module.exports = { EnhancedErrorHandler: ErrorHandler, EnhancedContentScript };
  } else {
    window.EnhancedErrorHandler = ErrorHandler;
    window.EnhancedContentScript = EnhancedContentScript;
  }