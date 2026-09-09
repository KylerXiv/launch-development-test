#!/usr/bin/env node
// WHO Malaria Threat Map normalizer — turns the manually downloaded
// therapeutic-efficacy-study (TES) extract into the dataset behind the
// resistance overlay on illustrated-journey-dashboard.html:
//   node scripts/normalize-resistance.js [path-to-tes-csv]
//
// Where the input comes from (the one manual step — ~2 minutes):
//   1. Open https://apps.who.int/malaria/maps/threats/
//   2. DATA DOWNLOAD → theme "Antimalarial drug efficacy and resistance"
//      → "Therapeutic efficacy studies" → Excel.
//   3. Export the workbook's "Data" sheet to CSV and drop it in
//      sourcing/raw/mtm/<date>-tes.csv.
//   (Step 3 is manual because .xlsx cannot be read without a dependency and
//   this repo has none. The archived CSV is the reproducible input — CI and
//   teammates run this script against it and never touch Excel.)
//
// Outputs:
//   sourcing/staging/resistance_tes.csv   auditable intermediate: every study
//                                         that survived parsing, one row each
//   data/resistance.js                    window.LAUNCH_RESISTANCE, committed:
//                                           .studies  every study (drill-down)
//                                           .treatmentFailure  aggregated dots
//                                           .delayedClearance  aggregated dots,
//                                             day-3 positivity from the SAME
//                                             extract — no second download
//
// NOTHING is filtered out. Every Plasmodium species is kept, and studies of
// any size are kept — the map flags small ones rather than hiding them. The
// only rows dropped are those WHO itself publishes without a usable value
// (a literal "NaN" in the failure column) or without coordinates; those are
// counted and reported, never silently discarded.
//
// Source: WHO Global Malaria Programme, Malaria Threat Maps. Use of the data
// is subject to the WHO Terms and Conditions for data compilations. WHO is
// credited on the page and in meta.source below.
//
// Requires Node 18+. No dependencies.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const IN = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(root, "sourcing", "raw", "mtm", "2026-09-05-tes.csv");
const STAGING = path.join(root, "sourcing", "staging", "resistance_tes.csv");
const OUT = path.join(root, "data", "resistance.js");

const EXTRACT = "2026-09-05";
const WHO_LAST_UPDATE = "2025-11-19";
const SOURCE_URL = "https://apps.who.int/malaria/maps/threats/";

// ---- aggregation rule -------------------------------------------------------
// Printed verbatim under the map. If this changes, the sentence on the page
// changes with it — a reader must never have to guess how a dot was derived.
const RULE =
  "Each dot is the most recent study year for that country, drug and species, " +
  "averaged across every site studied that year and weighted by the number of " +
  "patients — so a large study counts for more than a small one. No study is " +
  "excluded; click a dot to see all of them.";

// A dot resting on few patients is drawn differently by the renderer rather
// than dropped. This is the threshold it uses, kept here so the data file and
// the page agree on one number.
const SMALL_STUDY = 20;

// Per-protocol failure is the plainly-labelled percentage in the WHO glossary
// ("Percentage of patients with treatment failure"); the Kaplan-Meier estimate
// is carried alongside for reference but is not what the dot is built from.
const METRIC = "TREATMENT_FAILURE_PP";

// Delayed parasite clearance comes out of the SAME extract, a different column:
// the percentage of patients still parasitaemic on day 3 (72h after the first
// dose). No second download exists or is needed.
//
// It is aggregated by the identical rule and drawn with the identical four
// bands. That is not laziness — WHO's own alert threshold for suspected
// artemisinin partial resistance is >10% day-3 positivity, which falls exactly
// on an existing band edge (b2/b3), so the treatment-failure legend already
// puts the line where a reader needs it.
//
// Coverage differs from treatment failure and the difference is one-directional:
// of 1,642 rows, 1,633 carry a usable failure value and 1,188 a usable day-3
// value, 1,179 carry both. The 9 rows with day-3 but no failure value are the
// same 9 this script already drops, so they stay dropped and the row-keeping
// rule below is unchanged — keeping treatmentFailure and studies[] identical to
// before this layer existed. Checked before deciding: all 9 are older than the
// most recent year of the country x drug x species cell they belong to, so none
// creates a cell and none sets a cell's latest year. Excluding them moves no dot.
const METRIC_D3 = "POSITIVE_DAY_3 (days)";

