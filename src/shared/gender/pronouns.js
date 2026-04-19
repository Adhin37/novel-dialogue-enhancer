export const MALE_PRONOUNS = ["he", "him", "his"];
export const FEMALE_PRONOUNS = ["she", "her", "hers"];

// Lowercase Set — use with .has(word.toLowerCase())
export const PRONOUN_FILTER_SET = new Set([
  "he", "she", "it", "they", "i", "you", "we",
  "his", "her", "their", "my", "your", "our"
]);

// Pattern strings — callers wrap in new RegExp(pattern, "gi") as needed
// (do NOT share /g regex instances — they carry lastIndex state)
export const MALE_PRONOUN_PATTERN = "\\b(he|him|his)\\b";
export const FEMALE_PRONOUN_PATTERN = "\\b(she|her|hers)\\b";

// Grouped structure for position-based scanning
export const GENDER_PRONOUN_GROUPS = [
  { patterns: MALE_PRONOUNS.map(p => `\\b${p}\\b`), type: "male" },
  { patterns: FEMALE_PRONOUNS.map(p => `\\b${p}\\b`), type: "female" },
];

// Possessive relationship terms — "X's <term>" implies X's gender
// male: having a wife/daughter/etc. implies the possessor is male
export const MALE_POSSESSIVES = ["wife", "girlfriend", "daughter", "sister", "mother", "bride"];
export const FEMALE_POSSESSIVES = ["husband", "boyfriend", "son", "brother", "father", "groom"];
