#!/usr/bin/env node
// Tests for scripts/copy-rbm-messages.js — the copy of the interface-text files
// into launch-rbm-test's messages/, and the checks that stop it from wiping
// hand edits there.
//   node scripts/test-copy-rbm-messages.js
// Works in a temporary folder: a small build made by build-rbm-messages.js
// from made-up inputs, and throwaway git repositories. Needs git; no network.
// Writes nothing in the repository.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { key } = require("./i18n-hash");
const { main: buildMain, NAMESPACE } = require("./build-rbm-messages");
const { main, MANIFEST, PACKAGE } = require("./copy-rbm-messages");

let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "copy-rbm-messages-"));
const put = (dir, rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
const read = (f) => fs.readFileSync(f, "utf8");
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const quiet = (fn) => { const e = console.error, l = console.log; let out = ""; console.error = console.log = (s) => { out += s + "\n"; }; try { return { code: fn(), out }; } finally { console.error = e; console.log = l; } };
// every file under dir with its content: proves a refusal or --check wrote nothing
const snapshot = (dir) => {
  const out = {};
  const walk = (rel) => { for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) { const r = path.join(rel, e.name); if (e.name === ".git") continue; if (e.isDirectory()) walk(r); else out[r] = read(path.join(dir, r)); } };
  walk("");
  return JSON.stringify(out);
};

// made-up sources: "Packs" has no translation, as in the real repository today
const mem = (...rows) => Object.fromEntries(rows.map(([en, fr, pt]) => [key(en), { en, fr, pt }]));
const STALE = { ui: { a: { b: "Close", c: "Packs" } }, forms: { forms: {} }, memory: mem(["Close", "Fermer", "Fechar"]) };
const FULL = { ...STALE, memory: mem(["Close", "Fermer", "Fechar"], ["Packs", "Paquets", "Embalagens"]) };
const SRC = { commit: "a".repeat(40), clean: true, uncommitted: [] };
const dist = path.join(tmp, "dist");
const makeBuild = (inputs, args = ["--allow-stale"]) => { fs.rmSync(dist, { recursive: true, force: true }); return quiet(() => buildMain(args, inputs, dist)).code; };

// a checkout of the React port: its package.json, messages/README.md, git
const repo = path.join(tmp, "rbm-test");
const git = (...a) => execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "core.autocrlf=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const commit = (msg) => { git("add", "-A"); git("commit", "-q", "--allow-empty", "-m", msg); };
fs.mkdirSync(repo);
git("init", "-q");
put(repo, "package.json", JSON.stringify({ name: PACKAGE }) + "\n");
put(repo, "messages/README.md", "the test repo's own readme\n");
commit("react port");
const M = path.join(repo, "messages");
const copy = (args = [], inputs = STALE, source = SRC, to = repo) => quiet(() => main(["--from", dist, "--to", to, ...args], { inputs, source }));
const manifest = () => JSON.parse(read(path.join(M, MANIFEST)));

ok(makeBuild(STALE) === 0, "setup: the build writes the three files with --allow-stale");

// ---------------------------------------------------------------------------
// the target must be the React port
// ---------------------------------------------------------------------------
{ const other = path.join(tmp, "other"); put(other, "README.md", "x\n");
  const r = copy([], STALE, SRC, other);
  ok(r.code === 1 && /has no package\.json/.test(r.out) && !fs.existsSync(path.join(other, "messages")), "a folder with no package.json is not the target: refused, nothing written");
  put(other, "package.json", JSON.stringify({ name: "launch-development" }));
  const r2 = copy(["--force"], STALE, SRC, other);
  ok(r2.code === 1 && /named "launch-development"/.test(r2.out) && !fs.existsSync(path.join(other, "messages")), "a package.json with another name is refused, even with --force"); }

// ---------------------------------------------------------------------------
// the build must be complete, consistent and current
// ---------------------------------------------------------------------------
{ const before = snapshot(repo);
  fs.rmSync(path.join(dist, "pt.json"));
  const r = copy(["--force"]);
  ok(r.code === 1 && /has no pt\.json/.test(r.out) && snapshot(repo) === before, "a missing dist file is refused, naming it, even with --force");
  makeBuild(STALE);
  const fr = JSON.parse(read(path.join(dist, "fr.json"))); delete fr[NAMESPACE].a.c; fr[NAMESPACE].a.d = "x";
  fs.writeFileSync(path.join(dist, "fr.json"), JSON.stringify(fr, null, 2) + "\n");
  const r2 = copy(["--force"]);
  ok(r2.code === 1 && /do not have the same keys/.test(r2.out) && /fr\.json lacks 1: launchDashboard\.a\.c/.test(r2.out) && /fr\.json has 1 not in en\.json: launchDashboard\.a\.d/.test(r2.out) && snapshot(repo) === before,
     "dist files with different key sets are refused, naming the keys, even with --force");
  makeBuild(STALE);
  fs.writeFileSync(path.join(dist, "fr.json"), read(path.join(dist, "fr.json")).replace("Fermer", "Fermer!"));
  const r3 = copy(["--force"]);
  ok(r3.code === 1 && /fr\.json is not what the current sources build/.test(r3.out) && snapshot(repo) === before,
     "a dist file that is not what the sources build (edited, or the sources moved on) is refused: the manifest could not describe it");
  fs.writeFileSync(path.join(dist, "en.json"), "{ not json");
  const r4 = copy();
  ok(r4.code === 1 && /en\.json is not JSON/.test(r4.out), "a dist file that is not JSON is refused");
  makeBuild(STALE);
  const r5 = quiet(() => main(["--from", dist, "--to", repo, "--chek"], { inputs: STALE, source: SRC }));
  ok(r5.code === 1 && /unknown argument/.test(r5.out) && snapshot(repo) === before, "a mistyped flag (--chek) is refused, not run as a copy"); }

