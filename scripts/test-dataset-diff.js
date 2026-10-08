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

// a language added (Spanish, Oct 2026): one line, not one per text, and still a change
const withEs = (o) => JSON.parse(JSON.stringify(o), (k, v) => (v && typeof v.en === "string" && "pt" in v ? { ...v, es: k === "plain" ? v.en + "-es" : v.en } : v));
const a3 = { ...base(), locales: ["en", "fr", "pt"] };
b = { ...withEs(base()), locales: ["en", "fr", "pt", "es"] };
out = run(a3, b);
ok(/^1 change for/m.test(out) && /language added: `es`, in all 7 texts \(3 translated;/.test(out) && !/\(es\)`/.test(out),
   "a new language is one line, with how much of it is translated", out);
b.data.changelog.unshift({ date: "2026-10-09", product: "x", plain: { en: "New", fr: "New", pt: "New", es: "New" } });
out = run(a3, b);
ok(/^2 changes for/m.test(out) && /added `changelog`: 2026-10-09 · New/.test(out) && !/removed `changelog`/.test(out),
   "a changelog line on top of a new language is still one line, not every entry", out);
// after it is published: a Spanish-only change is labelled (es)
const b2 = JSON.parse(JSON.stringify(b)); b2.data.stages[0].es = "A-es";
out = run(b, b2);
ok(/`stages\[0\] \(es\)`: A → A-es/.test(out), "a Spanish-only change is labelled (es)", out);

fs.rmSync(T, { recursive: true, force: true });
console.log(`\n  dataset-diff: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
