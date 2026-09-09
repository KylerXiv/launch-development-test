#!/usr/bin/env node
// WHO Malaria Threat Map normalizer — turns the manually downloaded
// molecular-marker (MM) extract into the third study-result layer on
// illustrated-journey-dashboard.html:
//   node scripts/normalize-molecular-markers.js [studyinfo.csv] [genemutations.csv]
//
// Where the input comes from:
//   1. Open https://apps.who.int/malaria/maps/threats/
//   2. DATA DOWNLOAD -> theme "Antimalarial drug efficacy and resistance"
//      -> "Molecular markers of drug resistance" -> Excel.
//   3. python3 scripts/mtm-xlsx-to-csv.py <download>.xlsx sourcing/raw/mtm \
//        --prefix <date>
//
// Step 3 is NOT the manual Excel export that normalize-resistance.js documents
// for the TES extract. An .xlsx is a zip of XML and Python's standard library
// reads both, so the conversion is scripted and adds no dependency. The
// archived CSVs remain the reproducible input.
//
// Outputs:
//   sourcing/staging/resistance_mm.csv    auditable intermediate, one row per
//                                         study with both metrics resolved
//   data/molecular-markers.js             window.LAUNCH_MOLECULAR_MARKERS
//
// The envelope (meta/fields/coded/dict/studies/<layer>) is deliberately the
// SAME SHAPE as data/resistance.js, so scripts/validate-data.js checks both
// through one code path and the page can treat the two datasets
// interchangeably behind its layer switch.
//
// Source: WHO Global Malaria Programme, Malaria Threat Maps. Use of the data
// is subject to the WHO Terms and Conditions for data compilations, archived
// verbatim next to the data in sourcing/raw/mtm/<date>-disclaimer.csv.
//
// Requires Node 18+. No dependencies.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const RAW = path.join(root, "sourcing", "raw", "mtm");
const EXTRACT = "2026-09-09";
const IN_STUDIES = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(RAW, EXTRACT + "-mm-studyinfo.csv");
const IN_GENOS = process.argv[3]
  ? path.resolve(process.cwd(), process.argv[3])
  : path.join(RAW, EXTRACT + "-mm-genemutations.csv");
const STAGING = path.join(root, "sourcing", "staging", "resistance_mm.csv");
const OUT = path.join(root, "data", "molecular-markers.js");

const WHO_LAST_UPDATE = "2025-11-19";
const SOURCE_URL = "https://apps.who.int/malaria/maps/threats/";

// ---- what a dot means -------------------------------------------------------
// Printed verbatim under the map, same contract as the TES layers.
const RULE =
  "Each dot is the most recent survey year for that country, marker and species, " +
  "averaged across every site surveyed that year and weighted by the number of " +
  "samples genotyped — so a large survey counts for more than a small one. The " +
  "value is the share of samples carrying a resistance-associated genotype, not " +
  "the share carrying any mutation at all. No survey is excluded; click a dot to " +
  "see all of them.";

const SMALL_STUDY = 20;   // same threshold the TES layers use

