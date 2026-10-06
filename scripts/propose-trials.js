#!/usr/bin/env node
// The source watcher for ClinicalTrials.gov. Reads sourcing/staging/trials.csv
// and, for each portfolio medicine still in development, follows the trial
// its "R&D & clinical" stage is waiting on. When the registry states something
// new about that trial outright, it writes a proposal in the issue form's own
// layout, so intake, the pull request, the preview and the approval treat it
// exactly as they treat a person's.
//
//   node scripts/propose-trials.js [--staging <csv>] [--previous <csv>] [--out <dir>]
//                                  [--today YYYY-MM-DD] [--data <products.js>]
//
// --today and --data are for the tests: what counts as past, and a data file
// other than data/products.js.
//
// What it proposes: only the stage's date line, and only two things —
//   - the trial reached primary completion (the registry marks the date
//     ACTUAL): "Phase III FD-TACT (NCT05951595) reached primary completion on
//     15 Sep 2026 (ClinicalTrials.gov)";
//   - the sponsor moved the estimated primary completion to a date still
//     ahead: "… primary completion expected Jun 2027 (ClinicalTrials.gov
//     estimate)".
// Never the status or the sentence: a trial finishing is not the medicine's
// development being done, and whether it worked is a story a person tells.
//
// Left for a person, in the run summary: an estimate that has already passed
// while the trial still says it is recruiting (the sponsor has not updated
// it), a trial terminated, withdrawn, suspended or of unknown status, results
// posted, and a followed trial missing from the staged list. New trials are
// already in the weekly trial watch issue.
//
// Nothing here writes under data/. Output: <out>/manifest.json plus one body
// file per proposal, each already checked with the library and rules intake
// uses. .github/workflows/source-proposals.yml files what this writes.

"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./proposal-lib.js");
const { parseCsv } = require("./fetch-regulatory.js");

const ROOT = path.join(__dirname, "..");
const FETCHED = "sourcing/staging/trials.csv";
const STAGE = "R&D & clinical";
const SOURCE_ID = "clinicaltrials";
const DATE_FIELD = "The date this stage was reached";
// A medicine whose staged trials fall by more than a fifth since the last
// fetch has a search that broke, not trials that vanished.
const MIN_KEEP = 0.8;

// The trial a medicine still in development is waiting on, where its stage
// does not already cite it by NCT number. Any NCT number the stage's own text
// cites is followed as well. Checked against the registry on 5 Oct 2026:
//   ALAQ — FD-TACT, the pivotal Phase III of the fixed-dose triple ACT
//          (University of Oxford; first participant 11 Sep 2025).
const PIVOTAL = { alaq: ["NCT05951595"] };

const UNDER_WAY = new Set(["RECRUITING", "ACTIVE_NOT_RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION"]);
const STOPPED = new Set(["TERMINATED", "WITHDRAWN", "SUSPENDED", "UNKNOWN"]);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// The registry gives a day or only a month: "2026-07-31" or "2026-07".
function human(d) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(d || ""));
  if (!m) return String(d || "");
  return (m[3] ? Number(m[3]) + " " : "") + MONTHS[Number(m[2]) - 1] + " " + m[1];
}
// A month-only estimate is not past until that month is.
const isPast = (d, today) => String(d) < today.slice(0, String(d).length);

const ROMAN = { "1": "I", "2": "II", "3": "III", "4": "IV" };
function phaseWords(p) {
  const parts = String(p || "").split("|").map((x) => (/^(?:EARLY_)?PHASE(\d)$/.exec(x) || [])[1]).filter(Boolean);
  return parts.length ? "Phase " + parts.map((n) => ROMAN[n] || n).join("/") : "Trial";
}
const trialName = (r) => (r.acronym ? `${r.acronym} (${r.nctId})` : r.nctId);

