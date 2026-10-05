#!/usr/bin/env node
// Tests for the source watchers that turn a public source into proposals:
// scripts/propose-trials.js (ClinicalTrials.gov) and scripts/propose-registers.js
// (Nigeria's NAFDAC Green Book, Tanzania's TMDA register). No network: each
// watcher runs on the staged lists and the files in test-data/, writing into a
// temporary folder, and every proposal it writes is put through the same
// library and rules intake uses.
//
//   node scripts/test-source-watchers.js

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const lib = require("./proposal-lib.js");
const T = require("./propose-trials.js");

const ROOT = path.join(__dirname, "..");
let pass = 0, fail = 0;
const failures = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  \x1b[32mok\x1b[0m   " + label); }
  else { fail++; failures.push(label); console.log("  \x1b[31mFAIL\x1b[0m " + label + (detail !== undefined ? "\n         got " + JSON.stringify(detail).slice(0, 400) : "")); }
}
const group = (name) => console.log("\n\x1b[1m" + name + "\x1b[0m");
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), name + "-"));

// Runs a watcher; returns its exit code, its printed lines, and what it wrote.
function watcher(script, args) {
  const out = tmp("watch");
  let code = 0, stdout = "";
  try {
    stdout = execFileSync(process.execPath, [path.join(__dirname, script), ...args, "--out", out], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status; stdout = String(e.stdout || "") + String(e.stderr || ""); }
  const mf = path.join(out, "manifest.json");
  const manifest = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, "utf8")) : null;
  return { code, stdout, manifest, bodies: (manifest || []).map((m) => fs.readFileSync(m.bodyFile, "utf8")) };
}

// What intake does with a filed body, and the data with it applied.
function intake(body, dataFile) {
  const { data } = lib.readData(dataFile);
  const built = lib.buildProposal(lib.parseIssueBody(body), { data, sources: lib.readSources(), issue: { number: 77, user: lib.BOT } });
  if (!built.ok) return { built };
  return { built, res: lib.checkApplied(data, built.proposal, "2026-10-05"), data };
}

function dataWith(mutate) {
  const { raw, data } = lib.readData();
  const next = JSON.parse(JSON.stringify(data));
  mutate(next);
  const f = path.join(tmp("data"), "products.js");
  fs.writeFileSync(f, require("./serialize-products.js").serializeProducts(next, raw));
  return f;
}

