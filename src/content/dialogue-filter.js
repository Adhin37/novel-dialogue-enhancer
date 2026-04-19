/** Dialogue marker patterns — any paragraph matching at least one is sent to the LLM. */
const DIALOGUE_PATTERNS = [
  /"[^"]{3,}"/,                         // Western double-quoted speech (≥3 chars)
  /「[^」]+」/,                          // CJK corner brackets
  /『[^』]+』/,                          // CJK double corner brackets
  /\u2014[^.!?\n]{5,}/,                 // em-dash followed by 5+ chars
  /^\s*[A-Z][a-zA-Z ]{1,30}:\s*\S/m,   // "Name: speech" at line start
];

export function paragraphHasDialogue(text) {
  return DIALOGUE_PATTERNS.some((re) => re.test(text));
}

/**
 * Partition paragraphs into those that need LLM enhancement (contain dialogue)
 * and those that can pass through unchanged (pure narration).
 * @param {string[]} texts
 * @return {{ toSend: string[], toSendIdx: number[], passthrough: Map<number,string> }}
 */
export function partitionParagraphs(texts) {
  const toSend = [], toSendIdx = [], passthrough = new Map();
  texts.forEach((t, i) => {
    if (paragraphHasDialogue(t)) { toSend.push(t); toSendIdx.push(i); }
    else                          { passthrough.set(i, t); }
  });
  return { toSend, toSendIdx, passthrough };
}
