/**
 * Shows a feedback message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of message ('success', 'warning', 'error', or '')
 * @param {number} duration - Duration in milliseconds before the message disappears
 * @param {HTMLElement} container - Optional container to append the message to (defaults to document.body)
 * @returns {HTMLElement} - The created feedback element
 */
function showFeedback(message, type = '', duration = 2500, container = null) {
  // Create feedback element
  const feedback = document.createElement("div");
  feedback.className = "save-feedback";
  
  // Add type-specific class if provided
  if (type) {
    feedback.classList.add(type);
  }
  
  feedback.textContent = message;
  
  // Append to the specified container or document.body
  const targetContainer = container || document.body;
  targetContainer.appendChild(feedback);

  // Automatically remove after duration
  const timeoutId = setTimeout(() => {
    if (feedback && feedback.parentNode) {
      feedback.parentNode.removeChild(feedback);
    }
  }, duration);

  // Return the element in case the caller wants to manipulate it further
  return feedback;
}

if (typeof module !== "undefined") {
  module.exports = showFeedback;
} else {
  window.showFeedback = showFeedback;
}
