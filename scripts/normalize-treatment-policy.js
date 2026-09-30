#!/usr/bin/env node
// WHO national treatment-policy normalizer — turns the World Malaria Report
// antimalarial drug policy annex (Annex 4B) into the dataset behind the
// "Show MFT policy" switch on illustrated-journey-dashboard.html:
//   node scripts/normalize-treatment-policy.js [path-to-annex-csv]
//
// Where the input comes from (the one manual step — ~2 minutes, once a year
// when WHO publishes the World Malaria Report, usually in December):
//   1. Open https://www.who.int/publications/m/item/annexes-world-malaria-report-2025
//      (or the next edition) and download "Annex 4B — Antimalarial drug policy"
//      (wmr<year>_annex_4b.xlsx).
//   2. Save it unchanged as sourcing/raw/wmr/<data-as-of date>-wmr<year>-annex-4b.xlsx.
//   3. Convert it with the repo's own stdlib-only converter:
//        python3 scripts/mtm-xlsx-to-csv.py <that .xlsx> sourcing/raw/wmr --prefix <same stem>
//      and rename the "…-annex-b.csv" it writes to <same stem>.csv.
//   4. Update EXTRACT / EDITION below and rerun this script.
//
// Outputs:
//   sourcing/staging/treatment_policy.csv   auditable intermediate: one row per
//                                           country x dashboard product, with
//                                           a 0/1 column per patient group
//   data/treatment-policy.js                window.LAUNCH_TREATMENT_POLICY,
//                                           committed, read by the page
//
// WHAT IS KEPT. Only the four dashboard products (GanLum, ALAQ, ASPY,
// DHA-PPQ). Every other drug in the annex is ignored and never written out —
// the page must not name drugs it does not track. For each product and each
// country, the patient groups whose policy column lists it:
//   tested     "Uncomplicated confirmed" P. falciparum — the first-line policy
//   untested   "Uncomplicated unconfirmed" P. falciparum (treated without a test)
//   severe     "Severe" malaria
//   pregnancy  "Prevention during pregnancy"
//   vivax      P. vivax "Treatment"
// Every country in the annex is written, including those that list none of
// the four products, so "not in policy" and "not in the WHO table" stay
// distinguishable on the map.
//
// WHAT THIS IS NOT. The annex says what national policy LISTS. It says nothing
// about what is procured, dispensed or used, and nothing about plans or
// pilots. The page says so; so does meta.rule below.
//
// Source: WHO, World Malaria Report 2025, Annex 4B. WHO's default publication
// licence, CC BY-NC-SA 3.0 IGO. WHO is credited in meta.source and on the page.
//
// Requires Node 18+. No dependencies. Byte-identical on rerun (no clock reads).

"use strict";
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const EXTRACT = "2025-09-29-wmr2025-annex-4b";
const IN = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.join(root, "sourcing", "raw", "wmr", EXTRACT + ".csv");
const STAGING = path.join(root, "sourcing", "staging", "treatment_policy.csv");
const OUT = path.join(root, "data", "treatment-policy.js");

const EDITION = "World Malaria Report 2025";
const POLICY_YEAR = 2024;
const SOURCE_URL = "https://www.who.int/publications/m/item/annexes-world-malaria-report-2025";
// The date a person last checked this file against the WHO source. Written by
// hand, not read from the clock, so reruns stay byte-identical. Update it
// whenever the annex is re-checked.
const LAST_VERIFIED = "2026-09-30";

const RULE =
  "Each country is placed in the first patient group whose national policy column lists the drug: " +
  "first-line for tested P. falciparum, then untested P. falciparum only, then P. vivax only, then " +
  "severe malaria or prevention in pregnancy only. The table lists what national policy allows, " +
  "not what is procured or used.";

