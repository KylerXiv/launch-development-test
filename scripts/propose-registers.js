#!/usr/bin/env node
// The source watcher for the national medicine registers: Nigeria's NAFDAC
// Green Book (sourcing/staging/nafdac_registrations.csv) and Tanzania's TMDA
// register (sourcing/staging/tmda_registrations.csv). When a register lists a
// portfolio medicine as currently registered in its country, and the
// dashboard's country map does not show that country, it writes a proposal in
// the issue form's own layout, so intake, the pull request, the preview and
// the approval treat it exactly as they treat a person's.
//
//   node scripts/propose-registers.js [--nafdac <csv>] [--tmda <csv>]
//        [--previous-nafdac <csv>] [--previous-tmda <csv>] [--only NAFDAC|TMDA]
//        [--out <dir>] [--data <products.js>]
//
// What one proposal does, as a unit:
//   - draws the country on the medicine's country map, as "registered";
//   - raises the "Registered" count beside the map to at least the number of
//     countries the map draws (proposal-lib.js);
//   - if the medicine's "Country registration" stage has not started, marks
//     it in progress, with the first registration's date and a factual
//     sentence naming the register's references. A stage already under way
//     or done keeps its curated wording.
// Only one proposal per medicine touches a stage that has not started, the
// register with the earlier first registration; the other only draws its
// country. Otherwise approving both would let the second overwrite the first.
//
// Left for a person, in the run summary: a country the map shows as
// registered where the register now lists nothing current (lapsed
// registrations are a story), and registrations the register still calls
// active after their expiry date.
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
const STAGE = "Country registration";
// A register that loses more than a fifth of its rows in a month is an export
// that changed, not a wave of cancellations.
const MIN_KEEP = 0.8;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

