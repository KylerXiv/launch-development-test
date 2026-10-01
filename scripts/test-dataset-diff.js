#!/usr/bin/env node
// Tests for scripts/dataset-diff.js — the "what changes for RBM" summary.
//   node scripts/test-dataset-diff.js
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const T = fs.mkdtempSync(path.join(os.tmpdir(), "dsdiff-"));
const text = (en) => ({ en, fr: en, pt: en });
const base = () => ({
  schema_version: 1, approved_by: "someone", approval: { trigger: "manual", issue: null, reason: "test" },
  data: {
    stages: [text("A"), text("B")],
    changelog: [{ date: "2026-09-30", product: "All", plain: text("Older entry") },
                { date: "2026-09-01", product: "All", plain: text("Oldest entry") }],
    products: [{ id: "x", stages: [{ status: "idle", note: text("n1") }, { status: "done", note: text("n2") }] },
               { id: "y", stages: [{ status: "idle" }, { status: "idle" }] }],
    sources: [{ id: "s1", plain: text("p") }],
  },
});
const run = (a, b) => {
  const fa = path.join(T, "a.json"), fb = path.join(T, "b.json");
  fs.writeFileSync(fa, JSON.stringify(a)); fs.writeFileSync(fb, JSON.stringify(b));
  return execFileSync(process.execPath, [path.join(__dirname, "dataset-diff.js"), fa, fb], { encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: "" } });
};
let passed = 0, failed = 0;
const ok = (c, name, out) => { if (c) passed++; else { failed++; console.log("  FAIL " + name + "\n" + out); } };

// an approval: one changelog line on top, one stage changed
let b = base();
b.data.changelog.unshift({ date: "2026-10-01", product: "x", plain: text("New entry") });
b.data.products[0].stages[0].status = "done";
let out = run(base(), b);
ok(/2 changes/.test(out), "a new changelog line is one change, not a shift of every line", out);
ok(/added `changelog`: 2026-10-01 · New entry/.test(out), "the added line is named", out);
ok(/`products\[x\]\.stages\[0\]\.status`: idle → done/.test(out), "the stage change is reported by product id", out);
ok(!/Older entry →/.test(out), "older changelog lines are not reported as changed", out);

// its revert is the mirror image
out = run(b, base());
ok(/removed `changelog`: 2026-10-01 · New entry/.test(out) && /done → idle/.test(out), "a revert shows the line removed and the stage back", out);

// reordering products is not a change
b = base(); b.data.products.reverse();
out = run(base(), b);
ok(/No change/.test(out), "products in another order are not a change", out);

// a translation-only change is reported for that language
b = base(); b.data.stages[0] = { en: "A", fr: "A-fr", pt: "A" };
out = run(base(), b);
ok(/`stages\[0\] \(fr\)`: A → A-fr/.test(out), "a French-only change is labelled (fr)", out);

// an emptied field reads as a dash
b = base(); b.data.products[0].stages[0].note = text("");
out = run(base(), b);
ok(/n1 → —/.test(out), "an emptied value shows as a dash", out);

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n  dataset-diff: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
