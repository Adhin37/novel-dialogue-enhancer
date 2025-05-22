# Novel Dialogue Enhancer - Architecture & Patterns Knowledge

## Project Architecture Overview

### Core Design Patterns

**Modular Component Architecture**: The extension uses specialized modules for different concerns:

- Gender analysis split into 5 specialized analyzers (CulturalAnalyzer, NameAnalyzer, PronounAnalyzer, RelationshipAnalyzer, AppearanceAnalyzer)
- LLM operations handled by dedicated classes (OllamaClient, PromptGenerator, TextProcessor)
- Utility classes for specific domains (NovelUtils, StatsUtils, GenderUtils)

**Message Passing Architecture**: Chrome extension messaging between:

- Content scripts ↔ Background service worker
- Popup ↔ Background service worker  
- Options page ↔ Background service worker

**Progressive Enhancement**: Extension fails gracefully when Ollama is unavailable

### Data Storage Strategy

**Optimized Character Storage Format**:

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {
        name: string,
        gender: "m"|"f"|"u",  // compressed
        confidence: number,
        appearances: number,
        evidences: string[]   // max 5 items
      }
    },
    chaps: [number],          // just chapter numbers
    style: {...},
    lastAccess: number
  }
}
```

**Data Purging**: Automatic cleanup of novels not accessed in 30+ days

### LLM Integration Patterns

**Chunked Processing**: Large texts split into manageable chunks (default 4000 chars)
**Context Preservation**: Surrounding text provided for coherence between chunks
**Character-Aware Prompting**: Character gender information included in prompts
**Retry Logic**: Failed chunks skipped, processing continues
**Caching**: Request caching by content hash to avoid duplicate processing

### Gender Detection System

**Multi-Analyzer Approach**:

1. Cultural origin detection (western/chinese/japanese/korean)
2. Name pattern analysis (titles, endings, cultural patterns)
3. Pronoun context analysis with inconsistency detection
4. Relationship pattern analysis
5. Appearance description analysis

**Confidence Scoring**: Weighted scoring system with cultural adjustments
**Evidence Collection**: Up to 5 pieces of evidence per character
**Inconsistency Correction**: Detects and corrects translation errors

### Error Handling Patterns

**Graceful Degradation**: Core functionality continues even if sub-components fail
**User Feedback**: Toaster notifications for all user-facing operations
**Timeout Management**: Configurable timeouts for LLM requests with cleanup
**Permission Handling**: Dynamic permission requests for new sites

### Performance Optimizations

**Lazy Loading**: Components initialized only when needed
**Caching Strategies**:

- Whitelist status cached (5min TTL)
- Character data cached across sessions
- LLM responses cached by content hash

**Batch Processing**: Paragraphs processed in optimized batch sizes
**Memory Management**: Large text processing limited to prevent memory issues

### UI/UX Patterns

**Dark Mode Support**: CSS custom properties with theme switching
**Progressive Disclosure**: Options organized in tabs, novel details expandable
**Real-time Feedback**: Progress bars and status updates during processing
**Responsive Design**: Mobile-friendly popup and options interfaces

### Security Considerations

**Input Sanitization**: All user input sanitized using DOMPurify
**Content Security Policy**: Strict CSP prevents inline scripts
**Origin Validation**: Whitelist system controls where extension runs
**No External Data**: All processing happens locally or with local Ollama

### Extension Lifecycle Management

**Installation**: Default settings initialization
**Updates**: Data migration for format changes
**Uninstall**: Cleanup handled by Chrome (no persistent external data)

### Code Organization Principles

**Single Responsibility**: Each class has one primary concern
**Dependency Injection**: Components receive dependencies rather than creating them
**Event-Driven**: Message passing and event listeners for component communication
**Immutable Updates**: Settings and data updated immutably where possible

### Configuration Management

**Hierarchical Settings**: Default → Stored → Runtime overrides
**Validation**: All settings validated before storage
**Migration**: Automatic migration of old format data
**Export/Import**: Settings can be backed up through Chrome sync

### Testing Approach

**Unit Testing**: Individual component testing (character map format testing exists)
**Manual Testing**: Comprehensive checklists for releases
**Error Simulation**: Network failures, service unavailability handled
**Performance Monitoring**: Memory and processing time tracking built-in

### Development Workflow

**ESLint Integration**: Consistent code style with custom rules
**Modern JavaScript**: ES6+ features, arrow functions, destructuring
**Private Methods**: ES6 private fields (#method) for internal class methods
**No Parameter Mutation**: Functions don't modify input parameters (ESLint enforced)

### Browser Compatibility

**Manifest V3**: Uses modern Chrome extension APIs
**Chrome 88+**: Minimum supported version
**Service Worker**: Background processing using service worker pattern
**Permissions**: Granular permissions with optional host permissions

### Deployment Considerations

**Development Mode**: Load unpacked for testing
**Production Build**: Zip creation scripts for different platforms
**Version Management**: Semantic versioning with migration support
**Distribution**: Prepared for Chrome Web Store distribution