// ---- the decision this file exists to make ---------------------------------
// WHO does NOT publish "percent resistant". It publishes the proportion of
// genotyped samples carrying each genotype, against a wild-type ("WT") row.
// The map metric therefore has to be DERIVED, and the derivation is a
// scientific choice with a large effect. Measured on this extract:
//
//   any non-WT mutation counted as resistance : 1,031 of 1,731 Pfkelch13
//                                               surveys read above zero
//   only WHO-validated markers counted        :   670 of 1,731
//
// 361 surveys flip. The difference is not noise — the single biggest
// contributor is A578S, the most common Pfkelch13 mutation in Africa in this
// extract (138 surveys), which WHO states explicitly is NOT associated with
// artemisinin partial resistance. In 52 surveys A578S is the ONLY non-WT
// genotype present, concentrated in Uganda (9), Comoros (5), Kenya (5),
// Angola (4) and Mali (4). Counting "any mutation" would paint those as
// resistance hotspots on the strength of a mutation WHO has ruled out.
//
// So the dot is built from validated markers only. `pAny` (any non-WT
// genotype) is carried on every study row alongside it, so the panel can show
// both and so switching the map to the looser definition is a one-line change
// rather than a re-derivation.
//
// VALIDATED Pfkelch13 markers of artemisinin partial resistance. This list is
// WHO's, not this repo's, and it CHANGES between WHO status reports as
// candidate markers are promoted — C469Y, R622I and A675V were candidates
// before they were validated. It must be re-checked against the current WHO
// report whenever the extract is refreshed; it is not derivable from the
// extract itself, which carries no classification column at all.
//
//   Source: WHO, "Report on antimalarial drug efficacy, resistance and
//   response: 10 years of surveillance (2010-2019)" and subsequent WHO
//   malaria threats/status reporting.
//   >>> FLAGGED FOR DOMAIN REVIEW — see docs/dev-13-resistance-handover.md D32.
const K13_VALIDATED = new Set([
  "F446I", "N458Y", "C469Y", "M476I", "Y493H", "R539T", "I543T",
  "P553L", "R561H", "P574L", "C580Y", "R622I", "A675V"
]);

// For the other three marker types the genotype vocabulary is binary and the
// mutant row IS the resistance-associated one — there is no validated/candidate
// distinction to make:
//   Pfcrt K76T                      "Pfcrt" (the K76T mutant) vs "WT"
//   Pfmdr1 amplifications           "MC" (multiple copies)    vs "WT" (1 copy)
//   Pfplasmepsin 2-3 amplifications "MC"                      vs "WT"
const BINARY_MUTANT = { "Pfcrt": 1, "MC": 1 };

// Genotype labels that are non-WT but carry no identity: WHO records that a
// mutation was found without saying which. They count toward pAny and can
// never count toward the validated metric. Counted and reported, not hidden.
const UNSPECIFIED = new Set(["unspecified", "others"]);

// Compound labels exist — "R539T/C580Y", "Y493H&C580Y", "V603I&WT" — an
// isolate carrying more than one genotype. Splitting them and testing each
// component moves 32 Pfkelch13 rows (~97 percentage-points of proportion
// mass) into the validated metric that exact string matching would have
// missed. An isolate carrying C580Y carries C580Y whatever else it carries.
const splitGenotype = (g) => g.split(/[/&+,]/).map((s) => s.trim()).filter(Boolean);
const isWT = (g) => g.trim().toUpperCase() === "WT";

// ---- ISO2 -> ISO3 -----------------------------------------------------------
// Embedded rather than pulled from a package, matching scripts/build-map.js and
// scripts/normalize-resistance.js. This extract reaches 12 countries/areas the
// TES extract never does (BW CV EC GF GT HN HT NI SA SS YT ZA) — mostly the
// Americas and southern Africa, where chloroquine-era Pfcrt surveys were done
// but no recent therapeutic-efficacy study was. It carries no "TA" anomaly:
// Tanzania is coded TZ throughout, so normalize-resistance.js's TA->TZA
// correction has no counterpart here.
const A2_TO_A3 = {
  AF:"AFG",AO:"AGO",BD:"BGD",BF:"BFA",BI:"BDI",BJ:"BEN",BO:"BOL",BR:"BRA",BT:"BTN",
  BW:"BWA",CD:"COD",CF:"CAF",CG:"COG",CI:"CIV",CM:"CMR",CN:"CHN",CO:"COL",CV:"CPV",
  DJ:"DJI",EC:"ECU",ER:"ERI",ET:"ETH",GA:"GAB",GF:"GUF",GH:"GHA",GM:"GMB",GN:"GIN",
  GQ:"GNQ",GT:"GTM",GW:"GNB",GY:"GUY",HN:"HND",HT:"HTI",ID:"IDN",IN:"IND",IR:"IRN",
  KE:"KEN",KH:"KHM",KM:"COM",KP:"PRK",LA:"LAO",LR:"LBR",MG:"MDG",ML:"MLI",MM:"MMR",
  MR:"MRT",MW:"MWI",MY:"MYS",MZ:"MOZ",NE:"NER",NG:"NGA",NI:"NIC",NP:"NPL",PE:"PER",
  PG:"PNG",PH:"PHL",PK:"PAK",RW:"RWA",SA:"SAU",SB:"SLB",SD:"SDN",SL:"SLE",SN:"SEN",
  SO:"SOM",SR:"SUR",SS:"SSD",ST:"STP",TD:"TCD",TG:"TGO",TH:"THA",TL:"TLS",TZ:"TZA",
  UG:"UGA",VE:"VEN",VN:"VNM",VU:"VUT",YE:"YEM",YT:"MYT",ZA:"ZAF",ZM:"ZMB",ZW:"ZWE"
};