// ---- ISO2 -> ISO3 -----------------------------------------------------------
// Embedded rather than pulled from a package, matching scripts/build-map.js.
const A2_TO_A3 = {
  AF:"AFG",AO:"AGO",BD:"BGD",BF:"BFA",BI:"BDI",BJ:"BEN",BO:"BOL",BR:"BRA",BT:"BTN",
  CD:"COD",CF:"CAF",CG:"COG",CI:"CIV",CM:"CMR",CN:"CHN",CO:"COL",DJ:"DJI",ER:"ERI",
  ET:"ETH",GA:"GAB",GH:"GHA",GM:"GMB",GN:"GIN",GQ:"GNQ",GW:"GNB",GY:"GUY",ID:"IDN",
  IN:"IND",IR:"IRN",KE:"KEN",KH:"KHM",KM:"COM",KP:"PRK",LA:"LAO",LR:"LBR",MG:"MDG",
  ML:"MLI",MM:"MMR",MR:"MRT",MW:"MWI",MY:"MYS",MZ:"MOZ",NE:"NER",NG:"NGA",NP:"NPL",
  PE:"PER",PG:"PNG",PH:"PHL",PK:"PAK",RW:"RWA",SB:"SLB",SD:"SDN",SL:"SLE",SN:"SEN",
  SO:"SOM",SR:"SUR",ST:"STP",TD:"TCD",TG:"TGO",TH:"THA",TL:"TLS",TZ:"TZA",UG:"UGA",
  VE:"VEN",VN:"VNM",VU:"VUT",YE:"YEM",ZM:"ZMB",ZW:"ZWE",

  // Source-data correction. 38 rows in the 2026-09-05 extract carry the
  // non-standard code "TA" with COUNTRY_NAME also "TA". Every one is a
  // Tanzanian site (Tabora, Bagamoyo, Kilombero, Igombe...) and the
  // latitude/longitude confirm it. Mapped to TZA rather than dropped, because
  // Tanzania is one of the two countries whose registrations are
  // register-verified in data/products.js — silently losing it would leave a
  // verified country looking like it had no data at all.
  TA:"TZA"
};

// ---- CSV --------------------------------------------------------------------
// Minimal RFC4180 reader — the WHO extract quotes fields containing commas
// (institution names in DATA_SOURCE), so splitting on "," is not safe.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || r[0] !== "");
}
const csvCell = (v) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const round = (n, p) => Math.round(n * 10 ** p) / 10 ** p;

// ---- read -------------------------------------------------------------------
if (!fs.existsSync(IN)) {
  console.error("Input not found: " + IN + "\nSee the download steps at the top of this file.");
  process.exit(1);
}
const table = parseCsv(fs.readFileSync(IN, "utf8"));
const header = table[0];
const idx = {};
header.forEach((h, i) => { idx[h.trim()] = i; });
for (const need of ["ISO2", "COUNTRY_NAME", "ADMIN2", "SITE_NAME", "LATITUDE", "LONGITUDE",
                    "YEAR_START", "DRUG_NAME", "PLASMODIUM_SPECIES", "SAMPLE_SIZE",
                    METRIC, "DATA_SOURCE"]) {
  if (!(need in idx)) {
    console.error(`Column "${need}" missing — the WHO export layout changed. Columns seen:\n  ` + header.join(", "));
    process.exit(1);
  }
}
const KM = "TREATMENT_FAILURE_KM", CITE = "CITATION_URL";

// ---- collect every study ----------------------------------------------------
const stats = { total: 0, noValue: 0, noIso: 0, noCoords: 0, kept: 0, taFixed: 0, small: 0 };
const studies = [];

for (let r = 1; r < table.length; r++) {
  const row = table[r];
  if (!row || row.length < header.length) continue;
  stats.total++;
  const get = (k) => (row[idx[k]] || "").trim();

  const a2 = get("ISO2").toUpperCase();
  const iso3 = A2_TO_A3[a2];
  if (!iso3) { stats.noIso++; continue; }

  const v = parseFloat(get(METRIC));           // WHO writes a literal "NaN" when unavailable
  const year = parseInt(get("YEAR_START"), 10);
  const n = parseInt(get("SAMPLE_SIZE"), 10);
  const lat = parseFloat(get("LATITUDE")), lon = parseFloat(get("LONGITUDE"));
  if (!Number.isFinite(v) || v < 0 || v > 100 || !Number.isInteger(year)) { stats.noValue++; continue; }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { stats.noCoords++; continue; }

  if (a2 === "TA") stats.taFixed++;
  if (Number.isFinite(n) && n < SMALL_STUDY) stats.small++;
  stats.kept++;
  const km = parseFloat(get(KM));
  // Nullable: a study can report a failure rate and no day-3 count. Rows whose
  // d3 is null are skipped by the delayedClearance aggregation, not zeroed —
  // "not measured" and "measured at 0%" are different findings.
  const d3raw = METRIC_D3 in idx ? parseFloat(get(METRIC_D3)) : NaN;
  const d3 = Number.isFinite(d3raw) && d3raw >= 0 && d3raw <= 100 ? round(d3raw, 2) : null;
  studies.push({
    iso3,
    country: a2 === "TA" ? "Tanzania" : get("COUNTRY_NAME"),
    drug: get("DRUG_NAME"),
    species: get("PLASMODIUM_SPECIES"),
    year, v: round(v, 2),
    km: Number.isFinite(km) ? round(km, 2) : null,
    d3,
    n: Number.isFinite(n) ? n : null,
    site: get("SITE_NAME"),
    region: get("ADMIN2"),
    lat: round(lat, 4), lon: round(lon, 4),
    source: get("DATA_SOURCE"),
    citation: CITE in idx ? get(CITE) : ""
  });
}

