/**
 * FeedbackManager - A class to handle user feedback messages
 */
class FeedbackManager {
  /**
   * Creates a new FeedbackManager instance
   * @param {Object} options - Configuration options
   * @param {number} options.defaultDuration - Default duration for messages in ms (default: 2500)
   * @param {HTMLElement} options.defaultContainer - Default container for messages (default: document.body)
   */
  constructor({ defaultDuration = 2500, defaultContainer = document.body } = {}) {
    this.defaultDuration = defaultDuration;
    this.defaultContainer = defaultContainer;
  }

  /**
   * Shows a feedback message to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message ('success', 'warning', 'error', or '')
   * @param {number} duration - Duration in milliseconds before the message disappears
   * @param {HTMLElement} container - Optional container to append the message to
   * @returns {HTMLElement} - The created feedback element
   */
  show(message, type = '', duration = this.defaultDuration, container = this.defaultContainer) {
    // Create feedback element
    const feedback = document.createElement("div");
    feedback.className = "save-feedback";
    
    // Add type-specific class if provided
    if (type) {
      feedback.classList.add(type);
    }
    
    feedback.textContent = message;
    
    // Append to the specified container
    const targetContainer = container;
    targetContainer.appendChild(feedback);

    // Automatically remove after duration
    setTimeout(() => {
      if (feedback && feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, duration);

    // Return the element in case the caller wants to manipulate it further
    return feedback;
  }

  /**
   * Shows a success message
   * @param {string} message - The success message to display
   * @param {number} duration - Optional duration in milliseconds
   * @param {HTMLElement} container - Optional container element
   * @returns {HTMLElement} - The created feedback element
   */
  success(message, duration, container) {
    return this.show(message, 'success', duration, container);
  }

  /**
   * Shows a warning message
   * @param {string} message - The warning message to display
   * @param {number} duration - Optional duration in milliseconds
   * @param {HTMLElement} container - Optional container element
   * @returns {HTMLElement} - The created feedback element
   */
  warning(message, duration, container) {
    return this.show(message, 'warning', duration, container);
  }

  /**
   * Shows an error message
   * @param {string} message - The error message to display
   * @param {number} duration - Optional duration in milliseconds
   * @param {HTMLElement} container - Optional container element
   * @returns {HTMLElement} - The created feedback element
   */
  error(message, duration, container) {
    return this.show(message, 'error', duration, container);
  }
}

// Create a default instance for backward compatibility
const feedbackManager = new FeedbackManager();
document.addEventListener("DOMContentLoaded", () => feedbackManager);

// Export based on environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    feedbackManager,
  };
} else {
  window.feedbackManager = feedbackManager;
}
