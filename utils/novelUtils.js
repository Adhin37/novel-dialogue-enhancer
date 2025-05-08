// novelUtils.js
/**
 * Utility functions for novel processing
 */
class NovelUtils {
  constructor() {
    console.log("Novel Dialogue Enhancer: Novel Utils initialized");
  }
}

if (typeof module !== "undefined") {
  module.exports = NovelUtils;
} else {
  window.novelUtils = NovelUtils;
}
