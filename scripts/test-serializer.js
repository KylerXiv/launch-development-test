#!/usr/bin/env node
// Round-trip test for the house-style serializer: parse a data file, write it
// back out with no edits, and require the result to be byte-identical.
//
// This is the only thing standing between a one-field edit and a whole-file
// diff, so it runs over both datasets — same contract, free second case.

const fs = require("fs");
const path = require("path");
const rules = require("./data-rules.js");
const { serializeProducts } = require("./serialize-products.js");

const FILES = ["data/products.js", "data/products.synthetic.js"];
let failed = 0;

for (const rel of FILES) {
  const abs = path.join(__dirname, "..", rel);
  const original = fs.readFileSync(abs, "utf8");
  const extracted = rules.extractData(original);
  if (!extracted.ok) {
    console.log(`FAIL  ${rel}: could not extract data (${extracted.reason})`);
    failed++;
    continue;
  }
  const rewritten = serializeProducts(extracted.data, original);
  if (rewritten === original) {
    console.log(`ok    ${rel} — round-trips byte-identical (${Buffer.byteLength(original)} bytes)`);
    continue;
  }
  failed++;
  console.log(`FAIL  ${rel} — round-trip differs`);
  const a = original.split("\n");
  const b = rewritten.split("\n");
  let shown = 0;
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 5; i++) {
    if (a[i] !== b[i]) {
      console.log(`  line ${i + 1}:`);
      console.log(`    original:  ${JSON.stringify(a[i])}`);
      console.log(`    rewritten: ${JSON.stringify(b[i])}`);
      shown++;
    }
  }
  if (a.length !== b.length) console.log(`  line count: ${a.length} -> ${b.length}`);
}

console.log(`\n${failed} failure(s).`);
process.exit(failed ? 1 : 0);