// ---- CSV --------------------------------------------------------------------
// Same minimal RFC4180 reader as normalize-resistance.js — institution names in
// DATA_SOURCE contain commas, so splitting on "," is not safe.
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
  return rows.filter((r) => r.length > 1 || r[0] !== "");
}
const csvCell = (v) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const round = (n, p) => Math.round(n * 10 ** p) / 10 ** p;
const clamp = (n) => Math.min(100, Math.max(0, n));

function readTable(file) {
  if (!fs.existsSync(file)) {
    console.error("Input not found: " + file + "\nSee the download steps at the top of this file.");
    process.exit(1);
  }
  const table = parseCsv(fs.readFileSync(file, "utf8"));
  // The WHO export is UTF-8 with a BOM on the first header cell.
  const header = table[0].map((h) => h.replace(/^﻿/, "").trim());
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  return { header, idx, rows: table.slice(1) };
}

const A = readTable(IN_STUDIES);
const B = readTable(IN_GENOS);
for (const need of ["ID", "MM_TYPE", "COUNTRY_NAME", "ISO2", "ADMIN2", "SITE_NAME",
                    "LATITUDE", "LONGITUDE", "YEAR_START", "PLASMODIUM_SPECIES",
                    "SAMPLE_SIZE", "DATA_SOURCE"]) {
  if (!(need in A.idx)) {
    console.error(`Column "${need}" missing from the study sheet — the WHO export layout changed.\nColumns seen: ` + A.header.join(", "));
    process.exit(1);
  }
}
for (const need of ["ID", "GENOTYPE", "PROPORTION"]) {
  if (!(need in B.idx)) {
    console.error(`Column "${need}" missing from the genotype sheet — the WHO export layout changed.\nColumns seen: ` + B.header.join(", "));
    process.exit(1);
  }
}

// ---- join genotypes onto studies -------------------------------------------
// The extract is two related sheets, unlike the flat TES file: one row per
// survey, and one row per (survey, genotype). Everything below is keyed on ID.
const genos = new Map();
for (const row of B.rows) {
  const id = (row[B.idx.ID] || "").trim();
  if (!id) continue;
  const name = (row[B.idx.GENOTYPE] || "").trim();
  const p = parseFloat(row[B.idx.PROPORTION]);
  if (!genos.has(id)) genos.set(id, []);
  genos.get(id).push({ name, p: Number.isFinite(p) ? p : null });
}

