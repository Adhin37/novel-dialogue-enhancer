#!/usr/bin/env node
// Verifies that hardcoded defaults in background.js match src/shared/llm/ollama-config.js.
// Run with: node scripts/check-config-sync.js
// Exits non-zero if any value differs.

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const bgText  = readFileSync(resolve(root, "src/background/background.js"), "utf8");
const cfgText = readFileSync(resolve(root, "src/shared/llm/ollama-config.js"), "utf8");

function extractBgConst(name) {
  const m = bgText.match(new RegExp(`const\\s+${name}\\s*=\\s*([^;]+);`));
  if (!m) throw new Error(`Could not find ${name} in background.js`);
  return m[1].trim().replace(/^["']|["']$/g, "");
}

// Extract a value from a dotted path like "OllamaConfig.LLM.TIMEOUT" by
// finding the parent section first, then the key within it.
function extractCfgValue(dotPath) {
  const parts = dotPath.split(".");          // ["OllamaConfig", "LLM", "TIMEOUT"]
  const key     = parts[parts.length - 1];   // "TIMEOUT"
  const section = parts[parts.length - 2];   // "LLM"

  if (section === parts[0]) {
    // Top-level key — simple search
    const m = cfgText.match(new RegExp(`${key}:\\s*([^,\\n]+)`));
    if (!m) throw new Error(`Could not find ${key} in config`);
    return m[1].trim().replace(/^["']|["']$/g, "");
  }

  // Find the section block first, then find the key inside it
  const sectionRegex = new RegExp(`${section}\\s*:\\s*\\{([^}]+)\\}`, "s");
  const sectionMatch = cfgText.match(sectionRegex);
  if (!sectionMatch) throw new Error(`Could not find section ${section} in config`);

  const sectionText = sectionMatch[1];
  const keyMatch = sectionText.match(new RegExp(`${key}:\\s*([^,\\n]+)`));
  if (!keyMatch) throw new Error(`Could not find ${key} in section ${section}`);
  return keyMatch[1].trim().replace(/^["']|["']$/g, "");
}

const checks = [
  ["DEFAULT_OLLAMA_URL",   "OllamaConfig.API.BASE"],
  ["DEFAULT_MODEL_NAME",   "OllamaConfig.LLM.MODEL_NAME"],
  ["DEFAULT_CONTEXT_SIZE", "OllamaConfig.LLM.CONTEXT_SIZE"],
  ["DEFAULT_TIMEOUT_SEC",  "OllamaConfig.LLM.TIMEOUT"],
  ["DEFAULT_TEMPERATURE",  "OllamaConfig.LLM.TEMPERATURE"],
  ["DEFAULT_TOP_P",        "OllamaConfig.LLM.TOP_P"],
];

let failures = 0;
for (const [bgConst, cfgPath] of checks) {
  const bgVal  = extractBgConst(bgConst);
  const cfgVal = extractCfgValue(cfgPath);
  if (bgVal !== cfgVal) {
    console.error(`MISMATCH: ${bgConst} = ${bgVal}  vs  ${cfgPath} = ${cfgVal}`);
    failures++;
  } else {
    console.log(`OK: ${bgConst} = ${bgVal}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} sync error(s) found. Update background.js to match ollama-config.js.`);
  process.exit(1);
} else {
  console.log("\nAll config values in sync.");
}