studies.sort((a, b) =>
  a.drug.localeCompare(b.drug) || a.species.localeCompare(b.species) ||
  a.iso3.localeCompare(b.iso3) || b.year - a.year || a.site.localeCompare(b.site));

// ---- aggregate to one dot per country x drug x species ----------------------
// Latest year wins; within that year every site is combined into a
// patient-weighted mean, so one tiny study cannot decide a country's colour.
// The dot's position is the patient-weighted centroid of those same sites, so
// it sits among the studies it summarises rather than at an arbitrary one.
// One function, called once per metric, so the two layers cannot drift apart:
// the same latest-year selection, the same patient weighting and the same
// centroid. `valueOf` returns the metric for a study, or null where that study
// did not measure it — nulls are excluded before the year is chosen, so a
// cell's "most recent year" is the most recent year THIS metric was measured,
// not the most recent year anything was.
function aggregate(rows, valueOf) {
  const byCell = new Map();
  for (const s of rows) {
    if (valueOf(s) === null) continue;
    const key = s.drug + " " + s.species + " " + s.iso3;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(s);
  }
  const layer = {};
  const stat = { cells: 0, weightedCells: 0, unweighted: 0 };
  for (const group of byCell.values()) {
    const year = Math.max(...group.map(s => s.year));
    const inYear = group.filter(s => s.year === year);
    // weight by patients; rows with no sample size fall back to equal weight so
    // they still contribute rather than vanishing
    const anyN = inYear.some(s => Number.isInteger(s.n) && s.n > 0);
    const wOf = (s) => (anyN ? (Number.isInteger(s.n) && s.n > 0 ? s.n : 0) : 1);
    const W = inYear.reduce((a, s) => a + wOf(s), 0) || inYear.length;
    const v = inYear.reduce((a, s) => a + valueOf(s) * wOf(s), 0) / W;
    const lat = inYear.reduce((a, s) => a + s.lat * wOf(s), 0) / W;
    const lon = inYear.reduce((a, s) => a + s.lon * wOf(s), 0) / W;
    const patients = inYear.reduce((a, s) => a + (Number.isInteger(s.n) ? s.n : 0), 0);
    if (inYear.length > 1) stat.weightedCells++;
    if (!anyN) stat.unweighted++;
    const s0 = inYear[0];
    ((layer[s0.drug] = layer[s0.drug] || {})[s0.species] =
      layer[s0.drug][s0.species] || {})[s0.iso3] = {
        v: round(v, 2), year, n: patients, sites: inYear.length,
        lat: round(lat, 4), lon: round(lon, 4),
        // the single site is worth naming when the dot rests on exactly one study
        site: inYear.length === 1 ? s0.site : "", region: inYear.length === 1 ? s0.region : "",
        small: patients > 0 && patients < SMALL_STUDY
      };
    stat.cells++;
  }
  return { layer, ...stat };
}

const tf = aggregate(studies, s => s.v);
const dc = aggregate(studies, s => s.d3);
const layer = tf.layer;
const cells = tf.cells, weightedCells = tf.weightedCells, unweighted = tf.unweighted;

// ---- staging CSV ------------------------------------------------------------
const cols = ["iso3","country","drug","species","year","value_pct","value_km_pct",
              "day3_positive_pct","sample_size","site","region","latitude","longitude",
              "data_source","citation_url"];
fs.mkdirSync(path.dirname(STAGING), { recursive: true });
fs.writeFileSync(STAGING,
  cols.join(",") + "\n" +
  studies.map(s => [s.iso3, s.country, s.drug, s.species, s.year, s.v, s.km === null ? "" : s.km,
                    s.d3 === null ? "" : s.d3,
                    s.n === null ? "" : s.n, s.site, s.region, s.lat, s.lon, s.source, s.citation]
                    .map(csvCell).join(",")).join("\n") + "\n");

