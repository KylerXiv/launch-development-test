#!/usr/bin/env node
// The source watcher for WHO Prequalification. Reads the staged WHO PQ list
// and, for each portfolio medicine WHO now lists but the dashboard does not
// yet show as listed, writes a proposal in the issue form's own layout — so
// intake, the pull request, the preview and the approval treat it exactly as
// they treat a person's.
//
//   node scripts/propose-regulatory.js [--staging <csv>] [--previous <csv>] [--out <dir>]
//
// It proposes only what the list states outright, as one unit: the stage is
// done, from when, and a factual sentence naming the references and
// applicants. Anything that needs judgement — a further presentation of a
// medicine already listed, a delisting, a sentence worth rewording — stays in
// the regulatory watch report for a person.
//
// Nothing here writes under data/. Output: <out>/manifest.json plus one body
// file per proposal, each already checked with the library and rules intake
// uses. A proposal whose exact content was rejected before is not written.
// .github/workflows/source-proposals.yml files what this writes.

"use strict";

const fs = require("fs");
const path = require("path");
const lib = require("./proposal-lib.js");
const { parseCsv } = require("./fetch-regulatory.js");

const ROOT = path.join(__dirname, "..");
const FETCHED = "sourcing/staging/regulatory_events.csv";
const STAGE = "WHO PQ listing";
const SOURCE_ID = "who-pq-fpp";
// A list that loses more than a fifth of its rows in a month is an export
// whose columns changed, not a wave of withdrawals. Propose nothing from it.
const MIN_KEEP = 0.8;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? undefined : argv[i + 1]; };
const fail = (m) => { console.error("propose-regulatory: " + m); process.exit(1); };
const read = (f) => fs.readFileSync(path.resolve(ROOT, f), "utf8");
const human = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
const whoRows = (text) => parseCsv(text).filter((r) => r.authorityType === "WHO-PQ");

const staging = arg("--staging") || FETCHED;
const outDir = path.resolve(ROOT, arg("--out") || "proposals-out");

const rows = whoRows(read(staging));
if (!rows.length) fail(`no WHO-PQ rows in ${staging} — refusing to propose anything from it`);
if (arg("--previous")) {
  const before = whoRows(read(arg("--previous"))).length;
  if (before && rows.length < before * MIN_KEEP)
    fail(`WHO-PQ rows fell from ${before} to ${rows.length} since the last fetch — that is a changed export, not withdrawals. Nothing proposed; check the fetcher.`);
}

const { data } = lib.readData();
const sources = lib.readSources();
const src = sources.find((s) => s.id === SOURCE_ID);
if (!src) fail(`source "${SOURCE_ID}" is not in data/sources.js`);
const stageIdx = data.stages.indexOf(STAGE);
if (stageIdx < 0) fail(`no stage named "${STAGE}" in data/products.js`);

const decisions = lib.readDecisions();

fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
const log = [];

for (const product of data.products) {
  const mine = rows.filter((r) => r.productId === product.id && ISO.test(r.eventDate))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.refId.localeCompare(b.refId));
  if (!mine.length) continue;
  if (product.stages[stageIdx].status === "done") {
    log.push(`${product.name}: already shown as listed — nothing to propose (${mine.length} WHO PQ row(s)).`);
    continue;
  }

  const first = mine[0].eventDate;
  const fetched = mine.map((r) => r.retrievedDate).filter((d) => ISO.test(d)).sort().pop()
    || new Date().toISOString().slice(0, 10);
  const refs = mine.map((r) => r.refId);
  const applicants = [...new Set(mine.map((r) => r.applicant).filter(Boolean))];
  const note = mine.length === 1
    ? `Prequalified by WHO on ${human(first)} (WHO ref ${refs[0]}, ${applicants.join(", ")}).`
    : `Prequalified by WHO: ${mine.length} presentations (${refs.join(", ")}), the first on ${human(first)} — ${applicants.join(", ")}.`;

  const reviewer = [
    `Filed automatically by the source watcher from \`${staging}\`, fetched ${fetched}.`,
    "",
    ...mine.map((r) => `- ${r.refId} · ${r.productName} · ${r.event} ${r.eventDate} · ${r.applicant}`),
    "",
    "The sentence is a factual draft. If it should read differently, reject with `rejected:wrong-value` and file your own wording.",
    "Not changed: what happens next, and which stage the dashboard shows as current.",
  ];
  if (path.normalize(staging) !== path.normalize(FETCHED))
    reviewer.unshift(`**Test data** — read from \`${staging}\`, not from the fetched list.`, "");

  const form = {
    "Medicine": product.name,
    "Which stage": STAGE,
    "What changes": lib.SEVERAL_LABEL,
    "The status of this stage": "done",
    "The date this stage was reached": human(first),
    "The sentence shown under this stage": note,
    "Source": src.label,
    "Date of the source": fetched,
    "Link or reference": `${refs.join(", ")} — ${mine[0].sourceUrl}`,
    "Anything the reviewer should know": reviewer.join("\n"),
  };
  const body = Object.entries(form).map(([k, v]) => `### ${k}\n\n${v}\n`).join("\n");

  // Exactly what intake will run on this body, so a broken one is never filed.
  const built = lib.buildProposal(lib.parseIssueBody(body), { data, sources, issue: { number: 0, user: lib.BOT } });
  if (!built.ok) { log.push(`${product.name}: NOT proposed — ${built.errors.join(" ")}`); continue; }
  const checked = lib.checkApplied(data, built.proposal);
  if (checked.errors.length) { log.push(`${product.name}: NOT proposed — it would break the data rules: ${checked.errors.join("; ")}`); continue; }
  if (lib.rejectionsOf(built.proposal, decisions).length) {
    log.push(`${product.name}: rejected before with exactly this content (${built.proposal.fingerprint}) — not proposed again.`);
    continue;
  }

  const file = path.join(outDir, `${product.id}.md`);
  fs.writeFileSync(file, body);
  manifest.push({ title: lib.titleFor(built.proposal), product: product.id, fingerprint: built.proposal.fingerprint, bodyFile: file });
  log.push(`${product.name}: PROPOSED — status done, date ${human(first)}, from ${refs.join(", ")}.`);
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`WHO PQ: ${rows.length} rows read from ${staging}.`);
log.forEach((l) => console.log("- " + l));
console.log(`${manifest.length} proposal(s) written to ${path.relative(ROOT, outDir) || outDir}.`);
