import { TextLimits } from "./text-limits.js";
import { GenderUtils } from "../gender/gender-utils.js";

export class CharacterUtils {
  static validateCharacterName(name) {
    return (
      typeof name === "string" &&
      name.length >= TextLimits.VALIDATION.MIN_NAME_LENGTH &&
      name.length <= TextLimits.VALIDATION.MAX_NAME_LENGTH
    );
  }

  static normalizeName(name) {
    if (!name || typeof name !== "string") return name;
    return name
      .trim()
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  static validateConfidence(confidence) {
    return typeof confidence === "number" && confidence >= 0 && confidence <= 1;
  }

  static validateAppearances(appearances) {
    return Number.isInteger(appearances) && appearances > 0;
  }

  static createCharacterData(name, gender, confidence, appearances, evidence = []) {
    return {
      name: CharacterUtils.normalizeName(String(name || "")) || String(name || ""),
      gender: GenderUtils.compressGender(gender),
      confidence: CharacterUtils.validateConfidence(confidence) ? confidence : 0,
      appearances: CharacterUtils.validateAppearances(appearances) ? appearances : 1,
      evidence: Array.isArray(evidence) ? evidence.slice(0, 5) : []
    };
  }
}
