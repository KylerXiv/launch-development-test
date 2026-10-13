#!/usr/bin/env node
// Decides whether a build of the RBM pages is a new release, and packages it.
// Run by .github/workflows/release-rbm-pages.yml after scripts/build-rbm-pages.js:
//
//   node scripts/rbm-release.js --previous-tag rbm-v3 --previous <its build-manifest.json> --out <dir>
//   node scripts/rbm-release.js --out <dir>          # no release yet: this one is rbm-v1
//
// A release is made only when a file the pages are built from changed what the
// build wrote: most commits (data, docs, sources) leave every page byte-identical,
// and those make none. The robot in launch-rbm-test
// (.github/workflows/launch-update.yml there) picks each release up.
//
// It writes into --out, for `gh release create`:
//   rbm-pages.tar.gz      en/ fr/ pt/ es/ assets/ and build-manifest.json
//   build-manifest.json   the same manifest, alone, so the next run can compare
//   copy-rbm-pages.js     the copy and its checks, run by the robot
//   rbm-manifest.js       what copy-rbm-pages.js needs (nothing else)
//   notes.md              what changed, for the release page
// and, when GITHUB_OUTPUT is set, release=true|false, tag=…, reason=… to it.
// Exit 0 whether or not there is a release; 1 only when something is broken.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { MANIFEST, BUILT, buildProblems, compare } = require("./rbm-manifest");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist", "rbm");
const PREFIX = "rbm-v";
// The files the RBM pages are built from, for the "commits" list in the notes.
const INPUTS = ["illustrated-journey-dashboard.html", "assets", "i18n", "data/world-map.js", "data/world-map-geo.js",
  "scripts/build-rbm-pages.js", "scripts/build-locale-pages.js", "scripts/rbm-skin.js", "scripts/rbm-manifest.js"];

// rbm-v3 → rbm-v4; nothing yet → rbm-v1.
function nextTag(previous) {
  if (!previous) return PREFIX + "1";
  const m = new RegExp("^" + PREFIX + "(\\d+)$").exec(previous);
  if (!m) throw new Error(`previous tag ${previous} is not ${PREFIX}<number>`);
  return PREFIX + (Number(m[1]) + 1);
}

// Release or not, and why. `built` is this build's manifest; `previous` the last
// release's (null when there is none).
function decide(built, previous, previousTag) {
  const problems = buildProblems(built);
  if (problems.length) return { release: false, reason: "this build is not one to release: " + problems.join("; ") };
  if (previous) {
    const d = compare(previous, built);
    if (d.same) return { release: false, reason: `the pages are the same as ${previousTag}`, diff: d };
    return { release: true, tag: nextTag(previousTag), diff: d };
  }
  return { release: true, tag: nextTag(null), diff: compare(null, built) };
}

// The release page's text.
function notes({ tag, built, previous, previousTag, diff, commits, repo }) {
  const short = String(built.built_from).slice(0, 7);
  const link = (sha) => repo ? `[\`${String(sha).slice(0, 7)}\`](https://github.com/${repo}/commit/${sha})` : `\`${String(sha).slice(0, 7)}\``;
  const out = [`The RBM pages (en, fr, pt, es), built from ${link(built.built_from)}.`, ""];
  if (previous) out.push(`Changes since ${previousTag}, built from ${link(previous.built_from)}:`, "");
  else out.push("First release: these are the pages as they are today.", "");
  if (commits && commits.length) {
    out.push("**Commits that touched the pages**", "", ...commits.map((c) => `- ${c}`), "");
  }
  const group = (list) => {
    const by = {};
    for (const rel of list) { const top = rel.split("/")[0]; (by[top] = by[top] || []).push(rel); }
    return BUILT.filter((t) => by[t]).map((t) => `- \`${t}/\`: ${by[t].length} file${by[t].length === 1 ? "" : "s"}`);
  };
  if (previous) {
    if (diff.changed.length) out.push("**Changed files**", "", ...group(diff.changed), "");
    if (diff.added.length) out.push("**New files**", "", ...group(diff.added), "");
    if (diff.removed.length) out.push("**Removed files**", "", ...group(diff.removed), "");
  } else {
    out.push(`${Object.keys(built.files).length} files.`, "");
  }
  out.push("Data is not part of a release: the pages read `dashboard.json` when they load.",
    `The robot in launch-rbm-test applies this release; \`${MANIFEST}\` lists every file's sha256 (built from ${short}).`);
  return out.join("\n") + "\n";
}

function main(argv) {
  const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const out = argOf("--out");
  if (!out) { console.error("usage: node scripts/rbm-release.js [--previous-tag rbm-vN --previous <manifest>] --out <dir>"); return 1; }
  const previousTag = argOf("--previous-tag") || "";
  const previousFile = argOf("--previous");
  const builtFile = path.join(DIST, MANIFEST);
  if (!fs.existsSync(builtFile)) { console.error(`No ${path.relative(ROOT, builtFile)}: run node scripts/build-rbm-pages.js first.`); return 1; }
  const built = JSON.parse(fs.readFileSync(builtFile, "utf8"));
  let previous = null;
  if (previousTag) {
    if (!previousFile || !fs.existsSync(previousFile)) { console.error(`${previousTag} has no ${MANIFEST} to compare with.`); return 1; }
    previous = JSON.parse(fs.readFileSync(previousFile, "utf8"));
  }

  const d = decide(built, previous, previousTag);
  const setOutput = (o) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(o).map(([k, v]) => `${k}=${v}`).join("\n") + "\n"); };
  if (!d.release) {
    console.log(`  No release: ${d.reason}.`);
    setOutput({ release: "false", reason: d.reason.replace(/\n/g, " ") });
    return 0;
  }

  // the commits since the last release that touched what the pages are built from
  let commits = [];
  if (previous && previous.built_from) {
    try {
      commits = execFileSync("git", ["log", "--no-merges", "--format=%s (%h)", `${previous.built_from}..${built.built_from}`, "--", ...INPUTS],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n").filter(Boolean).slice(0, 40);
    } catch { commits = []; }
  }

  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  // run from --out with a relative archive name: GNU tar reads "C:..." as a remote host
  execFileSync("tar", ["-czf", "rbm-pages.tar.gz", "-C", DIST, ...BUILT.filter((b) => fs.existsSync(path.join(DIST, b))), MANIFEST], { cwd: out });
  fs.copyFileSync(builtFile, path.join(out, MANIFEST));
  for (const f of ["copy-rbm-pages.js", "rbm-manifest.js"]) fs.copyFileSync(path.join(__dirname, f), path.join(out, f));
  fs.writeFileSync(path.join(out, "notes.md"), notes({ tag: d.tag, built, previous, previousTag, diff: d.diff, commits, repo: process.env.GITHUB_REPOSITORY }), "utf8");
  console.log(`  Release ${d.tag}: ${d.diff.changed.length} changed, ${d.diff.added.length} new, ${d.diff.removed.length} removed → ${out}`);
  setOutput({ release: "true", tag: d.tag });
  return 0;
}

module.exports = { nextTag, decide, notes, main };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
