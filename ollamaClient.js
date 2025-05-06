// ollamaClient.js
/**
 * Ollama client module for Novel Dialogue Enhancer
 */
class OllamaClient {
  constructor() {
    this.CLIENT_TIMEOUT = 120000;
    this.DEFAULT_CHUNK_SIZE = 8000;
    this.BATCH_DELAY = 800;
  }

  async getModelName() {
    return new Promise((resolve) =>
      chrome.storage.sync.get({ modelName: "qwen3:8b" }, (data) =>
        resolve(data.modelName)
      )
    );
  }

  async enhanceWithLLM(text) {
    console.time("enhanceWithLLM");
    try {
      const model = await this.getModelName();
      console.log(`Using Ollama model: ${model}`);

      const { maxChunkSize = this.DEFAULT_CHUNK_SIZE } = await new Promise(
        (resolve) =>
          chrome.storage.sync.get(
            { maxChunkSize: this.DEFAULT_CHUNK_SIZE },
            resolve
          )
      );

      const chunks = this.splitIntoChunks(text, maxChunkSize);
      console.log(`Processing ${chunks.length} chunks with Ollama`);

      const enhancedChunks = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(
          `Processing chunk ${i + 1}/${chunks.length} (size: ${chunk.length})`
        );

        let contextPrompt = "";
        if (i > 0 && chunks[i - 1]) {
          const prevChunkLines = chunks[i - 1].split("\n");
          const lastParagraph = prevChunkLines[prevChunkLines.length - 1];
          if (lastParagraph && lastParagraph.length > 20) {
            contextPrompt += `CONTEXT FROM PREVIOUS SECTION (for continuity reference only):\n${lastParagraph}\n\n`;
          }
        }

        if (i < chunks.length - 1 && chunks[i + 1]) {
          const nextChunkLines = chunks[i + 1].split("\n");
          const firstParagraph = nextChunkLines[0];
          if (firstParagraph && firstParagraph.length > 20) {
            contextPrompt += `CONTEXT FROM NEXT SECTION (for continuity reference only):\n${firstParagraph}\n\n`;
          }
        }

        const prompt = `You are a dialogue enhancer for translated web novels. Your task is to enhance the following text to make it sound more natural in English.
INSTRUCTIONS:
0. IMPORTANT: Do not omit or remove any sentences or paragraphs. Every original paragraph must appear in the output, even if lightly edited for style or clarity.
1. Improve dialogue/narration naturalness while preserving the original meaning
2. Make dialogue/narration flow better in English
3. Keep all character names in the same language
4. Fix any pronoun inconsistencies
5. Briefly translate any foreign titles/cities/terms to English
6. IMPORTANT: Return ONLY the enhanced text with no explanations, analysis, or commentary
7. IMPORTANT: Do not use markdown formatting or annotations
8. Maintain paragraph breaks as in the original text as much as possible
/no_think

${contextPrompt}
TEXT TO ENHANCE:

${chunk}`;

        try {
          const enhancedChunk = await this.processChunkWithLLM(model, prompt);
          enhancedChunks.push(enhancedChunk);
          console.log(`Successfully enhanced chunk ${i + 1}/${chunks.length}`);

          if (i < chunks.length - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.BATCH_DELAY)
            );
          }
        } catch (chunkError) {
          console.warn(
            `Failed to enhance chunk ${i + 1}, using original:`,
            chunkError
          );
          enhancedChunks.push(chunk);
        }
      }

      const enhancedText = enhancedChunks.join("\n\n");
      console.timeEnd("enhanceWithLLM");
      return enhancedText;
    } catch (err) {
      console.timeEnd("enhanceWithLLM");
      console.error("LLM enhancement failed:", err);
      return text;
    }
  }

  splitIntoChunks(text, maxChunkSize = 4000) {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];

    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (
        currentChunk.length + paragraph.length + 2 > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }

      if (paragraph.length > maxChunkSize) {
        if (currentChunk === paragraph) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          currentChunk = "";

          for (const sentence of sentences) {
            if (
              currentChunk.length + sentence.length > maxChunkSize &&
              currentChunk.length > 0
            ) {
              chunks.push(currentChunk.trim());
              currentChunk = sentence;
            } else {
              currentChunk += (currentChunk ? " " : "") + sentence;
            }
          }

          if (currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = "";
          }
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log(
      `Split text into ${chunks.length} chunks (avg size: ${Math.round(
        text.length / chunks.length
      )})`
    );
    return chunks;
  }

  async processChunkWithLLM(model, prompt) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `LLM request timed out after ${
                this.CLIENT_TIMEOUT / 1000
              } seconds`
            )
          ),
        this.CLIENT_TIMEOUT
      );
    });

    const requestPromise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        {
          action: "ollamaRequest",
          data: {
            model,
            prompt,
            max_tokens: 4096,
            temperature: 0.3,
            stream: false
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("LLM communication error:", chrome.runtime.lastError);
            return reject(chrome.runtime.lastError);
          }

          if (response.error) {
            console.warn("LLM request failed:", response.error);
            return reject(new Error(response.error));
          }

          resolve(response.enhancedText || "");
        }
      );
    });

    return Promise.race([requestPromise, timeoutPromise]);
  }

  async checkOllamaAvailability() {
    try {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "checkOllamaAvailability"
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Ollama check communication error:",
                chrome.runtime.lastError
              );
              resolve({
                available: false,
                reason: chrome.runtime.lastError.message
              });
              return;
            }

            resolve(response);
          }
        );
      });
    } catch (err) {
      console.warn("Ollama availability check failed:", err);
      return { available: false, reason: err.message };
    }
  }
}

if (typeof module !== "undefined") {
  module.exports = OllamaClient;
} else {
  window.ollamaClient = OllamaClient;
}
