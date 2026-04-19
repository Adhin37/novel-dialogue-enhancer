import { sanitizeHtml } from "./dom-sanitizer.js";
import { partitionParagraphs } from "./dialogue-filter.js";
import { verifyAndHandleDOMUpdate } from "./dom-verifier.js";

/**
 * @typedef {object} RunnerCtx
 * @property {HTMLElement} contentElement
 * @property {() => boolean} isTerminated   - Returns true if user requested termination
 * @property {import('../shared/ui/toaster.js').Toaster} toaster
 * @property {object} contentEnhancerIntegration
 */

/**
 * Processes the full content container as a single text block.
 * @param {RunnerCtx} ctx
 * @return {Promise<boolean>}
 */
export async function processSingleContentBlock(ctx) {
  const { contentElement, isTerminated, toaster, contentEnhancerIntegration } = ctx;
  const originalText = contentElement.textContent;

  if (isTerminated()) {
    console.log("Enhancement terminated by user before processing");
    toaster.showWarning("Enhancement terminated by user");
    return false;
  }

  console.log("Processing full content as a single block");
  toaster.updateProgress(0, 1);
  toaster.showLoading("Processing content...");

  try {
    const enhancedText = await contentEnhancerIntegration.enhanceText(originalText);

    if (!enhancedText || typeof enhancedText !== "string") {
      console.warn("Invalid enhanced text received:", typeof enhancedText);
      throw new Error("Invalid enhanced text format");
    }

    if (enhancedText.trim() === "") {
      console.warn("Empty enhanced text received");
      throw new Error("Enhancement produced empty result");
    }

    if (isTerminated()) {
      console.log("Enhancement terminated by user after processing");
      toaster.showWarning("Enhancement terminated by user");
      return false;
    }

    contentElement.innerHTML = sanitizeHtml(enhancedText);
    const updateVerified = verifyAndHandleDOMUpdate(contentElement, originalText, enhancedText);

    if (!updateVerified) {
      throw new Error("Text update verification failed");
    }

    console.log(`Content updated and verified with ${enhancedText.length} characters`);
    toaster.updateProgress(1, 1);

    const paragraphCount = (enhancedText.match(/\n\n/g) || []).length + 1;
    const stats = contentEnhancerIntegration.statsUtils.getStats();
    chrome.runtime.sendMessage({
      action: "updateParagraphStats",
      paragraphCount,
      processingTime: stats.processingTime || 0
    });

    return true;
  } catch (error) {
    console.error("Failed to enhance content block:", error);
    throw error;
  }
}

/**
 * Processes all paragraphs in a single LLM batch, skipping pure-narration ones.
 * @param {RunnerCtx} ctx
 * @param {NodeList} paragraphs
 * @return {Promise<boolean>}
 */
export async function processMultipleParagraphs(ctx, paragraphs) {
  const { isTerminated, toaster, contentEnhancerIntegration } = ctx;
  const totalParagraphs = paragraphs.length;

  if (isTerminated()) {
    toaster.showWarning("Enhancement terminated by user");
    return false;
  }

  console.log(`Processing ${totalParagraphs} paragraphs in a single pass`);
  toaster.updateProgress(0, 1);
  toaster.showLoading(`Enhancing ${totalParagraphs} paragraphs...`);

  const batchStartTime = performance.now();
  const originalTexts = Array.from(paragraphs).map((p) => p.textContent);

  // Only send dialogue-containing paragraphs to the LLM; narration passes through unchanged.
  const { toSend, toSendIdx, passthrough } = partitionParagraphs(originalTexts);
  // If no dialogue detected, send everything to avoid skipping the entire chapter.
  const textsForLLM = toSend.length > 0 ? toSend : originalTexts;
  const idxForLLM   = toSend.length > 0 ? toSendIdx : originalTexts.map((_, i) => i);

  console.log(
    `Dialogue filter: ${textsForLLM.length}/${totalParagraphs} paragraphs sent to LLM` +
    (passthrough.size > 0 ? ` (${passthrough.size} narration-only skipped)` : "")
  );
  toaster.showLoading(`Enhancing ${textsForLLM.length} dialogue paragraphs…`);

  try {
    const enhancedText = await contentEnhancerIntegration.enhanceText(textsForLLM.join("\n\n"));

    if (isTerminated()) {
      toaster.showWarning("Enhancement terminated by user");
      return false;
    }

    const enhancedParagraphs = enhancedText.split("\n\n");
    let successfulUpdates = 0;

    for (let slot = 0; slot < idxForLLM.length; slot++) {
      const origIdx  = idxForLLM[slot];
      const enhanced = enhancedParagraphs[slot] ?? originalTexts[origIdx];
      const para = paragraphs[origIdx];
      try {
        para.innerHTML = sanitizeHtml(enhanced);
        if (verifyAndHandleDOMUpdate(para, originalTexts[origIdx], enhanced)) {
          successfulUpdates++;
        }
      } catch (updateError) {
        console.error(`Failed to update paragraph ${origIdx}:`, updateError);
        try {
          para.innerHTML = sanitizeHtml(originalTexts[origIdx]);
        } catch (restoreErr) { console.debug("Fallback DOM restore failed:", restoreErr); }
      }
    }

    // Narration paragraphs are preserved as-is; count them as successful.
    successfulUpdates += passthrough.size;

    toaster.updateProgress(1, 1);

    const processingTime = performance.now() - batchStartTime;
    chrome.runtime.sendMessage({
      action: "updateParagraphStats",
      paragraphCount: successfulUpdates,
      processingTime
    });

    console.log(`Enhancement complete: ${successfulUpdates}/${totalParagraphs} paragraphs updated`);
    return successfulUpdates > 0;
  } catch (error) {
    console.error("Enhancement failed:", error);
    toaster.showWarning("Enhancement failed. Check that Ollama is running.");
    return false;
  }
}
