#!/usr/bin/env node
// Copies the RBM pages that scripts/build-rbm-pages.js built into a checkout of
// the RBM test repository (codebyjackson/launch-rbm-test), and refuses when the
// copy would wipe work done there by hand.
//
//   node scripts/build-rbm-pages.js
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --first-copy   # it has no build-manifest.json yet
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --force        # replace hand edits, once they are in this repo
//
// WHY. The pages in launch-rbm-test are built from this repository. On 8 Oct
// 2026, 12 commits were made to them there, by hand, and the next rebuild would
// have replaced them without a word (docs/jackson/rbm-keith-port.md). Each build
// now writes dist/rbm/build-manifest.json, the sha256 of every file it wrote. A
// copy leaves that file in the target, so the next copy can tell whether
// anything there was changed since.
//
// It stops, and changes nothing, when:
//   - a file in the target's built folders differs from the last manifest, is
//     missing, or is not in it: someone edited the pages there. Move the change
//     into this repository, rebuild, then copy with --force.
//   - the target has no build-manifest.json (its pages were copied by hand,
//     before this script). Check them the same way, then copy with --first-copy.
//   - the target has uncommitted changes.
//   - the build is not one to publish: built with --data-url or --api-url, from
//     uncommitted files, or before the translate bot caught up (new text would
//     go out in English). Rebuild; there is no switch for these.
//
// It replaces the built folders (en/ fr/ pt/ es/ assets/) and the manifest, and
// nothing else: README.md, index.html, iframe-test.html, rbm-shell/ and
// .nojekyll belong to the test repository. It does not commit; it prints the
// commands to.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { manifestOf, BUILT, MANIFEST } = require("./build-rbm-pages");

const ROOT = path.resolve(__dirname, "..");

// What is wrong with the build itself, as sentences (none: publishable).
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

function main(argv) {
  const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const to = argOf("--to");
  const from = path.resolve(argOf("--from") || path.join(ROOT, "dist", "rbm"));
  const first = argv.includes("--first-copy"), force = argv.includes("--force");
  const stop = (lines) => { console.error("\n  Nothing copied.\n" + lines.map((l) => "  " + l).join("\n") + "\n"); return 1; };
  if (!to) return stop(["usage: node scripts/copy-rbm-pages.js --to <checkout of launch-rbm-test> [--first-copy] [--force]"]);
  const target = path.resolve(to);
  const git = (...a) => execFileSync("git", ["-C", target, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

  // the build
  const builtManifest = path.join(from, MANIFEST);
  if (!fs.existsSync(builtManifest)) return stop([`No ${path.relative(ROOT, builtManifest) || builtManifest}: run node scripts/build-rbm-pages.js first.`]);
  const built = JSON.parse(fs.readFileSync(builtManifest, "utf8"));
  const bp = buildProblems(built);
  if (bp.length) return stop(["This build is not one to copy:", ...bp.map((x) => "- " + x)]);
  // the build's files are still the ones its manifest lists (nobody edited dist/)
  const d0 = drift(from, built);
  if (d0.changed.length || d0.missing.length || d0.added.length) return stop(["dist/rbm no longer matches its own manifest: rebuild."]);

  // the target
  if (!fs.existsSync(path.join(target, ".git"))) return stop([`${target} is not a git checkout.`]);
  const dirty = git("status", "--porcelain");
  if (dirty) return stop([`${target} has uncommitted changes; commit or stash them first:`, ...dirty.split("\n").slice(0, 10)]);
  const lastManifest = path.join(target, MANIFEST);
  if (fs.existsSync(lastManifest)) {
    const d = drift(target, JSON.parse(fs.readFileSync(lastManifest, "utf8")));
    const n = d.changed.length + d.missing.length + d.added.length;
    if (n && !force) {
      const who = (rel) => { try { return git("log", "-1", "--format=%h %an, %ad: %s", "--date=short", "--", rel); } catch { return ""; } };
      return stop([
        `${n} file(s) in ${path.basename(target)} were changed there after the last copy. This copy would replace them:`,
        ...d.changed.map((r) => `  changed  ${r}   (${who(r)})`),
        ...d.missing.map((r) => `  deleted  ${r}`),
        ...d.added.map((r) => `  added    ${r}   (${who(r)})`),
        "Move those changes into launch-development-test (the page is illustrated-journey-dashboard.html),",
        "rebuild, check the new build has them, then run this again with --force.",
      ]);
    }
  } else if (!first) {
    return stop([
      `${path.basename(target)} has no ${MANIFEST}, so its pages were copied by hand and this script cannot tell`,
      "whether they were edited there since. Compare them with a build of the commit their last copy names,",
      "move any changes into launch-development-test, then run this again with --first-copy.",
    ]);
  }

  // copy: the built folders are replaced whole, so a file the build no longer writes goes too
  for (const dir of BUILT) {
    fs.rmSync(path.join(target, dir), { recursive: true, force: true });
    if (fs.existsSync(path.join(from, dir))) fs.cpSync(path.join(from, dir), path.join(target, dir), { recursive: true });
  }
  fs.copyFileSync(builtManifest, lastManifest);
  const changedNow = git("status", "--porcelain");
  const short = String(built.built_from).slice(0, 7);
  console.log(`\n  Copied the build of launch-development-test ${short} into ${target}`);
  console.log(changedNow ? `  ${changedNow.split("\n").length} path(s) changed. Commit them on a branch:\n` +
    `    git -C ${to} checkout -b update/main-${short}\n` +
    `    git -C ${to} add -A\n` +
    `    git -C ${to} commit -m "<what changed>, from launch-development-test ${short}"\n`
    : "  Nothing changed: the target already has this build.\n");
  return 0;
}

module.exports = { buildProblems, drift, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