function csvWith(file, mutate) {
  const { parseCsv } = require("./fetch-regulatory.js");
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const cols = Object.keys(rows[0]);
  const kept = mutate(rows) || rows;
  const esc = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const f = path.join(tmp("csv"), path.basename(file));
  fs.writeFileSync(f, [cols.join(","), ...kept.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n") + "\n");
  return f;
}

// ---- ClinicalTrials.gov ------------------------------------------------------

group("Trials: reading one registry record");
const row = (over) => ({ nctId: "NCT05951595", acronym: "FD-TACT", phase: "PHASE3", overallStatus: "RECRUITING",
  primaryCompletionDate: "2027-06-30", primaryCompletionType: "ESTIMATED", lastUpdatePostDate: "2026-09-30", ...over });
const today = "2026-10-05";
ok("an actual primary completion is a date line", /reached primary completion on 15 Sep 2026/.test(T.readTrial(row({ overallStatus: "ACTIVE_NOT_RECRUITING", primaryCompletionDate: "2026-09-15", primaryCompletionType: "ACTUAL" }), today).date || ""));
ok("an estimate still ahead is a date line", T.readTrial(row({}), today).date === "Phase III FD-TACT (NCT05951595): primary completion expected 30 Jun 2027 (ClinicalTrials.gov estimate)");
ok("a month-only estimate reads as the month", /expected Jun 2027/.test(T.readTrial(row({ primaryCompletionDate: "2027-06" }), today).date || ""));
ok("an estimate in this month is not yet past", !!T.readTrial(row({ primaryCompletionDate: "2026-10" }), today).date);
const stale = T.readTrial(row({ primaryCompletionDate: "2026-07-31", lastUpdatePostDate: "2025-11-18" }), today);
ok("an estimate already passed is left for a person, naming the last update", !stale.date && /has passed/.test(stale.person) && /18 Nov 2025/.test(stale.person));
for (const st of ["TERMINATED", "WITHDRAWN", "SUSPENDED", "UNKNOWN"])
  ok(`a ${st.toLowerCase()} trial is left for a person, even with an actual date`, !T.readTrial(row({ overallStatus: st, primaryCompletionType: "ACTUAL" }), today).date);
ok("staging from before the type column: a completed trial counts as actual",
  !!T.readTrial(row({ overallStatus: "COMPLETED", primaryCompletionDate: "2026-09-15", primaryCompletionType: "" }), today).date);
ok("staging from before the type column: no estimate is proposed",
  !T.readTrial(row({ primaryCompletionType: "" }), today).date);
ok("phases read as the registry's, in roman numerals", T.phaseWords("PHASE2|PHASE3") === "Phase II/III" && T.phaseWords("PHASE3") === "Phase III" && T.phaseWords("") === "Trial");
ok("without an acronym the trial is named by its number", /^Phase III NCT05951595:/.test(T.readTrial(row({ acronym: "" }), today).date));

group("Trials: which trials are followed");
ok("a trial the stage cites by number", T.followed({ id: "x" }, { note: "Phase III (KALUMA, NCT05842954) met …", source: "" }).includes("NCT05842954"));
ok("ALAQ's pivotal trial, from the table", T.followed({ id: "alaq" }, { note: "FD-TACT …" }).includes("NCT05951595"));
ok("none for a medicine that cites none and is not in the table", T.followed({ id: "x" }, { note: "no number here" }).length === 0);

group("Trials: the real staged list");
const real = watcher("propose-trials.js", ["--today", today]);
ok("exits 0 and proposes nothing", real.code === 0 && real.manifest && real.manifest.length === 0, real.stdout);
ok("leaves FD-TACT's passed estimate for a person", /ALAQ: left for a person — FD-TACT \(NCT05951595\): the registry's estimated primary completion, 31 Jul 2026, has passed/.test(real.stdout), real.stdout);
ok("follows no trial for a medicine whose development is done", (real.stdout.match(/development already shown as done/g) || []).length === 3);

for (const [file, want] of [
  ["alaq-primary-completion.csv", "Phase III FD-TACT-TEST (NCT05951595) reached primary completion on 15 Sep 2026 (ClinicalTrials.gov)"],
  ["alaq-estimate-moved.csv", "Phase III FD-TACT-TEST (NCT05951595): primary completion expected Jun 2027 (ClinicalTrials.gov estimate)"],
]) {
  group("Trials: test-data/trials/" + file);
  const w = watcher("propose-trials.js", ["--staging", "test-data/trials/" + file, "--today", today]);
  ok("exits 0 with one proposal, for ALAQ's trial stage", w.code === 0 && w.manifest.length === 1 && w.manifest[0].title === "Proposal: ALAQ · R&D & clinical", w.stdout);
  const { built, res } = intake(w.bodies[0] || "");
  ok("intake reads it as a one-field proposal, from the watcher", built.ok && built.proposal.target.field === "date" && /^watcher:/.test(built.proposal.origin), built.errors);
  if (built.ok) {
    const s = res.applied.products.find((p) => p.id === "alaq").stages[0];
    const was = lib.readData().data.products.find((p) => p.id === "alaq").stages[0];
    ok("it sets the date line to the registry's", s.date === want, s.date);
    ok("and leaves the status and the sentence alone", s.status === was.status && s.note === was.note);
    ok("cites ClinicalTrials.gov and the trial", /^ClinicalTrials\.gov \(NCT05951595/.test(s.source) && s.asOf === "2026-09-28", s.source);
    ok("the applied data passes the rules", res.errors.length === 0, res.errors);
    ok("the reviewer is told it is test data", /\*\*Test data\*\*/.test(w.bodies[0]));
    ok("the fingerprint in the manifest is intake's", w.manifest[0].fingerprint === built.proposal.fingerprint);

    // Once approved, the same list proposes nothing.
    const after = dataWith((d) => { d.products.find((p) => p.id === "alaq").stages[0].date = want; });
    const again = watcher("propose-trials.js", ["--staging", "test-data/trials/" + file, "--today", today, "--data", after]);
    ok("after approval, the same list proposes nothing", again.code === 0 && again.manifest.length === 0 && /already says this/.test(again.stdout), again.stdout);
  }
}

group("Trials: guards");
const shrunk = csvWith("sourcing/staging/trials.csv", (rows) => rows.filter((r) => r.productId !== "alaq" || r.nctId === "NCT05951595"));
const g = watcher("propose-trials.js", ["--staging", "test-data/trials/alaq-primary-completion.csv", "--previous", "sourcing/staging/trials.csv", "--today", today]);
ok("a list that kept its rows is not blocked", g.code === 0 && g.manifest.length === 1, g.stdout);
const b = watcher("propose-trials.js", ["--staging", shrunk, "--previous", "sourcing/staging/trials.csv", "--today", today]);
ok("a medicine whose staged trials fell by more than a fifth is blocked, and the run fails", b.code === 1 && /BLOCKED ClinicalTrials\.gov · ALAQ: staged trials fell from 58 to 1/.test(b.stdout), b.stdout);
const gone = csvWith("sourcing/staging/trials.csv", (rows) => rows.filter((r) => r.nctId !== "NCT05951595"));
const m = watcher("propose-trials.js", ["--staging", gone, "--today", today]);
ok("a followed trial missing from the list is left for a person", m.code === 0 && m.manifest.length === 0 && /NCT05951595 is not in the staged list/.test(m.stdout), m.stdout);
const results = csvWith("test-data/trials/alaq-primary-completion.csv", (rows) => { rows.find((r) => r.nctId === "NCT05951595").hasResults = "true"; });
const r = watcher("propose-trials.js", ["--staging", results, "--today", today]);
ok("results posted are flagged for a person, beside the proposal", /has results posted — for a person to read/.test(r.stdout) && r.manifest.length === 1, r.stdout);
const done = dataWith((d) => { d.products.find((p) => p.id === "alaq").stages[0].status = "done"; });
const dn = watcher("propose-trials.js", ["--staging", "test-data/trials/alaq-primary-completion.csv", "--today", today, "--data", done]);
ok("a medicine shown as developed follows no trial", dn.manifest.length === 0 && /ALAQ: development already shown as done/.test(dn.stdout), dn.stdout);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) { console.log("Failed:\n  " + failures.join("\n  ")); process.exit(1); }
