# Novel Dialogue Enhancer

A Chrome extension that improves the quality of translated web novels by enhancing dialogues to sound more natural in English.

## Features

- **Natural Dialogue Enhancement**: Automatically converts stiff, literally-translated dialogue into more natural English
- **Character Name Preservation**: Keeps original character names intact
- **Pronoun Correction**: Fixes common pronoun mistakes by tracking character genders
- **Dynamic Content Detection**: Works with various novel websites by intelligently finding the content area
- **Customizable Settings**: Toggle features on/off according to your preferences
- **Optimized Data Storage**: Efficiently manages character data across multiple novels

## Installation

### From Chrome Web Store

(Coming soon)

### Manual Installation

1. Download this repository as a ZIP file and extract it
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extracted folder
5. The extension should now appear in your extensions list

## Usage

1. Navigate to any supported novel website
2. The extension will automatically enhance the dialogue on the page
3. Click the extension icon in your browser toolbar to:
   - Toggle enhancement on/off
   - Enable/disable specific features
   - Manually trigger enhancement on the current page

## Supported Websites

The extension currently supports many popular novel translation sites including:

- FanMTL.com
- NovelUpdates.com
- WuxiaWorld.com
- WebNovel.com
- And many others with similar layouts

## How It Works

The extension:

1. Identifies the main content area of the novel page
2. Analyzes the text to detect character names and their likely genders
3. Processes the dialogue to make it sound more natural
4. Fixes common translation issues like awkward phrasing and incorrect pronouns
5. Replaces the original content with the enhanced version

## Technical Details

This document describes the optimized character map implementation for the Novel Dialogue Enhancer Chrome extension.

### Overview

The extension tracks character data and enhanced chapters for novels across various websites. The implementation is optimized for:

1. Efficient data structure
2. Purging old/unused novels
3. Minimal data storage
4. Size management for evidence data

### Data Schema

The character data is stored in an optimized format:

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
    chaps: [                      // Enhanced chapters
      number                      // Chapter numbers
    ],
    style: {                      // Style info
      style: string,
      tone: string,
      confidence: number,
      analyzed: boolean
    },
    lastAccess: number            // Timestamp for data purging
  }
}
```

### Key Optimizations

#### 1. Numeric Character IDs

- Uses numeric IDs as keys rather than character names
- Reduces duplication of character names in the data structure

#### 2. Compressed Gender Representation

- Uses "m" for "male"
- Uses "f" for "female"
- Uses "u" for "unknown"

#### 3. Simplified Chapter Storage

- Stores just chapter numbers instead of objects
- Significantly reduces size for novels with many chapters

#### 4. Limited Evidence Storage

- Caps evidence array at 5 entries per character
- Prevents excessive storage growth from redundant evidence

#### 5. Data Purging

- Timestamp-based data purging mechanism
- Automatically removes novel data not accessed in 30+ days
- Implements size-based pruning when storage exceeds thresholds

### Clean Implementation

The system uses a streamlined approach:

1. Simple and clear property names
2. Consistent format across the extension
3. Simplified codebase that's easier to maintain and extend

### Performance Gains

- ~30-40% reduction in storage size for typical use
- Improved performance for large datasets
- More efficient memory usage

### Usage

The optimization is implemented in:

1. `background.js` - For storage and retrieval
2. `novelUtils.js` - For handling character data in content scripts

### Testing

A test suite is available in `/tests/characterMap.test.js` to verify:

1. Gender compression/expansion
2. Data format consistency
3. Data purging functionality
4. Storage size comparison

Run the tests with Node.js:

``` bash
node tests/characterMap.test.js
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under APACHE 2.0 License - see the LICENSE file for details.