#!/usr/bin/env node
/**
 * scripts/i18n-identifiers.js
 *
 * The strings on this page that are IDENTIFIERS rather than labels, derived from
 * the data files themselves rather than hand-listed.
 *
 * Why this exists
 * ---------------
 * resistance.js and molecular-markers.js are pivoted stores. A drug name is not
 * decoration in them, it is the key everything is looked up by:
 *
 *     RES.treatmentFailure["Artesunate-pyronaridine"]["P. falciparum"]   // pivot key
 *     dict.drug.indexOf("Artesunate-pyronaridine")                       // row lookup
 *     const PRODUCT_DRUG = { pyramax: "Artesunate-pyronaridine", ... }   // page constant
 *
 * The build never translates object keys, so translating the same string
 * ANYWHERE ELSE breaks the match. Both failures seen on 23 September were this:
 * once through dict.drug, once through PRODUCT_DRUG. Neither threw an error —
 * the page rendered perfectly and the threat map was simply empty.
 *
 * Deriving the set from the data means a drug WHO adds next quarter is protected
 * the day it lands, with nobody remembering to add it here.
 *
 * Every consumer treats membership as absolute: never inventoried, never sent to
 * an engine, never substituted, in any bucket.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const FILES = [
  ["data/resistance.js", "window.LAUNCH_RESISTANCE"],
  ["data/molecular-markers.js", "window.LAUNCH_MOLECULAR_MARKERS"],
];
// the pivots are every top-level key that is not one of the row-store members
const NOT_A_PIVOT = new Set(["fields", "coded", "dict", "studies", "meta", "generated", "schema"]);

function parse(root, rel, marker) {
  const src = fs.readFileSync(path.join(root, rel), "utf8");
  const at = src.indexOf(marker + " =");
  if (at === -1) throw new Error(`${rel}: marker "${marker} =" not found`);
  return JSON.parse(src.slice(at + marker.length + 2).trim().replace(/;\s*$/, ""));
}

function identifiers(root) {
  const ids = new Set();
  const add = (v) => { if (typeof v === "string" && v.trim()) ids.add(v.trim()); };

  for (const [rel, marker] of FILES) {
    const D = parse(root, rel, marker);

    // pivot objects: layer -> dimension -> species -> iso3.
    // the dimension and species levels are both lookup keys.
    for (const k of Object.keys(D)) {
      if (NOT_A_PIVOT.has(k)) continue;
      const layer = D[k];
      if (!layer || typeof layer !== "object" || Array.isArray(layer)) continue;
      for (const dim of Object.keys(layer)) {
        add(dim);
        const inner = layer[dim];
        if (inner && typeof inner === "object") Object.keys(inner).forEach(add);
      }
    }

    // the interned dictionary columns the page resolves rows through
    for (const col of ["drug", "marker", "species"]) ((D.dict || {})[col] || []).forEach(add);

    // meta.markerDrug is keyed by marker name; the VALUES are display text and
    // are translated as normal, the KEYS are not
    Object.keys((D.meta || {}).markerDrug || {}).forEach(add);
  }
  return ids;
}

module.exports = { identifiers };

// `node scripts/i18n-identifiers.js` prints the set, for eyeballing
if (require.main === module) {
  const ids = [...identifiers(path.resolve(__dirname, ".."))].sort();
  console.log(`\n  ${ids.length} identifier strings — never translated, in any bucket\n`);
  ids.forEach((s) => console.log("    " + s));
  console.log("");
}
