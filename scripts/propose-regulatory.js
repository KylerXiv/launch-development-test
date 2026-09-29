#!/usr/bin/env node
// The source watcher for the regulatory list. Reads sourcing/staging/
// regulatory_events.csv and, for each portfolio medicine a source now shows as
// reaching a stage the dashboard does not yet show as done, writes a proposal
// in the issue form's own layout — so intake, the pull request, the preview
// and the approval treat it exactly as they treat a person's.
//
//   node scripts/propose-regulatory.js [--staging <csv>] [--previous <csv>] [--out <dir>]
//
// One watcher per source, in WATCHERS below:
//   WHO PQ — a listing on the WHO Prequalification list → "WHO PQ listing"
//   EMA    — a positive EU-M4all / Article 58 opinion   → "Regulatory approval (SRA)"
//
// Each proposes only what its source states outright, as one unit: the stage
// is done, from when, a factual sentence naming the references, and — if the
// stage still says what happens next — that cleared, since a done stage has
// none. Anything that needs judgement stays in the regulatory watch report for
// a person: a further presentation of a medicine already listed, a withdrawn
// opinion or application, a delisting, a sentence worth rewording.
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
// A source that loses more than a fifth of its rows in a month is an export
// whose columns changed, not a wave of withdrawals. Propose nothing from it.
const MIN_KEEP = 0.8;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const human = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
const uniq = (xs) => [...new Set(xs.filter(Boolean))];

const WATCHERS = [
  {
    name: "WHO PQ",
    rows: (r) => r.authorityType === "WHO-PQ",
    // Every row on the list is a current listing; one without a date cannot
    // say from when, so it is left for a person (ASPY's two Art. 58 rows).
    counts: (r) => ISO.test(r.eventDate),
    stage: "WHO PQ listing",
    sourceId: "who-pq-fpp",
    sentence: (rows, first) => {
      const refs = rows.map((r) => r.refId), who = uniq(rows.map((r) => r.applicant)).join(", ");
      return rows.length === 1
        ? `Prequalified by WHO on ${human(first)} (WHO ref ${refs[0]}, ${who}).`
        : `Prequalified by WHO: ${rows.length} presentations (${refs.join(", ")}), the first on ${human(first)} — ${who}.`;
    },
  },
  {
    name: "EMA",
    rows: (r) => r.authorityType === "SRA" && r.authority === "EMA",
    // Only a positive opinion. A withdrawn opinion or application is a story a
    // person has to tell, and the watch report already flags the change.
    counts: (r) => ISO.test(r.eventDate) && /^positive opinion\b/i.test(r.status),
    stage: "Regulatory approval (SRA)",
    sourceId: "ema",
    sentence: (rows, first) => {
      const named = uniq(rows.map((r) => `${r.productName.split(" — ")[0]} (${r.refId})`)).join(", ");
      return `EMA positive scientific opinion under EU-M4all (Article 58) on ${human(first)} — ${named}.`;
    },
  },
];

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? undefined : argv[i + 1]; };
const fail = (m) => { console.error("propose-regulatory: " + m); process.exit(1); };
const read = (f) => fs.readFileSync(path.resolve(ROOT, f), "utf8");

const staging = arg("--staging") || FETCHED;
const outDir = path.resolve(ROOT, arg("--out") || "proposals-out");
const all = parseCsv(read(staging));
const before = arg("--previous") ? parseCsv(read(arg("--previous"))) : null;

const { data } = lib.readData();
const sources = lib.readSources();
const decisions = lib.readDecisions();

fs.mkdirSync(outDir, { recursive: true });
const manifest = [];
const log = [];
const blocked = [];

