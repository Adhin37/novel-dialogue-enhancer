// ollamaClient.js
// Define a timeout for local Ollama calls (milliseconds)
const CLIENT_TIMEOUT = 30000;
async function getModelName() {
    return new Promise(resolve =>
        chrome.storage.sync.get({ modelName: 'llama3' }, data => resolve(data.modelName))
    );
}

async function enhanceWithLLM(text) {
    console.time('enhanceWithLLM');
    try {
        const model = await getModelName();
        console.log(`Using Ollama model: ${model}`);
        
        const max_tokens = 4096;
        const prompt = `You are the **Novel Dialogue Enhancer** that improves the quality of translated web novels.
Objectives:
- Natural Dialogue Enhancement: Automatically convert stiff, literally-translated dialogue or narration into more natural English
- Character Name Preservation: Keep original character names intact (Chinese/Korean/Japanese)
- Title translation: Translate titles/cities (if not already translated) into English
- Pronoun Correction: Fix common pronoun mistakes by tracking character genders

Enhance the following text to meet these objectives:

"${text}"`;

        console.log(`Starting LLM enhancement request (text length: ${text.length})`);
        
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
                    max_tokens,
                    temperature: 0.2 // Lower temperature for more consistent outputs
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
                
                console.log('LLM enhancement successful, result length:', 
                    response.enhancedText ? response.enhancedText.length : 0);
                resolve(response.enhancedText || text);
            });
        });
        
        // Race between the timeout and the actual request
        const enhancedText = await Promise.race([requestPromise, timeoutPromise]);
        console.timeEnd('enhanceWithLLM');
        return enhancedText;
    } catch (err) {
        console.timeEnd('enhanceWithLLM');
        console.error('LLM enhancement failed:', err);
        // Add a log message to help with debugging specific errors
        if (err.message.includes('SyntaxError')) {
            console.error('This appears to be a JSON parsing error. Ollama might be returning malformed JSON.');
        } else if (err.message.includes('timed out')) {
            console.error('The request to Ollama timed out. Check if Ollama is running properly.');
        } else if (err.message.includes('Failed to fetch')) {
            console.error('Could not connect to Ollama. Make sure it\'s running on http://localhost:11434');
        }
        
        console.warn('Falling back to rule-based enhancement');
        return text;  // Fallback to existing enhancer
    }
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
                
                if (response.available) {
                    console.log(`Ollama is available, version: ${response.version}`);
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