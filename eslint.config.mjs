import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly",
        darkModeManager: "readonly",
        module: "readonly",
        GenderUtils: "readonly",
        NovelUtils: "readonly",
        StatsUtils: "readonly",
        OllamaClient: "readonly",
        ContentEnhancerIntegration: "readonly",
        TextProcessor: "readonly",
        PromptGenerator: "readonly",
        DOMPurify: "readonly",
        CulturalAnalyzer: "readonly",
        NameAnalyzer: "readonly",
        PronounAnalyzer: "readonly",
        RelationshipAnalyzer: "readonly",
        AppearanceAnalyzer: "readonly",
        NovelStyleAnalyzer: "readonly",
        NovelCharacterExtractor: "readonly",
        NovelChapterDetector: "readonly",
        NovelIdGenerator: "readonly",
        SharedUtils: "readonly",
        Constants: "readonly",
        BaseGenderAnalyzer: "readonly",
        ContentElementCache: "readonly",
        MultiCharacterContextAnalyzer: "readonly",
        ErrorHandler: "readonly",
        Logger: "readonly",
        Toaster: "readonly"
      }
    },
    rules: {
      "prefer-arrow-callback": ["warn", { allowNamedFunctions: false }],
      "arrow-body-style": ["warn", "as-needed"],
      "no-unused-vars": ["warn", { vars: "all", args: "after-used" }],
      "no-var": "error",
      "prefer-const": "warn",
      "no-param-reassign": ["error", { props: true }]
    }
  }
]);