// ---- resolve one study's two metrics ---------------------------------------
// pAny  share of samples carrying ANY non-WT genotype
// p     share carrying a RESISTANCE-ASSOCIATED genotype (the map metric)
//
// pAny prefers 100 - WT over summing the mutant rows, and falls back to the sum
// when no WT row exists. Both are needed and neither alone is enough:
//   * 1,201 surveys list ONLY a WT row. Summing mutants would read 0% for all
//     of them, but 100 - WT is right (and for one of them — South Sudan 2019,
//     WT 98% — it is 2%, not 0%).
//   *   295 surveys list NO WT row. 100 - WT is unavailable; the listed
//     genotypes are the mutant fraction and sum to 100 in 281 of them.
// Where both are available they agree within 0.5pp in 1,346 of 1,373 surveys;
// the 27 that disagree are mixed infections counted under two genotypes, and
// 100 - WT is the one that cannot exceed 100.
function resolve(type, rows) {
  const wt = rows.find((g) => isWT(g.name) && g.p !== null);
  const muts = rows.filter((g) => !isWT(g.name) && g.p !== null);
  const pAny = wt ? clamp(100 - wt.p)
                  : clamp(muts.reduce((a, g) => a + g.p, 0));

  let p, unspec = false;
  if (type === "Pfkelch13") {
    // Only validated markers. An "unspecified"/"others" row cannot be
    // classified, so it cannot count here — flagged instead.
    p = clamp(muts.reduce((a, g) => {
      if (UNSPECIFIED.has(g.name.toLowerCase())) { unspec = true; return a; }
      const hit = splitGenotype(g.name).some((c) => K13_VALIDATED.has(c.toUpperCase()));
      return hit ? a + g.p : a;
    }, 0));
  } else {
    // Binary marker: the mutant row is the resistance-associated one. Where
    // only a WT row is listed the mutant share is its complement.
    const named = muts.filter((g) => splitGenotype(g.name).some((c) => BINARY_MUTANT[c]));
    p = named.length ? clamp(named.reduce((a, g) => a + g.p, 0)) : pAny;
  }
  // Mixed infections can push a sum a hair over its complement; the dot is a
  // share of samples and cannot exceed the share carrying anything at all.
  if (p > pAny) p = pAny;
  const top = muts.length
    ? muts.reduce((a, g) => (g.p > a.p ? g : a)).name
    : "";
  return { p: round(p, 2), pAny: round(pAny, 2), top, unspec };
}

// ---- collect every study ----------------------------------------------------
const stats = { total: 0, noGeno: 0, noValue: 0, noIso: 0, noCoords: 0, noYear: 0,
                kept: 0, small: 0, noN: 0, unspec: 0, noWt: 0, wtOnly: 0 };
const studies = [];

