// ollamaClient.js
async function getModelName() {
    return new Promise(resolve =>
        chrome.storage.sync.get({ modelName: 'qwen3:8b' }, data => resolve(data.modelName))
    );
}

async function enhanceWithLLM(text) {
    try {
        const model = await getModelName();
        const max_tokens = 512;
        const prompt = `You are the **Novel Dialogue Enhancer**, a Chrome extension that improves the quality of translated web novels.
Objectives:
- Natural Dialogue Enhancement: Automatically convert stiff, literally-translated dialogue or narration into more natural English
- Character Name Preservation: Keep original character names intact (Chinese/Korean/Japanese)
- Title translation: Translate titles/cities (if not already translated) into English
- Pronoun Correction: Fix common pronoun mistakes by tracking character genders

Enhance the following text to meet these objectives:

"${text}"`;

        // Instead of direct fetch, use chrome.runtime.sendMessage to communicate with background script
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: "ollamaRequest",
                data: {
                    model,
                    prompt,
                    max_tokens
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
                console.info('new text: ', response.enhancedText);
                resolve(response.enhancedText || text);
            });
        });
    } catch (err) {
        console.warn('LLM call failed, falling back to rule-based:', err);
        return text;  // Fallback to your existing enhancer
    }
}

// Export for use in content or background scripts
if (typeof module !== 'undefined') {
    module.exports = {
        enhanceWithLLM
    };
} else {
    // For direct browser usage
    window.ollamaClient = {
        enhanceWithLLM
    };
}