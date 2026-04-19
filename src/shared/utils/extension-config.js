export const ExtensionConfig = {
  // Keys match chrome.storage.sync keys so objects can be spread directly
  DEFAULTS: {
    isExtensionPaused: false,
    preserveNames:     true,
    fixPronouns:       true
  },
  STORAGE: {
    MAX_EVIDENCE_ENTRIES: 5,
    MAX_DATA_SIZE_BYTES:  100000,
    DATA_PURGE_AGE_DAYS:  90,
    CACHE_TTL_MS:         5 * 60 * 1000,
    LLM_CACHE_TTL_MS:     12 * 60 * 60 * 1000
  }
};
