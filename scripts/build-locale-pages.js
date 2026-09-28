#!/usr/bin/env node
/**
 * scripts/build-locale-pages.js
 *
 * Produces French and Portuguese copies of the illustrated journey dashboard
 * by substitution at build time. The source page and the source data files are
 * READ ONLY — nothing in the repo is modified, so the English page stays the
 * single source and this step is reversible by deleting the output.
 *
 *   node scripts/build-locale-pages.js --check     # report, write nothing
 *   node scripts/build-locale-pages.js
 *
 * Output, ready for build-public-site.sh to copy:
 *
 *   dist/locale/fr/illustrated-journey-dashboard.html
 *   dist/locale/fr/data/{products,resistance,molecular-markers}.js
 *   dist/locale/pt/...
 *
 * Why per-locale copies of the data files: the page loads data/*.js with
 * <script src>, so the only way to give /fr/ French content without editing
 * the page's JavaScript is to serve it French data. The copies are generated,
 * never hand-edited, and never written back into data/.
 *
 * Which strings may be substituted comes from i18n/content.en.json: a string is
 * replaced only if it is in the approved text section AND has a translation in
 * i18n/translations.json. Keys are read from content.en.json, not recomputed.
 * The build exits first if content.en.json is stale (assemble-content.js).
 *
 * Substitution is exact-match only, and each kind is handled separately:
 *
 *   data    the JSON is parsed, values replaced at the allow-listed paths,
 *           and re-serialised. Nothing is matched by text.
 *   markup  whole text nodes in the static HTML, replaced as whole nodes.
 *   js      string literals, replaced INCLUDING their surrounding quotes, so
 *           a literal can never be confused with an identifier that happens
 *           to read the same.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { identifiers } = require("./i18n-identifiers");
const { normalise } = require("./i18n-hash");
const { requireFresh } = require("./assemble-content");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "locale");
const PAGE = "illustrated-journey-dashboard.html";
const MEM = path.join(ROOT, "i18n", "translations.json");
const LOCALES = ["fr", "pt"];
const HTML_LANG = { fr: "fr", pt: "pt-PT" };

const GLOBALS = {
  "data/products.js": "window.LAUNCH_DATA",
  "data/resistance.js": "window.LAUNCH_RESISTANCE",
  "data/molecular-markers.js": "window.LAUNCH_MOLECULAR_MARKERS",
};


// Drug, marker and species names are LOOKUP KEYS. The build never translates an
// object key, so translating the same string anywhere else — a dict column, a
// page constant like PRODUCT_DRUG — breaks the match and empties the threat map
// with no error at all. Enforced here as well as in the extractor, so a stale
// memory entry from an earlier run can never be substituted back in.
const IDENT = identifiers(ROOT);

const isCodeChars = (t) => /[!=&|{}\\]/.test(t) || /=>/.test(t) ||
  /\b(return|const|let|var|function|typeof|null|undefined)\b/.test(t);

const check = process.argv.includes("--check");
const verifyOnly = process.argv.includes("--verify");   // re-run the self-check on existing output
if (!fs.existsSync(MEM)) {
  console.error(`\n  ${path.relative(ROOT, MEM)} not found — run scripts/translate-strings.js first.\n`);
  process.exit(1);
}
const MEMORY = JSON.parse(fs.readFileSync(MEM, "utf8")).entries;

// English -> key, from the approved text section of content.en.json. The builder
// does no hashing: a string that is not in content.en.json has no key, so it is
// never substituted, whatever the memory holds. --verify only inspects dist/ and
// does not need the content file.
const KEY_OF = new Map();
if (!verifyOnly) {
  for (const e of requireFresh().text) KEY_OF.set(normalise(e.en), e.key);
}
const entryOf = (text) => {
  const k = KEY_OF.get(normalise(text));
  return k ? MEMORY[k] : undefined;
};

const stat = {};
function tr(locale, text) {
  const t = String(text == null ? "" : text);
  if (IDENT.has(t.trim())) return t;          // identifier, not a label
  const e = entryOf(t);
  const v = e && e[locale];
  const s = (stat[locale] ||= { hit: 0, miss: 0, missed: new Set() });
  if (v) { s.hit++; return v; }
  s.miss++; if (s.missed.size < 40) s.missed.add(t.slice(0, 70));
  return t;                                   // untranslated stays English
}

// ---------------------------------------------------------------------------
// data files — parse, replace at known paths, re-serialise
// ---------------------------------------------------------------------------
function readData(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const m = GLOBALS[rel];
  const at = src.indexOf(m + " =");
  if (at === -1) throw new Error(`${rel}: marker "${m} =" not found`);
  return JSON.parse(src.slice(at + m.length + 2).trim().replace(/;\s*$/, ""));
}

function localiseProducts(D, loc) {
  const T = (v) => (typeof v === "string" && v.trim() ? tr(loc, v) : v);
  if (Array.isArray(D.stages)) D.stages = D.stages.map(T);
  if (D.glossary) for (const k of Object.keys(D.glossary)) D.glossary[k] = T(D.glossary[k]);
  (D.changelog || []).forEach((c) => { c.plain = T(c.plain); c.summary = T(c.summary); });
  (D.products || []).forEach((p) => {
    ["note", "next", "flag", "classLabel", "volumeNote"].forEach((k) => { if (p[k]) p[k] = T(p[k]); });
    const d = p.detail || {};
    if (d.useCase) d.useCase = T(d.useCase);
    if (Array.isArray(d.access)) d.access = d.access.map(T);
    if (Array.isArray(d.adoption)) d.adoption = d.adoption.map(T);
    if (d.research && d.research.question) d.research.question = T(d.research.question);
    // the price guard — an unconfirmed note is never translated and never moves
    if (d.price && d.price.confirmedInWriting === true && d.price.note) d.price.note = T(d.price.note);
    (d.milestones || []).forEach((m) => {
      ["milestone", "label", "next"].forEach((k) => { if (m[k]) m[k] = T(m[k]); });
    });
    (p.stages || []).forEach((st) => { if (st.note) st.note = T(st.note); });
    (p.journey || []).forEach((j) => { if (j.label) j.label = T(j.label); });
  });
  return D;
}

function localiseSurveillance(D, loc) {
  const T = (v) => (typeof v === "string" && v.trim() ? tr(loc, v) : v);
  const m = D.meta || {};
  ["metric", "rule", "derivation"].forEach((k) => { if (m[k]) m[k] = T(m[k]); });
  if (m.metrics) for (const k of Object.keys(m.metrics)) {
    if (m.metrics[k].short) m.metrics[k].short = T(m.metrics[k].short);
    if (m.metrics[k].full) m.metrics[k].full = T(m.metrics[k].full);
  }
  if (m.markerDrug) for (const k of Object.keys(m.markerDrug)) m.markerDrug[k] = T(m.markerDrug[k]);
  // dict.source and dict.citation are provenance — deliberately untouched.
  //
  // dict.drug and dict.marker are JOIN KEYS and must stay English. The page does
  //     dict[field].indexOf(value)
  // against keys of the untranslated pivot object, so a translated dictionary
  // silently matches nothing and the threat map renders empty. dict.country is
  // display-only (the location filter matches iso3) and is safe to translate.
  for (const col of ["country"]) {
    if (Array.isArray((D.dict || {})[col])) D.dict[col] = D.dict[col].map(T);
  }
  return D;
}

// ---------------------------------------------------------------------------
// the page
// ---------------------------------------------------------------------------
function localisePage(html, loc) {
  const lines = html.split("\n");
  const cut = lines.findIndex((l) => l.includes('src="data/products.js"'));
  if (cut === -1) throw new Error("could not find the data script block");
  let staticPart = lines.slice(0, cut).join("\n");
  let jsPart = lines.slice(cut).join("\n");

  // --- static markup: replace whole text nodes ---------------------------
  // Split on tags, translate the text pieces, reassemble. Style, script and
  // comment blocks are masked out first so their contents are never touched.
  const masks = [];
  const mask = (re) => {
    staticPart = staticPart.replace(re, (m) => {
      masks.push(m);
      return `\u0000MASK${masks.length - 1}\u0000`;
    });
  };
  mask(/<style[\s\S]*?<\/style>/g);
  mask(/<script[\s\S]*?<\/script>/g);
  mask(/<!--[\s\S]*?-->/g);

  // The extractor collapses internal whitespace before fingerprinting, so the
  // builder must too — otherwise every text node that wraps across lines gets
  // a different fingerprint and silently misses. Leading and trailing
  // whitespace is preserved so inline spacing is unchanged.
  staticPart = staticPart.replace(/>([^<]+)</g, (whole, text) => {
    const m = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const [, lead, core, trail] = m;
    const norm = core.replace(/\s+/g, " ");
    if (!norm || !/[A-Za-z]{3}/.test(norm) || norm.startsWith("\u0000MASK")) return whole;
    const out = tr(loc, norm);
    return out === norm ? whole : ">" + lead + out + trail + "<";
  });
  // rendering attributes
  staticPart = staticPart.replace(/(title|aria-label|placeholder|alt)="([^"]{3,})"/g,
    (whole, attr, val) => {
      const out = tr(loc, val.trim());
      return out === val.trim() ? whole : `${attr}="${out.replace(/"/g, "&quot;")}"`;
    });

  masks.forEach((m, i) => { staticPart = staticPart.replace(`\u0000MASK${i}\u0000`, () => m); });

  // --- js literals: replace including the quotes --------------------------
  // Only literals that are IN the memory are touched. A literal that is not a
  // UI string was never sent for translation, so it has no entry and is
  // therefore skipped — the memory is the allow-list.
  const LIT = /(["'`])((?:(?!\1)[^\\\n])+)\1/g;
  jsPart = jsPart.replace(LIT, (whole, q, body) => {
    const t = body.trim();
    if (!t) return whole;
    if (IDENT.has(t)) return whole;             // PRODUCT_DRUG and friends are lookup keys
    const e = entryOf(t);
    if (!e || !e[loc]) return whole;
    const out = e[loc];
    // never introduce a quote that would close the literal early
    if (out.includes(q)) return whole;
    stat[loc].hit++;
    return q + body.replace(t, out) + q;
  });

  // Text nodes inside markup-bearing JS literals. Safe for the same reason the
  // literal pass is safe: the memory is the allow-list, so anything that is not
  // a known UI string never matches and is left untouched.
  jsPart = jsPart.replace(/>([^<>{}`$]{3,})</g, (whole, text) => {
    const norm = text.replace(/\s+/g, " ").trim();
    if (!norm || !/[A-Za-z]{3}/.test(norm)) return whole;
    if (IDENT.has(norm)) return whole;          // identifier, not a label
    // same guard as the extractor: an arrow function plus a comparison reads as
    // a text node, and substituting into it rewrites live code
    if (!/^[\p{L}\d\u2022\u00b7\u26a0"'(]/u.test(norm)) return whole;
    if (isCodeChars(norm)) return whole;
    const e = entryOf(norm);
    if (!e || !e[loc]) return whole;
    if (/["'`\\]/.test(e[loc])) return whole;      // never inject a quote into a literal
    stat[loc].hit++;
    return ">" + text.replace(norm, e[loc]) + "<";
  });

  let page = staticPart + "\n" + jsPart;

  // point the locale page at its own data files, and set the document language
  page = page.replace(/<html lang="en">/, `<html lang="${HTML_LANG[loc]}">`);
  return page;
}

// ---------------------------------------------------------------------------
// Post-build self-check.
//
// Both failures on 23 September were SILENT: a translated lookup key made the
// threat map draw nothing while the page rendered perfectly and logged nothing.
// A build that can fail without saying so will fail again, so the build now
// proves the locale output still resolves the same rows as the English does,
// and exits non-zero when it does not.
// ---------------------------------------------------------------------------
function readGlobal(file, marker) {
  const src = fs.readFileSync(file, "utf8");
  const at = src.indexOf(marker + " =");
  if (at === -1) throw new Error(`${file}: marker "${marker} =" not found`);
  return JSON.parse(src.slice(at + marker.length + 2).trim().replace(/;\s*$/, ""));
}

// the page's own lookup constants, read out of whichever copy we are checking
function pageKeys(html) {
  const grab = (re) => { const m = re.exec(html); return m ? m[1] : ""; };
  const strs = (t) => [...t.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  return {
    drugs:   strs(grab(/const PRODUCT_DRUG = \{([^}]*)\}/)),
    markers: strs(grab(/const PRODUCT_MARKER = \{([^}]*)\}/)),
    species: grab(/const FALLBACK_SPECIES = "([^"]+)"/),
  };
}

// how many study rows and sites the page would draw for one drug and species
function drawn(R, drug, species) {
  const AT = {}; R.fields.forEach((f, i) => { AT[f] = i; });
  const di = R.dict.drug.indexOf(drug), si = R.dict.species.indexOf(species);
  if (di < 0 || si < 0) return { rows: 0, sites: 0, resolved: false };
  const sites = new Set(); let rows = 0;
  for (const r of R.studies) {
    if (r[AT.drug] !== di || r[AT.species] !== si) continue;
    if (typeof r[AT.v] !== "number") continue;
    rows++; sites.add(r[AT.iso3] + "|" + r[AT.site]);
  }
  return { rows, sites: sites.size, resolved: true };
}

function profile(dir) {
  const html = fs.readFileSync(path.join(dir, PAGE), "utf8");
  const R = readGlobal(path.join(dir, "data", "resistance.js"), GLOBALS["data/resistance.js"]);
  const M = readGlobal(path.join(dir, "data", "molecular-markers.js"), GLOBALS["data/molecular-markers.js"]);
  const k = pageKeys(html);
  const out = { keys: k, drugs: {}, markers: {}, speciesOk: R.dict.species.indexOf(k.species) >= 0 };
  for (const d of k.drugs) {
    out.drugs[d] = {
      pivot: !!(R.treatmentFailure || {})[d],
      dict: R.dict.drug.indexOf(d) >= 0,
      ...drawn(R, d, k.species),
    };
  }
  for (const mk of k.markers) {
    out.markers[mk] = {
      pivot: !!(M.molecularMarkers || {})[mk],
      dict: M.dict.marker.indexOf(mk) >= 0,
    };
  }
  return out;
}

function verify() {
  const en = profile(ROOT);
  let failures = 0;
  const say = (ok, msg) => { console.log(`       ${ok ? "\u2713" : "\u2717"} ${msg}`); if (!ok) failures++; };

  console.log("\n  Self-check \u2014 locale output must resolve the same rows as English:");
  for (const loc of LOCALES) {
    const lc = profile(path.join(OUT, loc));
    console.log(`\n    ${loc}`);

    say(lc.keys.species === en.keys.species && lc.speciesOk,
        `FALLBACK_SPECIES "${lc.keys.species}" resolves in dict.species`);

    for (const d of en.keys.drugs) {
      const a = en.drugs[d], b = lc.drugs[d];
      if (!b) { say(false, `PRODUCT_DRUG "${d}" was rewritten to "${lc.keys.drugs.join('", "')}"`); continue; }
      say(b.pivot && b.dict, `PRODUCT_DRUG "${d}" resolves in the pivot and dict.drug`);
      say(b.rows === a.rows && b.sites === a.sites,
          `"${d}" draws ${b.rows} rows / ${b.sites} sites  (English: ${a.rows} / ${a.sites})`);
    }
    for (const mk of en.keys.markers) {
      const b = lc.markers[mk];
      if (!b) { say(false, `PRODUCT_MARKER "${mk}" was rewritten`); continue; }
      say(b.pivot && b.dict, `PRODUCT_MARKER "${mk}" resolves in the pivot and dict.marker`);
    }
  }

  if (failures) {
    console.error(`\n  BUILD FAILED \u2014 ${failures} check(s) did not pass.`);
    console.error("  A lookup key has been translated. The page would render fine and the");
    console.error("  threat map would be EMPTY. See docs/jackson/DEV-31.md (rule 1b)");
    console.error("  and scripts/i18n-identifiers.js.\n");
    process.exit(1);
  }
  console.log("\n  All checks passed.\n");
}

// ---------------------------------------------------------------------------
function main() {
  if (verifyOnly) { verify(); return; }
  const html = fs.readFileSync(path.join(ROOT, PAGE), "utf8");
  console.log("");
  for (const loc of LOCALES) {
    stat[loc] = { hit: 0, miss: 0, missed: new Set() };
    const dir = path.join(OUT, loc);
    const dataDir = path.join(dir, "data");

    const page = localisePage(html, loc);
    const products = localiseProducts(readData("data/products.js"), loc);
    const resistance = localiseSurveillance(readData("data/resistance.js"), loc);
    const markers = localiseSurveillance(readData("data/molecular-markers.js"), loc);

    const s = stat[loc];
    const pct = s.hit + s.miss ? Math.round((s.hit / (s.hit + s.miss)) * 100) : 0;
    console.log(`  ${loc}:  ${s.hit} translated · ${s.miss} left in English · ${pct}% coverage`);

    if (!check) {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dir, PAGE), page, "utf8");
      const write = (name, global, obj) =>
        fs.writeFileSync(path.join(dataDir, name), `${global} = ${JSON.stringify(obj)};\n`, "utf8");
      write("products.js", GLOBALS["data/products.js"], products);
      write("resistance.js", GLOBALS["data/resistance.js"], resistance);
      write("molecular-markers.js", GLOBALS["data/molecular-markers.js"], markers);
      // the page also loads these, unchanged
      for (const f of ["world-map.js", "world-map-geo.js"]) {
        fs.copyFileSync(path.join(ROOT, "data", f), path.join(dataDir, f));
      }
      // the page also loads assets/ with relative paths (icons, the Unitaid mark,
      // the WHO emblem, report-issue.js). Without these the locale page renders
      // with broken images and no stage glyphs.
      fs.cpSync(path.join(ROOT, "assets"), path.join(dir, "assets"), { recursive: true });
      console.log(`       wrote ${path.relative(ROOT, dir)}/`);
    }
  }

  const anyMiss = LOCALES.some((l) => stat[l].miss);
  if (anyMiss) {
    console.log("\n  Strings with no translation (kept in English), first few:");
    for (const loc of LOCALES) {
      [...stat[loc].missed].slice(0, 8).forEach((t) => console.log(`    [${loc}] ${t}`));
    }
  }
  if (check) { console.log("\n  --check: nothing written.\n"); return; }
  verify();
}

main();
