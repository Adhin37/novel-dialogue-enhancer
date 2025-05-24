// assets/js/utils/shared-utils.js
/**
 * Shared utility functions used across the extension
 */
class SharedUtils {
  /**
   * Escape regex special characters
   * @param {string} string - String to escape
   * @return {string} - Escaped string
   */
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Compress gender string to single character code
   * @param {string} gender - The gender string to compress
   * @return {string} - Single character gender code
   */
  static compressGender(gender) {
    if (!gender || typeof gender !== "string") return "u";
    const genderLower = gender.toLowerCase();
    if (genderLower === "male") return "m";
    if (genderLower === "female") return "f";
    return "u";
  }

  /**
   * Expand gender code to full string
   * @param {string} code - Single character gender code
   * @return {string} - Full gender string
   */
  static expandGender(code) {
    if (!code || typeof code !== "string") return "unknown";
    if (code === "m") return "male";
    if (code === "f") return "female";
    return "unknown";
  }

  /**
   * Sanitize text to prevent injection issues
   * @param {string} text - Text to sanitize
   * @return {string} - Sanitized text
   */
  static sanitizeText(text) {
    if (!text || typeof text !== "string") return "";
    const container = document.createElement("div");
    container.textContent = text;
    return container.innerHTML;
  }

  /**
   * Validate if value is a valid number
   * @param {*} value - Value to check
   * @return {boolean} - Whether value is a valid number
   */
  static isValidNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }

  /**
   * Validate object parameter with required properties
   * @param {*} obj - Object to validate
   * @param {string[]} requiredProps - Required property names
   * @return {boolean} - Whether object is valid
   */
  static validateObject(obj, requiredProps = []) {
    if (!obj || typeof obj !== "object") return false;
    return requiredProps.every((prop) =>
      Object.prototype.hasOwnProperty.call(obj, prop)
    );
  }

  /**
   * Create a simple hash from string
   * @param {string} input - String to hash
   * @return {string} - Hash string
   */
  static createHash(input) {
    if (!input) return "";
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  /**
   * Deep clone an object
   * @param {*} obj - Object to clone
   * @return {*} - Cloned object
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array)
      return obj.map((item) => SharedUtils.deepClone(item));
    if (typeof obj === "object") {
      const clonedObj = {};
      Object.keys(obj).forEach((key) => {
        clonedObj[key] = SharedUtils.deepClone(obj[key]);
      });
      return clonedObj;
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = SharedUtils;
} else {
  window.SharedUtils = SharedUtils;
}