const REGISTERS = [
  {
    name: "NAFDAC",
    country: "NGA",
    sourceId: "nafdac",
    fetched: "sourcing/staging/nafdac_registrations.csv",
    // The Green Book's own word, as fetch-nafdac.js stages it.
    current: (r) => /^active$/i.test(r.status),
    ref: (r) => r.nafdacNo,
    holder: (r) => r.applicant,
    since: (r) => r.approvalDate,
  },
  {
    name: "TMDA",
    country: "TZA",
    sourceId: "tmda",
    fetched: "sourcing/staging/tmda_registrations.csv",
    current: (r) => /^registered/i.test(r.status),
    ref: (r) => r.certificateNo,
    holder: (r) => r.registrant || r.manufacturer,
    since: (r) => r.issueDate,
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const human = (iso) => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };
const uniq = (xs) => [...new Set(xs.filter(Boolean))];
const listed = (xs, n) => (xs.length > n ? xs.slice(0, n).join(", ") + ` and ${xs.length - n} more` : xs.join(", "));

function main(argv) {
  const arg = (k) => { const i = argv.indexOf(k); return i < 0 ? undefined : argv[i + 1]; };
  const read = (f) => fs.readFileSync(path.resolve(ROOT, f), "utf8");
  const outDir = path.resolve(ROOT, arg("--out") || "proposals-out");
  const only = arg("--only");
  if (only && !REGISTERS.some((w) => w.name === only)) throw new Error("--only must be one of " + REGISTERS.map((w) => w.name).join(", "));

  const { data } = lib.readData(arg("--data") && path.resolve(ROOT, arg("--data")));
  const sources = lib.readSources();
  const decisions = lib.readDecisions();
  const stageIdx = data.stages.indexOf(STAGE);
  if (stageIdx < 0) throw new Error(`no stage named "${STAGE}" in data/products.js`);

  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [], log = [], blocked = [], candidates = [];

  // Pass 1: what each register now says about each medicine in its country.
  for (const w of REGISTERS) {
    if (only && w.name !== only) continue;
    const key = w.name.toLowerCase();
    const file = arg("--" + key) || w.fetched;
    const rows = parseCsv(read(file)).filter((r) => r.iso3 === w.country);
    const prev = arg("--previous-" + key);
    if (prev) {
      const was = parseCsv(read(prev)).filter((r) => r.iso3 === w.country).length;
      if (was && rows.length < was * MIN_KEEP) {
        blocked.push(`${w.name}: rows fell from ${was} to ${rows.length} since the last fetch — a changed export, not cancellations. Nothing proposed from it; check the fetcher.`);
        continue;
      }
    }
    const src = sources.find((s) => s.id === w.sourceId);
    if (!src) throw new Error(`source "${w.sourceId}" is not in data/sources.js`);
    const country = lib.countryName(w.country);
    log.push(`${w.name}: ${rows.length} portfolio rows for ${country}.`);

    for (const product of data.products) {
      const who = `${w.name} · ${product.name}`;
      const theirs = rows.filter((r) => r.productId === product.id);
      // The register's own word, unless its own expiry date has passed by
      // the day it was read: then it is a story for a person.
      const expired = theirs.filter((r) => w.current(r) && ISO.test(r.expiryDate) && r.expiryDate < (r.retrievedDate || ""));
      const current = theirs.filter((r) => w.current(r) && !expired.includes(r))
        .sort((a, b) => String(w.since(a)).localeCompare(String(w.since(b))) || String(w.ref(a)).localeCompare(String(w.ref(b))));
      if (expired.length)
        log.push(`${who}: left for a person — ${expired.length} registration(s) the register calls current past their expiry date (${listed(expired.map(w.ref), 5)}).`);

      const map = product.detail && product.detail.countries;
      const drawn = map && (map.list || []).find((e) => e.iso3 === w.country);
      if (!current.length) {
        if (drawn && drawn.level === "registered")
          log.push(`${who}: left for a person — the map shows ${country} as registered, but the register lists ${theirs.length ? "no current registration (" + theirs.length + " lapsed or inactive)" : "nothing for it"}.`);
        continue;
      }
      if (drawn) { log.push(`${who}: ${country} already on the map (${drawn.level}) — nothing to propose (${current.length} current).`); continue; }
      candidates.push({ w, src, file, product, country, current, first: current.map(w.since).filter((d) => ISO.test(d)).sort()[0] || "" });
    }
  }

  // One proposal per medicine may start its Country registration stage: the
  // register with the earlier first registration.
  const starts = new Map();
  for (const c of candidates) {
    if (c.product.stages[stageIdx].status !== "idle" || !c.first) continue;
    const had = starts.get(c.product.id);
    if (!had || c.first < had.first) starts.set(c.product.id, c);
  }

  // Pass 2: write each proposal.
  for (const c of candidates) {
    const { w, src, file, product, country, current } = c;
    const who = `${w.name} · ${product.name}`;
    const stage = product.stages[stageIdx];
    const startsStage = starts.get(product.id) === c;
    const refs = current.map(w.ref).filter(Boolean);
    const holders = uniq(current.map(w.holder));
    const fetched = current.map((r) => r.retrievedDate).filter((d) => ISO.test(d)).sort().pop() || new Date().toISOString().slice(0, 10);
    const n = current.length === 1 ? "1 presentation" : `${current.length} presentations`;

    const reviewer = [
      `Filed automatically by the source watcher (${w.name}) from \`${file}\`, fetched ${fetched}.`,
      "",
      ...current.slice(0, 10).map((r) => `- ${w.ref(r)} · ${r.productName || r.brandName || ""} · ${r.status} since ${w.since(r) || "—"}, expires ${r.expiryDate || "—"} · ${w.holder(r) || "—"}`),
      ...(current.length > 10 ? [`- … and ${current.length - 10} more`] : []),
      "",
      `This draws ${country} on the country map as registered${product.detail.countries ? "" : ", the medicine's first country, so the map is created as a draft with a warning that only register-verified countries are shown"}.`,
      startsStage
        ? "The Country registration stage had not started, so it is marked in progress, with the first registration's date and a factual sentence. The sentence is a draft: if it should read differently, reject with `rejected:wrong-value` and file your own wording."
        : stage.status === "idle"
          ? "The Country registration stage is left as it is: another register's proposal for this medicine, with an earlier first registration, starts it."
          : "The Country registration stage is already under way or done, so its wording is left as it is.",
      "The register's status is what the watcher reads. It does not say the medicine is on sale.",
    ];
    if (path.normalize(file) !== path.normalize(w.fetched))
      reviewer.unshift(`**Test data** — read from \`${file}\`, not from the fetched register.`, "");

    const form = {
      "Medicine": product.name,
      "Which stage": STAGE,
      "What changes": lib.SEVERAL_LABEL,
      ...(startsStage ? {
        "The status of this stage": "in progress",
        "The date this stage was reached": `First registered ${human(c.first)} (${country})`,
        "The sentence shown under this stage":
          `Registered in ${country}: ${n} (${w.name} ${listed(refs, 5)}; ${listed(holders, 3)}), the first on ${human(c.first)}.`,
      } : {}),
      [lib.COUNTRY_LABEL]: `${w.country}: registered`,
      "Source": src.label,
      "Date of the source": fetched,
      "Link or reference": `${listed(refs, 5)} — ${current[0].sourceUrl}`,
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

    const out = path.join(outDir, `${product.id}-${w.name.toLowerCase()}.md`);
    fs.writeFileSync(out, body);
    manifest.push({ title: lib.titleFor(built.proposal), watcher: w.name, product: product.id, fingerprint: built.proposal.fingerprint, bodyFile: out });
    log.push(`${who}: PROPOSED — ${country} on the map as registered${startsStage ? ", and the stage started" : ""}, from ${listed(refs, 5)}.`);
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  log.forEach((l) => console.log("- " + l));
  blocked.forEach((l) => console.log("- BLOCKED " + l));
  console.log(`${manifest.length} proposal(s) written to ${path.relative(ROOT, outDir) || outDir}.`);
  return blocked.length ? 1 : 0;
}

module.exports = { REGISTERS, main };

if (require.main === module) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (err) { console.error("propose-registers: " + err.message); process.exit(1); }
}
