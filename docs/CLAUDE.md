# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Novel Dialogue Enhancer - Chrome Extension Architecture

Novel Dialogue Enhancer is a Chrome extension that enhances dialogue in online novels using local LLM technology (Ollama). The architecture has been optimized for performance, maintainability, and user privacy.

### Core Architecture Principles

1. **Whitelist-Based Security**: Extension only operates on user-approved domains
2. **Modular Component Design**: Specialized classes for different concerns with single responsibility
3. **Base Class Inheritance**: Common functionality extracted to base classes (BaseGenderAnalyzer, StorageManager)
4. **Shared Utilities**: Centralized validation, gender compression, and common operations
5. **Progressive Enhancement**: Graceful degradation when Ollama is unavailable
6. **Optimized Storage**: Compressed data format with automatic purging
7. **Local Processing**: All AI processing happens locally via Ollama

### Key Components

#### 1. Background Script (`background/background.js`)

- Manages whitelist of allowed sites with 5-minute cache
- Handles Ollama API communication (bypasses CORS restrictions)
- Manages optimized character data storage with compression
- Implements data purging (30+ day old novels automatically removed)
- Tracks global statistics across all novels and sessions
- Handles Chrome extension messaging and permissions

#### 2. Content Script (`content/content.js`)

- Checks whitelist status before activation
- Orchestrates enhancement process on whitelisted pages
- Uses ContentElementCache for DOM query optimization
- Handles chunked text processing with real-time progress feedback
- Communicates with Background script for LLM processing
- Manages MutationObserver for dynamic content detection

#### 3. UI Components

- **Popup** (`popup/`) - Whitelist management, quick enhancement controls, status display
- **Options Page** (`options/`) - Comprehensive settings, whitelist administration, novel statistics, model configuration

#### 4. Core Integration Modules

- `ContentEnhancerIntegration` - Main orchestrator combining all utilities and handling enhancement workflow
- `NovelUtils` - Novel processing, metadata extraction, and character map management
- `GenderUtils` - Character gender detection coordinator using multiple analyzers

#### 5. Gender Analysis System (`assets/js/gender/`)

- `BaseGenderAnalyzer` - Common analysis methods and patterns for inheritance
- `CulturalAnalyzer` - Cultural origin detection (western/chinese/japanese/korean) with context awareness
- `NameAnalyzer` - Name pattern analysis including titles, honorifics, and cultural endings
- `PronounAnalyzer` - Pronoun usage analysis with translation error detection and correction
- `RelationshipAnalyzer` - Character relationship and role analysis
- `AppearanceAnalyzer` - Physical description analysis for gender indicators

#### 6. LLM Integration (`assets/js/llm/`)

- `OllamaClient` - API communication with caching, timeout handling, and availability checking
- `PromptGenerator` - Consistent prompt generation with character context and novel style information
- `TextProcessor` - Text chunking, context preservation, and response cleaning

#### 7. Novel Processing Modules (`assets/js/novel/`)

- `NovelCharacterExtractor` - Character name extraction from text using multiple patterns
- `NovelChapterDetector` - Chapter information detection from titles and content
- `NovelIdGenerator` - Unique novel identification from URL and title
- `NovelStorageManager` - Extends StorageManager for novel-specific operations
- `NovelStyleAnalyzer` - Genre and style detection for better prompt context

#### 8. Shared Utilities (`assets/js/utils/`)

- `SharedUtils` - Common validation, sanitization, gender compression, and security functions
- `Constants` - Centralized configuration, magic numbers, and default values
- `StorageManager` - Base storage operations with caching and TTL management
- `StatsUtils` - Statistics tracking across sessions
- `DarkModeManager` - Theme management with system preference detection

### Data Flow & Architecture

1. **Whitelist Check**: Content script verifies site approval before any activation
2. **Character Analysis**: Multi-analyzer approach determines character genders with cultural context
3. **Text Processing**: Content chunked with context preservation for optimal LLM processing
4. **LLM Enhancement**: Background processes chunks via Ollama with character context and style information
5. **Storage**: Optimized character data stored with compression and automatic purging after 30 days

### Optimized Storage Format

