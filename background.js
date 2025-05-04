// Listen for installation or update
chrome.runtime.onInstalled.addListener(function() {
  // Set default settings
  chrome.storage.sync.set({
    enhancerEnabled: true,
    preserveNames: true,
    fixPronouns: true,
    characterMap: {} // Store character names and their genders
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "updateCharacterMap") {
    // Update our character map with newly discovered characters
    chrome.storage.sync.get('characterMap', function(data) {
      const characterMap = data.characterMap || {};
      
      // Merge the new character info with existing data
      Object.keys(request.characters).forEach(name => {
        if (!characterMap[name]) {
          characterMap[name] = request.characters[name];
        }
      });
      
      chrome.storage.sync.set({ characterMap: characterMap });
    });
  }
  
  return true;
});