// relationshipAnalyzer.js
/**
 * Specialized module for analyzing character relationships
 * Identifies relationship patterns and character roles that indicate gender
 */
class RelationshipAnalyzer {
  /**
   * Check for relationship descriptions that indicate gender
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @return {object} - Gender scores with evidence
   */
  checkRelationships(name, text) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const maleRelationships = [
      `${name} was her husband`,
      `${name} was his husband`,
      `${name}'s wife`,
      `${name} was the father`,
      `${name} was the son`,
      `${name} was the brother`,
      `${name} was the uncle`,
      `${name} was the grandfather`,
      `${name} was the grandson`,
      `${name} was the king`,
      `${name} was the prince`,
      `${name} was the emperor`,
      `${name} was the lord`,
      `${name} was the duke`,
      `${name} was the boyfriend`,
      `${name}, the husband`,
      `${name}, the father`,
      `${name}, the brother`
    ];

    const femaleRelationships = [
      `${name} was his wife`,
      `${name} was her wife`,
      `${name}'s husband`,
      `${name} was the mother`,
      `${name} was the daughter`,
      `${name} was the sister`,
      `${name} was the aunt`,
      `${name} was the grandmother`,
      `${name} was the granddaughter`,
      `${name} was the queen`,
      `${name} was the princess`,
      `${name} was the empress`,
      `${name} was the lady`,
      `${name} was the duchess`,
      `${name} was the girlfriend`,
      `${name}, the wife`,
      `${name}, the mother`,
      `${name}, the sister`
    ];