// What the registry states outright about one followed trial, as the date
// line it would put under the stage — or why it is left for a person.
function readTrial(r, today) {
  const status = String(r.overallStatus || "").toUpperCase();
  const pcd = r.primaryCompletionDate;
  const type = String(r.primaryCompletionType || "").toUpperCase();
  const updated = r.lastUpdatePostDate ? `, last updated ${human(r.lastUpdatePostDate)}` : "";
  const says = `${status.toLowerCase().replace(/_/g, " ")}${updated}`;

  if (STOPPED.has(status))
    return { person: `${trialName(r)} is ${says}. What that means for the stage is for a person to say.` };
  // Without the type column (a staging file from before 5 Oct 2026), only a
  // COMPLETED trial is taken to have an actual date.
  const actual = type ? type === "ACTUAL" : status === "COMPLETED";
  if (pcd && actual)
    return { date: `${phaseWords(r.phase)} ${trialName(r)} reached primary completion on ${human(pcd)} (ClinicalTrials.gov)`, kind: "primary completion" };
  if (pcd && type === "ESTIMATED" && UNDER_WAY.has(status)) {
    if (isPast(pcd, today))
      return { person: `${trialName(r)}: the registry's estimated primary completion, ${human(pcd)}, has passed and it still says ${says}. The sponsor has not updated it.` };
    return { date: `${phaseWords(r.phase)} ${trialName(r)}: primary completion expected ${human(pcd)} (ClinicalTrials.gov estimate)`, kind: "estimate" };
  }
  return { person: `${trialName(r)} is ${says}, with ${pcd ? "a primary completion date of unstated kind" : "no primary completion date"}.` };
}

