// ollamaClient.js

async function getModelName() {
    return new Promise(resolve =>
        chrome.storage.sync.get({ modelName: 'qwen3' }, data => resolve(data.modelName))
    );
}

async function enhanceWithLLM(text) {
    const model = await getModelName();
    const max_tokens=512;
    const prompt = `You are the **Novel Dialogue Enhancer**, a Chrome extension that improves the quality of translated web novels.
Objectives:
- Natural Dialogue Enhancement: Automatically convert stiff, literally-translated dialogue or narration into more natural English
- Character Name Preservation: Keep original character names intact (Chinese/Korean/Japanese)
- Title translation: Translate titles/cities (if not already translated) into English
- Pronoun Correction: Fix common pronoun mistakes by tracking character genders

Enhance the following text to meet these objectives:

"${text}"`;

    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                max_tokens
            })
        });


        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.choices?.[0]?.text?.trim() || text;
    } catch (err) {
        console.warn('LLM call failed, falling back to rule-based:', err);
        return text;  // Fallback to your existing enhancer
    }
}

// Export for use in content or background scripts
export { enhanceWithLLM };