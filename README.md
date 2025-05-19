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

The extension tracks character data and enhanced chapters for novels across various websites. The original implementation had several inefficiencies that have been addressed with this optimization:

1. Data structure was verbose and inefficient
2. No mechanism for purging old/unused novels
3. Redundant data storage
4. No size management for evidence data

### New Data Schema

#### Original Schema

```javascript
{
  [novelId]: {
    characters: {
      [characterName]: {
        gender: string,          // "male", "female", "unknown"
        confidence: number,      // 0-1
        appearances: number,     // count
        evidence: string[]       // array of text evidence 
      }
    },
    enhancedChapters: [
      {
        chapterNumber: number
      }
    ],
    style: { /* novel style info */ }
  }
}
```

#### Optimized Schema

```javascript
{
  [novelId]: {
    chars: {                     // shortened from "characters"
      [characterId]: {           // numerical ID instead of full name
        n: string,               // character name
        g: string,               // "m", "f", "u" instead of "male", "female", "unknown"
        c: number,               // confidence (0-1)
        a: number,               // appearances count
        e: string[]              // shortened evidence (optional, limited to 5 entries)
      }
    },
    chaps: [                     // shortened from "enhancedChapters"
      number                     // just store chapter numbers directly
    ],
    style: {                     // keep style object as is, since it's small
      style: string,
      tone: string,
      confidence: number,
      analyzed: boolean
    },
    lastAccess: number           // timestamp for data purging
  }
}
```

### Key Optimizations

#### 1. Shorter Property Names

- Abbreviated property names reduce JSON size
- Uses shorter field names like 'n' for 'name', 'g' for 'gender'

#### 2. Numeric Character IDs

- Instead of using character names as keys (which can be long), uses numeric IDs
- Reduces duplication of character names in the data structure

#### 3. Compressed Gender Representation

- "male" -> "m"
- "female" -> "f"
- "unknown" -> "u"

#### 4. Simplified Chapter Storage

- Stores just chapter numbers instead of objects
- Reduces the size significantly for novels with many chapters

#### 5. Limited Evidence Storage

- Caps evidence array at 5 entries per character
- Prevents excessive storage growth from redundant evidence

#### 6. Data Purging

- Added timestamp-based data purging mechanism
- Automatically removes novel data not accessed in 30+ days
- Implements size-based pruning when storage exceeds thresholds

### Migration Strategy

The implementation includes automatic migration from the old format to the new format:

1. When data is retrieved from storage, it is automatically converted to the new format
2. When saving data, the system ensures it is in the new format
3. Users experience no disruption during the transition

### Clean Implementation

The system uses a streamlined approach:

1. One-time conversion of existing data to the optimized format
2. Pure optimized implementation without backward compatibility overhead
3. Simplified codebase that's easier to maintain and extend

### Performance Gains

Testing with representative data shows:

- ~30-40% reduction in storage size for typical use
- Improved performance for large datasets
- More efficient memory usage

### Usage

The optimization is implemented in:

1. `background.js` - For storage and retrieval
2. `novelUtils.js` - For handling character data in content scripts

No changes are required in how other components interact with the character map. The optimization is transparent to the rest of the system.

### Testing

A test suite is available in `/tests/characterMap.test.js` to verify:

1. Gender compression/expansion
2. Migration from old to new format
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