#!/usr/bin/env node
// Validates data/products.js (or another data file passed as the first
// argument, e.g. the synthetic development set). Run after every data edit:
//   node scripts/validate-data.js
//   node scripts/validate-data.js data/products.synthetic.js
// Exits 1 on any error (bad JSON, broken rules); prints warnings for
// missing provenance. Rules are the governance of the dashboard — a
// traffic light must never be able to lie silently.
//
// The rules themselves live in scripts/data-rules.js, so that the browser
// data editor can enforce exactly the same ones without a second copy. This
// file is only the command-line wrapper: reading, printing and the exit code.

const fs = require("fs");
const path = require("path");
const rules = require("./data-rules.js");

const FILE = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(__dirname, "..", "data", "products.js");

// ---- extract the strict-JSON body -----------------------------------------
const extracted = rules.extractData(fs.readFileSync(FILE, "utf8"));
if (!extracted.ok) {
  if (extracted.reason === "no-marker") {
    console.error(`ERROR: could not find \`window.LAUNCH_DATA = { ... }\` at a line start in ${path.relative(process.cwd(), FILE)}`);
  } else {
    console.error("ERROR: data body is not strict JSON — " + extracted.message);
    console.error("Check for single quotes, trailing commas, or comments inside the object.");
  }
  process.exit(1);
}

// ---- the product data contract ----------------------------------------------
const found = rules.checkData(extracted.data);
const errors = found.errors;
const warnings = found.warnings;

// ---- WHO study-result layers -----------------------------------------------
// Runs only on the default (real) invocation: these are single global
// datasets, not one per product data file, so re-checking them on the
// synthetic run would only double the output. The rules need the file
// contents, which is this wrapper's job to supply.
if (!process.argv[2]) {
  const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  const layers = rules.checkStudyLayers({
    worldMap: read("data/world-map.js"),
    datasets: rules.DATASETS.map((ds) => {
      const abs = path.join(__dirname, "..", ds.file);
      return fs.existsSync(abs) ? { file: ds.file, source: fs.readFileSync(abs, "utf8") }
                                : { file: ds.file, missing: true };
    })
  });
  errors.push(...layers.errors);
  warnings.push(...layers.warnings);

  // ---- the source registry -------------------------------------------------
  // Same reasoning as the layers above: one global file, not one per product
  // data file. Product ids are passed through so a source cannot cite a
  // medicine that no longer exists.
  const SRC = path.join(__dirname, "..", "data", "sources.js");
  const rawSrc = rules.extractData(fs.readFileSync(SRC, "utf8"), "LAUNCH_SOURCES");
  if (!rawSrc.ok) {
    errors.push(rawSrc.reason === "no-marker"
      ? "sources: could not find `window.LAUNCH_SOURCES = { ... }` at a line start in data/sources.js"
      : "sources: data/sources.js is not strict JSON — " + rawSrc.message);
  } else {
    const ids = (extracted.data.products || []).map((p) => p.id);
    const srcFound = rules.checkSources(rawSrc.data, ids);
    errors.push(...srcFound.errors);
    warnings.push(...srcFound.warnings);
  }
}

// ---- report -----------------------------------------------------------------
for (const w of warnings) console.log("WARN  " + w);
for (const e of errors) console.log("ERROR " + e);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length) {
  console.log("Fix the errors above before committing — the dashboard must not publish inconsistent data.");
  process.exit(1);
}
console.log("Data file is valid.");
