// testHelpers.js
// Helper functions for testing the character map implementation

/**
 * Compresses gender information using shorter codes
 * @param {string} gender - Original gender string ("male", "female", "unknown")
 * @return {string} - Compressed gender representation ("m", "f", "u")
 */
function compressGender(gender) {
  if (!gender || typeof gender !== 'string') return 'u';
  
  const genderLower = gender.toLowerCase();
  if (genderLower === 'male') return 'm';
  if (genderLower === 'female') return 'f';
  return 'u'; // unknown or other
}

/**
 * Expands compressed gender code to full form
 * @param {string} code - Compressed gender code ("m", "f", "u")
 * @return {string} - Full gender string ("male", "female", "unknown")
 */
function expandGender(code) {
  if (!code || typeof code !== 'string') return 'unknown';
  
  if (code === 'm') return 'male';
  if (code === 'f') return 'female';
  return 'unknown';
}

/**
 * Gets the next available character ID for a novel's character map
 * @param {object} charMap - The character map object
 * @return {number} - Next available ID
 */
function getNextCharacterId(charMap) {
  if (!charMap || typeof charMap !== 'object') return 0;
  
  const existingIds = Object.keys(charMap).map(id => parseInt(id)).filter(id => !isNaN(id));
  
  if (existingIds.length === 0) return 0;
  
  return Math.max(...existingIds) + 1;
}

/**
 * Migrates existing character map to new optimized format
 * @param {object} oldMap - Old format character map
 * @return {object} - New format character map
 */
function migrateToNewFormat(oldMap) {
  if (!oldMap || typeof oldMap !== 'object') return { chars: {}, chaps: [], lastAccess: Date.now() };
  
  // Check if it's already in the new format
  if (oldMap.chars) return oldMap;
  
  const newMap = {
    chars: {},
    chaps: [],
    lastAccess: Date.now()
  };
  
  // Handle the case with characters and enhancedChapters fields
  if (oldMap.characters && typeof oldMap.characters === 'object') {
    // Convert characters to new format
    Object.entries(oldMap.characters).forEach(([name, data], index) => {
      newMap.chars[index] = {
        n: name,
        g: compressGender(data.gender),
        c: parseFloat(data.confidence) || 0,
        a: parseInt(data.appearances) || 1
      };
      
      // Add evidence if available (limited to 5 entries)
      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        newMap.chars[index].e = data.evidence.slice(0, 5);
      }
    });
    
    // Convert enhanced chapters to new format - just store chapter numbers
    if (Array.isArray(oldMap.enhancedChapters)) {
      newMap.chaps = oldMap.enhancedChapters
        .map(chapter => chapter.chapterNumber)
        .filter(num => typeof num === 'number');
    }
    
    // Preserve style information if available
    if (oldMap.style) {
      newMap.style = oldMap.style;
    }
  } 
  // Handle the legacy case where the map itself is the characters object
  else {
    Object.entries(oldMap).forEach(([name, data], index) => {
      newMap.chars[index] = {
        n: name,
        g: compressGender(data.gender),
        c: parseFloat(data.confidence) || 0,
        a: parseInt(data.appearances) || 1
      };
      
      if (Array.isArray(data.evidence) && data.evidence.length > 0) {
        newMap.chars[index].e = data.evidence.slice(0, 5);
      }
    });
  }
  
  return newMap;
}

/**
 * Purges novels that haven't been accessed in a long time
 * @param {object} maps - Character maps object
 * @param {number} maxAge - Maximum age in milliseconds (default: 30 days)
 * @return {object} - Purged character maps
 */
function purgeOldNovels(maps, maxAge = 30 * 24 * 60 * 60 * 1000) {
  if (!maps || typeof maps !== 'object') return {};
  
  const now = Date.now();
  const purgedMaps = { ...maps };
  let purgedCount = 0;
  
  Object.entries(purgedMaps).forEach(([novelId, data]) => {
    // Skip if no lastAccess or if recently accessed
    if (!data.lastAccess || (now - data.lastAccess) < maxAge) return;
    
    delete purgedMaps[novelId];
    purgedCount++;
  });
  
  if (purgedCount > 0) {
    console.log(`Purged ${purgedCount} novels that haven't been accessed in ${maxAge/(24*60*60*1000)} days`);
  }
  
  return purgedMaps;
}

module.exports = {
  compressGender,
  expandGender,
  getNextCharacterId,
  migrateToNewFormat,
  purgeOldNovels
};