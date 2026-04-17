# Novel Dialogue Enhancer - Architecture & Patterns Knowledge

## Project Architecture Overview

Novel Dialogue Enhancer is a Chrome extension that uses local AI models (via Ollama) to enhance translated novel dialogues. The architecture emphasizes privacy, performance, and maintainability through modular design patterns with strict coding standards and comprehensive error handling.

### Core Design Patterns

**Modular Component Architecture**: The extension uses specialized modules for different concerns:

- Gender analysis split into 6 specialized analyzers coordinated by `GenderOrchestrator`
- LLM operations handled by dedicated classes (`OllamaClient`, `PromptGenerator`, `TextProcessor`)
- Novel processing coordinated by `NovelOrchestrator` with 4 sub-modules
- UI helpers separated in `shared/ui/` (`Toaster`, `DarkModeManager`)
- Utility constants and data in `shared/utils/` (`cultural-terms.js`, `pronouns.js`)

**Base Class Inheritance Pattern**: Common functionality extracted to base classes:

- `BaseAnalyzer` provides shared analysis methods for all gender analyzers
- Shared validation and utility functions in `SharedUtils`

**Message Passing Architecture**: Chrome extension messaging between:

- Content scripts ↔ Background service worker (for LLM processing and data storage)
- Popup ↔ Background service worker (for settings and whitelist management)
- Options page ↔ Background service worker (for comprehensive configuration)

**Progressive Enhancement**: Extension fails gracefully when Ollama is unavailable:

- Character detection still works without AI enhancement
- Whitelist functionality remains active
- User gets clear feedback about service availability through `ErrorHandler`

### File Structure & Organization

```
├── manifest.json                    # Extension manifest (Manifest V3)
├── src/
│   ├── assets/icons/                # Extension icons (16/48/128 px)
│   ├── background/
│   │   └── background.js            # Service worker: whitelist, API, storage, stats
│   ├── content/
│   │   └── content.js               # Content script entry point
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── shared/
│       ├── content/
│       │   └── enhancer.js          # ContentEnhancer — core enhancement orchestrator
│       ├── gender/
│       │   ├── base-analyzer.js     # BaseAnalyzer — shared methods for all analyzers
│       │   ├── gender-orchestrator.js
│       │   ├── cultural-analyzer.js
│       │   ├── name-analyzer.js
│       │   ├── pronoun-analyzer.js
│       │   ├── relationship-analyzer.js
│       │   ├── appearance-analyzer.js
│       │   ├── multi-character-analyzer.js
│       │   ├── eastern-names.js     # Eastern name databases
│       │   └── western-names.js     # Western name databases
│       ├── lib/
│       │   └── purify.min.js        # DOMPurify for input sanitization
│       ├── llm/
│       │   ├── ollama-client.js
│       │   ├── prompt-generator.js
│       │   └── text-processor.js
│       ├── novel/
│       │   ├── novel-orchestrator.js
│       │   ├── character-extractor.js
│       │   ├── chapter-detector.js
│       │   ├── id-generator.js
│       │   └── style-analyzer.js
│       ├── ui/
│       │   ├── dark-mode-manager.js
│       │   └── toaster.js
│       └── utils/
│           ├── constants.js
│           ├── shared-utils.js
│           ├── logger.js
│           ├── error-handler.js
│           ├── element-cache.js
│           ├── cultural-terms.js
│           ├── pronouns.js
│           └── stats-utils.js
└── docs/
```

### Data Storage Strategy

