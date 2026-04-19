export class StringUtils {
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static sanitizeText(text) {
    if (!text || typeof text !== "string") return "";
    const container = document.createElement("div");
    container.textContent = text;
    return container.innerHTML;
  }

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

  static deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map((item) => StringUtils.deepClone(item));
    if (typeof obj === "object") {
      const clonedObj = {};
      Object.keys(obj).forEach((key) => {
        clonedObj[key] = StringUtils.deepClone(obj[key]);
      });
      return clonedObj;
    }
  }

  static isValidNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }

  static validateObject(obj, requiredProps = []) {
    if (!obj || typeof obj !== "object") return false;
    return requiredProps.every((prop) =>
      Object.prototype.hasOwnProperty.call(obj, prop)
    );
  }
}
