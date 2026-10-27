#!/usr/bin/env node
// Tests for scripts/copy-rbm-pages.js — the copy of the RBM pages into the RBM
// test repository, and the check that stops it from wiping hand edits there.
//   node scripts/test-copy-rbm-pages.js
// Works in a temporary folder: a fake build and a throwaway git repository.
// Needs git; no network.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { manifestOf, fingerprint, MANIFEST } = require("./build-rbm-pages");
const { buildProblems, drift, main } = require("./copy-rbm-pages");

let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "copy-rbm-"));
const put = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const quiet = (fn) => { const e = console.error, l = console.log; let out = ""; console.error = console.log = (s) => { out += s + "\n"; }; try { return { code: fn(), out }; } finally { console.error = e; console.log = l; } };

// a build: three pages, a shared asset, the data, its manifest
const dist = path.join(tmp, "dist");
const DS = (n) => JSON.stringify({ schema_version: 1, generated_at: `2026-10-2${n}T10:00:00Z`, last_updated: `2026-10-2${n}`, locales: ["en", "fr", "pt"] }) + "\n";
const PAGES = { "en/index.html": "<p>en</p>\n", "fr/index.html": "<p>fr</p>\n", "pt/index.html": "<p>pt</p>\n", "assets/logo.svg": "<svg/>\n", "data/dashboard.json": DS(1) };
const build = (files, extra = {}) => {
  fs.rmSync(dist, { recursive: true, force: true });
  Object.entries(files).forEach(([r, t]) => put(dist, r, t));
  put(dist, "README.md", "built readme\n");
  const m = { built_from: "a".repeat(40), clean: true, translations_current: true, data_url: "../data/dashboard.json", api_url: "a", test_build: false,
    schema: 1, dataset: { data_repo_commit: "b".repeat(40), generated_at: "2026-10-21T10:00:00Z" }, dataset_problems: [], files: manifestOf(dist), ...extra };
  fs.writeFileSync(path.join(dist, MANIFEST), JSON.stringify(m));
  return m;
};

// fingerprints and drift
{ const a = path.join(tmp, "a.html"), b = path.join(tmp, "b.html");
  fs.writeFileSync(a, "one\ntwo\n"); fs.writeFileSync(b, "one\r\ntwo\r\n");
  ok(fingerprint(a) === fingerprint(b), "a page checked out with CRLF has the same fingerprint as with LF"); }
{ const m = build(PAGES);
  ok(Object.keys(m.files).join() === "assets/logo.svg,data/dashboard.json,en/index.html,fr/index.html,pt/index.html", "the manifest lists the built folders only, data/ included, not README.md");
  const d = drift(dist, m);
  ok(!d.changed.length && !d.missing.length && !d.added.length, "an untouched build has no drift");
  put(dist, "fr/index.html", "<p>fr, edited by hand</p>\n"); put(dist, "fr/extra.js", "x"); fs.rmSync(path.join(dist, "pt/index.html"));
  const d2 = drift(dist, m);
  ok(d2.changed.join() === "fr/index.html" && d2.added.join() === "fr/extra.js" && d2.missing.join() === "pt/index.html", "drift names changed, added and deleted files"); }

// the build must be one to publish
const DSOK = { dataset: { data_repo_commit: "b" }, dataset_problems: [] };
ok(!buildProblems({ clean: true, translations_current: true, test_build: false, ...DSOK }).length, "a clean, translated, default build with the published data may be copied");
ok(/no data\/dashboard\.json/.test(buildProblems({ clean: true, translations_current: true, test_build: false, dataset: null }).join()), "a build without the data may not");
ok(/not the latest published one: its last commit/.test(buildProblems({ clean: true, translations_current: true, test_build: false, dataset: { data_repo_commit: "b" }, dataset_problems: ["its last commit (b) was not made by the publish workflow"] }).join()),
   "a build with data that is not the published file may not");
ok(/test build/.test(buildProblems({ clean: true, translations_current: true, test_build: true, data_url: "http://localhost/x" }).join()), "a --data-url / --api-url build may not");
ok(/uncommitted/.test(buildProblems({ clean: false, translations_current: true, test_build: false, ...DSOK }).join()), "a build from uncommitted files may not");
ok(/translate bot/.test(buildProblems({ clean: true, translations_current: false, test_build: false, ...DSOK }).join()), "a build made before the translate bot caught up may not");

