# Novel Dialogue Enhancer - Architecture & Patterns Knowledge

## Project Architecture Overview

Novel Dialogue Enhancer is a Chrome extension that uses local AI models (via Ollama) to enhance translated novel dialogues. The architecture emphasizes privacy, performance, and maintainability through modular design patterns.

### Core Design Patterns

**Modular Component Architecture**: The extension uses specialized modules for different concerns:

- Gender analysis split into 5 specialized analyzers (`CulturalAnalyzer`, `NameAnalyzer`, `PronounAnalyzer`, `RelationshipAnalyzer`, `AppearanceAnalyzer`)
- LLM operations handled by dedicated classes (`OllamaClient`, `PromptGenerator`, `TextProcessor`)
- Utility classes for specific domains (`NovelUtils`, `StatsUtils`, `GenderUtils`)
- UI components separated by function (`popup`, `options`, `content`, `background`)

**Base Class Inheritance Pattern**: Common functionality extracted to base classes:

- `BaseGenderAnalyzer` provides shared analysis methods for all gender analyzers
- `StorageManager` provides consistent data handling with caching across components
- Shared validation and utility functions in `SharedUtils`

**Message Passing Architecture**: Chrome extension messaging between:

- Content scripts ↔ Background service worker (for LLM processing and data storage)
- Popup ↔ Background service worker (for settings and whitelist management)
- Options page ↔ Background service worker (for comprehensive configuration)

**Progressive Enhancement**: Extension fails gracefully when Ollama is unavailable:

- Character detection still works without AI enhancement
- Whitelist functionality remains active
- User gets clear feedback about service availability

### Data Storage Strategy