**Optimized Character Storage Format**: Compressed format achieving 30-40% size reduction:

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {              // Numeric IDs instead of names as keys
        name: string,             // Character name
        gender: "m"|"f"|"u",      // Compressed gender codes
        confidence: number,       // Confidence score (0-1)
        appearances: number,      // Number of appearances
        evidences: string[],      // Supporting evidence (max 5 items)
        manualOverride?: boolean  // Optional: true when manually set via options
      }
    },
    chaps: [number],              // Just chapter numbers (not objects)
    style: {                      // Novel style information
      style: string,              // Detected genre/style
      tone: string,               // Detected tone
      confidence: number,         // Detection confidence
      analyzed: boolean           // Analysis completion flag
    },
    lastAccess: number            // Timestamp for data purging
  }
}
```

**Storage Optimization Features**:

- **Data Purging**: Automatic cleanup of novels not accessed in 30+ days
- **Size Management**: Removes oldest/smallest entries when storage exceeds limits
- **Compression**: Gender codes and numeric character IDs reduce storage footprint
- **Evidence Limiting**: Maximum 5 evidence entries per character prevents bloat

### LLM Integration Patterns

**Chunked Processing**: Large texts split into manageable chunks (default 4000 chars):

- Preserves paragraph boundaries when possible
- Handles extremely long paragraphs by sentence splitting
- Maintains optimal chunk sizes for model context windows
- Real-time progress feedback via `Toaster`

**Context Preservation**: Surrounding text provided for coherence between chunks:

- Previous chunk context for continuity
- Next chunk preview for forward planning
- Character information maintained across chunks

**Character-Aware Prompting**: Character gender information included in prompts:

- Gender summary for pronoun consistency
- Cultural context for appropriate language
- Novel style information for tone matching

**Advanced Features**:

- **Retry Logic**: Failed chunks skipped, processing continues
- **Request Caching**: Responses cached by content hash to avoid duplicate processing
- **Timeout Management**: Configurable timeouts with cleanup
- **Error Recovery**: Graceful handling of individual chunk failures via `ErrorHandler`

### Gender Detection System

**Multi-Analyzer Approach**: Six specialized analyzers coordinated by `GenderOrchestrator`:

1. **Cultural Origin Detection** (`CulturalAnalyzer`): Identifies western/chinese/japanese/korean contexts
   - Character pattern recognition (Unicode ranges)
   - Cultural term frequency analysis using `cultural-terms.js`
   - Context clue detection (honorifics, cultural references)

2. **Name Pattern Analysis** (`NameAnalyzer`): Analyzes titles, endings, and cultural patterns
   - Title/honorific detection by culture
   - Name ending patterns (cultural-specific) using `eastern-names.js` / `western-names.js`
   - Cultural naming convention recognition

3. **Pronoun Context Analysis** (`PronounAnalyzer`): Examines pronoun usage using `pronouns.js` constants
   - Pronoun frequency analysis in character proximity
   - Translation error pattern detection
   - Inconsistency correction algorithms

4. **Relationship Pattern Analysis** (`RelationshipAnalyzer`): Character roles and social connections
   - Family relationship indicators
   - Social role analysis (culture-aware)
   - Character archetype detection

5. **Appearance Description Analysis** (`AppearanceAnalyzer`): Physical descriptions
   - Physical feature analysis (cultural context)
   - Clothing and appearance term detection
   - Cultural beauty standard recognition

6. **Multi-Character Context Analysis** (`MultiCharacterAnalyzer`): Complex character interactions
   - Character interaction network analysis with sentence/dialogue caching
   - Cross-validation between multiple characters
   - Ambiguity resolution in multi-character scenes

**Advanced Features**:

- **Confidence Scoring**: Weighted scoring system with cultural adjustments
- **Evidence Collection**: Up to 5 pieces of evidence per character for transparency
- **Translation Error Correction**: Detects and corrects common machine translation mistakes
- **Cultural Adaptation**: Analysis adapts to detected cultural origin

### Error Handling & User Feedback

**ErrorHandler**: Comprehensive error management:

- **Categorized Errors**: Network, Ollama unavailable, processing, permission, timeout, etc.
- **User-Friendly Messages**: Technical errors translated to actionable user guidance
- **Recovery Mechanisms**: Automatic retry for transient errors
- **Error Suppression**: Prevents error spam while maintaining user awareness

**Graceful Degradation**: Core functionality continues even if sub-components fail:

- Individual analyzer failures don't stop gender detection
- LLM unavailability doesn't prevent character tracking
- Network errors handled with appropriate user feedback

### Performance Optimizations

**Lazy Loading**: Components initialized only when needed:

- Gender analyzers created on first use
- LLM client initialized when AI features requested
- UI components loaded progressively

**Caching Strategies**: Multi-level caching for performance:

- **Whitelist Status**: Cached for 5 minutes to reduce background checks
- **Character Data**: Cached across sessions with automatic cleanup
- **LLM Responses**: Cached by content hash to avoid duplicate processing
- **DOM Elements**: Cached with TTL using `ElementCache` to reduce query overhead
- **Multi-Character Analysis**: Sentence/dialogue caching in `MultiCharacterAnalyzer`

**Batch Processing**: Optimized text processing:

- Paragraphs processed in intelligent batch sizes
- Delay between batches to prevent overwhelming the LLM
- Progress feedback for long-running operations

**Memory Management**: Automatic cleanup and size limits:

- Storage size monitoring with automatic pruning
- Cache TTL management to prevent memory leaks

### UI/UX Patterns

**Real-time Feedback**: Immediate user feedback for all operations:

- `Toaster` provides fixed-position notifications with progress indicators
- Status indicators for extension state and availability

**Dark Mode Support**: Complete theming system via `DarkModeManager`:

- CSS custom properties for theme switching
- System preference detection and override capability via Chrome storage
- Consistent theming across all UI components

### Security Considerations

**Input Sanitization**: All user input sanitized using DOMPurify (`shared/lib/purify.min.js`):

- Text content sanitized before processing
- URL validation for whitelist operations
- Settings validation with type checking

**Content Security Policy**: Strict CSP prevents inline scripts.

**Origin Validation**: Whitelist system controls where extension operates:

- Permission-based site access
- Dynamic permission requests for new sites
- User control over all site access

**Privacy Protection**: No external data transmission:

- All processing happens locally via Ollama
- No analytics or tracking
- Character data stored locally only

### Coding Standards & Quality

**Key Principles**:

- **No Parameter Mutation**: Functions never modify input parameters (see `code-rules.md`)
- **ES6+ Features**: Arrow functions, destructuring, template literals, private fields
- **Immutability**: Always create new data structures
- **No inline comments**: Code should be self-documenting via well-named identifiers

**Architecture Enforcement**:

- Base class inheritance for shared functionality (`BaseAnalyzer`)
- Modular design with single responsibility
- Centralized constants and configuration (`Constants`)
- Shared utilities for common operations (`SharedUtils`)

### Extension Lifecycle Management

**Installation**: Default settings initialization, permissions setup.

**Updates**: Automatic migration of old format data with backward compatibility.

**Uninstall**: Chrome handles extension data cleanup; no persistent external data.

### Browser Compatibility

**Manifest V3**: Modern Chrome extension architecture with service worker background processing.

**Chrome 88+**: Minimum supported version for all required APIs.

This architecture provides a robust, scalable, and maintainable foundation for novel dialogue enhancement while prioritizing user privacy, performance, security, and code quality.
