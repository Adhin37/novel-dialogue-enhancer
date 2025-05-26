// assets/js/gender/multi-character-context-analyzer.js
/**
 * Advanced analyzer for handling multiple characters in same context
 * Isolates pronoun references and dialogue attribution more accurately
 */
class MultiCharacterContextAnalyzer extends BaseGenderAnalyzer {
  /**
   * Creates a new MultiCharacterContextAnalyzer instance
   */
  constructor() {
    super();
    this.sentenceCache = new Map();
    this.dialogueCache = new Map();
  }

  /**
   * Analyze character gender with multi-character context awareness
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text context
   * @param {object} knownCharacters - Map of known characters
   * @return {object} - Enhanced analysis results
   */
  analyzeWithMultiCharacterContext(
    targetCharacter,
    text,
    knownCharacters = {}
  ) {
    if (!this._validateAnalysisInputs(targetCharacter, text)) {
      return this._createResult(0, 0, null);
    }

    const allCharacterNames = Object.keys(knownCharacters).concat([
      targetCharacter
    ]);
    const relevantSentences = this.#extractRelevantSentences(
      targetCharacter,
      text
    );

    let maleScore = 0;
    let femaleScore = 0;
    const evidenceList = [];

    // Analyze each sentence individually for better accuracy
    for (const sentence of relevantSentences) {
      const sentenceAnalysis = this.#analyzeSentenceContext(
        targetCharacter,
        sentence,
        allCharacterNames
      );

      maleScore += sentenceAnalysis.maleScore;
      femaleScore += sentenceAnalysis.femaleScore;

