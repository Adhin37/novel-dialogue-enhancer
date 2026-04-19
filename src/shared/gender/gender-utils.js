import { GenderConfig } from "./gender-config.js";

export class GenderUtils {
  static compressGender(gender) {
    if (!gender || typeof gender !== "string") return GenderConfig.CODES.UNKNOWN;
    const genderLower = gender.toLowerCase();
    const maleSet = new Set([GenderConfig.CODES.MALE, GenderConfig.CODES.MALE_FULL]);
    const femaleSet = new Set([GenderConfig.CODES.FEMALE, GenderConfig.CODES.FEMALE_FULL]);
    if (maleSet.has(genderLower)) return GenderConfig.CODES.MALE;
    if (femaleSet.has(genderLower)) return GenderConfig.CODES.FEMALE;
    return GenderConfig.CODES.UNKNOWN;
  }

  static expandGender(gender) {
    if (typeof gender !== "string") return GenderConfig.CODES.UNKNOWN_FULL;
    const genderLower = gender.toLowerCase();
    const maleSet = new Set([GenderConfig.CODES.MALE, GenderConfig.CODES.MALE_FULL]);
    const femaleSet = new Set([GenderConfig.CODES.FEMALE, GenderConfig.CODES.FEMALE_FULL]);
    if (maleSet.has(genderLower)) return GenderConfig.CODES.MALE_FULL;
    if (femaleSet.has(genderLower)) return GenderConfig.CODES.FEMALE_FULL;
    return GenderConfig.CODES.UNKNOWN_FULL;
  }

  static validateGender(gender) {
    return (
      typeof gender === "string" &&
      ["male", "female", "unknown", "m", "f", "u"].includes(gender.toLowerCase())
    );
  }
}
