// The RBM pages' build manifest: what a build of the pages wrote, and the
// checks made before those pages are copied anywhere.
//
// Used by scripts/build-rbm-pages.js (writes the manifest),
// scripts/copy-rbm-pages.js (checks it before a copy) and
// scripts/rbm-release.js (compares two builds). It needs nothing but Node, so
// each release ships it beside copy-rbm-pages.js, and the robot in
// launch-rbm-test runs the very same checks without this repository.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// The folders a build fills, and so the folders a copy into launch-rbm-test
// replaces. The rest of that repository (its README, index.html,
// iframe-test.html, rbm-shell/) is its own.
const LOCALES = ["en", "fr", "pt", "es"];
const BUILT = [...LOCALES, "assets"];
const MANIFEST = "build-manifest.json";

// A file's sha256, line endings aside: git checks text out with CRLF on
// Windows, so the same page can sit on disk either way.
const TEXT_FILE = /\.(html|js|json|svg|md|css|txt)$/i;
function fingerprint(file) {
  let b = fs.readFileSync(file);
  if (TEXT_FILE.test(file)) b = Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  return crypto.createHash("sha256").update(b).digest("hex");
}

// Every file in the built folders of dir, as { "en/index.html": sha256, ... }.
function manifestOf(dir) {
  const out = {};
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel + "/" + e.name;
      if (e.isDirectory()) walk(r); else out[r] = fingerprint(path.join(dir, r));
    }
  };
  BUILT.forEach(walk);
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

// What is wrong with a build itself, as sentences (none: publishable).
function buildProblems(m) {
  const p = [];
  if (m.test_build) p.push(`it is a test build (data ${m.data_url}, forms ${m.api_url || "off"}): rebuild with no --data-url or --api-url`);
  if (!m.clean) p.push("it was built from uncommitted files in this repository: commit them, then rebuild, so the copy names a commit that holds them");
  if (!m.translations_current) p.push("i18n/content.en.json was out of date, so new text would go out in English: wait for the translate bot's commit on main, pull, then rebuild");
  return p;
}

// What changed in dir since manifest `was` was written there.
function drift(dir, was) {
  const now = manifestOf(dir);
  const changed = [], missing = [], added = [];
  for (const [rel, sha] of Object.entries(was.files || {})) {
    if (!(rel in now)) missing.push(rel);
    else if (now[rel] !== sha) changed.push(rel);
  }
  for (const rel of Object.keys(now)) if (!(rel in (was.files || {}))) added.push(rel);
  return { changed, missing, added };
}

// How two manifests' file lists differ: what a release would change.
function compare(before, after) {
  const a = (before && before.files) || {}, b = (after && after.files) || {};
  const changed = [], added = [], removed = [];
  for (const rel of Object.keys(b)) {
    if (!(rel in a)) added.push(rel);
    else if (a[rel] !== b[rel]) changed.push(rel);
  }
  for (const rel of Object.keys(a)) if (!(rel in b)) removed.push(rel);
  return { changed, added, removed, same: !changed.length && !added.length && !removed.length };
}

module.exports = { LOCALES, BUILT, MANIFEST, fingerprint, manifestOf, buildProblems, drift, compare };