      if (sentenceAnalysis.evidence) {
        evidenceList.push(sentenceAnalysis.evidence);
      }
    }

    // Analyze dialogue attribution specifically
    const dialogueAnalysis = this.#analyzeDialogueAttribution(
      targetCharacter,
      text,
      allCharacterNames
    );
    maleScore += dialogueAnalysis.maleScore;
    femaleScore += dialogueAnalysis.femaleScore;

    if (dialogueAnalysis.evidence) {
      evidenceList.push(dialogueAnalysis.evidence);
    }

    // Check for character interaction patterns
    const interactionAnalysis = this.#analyzeCharacterInteractions(
      targetCharacter,
      text,
      knownCharacters
    );
    maleScore += interactionAnalysis.maleScore;
    femaleScore += interactionAnalysis.femaleScore;

    if (interactionAnalysis.evidence) {
      evidenceList.push(interactionAnalysis.evidence);
    }

    const finalEvidence =
      evidenceList.length > 0 ? evidenceList.join("; ") : null;
    return this._createResult(maleScore, femaleScore, finalEvidence);
  }

  /**
   * Analyze dialogue attribution patterns
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text
   * @param {Array<string>} allCharacterNames - All character names
   * @return {object} - Analysis results
   * @private
   */
  #analyzeDialogueAttribution(targetCharacter, text, allCharacterNames) {
    const cacheKey = `dialogue:${targetCharacter}:${SharedUtils.createHash(
      text
    )}`;

    if (this.dialogueCache.has(cacheKey)) {
      return this.dialogueCache.get(cacheKey);
    }

    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Find dialogue patterns
    const dialoguePatterns = [
      // "Text," Character said/replied
      /"([^"]+)",\s*([^.!?]+?)\s+(said|replied|asked|exclaimed|whispered|muttered)/gi,
      // Character said, "Text"
      /([^.!?]+?)\s+(said|replied|asked|exclaimed|whispered|muttered),?\s*"([^"]+)"/gi
    ];

    for (const pattern of dialoguePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const speakerSection =
          pattern === dialoguePatterns[0] ? match[2] : match[1];

        const targetRegex = new RegExp(
          `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
          "i"
        );
        if (!targetRegex.test(speakerSection)) continue;

        const attributionAnalysis = this.#analyzeDialogueAttributionSection(
          targetCharacter,
          speakerSection,
          allCharacterNames
        );

        maleScore += attributionAnalysis.maleScore;
        femaleScore += attributionAnalysis.femaleScore;

        if (attributionAnalysis.evidence && !evidence) {
          evidence = attributionAnalysis.evidence;
        }
      }
    }

    const result = { maleScore, femaleScore, evidence };
    this.dialogueCache.set(cacheKey, result);
    return result;
  }

  /**
   * Analyze dialogue attribution section for pronouns
   * @param {string} targetCharacter - Character to analyze
   * @param {string} attributionSection - Dialogue attribution text
   * @param {Array<string>} allCharacterNames - All character names
   * @return {object} - Analysis results
   * @private
   */
  #analyzeDialogueAttributionSection(
    targetCharacter,
    attributionSection,
    allCharacterNames
  ) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const otherCharactersPresent = allCharacterNames.some(
      (name) =>
        name !== targetCharacter &&
        new RegExp(`\\b${SharedUtils.escapeRegExp(name)}\\b`, "i").test(
          attributionSection
        )
    );

    if (!otherCharactersPresent) {
      // Simple case - only target character mentioned
      const malePronouns = (
        attributionSection.match(/\b(he|him|his)\b/gi) || []
      ).length;
      const femalePronouns = (
        attributionSection.match(/\b(she|her|hers)\b/gi) || []
      ).length;

      if (malePronouns > 0) {
        maleScore += malePronouns * 3; // Higher weight for dialogue attribution
        evidence = `dialogue attribution: ${malePronouns} male pronouns`;
      }

      if (femalePronouns > 0) {
        femaleScore += femalePronouns * 3;
        evidence = `dialogue attribution: ${femalePronouns} female pronouns`;
      }
    } else {
      // Complex case - use position-based analysis
      const isolatedAnalysis = this.#analyzeIsolatedPronounReference(
        targetCharacter,
        attributionSection,
        attributionSection.indexOf(targetCharacter),
        this.#findOtherCharactersInSentence(
          attributionSection,
          targetCharacter,
          allCharacterNames
        )
      );

      maleScore += isolatedAnalysis.maleScore * 1.5; // Boost for dialogue context
      femaleScore += isolatedAnalysis.femaleScore * 1.5;
      evidence = isolatedAnalysis.evidence;
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze character interaction patterns for gender inference
   * @param {string} targetCharacter - Character to analyze
   * @param {string} text - Full text
   * @param {object} knownCharacters - Known characters with gender info
   * @return {object} - Analysis results
   * @private
   */
  #analyzeCharacterInteractions(targetCharacter, text, knownCharacters) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const interactionPatterns = [
      // Romantic/relationship patterns
      {
        patterns: [
          `\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b[^.!?]*\\b(loved|kissed|embraced|married|dating)\\b[^.!?]*\\b(\\w+)\\b`,
          `\\b(\\w+)\\b[^.!?]*\\b(loved|kissed|embraced|married|dating)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b`
        ],
        weight: 3
      },
      // Family relationship patterns
      {
        patterns: [
          `\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b[^.!?]*\\b(brother|sister|son|daughter|father|mother|husband|wife)\\b[^.!?]*\\b(\\w+)\\b`,
          `\\b(\\w+)\\b[^.!?]*\\b(brother|sister|son|daughter|father|mother|husband|wife)\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
            targetCharacter
          )}\\b`
        ],
        weight: 4
      }
    ];

    for (const patternGroup of interactionPatterns) {
      for (const pattern of patternGroup.patterns) {
        const regex = new RegExp(pattern, "gi");
        let match;

        while ((match = regex.exec(text)) !== null) {
          const otherCharacter =
            match[1] !== targetCharacter ? match[1] : match[3];
          const relationshipType = match[2];

          if (
            knownCharacters[otherCharacter] &&
            knownCharacters[otherCharacter].gender !== "unknown"
          ) {
            const otherGender = SharedUtils.expandGender(
              knownCharacters[otherCharacter].gender
            );
            const confidence = knownCharacters[otherCharacter].confidence || 0;

            if (confidence >= 0.7) {
              const genderInference = this.#inferGenderFromRelationship(
                relationshipType,
                otherGender
              );

              if (genderInference.gender === "male") {
                maleScore += patternGroup.weight;
                evidence = `relationship inference: ${relationshipType} with ${otherGender} ${otherCharacter}`;
              } else if (genderInference.gender === "female") {
                femaleScore += patternGroup.weight;
                evidence = `relationship inference: ${relationshipType} with ${otherGender} ${otherCharacter}`;
              }
            }
          }
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Infer gender from relationship type and partner gender
   * @param {string} relationshipType - Type of relationship
   * @param {string} partnerGender - Gender of the relationship partner
   * @return {object} - Gender inference result
   * @private
   */
  #inferGenderFromRelationship(relationshipType, partnerGender) {
    const relationshipRules = {
      loved: { male: "female", female: "male" },
      kissed: { male: "female", female: "male" },
      embraced: { male: "female", female: "male" },
      married: { male: "female", female: "male" },
      dating: { male: "female", female: "male" },

      husband: { female: "male" },
      wife: { male: "female" },
      father: { "*": "male" },
      mother: { "*": "female" },
      son: { "*": "male" },
      daughter: { "*": "female" },
      brother: { "*": "male" },
      sister: { "*": "female" }
    };

    const rule = relationshipRules[relationshipType.toLowerCase()];
    if (!rule) {
      return { gender: "unknown" };
    }

    if (rule["*"]) {
      return { gender: rule["*"] };
    }

    if (rule[partnerGender]) {
      return { gender: rule[partnerGender] };
    }

    return { gender: "unknown" };
  }

  /**
   * Extract sentences that mention the target character
   * @param {string} targetCharacter - Character name to find
   * @param {string} text - Text to search
   * @return {Array<string>} - Array of relevant sentences
   * @private
   */
  #extractRelevantSentences(targetCharacter, text) {
    const cacheKey = `${targetCharacter}:${SharedUtils.createHash(text)}`;

    if (this.sentenceCache.has(cacheKey)) {
      return this.sentenceCache.get(cacheKey);
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const relevantSentences = [];
    const characterRegex = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
      "i"
    );

    for (const sentence of sentences) {
      if (characterRegex.test(sentence)) {
        relevantSentences.push(sentence.trim());
      }
    }

    this.sentenceCache.set(cacheKey, relevantSentences);
    return relevantSentences;
  }

  /**
   * Analyze a single sentence for character gender clues
   * @param {string} targetCharacter - Character to analyze
   * @param {string} sentence - Sentence to analyze
   * @param {Array<string>} allCharacterNames - All known character names
   * @return {object} - Sentence analysis results
   * @private
   */
  #analyzeSentenceContext(targetCharacter, sentence, allCharacterNames) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const targetRegex = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}\\b`,
      "i"
    );
    const targetMatch = sentence.match(targetRegex);

    if (!targetMatch) {
      return { maleScore: 0, femaleScore: 0, evidence: null };
    }

    const targetPosition = targetMatch.index;
    const otherCharactersInSentence = this.#findOtherCharactersInSentence(
      sentence,
      targetCharacter,
      allCharacterNames
    );

    // If multiple characters in sentence, use advanced analysis
    if (otherCharactersInSentence.length > 0) {
      const isolatedAnalysis = this.#analyzeIsolatedPronounReference(
        targetCharacter,
        sentence,
        targetPosition,
        otherCharactersInSentence
      );

      maleScore += isolatedAnalysis.maleScore;
      femaleScore += isolatedAnalysis.femaleScore;
      evidence = isolatedAnalysis.evidence;
    } else {
      // Single character in sentence - use direct pronoun analysis
      const directAnalysis = this.#analyzeDirectPronounReference(
        targetCharacter,
        sentence
      );
      maleScore += directAnalysis.maleScore;
      femaleScore += directAnalysis.femaleScore;
      evidence = directAnalysis.evidence;
    }

    // Check for possessive patterns
    const possessiveAnalysis = this.#analyzePossessivePatterns(
      targetCharacter,
      sentence
    );
    maleScore += possessiveAnalysis.maleScore;
    femaleScore += possessiveAnalysis.femaleScore;

    if (possessiveAnalysis.evidence && !evidence) {
      evidence = possessiveAnalysis.evidence;
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Find other characters mentioned in the same sentence
   * @param {string} sentence - Sentence to analyze
   * @param {string} targetCharacter - Character to exclude
   * @param {Array<string>} allCharacterNames - All character names to check
   * @return {Array<object>} - Array of other characters with positions
   * @private
   */
  #findOtherCharactersInSentence(sentence, targetCharacter, allCharacterNames) {
    const otherCharacters = [];

    for (const characterName of allCharacterNames) {
      if (characterName === targetCharacter) continue;

      const regex = new RegExp(
        `\\b${SharedUtils.escapeRegExp(characterName)}\\b`,
        "i"
      );
      const match = sentence.match(regex);

      if (match) {
        otherCharacters.push({
          name: characterName,
          position: match.index
        });
      }
    }

    return otherCharacters.sort((a, b) => a.position - b.position);
  }

  /**
   * Analyze pronoun reference when multiple characters are present
   * @param {string} targetCharacter - Character to analyze
   * @param {string} sentence - Sentence to analyze
   * @param {number} targetPosition - Position of target character in sentence
   * @param {Array<object>} otherCharacters - Other characters in sentence
   * @return {object} - Analysis results
   * @private
   */
  #analyzeIsolatedPronounReference(
    targetCharacter,
    sentence,
    targetPosition,
    otherCharacters
  ) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const pronounMatches = this.#findPronounsWithPositions(sentence);

    for (const pronounMatch of pronounMatches) {
      const { pronoun, position, type } = pronounMatch;

      const likelyCharacter = this.#determinePronounReference(
        targetCharacter,
        targetPosition,
        otherCharacters,
        position,
        sentence
      );

      // Only count pronouns that likely refer to our target character
      if (likelyCharacter === targetCharacter) {
        if (type === "male") {
          maleScore += 2;
          evidence = `isolated pronoun '${pronoun}' likely refers to ${targetCharacter}`;
        } else if (type === "female") {
          femaleScore += 2;
          evidence = `isolated pronoun '${pronoun}' likely refers to ${targetCharacter}`;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Find pronouns and their positions in a sentence
   * @param {string} sentence - Sentence to analyze
   * @return {Array<object>} - Array of pronoun matches with positions and types
   * @private
   */
  #findPronounsWithPositions(sentence) {
    const pronouns = [
      { patterns: ["\\bhe\\b", "\\bhim\\b", "\\bhis\\b"], type: "male" },
      { patterns: ["\\bshe\\b", "\\bher\\b", "\\bhers\\b"], type: "female" }
    ];

    const matches = [];

    for (const pronounGroup of pronouns) {
      for (const pattern of pronounGroup.patterns) {
        const regex = new RegExp(pattern, "gi");
        let match;

        while ((match = regex.exec(sentence)) !== null) {
          matches.push({
            pronoun: match[0],
            position: match.index,
            type: pronounGroup.type
          });
        }
      }
    }

    return matches.sort((a, b) => a.position - b.position);
  }

  /**
   * Determine which character a pronoun most likely refers to
   * @param {string} targetCharacter - Target character name
   * @param {number} targetPosition - Position of target character
   * @param {Array<object>} otherCharacters - Other characters with positions
   * @param {number} pronounPosition - Position of pronoun
   * @param {string} sentence - Full sentence for context
   * @return {string} - Most likely character name
   * @private
   */
  #determinePronounReference(
    targetCharacter,
    targetPosition,
    otherCharacters,
    pronounPosition,
    sentence
  ) {
    const allCharacters = [
      { name: targetCharacter, position: targetPosition },
      ...otherCharacters
    ];

    const sortedByDistance = allCharacters
      .map((char) => ({
        ...char,
        distance: Math.abs(char.position - pronounPosition)
      }))
      .sort((a, b) => a.distance - b.distance);

    const beforePronoun = sentence.substring(0, pronounPosition);

    // If pronoun comes after "said" or similar, find the speaker
    const speechVerbMatch = beforePronoun.match(
      /\b(said|replied|asked|exclaimed)\s*$/
    );
    if (speechVerbMatch) {
      // Find the character mentioned closest to (but before) the speech verb
      const speechVerbPosition = speechVerbMatch.index;
      let closestCharacterToSpeechVerb = null;
      let closestDistance = Infinity;

      for (const character of allCharacters) {
        if (character.position < speechVerbPosition) {
          const distance = speechVerbPosition - character.position;
          if (distance < closestDistance) {
            closestDistance = distance;
            closestCharacterToSpeechVerb = character;
          }
        }
      }

      if (closestCharacterToSpeechVerb) {
        return closestCharacterToSpeechVerb.name;
      }
    }

    // Check for possessive relationships
    if (/\b(his|her|hers)\s+\w+/.test(sentence.substring(pronounPosition))) {
      return sortedByDistance[0].name;
    }

    // Default: return closest character
    return sortedByDistance[0].name;
  }

  /**
   * Analyze direct pronoun reference when only one character is present
   * @param {string} targetCharacter - Character to analyze
   * @param {string} sentence - Sentence to analyze
   * @return {object} - Analysis results
   * @private
   */
  #analyzeDirectPronounReference(targetCharacter, sentence) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const malePronouns = (sentence.match(/\b(he|him|his)\b/gi) || []).length;
    if (malePronouns > 0) {
      maleScore += malePronouns * 2;
      evidence = `direct pronoun reference: ${malePronouns} male pronouns`;
    }

    const femalePronouns = (sentence.match(/\b(she|her|hers)\b/gi) || [])
      .length;
    if (femalePronouns > 0) {
      femaleScore += femalePronouns * 2;
      evidence = `direct pronoun reference: ${femalePronouns} female pronouns`;
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze possessive patterns for character
   * @param {string} targetCharacter - Character to analyze
   * @param {string} sentence - Sentence to analyze
   * @return {object} - Analysis results
   * @private
   */
  #analyzePossessivePatterns(targetCharacter, sentence) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const possessivePattern = new RegExp(
      `\\b${SharedUtils.escapeRegExp(targetCharacter)}'s\\s+(\\w+)`,
      "gi"
    );

    const possessiveMatches = Array.from(sentence.matchAll(possessivePattern));

    for (const match of possessiveMatches) {
      const possessedItem = match[1].toLowerCase();

      const maleItems = [
        "wife",
        "girlfriend",
        "daughter",
        "sister",
        "mother",
        "bride"
      ];
      const femaleItems = [
        "husband",
        "boyfriend",
        "son",
        "brother",
        "father",
        "groom"
      ];

      if (maleItems.includes(possessedItem)) {
        maleScore += 3;
        evidence = `possessive: ${targetCharacter}'s ${possessedItem}`;
        break;
      } else if (femaleItems.includes(possessedItem)) {
        femaleScore += 3;
        evidence = `possessive: ${targetCharacter}'s ${possessedItem}`;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Clear analysis caches
   */
  clearCaches() {
    this.sentenceCache.clear();
    this.dialogueCache.clear();
  }
}

if (typeof module !== "undefined") {
  module.exports = MultiCharacterContextAnalyzer;
} else {
  window.MultiCharacterContextAnalyzer = MultiCharacterContextAnalyzer;
}