// end to end, in a throwaway checkout of the test repository
const repo = path.join(tmp, "rbm-test");
const git = (...a) => execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
fs.mkdirSync(repo);
git("init", "-q");
Object.entries(PAGES).forEach(([r]) => put(repo, r, `<p>copied by hand ${r}</p>\n`));
put(repo, "README.md", "the test repo's own readme\n"); put(repo, "iframe-test.html", "<p>shell</p>\n");
git("add", "-A"); git("commit", "-q", "-m", "hand copy");
const copy = (...a) => quiet(() => main(["--from", dist, "--to", repo, ...a]));
build(PAGES);
{ const r = copy();
  ok(r.code === 1 && /no build-manifest\.json/.test(r.out) && /--first-copy/.test(r.out), "no manifest in the target: stops and asks for --first-copy");
  ok(fs.readFileSync(path.join(repo, "en/index.html"), "utf8").includes("copied by hand"), "…and changes nothing"); }
{ const r = copy("--first-copy");
  ok(r.code === 0 && fs.readFileSync(path.join(repo, "en/index.html"), "utf8") === PAGES["en/index.html"], "--first-copy copies the pages");
  ok(fs.existsSync(path.join(repo, MANIFEST)), "…and leaves the manifest there");
  ok(fs.readFileSync(path.join(repo, "README.md"), "utf8") === "the test repo's own readme\n" && fs.existsSync(path.join(repo, "iframe-test.html")), "…and keeps the test repo's own README and iframe test");
  git("add", "-A"); git("commit", "-q", "-m", "copy 1"); }
{ put(repo, "en/index.html", "<p>en, edited by hand in the test repo</p>\n"); git("add", "-A"); git("commit", "-q", "-m", "hand edit");
  build({ ...PAGES, "en/index.html": "<p>en, new build</p>\n" });
  const r = copy();
  ok(r.code === 1 && /changed\s+en\/index\.html/.test(r.out) && /hand edit/.test(r.out), "a page edited in the test repo stops the copy, naming the file and its commit");
  ok(fs.readFileSync(path.join(repo, "en/index.html"), "utf8").includes("edited by hand"), "…and the edit is still there");
  const r2 = copy("--force");
  ok(r2.code === 0 && fs.readFileSync(path.join(repo, "en/index.html"), "utf8") === "<p>en, new build</p>\n", "--force copies once the edit is in the build");
  git("add", "-A"); git("commit", "-q", "-m", "copy 2"); }
{ put(repo, "fr/index.html", "uncommitted\n");
  const r = copy();
  ok(r.code === 1 && /uncommitted changes/.test(r.out), "uncommitted changes in the test repo stop the copy");
  git("checkout", "-q", "--", "fr/index.html"); }
{ const noAsset = { ...PAGES }; delete noAsset["assets/logo.svg"];
  build({ ...noAsset, "assets/new.svg": "<svg id=n/>\n" });
  const r = copy();
  ok(r.code === 0 && !fs.existsSync(path.join(repo, "assets/logo.svg")) && fs.existsSync(path.join(repo, "assets/new.svg")), "a file the build no longer writes is removed from the test repo");
  git("add", "-A"); git("commit", "-q", "-m", "copy 3"); }
{ build(PAGES, { test_build: true, data_url: "http://localhost:8000/dashboard.json" });
  const r = copy("--force");
  ok(r.code === 1 && /test build/.test(r.out), "a test build is never copied, even with --force"); }
{ build(PAGES); put(dist, "en/index.html", "<p>edited in dist</p>\n");
  const r = copy("--force");
  ok(r.code === 1 && /no longer matches its own manifest/.test(r.out), "a build edited after it was made is not copied"); }

// a folder the build no longer has (es/, Spanish removed on 27 Oct 2026): the
// last copy's manifest lists it, so it is removed, and not taken for a hand deletion
{ put(repo, "es/index.html", "<p>es</p>\n"); put(repo, "es/data/world-map.js", "x\n");
  const m = JSON.parse(fs.readFileSync(path.join(repo, MANIFEST), "utf8"));
  m.files["es/index.html"] = fingerprint(path.join(repo, "es/index.html"));
  m.files["es/data/world-map.js"] = fingerprint(path.join(repo, "es/data/world-map.js"));
  fs.writeFileSync(path.join(repo, MANIFEST), JSON.stringify(m)); git("add", "-A"); git("commit", "-q", "-m", "a build with es/");
  build(PAGES);
  const r = copy();
  ok(r.code === 0 && !fs.existsSync(path.join(repo, "es")), "a language folder the build no longer writes is removed whole, without --force");
  git("add", "-A"); git("commit", "-q", "-m", "copy 4"); }

