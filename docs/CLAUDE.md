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

5. **Gender Analysis Modules** (`assets/js/gender/`)
   - `cultural-analyzer.js` - Cultural origin detection and analysis
   - `name-analyzer.js` - Name pattern analysis (titles, honorifics, endings)
   - `pronoun-analyzer.js` - Pronoun usage and inconsistency detection
   - `relationship-analyzer.js` - Character relationship and role analysis
   - `appearance-analyzer.js` - Physical description analysis

6. **LLM Integration** (`assets/js/llm/`)
   - `ollama-client.js` - Communication with Ollama LLM API
   - `prompt-generator.js` - Consistent prompt generation
   - `text-processor.js` - Text chunking and processing utilities

7. **Integration**
   - `enhancerIntegration.js` - Combines utilities for complete enhancement
   - `toaster.js` - User notification system

### Architecture Patterns

#### Modular Component Design

- **Single Responsibility**: Each class handles one primary concern
- **Dependency Injection**: Components receive dependencies rather than creating them
- **Progressive Enhancement**: Fails gracefully when Ollama is unavailable
- **Event-Driven Communication**: Message passing between components

#### Data Flow

1. Content script finds novel text
2. NovelUtils extracts character names
3. GenderUtils analyzes character genders using 5 specialized analyzers
4. Text chunked by TextProcessor
5. Prompts generated with character context
6. LLM processes chunks via OllamaClient
7. Enhanced text replaces original content

#### Storage Optimization

Character data uses compressed format to reduce storage usage by ~30-40%:

- Numeric character IDs instead of names as keys
- Compressed gender codes ("m"/"f"/"u")
- Chapter numbers only (not objects)
- Limited evidence storage (max 5 items)
- Automatic data purging (30+ day old novels)

### Whitelist System

The extension uses a whitelist system to determine where it can run:

- New sites must be explicitly whitelisted by the user
- Whitelist status is checked when a page loads
- If a site is not whitelisted, most extension functionality is disabled

### LLM Integration

- Communicates with locally running Ollama service
- Uses models like Qwen 3 for text enhancement
- Communication flows through the background script to avoid CORS issues
- **Chunked Processing**: Large texts split into manageable pieces (default 4000 chars)
- **Context Preservation**: Surrounding text provided for coherence
- **Character-Aware Prompts**: Gender information included in prompts
- **Retry Logic**: Failed chunks skipped, processing continues

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

### Gender Detection System

Multi-analyzer approach with cultural awareness:

1. **Cultural Origin Detection**: Identifies western/chinese/japanese/korean origins
2. **Name Pattern Analysis**: Checks titles, honorifics, name endings by culture
3. **Pronoun Context Analysis**: Analyzes pronoun usage and detects inconsistencies
4. **Relationship Analysis**: Examines character roles and relationships
5. **Appearance Analysis**: Processes physical descriptions

**Confidence Scoring**: Weighted system with cultural adjustments
**Evidence Collection**: Up to 5 pieces of supporting evidence per character
**Translation Error Correction**: Detects and corrects common translation mistakes

### Error Handling Patterns

- **Graceful Degradation**: Core functionality continues if sub-components fail
- **Timeout Management**: Configurable timeouts with proper cleanup
- **User Feedback**: Toaster notifications for all operations
- **Input Sanitization**: All content sanitized using DOMPurify
- **Permission Validation**: Dynamic permission checking and requests

### Performance Considerations

- **Lazy Loading**: Components initialized only when needed
- **Caching**: Whitelist status (5min TTL), character data, LLM responses
- **Batch Processing**: Optimized paragraph batch sizes
- **Memory Management**: Large text processing limits prevent memory issues
- **Progressive UI**: Real-time progress feedback during long operations

### Code Style Guidelines

- **ES6+ Features**: Arrow functions, destructuring, modern syntax
- **Private Methods**: Use ES6 private fields (#methodName) for internal methods
- **Immutable Parameters**: Functions must not modify input parameters
- **Descriptive Naming**: Variable and function names should be self-documenting
- **JSDoc Preservation**: Keep all JSDoc comments for documentation

### Development Workflow

#### Testing the Extension

1. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the project directory

2. Testing changes:
   - After modifying files, click the refresh icon on the extension card
   - For content script changes, refresh the target web page

#### Component Integration

- Content scripts communicate with background via chrome.runtime.sendMessage
- Background processes Ollama requests to avoid CORS issues
- UI components (popup/options) update settings via chrome.storage
- Character data synced between content script and background storage

#### Security Considerations

- **Content Security Policy**: Strict CSP prevents inline scripts
- **Input Validation**: All user input validated and sanitized
- **Origin Restrictions**: Extension only runs on whitelisted domains
- **Local Processing**: No external data transmission (except local Ollama)

### Common Development Tasks

#### Adding New Gender Detection Rules

1. Identify which analyzer is most appropriate (cultural, name, pronoun, relationship, appearance)
2. Add patterns to the relevant analyzer's methods
3. Update confidence scoring if needed
4. Test with diverse character names and contexts

#### Extending LLM Functionality

1. Modify PromptGenerator for new prompt templates
2. Update TextProcessor if new text handling needed
3. Adjust OllamaClient for new request patterns
4. Update EnhancerIntegration to coordinate new features

#### Adding Support for New Novel Sites

1. Add domain to manifest.json host_permissions
2. Update content script selectors in findContentElement()
3. Test character extraction patterns work on new site
4. Add site to default whitelist if appropriate

### Architecture Notes

- The extension follows Chrome's messaging architecture (content script <-> background script)
- Uses progressive enhancement - fails gracefully when Ollama is not available
- Caches whitelist status to improve performance
- Handles text in chunks to manage large documents
- Implements comprehensive error handling with user feedback
- Optimizes storage format for performance and space efficiency
- Maintains backwards compatibility through data migration
