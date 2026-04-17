import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/*.min.js", "src/shared/lib/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
        chrome: "readonly",
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
