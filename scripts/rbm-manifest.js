// The RBM pages' build manifest: what a build of the pages wrote, and the
// checks made before those pages, or a new dashboard.json, are copied anywhere.
//
// Used by scripts/build-rbm-pages.js (writes the manifest) and
// scripts/copy-rbm-pages.js (checks it before a copy). It needs nothing but
// Node and git.
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

// The folders a build fills, and so the folders a copy into launch-rbm-test
// replaces. data/ holds the one dashboard.json all three pages read: a copy of
// the latest file published to the data repo (27 Oct 2026; until then the
// pages fetched it from the data repo's address). The rest of that repository
// (its README, index.html, iframe-test.html, rbm-shell/) is its own.
// Spanish (es) was a fourth language from 8 to 27 Oct 2026.
const LOCALES = ["en", "fr", "pt"];
const DATA_FILE = "data/dashboard.json";
const BUILT = [...LOCALES, "assets", "data"];
const MANIFEST = "build-manifest.json";
// The dashboard.json version the pages read (build-rbm-pages.js's loader).
const SCHEMA = 1;
// Where the latest published dashboard.json is: a checkout of the data repo
// (codebyjackson/launch-data-test) next to this repository.
const DEFAULT_DATASET = path.join(__dirname, "..", "..", "launch-data-test", "v1", "dashboard.json");

// A file's sha256, line endings aside: git checks text out with CRLF on
// Windows, so the same page can sit on disk either way.
const TEXT_FILE = /\.(html|js|json|svg|md|css|txt)$/i;
function fingerprint(file) {
  let b = fs.readFileSync(file);
  if (TEXT_FILE.test(file)) b = Buffer.from(b.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
  return crypto.createHash("sha256").update(b).digest("hex");
}

// Every file in the built folders of dir (or the folders named), as
// { "en/index.html": sha256, ... }.
function manifestOf(dir, folders = BUILT) {
  const out = {};
  const walk = (rel) => {
    const abs = path.join(dir, rel);
    if (!fs.existsSync(abs)) return;
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const r = rel + "/" + e.name;
      if (e.isDirectory()) walk(r); else out[r] = fingerprint(path.join(dir, r));
    }
  };
  folders.forEach(walk);
  return Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]));
}

// The latest published dashboard.json, from a checkout of the data repo: the
// file, what it is (for the manifest), and why it may not go to RBM, as
// sentences (none: it is the published one). Published means the last commit
// to it is the publish workflow's (marked [publish-dataset]), it has no
// uncommitted change, and the checkout is not behind GitHub.
function publishedDataset(file = DEFAULT_DATASET) {
  if (!fs.existsSync(file)) {
    return { problems: [`there is no ${file}: clone launch-data-test next to this repository, or pass --dataset <file>`] };
  }
  let ds;
  try { ds = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return { problems: [`${file} is not JSON: ${e.message}`] }; }
  // (whether the pages can read its schema_version is the caller's check: the
  // pages being built, or the ones already in the target)
  const problems = [];
  const dir = path.dirname(file), name = path.basename(file);
  const git = (...a) => {
    try { return execFileSync("git", ["-C", dir, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }).trim(); } catch { return null; }
  };
  const last = git("log", "-1", "--format=%H%x09%s", "--", name);
  const commit = last ? last.split("\t")[0] : null;
  if (!last) problems.push(`${file} is not a committed file of the data repo, so it cannot be told apart from an unpublished build`);
  else {
    if (!last.includes("[publish-dataset]")) problems.push(`its last commit (${commit.slice(0, 7)}) was not made by the publish workflow`);
    if (git("status", "--porcelain", "--", name)) problems.push(`it has uncommitted changes in ${dir}`);
    // a checkout with no remote (the tests) or no network skips this one
    if (git("fetch", "--quiet", "origin") !== null) {
      const behind = git("rev-list", "--count", "HEAD..@{u}");
      if (behind && behind !== "0") problems.push(`the data repo checkout is ${behind} commit(s) behind GitHub: pull it first`);
    }
  }
  return {
    ds, problems,
    info: { data_repo_commit: commit, generated_at: ds.generated_at, last_updated: ds.last_updated, schema_version: ds.schema_version },
  };
}

// What is wrong with a build itself, as sentences (none: publishable).
function buildProblems(m) {
  const p = [];
  if (m.test_build) p.push(`it is a test build (data ${m.data_url}, forms ${m.api_url || "off"}): rebuild with no --data-url or --api-url`);
  if (!m.clean) p.push("it was built from uncommitted files in this repository: commit them, then rebuild, so the copy names a commit that holds them");
  if (!m.translations_current) p.push("i18n/content.en.json was out of date, so new text would go out in English: wait for the translate bot's commit on main, pull, then rebuild");
  if (!m.dataset) p.push(`it has no ${DATA_FILE}: rebuild with the data repo checked out next to this repository (or --dataset <file>)`);
  for (const x of m.dataset_problems || []) p.push(`its ${DATA_FILE} is not the latest published one: ${x}`);
  return p;
}

// What changed in dir since manifest `was` was written there, in today's built
// folders and in any older one `was` lists (es/, until 27 Oct 2026).
function drift(dir, was) {
  const now = manifestOf(dir, [...new Set([...BUILT, ...Object.keys(was.files || {}).map((r) => r.split("/")[0])])]);
  const changed = [], missing = [], added = [];
  for (const [rel, sha] of Object.entries(was.files || {})) {
    if (!(rel in now)) missing.push(rel);
    else if (now[rel] !== sha) changed.push(rel);
  }
  for (const rel of Object.keys(now)) if (!(rel in (was.files || {}))) added.push(rel);
  return { changed, missing, added };
}

module.exports = { LOCALES, DATA_FILE, BUILT, MANIFEST, SCHEMA, DEFAULT_DATASET, fingerprint, manifestOf, publishedDataset, buildProblems, drift };
