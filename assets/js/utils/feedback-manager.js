/**
 * FeedbackManager - A class to handle user feedback messages with injected styles
 */
class FeedbackManager {
  /**
   * Creates a new FeedbackManager instance
   * @param {Object} options - Configuration options
   * @param {number} options.defaultDuration - Default duration for messages in ms (default: 2500)
   * @param {HTMLElement} options.defaultContainer - Default container for messages (default: document.body)
   */
  constructor({
    defaultDuration = 2500,
    defaultContainer = document.body
  } = {}) {
    this.defaultDuration = defaultDuration;
    this.defaultContainer = defaultContainer;
    this.stylesInjected = false;
    this.injectStyles();
  }

  /**
   * Injects the feedback styles into the document head
   */
  injectStyles() {
    if (this.stylesInjected) return;

    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerHTML = `
      .save-feedback {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--success-color, #28a745);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px var(--shadow-color, rgba(0, 0, 0, 0.15));
        z-index: 100;
        animation: slideIn 0.3s, fadeOut 0.3s 2s forwards;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        line-height: 1.4;
        max-width: 300px;
        word-wrap: break-word;
      }

      .save-feedback.success {
        background-color: var(--success-color, #28a745);
      }

      .save-feedback.warning {
        background-color: var(--warning-color, #ffc107);
        color: var(--warning-text-color, #212529);
      }

      .save-feedback.error {
        background-color: var(--error-color, #dc3545);
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(styleSheet);
    this.stylesInjected = true;
  }

  /**
   * Shows a feedback message to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of message ('success', 'warning', 'error', or '')
   * @param {number} duration - Duration in milliseconds before the message disappears
   * @param {HTMLElement} container - Optional container to append the message to
   * @returns {HTMLElement} - The created feedback element
   */
  show(
    message,
    type = "",
    duration = this.defaultDuration,
    container = this.defaultContainer
  ) {
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
    return this.show(message, "success", duration, container);
  }

  /**
   * Shows a warning message
   * @param {string} message - The warning message to display
   * @param {number} duration - Optional duration in milliseconds
   * @param {HTMLElement} container - Optional container element
   * @returns {HTMLElement} - The created feedback element
   */
  warning(message, duration, container) {
    return this.show(message, "warning", duration, container);
  }

  /**
   * Shows an error message
   * @param {string} message - The error message to display
   * @param {number} duration - Optional duration in milliseconds
   * @param {HTMLElement} container - Optional container element
   * @returns {HTMLElement} - The created feedback element
   */
  error(message, duration, container) {
    return this.show(message, "error", duration, container);
  }
}

const feedbackManager = new FeedbackManager();
document.addEventListener("DOMContentLoaded", () => feedbackManager);

// Export based on environment
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    feedbackManager
  };
} else {
  window.feedbackManager = feedbackManager;
}