for (const w of WATCHERS) {
  const rows = all.filter(w.rows);
  if (!rows.length) { blocked.push(`${w.name}: no rows in ${staging} — nothing proposed from it`); continue; }
  if (before) {
    const was = before.filter(w.rows).length;
    if (was && rows.length < was * MIN_KEEP) {
      blocked.push(`${w.name}: rows fell from ${was} to ${rows.length} since the last fetch — a changed export, not withdrawals. Nothing proposed from it; check the fetcher.`);
      continue;
    }
  }
  const src = sources.find((s) => s.id === w.sourceId);
  if (!src) fail(`source "${w.sourceId}" is not in data/sources.js`);
  const stageIdx = data.stages.indexOf(w.stage);
  if (stageIdx < 0) fail(`no stage named "${w.stage}" in data/products.js`);
  log.push(`${w.name}: ${rows.length} rows.`);

  for (const product of data.products) {
    const theirs = rows.filter((r) => r.productId === product.id);
    const mine = theirs.filter(w.counts)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.refId.localeCompare(b.refId));
    const left = theirs.filter((r) => !w.counts(r));
    if (left.length)
      log.push(`${w.name} · ${product.name}: ${left.length} row(s) left for a person — ` +
        left.map((r) => `${r.refId} (${r.status || (ISO.test(r.eventDate) ? r.event : "no date")})`).join(", ") + ".");
    if (!mine.length) continue;
    const stage = product.stages[stageIdx];
    if (stage.status === "done") {
      log.push(`${w.name} · ${product.name}: already shown as done — nothing to propose (${mine.length} row(s)).`);
      continue;
    }

    const first = mine[0].eventDate;
    const fetched = mine.map((r) => r.retrievedDate).filter((d) => ISO.test(d)).sort().pop()
      || new Date().toISOString().slice(0, 10);
    const refs = mine.map((r) => r.refId);

    const reviewer = [
      `Filed automatically by the source watcher (${w.name}) from \`${staging}\`, fetched ${fetched}.`,
      "",
      ...mine.map((r) => `- ${r.refId} · ${r.productName} · ${r.event} ${r.eventDate}${r.status ? " · " + r.status : ""}${r.applicant ? " · " + r.applicant : ""}`),
      "",
      "The sentence is a factual draft. If it should read differently, reject with `rejected:wrong-value` and file your own wording.",
      stage.next || stage.nextDate
        ? "What happens next is cleared: a stage that is done has no next step."
        : "",
      "Not changed: which stage the dashboard shows as current.",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
    if (path.normalize(staging) !== path.normalize(FETCHED))
      reviewer.unshift(`**Test data** — read from \`${staging}\`, not from the fetched list.`, "");

    const form = {
      "Medicine": product.name,
      "Which stage": w.stage,
      "What changes": lib.SEVERAL_LABEL,
      "The status of this stage": "done",
      "The date this stage was reached": human(first),
      "The sentence shown under this stage": w.sentence(mine, first),
      ...(stage.next ? { "What happens next": lib.CLEAR } : {}),
      ...(stage.nextDate ? { "The date that next step is expected": lib.CLEAR } : {}),
      "Source": src.label,
      "Date of the source": fetched,
      "Link or reference": `${refs.join(", ")} — ${mine[0].sourceUrl}`,
      "Anything the reviewer should know": reviewer.join("\n"),
    };
    const body = Object.entries(form).map(([k, v]) => `### ${k}\n\n${v}\n`).join("\n");

    // Exactly what intake will run on this body, so a broken one is never filed.
    const who = `${w.name} · ${product.name}`;
    const built = lib.buildProposal(lib.parseIssueBody(body), { data, sources, issue: { number: 0, user: lib.BOT } });
    if (!built.ok) { log.push(`${who}: NOT proposed — ${built.errors.join(" ")}`); continue; }
    const checked = lib.checkApplied(data, built.proposal);
    if (checked.errors.length) { log.push(`${who}: NOT proposed — it would break the data rules: ${checked.errors.join("; ")}`); continue; }
    if (lib.rejectionsOf(built.proposal, decisions).length) {
      log.push(`${who}: rejected before with exactly this content (${built.proposal.fingerprint}) — not proposed again.`);
      continue;
    }

    const file = path.join(outDir, `${product.id}-${w.name.toLowerCase().replace(/\W+/g, "-")}.md`);
    fs.writeFileSync(file, body);
    manifest.push({ title: lib.titleFor(built.proposal), watcher: w.name, product: product.id, fingerprint: built.proposal.fingerprint, bodyFile: file });
    log.push(`${who}: PROPOSED — ${w.stage} done, ${human(first)}, from ${refs.join(", ")}.`);
  }
}

fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Read ${staging}.`);
log.forEach((l) => console.log("- " + l));
blocked.forEach((l) => console.log("- BLOCKED " + l));
console.log(`${manifest.length} proposal(s) written to ${path.relative(ROOT, outDir) || outDir}.`);
// A blocked source is a fetcher problem worth a red run, even if the other
// source still proposed something.
if (blocked.length) process.exit(1);
