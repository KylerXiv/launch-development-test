#!/usr/bin/env node
// Tests for scripts/rbm-release.js (when a build of the RBM pages is a new
// release) and the compare() it uses from scripts/rbm-manifest.js.
//   node scripts/test-rbm-release.js
// No network, no git: works on made-up manifests.
"use strict";
const { nextTag, decide, notes } = require("./rbm-release");
const { compare } = require("./rbm-manifest");

let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };

const base = { built_from: "a".repeat(40), clean: true, translations_current: true, data_url: "d", api_url: "a", test_build: false,
  files: { "assets/logo.svg": "1", "en/index.html": "2", "fr/index.html": "3", "pt/index.html": "4", "es/index.html": "5" } };
const withFiles = (files, extra = {}) => ({ ...base, ...extra, files });

// tags
ok(nextTag("") === "rbm-v1" && nextTag(null) === "rbm-v1", "no release yet → rbm-v1");
ok(nextTag("rbm-v1") === "rbm-v2" && nextTag("rbm-v9") === "rbm-v10", "rbm-vN → rbm-v(N+1)");
{ let threw = false; try { nextTag("v3"); } catch { threw = true; } ok(threw, "a tag that is not rbm-v<number> is refused"); }

// compare
{ const d = compare(base, withFiles({ ...base.files }));
  ok(d.same, "identical file lists are the same"); }
{ const f = { ...base.files, "fr/index.html": "x", "assets/new.svg": "6" }; delete f["es/index.html"];
  const d = compare(base, withFiles(f));
  ok(d.changed.join() === "fr/index.html" && d.added.join() === "assets/new.svg" && d.removed.join() === "es/index.html" && !d.same,
     "changed, added and removed files are told apart"); }
ok(compare(null, base).added.length === 5, "no previous release: every file is new");

// decide
{ const r = decide(base, null, "");
  ok(r.release && r.tag === "rbm-v1", "the first build is rbm-v1"); }
{ const r = decide(withFiles({ ...base.files }, { built_from: "b".repeat(40) }), base, "rbm-v4");
  ok(!r.release && /same as rbm-v4/.test(r.reason), "a new commit that builds the same pages is no release"); }
{ const r = decide(withFiles({ ...base.files, "en/index.html": "changed" }), base, "rbm-v4");
  ok(r.release && r.tag === "rbm-v5" && r.diff.changed.join() === "en/index.html", "a changed page is the next release"); }
{ const r = decide(withFiles({ ...base.files, "en/index.html": "changed" }, { translations_current: false }), base, "rbm-v4");
  ok(!r.release && /translate bot/.test(r.reason), "a build made before the translate bot caught up is no release"); }
{ const r = decide({ ...base, clean: false }, null, "");
  ok(!r.release && /uncommitted/.test(r.reason), "a build from uncommitted files is no release"); }
{ const r = decide({ ...base, test_build: true }, null, "");
  ok(!r.release && /test build/.test(r.reason), "a test build is no release"); }

// notes
{ const built = withFiles({ ...base.files, "fr/index.html": "x", "assets/new.svg": "6" }, { built_from: "c".repeat(40) });
  const d = compare(base, built);
  const n = notes({ tag: "rbm-v2", built, previous: base, previousTag: "rbm-v1", diff: d, commits: ["Fix the legend (1234567)"], repo: "o/r" });
  ok(/Changes since rbm-v1/.test(n) && /Fix the legend \(1234567\)/.test(n), "the notes name the previous release and the commits");
  ok(/`fr\/`: 1 file/.test(n) && /New files[\s\S]*`assets\/`: 1 file/.test(n), "the notes count changed and new files per folder");
  ok(/github\.com\/o\/r\/commit\/c{40}/.test(n), "the notes link the commit the pages were built from");
  ok(/dashboard\.json/.test(n), "the notes say data is not part of a release"); }
{ const n = notes({ tag: "rbm-v1", built: base, previous: null, previousTag: "", diff: compare(null, base), commits: [], repo: "" });
  ok(/First release/.test(n) && /5 files/.test(n), "the first release's notes say so and count the files"); }

console.log(`\n  rbm-release: ${passed} passed, ${failed} failed\n`);
process.exitCode = failed ? 1 : 0;
