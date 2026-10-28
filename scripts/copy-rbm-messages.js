#!/usr/bin/env node
// Copies the interface-text files that scripts/build-rbm-messages.js built
// (dist/rbm-messages/{en,fr,pt}.json) into the messages/ folder of a checkout
// of the RBM test repository's React port (launch-rbm-test), and refuses when
// the copy would wipe work done there by hand.
//
//   node scripts/build-rbm-messages.js --allow-stale     # while strings are untranslated
//   node scripts/copy-rbm-messages.js                    # into ../launch-rbm-test/messages/
//   node scripts/copy-rbm-messages.js --check            # what would change; writes nothing
//   node scripts/copy-rbm-messages.js --force            # replace hand edits, once they are in this repo
//   node scripts/copy-rbm-messages.js --to <checkout>    # a checkout elsewhere than ../launch-rbm-test
//   node scripts/copy-rbm-messages.js --from <folder>    # a build kept elsewhere than dist/rbm-messages
//
// WHY. The files in launch-rbm-test/messages/ are generated here. A wording
// change made there by hand would be replaced by the next copy without a word
// (that happened to the RBM pages on 8 Oct 2026: docs/jackson/rbm-keith-port.md).
// Each copy now leaves messages/manifest.json beside the files: the sha256 of
// each file it wrote, the commit they were built from, and the strings that are
// still English in French or Portuguese. The next copy compares the files with
// it, so it can tell an edit there from its own last copy.
//
// It stops, and writes nothing, when:
//   - dist/rbm-messages/ lacks one of the files, one is not JSON, or the three
//     do not have the same keys (a language would show a raw key);
//   - those files are not what the current sources build (i18n/ui.en.json,
//     ui.page-forms.json or translations.json changed since, or a file was
//     edited in dist/). The manifest could not say truthfully what they hold.
//     Rebuild; there is no switch for this;
//   - the target is not the React port of launch-rbm-test: its package.json
//     is not named "launch-dashboard-rbm" (the static-pages branch has none);
//   - a file in the target's messages/ differs from what the last copy wrote
//     there, or was deleted: someone edited it by hand. Move the change into
//     i18n/ui.en.json (or translations.json) here, rebuild, check the build
//     has it, then copy with --force;
//   - the target has no manifest.json yet (its files were copied by hand) and
//     a file there differs from the one this copy would write. With no record
//     of the last copy, an identical file is the only proof nothing is lost.
//     Identical files (line endings aside) are adopted without --force.
// --force overrides those last two only, and lists what it replaces.
// --check runs every check, says what a copy would change, and writes
// nothing. It exits 1 where the copy would stop.
//
// It writes en.json, fr.json, pt.json and manifest.json in messages/, removes
// a language file the last copy wrote that the build no longer has, and leaves
// everything else alone (messages/README.md belongs to the test repository).
// It does not commit; it prints the commands to.
//
// Requires Node 18+. No dependencies.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { build, load, serialise, OUT } = require("./build-rbm-messages");
const { LOCALES, fingerprint } = require("./rbm-manifest");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_TARGET = path.join(ROOT, "..", "launch-rbm-test");
const DIR = "messages";
const MANIFEST = "manifest.json";
// The marker of a checkout of the React port: its package.json's name.
const PACKAGE = "launch-dashboard-rbm";
// The files that decide what the build writes. An uncommitted change to one
// means the commit named in the manifest does not build these files.
const INPUTS = ["i18n/ui.en.json", "i18n/ui.page-forms.json", "i18n/translations.json",
  "scripts/build-rbm-messages.js", "scripts/i18n-hash.js", "scripts/rbm-manifest.js"];
const NOTE = "Written by scripts/copy-rbm-messages.js in launch-development-test with en.json, fr.json and pt.json. " +
  "The next copy compares those files with \"files\" to tell a hand edit from its own last copy. Do not edit.";

