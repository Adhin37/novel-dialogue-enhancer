// assets/js/utils/constants.js
/**
 * Application constants used throughout the extension
 */
const Constants = {
  // Gender codes
  GENDER: {
    MALE: "m",
    FEMALE: "f",
    UNKNOWN: "u",
    MALE_FULL: "male",
    FEMALE_FULL: "female",
    UNKNOWN_FULL: "unknown"
  },

  // Default settings
  DEFAULTS: {
    MODEL_NAME: "qwen3:8b",
    MAX_CHUNK_SIZE: 4000,
    TIMEOUT: 180,
    TEMPERATURE: 0.4,
    TOP_P: 0.9,
    CONTEXT_SIZE: 8192,
    EXTENSION_PAUSED: false,
    PRESERVE_NAMES: true,
    FIX_PRONOUNS: true
  },

  // Storage limits
  STORAGE: {
    MAX_EVIDENCE_ENTRIES: 5,
    MAX_DATA_SIZE_BYTES: 100000,
    DATA_PURGE_AGE_DAYS: 30,
    CACHE_TTL_MS: 5 * 60 * 1000
  },

  // Processing limits
  PROCESSING: {
    MAX_RETRIES: 3,
    MAX_TEXT_LENGTH: 100000,
    MAX_MATCHES: 1000,
    MAX_PATTERN_MATCHES: 200,
    BATCH_DELAY_MS: 800,
    MAX_NAME_LENGTH: 50
  },

  // API endpoints
  API: {
    OLLAMA_BASE: "http://localhost:11434",
    OLLAMA_GENERATE: "/api/generate",
    OLLAMA_VERSION: "/api/version",
    OLLAMA_TAGS: "/api/tags",
    TIMEOUT: 200000
  },

  // CSS selectors for content detection
  SELECTORS: {
    CONTENT: [
      ".chapter-content",
      "#chapter-content",
      ".novel_content",
      ".chapter-text",
      ".entry-content",
      ".text-content",
      ".article-content",
      ".content-area",
      "article .content"
    ],
    FALLBACK: "div, article, section"
  },

  // Validation limits
  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_CONFIDENCE: 0,
    MAX_CONFIDENCE: 1,
    MIN_APPEARANCES: 1,
    MAX_TEXT_SAMPLE: 50000
  },

  // Analysis thresholds
  ANALYSIS: {
    MIN_MALE_SCORE: 3,
    MIN_FEMALE_SCORE: 3,
    HIGH_CONFIDENCE_THRESHOLD: 0.75,
    MEDIUM_CONFIDENCE_THRESHOLD: 0.4,
    TRANSLATION_ADJUSTMENT: 1
  },

  // Regex patterns (commonly used)
  PATTERNS: {
    CHAPTER_NUMBER: /chapter\s+(\d+)/i,
    DIALOGUE_QUOTED: /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g,
    DIALOGUE_COLON: /([^:]+):\s*"([^"]+)"/g,
    WHITESPACE_SPLIT: /\s+/
  }
};

if (typeof module !== "undefined") {
  module.exports = Constants;
} else {
  window.Constants = Constants;
}
