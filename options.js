// options.js
const input = document.getElementById('modelName');
const saveBtn = document.getElementById('save');

// Load existing value
chrome.storage.sync.get({ modelName: 'qwen3' }, ({ modelName }) => {
    input.value = modelName;
});

saveBtn.onclick = () => {
    chrome.storage.sync.set({ modelName: input.value.trim() || 'qwen3' });
};