// ---- the four dashboard products -------------------------------------------
// Keys are the product ids in data/products.js, so the page needs no mapping.
// Matched against each ";"-separated entry of an annex cell after dashes are
// normalised. Primaquine add-ons ("+PQ", "-PQ") do not change the product.
const PRODUCTS = {
  ganlum:  { name: "GanLum",  test: (t) => /GAN|KAF156|GANAPLACIDE/.test(t) },
  alaq:    { name: "ALAQ",    test: (t) => /\bAL[-+]AQ\b|\bALAQ\b|\bAL[-+]AS[-+]AQ\b/.test(t) },
  pyramax: { name: "ASPY",    test: (t) => /\bAS[-+]PY\b|\bPY[-+]AS\b|^PY$/.test(t) },
  dhappq:  { name: "DHA–PPQ", test: (t) => /\bDHA[-+]PPQ\b/.test(t) }
};
// Checked by hand against the 2025 annex, recorded so a reader does not have
// to re-derive them:
//  - Republic of Korea writes "PY" (and "PY-AS") with no partner drug named;
//    read as pyronaridine–artesunate, the only pyronaridine ACT in use.
//  - Ecuador's "AL+AM+PQ" is artemether (AM), not amodiaquine (AQ): not ALAQ.
//  - No country lists GanLum or ALAQ in 2024 policy.

const GROUPS = ["tested", "untested", "severe", "pregnancy", "vivax"];
const GROUP_LABEL = {
  tested: "Uncomplicated P. falciparum, confirmed (tested)",
  untested: "Uncomplicated P. falciparum, unconfirmed (untested)",
  severe: "Severe malaria",
  pregnancy: "Prevention during pregnancy",
  vivax: "P. vivax treatment"
};

// ---- region headers and country crosswalk -----------------------------------
const REGION = {
  "AFRICAN": "AFRO", "AMERICAS": "AMRO", "EASTERN MEDITERRANEAN": "EMRO",
  "SOUTH-EAST ASIA": "SEARO", "WESTERN PACIFIC": "WPRO", "EUROPEAN": "EURO"
};
// Annex names are WHO's official short names. Embedded rather than pulled from
// a package, matching the other normalizers. A name not in this table stops
// the script: a new or renamed country must be added on purpose.
const NAME_TO_ISO3 = {
  "Angola": "AGO", "Benin": "BEN", "Botswana": "BWA", "Burkina Faso": "BFA", "Burundi": "BDI",
  "Cameroon": "CMR", "Central African Republic": "CAF", "Chad": "TCD", "Comoros": "COM",
  "Congo": "COG", "Côte d'Ivoire": "CIV", "Democratic Republic of the Congo": "COD",
  "Equatorial Guinea": "GNQ", "Eritrea": "ERI", "Eswatini": "SWZ", "Ethiopia": "ETH",
  "Gabon": "GAB", "Gambia": "GMB", "Ghana": "GHA", "Guinea": "GIN", "Guinea-Bissau": "GNB",
  "Kenya": "KEN", "Liberia": "LBR", "Madagascar": "MDG", "Malawi": "MWI", "Mali": "MLI",
  "Mauritania": "MRT", "Mozambique": "MOZ", "Namibia": "NAM", "Niger": "NER", "Nigeria": "NGA",
  "Rwanda": "RWA", "Sao Tome and Principe": "STP", "Senegal": "SEN", "Sierra Leone": "SLE",
  "South Africa": "ZAF", "South Sudan": "SSD", "Togo": "TGO", "Uganda": "UGA",
  "Zambia": "ZMB", "Zimbabwe": "ZWE",
  "Bolivia (Plurinational State of)": "BOL", "Brazil": "BRA", "Colombia": "COL",
  "Costa Rica": "CRI", "Dominican Republic": "DOM", "Ecuador": "ECU", "French Guiana": "GUF",
  "Guatemala": "GTM", "Guyana": "GUY", "Haiti": "HTI", "Honduras": "HND", "Mexico": "MEX",
  "Nicaragua": "NIC", "Panama": "PAN", "Peru": "PER", "Venezuela (Bolivarian Republic of)": "VEN",
  "Suriname": "SUR", "Belize": "BLZ", "El Salvador": "SLV",
  "Afghanistan": "AFG", "Djibouti": "DJI", "Iran (Islamic Republic of)": "IRN",
  "Pakistan": "PAK", "Somalia": "SOM", "Sudan": "SDN", "Yemen": "YEM", "Saudi Arabia": "SAU",
  "Bangladesh": "BGD", "Democratic People's Republic of Korea": "PRK", "India": "IND",
  "Myanmar": "MMR", "Nepal": "NPL", "Thailand": "THA", "Timor-Leste": "TLS", "Bhutan": "BTN",
  "Cambodia": "KHM", "Indonesia": "IDN", "Lao People's Democratic Republic": "LAO",
  "Malaysia": "MYS", "Papua New Guinea": "PNG", "Philippines": "PHL",
  "Republic of Korea": "KOR", "Solomon Islands": "SLB", "Vanuatu": "VUT", "Viet Nam": "VNM"
};
// United Republic of Tanzania is a header row with two policy rows under it.
// Mainland becomes TZA (the map shape); Zanzibar is kept as a part of TZA so
// its own policy is never lost or merged into the mainland's.
const TZA_PARTS = { "Mainland": "mainland", "Zanzibar": "Zanzibar" };