**Optimized Character Storage Format**: Compressed format achieving 30-40% size reduction:

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {              // Numeric IDs instead of names
        name: string,             // Character name
        gender: "m"|"f"|"u",      // Compressed gender codes
        confidence: number,       // Confidence score (0-1)
        appearances: number,      // Number of appearances
        evidences: string[]       // Supporting evidence (max 5 items)
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
- **Error Recovery**: Graceful handling of individual chunk failures

### Gender Detection System

**Multi-Analyzer Approach**: Five specialized analyzers working together:

1. **Cultural Origin Detection**: Identifies western/chinese/japanese/korean contexts
   - Character pattern recognition (Unicode ranges)
   - Cultural term frequency analysis
   - Context clue detection (honorifics, cultural references)

2. **Name Pattern Analysis**: Analyzes titles, endings, and cultural patterns
   - Title/honorific detection by culture
   - Name ending patterns (cultural-specific)
   - Cultural naming convention recognition

3. **Pronoun Context Analysis**: Examines pronoun usage with inconsistency detection
   - Pronoun frequency analysis in character proximity
   - Translation error pattern detection
   - Inconsistency correction algorithms

4. **Relationship Pattern Analysis**: Character roles and social connections
   - Family relationship indicators
   - Social role analysis (cultural-aware)
   - Character archetype detection

5. **Appearance Description Analysis**: Physical descriptions and cultural appearance indicators
   - Physical feature analysis (cultural context)
   - Clothing and appearance term detection
   - Cultural beauty standard recognition

**Advanced Features**:

- **Confidence Scoring**: Weighted scoring system with cultural adjustments
- **Evidence Collection**: Up to 5 pieces of evidence per character for transparency
- **Translation Error Correction**: Detects and corrects common machine translation mistakes
- **Cultural Adaptation**: Analysis adapts to detected cultural origin

### Error Handling Patterns

**Graceful Degradation**: Core functionality continues even if sub-components fail:

- Individual analyzer failures don't stop gender detection
- LLM unavailability doesn't prevent character tracking
- Network errors handled with appropriate user feedback

**User Feedback**: Comprehensive user notification system via `Toaster`:

- Real-time progress updates during processing
- Clear error messages with actionable advice
- Success confirmation with statistics

**Timeout Management**: Configurable timeouts for all async operations:

- LLM requests with cleanup on timeout
- Permission checks with fallback logic
- Storage operations with retry mechanisms

**Input Validation**: Comprehensive validation at all input points:

- Character name validation with sanitization
- Settings validation with safe defaults
- URL validation for whitelist operations

### Performance Optimizations

**Lazy Loading**: Components initialized only when needed:

- Gender analyzers created on first use
- LLM client initialized when AI features requested
- UI components loaded progressively

**Caching Strategies**: Multi-level caching for performance:

- **Whitelist status**: Cached for 5 minutes to reduce background checks
- **Character data**: Cached across sessions with automatic cleanup
- **LLM responses**: Cached by content hash to avoid duplicate processing
- **DOM elements**: Cached with TTL to reduce query overhead

**Batch Processing**: Optimized text processing:

- Paragraphs processed in intelligent batch sizes (5-15 paragraphs)
- Delay between batches to prevent overwhelming the LLM
- Progress feedback for long-running operations

**Memory Management**: Automatic cleanup and size limits:

- Storage size monitoring with automatic pruning
- Cache TTL management to prevent memory leaks
- Large text processing limits to prevent browser crashes

### UI/UX Patterns

**Progressive Disclosure**: Information revealed as needed:

- Options organized in tabs for better navigation
- Novel details expandable to show character information
- Statistics displayed with drill-down capability

**Real-time Feedback**: Immediate user feedback for all operations:

- Progress bars during enhancement with chunk-level updates
- Status indicators for extension state and availability
- Interactive feedback for settings changes

**Responsive Design**: Mobile-friendly interfaces:

- Popup optimized for different screen sizes
- Options page scales appropriately
- Touch-friendly interaction targets

**Dark Mode Support**: Complete theming system:

- CSS custom properties for theme switching
- System preference detection and override capability
- Consistent theming across all UI components

### Security Considerations

**Input Sanitization**: All user input sanitized using DOMPurify:

- Text content sanitized before processing
- URL validation for whitelist operations
- Settings validation with type checking

**Content Security Policy**: Strict CSP prevents inline scripts:

- No eval() or dynamic script execution
- External script loading limited to approved CDNs
- Style injection controlled and validated

**Origin Validation**: Whitelist system controls where extension operates:

- Permission-based site access
- Dynamic permission requests for new sites
- User control over all site access

**Privacy Protection**: No external data transmission:

- All processing happens locally via Ollama
- No analytics or tracking
- Character data stored locally only

### Extension Lifecycle Management

**Installation**: Comprehensive setup process:

- Default settings initialization with safe values
- Permission structure establishment
- Initial whitelist configuration

**Updates**: Seamless data migration:

- Automatic migration of old format data
- Backward compatibility maintenance
- User notification of significant changes

**Uninstall**: Clean removal:

- Chrome handles extension data cleanup
- No persistent external data to clean
- User data remains local and can be exported

### Configuration Management

**Hierarchical Settings**: Multi-level configuration system:

- **Defaults**: Hard-coded safe values in `Constants`
- **Stored Settings**: User preferences in Chrome storage
- **Runtime Overrides**: Temporary session-specific settings

**Validation Pipeline**: All settings validated before storage:

- Type checking with appropriate error handling
- Range validation for numeric settings
- Sanitization for text settings

**Migration Support**: Automatic handling of format changes:

- Version detection and appropriate migration
- Fallback to defaults for corrupted data
- User notification of migration events

### Testing Approach

**Manual Testing**: Comprehensive testing workflows:

- Cross-site testing with different novel layouts
- Multiple LLM model testing
- Error condition simulation

**Error Simulation**: Controlled testing of failure scenarios:

- Network failures during LLM requests
- Service unavailability testing
- Invalid data handling verification

**Performance Monitoring**: Built-in performance tracking:

- Processing time measurement
- Memory usage monitoring
- User experience metrics

### Development Workflow

**Code Standards**: Enforced via ESLint configuration:

- ES6+ features encouraged (arrow functions, destructuring)
- No parameter mutation rule enforced
- Private methods using ES6 private fields (#method)
- Consistent code style and formatting

**Debugging Support**: Comprehensive debugging tools:

- Console logging with appropriate levels
- Extension popup provides status information
- Options page includes connection testing

**Build Process**: Simple development workflow:

- Load unpacked for development testing
- Refresh extension after changes
- Target page refresh for content script updates

### Browser Compatibility

**Manifest V3**: Modern Chrome extension architecture:

- Service worker background processing
- Modern permission system
- Enhanced security model

**Chrome 88+**: Minimum supported version:

- All required APIs available
- Consistent behavior across versions
- Modern JavaScript features supported

**Service Worker Pattern**: Background processing optimization:

- Efficient resource usage
- Proper lifecycle management
- Message passing optimization

### Deployment Considerations

**Development Mode**: Optimized for testing:

- Load unpacked functionality
- Debug mode indicators
- Development logging enabled

**Production Build**: Prepared for distribution:

- Asset optimization
- Debug logging disabled
- Security review compliance

**Version Management**: Semantic versioning with migration support:

- Clear version progression
- Migration path documentation
- User communication for breaking changes

**Distribution**: Prepared for Chrome Web Store:

- Manifest compliance checking
- Asset optimization
- Privacy policy alignment

This architecture provides a robust, scalable, and maintainable foundation for novel dialogue enhancement while prioritizing user privacy, performance, and security.