// ---------------------------------------------------------------------------
// first copy, into a messages/ with only its README
// ---------------------------------------------------------------------------
{ const before = snapshot(repo);
  const c = copy(["--check"]);
  ok(c.code === 0 && /en\.json\s+new/.test(c.out) && /manifest\.json\s+new/.test(c.out) && snapshot(repo) === before, "--check lists what a first copy would write, and writes nothing");
  const r = copy();
  ok(r.code === 0 && ["en", "fr", "pt"].every((l) => read(path.join(M, `${l}.json`)) === read(path.join(dist, `${l}.json`))), "a first copy writes the three files as built");
  const m = manifest();
  ok(["en", "fr", "pt"].every((l) => m.files[`${l}.json`] === sha(path.join(M, `${l}.json`))) && Object.keys(m.files).join() === "en.json,fr.json,pt.json",
     "…and manifest.json records the sha256 of each file it wrote");
  ok(m.built_from === SRC.commit && m.clean === true && !("uncommitted" in m), "…the commit the files were built from");
  ok(m.allow_stale === true && m.untranslated.fr.join() === "a.c" && m.untranslated.pt.join() === "a.c" && !("en" in m.untranslated),
     "…and that the build shipped English (--allow-stale), with the keys");
  ok(read(path.join(M, "README.md")) === "the test repo's own readme\n", "…and keeps messages/README.md");
  ok(/git -C .* add messages/.test(r.out), "…and prints the commands to commit");
  commit("copy 1"); }

// ---------------------------------------------------------------------------
// the same build again
// ---------------------------------------------------------------------------
{ const before = snapshot(repo), mtime = fs.statSync(path.join(M, "fr.json")).mtimeMs;
  const r = copy();
  ok(r.code === 0 && /Nothing changed/.test(r.out) && snapshot(repo) === before && fs.statSync(path.join(M, "fr.json")).mtimeMs === mtime,
     "an unchanged re-copy changes nothing, manifest included, and rewrites no file");
  // the same page checked out with CRLF (git on Windows) is not a hand edit
  const fr = path.join(M, "fr.json"), lf = read(fr);
  fs.writeFileSync(fr, lf.replace(/\n/g, "\r\n"));
  const r2 = copy();
  ok(r2.code === 0 && /Nothing changed/.test(r2.out), "a file checked out with CRLF line endings is not taken for a hand edit");
  fs.writeFileSync(fr, lf); }

// ---------------------------------------------------------------------------
// a new build: --check, then the copy
// ---------------------------------------------------------------------------
{ makeBuild(FULL, []);
  const before = snapshot(repo);
  const c = copy(["--check"], FULL);
  ok(c.code === 0 && /fr\.json\s+replaced/.test(c.out) && /en\.json\s+unchanged/.test(c.out) && /manifest\.json\s+updated \(allow_stale, untranslated, files\)/.test(c.out) && snapshot(repo) === before,
     "--check names the files and manifest fields a new build would change, and writes nothing");
  const r = copy([], FULL);
  const m = manifest();
  ok(r.code === 0 && JSON.parse(read(path.join(M, "fr.json")))[NAMESPACE].a.c === "Paquets" && m.allow_stale === false && !m.untranslated.fr.length,
     "a fully translated build replaces the files; the manifest records no --allow-stale and no untranslated key");
  commit("copy 2"); }

