// ollamaClient.js - Improved with chunking and better timeout handling
// Define a timeout for local Ollama calls (milliseconds)
const CLIENT_TIMEOUT = 120000; // 2 minutes per chunk
const DEFAULT_CHUNK_SIZE = 8000; // Larger chunks for better context
const DEFAULT_BATCH_SIZE = 1; // Process larger chunks individually
const BATCH_DELAY = 800; // Delay between batches
async function getModelName() {
    return new Promise(resolve =>
        chrome.storage.sync.get({ modelName: 'qwen3:8b' }, data => resolve(data.modelName))
    );
}

// Split text into manageable chunks for the LLM
function splitIntoChunks(text, maxChunkSize = 2000) {
    // If the text is short enough, return it as a single chunk
    if (text.length <= maxChunkSize) {
        return [text];
    }
    
    const chunks = [];
    
    // Try to split at paragraph boundaries
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed the limit
        if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk);
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    
    console.log(`Split text into ${chunks.length} chunks (avg size: ${Math.round(text.length / chunks.length)})`);
    return chunks;
}

async function enhanceWithLLM(text) {
    console.time('enhanceWithLLM');
    try {
        const model = await getModelName();
        console.log(`Using Ollama model: ${model}`);
        
        // Get user's preferred max chunk size
        const { maxChunkSize = DEFAULT_CHUNK_SIZE } = await new Promise(resolve => 
            chrome.storage.sync.get({ maxChunkSize: DEFAULT_CHUNK_SIZE }, resolve)
        );
        
        // For longer texts, we still need to split intelligently
        const chunks = splitIntoChunks(text, maxChunkSize);
        console.log(`Processing ${chunks.length} chunks with Ollama`);
        
        // Process each chunk
        const enhancedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i+1}/${chunks.length} (size: ${chunk.length})`);
            
            // Include context from previous and next chunks for better continuity
            let contextPrompt = "";
            if (i > 0 && chunks[i-1]) {
                // Get last paragraph from previous chunk for context
                const prevChunkLines = chunks[i-1].split('\n');
                const lastParagraph = prevChunkLines[prevChunkLines.length - 1];
                if (lastParagraph && lastParagraph.length > 20) {
                    contextPrompt += `CONTEXT FROM PREVIOUS SECTION (for continuity reference only):\n${lastParagraph}\n\n`;
                }
            }
            
            // Add context from next chunk if available
            if (i < chunks.length - 1 && chunks[i+1]) {
                const nextChunkLines = chunks[i+1].split('\n');
                const firstParagraph = nextChunkLines[0];
                if (firstParagraph && firstParagraph.length > 20) {
                    contextPrompt += `CONTEXT FROM NEXT SECTION (for continuity reference only):\n${firstParagraph}\n\n`;
                }
            }

            const prompt = `You are a dialogue enhancer for translated web novels. Your task is to enhance the following text to make it sound more natural in English.
INSTRUCTIONS:
0. Do not omit or remove any sentences or paragraphs. Every original paragraph must appear in the output, even if lightly edited for style or clarity.
1. Improve dialogue naturalness while preserving the original meaning
2. Make narration flow better in English
3. Keep all character names exactly as they are
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
                const enhancedChunk = await processChunkWithLLM(model, prompt);
                enhancedChunks.push(enhancedChunk);
                console.log(`Successfully enhanced chunk ${i+1}/${chunks.length}`);
                
                // Small delay between chunks to avoid overwhelming Ollama
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            } catch (chunkError) {
                console.warn(`Failed to enhance chunk ${i+1}, using original:`, chunkError);
                enhancedChunks.push(chunk); // Use original chunk if enhancement fails
            }
        }
        
        // Combine all enhanced chunks
        const enhancedText = enhancedChunks.join('\n\n');
        console.timeEnd('enhanceWithLLM');
        return enhancedText;
    } catch (err) {
        console.timeEnd('enhanceWithLLM');
        console.error('LLM enhancement failed:', err);
        // Error handling remains the same...
        return text;
    }
}

// Improved split function with intelligent paragraph boundaries and enhanced context handling
function splitIntoChunks(text, maxChunkSize = 4000) {
    // If the text is short enough, return it as a single chunk
    if (text.length <= maxChunkSize) {
        return [text];
    }
    
    const chunks = [];
    
    // Split at paragraph boundaries
    const paragraphs = text.split(/\n\n|\r\n\r\n/);
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        // If adding this paragraph would exceed the limit
        if (currentChunk.length + paragraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = paragraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        }
        
        // Special case: If a single paragraph is longer than maxChunkSize
        if (paragraph.length > maxChunkSize) {
            if (currentChunk === paragraph) {
                // Split this long paragraph by sentences
                const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
                currentChunk = '';
                
                for (const sentence of sentences) {
                    if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
                        chunks.push(currentChunk.trim());
                        currentChunk = sentence;
                    } else {
                        currentChunk += (currentChunk ? ' ' : '') + sentence;
                    }
                }
                
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = '';
                }
            }
        }
    }
    
    // Add the last chunk if it's not empty
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    console.log(`Split text into ${chunks.length} chunks (avg size: ${Math.round(text.length / chunks.length)})`);
    return chunks;
}

// Process a single chunk with the LLM
async function processChunkWithLLM(model, prompt) {
    // Create a promise that will reject after timeout
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`LLM request timed out after ${CLIENT_TIMEOUT/1000} seconds`)), CLIENT_TIMEOUT);
    });
    
    // Create the actual request promise
    const requestPromise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: "ollamaRequest",
            data: {
                model,
                prompt,
                max_tokens: 4096,
                temperature: 0.3,
                stream: false,
                options: {
                    enable_thinking: false
                }
            }
        }, response => {
            if (chrome.runtime.lastError) {
                console.warn('LLM communication error:', chrome.runtime.lastError);
                return reject(chrome.runtime.lastError);
            }
            
            if (response.error) {
                console.warn('LLM request failed:', response.error);
                return reject(new Error(response.error));
            }
            
            resolve(response.enhancedText || '');
        });
    });
    
    // Race between the timeout and the actual request
    return Promise.race([requestPromise, timeoutPromise]);
}

// Utility function to check if Ollama is available
async function checkOllamaAvailability() {
    try {
        // Instead of direct fetch, use message passing to background script
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                action: "checkOllamaAvailability"
            }, response => {
                if (chrome.runtime.lastError) {
                    console.warn('Ollama check communication error:', chrome.runtime.lastError);
                    resolve({ available: false, reason: chrome.runtime.lastError.message });
                    return;
                }
                
                resolve(response);
            });
        });
    } catch (err) {
        console.warn('Ollama availability check failed:', err);
        return { available: false, reason: err.message };
    }
}

// Export for use in content or background scripts
if (typeof module !== 'undefined') {
    module.exports = {
        enhanceWithLLM,
        checkOllamaAvailability
    };
} else {
    window.ollamaClient = {
        enhanceWithLLM,
        checkOllamaAvailability
    };
}