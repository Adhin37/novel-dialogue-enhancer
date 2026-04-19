export const TextLimits = {
  PROCESSING: {
    MAX_RETRIES:         3,
    MAX_TEXT_LENGTH:     100000,
    MAX_MATCHES:         1000,
    MAX_PATTERN_MATCHES: 200,
    BATCH_DELAY_MS:      800,
    MAX_NAME_LENGTH:     50
  },
  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 50,
    MIN_CONFIDENCE:  0,
    MAX_CONFIDENCE:  1,
    MIN_APPEARANCES: 1,
    MAX_TEXT_SAMPLE: 50000
  },
  PATTERNS: {
    CHAPTER_NUMBER:   /chapter\s+(\d+)/i,
    DIALOGUE_QUOTED:  /"([^"]+)"\s*,?\s*([^.!?]+?)(?:\.|!|\?)/g,
    DIALOGUE_COLON:   /([^:]+):\s*"([^"]+)"/g,
    WHITESPACE_SPLIT: /\s+/
  }
};
