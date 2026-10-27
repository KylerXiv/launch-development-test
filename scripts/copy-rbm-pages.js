#!/usr/bin/env node
// Copies the RBM pages that scripts/build-rbm-pages.js built into a checkout of
// the RBM test repository (codebyjackson/launch-rbm-test), and refuses when the
// copy would wipe work done there by hand.
//
//   node scripts/build-rbm-pages.js
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --first-copy   # it has no build-manifest.json yet
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --force        # replace hand edits, once they are in this repo
//   node scripts/copy-rbm-pages.js --from <build folder> --to <checkout>  # a build kept elsewhere than dist/rbm
//
// After each publish to the data repo (Publish now, or the end of an approval),
// only the data changes. Pull the data repo checkout next to this one, then:
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --data-only
//   node scripts/copy-rbm-pages.js --to ../launch-rbm-test --data-only --dataset <file>   # not ../launch-data-test/v1/dashboard.json
// It replaces data/dashboard.json and its line in the manifest, nothing else.
// That file is also the one to send RBM: they replace theirs with it.
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
//     uncommitted files, before the translate bot caught up (new text would
//     go out in English), or without the latest published dashboard.json.
//     Rebuild; there is no switch for these.
//   - with --data-only: the file is not the latest published one (its last
//     commit is not the publish workflow's, it was changed by hand, or the
//     data repo checkout is behind GitHub), or it is a schema_version the
//     pages there do not read.
//
// It replaces the built folders (en/ fr/ pt/ assets/ data/) and the manifest,
// and nothing else: README.md, index.html, iframe-test.html, rbm-shell/ and
// .nojekyll belong to the test repository. It does not commit; it prints the
// commands to.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { BUILT, MANIFEST, DATA_FILE, SCHEMA, DEFAULT_DATASET, fingerprint, publishedDataset, buildProblems, drift } = require("./rbm-manifest");

const ROOT = path.resolve(__dirname, "..");

function main(argv) {
  const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const to = argOf("--to");
  const from = path.resolve(argOf("--from") || path.join(ROOT, "dist", "rbm"));
  const first = argv.includes("--first-copy"), force = argv.includes("--force");
  const dataOnly = argv.includes("--data-only");
  const stop = (lines) => { console.error("\n  Nothing copied.\n" + lines.map((l) => "  " + l).join("\n") + "\n"); return 1; };
  if (!to) return stop(["usage: node scripts/copy-rbm-pages.js --to <checkout of launch-rbm-test> [--first-copy] [--force] [--data-only [--dataset <file>]]"]);
  const target = path.resolve(to);
  const git = (...a) => execFileSync("git", ["-C", target, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (dataOnly) return copyData(argOf("--dataset") || DEFAULT_DATASET, target, to, { force, stop, git });

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
        "Move those changes into launch-development-test (the page is index.html),",
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

  // copy: the built folders are replaced whole, so a file the build no longer
  // writes goes too. So does every file the last copy wrote outside them: a
  // folder the build no longer has (es/, when Spanish was removed on 27 Oct 2026).
  if (fs.existsSync(lastManifest)) {
    const gone = Object.keys(JSON.parse(fs.readFileSync(lastManifest, "utf8")).files || {})
      .filter((rel) => !BUILT.includes(rel.split("/")[0]));
    for (const rel of gone) fs.rmSync(path.join(target, rel), { force: true });
    for (const top of new Set(gone.map((rel) => rel.split("/")[0]))) {
      const left = (d) => fs.existsSync(d) && fs.readdirSync(d, { withFileTypes: true }).some((e) => !e.isDirectory() || left(path.join(d, e.name)));
      if (!left(path.join(target, top))) fs.rmSync(path.join(target, top), { recursive: true, force: true });
    }
  }
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

// --data-only: the latest published dashboard.json into the target's data/,
// with the same checks against hand edits there as a full copy.
function copyData(file, target, to, { force, stop, git }) {
  const pub = publishedDataset(path.resolve(file));
  if (!pub.ds || pub.problems.length) return stop([`${file} is not the latest published dashboard.json:`, ...pub.problems.map((x) => "- " + x)]);
  if (!fs.existsSync(path.join(target, ".git"))) return stop([`${target} is not a git checkout.`]);
  const dirty = git("status", "--porcelain");
  if (dirty) return stop([`${target} has uncommitted changes; commit or stash them first:`, ...dirty.split("\n").slice(0, 10)]);
  const lastManifest = path.join(target, MANIFEST);
  if (!fs.existsSync(lastManifest)) return stop([`${path.basename(target)} has no ${MANIFEST}: copy a full build there first (without --data-only).`]);
  const m = JSON.parse(fs.readFileSync(lastManifest, "utf8"));
  // the pages there were built before data/ existed: they still fetch the data
  // repo's address, so a file beside them would never be read
  if (m.data_url !== "../" + DATA_FILE) return stop([`The pages in ${path.basename(target)} read ${m.data_url}, not ../${DATA_FILE}: copy a full build there first (without --data-only).`]);
  const pagesRead = m.schema || SCHEMA;
  if (pub.ds.schema_version !== pagesRead) return stop([`${file} is schema_version ${pub.ds.schema_version}; the pages in ${path.basename(target)} read ${pagesRead}. Copy new pages with it (a full build), not the data alone.`]);
  const d = drift(target, m);
  const n = d.changed.length + d.missing.length + d.added.length;
  if (n && !force) {
    return stop([
      `${n} file(s) in ${path.basename(target)} were changed there after the last copy:`,
      ...d.changed.map((r) => `  changed  ${r}`), ...d.missing.map((r) => `  deleted  ${r}`), ...d.added.map((r) => `  added    ${r}`),
      "Move those changes into launch-development-test and copy a full build, or run this again with --force.",
    ]);
  }
  fs.mkdirSync(path.dirname(path.join(target, DATA_FILE)), { recursive: true });
  fs.copyFileSync(path.resolve(file), path.join(target, DATA_FILE));
  m.files[DATA_FILE] = fingerprint(path.join(target, DATA_FILE));
  m.files = Object.fromEntries(Object.keys(m.files).sort().map((k) => [k, m.files[k]]));
  m.dataset = pub.info;
  m.dataset_problems = [];
  fs.writeFileSync(lastManifest, JSON.stringify(m, null, 2) + "\n", "utf8");
  const changedNow = git("status", "--porcelain");
  const stamp = String(pub.info.generated_at || "").slice(0, 10);
  const short = String(pub.info.data_repo_commit).slice(0, 7);
  console.log(`\n  Copied the dashboard.json published ${pub.info.generated_at} (launch-data-test ${short}) into ${path.join(target, DATA_FILE)}`);
  console.log(changedNow ? `  Commit it on a branch:\n` +
    `    git -C ${to} checkout -b data/${stamp}-${short}\n` +
    `    git -C ${to} add -A\n` +
    `    git -C ${to} commit -m "Data published ${stamp}, from launch-data-test ${short}"\n` +
    `  This is also the file to send RBM.\n`
    : "  Nothing changed: the target already has this data.\n");
  return 0;
}

module.exports = { buildProblems, drift, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