for (const row of A.rows) {
  if (!row || row.length < A.header.length) continue;
  stats.total++;
  const get = (k) => (row[A.idx[k]] || "").trim();

  const id = get("ID");
  const iso3 = A2_TO_A3[get("ISO2").toUpperCase()];
  if (!iso3) { stats.noIso++; continue; }

  const rows = genos.get(id);
  if (!rows || !rows.length) { stats.noGeno++; continue; }
  if (!rows.some((g) => g.p !== null)) { stats.noValue++; continue; }

  const year = parseInt(get("YEAR_START"), 10);
  if (!Number.isInteger(year)) { stats.noYear++; continue; }
  const lat = parseFloat(get("LATITUDE")), lon = parseFloat(get("LONGITUDE"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) { stats.noCoords++; continue; }

  const type = get("MM_TYPE");
  const { p, pAny, top, unspec } = resolve(type, rows);
  if (unspec) stats.unspec++;
  if (!rows.some((g) => isWT(g.name))) stats.noWt++;
  else if (!rows.some((g) => !isWT(g.name))) stats.wtOnly++;

  const n = parseInt(get("SAMPLE_SIZE"), 10);
  if (!Number.isFinite(n)) stats.noN++;
  else if (n < SMALL_STUDY) stats.small++;
  stats.kept++;

  studies.push({
    iso3,
    country: get("COUNTRY_NAME"),
    marker: type,
    species: get("PLASMODIUM_SPECIES"),
    year, p, pAny,
    n: Number.isFinite(n) ? n : null,
    top,
    site: get("SITE_NAME"),
    region: get("ADMIN2"),
    lat: round(lat, 4), lon: round(lon, 4),
    source: get("DATA_SOURCE"),
    citation: "CITATION_URL" in A.idx ? get("CITATION_URL") : ""
  });
}

studies.sort((a, b) =>
  a.marker.localeCompare(b.marker) || a.species.localeCompare(b.species) ||
  a.iso3.localeCompare(b.iso3) || b.year - a.year || a.site.localeCompare(b.site));

// ---- aggregate to one dot per country x marker x species -------------------
// Identical rule to normalize-resistance.js: latest year wins, sites within
// that year combine into a sample-weighted mean, position is the weighted
// centroid. Kept identical on purpose — a reader switching layers must not
// have to relearn what a dot means.
function aggregate(rows, valueOf) {
  const byCell = new Map();
  for (const s of rows) {
    if (valueOf(s) === null) continue;
    const key = s.marker + " " + s.species + " " + s.iso3;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(s);
  }
  const layer = {};
  const stat = { cells: 0, weightedCells: 0, unweighted: 0 };
  for (const group of byCell.values()) {
    const year = Math.max(...group.map((s) => s.year));
    const inYear = group.filter((s) => s.year === year);
    const anyN = inYear.some((s) => Number.isInteger(s.n) && s.n > 0);
    const wOf = (s) => (anyN ? (Number.isInteger(s.n) && s.n > 0 ? s.n : 0) : 1);
    const W = inYear.reduce((a, s) => a + wOf(s), 0) || inYear.length;
    const v = inYear.reduce((a, s) => a + valueOf(s) * wOf(s), 0) / W;
    const lat = inYear.reduce((a, s) => a + s.lat * wOf(s), 0) / W;
    const lon = inYear.reduce((a, s) => a + s.lon * wOf(s), 0) / W;
    const samples = inYear.reduce((a, s) => a + (Number.isInteger(s.n) ? s.n : 0), 0);
    if (inYear.length > 1) stat.weightedCells++;
    if (!anyN) stat.unweighted++;
    const s0 = inYear[0];
    ((layer[s0.marker] = layer[s0.marker] || {})[s0.species] =
      layer[s0.marker][s0.species] || {})[s0.iso3] = {
        v: round(v, 2), year, n: samples, sites: inYear.length,
        lat: round(lat, 4), lon: round(lon, 4),
        site: inYear.length === 1 ? s0.site : "", region: inYear.length === 1 ? s0.region : "",
        small: samples > 0 && samples < SMALL_STUDY
      };
    stat.cells++;
  }
  return { layer, ...stat };
}

const mm = aggregate(studies, (s) => s.p);

// ---- staging CSV ------------------------------------------------------------
const cols = ["iso3","country","marker","species","year","resistant_pct","any_mutation_pct",
              "top_genotype","sample_size","site","region","latitude","longitude",
              "data_source","citation_url"];
fs.mkdirSync(path.dirname(STAGING), { recursive: true });
fs.writeFileSync(STAGING,
  cols.join(",") + "\n" +
  studies.map((s) => [s.iso3, s.country, s.marker, s.species, s.year, s.p, s.pAny, s.top,
                      s.n === null ? "" : s.n, s.site, s.region, s.lat, s.lon, s.source, s.citation]
                      .map(csvCell).join(",")).join("\n") + "\n");

// ---- data/molecular-markers.js ---------------------------------------------
const FIELDS = ["iso3","country","marker","species","year","p","pAny","n","top",
                "site","region","lat","lon","source","citation"];
const CODED = ["country", "marker", "species", "top", "source", "citation"];
const dict = {};
for (const f of CODED) dict[f] = [...new Set(studies.map((s) => s[f]))].sort();
const codeIdx = {};
for (const f of CODED) codeIdx[f] = new Map(dict[f].map((v, i) => [v, i]));
const encode = (s) => FIELDS.map((f) => (CODED.includes(f) ? codeIdx[f].get(s[f]) : s[f]));

const markers = Object.keys(mm.layer).sort();
const payload = {
  meta: {
    source: "WHO Global Malaria Programme — Malaria Threat Maps, molecular markers of drug resistance",
    sourceUrl: SOURCE_URL,
    extract: EXTRACT,
    whoLastDataUpdate: WHO_LAST_UPDATE,
    metric: "Resistance-associated genotype, % of samples genotyped",
    metrics: {
      molecularMarkers: {
        short: "Molecular markers",
        full: "Samples carrying a resistance-associated genotype, % of those genotyped — " +
              "for Pfkelch13 this counts WHO-validated markers of artemisinin partial " +
              "resistance only, not every mutation found"
      }
    },
    // Not "verified": the validated-marker list is WHO's classification
    // transcribed by hand and has not had domain review. See D32.
    status: "draft",
    rule: RULE,
    smallStudy: SMALL_STUDY,
    studyCount: studies.length,
    cellCount: mm.cells,
    cellCountByLayer: { molecularMarkers: mm.cells },
    markers,
    // Carried so the page can label a marker without hardcoding WHO's biology.
    markerDrug: {
      "Pfkelch13": "Artemisinin (all ACTs)",
      "Pfplasmepsin 2-3 amplifications": "Piperaquine",
      "Pfmdr1 amplifications": "Mefloquine, lumefantrine",
      "Pfcrt K76T": "Chloroquine"
    },
    validatedK13: [...K13_VALIDATED].sort(),
    derivation: "Derived from WHO genotype proportions, which carry no " +
                "resistant/susceptible classification of their own. See the " +
                "header of scripts/normalize-molecular-markers.js."
  },
  fields: FIELDS,
  coded: CODED,
  dict,
  studies: studies.map(encode),
  molecularMarkers: mm.layer
};

const file =
  "// GENERATED by scripts/normalize-molecular-markers.js from the WHO Malaria\n" +
  "// Threat Maps molecular-marker extract in sourcing/raw/mtm/.\n" +
  "// Do not edit by hand; rerun the normalizer instead.\n" +
  "//\n" +
  "// Source: WHO Global Malaria Programme. `studies` is every survey in the\n" +
  "// extract and backs the click-through panel. `molecularMarkers` holds the\n" +
  "// AGGREGATED country values the dots are drawn from.\n" +
  "//\n" +
  "// `p` is DERIVED, not published by WHO: the share of samples carrying a\n" +
  "// resistance-associated genotype. For Pfkelch13 that means WHO-VALIDATED\n" +
  "// markers only — `pAny` alongside it is the share carrying any non-WT\n" +
  "// genotype, which is a materially larger and less defensible number.\n" +
  "window.LAUNCH_MOLECULAR_MARKERS = " + JSON.stringify(payload) + ";\n";
fs.writeFileSync(OUT, file);

// ---- report -----------------------------------------------------------------
const rel = (p) => path.relative(root, p);
const byMarker = {};
for (const s of studies) byMarker[s.marker] = (byMarker[s.marker] || 0) + 1;
const nonZero = studies.filter((s) => s.p > 0).length;
const nonZeroAny = studies.filter((s) => s.pAny > 0).length;

console.log(`Read ${stats.total} surveys from ${rel(IN_STUDIES)}`);
console.log(`     ${B.rows.length} genotype rows from ${rel(IN_GENOS)}`);
console.log(`  kept ${stats.kept} surveys — no marker, species or sample-size filter applied`);
console.log(`  dropped ${stats.noGeno} with no genotype rows, ${stats.noValue} with no usable ` +
            `proportion, ${stats.noCoords} with no coordinates, ${stats.noYear} with no year, ` +
            `${stats.noIso} with an unmappable ISO2`);
for (const m of markers) console.log(`    ${m}: ${byMarker[m]}`);
console.log(`  ${stats.wtOnly} surveys list only a wild-type row (metric is 100 - WT); ` +
            `${stats.noWt} list no wild-type row (metric is the sum of listed genotypes)`);
console.log(`  ${stats.unspec} Pfkelch13 surveys carry an "unspecified"/"others" genotype ` +
            `that cannot be classified — counted in pAny, never in p`);
console.log(`  ${stats.noN} surveys have no sample size; ${stats.small} have fewer than ` +
            `${SMALL_STUDY} samples (kept, flagged on the map)`);
console.log(`Wrote ${rel(STAGING)} — ${studies.length} surveys`);
console.log(`Wrote ${rel(OUT)} — ${markers.length} markers, ${Math.round(file.length / 1024)} KB`);
console.log(`  molecularMarkers: ${mm.cells} country dots ` +
            `(${mm.weightedCells} average several sites, ${mm.unweighted} have no sample sizes)`);
console.log(`  ${nonZero} surveys read above zero on validated markers; ` +
            `${nonZeroAny} would on any mutation — the ${nonZeroAny - nonZero} difference is the ` +
            `derivation decision, not the data (see the header, and D32)`);