// ---- CSV (same minimal RFC4180 reader as normalize-resistance.js) -----------
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
  return rows;
}
const csvCell = (v) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const norm = (s) => String(s || "").replace(/[‐-―−]/g, "-").replace(/\s+/g, " ").trim();

// ---- read -------------------------------------------------------------------
if (!fs.existsSync(IN)) {
  console.error("Input not found: " + IN + "\nSee the download steps at the top of this file.");
  process.exit(1);
}
const table = parseCsv(fs.readFileSync(IN, "utf8"));

// The header row is found by content, and its layout is checked, so a WHO
// change to the columns stops the script instead of shifting every value.
const hi = table.findIndex((r) => /WHO region/i.test(r[0] || "") && /Country/i.test(r[0] || ""));
const EXPECT = ["uncomplicated unconfirmed", "uncomplicated confirmed", "severe", "prevention during pregnancy", "treatment"];
const seen = hi < 0 ? [] : table[hi].slice(1, 6).map((h) => norm(h).toLowerCase());
if (hi < 0 || EXPECT.some((e, i) => seen[i] !== e)) {
  console.error("Annex layout changed — expected columns:\n  " + EXPECT.join(" | ") + "\nfound:\n  " + seen.join(" | "));
  process.exit(1);
}
const COL = { untested: 1, tested: 2, severe: 3, pregnancy: 4, vivax: 5 };

let dataAsOf = null;
const countries = {};
const unknown = [];
let region = null, inTanzania = false, rows = 0;

function productsIn(cell) {
  const txt = norm(cell);
  const found = {};
  if (!txt || txt === "NA") return found;
  for (const entry of txt.split(";").map((t) => t.trim()).filter(Boolean)) {
    const t = entry.toUpperCase();
    for (const [id, p] of Object.entries(PRODUCTS)) if (p.test(t)) found[id] = true;
  }
  return found;
}
function policyOf(row) {
  const out = {};
  for (const g of GROUPS) {
    for (const id of Object.keys(productsIn(row[COL[g]]))) (out[id] = out[id] || []).push(g);
  }
  // fixed product order, so the file does not depend on column order
  const ordered = {};
  for (const id of Object.keys(PRODUCTS)) if (out[id]) ordered[id] = out[id];
  return ordered;
}

// The "Data as of …" line sits under the table; the sheet stores it in no
// fixed column, so every cell is searched.
const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
for (const row of table) for (const cell of row) {
  const m = norm(cell).match(/^Data as of (\d{1,2}) (\w+) (\d{4})/i);
  if (m && !dataAsOf) dataAsOf = `${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, "0")}-${String(+m[1]).padStart(2, "0")}`;
}

for (let r = hi + 1; r < table.length; r++) {
  const row = table[r];
  const first = norm(row[0]);
  if (!first) continue;
  const rest = row.slice(1, 6).map(norm).filter(Boolean);
  if (REGION[first.toUpperCase()] && !rest.length) { region = REGION[first.toUpperCase()]; inTanzania = false; continue; }
  if (first === "United Republic of Tanzania" && !rest.length) { inTanzania = true; continue; }
  // Legend, footnotes and notes under the table carry no policy values: every
  // real country row has something (at least "NA") in the five policy columns.
  if (!rest.length) continue;
  if (inTanzania && TZA_PARTS[first]) {
    rows++;
    const part = TZA_PARTS[first];
    const t = countries.TZA || (countries.TZA = { name: "United Republic of Tanzania (mainland)", region, products: {}, parts: {} });
    if (part === "mainland") t.products = policyOf(row);
    else t.parts[part] = { products: policyOf(row) };
    continue;
  }
  inTanzania = false;
  const name = first.replace(/(\D)\d+$/, "$1").trim();   // footnote marks: "South Sudan1", "Indonesia2"
  const iso3 = NAME_TO_ISO3[name];
  if (!iso3) { unknown.push(first); continue; }
  rows++;
  countries[iso3] = { name, region, products: policyOf(row) };
}
if (unknown.length) {
  console.error("Country names not in NAME_TO_ISO3 — add them on purpose, then rerun:\n  " + unknown.join("\n  "));
  process.exit(1);
}
if (!dataAsOf) { console.error('No "Data as of …" line found under the table — the annex layout changed.'); process.exit(1); }

