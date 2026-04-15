#!/usr/bin/env node
/**
 * build.mjs — esbuild bundler for Novel Dialogue Enhancer Chrome Extension
 *
 * Usage:
 *   node build.mjs           — minified production build → src/**\/*.min.{js,css}
 *   node build.mjs --dev     — unminified dev build with inline source maps
 *
 * What it does:
 *   1. Minifies background.js in-place (no IIFE wrap — globals stay accessible for e2e tests)
 *   2. Bundles content + popup + options entry points into single IIFE files per entry
 *   3. Minifies each CSS file
 *   Output is placed next to each source file as *.min.js / *.min.css.
 *   These generated files are gitignored; the originals are kept for CWS review.
 */

import * as esbuild from "esbuild";

const dev = process.argv.includes("--dev");

console.log(`Building Novel Dialogue Enhancer  [${dev ? "dev" : "production"}]\n`);

// ── Background: minify only (no bundle, no IIFE) ───────────────────────────
// Preserves global scope so Playwright e2e tests can access
// isBackgroundReady, novelCharacterMaps, runPeriodicCleanup via background.evaluate()
await esbuild.build({
  entryPoints: [
    { in: "src/background/background.js", out: "src/background/background.min" },
  ],
  bundle:    false,
  minify:    !dev,
  sourcemap: dev ? "inline" : false,
  outdir:    ".",
  logLevel:  "info",
});

// ── JS bundles: content + popup + options ──────────────────────────────────
// esbuild resolves all ES-module imports and outputs a self-contained IIFE
// per entry point — no runtime loader injected.
await esbuild.build({
  entryPoints: [
    { in: "src/content/content.js",   out: "src/content/content.min"   },
    { in: "src/popup/popup.js",       out: "src/popup/popup.min"       },
    { in: "src/options/options.js",   out: "src/options/options.min"   },
  ],
  bundle:    true,
  minify:    !dev,
  sourcemap: dev ? "inline" : false,
  format:    "iife",
  platform:  "browser",
  target:    ["chrome120"],
  outdir:    ".",
  logLevel:  "info",
});

// ── CSS bundles ────────────────────────────────────────────────────────────
await esbuild.build({
  entryPoints: [
    { in: "src/popup/popup.css",     out: "src/popup/popup.min"     },
    { in: "src/options/options.css", out: "src/options/options.min" },
  ],
  bundle:   true,
  minify:   !dev,
  outdir:   ".",
  logLevel: "info",
});

console.log("\nDone.");
