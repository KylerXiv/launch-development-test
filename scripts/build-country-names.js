#!/usr/bin/env node
/**
 * scripts/build-country-names.js
 *
 * Writes i18n/country-names.json: the French, Portuguese and Spanish name of
 * every country and territory the dashboard draws or lists, keyed by the
 * English name exactly as the data files spell it.
 *
 *   node scripts/build-country-names.js           # write i18n/country-names.json
 *   node scripts/build-country-names.js --check   # does it cover every name in the data? writes nothing
 *
 * Names come from the Unicode CLDR, through Node's own ICU (Intl.DisplayNames),
 * looked up by ISO code. They are never sent to a translation engine: a country
 * name is reference data with a standard form, not prose. Portuguese is pt-PT,
 * the same variety as the /pt page; Spanish is general "es", as on /es.
 *
 * Keyed by the English name, not by ISO3, because the map files give a few
 * territories their country's code (Ashmore and Cartier Islands is AUS) and use
 * short forms ("Dem. Rep. Congo") next to the WHO long forms in
 * treatment-policy.js ("Democratic Republic of the Congo"). Every spelling gets
 * its own entry, and the French, Portuguese and Spanish for all of them are
 * CLDR's one standard name for the code.
 *
 * Read by scripts/build-locale-pages.js, which renames countries in its French,
 * Portuguese and Spanish copies of data/world-map-geo.js, data/world-map.js and
 * data/treatment-policy.js. A name the table does not have stays in English
 * and the locale build lists it; --check fails on it, so a new country in the
 * data cannot go unnoticed.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "i18n", "country-names.json");
const LANGS = { fr: "fr", pt: "pt-PT", es: "es" };

// ISO 3166-1 alpha-3 -> alpha-2, for the codes the data files use.
const ISO2 = {
  ABW: "AW", AFG: "AF", AGO: "AO", AIA: "AI", ALA: "AX", ALB: "AL", AND: "AD", ARE: "AE", ARG: "AR", ARM: "AM",
  ASM: "AS", ATF: "TF", ATG: "AG", AUS: "AU", AUT: "AT", AZE: "AZ", BDI: "BI", BEL: "BE", BEN: "BJ", BFA: "BF",
  BGD: "BD", BGR: "BG", BHR: "BH", BHS: "BS", BIH: "BA", BLM: "BL", BLR: "BY", BLZ: "BZ", BMU: "BM", BOL: "BO",
  BRA: "BR", BRB: "BB", BRN: "BN", BTN: "BT", BWA: "BW", CAF: "CF", CAN: "CA", CHE: "CH", CHL: "CL", CHN: "CN",
  CIV: "CI", CMR: "CM", COD: "CD", COG: "CG", COK: "CK", COL: "CO", COM: "KM", CPV: "CV", CRI: "CR", CUB: "CU",
  CUW: "CW", CYM: "KY", CYP: "CY", CZE: "CZ", DEU: "DE", DJI: "DJ", DMA: "DM", DNK: "DK", DOM: "DO", DZA: "DZ",
  ECU: "EC", EGY: "EG", ERI: "ER", ESH: "EH", ESP: "ES", EST: "EE", ETH: "ET", FIN: "FI", FJI: "FJ", FLK: "FK",
  FRA: "FR", FRO: "FO", FSM: "FM", GAB: "GA", GBR: "GB", GEO: "GE", GGY: "GG", GHA: "GH", GIN: "GN", GMB: "GM",
  GNB: "GW", GNQ: "GQ", GRC: "GR", GRD: "GD", GRL: "GL", GTM: "GT", GUF: "GF", GUM: "GU", GUY: "GY", HKG: "HK",
  HMD: "HM", HND: "HN", HRV: "HR", HTI: "HT", HUN: "HU", IDN: "ID", IMN: "IM", IND: "IN", IOT: "IO", IRL: "IE",
  IRN: "IR", IRQ: "IQ", ISL: "IS", ISR: "IL", ITA: "IT", JAM: "JM", JEY: "JE", JOR: "JO", JPN: "JP", KAZ: "KZ",
  KEN: "KE", KGZ: "KG", KHM: "KH", KIR: "KI", KNA: "KN", KOR: "KR", KWT: "KW", LAO: "LA", LBN: "LB", LBR: "LR",
  LBY: "LY", LCA: "LC", LIE: "LI", LKA: "LK", LSO: "LS", LTU: "LT", LUX: "LU", LVA: "LV", MAC: "MO", MAF: "MF",
  MAR: "MA", MCO: "MC", MDA: "MD", MDG: "MG", MDV: "MV", MEX: "MX", MHL: "MH", MKD: "MK", MLI: "ML", MLT: "MT",
  MMR: "MM", MNE: "ME", MNG: "MN", MNP: "MP", MOZ: "MZ", MRT: "MR", MSR: "MS", MUS: "MU", MWI: "MW", MYS: "MY",
  NAM: "NA", NCL: "NC", NER: "NE", NFK: "NF", NGA: "NG", NIC: "NI", NIU: "NU", NLD: "NL", NOR: "NO", NPL: "NP",
  NRU: "NR", NZL: "NZ", OMN: "OM", PAK: "PK", PAN: "PA", PCN: "PN", PER: "PE", PHL: "PH", PLW: "PW", PNG: "PG",
  POL: "PL", PRI: "PR", PRK: "KP", PRT: "PT", PRY: "PY", PSE: "PS", PYF: "PF", QAT: "QA", ROU: "RO", RUS: "RU",
  RWA: "RW", SAU: "SA", SDN: "SD", SEN: "SN", SGP: "SG", SGS: "GS", SHN: "SH", SLB: "SB", SLE: "SL", SLV: "SV",
  SMR: "SM", SOM: "SO", SPM: "PM", SRB: "RS", SSD: "SS", STP: "ST", SUR: "SR", SVK: "SK", SVN: "SI", SWE: "SE",
  SWZ: "SZ", SXM: "SX", SYC: "SC", SYR: "SY", TCA: "TC", TCD: "TD", TGO: "TG", THA: "TH", TJK: "TJ", TKM: "TM",
  TLS: "TL", TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TWN: "TW", TZA: "TZ", UGA: "UG", UKR: "UA", URY: "UY",
  USA: "US", UZB: "UZ", VAT: "VA", VCT: "VC", VEN: "VE", VGB: "VG", VIR: "VI", VNM: "VN", VUT: "VU", WLF: "WF",
  WSM: "WS", YEM: "YE", ZAF: "ZA", ZMB: "ZM", ZWE: "ZW",
};

// Names CLDR has no code for, written by hand.
const BY_HAND = {
  "Ashmore and Cartier Is.": { fr: "Îles Ashmore-et-Cartier", pt: "Ilhas Ashmore e Cartier", es: "Islas Ashmore y Cartier" },
};
// CLDR's standard name is its colloquial form for a few codes ("Congo-Kinshasa",
// "R.A.S. chinoise de Hong Kong", "Myanmar (Birmanie)"). The dashboard follows
// the WHO documents it cites, which use the forms below. (Spanish CLDR already
// gives these forms for CD and CG; they are listed anyway, as for the others.
// Its "Côte d’Ivoire" is the WHO form, as in French.)
const BY_CODE = {
  CD: { fr: "République démocratique du Congo", pt: "República Democrática do Congo", es: "República Democrática del Congo" },
  CG: { fr: "Congo", pt: "Congo", es: "Congo" },
  HK: { fr: "Hong Kong", pt: "Hong Kong", es: "Hong Kong" },
  MO: { fr: "Macao", pt: "Macau", es: "Macao" },
  MM: { fr: "Myanmar", pt: "Mianmar", es: "Myanmar" },
  CI: { pt: "Costa do Marfim" },
};
// A qualifier the WHO annex adds to a name (Tanzania is split into mainland and
// Zanzibar there); the CLDR name gets the same qualifier.
const QUALIFIERS = [
  { en: " (mainland)", fr: " (partie continentale)", pt: " (parte continental)", es: " (parte continental)" },
];

function readGlobal(rel, marker) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const at = src.indexOf(marker + " =");
  if (at === -1) throw new Error(`${rel}: marker "${marker} =" not found`);
  return JSON.parse(src.slice(at + marker.length + 2).trim().replace(/;\s*$/, ""));
}

// Every (iso3, English name) pair the locale build will look up.
function namesInData() {
  const pairs = new Map();
  const add = (iso3, name) => { if (name && !pairs.has(name)) pairs.set(name, iso3); };
  readGlobal("data/world-map-geo.js", "window.LAUNCH_MAP_GEO").features
    .forEach((f) => add(f.properties.iso3, f.properties.name));
  for (const [iso3, c] of Object.entries(readGlobal("data/world-map.js", "window.LAUNCH_MAP").countries)) add(iso3, c.n);
  for (const [iso3, c] of Object.entries(readGlobal("data/treatment-policy.js", "window.LAUNCH_TREATMENT_POLICY").countries)) add(iso3, c.name);
  return pairs;
}

function build() {
  const display = Object.fromEntries(Object.entries(LANGS).map(([k, tag]) => [k, new Intl.DisplayNames([tag], { type: "region" })]));
  const names = {};
  const problems = [];
  for (const [en, iso3] of [...namesInData()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (BY_HAND[en]) { names[en] = { iso3, ...BY_HAND[en] }; continue; }
    const iso2 = ISO2[iso3];
    if (!iso2) { problems.push(`${en} (${iso3}): no ISO2 code`); continue; }
    const q = QUALIFIERS.find((x) => en.endsWith(x.en));
    const e = { iso3 };
    for (const k of Object.keys(LANGS)) {
      const n = (BY_CODE[iso2] && BY_CODE[iso2][k]) || display[k].of(iso2);
      if (!n || n === iso2) { problems.push(`${en} (${iso3}/${iso2}): CLDR has no ${k} name`); continue; }
      e[k] = n + (q ? q[k] : "");
    }
    names[en] = e;
  }
  return { names, problems };
}

function main() {
  const { names, problems } = build();
  if (process.argv.includes("--check")) {
    const saved = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")).names : {};
    const missing = [...namesInData().keys()].filter((n) => !saved[n] || Object.keys(LANGS).some((k) => !saved[n][k]));
    if (missing.length) {
      console.error(`\n  i18n/country-names.json is missing ${missing.length} name(s): ${missing.join(", ")}\n  run: node scripts/build-country-names.js\n`);
      process.exit(1);
    }
    console.log(`\n  i18n/country-names.json covers all ${Object.keys(saved).length} country names in the data\n`);
    return;
  }
  if (problems.length) {
    console.error("\n  Not written:\n" + problems.map((p) => "    " + p).join("\n") + "\n");
    process.exit(1);
  }
  const out = {
    schema: 1,
    note: "Generated by scripts/build-country-names.js from the Unicode CLDR (Intl.DisplayNames). Do not edit by hand: add to BY_HAND there and re-run it.",
    cldr: process.versions.cldr || null,
    names,
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n", "utf8");
  console.log(`  wrote ${path.relative(ROOT, OUT)}: ${Object.keys(names).length} names (CLDR ${out.cldr})`);
}

module.exports = { OUT };
if (require.main === module) main();