const show = (p) => { const r = path.relative(ROOT, p); return r && !r.startsWith("..") && !path.isAbsolute(r) ? r.split(path.sep).join("/") : p; };
// every key path of a nested message file
const pathsOf = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? pathsOf(v, pre + k + ".") : [pre + k]));

// The commit this repository is at, and which build inputs have uncommitted
// changes. No git (a tarball): no commit. --no-optional-locks: status only
// reads, and never rewrites the index of a checkout someone is working in.
function sourceInfo() {
  const git = (...a) => { try { return execFileSync("git", ["-C", ROOT, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return null; } };
  const commit = git("rev-parse", "HEAD");
  const dirty = git("--no-optional-locks", "status", "--porcelain", "--", ...INPUTS);
  const uncommitted = dirty ? dirty.split("\n").map((l) => l.slice(3)) : [];
  return { commit, clean: Boolean(commit) && !uncommitted.length, uncommitted };
}

// Returns the exit code. The tests pass their own build inputs and source.
function main(argv = [], { inputs, source } = {}) {
  const KNOWN = ["--to", "--from", "--check", "--force"];
  const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const stop = (lines) => { console.error("\n  Nothing copied.\n" + lines.map((l) => "  " + l).join("\n") + "\n"); return 1; };
  const usage = "usage: node scripts/copy-rbm-messages.js [--to <checkout of launch-rbm-test>] [--from <build folder>] [--check] [--force]";
  // a mistyped --check must not turn into a real copy
  const unknown = argv.filter((a, i) => !KNOWN.includes(a) && !["--to", "--from"].includes(argv[i - 1]));
  if (unknown.length) return stop([`unknown argument(s): ${unknown.join(" ")}`, usage]);
  for (const n of ["--to", "--from"]) if (argv.includes(n) && (!argOf(n) || argOf(n).startsWith("--"))) return stop([`${n} needs a folder`, usage]);
  const check = argv.includes("--check"), force = argv.includes("--force");
  const from = path.resolve(argOf("--from") || OUT);
  const to = argOf("--to") || DEFAULT_TARGET;
  const target = path.resolve(to);
  const dir = path.join(target, DIR);
  const names = LOCALES.map((l) => `${l}.json`);

  // --- the build -----------------------------------------------------------
  const absent = names.filter((n) => !fs.existsSync(path.join(from, n)));
  if (absent.length) return stop([`${show(from)}/ has no ${absent.join(", ")}: run node scripts/build-rbm-messages.js first`, "(with --allow-stale while some strings have no translation)."]);
  const text = {}, keys = {};
  for (const n of names) {
    text[n] = fs.readFileSync(path.join(from, n), "utf8");
    try { keys[n] = pathsOf(JSON.parse(text[n])); } catch (e) { return stop([`${show(from)}/${n} is not JSON (${e.message}): rebuild.`]); }
  }
  const en = new Set(keys["en.json"]);
  const gaps = names.slice(1).flatMap((n) => {
    const has = new Set(keys[n]);
    const lacks = [...en].filter((k) => !has.has(k)), extra = keys[n].filter((k) => !en.has(k));
    return [...(lacks.length ? [`  ${n} lacks ${lacks.length}: ${lacks.slice(0, 5).join(", ")}${lacks.length > 5 ? ", …" : ""}`] : []),
      ...(extra.length ? [`  ${n} has ${extra.length} not in en.json: ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? ", …" : ""}`] : [])];
  });
  if (gaps.length) return stop([`The files in ${show(from)}/ do not have the same keys, so a language would show a raw key:`, ...gaps, "Rebuild: node scripts/build-rbm-messages.js."]);
  const r = build(inputs || load());
  if (r.errors.length) return stop(["i18n/ui.en.json / ui.page-forms.json are not consistent, so the files cannot be checked against them:", ...r.errors.slice(0, 10).map((e) => "  " + e)]);
  const stale = LOCALES.filter((l) => text[`${l}.json`] !== serialise(r.messages[l])).map((l) => `${l}.json`);
  if (stale.length) {
    return stop([`${show(from)}/${stale.join(", ")} ${stale.length > 1 ? "are" : "is"} not what the current sources build (i18n/ changed since the build,`,
      `or the file was edited in ${show(from)}/). Rebuild with node scripts/build-rbm-messages.js, then copy.`]);
  }
  const src = source || sourceInfo();

  // --- the target ----------------------------------------------------------
  const pkgFile = path.join(target, "package.json");
  let pkg = null;
  try { pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")).name; } catch { /* no file, or not JSON */ }
  if (pkg !== PACKAGE) {
    return stop([`${target} is not a checkout of launch-rbm-test's React port: ${fs.existsSync(pkgFile) ? `its package.json is named ${JSON.stringify(pkg)}` : "it has no package.json"},`,
      `not "${PACKAGE}". Pass --to <checkout>, on the branch with the React port.`]);
  }
  const manifestFile = path.join(dir, MANIFEST);
  let last = null, lastBroken = false;
  if (fs.existsSync(manifestFile)) {
    // its file names become paths this copy may remove: a plain "xx.json" only,
    // never "../package.json"
    try {
      last = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
      if (!last || typeof last.files !== "object" || !last.files) throw new Error("no files");
      if (Object.keys(last.files).some((n) => !/^[A-Za-z0-9_-]+\.json$/.test(n) || n === MANIFEST)) throw new Error("not a file name");
    } catch { last = null; lastBroken = true; }
  }
  const lastFiles = (last && last.files) || {};
  const sha = (n) => (fs.existsSync(path.join(dir, n)) ? fingerprint(path.join(dir, n)) : null);
  const want = Object.fromEntries(names.map((n) => [n, fingerprint(path.join(from, n))]));
  const now = Object.fromEntries([...new Set([...names, ...Object.keys(lastFiles)])].map((n) => [n, sha(n)]));
  // a language file the last copy wrote that this build no longer has (es.json, if
  // a language is dropped again): removed, unless it was edited since
  const gone = Object.keys(lastFiles).filter((n) => !names.includes(n) && now[n] !== null);

  // what was changed there by hand, as [file, how]
  const edited = [];
  if (last) {
    for (const [n, was] of Object.entries(lastFiles)) {
      // (a dropped language's file already deleted is what this copy would do)
      if (now[n] === null) { if (names.includes(n)) edited.push([n, "deleted"]); }
      else if (now[n] !== was) edited.push([n, "changed"]);
    }
    for (const n of names) if (!(n in lastFiles) && now[n] !== null && now[n] !== want[n]) edited.push([n, "added since the last copy, and differs from this build"]);
  } else {
    if (lastBroken) edited.push([MANIFEST, "not a manifest this script wrote (edited by hand?)"]);
    for (const n of names) if (now[n] !== null && now[n] !== want[n]) edited.push([n, "differs from this build, and there is no manifest to tell a hand edit from an older copy"]);
  }
  const gitT = (...a) => { try { return execFileSync("git", ["-C", target, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { return ""; } };
  const who = (n) => {
    const rel = `${DIR}/${n}`;
    if (gitT("--no-optional-locks", "status", "--porcelain", "--", rel)) return "uncommitted";
    return gitT("log", "-1", "--format=%h %an, %ad: %s", "--date=short", "--", rel) || "not in git";
  };
  const editLines = edited.map(([n, how]) => `  ${DIR}/${n}: ${how}${how === "changed" ? `   (${who(n)})` : ""}`);
  if (edited.length && !force) {
    return stop([
      last ? `${edited.length} file(s) in ${path.basename(target)}/${DIR}/ were changed there after the last copy. This copy would replace them:`
        : `${path.basename(target)}/${DIR}/ has ${lastBroken ? "an unreadable" : "no"} ${MANIFEST}, so its files were copied by hand, and this copy would replace:`,
      ...editLines,
      "Move any change you want to keep into i18n/ui.en.json (or i18n/translations.json) in launch-development-test,",
      "rebuild, check the new build has it, then run this again with --force.",
    ]);
  }

  // --- the manifest this copy leaves -----------------------------------------
  const untranslated = Object.fromEntries(LOCALES.slice(1).map((l) => [l, r.missing[l].map((m) => m.key)]));
  const manifest = {
    _note: NOTE,
    built_from: src.commit || null,
    clean: Boolean(src.clean),
    ...(src.clean ? {} : { uncommitted: src.uncommitted || [] }),
    // the files carry English for a missing translation, which the build
    // writes only with --allow-stale
    allow_stale: Object.values(untranslated).some((k) => k.length),
    untranslated,
    files: want,
  };
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  const oldManifestText = fs.existsSync(manifestFile) ? fs.readFileSync(manifestFile, "utf8").replace(/\r\n/g, "\n") : null;

  // --- what changes ----------------------------------------------------------
  const plan = names.map((n) => [n, now[n] === null ? "new" : now[n] === want[n] ? "unchanged" : edited.some(([e]) => e === n) ? "replaced (hand edit, --force)" : "replaced"]);
  gone.forEach((n) => plan.push([n, `removed (the build no longer has it)${edited.some(([e]) => e === n) ? ", hand edit, --force" : ""}`]));
  const fields = last ? ["built_from", "clean", "uncommitted", "allow_stale", "untranslated", "files"].filter((k) => JSON.stringify(last[k]) !== JSON.stringify(manifest[k])) : [];
  plan.push([MANIFEST, oldManifestText === null ? "new" : oldManifestText === manifestText ? "unchanged" : last ? `updated (${fields.join(", ") || "layout"})` : "replaced (unreadable, --force)"]);
  const changes = plan.filter(([, how]) => how !== "unchanged");
  const short = String(src.commit || "no commit").slice(0, 7);
  const stillEnglish = LOCALES.slice(1).map((l) => `${l} ${untranslated[l].length}`).join(", ");

  if (edited.length) {
    console.error(`\n  --force: ${check ? "would replace" : "replacing"} ${edited.length} file(s) changed by hand in ${path.basename(target)}/${DIR}/:`);
    editLines.forEach((l) => console.error("  " + l));
    console.error("  Those changes are lost unless they are already in i18n/ in launch-development-test.");
  }
  if (!src.clean) {
    console.error(`\n  WARNING: ${src.commit ? `built from uncommitted changes to ${(src.uncommitted || []).join(", ")}` : "no git commit found"}.`);
    console.error(`  The manifest records clean: false, so ${short} does not name a commit that builds these files.`);
  }
  console.log(`\n  ${show(from)}/ → ${dir}/ (built from launch-development-test ${short}; still English: ${stillEnglish})`);
  plan.forEach(([n, how]) => console.log(`    ${n.padEnd(14)} ${how}`));

  if (check) { console.log(`  --check: nothing written.${changes.length ? "" : " A copy would change nothing."}\n`); return 0; }
  if (!changes.length) { console.log("  Nothing changed: the target already has this build.\n"); return 0; }

  fs.mkdirSync(dir, { recursive: true });
  for (const n of names) if (now[n] !== want[n]) fs.writeFileSync(path.join(dir, n), text[n], "utf8");
  for (const n of gone) fs.rmSync(path.join(dir, n), { force: true });
  if (oldManifestText !== manifestText) fs.writeFileSync(manifestFile, manifestText, "utf8");
  console.log(`  Commit them in ${path.basename(target)}, on the React port's branch:\n` +
    `    git -C ${to} add ${DIR}\n` +
    `    git -C ${to} commit -m "Interface text from launch-development-test ${short}"\n`);
  return 0;
}

module.exports = { main, sourceInfo, DEFAULT_TARGET, MANIFEST, PACKAGE };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
