export const OllamaConfig = {
  API: {
    BASE:     "http://localhost:11434",
    GENERATE: "/api/generate",
    VERSION:  "/api/version",
    TAGS:     "/api/tags",
    TIMEOUT:  600000
  },
  LLM: {
    MODEL_NAME:     "qwen3.5:4b",
    MAX_CHUNK_SIZE: 80000,
    TIMEOUT:        300,
    TEMPERATURE:    0.4,
    TOP_P:          0.9,
    CONTEXT_SIZE:   8192
  }
};
