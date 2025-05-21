// characterMap.test.js
// Manual testing script for the new character map implementation

// Import helper functions (defined below)
const { 
  compressGender, 
  expandGender, 
  migrateToNewFormat, 
  getNextCharacterId, 
  purgeOldNovels 
} = require('./test-helpers');

// Test gender compression
console.log('\n--- Testing Gender Compression ---');
console.log('male ->', compressGender('male'));
console.log('female ->', compressGender('female'));
console.log('unknown ->', compressGender('unknown'));
console.log('undefined ->', compressGender(undefined));
console.log('""', compressGender(''));

// Test gender expansion
console.log('\n--- Testing Gender Expansion ---');
console.log('m ->', expandGender('m'));
console.log('f ->', expandGender('f'));
console.log('u ->', expandGender('u'));
console.log('undefined ->', expandGender(undefined));
console.log('""', expandGender(''));

// Test character ID generation
console.log('\n--- Testing Character ID Generation ---');
console.log('Empty map: ', getNextCharacterId({}));
console.log('Map with IDs [0, 1, 2]: ', getNextCharacterId({ '0': {}, '1': {}, '2': {} }));
console.log('Map with gap IDs [0, 2, 5]: ', getNextCharacterId({ '0': {}, '2': {}, '5': {} }));

// Test migration from old format to new format
console.log('\n--- Testing Migration from Old Format ---');

// Test case 1: Empty map
const emptyMap = {};
console.log('Empty map -> ', migrateToNewFormat(emptyMap));

// Test case 2: Legacy format (direct characters object)
const legacyMap = {
  'John Smith': {
    gender: 'male',
    confidence: 0.9,
    appearances: 15,
    evidence: ['He said', 'His voice', 'John\'s eyes']
  },
  'Mary Jones': {
    gender: 'female',
    confidence: 0.8,
    appearances: 10,
    evidence: ['She replied', 'Her smile']
  }
};
console.log('Legacy format -> ', JSON.stringify(migrateToNewFormat(legacyMap), null, 2));

// Test case 3: Current format with characters and enhancedChapters
const currentMap = {
  characters: {
    'John Smith': {
      gender: 'male',
      confidence: 0.9,
      appearances: 15,
      evidence: ['He said', 'His voice', 'John\'s eyes']
    },
    'Mary Jones': {
      gender: 'female',
      confidence: 0.8,
      appearances: 10,
      evidence: ['She replied', 'Her smile']
    }
  },
  enhancedChapters: [
    { chapterNumber: 1 },
    { chapterNumber: 2 },
    { chapterNumber: 3 }
  ],
  style: {
    style: 'western fantasy',
    tone: 'casual',
    confidence: 0.75,
    analyzed: true
  }
};
console.log('Current format -> ', JSON.stringify(migrateToNewFormat(currentMap), null, 2));

// Test case 4: Already migrated format
const newFormatMap = {
  chars: {
    '0': {
      n: 'John Smith',
      g: 'm',
      c: 0.9,
      a: 15,
      e: ['He said', 'His voice', 'John\'s eyes']
    },
    '1': {
      n: 'Mary Jones',
      g: 'f',
      c: 0.8,
      a: 10,
      e: ['She replied', 'Her smile']
    }
  },
  chaps: [1, 2, 3],
  style: {
    style: 'western fantasy',
    tone: 'casual',
    confidence: 0.75,
    analyzed: true
  },
  lastAccess: Date.now() - 1000000
};
console.log('Already migrated format -> ', 
  JSON.stringify(migrateToNewFormat(newFormatMap), null, 2) === JSON.stringify(newFormatMap) ? 
  'Correctly kept as is' : 'ERROR: Format changed!'
);

// Test purging old novels
console.log('\n--- Testing Purging Old Novels ---');

// Create test data with varying access times
const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;
const testMaps = {
  'novel1': {
    chars: { '0': { n: 'Character1' } },
    lastAccess: now - oneDay * 5 // 5 days old
  },
  'novel2': {
    chars: { '0': { n: 'Character2' } },
    lastAccess: now - oneDay * 15 // 15 days old
  },
  'novel3': {
    chars: { '0': { n: 'Character3' } },
    lastAccess: now - oneDay * 25 // 25 days old
  },
  'novel4': {
    chars: { '0': { n: 'Character4' } },
    lastAccess: now - oneDay * 35 // 35 days old - should be purged with 30-day cutoff
  },
  'novel5': {
    chars: { '0': { n: 'Character5' } },
    lastAccess: now - oneDay * 45 // 45 days old - should be purged with 30-day cutoff
  }
};

// Purge novels older than 30 days
const purgedMaps = purgeOldNovels(testMaps, oneDay * 30);
console.log('Novels before purging:', Object.keys(testMaps).join(', '));
console.log('Novels after purging:', Object.keys(purgedMaps).join(', '));
console.log('Purged novels should be removed:', 
  !purgedMaps['novel4'] && !purgedMaps['novel5'] && 
  purgedMaps['novel1'] && purgedMaps['novel2'] && purgedMaps['novel3'] ? 
  'SUCCESS' : 'FAILED'
);

// Test storage size comparison
console.log('\n--- Testing Storage Size Comparison ---');

// Create larger test dataset
const oldFormat = { characters: {}, enhancedChapters: [] };
const newFormat = { chars: {}, chaps: [] };

// Add 100 characters to both formats
for (let i = 0; i < 100; i++) {
  const charName = `Character${i}`;
  
  // Old format
  oldFormat.characters[charName] = {
    gender: i % 3 === 0 ? 'male' : (i % 3 === 1 ? 'female' : 'unknown'),
    confidence: i / 100,
    appearances: i + 1,
    evidence: [`Evidence 1 for ${charName}`, `Evidence 2 for ${charName}`, `Evidence 3 for ${charName}`]
  };
  
  // New format
  newFormat.chars[i] = {
    n: charName,
    g: i % 3 === 0 ? 'm' : (i % 3 === 1 ? 'f' : 'u'),
    c: i / 100,
    a: i + 1,
    e: [`Evidence 1 for ${charName}`, `Evidence 2 for ${charName}`, `Evidence 3 for ${charName}`]
  };
  
  // Add 50 chapters to both formats
  if (i < 50) {
    oldFormat.enhancedChapters.push({ chapterNumber: i + 1 });
    newFormat.chaps.push(i + 1);
  }
}

// Add timestamp to new format
newFormat.lastAccess = Date.now();

// Compare sizes
const oldSize = new Blob([JSON.stringify(oldFormat)]).size;
const newSize = new Blob([JSON.stringify(newFormat)]).size;
const savings = ((oldSize - newSize) / oldSize * 100).toFixed(2);

console.log(`Old format size: ${oldSize} bytes`);
console.log(`New format size: ${newSize} bytes`);
console.log(`Size reduction: ${savings}% saved`);