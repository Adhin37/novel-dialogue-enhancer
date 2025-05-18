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
        EnhancerIntegration: "readonly",
        Toaster: "readonly",
        DOMPurify: "readonly"
      }
    },
    rules: {
      "prefer-arrow-callback": ["warn", { allowNamedFunctions: false }],
      "arrow-body-style": ["warn", "as-needed"],
      "no-unused-vars": ["warn", { vars: "all", args: "after-used" }],
      "no-var": "error",
      "prefer-const": "warn"
    }
  }
]);
