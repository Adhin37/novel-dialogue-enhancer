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
      OLLAMA_TAGS: "/api/tags"
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
    }
  };
  
  if (typeof module !== "undefined") {
    module.exports = Constants;
  } else {
    window.Constants = Constants;
  }