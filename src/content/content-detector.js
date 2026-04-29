import { ContentSelectors, SiteSelectors } from "./content-selectors.js";
import { ElementCache } from "./element-cache.js";

let elementCache = null;

function getCache() {
  if (!elementCache) elementCache = new ElementCache();
  return elementCache;
}

/** Clears the element cache — call when SPA navigation replaces the DOM. */
export function clearDetectorCache() {
  getCache().clearCache();
}

/**
 * Finds the largest container holding at least 5 paragraphs, by total text length.
 * Used as fallback when no known selector matches.
 * @return {HTMLElement|null}
 */
export function findLargestTextBlock() {
  let largestTextBlock = null;
  let maxTextLength = 0;

  try {
    document.querySelectorAll("div, article, section").forEach((container) => {
      const paragraphs = container.querySelectorAll("p");
      if (paragraphs.length >= 5) {
        let totalText = "";
        paragraphs.forEach((p) => { totalText += p.textContent; });
        if (totalText.length > maxTextLength) {
          maxTextLength = totalText.length;
          largestTextBlock = container;
        }
      }
    });
  } catch (error) {
    console.error("Error finding content element:", error);
  }

  return largestTextBlock;
}

/**
 * Returns site-specific selectors for the current hostname, or an empty array
 * when the hostname isn't in SiteSelectors (user-whitelisted unknown sites).
 * @return {string[]}
 */
function getSiteSpecificSelectors() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  for (const [domain, selectors] of Object.entries(SiteSelectors)) {
    if (hostname === domain || hostname.endsWith('.' + domain)) {
      return selectors;
    }
  }
  return [];
}

/**
 * Returns the first content element matching a known selector with ≥100 chars of text,
 * falling back to the largest text block on the page.
 *
 * Resolution order:
 *   1. Site-specific selectors for the current hostname (highest confidence)
 *   2. Generic selector list (covers unknown / user-whitelisted sites)
 *   3. Largest text block heuristic (last resort)
 *
 * @return {HTMLElement|null}
 */
export function findContentElement() {
  const MIN_CONTENT_LENGTH = 100;

  const siteSelectors = getSiteSpecificSelectors();
  const seen = new Set(siteSelectors);
  const allSelectors = [
    ...siteSelectors,
    ...ContentSelectors.CONTENT.filter(s => !seen.has(s)),
  ];

  for (const selector of allSelectors) {
    try {
      const element = getCache().getElement(selector);
      if (element && (element.textContent?.length ?? 0) >= MIN_CONTENT_LENGTH) {
        return element;
      }
    } catch (error) {
      console.error(`Error with selector "${selector}":`, error);
    }
  }

  return findLargestTextBlock();
}
