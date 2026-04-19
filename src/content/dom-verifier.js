import { sanitizeHtml } from "./dom-sanitizer.js";

/**
 * Verify that text was successfully updated in the DOM.
 * Returns false if the element's text didn't change meaningfully from originalText.
 * @param {HTMLElement} element
 * @param {string} originalText
 * @return {boolean}
 */
export function verifyTextUpdate(element, originalText) {
  if (!element || !originalText) {
    console.warn("Invalid parameters for text verification");
    return false;
  }

  try {
    const actualText = element.textContent || element.innerText || "";
    const expectedTextClean = originalText.replace(/<[^>]*>/g, "").trim();
    const actualTextClean = actualText.trim();

    const textWasUpdated =
      actualTextClean.length > 0 &&
      actualTextClean !== expectedTextClean &&
      Math.abs(actualTextClean.length - expectedTextClean.length) > 10;

    if (!textWasUpdated) {
      console.warn("Text update verification failed:", {
        expectedLength: expectedTextClean.length,
        actualLength: actualTextClean.length,
        element: element.tagName
      });
      return false;
    }

    console.log("Text update verified successfully");
    return true;
  } catch (error) {
    console.error("Error during text verification:", error);
    return false;
  }
}

/**
 * Verify DOM update and restore original on failure.
 * @param {HTMLElement} element
 * @param {string} originalText
 * @param {string} enhancedText
 * @return {boolean}
 */
export function verifyAndHandleDOMUpdate(element, originalText, enhancedText) {
  if (!verifyTextUpdate(element, originalText)) {
    console.warn("DOM update verification failed, attempting recovery", {
      originalLength: originalText?.length,
      enhancedLength: enhancedText?.length
    });

    try {
      element.innerHTML = sanitizeHtml(originalText);
      console.log("Restored original text after failed enhancement");
    } catch (restoreError) {
      console.error("Failed to restore original text:", restoreError);
    }
    return false;
  }

  return true;
}