// ---- data/resistance.js -----------------------------------------------------
// `studies` is stored as rows against a field list rather than as objects —
// the same 1,600 keys repeated 14 times each would roughly triple the file.
const FIELDS = ["iso3","country","drug","species","year","v","km","d3","n","site","region","lat","lon","source","citation"];
// These five columns repeat a handful of values across every row — the study
// institution alone is 112 KB of the raw file for 224 distinct strings. Storing
// them as indices into a lookup roughly halves the committed file, which
// matters because it is regenerated whole on every WHO extract.
const CODED = ["country", "drug", "species", "source", "citation"];
const dict = {};
for (const f of CODED) dict[f] = [...new Set(studies.map(s => s[f]))].sort();
const codeIdx = {};
for (const f of CODED) codeIdx[f] = new Map(dict[f].map((v, i) => [v, i]));
const encode = (s) => FIELDS.map(f => CODED.includes(f) ? codeIdx[f].get(s[f]) : s[f]);

const payload = {
  meta: {
    source: "WHO Global Malaria Programme — Malaria Threat Maps, therapeutic efficacy studies",
    sourceUrl: SOURCE_URL,
    extract: EXTRACT,
    whoLastDataUpdate: WHO_LAST_UPDATE,
    metric: "Treatment failure (per-protocol), % of evaluable patients",
    // Per-layer labels, keyed by the layer name the page's radio uses. `metric`
    // above is kept because the validator requires it and it names the default
    // layer; the page reads `metrics` so the legend title and the note follow
    // whichever layer is showing.
    metrics: {
      treatmentFailure: {
        short: "Treatment failure",
        full: "Treatment failure (per-protocol), % of evaluable patients"
      },
      delayedClearance: {
        short: "Delayed parasite clearance",
        full: "Patients still parasitaemic on day 3, % of those tested — WHO treats over 10% as a signal of suspected artemisinin partial resistance"
      }
    },
    status: "draft",
    rule: RULE,
    smallStudy: SMALL_STUDY,
    studyCount: studies.length,
    // Summed across every layer, because that is what the validator counts.
    cellCount: cells + dc.cells,
    cellCountByLayer: { treatmentFailure: cells, delayedClearance: dc.cells }
  },
  fields: FIELDS,
  coded: CODED,          // these columns hold an index into dict[<column>]
  dict,
  studies: studies.map(encode),
  treatmentFailure: layer,
  delayedClearance: dc.layer
};

const file =
  "// GENERATED by scripts/normalize-resistance.js from the WHO Malaria Threat\n" +
  "// Maps therapeutic-efficacy extract in sourcing/raw/mtm/.\n" +
  "// Do not edit by hand; rerun the normalizer instead.\n" +
  "//\n" +
  "// Source: WHO Global Malaria Programme. `studies` is every study in the\n" +
  "// extract (all species, all sample sizes) and backs the click-through panel.\n" +
  "// `treatmentFailure` holds the AGGREGATED country values the dots are drawn\n" +
  "// from — these are derived by meta.rule, not WHO's own country figures, and\n" +
  "// the rule is shown on the page beside the map.\n" +
  "window.LAUNCH_RESISTANCE = " + JSON.stringify(payload) + ";\n";
fs.writeFileSync(OUT, file);

// ---- report -----------------------------------------------------------------
const drugs = Object.keys(layer).length;
const species = new Set(studies.map(s => s.species));
console.log(`Read ${stats.total} rows from ${path.relative(root, IN)}`);
console.log(`  kept ${stats.kept} studies — no species or sample-size filter applied`);
console.log(`  dropped ${stats.noValue} with no usable value (WHO writes "NaN"), ` +
            `${stats.noCoords} with no coordinates, ${stats.noIso} with an unmappable ISO2`);
console.log(`  "TA" -> TZA correction applied to ${stats.taFixed}; ` +
            `${stats.small} studies have fewer than ${SMALL_STUDY} patients (kept, flagged on the map)`);
console.log(`Wrote ${path.relative(root, STAGING)} — ${studies.length} studies`);
const d3Studies = studies.filter(s => s.d3 !== null).length;
console.log(`Wrote ${path.relative(root, OUT)} — ${drugs} drugs x ${species.size} species, ` +
            `${Math.round(file.length / 1024)} KB`);
console.log(`  treatmentFailure: ${cells} country dots ` +
            `(${weightedCells} average several sites, ${unweighted} have no sample sizes)`);
console.log(`  delayedClearance: ${dc.cells} country dots from ${d3Studies} studies ` +
            `that report day-3 positivity (${dc.weightedCells} average several sites, ` +
            `${dc.unweighted} have no sample sizes)`);