// ---------------------------------------------------------------------------
// hand edits in the target
// ---------------------------------------------------------------------------
{ put(M, "fr.json", read(path.join(M, "fr.json")).replace("Fermer", "Fermer (à la main)"));
  commit("fix French by hand");
  makeBuild(STALE);
  const before = snapshot(repo);
  const r = copy();
  ok(r.code === 1 && /messages\/fr\.json: changed/.test(r.out) && /fix French by hand/.test(r.out) && snapshot(repo) === before,
     "a file edited in the target stops the copy, naming the file and its commit, and writes nothing");
  const c = copy(["--check"]);
  ok(c.code === 1 && /messages\/fr\.json: changed/.test(c.out) && snapshot(repo) === before, "--check reports the same refusal (exit 1), and writes nothing");
  const cf = copy(["--check", "--force"]);
  ok(cf.code === 0 && /--force: would replace 1 file/.test(cf.out) && snapshot(repo) === before, "--check --force says what --force would replace, and writes nothing");
  const f = copy(["--force"]);
  ok(f.code === 0 && /--force: replacing 1 file\(s\) changed by hand/.test(f.out) && /fr\.json\s+replaced \(hand edit, --force\)/.test(f.out)
     && read(path.join(M, "fr.json")) === read(path.join(dist, "fr.json")) && manifest().files["fr.json"] === sha(path.join(M, "fr.json")),
     "--force replaces the edited file, says so loudly, and records the new hash");
  commit("copy 3"); }
{ put(M, "pt.json", read(path.join(M, "pt.json")).replace("Fechar", "Fechar!"));
  const r = copy();
  ok(r.code === 1 && /messages\/pt\.json: changed\s+\(uncommitted\)/.test(r.out), "an uncommitted edit is caught too, and says it is uncommitted");
  git("checkout", "-q", "--", "messages/pt.json");
  fs.rmSync(path.join(M, "en.json"));
  const r2 = copy();
  ok(r2.code === 1 && /messages\/en\.json: deleted/.test(r2.out) && !fs.existsSync(path.join(M, "en.json")), "a file deleted in the target stops the copy");
  const r3 = copy(["--force"]);
  ok(r3.code === 0 && read(path.join(M, "en.json")) === read(path.join(dist, "en.json")), "--force writes it back");
  commit("copy 4"); }

// ---------------------------------------------------------------------------
// no manifest: files copied by hand before this script
// ---------------------------------------------------------------------------
{ fs.rmSync(path.join(M, MANIFEST)); commit("hand copy, no manifest");
  const r = copy();
  ok(r.code === 0 && /manifest\.json\s+new/.test(r.out) && /en\.json\s+unchanged/.test(r.out) && fs.existsSync(path.join(M, MANIFEST)),
     "no manifest, and the files there are identical to this build: adopted, only manifest.json is written");
  fs.rmSync(path.join(M, MANIFEST));
  put(M, "pt.json", read(path.join(M, "pt.json")).replace("Fechar", "Fechar (antigo)"));
  commit("older hand copy");
  const before = snapshot(repo);
  const r2 = copy();
  ok(r2.code === 1 && /has no manifest\.json/.test(r2.out) && /messages\/pt\.json: differs from this build/.test(r2.out) && !/fr\.json: differs/.test(r2.out) && snapshot(repo) === before,
     "no manifest, and a file there differs: refused, naming only that file, nothing written");
  const c = copy(["--check"]);
  ok(c.code === 1 && /pt\.json: differs/.test(c.out) && snapshot(repo) === before, "--check refuses the same way");
  const f = copy(["--force"]);
  ok(f.code === 0 && read(path.join(M, "pt.json")) === read(path.join(dist, "pt.json")) && manifest().files["pt.json"] === sha(path.join(M, "pt.json")),
     "--force replaces it and writes the manifest");
  commit("copy 5"); }
{ fs.writeFileSync(path.join(M, MANIFEST), "{ edited");
  const r = copy();
  ok(r.code === 1 && /unreadable manifest\.json/.test(r.out), "an unreadable manifest.json is refused like a hand edit");
  const f = copy(["--force"]);
  ok(f.code === 0 && manifest().files["en.json"] === sha(path.join(M, "en.json")), "--force writes a new one");
  const m = manifest(); m.files["../package.json"] = "0".repeat(64);
  fs.writeFileSync(path.join(M, MANIFEST), JSON.stringify(m, null, 2) + "\n");
  const r2 = copy(["--force"]);
  ok(r2.code === 0 && fs.existsSync(path.join(repo, "package.json")) && !("../package.json" in manifest().files),
     "a manifest naming a file outside messages/ is not trusted: even --force removes nothing outside messages/");
  commit("copy 6"); }

// ---------------------------------------------------------------------------
// the source, and a language the build no longer has
// ---------------------------------------------------------------------------
{ const dirty = { commit: "b".repeat(40), clean: false, uncommitted: ["i18n/ui.en.json"] };
  const r = copy([], STALE, dirty);
  const m = manifest();
  ok(r.code === 0 && m.clean === false && m.uncommitted.join() === "i18n/ui.en.json" && m.built_from === dirty.commit && /WARNING: built from uncommitted changes to i18n\/ui\.en\.json/.test(r.out),
     "a build from uncommitted sources is copied, recorded as clean: false with the files, and warned about");
  copy(); commit("copy 7"); }
{ put(M, "es.json", "{}\n");
  const m = manifest(); m.files["es.json"] = sha(path.join(M, "es.json"));
  fs.writeFileSync(path.join(M, MANIFEST), JSON.stringify(m, null, 2) + "\n");
  commit("a copy with es.json");
  const r = copy();
  ok(r.code === 0 && !fs.existsSync(path.join(M, "es.json")) && !("es.json" in manifest().files) && fs.existsSync(path.join(M, "README.md")),
     "a language file the last copy wrote and the build no longer has is removed, README kept"); }

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n  copy-rbm-messages: ${passed} passed, ${failed} failed\n`);
process.exitCode = failed ? 1 : 0;
