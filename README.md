# Novel Dialogue Enhancer

A Chrome extension that improves the quality of translated web novels by enhancing dialogues to sound more natural in English using local AI models.

## Features

- **Natural Dialogue Enhancement**: Automatically converts stiff, literally-translated dialogue into more natural English using AI
- **Character Name Preservation**: Keeps original character names intact while fixing gender consistency
- **Advanced Gender Detection**: Multi-analyzer system that detects character genders from cultural context, name patterns, pronouns, relationships, and descriptions
- **Pronoun Correction**: Fixes common pronoun mistakes by tracking character genders and detecting translation errors
- **Cultural Awareness**: Adapts analysis to different cultural contexts (Western, Chinese, Japanese, Korean)
- **Whitelist-Based Security**: Only operates on user-approved domains for privacy and security
- **Optimized Storage**: Efficiently manages character data across multiple novels with automatic data purging
- **Real-time Processing**: Processes content in chunks with progress feedback and context preservation

## Installation

### Prerequisites

1. **Install Ollama**: Download and install [Ollama](https://ollama.com) on your computer
2. **Pull an AI Model**: Run `ollama pull qwen3:8b` (or another supported model)
3. **Start Ollama Server**: Run `ollama serve` to make the AI model available

### Extension Installation

#### From Chrome Web Store

(Coming soon)

#### Manual Installation

1. Download this repository as a ZIP file and extract it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extracted folder
5. The extension should now appear in your extensions list

## Usage

### Initial Setup

1. Click the extension icon in your browser toolbar
2. Add your favorite novel sites to the whitelist
3. Configure your preferences in the options page (right-click extension icon → Options)

### Using the Extension

1. Navigate to any whitelisted novel website
2. The extension will automatically detect and enhance dialogue on the page
3. Character genders are detected and tracked across chapters for consistent pronoun usage
4. Use the popup to manually trigger enhancement or adjust settings

### Supported Websites

- fanmtl.com
- novelupdates.com  
- wuxiaworld.com
- webnovel.com
- Any other novel sites you add to the whitelist

## How It Works

### AI-Powered Enhancement Process

1. **Content Detection**: Identifies the main content area of novel pages
2. **Character Analysis**: Multi-analyzer system detects character names and genders using:
   - Cultural origin detection (Western/Chinese/Japanese/Korean)
   - Name pattern analysis (titles, honorifics, endings)
   - Pronoun usage analysis with inconsistency detection
   - Relationship pattern analysis
   - Physical description analysis
3. **Text Processing**: Breaks content into manageable chunks while preserving context
4. **AI Enhancement**: Uses local Ollama models to improve dialogue naturalness
5. **Storage & Memory**: Optimized character data storage with automatic purging

### Privacy & Security

- **Local Processing**: All AI processing happens on your local machine via Ollama
- **No Data Collection**: No browsing history, personal data, or text is sent to external servers
- **Whitelist Control**: Extension only operates on user-approved domains
- **Offline Capable**: Works entirely offline once Ollama is set up

## Technical Architecture

### Core Components

- **Background Script**: Manages whitelist, API communication, and optimized data storage
- **Content Script**: Orchestrates enhancement on web pages with progress feedback  
- **Gender Analysis System**: 5 specialized analyzers for accurate character gender detection
- **LLM Integration**: Handles chunked processing with context preservation and caching
- **Novel Processing**: Character extraction, chapter detection, and style analysis
- **UI Components**: Popup for quick controls and comprehensive options page

### Data Storage Format

Character data uses an optimized compressed format (30-40% size reduction):

```javascript
{
  [novelId]: {
    chars: {
      [numericId]: {
        name: string,
        gender: "m"|"f"|"u",  // compressed codes
        confidence: number,
        appearances: number,
        evidences: string[]   // max 5 items
      }
    },
    chaps: [number],          // enhanced chapter numbers
    style: {...},            // detected novel style/genre
    lastAccess: number       // for automatic purging
  }
}
```

### Performance Optimizations

- **Element Caching**: DOM queries cached with TTL
- **Chunked Processing**: Large texts split while preserving context
- **Request Caching**: LLM responses cached by content hash
- **Data Compression**: Optimized storage format with automatic cleanup
- **Lazy Loading**: Components initialized only when needed

## Configuration

### Model Settings

- **Model Name**: Specify which Ollama model to use (default: qwen3:8b)
- **Temperature**: Control creativity vs consistency (0.1-1.0)
- **Top P**: Control language diversity (0.1-1.0)

### Performance Settings

- **Chunk Size**: Maximum text chunk size for processing (2K-16K characters)
- **Timeout**: Maximum wait time for AI responses (30-300 seconds)

### Advanced Features

- **Statistics Tracking**: Monitor usage across novels and sessions
- **Novel Management**: View detected characters and their analysis data
- **Whitelist Management**: Control which sites can be enhanced
- **Dark Mode**: Full dark theme support

## Supported AI Models

The extension works with any Ollama-compatible model. Recommended models:

- **qwen3:8b** (default) - Balanced performance and quality
- **llama3:8b** - Alternative high-quality option
- **phi3:medium** - Faster processing, good quality
- **mistral** - Lightweight option for older hardware

## Development

### Project Structure

```markdown
├── manifest.json              # Extension manifest
├── background/                 # Background service worker
├── content/                   # Content script coordination
├── popup/                     # Quick controls interface
├── options/                   # Comprehensive settings page
├── assets/js/
│   ├── gender/               # Gender analysis system
│   ├── llm/                  # AI integration
│   ├── novel/                # Novel processing modules
│   └── utils/                # Shared utilities
└── docs/                     # Documentation
```

### Key Design Patterns

- **Modular Architecture**: Specialized classes for different concerns
- **Base Class Inheritance**: Common functionality in base classes
- **Progressive Enhancement**: Graceful degradation when AI unavailable
- **Message Passing**: Chrome extension communication patterns
- **Optimized Storage**: Compressed data with automatic purging

### Development Workflow

1. Load extension: `chrome://extensions/` → "Load unpacked"
2. Make changes to code
3. Refresh extension in Chrome
4. Refresh target web page for content script changes

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Adding New Gender Analysis

1. Extend `BaseGenderAnalyzer` class
2. Add patterns to appropriate analyzer (cultural, name, pronoun, etc.)
3. Update confidence scoring in `GenderUtils.guessGender()`
4. Test with diverse character names and contexts

### Extending Novel Support

1. Add domain to whitelist (user-controlled)
2. Update content selectors in `Constants.SELECTORS` if needed
3. Test character extraction on new site layouts

## Privacy Policy

This extension operates entirely locally and does not collect any personal data. See [Privacy Policy](docs/privacy-policy.md) for full details.

## License

This project is licensed under the Apache 2.0 License - see the [LICENSE](LICENSE) file for details.

## Requirements

- **Chrome Browser**: Version 88 or higher
- **Ollama**: Must be installed and running locally
- **AI Model**: At least one Ollama-compatible model downloaded
- **Hardware**: Sufficient RAM for your chosen AI model

## Troubleshooting

### Common Issues

- **"Ollama not available"**: Ensure Ollama is installed and `ollama serve` is running
- **"Site not whitelisted"**: Add the current site to your whitelist via the popup
- **Extension not working**: Check that the site is whitelisted and Ollama is running
- **Slow processing**: Try a smaller model or reduce chunk size in settings

### Getting Help

- Check the extension options page for connection testing
- Verify Ollama installation: `ollama --version`
- Review browser console for error messages
- Ensure sufficient system resources for your AI model