    // Check for male relationship indicators
    for (const relation of maleRelationships) {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        maleScore += 3;
        evidence = relation;
        break;
      }
    }

    // Check for female relationship indicators
    for (const relation of femaleRelationships) {
      if (text.toLowerCase().includes(relation.toLowerCase())) {
        femaleScore += 3;
        evidence = relation;
        break;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze character roles and positions that indicate gender
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {string} culturalOrigin - Detected cultural origin
   * @return {object} - Analysis results with scores and evidence
   */
  analyzeCharacterRole(name, text, culturalOrigin = "western") {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Define role patterns by culture
    const maleRoles = this.#getMaleRoles();
    const femaleRoles = this.#getFemaleRoles();

    // Check role mentions in proximity to name
    const nameProximityRegex = new RegExp(
      `[^.!?]*\\b${SharedUtils.escapeRegExp(name)}\\b[^.!?]{0,100}`,
      "gi"
    );
    const proximityMatches = Array.from(text.matchAll(nameProximityRegex));
    let proximityText = "";

    proximityMatches.forEach((match) => {
      proximityText += match[0] + " ";
    });

    // Check for explicit role assignments
    const roleAssignmentResult = this.#checkExplicitRoleAssignments(
      name,
      proximityText
    );
    if (roleAssignmentResult.evidence) {
      return roleAssignmentResult;
    }

    // Check for culture-specific roles in proximity
    const cultureRoles = {
      male: maleRoles[culturalOrigin] || maleRoles.western,
      female: femaleRoles[culturalOrigin] || femaleRoles.western
    };

    for (const role of cultureRoles.male) {
      if (
        new RegExp(
          `\\b${SharedUtils.escapeRegExp(
            name
          )}\\b[^.!?]*\\b${role}\\b|\\b${role}\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
            name
          )}\\b`,
          "i"
        ).test(proximityText)
      ) {
        maleScore += 2;
        evidence = `associated with role: ${role}`;
        break;
      }
    }

    if (!evidence) {
      for (const role of cultureRoles.female) {
        if (
          new RegExp(
            `\\b${SharedUtils.escapeRegExp(
              name
            )}\\b[^.!?]*\\b${role}\\b|\\b${role}\\b[^.!?]*\\b${SharedUtils.escapeRegExp(
              name
            )}\\b`,
            "i"
          ).test(proximityText)
        ) {
          femaleScore += 2;
          evidence = `associated with role: ${role}`;
          break;
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Infer gender from relationships with other characters
   * @param {string} name - The character name
   * @param {string} text - Text context
   * @param {object} characterMap - Map of known characters
   * @return {object} - Analysis results with scores and evidence
   */
  inferGenderFromRelated(name, text, characterMap) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    const romanticPatterns = this.#getRomanticPatterns(name);

    // Get only characters with known gender and reasonable confidence
    const knownCharacters = Object.entries(characterMap).filter(
      ([charName, data]) =>
        charName !== name &&
        data.gender !== "unknown" &&
        data.confidence >= 0.7 &&
        data.appearances >= 3
    );

    if (knownCharacters.length === 0) {
      return { maleScore: 0, femaleScore: 0, evidence: null };
    }

    // Look for relationship patterns with known-gender characters
    for (const [charName, data] of knownCharacters) {
      // Skip self-references
      if (charName === name) continue;

      // Check for romantic/relationship patterns
      for (const pattern of romanticPatterns) {
        // Check if the known character is male
        if (data.gender === "male") {
          // Check patterns that would make the current character female
          for (const femaleSidePattern of pattern.femaleSide) {
            const regex = new RegExp(
              femaleSidePattern.replace(
                /\(NAME\)/g,
                SharedUtils.escapeRegExp(charName)
              ),
              "i"
            );
            if (regex.test(text)) {
              femaleScore += 2;
              evidence = `${pattern.relationship} with male character ${charName}`;
              break;
            }
          }
        }

        // Check if the known character is female
        else if (data.gender === "female") {
          // Check patterns that would make the current character male
          for (const maleSidePattern of pattern.maleSide) {
            const regex = new RegExp(
              maleSidePattern.replace(
                /\(NAME\)/g,
                SharedUtils.escapeRegExp(charName)
              ),
              "i"
            );
            if (regex.test(text)) {
              maleScore += 2;
              evidence = `${pattern.relationship} with female character ${charName}`;
              break;
            }
          }
        }

        if (evidence) break;
      }

      if (evidence) break;
    }

    // If no strong evidence found, look for group affiliations
    if (!evidence) {
      const groupResult = this.#analyzeGroupAffiliations(
        name,
        text,
        knownCharacters
      );
      if (groupResult.evidence) {
        maleScore += groupResult.maleScore;
        femaleScore += groupResult.femaleScore;
        evidence = groupResult.evidence;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Analyze group affiliations for gender clues
   * @param {string} name - Character name
   * @param {string} text - Text context
   * @param {Array} knownCharacters - Array of known characters with gender
   * @return {object} - Analysis results with scores and evidence
   * @private
   */
  #analyzeGroupAffiliations(name, text, knownCharacters) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Count gender distributions in character groups
    let maleGroupMembers = 0;
    let femaleGroupMembers = 0;

    // Look for group scenes containing multiple characters
    const groupScenePattern = new RegExp(
      `[^.!?]*\\b${SharedUtils.escapeRegExp(
        name
      )}\\b[^.!?]*(?:\\b(and|with|alongside)\\b|,)[^.!?]*`,
      "gi"
    );
    const groupScenes = Array.from(text.matchAll(groupScenePattern));

    for (const scene of groupScenes) {
      const sceneText = scene[0];
      let malesInScene = 0;
      let femalesInScene = 0;

      // Count known characters in this scene
      for (const [charName, data] of knownCharacters) {
        if (sceneText.includes(charName)) {
          if (data.gender === "male") malesInScene++;
          else if (data.gender === "female") femalesInScene++;
        }
      }

      // If we have at least 2 characters with known gender in the scene
      if (malesInScene + femalesInScene >= 2) {
        // If mostly male group, slightly increase female score for this character (and vice versa)
        if (malesInScene > femalesInScene * 2) {
          femaleScore += 1; // In male-dominated groups, slightly more likely to be female
          maleGroupMembers += malesInScene;
        } else if (femalesInScene > malesInScene * 2) {
          maleScore += 1; // In female-dominated groups, slightly more likely to be male
          femaleGroupMembers += femalesInScene;
        }
      }
    }

    // Only use group evidence if we have enough data
    if (maleGroupMembers >= 3 || femaleGroupMembers >= 3) {
      if (maleGroupMembers > femaleGroupMembers * 2) {
        evidence = `often appears in male-dominated groups`;
      } else if (femaleGroupMembers > maleGroupMembers * 2) {
        evidence = `often appears in female-dominated groups`;
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Check for explicit role assignments in text
   * @param {string} name - Character name
   * @param {string} proximityText - Text near the character name
   * @return {object} - Role assignment analysis results
   * @private
   */
  #checkExplicitRoleAssignments(name, proximityText) {
    let maleScore = 0;
    let femaleScore = 0;
    let evidence = null;

    // Patterns like "X was the emperor" or "the princess X"
    const explicitRolePatterns = [
      new RegExp(
        `\\b${SharedUtils.escapeRegExp(
          name
        )}\\b[^.!?]{0,20}\\b(was|is)\\b[^.!?]{0,20}\\b(the|a)\\b[^.!?]{0,10}\\b(\\w+)\\b`,
        "i"
      ),
      new RegExp(
        `\\b(the|a)\\b[^.!?]{0,10}\\b(\\w+)\\b[^.!?]{0,20}\\b${SharedUtils.escapeRegExp(
          name
        )}\\b`,
        "i"
      )
    ];

    const maleRoles = this.#getFlatRolesList("male");
    const femaleRoles = this.#getFlatRolesList("female");

    for (const pattern of explicitRolePatterns) {
      const match = proximityText.match(pattern);
      if (match) {
        const potentialRole = match[3] || match[2];
        if (potentialRole) {
          const roleLower = potentialRole.toLowerCase();

          // Check if the role is in our gender lists
          if (maleRoles.includes(roleLower)) {
            maleScore += 3;
            evidence = `described as ${roleLower}`;
            break;
          }

          if (femaleRoles.includes(roleLower)) {
            femaleScore += 3;
            evidence = `described as ${roleLower}`;
            break;
          }
        }
      }
    }

    return { maleScore, femaleScore, evidence };
  }

  /**
   * Get male roles for different cultures
   * @return {object} - Male roles by culture
   * @private
   */
  #getMaleRoles() {
    return {
      western: [
        "king",
        "prince",
        "duke",
        "lord",
        "emperor",
        "knight",
        "wizard",
        "sorcerer",
        "warrior",
        "hunter",
        "guard",
        "soldier",
        "general"
      ],
      chinese: [
        "sect leader",
        "patriarch",
        "young master",
        "elder",
        "immortal",
        "emperor",
        "king",
        "prince",
        "disciple",
        "cultivator",
        "hero",
        "swordsman",
        "senior brother",
        "junior brother",
        "master"
      ],
      japanese: [
        "shogun",
        "daimyo",
        "samurai",
        "ninja",
        "ronin",
        "sensei",
        "sempai",
        "master",
        "lord",
        "warrior",
        "hero",
        "monk",
        "priest"
      ],
      korean: [
        "king",
        "prince",
        "general",
        "warrior",
        "master",
        "hero",
        "hunter",
        "lord",
        "scholar",
        "minister"
      ]
    };
  }

  /**
   * Get female roles for different cultures
   * @return {object} - Female roles by culture
   * @private
   */
  #getFemaleRoles() {
    return {
      western: [
        "queen",
        "princess",
        "duchess",
        "lady",
        "empress",
        "witch",
        "sorceress",
        "priestess",
        "maiden",
        "huntress",
        "maid",
        "nurse"
      ],
      chinese: [
        "sect mistress",
        "matriarch",
        "young miss",
        "fairy",
        "immortal maiden",
        "empress",
        "queen",
        "princess",
        "concubine",
        "disciple",
        "senior sister",
        "junior sister",
        "mistress"
      ],
      japanese: [
        "princess",
        "empress",
        "geisha",
        "miko",
        "kunoichi",
        "lady",
        "mistress",
        "sorceress",
        "priestess",
        "shrine maiden"
      ],
      korean: [
        "queen",
        "princess",
        "lady",
        "empress",
        "maiden",
        "sorceress",
        "priestess",
        "shaman"
      ]
    };
  }

  /**
   * Get a flattened list of all roles for a specific gender
   * @param {string} gender - 'male' or 'female'
   * @return {Array} - Flattened list of roles
   * @private
   */
  #getFlatRolesList(gender) {
    const rolesByGender =
      gender === "male" ? this.#getMaleRoles() : this.#getFemaleRoles();

    return Object.values(rolesByGender).flat();
  }

  /**
   * Get patterns for romantic relationships
   * @param {string} name - Character name
   * @return {Array} - Array of pattern objects
   * @private
   */
  #getRomanticPatterns(name) {
    return [
      // Male-female pair patterns
      {
        maleSide: [
          `${name}[^.!?]*\\b(and|with)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(and|with)\\b[^.!?]*${name}`
        ],
        femaleSide: [
          `${name}[^.!?]*\\b(loved|kissed|embraced|married)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(loved|kissed|embraced|married)\\b[^.!?]*${name}`
        ],
        relationship: "romantic pairing"
      },
      // Sibling patterns
      {
        maleSide: [
          `${name}[^.!?]*\\b(brother)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(sister)\\b[^.!?]*${name}`
        ],
        femaleSide: [
          `${name}[^.!?]*\\b(sister)\\b[^.!?]*\\b(NAME)\\b`,
          `\\b(NAME)\\b[^.!?]*\\b(brother)\\b[^.!?]*${name}`
        ],
        relationship: "sibling relationship"
      }
    ];
  }
}

if (typeof module !== "undefined") {
  module.exports = RelationshipAnalyzer;
} else {
  window.RelationshipAnalyzer = RelationshipAnalyzer;
}