Character data uses a compressed format achieving 30-40% size reduction:

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {              // Numeric IDs instead of names as keys
        name: string,             // Character name
        gender: "m"|"f"|"u",      // Compressed gender codes
        confidence: number,       // 0.0 to 1.0 confidence score
        appearances: number,      // Number of appearances
        evidences: string[]       // Max 5 evidence entries
      }
    },
    chaps: [number],              // Just chapter numbers, not objects
    style: {                      // Novel style information
      style: string,              // Detected genre/style
      tone: string,               // Detected tone
      confidence: number,         // Style detection confidence
      analyzed: boolean           // Whether analysis is complete
    },
    lastAccess: number            // Timestamp for purging logic
  }
}
```

### Gender Detection System

Multi-analyzer approach with cultural awareness and translation error correction:

1. **Cultural Origin Detection**: Identifies western/chinese/japanese/korean contexts using character patterns and cultural terms
2. **Name Pattern Analysis**: Analyzes titles, honorifics, name endings, and cultural naming conventions
3. **Pronoun Analysis**: Detects usage patterns, corrects translation errors, and identifies inconsistencies
4. **Relationship Analysis**: Examines character roles, family relationships, and social connections
5. **Appearance Analysis**: Processes physical descriptions and cultural appearance indicators

**Advanced Features**:

- **Confidence Scoring**: Weighted system with cultural adjustments
- **Translation Error Correction**: Detects and corrects common machine translation mistakes
- **Evidence Collection**: Up to 5 pieces of supporting evidence per character
- **Inconsistency Resolution**: Handles conflicting gender indicators intelligently

### Performance Optimizations

1. **Element Caching**: DOM queries cached with 5-second TTL using ContentElementCache
2. **Storage Caching**: Settings and whitelist cached with expiration in StorageManager
3. **Chunked Processing**: Large texts split with context preservation using TextProcessor
4. **Request Caching**: LLM responses cached by content hash to avoid duplicate processing
5. **Data Compression**: Storage format optimized for size and efficiency
6. **Lazy Loading**: Components initialized only when needed
7. **Memory Management**: Automatic cleanup of old data and cache entries

### Code Organization & Standards

- **ES6+ Features**: Arrow functions, destructuring, private fields (#method), template literals
- **No Parameter Mutation**: Functions don't modify input parameters (ESLint enforced)
- **Base Class Inheritance**: Common functionality extracted to base classes
- **Shared Constants**: Magic numbers and configuration centralized in Constants
- **Centralized Validation**: SharedUtils provides common validation patterns
- **Error Handling**: Comprehensive error handling with user feedback via Toaster
- **Security**: Input sanitization using DOMPurify, CSP compliance

### Development Workflow

#### Testing Changes

1. Load extension in Chrome: `chrome://extensions/` → "Load unpacked"
2. Refresh extension after code changes
3. Refresh target web page for content script changes
4. Use browser console and extension popup for debugging

#### Common Patterns

- Use `SharedUtils.validateCharacterName()` for name validation
- Use `SharedUtils.compressGender()` for storage optimization
- Extend `BaseGenderAnalyzer` for new gender analysis methods
- Use `Constants` for configuration values and thresholds
- Use `StorageManager` for consistent data handling with caching

#### Adding New Gender Analysis

1. Create new class extending `BaseGenderAnalyzer` or add to existing analyzer
2. Add patterns to appropriate analyzer (cultural, name, pronoun, relationship, appearance)
3. Update confidence scoring in `GenderUtils.guessGender()`
4. Test with diverse character names and cultural contexts
5. Add evidence collection for transparency

#### Extending Novel Support

1. Add domain to whitelist through user interface (no code changes needed)
2. Update content selectors in `Constants.SELECTORS` if new site has unique structure
3. Test character extraction and enhancement on new site layouts
4. Verify style detection works for new content types

### Architecture Notes

- **Message Passing**: Chrome extension messaging between content ↔ background with comprehensive error handling
- **Whitelist Security**: Extension remains completely inactive on non-whitelisted sites
- **Storage Strategy**: Local storage for character data, sync storage for user settings
- **Error Recovery**: Comprehensive error handling with user feedback via toaster notifications
- **Memory Management**: Caching with TTL and size limits, automatic cleanup
- **Privacy**: No external data transmission, all processing local

### Critical Implementation Details

1. **No localStorage/sessionStorage**: Not supported in Claude.ai artifacts environment
2. **Whitelist Gating**: All functionality conditional on explicit site approval
3. **Compressed Storage**: Gender codes ("m"/"f"/"u") and numeric IDs for efficiency
4. **Cultural Awareness**: Analysis adapts to detected cultural origin automatically
5. **Translation Error Correction**: Detects and corrects common machine translation mistakes
6. **Progressive Enhancement**: Core functionality works without Ollama, enhanced with it
7. **Security First**: Input sanitization, CSP compliance, origin validation

### Extension Lifecycle Management

- **Installation**: Default settings initialization, permissions setup
- **Updates**: Data migration for format changes with backward compatibility
- **Uninstall**: Cleanup handled by Chrome, no persistent external data
- **Permissions**: Dynamic permission requests for new sites

### Testing Approach

- **Manual Testing**: Comprehensive checklists for releases
- **Error Simulation**: Network failures, service unavailability, invalid data
- **Performance Monitoring**: Memory usage and processing time tracking
- **Cross-site Testing**: Multiple novel sites with different layouts
- **Model Testing**: Different Ollama models and configurations

### Browser Compatibility

- **Manifest V3**: Uses modern Chrome extension APIs
- **Chrome 88+**: Minimum supported version for all features
- **Service Worker**: Background processing using service worker pattern
- **Permissions**: Granular permissions with optional host permissions for security

This architecture provides a robust, scalable foundation for novel dialogue enhancement with strong performance characteristics, comprehensive user control through whitelisting, privacy protection through local processing, and maintainable code structure.
