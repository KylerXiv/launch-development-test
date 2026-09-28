#!/usr/bin/env node
// Runs every fixture in test-data/import/ through the real import pipeline and
// prints what each one does. This is the expected-behaviour table: if a change
// to import-lib.js moves a number here, that is the change's actual effect.
//
//   node scripts/report-import-fixtures.js

const imp = require("./import-lib.js");
const rules = require("./data-rules.js");
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "test-data", "import");
const base = rules.extractData(
  fs.readFileSync(path.join(__dirname, "..", "data", "products.js"), "utf8")).data;

const rows = [];
fs.readdirSync(dir).filter(f => !/^README/.test(f)).sort().forEach(f => {
  const text = fs.readFileSync(path.join(dir, f), "utf8");
  const d = JSON.parse(JSON.stringify(base));
  const parsed = imp.readFile(f, text);
  const map = imp.guessMapping(parsed.headers, d.stages);
  const plan = imp.planImport(parsed.records, map, d);
  const issues = plan.creates.concat(plan.updates).reduce((n, x) => n + x.issues.length, 0) +
                 plan.skipped.reduce((n, x) => n + (x.issues || []).length, 0);
  rows.push([f, parsed.records.length,
             Object.keys(map.fields).length + Object.keys(map.stages).length,
             map.unmapped.length, plan.creates.length, plan.updates.length,
             plan.skipped.length, issues, parsed.notes.length]);
});

const head = ["file", "rows", "mapped", "unmapped", "new", "update", "skip", "issues", "notes"];
const w = head.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)) + 2);
console.log(head.map((h, i) => h.padEnd(w[i])).join(""));
console.log(w.map(n => "-".repeat(n - 2) + "  ").join(""));
rows.forEach(r => console.log(r.map((v, i) => String(v).padEnd(w[i])).join("")));
