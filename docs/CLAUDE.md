# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Novel Dialogue Enhancer - Chrome Extension Architecture

Novel Dialogue Enhancer is a Chrome extension that enhances dialogue in online novels using LLM technology (Ollama). The architecture has been optimized for performance and maintainability.

### Core Architecture Principles

1. **Whitelist-Based Operation**: Extension only operates on user-approved domains
2. **Modular Component Design**: Specialized classes for different concerns with single responsibility
3. **Base Class Inheritance**: Common functionality extracted to base classes (BaseGenderAnalyzer, StorageManager)
4. **Shared Utilities**: Centralized validation, gender compression, and common operations
5. **Progressive Enhancement**: Graceful degradation when Ollama is unavailable
6. **Optimized Storage**: Compressed data format with automatic purging

### Key Components

1. **Background Script** (`background/background.js`)
   - Manages whitelist of allowed sites with 5-minute cache
   - Handles Ollama API communication (bypasses CORS)
   - Manages optimized character data storage with compression
   - Implements data purging (30+ day old novels)
   - Tracks global statistics across all novels

2. **Content Script** (`content/content.js`)
   - Checks whitelist status before activation
   - Orchestrates enhancement process on whitelisted pages
   - Uses ElementCache for DOM query optimization
   - Handles chunked text processing with progress feedback
   - Communicates with Background script for LLM processing

3. **UI Components**
   - **Popup** (`popup/`) - Whitelist management, enhancement controls
   - **Options** (`options/`) - Comprehensive settings, whitelist admin, novel statistics

4. **Core Modules**
   - `EnhancerIntegration` - Main orchestrator combining all utilities
   - `NovelUtils` - Novel processing and metadata extraction
   - `GenderUtils` - Character gender detection coordinator

5. **Gender Analysis System** (`assets/js/gender/`)
   - `BaseGenderAnalyzer` - Common analysis methods and patterns
   - `CulturalAnalyzer` - Cultural origin detection (western/chinese/japanese/korean)
   - `NameAnalyzer` - Name pattern analysis (titles, honorifics, endings)
   - `PronounAnalyzer` - Pronoun usage and inconsistency detection
   - `RelationshipAnalyzer` - Character relationship and role analysis
   - `AppearanceAnalyzer` - Physical description analysis

6. **LLM Integration** (`assets/js/llm/`)
   - `OllamaClient` - API communication with caching and timeout handling
   - `PromptGenerator` - Consistent prompt generation with character context
   - `TextProcessor` - Text chunking and response cleaning

7. **Novel Processing Modules** (`assets/js/novel/`)
   - `NovelCharacterExtractor` - Character name extraction from text
   - `NovelChapterDetector` - Chapter information detection
   - `NovelIdGenerator` - Unique novel identification
   - `NovelStorageManager` - Extends StorageManager for novel-specific operations
   - `NovelStyleAnalyzer` - Genre and style detection

8. **Shared Utilities** (`assets/js/utils/`)
   - `SharedUtils` - Common validation, sanitization, gender compression
   - `Constants` - Centralized configuration and magic numbers
   - `StorageManager` - Base storage operations with caching
   - `StatsUtils` - Statistics tracking

### Data Flow & Architecture

1. **Whitelist Check**: Content script verifies site approval before activation
2. **Character Analysis**: Multi-analyzer approach determines character genders with cultural context
3. **Text Processing**: Content chunked with context preservation for LLM processing
4. **LLM Enhancement**: Background processes chunks via Ollama with character context
5. **Storage**: Optimized character data stored with compression and automatic purging

### Optimized Storage Format

Character data uses compressed format (30-40% size reduction):

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {
        name: string,
        gender: "m"|"f"|"u",  // compressed
        confidence: number,
        appearances: number,
        evidences: string[]   // max 5
      }
    },
    chaps: [number],          // just chapter numbers
    style: {...},
    lastAccess: number
  }
}
```

### Gender Detection System

Multi-analyzer approach with cultural awareness:

1. **Cultural Origin**: Identifies western/chinese/japanese/korean contexts
2. **Name Patterns**: Analyzes titles, honorifics, endings by culture
3. **Pronoun Analysis**: Detects usage patterns and corrects translation errors
4. **Relationships**: Examines character roles and connections
5. **Appearance**: Processes physical descriptions

**Confidence Scoring**: Weighted system with cultural adjustments
**Translation Error Correction**: Detects and corrects common MT mistakes

### Performance Optimizations

1. **Element Caching**: DOM queries cached with 5-second TTL
2. **Storage Caching**: Settings and whitelist cached with expiration
3. **Chunked Processing**: Large texts split with context preservation
4. **Request Caching**: LLM responses cached by content hash
5. **Data Compression**: Storage format optimized for size and efficiency
6. **Lazy Loading**: Components initialized only when needed

### Code Organization & Standards

- **ES6+ Features**: Arrow functions, destructuring, private fields (#method)
- **No Parameter Mutation**: Functions don't modify input parameters (ESLint enforced)
- **Base Class Inheritance**: Common functionality in base classes
- **Shared Constants**: Magic numbers centralized in Constants
- **Centralized Validation**: SharedUtils provides common validation patterns

### Development Workflow

#### Testing Changes

1. Load extension in Chrome: `chrome://extensions/` → "Load unpacked"
2. Refresh extension after changes
3. Refresh target web page for content script changes

#### Common Patterns

- Use `SharedUtils.validateCharacterName()` for name validation
- Use `SharedUtils.compressGender()` for storage optimization
- Extend `BaseGenderAnalyzer` for new gender analysis methods
- Use `Constants` for configuration values and thresholds

#### Adding New Gender Analysis

1. Extend `BaseGenderAnalyzer` or use existing analyzer methods
2. Add patterns to appropriate analyzer (cultural, name, pronoun, etc.)
3. Update confidence scoring in `GenderUtils.guessGender()`
4. Test with diverse character names and contexts

#### Extending Novel Support

1. Add domain to whitelist (user-controlled)
2. Update content selectors in `Constants.SELECTORS` if needed
3. Test character extraction on new site layouts

### Architecture Notes

- **Message Passing**: Chrome extension messaging between content ↔ background
- **Whitelist Security**: Extension remains inactive on non-whitelisted sites
- **Storage Strategy**: Local storage for character data, sync storage for settings
- **Error Recovery**: Comprehensive error handling with user feedback
- **Memory Management**: Caching with TTL and size limits

### Critical Implementation Details

1. **No localStorage/sessionStorage**: Not supported in Claude.ai artifacts environment
2. **Whitelist Gating**: All functionality conditional on site approval
3. **Compressed Storage**: Gender codes and numeric IDs for efficiency
4. **Cultural Awareness**: Analysis adapts to detected cultural origin
5. **Translation Error Correction**: Detects common MT mistakes
6. **Progressive Enhancement**: Works without Ollama, enhanced with it

This architecture provides a robust, scalable foundation for novel dialogue enhancement with strong performance characteristics, user control through whitelisting, and maintainable code structure.