// --data-only: after a publish, the latest published dashboard.json alone
const data = path.join(tmp, "launch-data-test");
const dgit = (...a) => execFileSync("git", ["-C", data, "-c", "user.name=bot", "-c", "user.email=b@b", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const dfile = path.join(data, "v1", "dashboard.json");
fs.mkdirSync(data); dgit("init", "-q");
const publish = (text, msg = "Published by @x: test [publish-dataset]") => { put(data, "v1/dashboard.json", text); dgit("add", "-A"); dgit("commit", "-q", "-m", msg); };
const copyData = (...a) => quiet(() => main(["--to", repo, "--data-only", "--dataset", dfile, ...a]));
publish(DS(2));
{ const r = copyData();
  const m = JSON.parse(fs.readFileSync(path.join(repo, MANIFEST), "utf8"));
  ok(r.code === 0 && fs.readFileSync(path.join(repo, "data/dashboard.json"), "utf8") === DS(2), "--data-only copies the published file into data/");
  ok(m.dataset.generated_at === "2026-10-22T10:00:00Z" && m.dataset.data_repo_commit === dgit("rev-parse", "HEAD"), "…and the manifest names it");
  const d = drift(repo, m);
  ok(!d.changed.length && !d.missing.length && !d.added.length && fs.readFileSync(path.join(repo, "en/index.html"), "utf8") === PAGES["en/index.html"],
     "…changing nothing else, so the next copy sees no hand edit");
  ok(/data\/2026-10-22-/.test(r.out) && /file to send RBM/.test(r.out), "…and prints the branch to commit it on");
  git("add", "-A"); git("commit", "-q", "-m", "data 2");
  ok(/Nothing changed/.test(copyData().out), "the same file again changes nothing"); }
{ put(data, "v1/dashboard.json", DS(3)); dgit("add", "-A"); dgit("commit", "-q", "-m", "hand edit of the data");
  const r = copyData();
  ok(r.code === 1 && /not made by the publish workflow/.test(r.out) && fs.readFileSync(path.join(repo, "data/dashboard.json"), "utf8") === DS(2),
     "a file not written by the publish workflow is not copied"); }
{ publish(DS(4)); put(data, "v1/dashboard.json", DS(5));
  const r = copyData();
  ok(r.code === 1 && /uncommitted changes/.test(r.out), "a published file changed since is not copied");
  dgit("checkout", "-q", "--", "v1/dashboard.json"); }
{ publish(DS(6).replace('"schema_version":1', '"schema_version":2'));
  const r = copyData();
  ok(r.code === 1 && /schema_version 2/.test(r.out), "a file the pages cannot read (a new schema_version) is not copied alone");
  publish(DS(7)); }
{ put(repo, "fr/index.html", "<p>fr, by hand</p>\n"); git("add", "-A"); git("commit", "-q", "-m", "hand edit fr");
  const r = copyData();
  ok(r.code === 1 && /changed\s+fr\/index\.html/.test(r.out), "a hand edit in the test repo stops a data copy too");
  const r2 = copyData("--force");
  ok(r2.code === 0 && fs.readFileSync(path.join(repo, "data/dashboard.json"), "utf8") === DS(7), "--force copies the data, and leaves the edited page alone");
  git("add", "-A"); git("commit", "-q", "-m", "data 7"); }
{ const m = JSON.parse(fs.readFileSync(path.join(repo, MANIFEST), "utf8"));
  m.data_url = "https://codebyjackson.github.io/launch-data-test/v1/dashboard.json";
  fs.writeFileSync(path.join(repo, MANIFEST), JSON.stringify(m)); git("add", "-A"); git("commit", "-q", "-m", "old pages");
  publish(DS(8));
  const r = copyData();
  ok(r.code === 1 && /copy a full build there first/.test(r.out), "pages that still fetch the data repo's address get no data copy beside them"); }

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  copy-rbm-pages: ${passed} passed, ${failed} failed\n`);
process.exitCode = failed ? 1 : 0;
