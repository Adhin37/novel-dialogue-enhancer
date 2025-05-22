# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Novel Dialogue Enhancer - Chrome Extension Architecture

Novel Dialogue Enhancer is a Chrome extension that enhances dialogue in online novels using LLM technology (Ollama).

### Key Components

1. **Background Script** (`background/background.js`)
   - Manages whitelist of allowed sites
   - Handles permission requests
   - Manages character data storage
   - Processes Ollama API requests

2. **Content Script** (`content/content.js`)
   - Runs on whitelisted web pages
   - Finds and enhances novel text
   - Communicates with Background script for LLM processing

3. **UI Components**
   - Popup (`popup/`) - Controls for enabling/disabling and site whitelisting
   - Options page (`options/`) - Configuration for LLM settings and whitelist management

4. **Utility Modules** (`assets/js/utils/`)
   - `novelUtils.js` - Core novel processing functionality
   - `genderUtils.js` - Character gender detection
   - `statsUtils.js` - Statistics tracking

5. **Integration**
   - `enhancerIntegration.js` - Combines utilities for complete enhancement
   - `ollamaClient.js` - Communication with Ollama LLM API

### Whitelist System

The extension uses a whitelist system to determine where it can run:

- New sites must be explicitly whitelisted by the user
- Whitelist status is checked when a page loads
- If a site is not whitelisted, most extension functionality is disabled

### LLM Integration

- Communicates with locally running Ollama service
- Uses models like Qwen 3 for text enhancement
- Communication flows through the background script to avoid CORS issues

### Character Data Storage

The extension uses an optimized format for storing character data:

```javascript
{
  [novelId]: {
    chars: {                      // Character data
      [characterId]: {            // Numeric ID instead of full name
        name: string,             // Character name
        gender: string,           // "m", "f", "u" for "male", "female", "unknown"
        confidence: number,       // Confidence score (0-1)
        appearances: number,      // Number of appearances
        evidences: string[]       // Supporting evidence (limited to 5 entries)
      }
    },
    chaps: [number],              // Enhanced chapter numbers
    style: {...},                 // Novel style information
    lastAccess: number            // Timestamp for data purging
  }
}
```

## Common Development Tasks

### Testing the Extension

1. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the project directory

2. Testing changes:
   - After modifying files, click the refresh icon on the extension card
   - For content script changes, refresh the target web page

### Architecture Notes

- The extension follows Chrome's messaging architecture (content script <-> background script)
- Uses progressive enhancement - fails gracefully when Ollama is not available
- Caches whitelist status to improve performance
- Handles text in chunks to manage large documents