// The NCT numbers a stage cites in its own words, then the table above.
function followed(product, stage) {
  const text = [stage.note, stage.date, stage.next, stage.source].join(" ");
  const cited = text.match(/NCT\d{8}/g) || [];
  return [...new Set([...cited, ...(PIVOTAL[product.id] || [])])];
}

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? undefined : argv[i + 1]; };
  const read = (f) => fs.readFileSync(path.resolve(ROOT, f), "utf8");
  const staging = arg("--staging") || FETCHED;
  const outDir = path.resolve(ROOT, arg("--out") || "proposals-out");
  const today = arg("--today") || new Date().toISOString().slice(0, 10);
  const testData = path.normalize(staging) !== path.normalize(FETCHED);

  const all = parseCsv(read(staging));
  const before = arg("--previous") ? parseCsv(read(arg("--previous"))) : null;
  const { data } = lib.readData(arg("--data") && path.resolve(ROOT, arg("--data")));
  const sources = lib.readSources();
  const decisions = lib.readDecisions();
  const src = sources.find((s) => s.id === SOURCE_ID);
  if (!src) throw new Error(`source "${SOURCE_ID}" is not in data/sources.js`);
  const stageIdx = data.stages.indexOf(STAGE);
  if (stageIdx < 0) throw new Error(`no stage named "${STAGE}" in data/products.js`);

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [], log = [], blocked = [];
  log.push(`ClinicalTrials.gov: ${all.length} staged trials.`);

  for (const product of data.products) {
    const stage = product.stages[stageIdx];
    const who = `ClinicalTrials.gov · ${product.name}`;
    if (stage.status === "done") { log.push(`${who}: development already shown as done — nothing followed.`); continue; }

    const mine = all.filter((r) => r.productId === product.id);
    if (before) {
      const was = before.filter((r) => r.productId === product.id).length;
      if (was && mine.length < was * MIN_KEEP) {
        blocked.push(`${who}: staged trials fell from ${was} to ${mine.length} since the last fetch — a broken search, not vanished trials. Nothing proposed for it; check fetch-trials.js.`);
        continue;
      }
    }
    const ncts = followed(product, stage);
    if (!ncts.length) { log.push(`${who}: in development, but no trial is followed — cite its NCT number in the stage, or add it to PIVOTAL in propose-trials.js.`); continue; }

    let proposed = false;
    for (const nct of ncts) {
      const r = mine.find((x) => x.nctId === nct) || all.find((x) => x.nctId === nct);
      if (!r) { log.push(`${who}: ${nct} is not in the staged list — the search no longer finds it. Left for a person; check fetch-trials.js.`); continue; }
      if (String(r.hasResults) === "true") log.push(`${who}: ${trialName(r)} has results posted — for a person to read.`);
      const got = readTrial(r, today);
      if (got.person) { log.push(`${who}: left for a person — ${got.person}`); continue; }
      if (stage.date === got.date) { log.push(`${who}: ${trialName(r)} — the date line already says this.`); continue; }
      if (proposed) { log.push(`${who}: ${trialName(r)} would also change the date line — left for a person, one proposal per stage.`); continue; }

      const reviewer = [
        `Filed automatically by the source watcher (ClinicalTrials.gov) from \`${staging}\`, fetched ${r.retrievedDate}.`,
        "",
        `- ${r.nctId}${r.acronym ? " · " + r.acronym : ""} · ${phaseWords(r.phase)} · ${r.leadSponsor}`,
        `- Status: ${String(r.overallStatus).toLowerCase().replace(/_/g, " ")}; primary completion ${r.primaryCompletionDate} (${(r.primaryCompletionType || "type not recorded").toLowerCase()}); last updated ${r.lastUpdatePostDate || "—"}`,
        "",
        got.kind === "estimate"
          ? "This is the sponsor's own estimate, as the registry holds it today. Sponsors update estimates late or not at all, so check it is plausible before approving."
          : "Primary completion means the last participant's primary outcome was measured. It says nothing about whether the trial met its endpoint.",
        "Only the date line changes. The stage's status and sentence are not touched: a trial finishing is not the medicine's development being done.",
      ];
      if (testData) reviewer.unshift(`**Test data** — read from \`${staging}\`, not from the fetched list.`, "");

      const form = {
        "Medicine": product.name,
        "Which stage": STAGE,
        "What changes": DATE_FIELD,
        "What it should say": got.date,
        "Source": src.label,
        "Date of the source": r.retrievedDate,
        "Link or reference": `${r.nctId} — ${r.sourceUrl}`,
        "Anything the reviewer should know": reviewer.join("\n"),
      };
      const body = Object.entries(form).map(([k, v]) => `### ${k}\n\n${v}\n`).join("\n");

      // Exactly what intake will run on this body, so a broken one is never filed.
      const built = lib.buildProposal(lib.parseIssueBody(body), { data, sources, issue: { number: 0, user: lib.BOT } });
      if (!built.ok) { log.push(`${who}: NOT proposed — ${built.errors.join(" ")}`); continue; }
      const checked = lib.checkApplied(data, built.proposal);
      if (checked.errors.length) { log.push(`${who}: NOT proposed — it would break the data rules: ${checked.errors.join("; ")}`); continue; }
      if (lib.rejectionsOf(built.proposal, decisions).length) {
        log.push(`${who}: rejected before with exactly this content (${built.proposal.fingerprint}) — not proposed again.`);
        continue;
      }

      const file = path.join(outDir, `${product.id}-clinicaltrials.md`);
      fs.writeFileSync(file, body);
      manifest.push({ title: lib.titleFor(built.proposal), watcher: "ClinicalTrials.gov", product: product.id, fingerprint: built.proposal.fingerprint, bodyFile: file });
      log.push(`${who}: PROPOSED — date line: “${got.date}”.`);
      proposed = true;
    }
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Read ${staging}.`);
  log.forEach((l) => console.log("- " + l));
  blocked.forEach((l) => console.log("- BLOCKED " + l));
  console.log(`${manifest.length} proposal(s) written to ${path.relative(ROOT, outDir) || outDir}.`);
  return blocked.length ? 1 : 0;
}

module.exports = { PIVOTAL, human, isPast, phaseWords, readTrial, followed, main };

if (require.main === module) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error("propose-trials: " + err.message); process.exit(1); }
}