// sorted by ISO3 so the file is stable whatever order WHO lists countries in
const sorted = {};
for (const k of Object.keys(countries).sort()) sorted[k] = countries[k];

// ---- counts, for the report and for meta ------------------------------------
const byProduct = {};
for (const id of Object.keys(PRODUCTS)) {
  byProduct[id] = { tested: 0, anyGroup: 0 };
  for (const c of Object.values(sorted)) {
    const g = c.products[id];
    if (g) { byProduct[id].anyGroup++; if (g.includes("tested")) byProduct[id].tested++; }
  }
}

// ---- staging CSV ------------------------------------------------------------
const cols = ["iso3", "country", "part", "who_region", "product_id", "product", ...GROUPS];
const lines = [];
for (const [iso3, c] of Object.entries(sorted)) {
  const parts = [["", c.products], ...Object.entries(c.parts || {}).map(([p, v]) => [p, v.products])];
  for (const [part, prods] of parts)
    for (const [id, p] of Object.entries(PRODUCTS))
      lines.push([iso3, c.name, part, c.region, id, p.name, ...GROUPS.map((g) => ((prods[id] || []).includes(g) ? 1 : 0))]);
}
fs.mkdirSync(path.dirname(STAGING), { recursive: true });
fs.writeFileSync(STAGING, cols.join(",") + "\n" + lines.map((l) => l.map(csvCell).join(",")).join("\n") + "\n");

// ---- data/treatment-policy.js -----------------------------------------------
const payload = {
  meta: {
    source: `WHO, ${EDITION}, Annex 4B — Antimalarial drug policy in malaria endemic countries and areas, ${POLICY_YEAR}`,
    sourceUrl: SOURCE_URL,
    extract: EXTRACT,
    edition: EDITION,
    policyYear: POLICY_YEAR,
    dataAsOf,
    lastVerified: LAST_VERIFIED,
    licence: "CC BY-NC-SA 3.0 IGO",
    status: "draft",
    rule: RULE,
    groups: GROUP_LABEL,
    products: Object.fromEntries(Object.entries(PRODUCTS).map(([id, p]) => [id, p.name])),
    notes: [
      "Republic of Korea writes \"PY\" with no partner drug named; read as pyronaridine–artesunate (ASPY).",
      "Ecuador's \"AL+AM+PQ\" is artemether, not amodiaquine, so it is not ALAQ.",
      "United Republic of Tanzania: the map shape carries the mainland's policy; Zanzibar's own row is kept under parts.",
      "French Guiana is in the table but is not a separate shape on the base map."
    ],
    countryCount: Object.keys(sorted).length,
    policyRows: rows,
    byProduct
  },
  countries: sorted
};

fs.writeFileSync(OUT,
  "// GENERATED by scripts/normalize-treatment-policy.js from the WHO World\n" +
  "// Malaria Report antimalarial drug policy annex in sourcing/raw/wmr/.\n" +
  "// Do not edit by hand; rerun the normalizer instead.\n" +
  "//\n" +
  "// Only the four dashboard products are kept. For each country, `products`\n" +
  "// lists the patient groups whose national policy names that product. This\n" +
  "// is policy, not use: see meta.rule, which the page prints under the legend.\n" +
  "window.LAUNCH_TREATMENT_POLICY = " + JSON.stringify(payload) + ";\n");

// ---- report -----------------------------------------------------------------
console.log(`Read ${rows} policy rows (${Object.keys(sorted).length} countries and areas) from ${path.relative(root, IN)} — data as of ${dataAsOf}`);
for (const [id, c] of Object.entries(byProduct))
  console.log(`  ${PRODUCTS[id].name.padEnd(8)} first-line (tested) in ${String(c.tested).padStart(2)} · listed for any group in ${String(c.anyGroup).padStart(2)}`);
console.log(`Wrote ${path.relative(root, STAGING)} (${lines.length} rows) and ${path.relative(root, OUT)} (${Math.round(fs.statSync(OUT).size / 1024)} KB)`);
