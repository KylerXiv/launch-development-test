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
 *   node scripts/build-locale-pages.js --allow-stale   # the public build only
 *
 * Output, ready for build-public-site.sh to copy:
 *
 *   dist/locale/fr/illustrated-journey-dashboard.html
 *   dist/locale/fr/data/{products,sources}.js
 *   dist/locale/fr/data/  every other data file the page loads, unchanged
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
 * --allow-stale is for scripts/build-public-site.sh alone. A hand-made change
 * reaches main before the translate bot has rebuilt content.en.json, and
 * English does not wait for French (docs/translation-notes.md): so instead of
 * refusing, the build assembles the content from the source in memory — the
 * current English, never an old file — and whatever is new stays in English
 * until the bot has translated it. Nothing is written back.
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
const { normalise } = require("./i18n-hash");
const { requireFresh, problems, assemble } = require("./assemble-content");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "dist", "locale");
const PAGE = "illustrated-journey-dashboard.html";
const MEM = path.join(ROOT, "i18n", "translations.json");
const LOCALES = ["fr", "pt"];
const HTML_LANG = { fr: "fr", pt: "pt-PT" };

const GLOBALS = {
  "data/products.js": "window.LAUNCH_DATA",
  "data/sources.js": "window.LAUNCH_SOURCES",
};

const isCodeChars = (t) => /[!=&|{}\\]/.test(t) || /=>/.test(t) ||
  /\b(return|const|let|var|function|typeof|null|undefined)\b/.test(t);

const check = process.argv.includes("--check");
const verifyOnly = process.argv.includes("--verify");   // re-run the self-check on existing output
const allowStale = process.argv.includes("--allow-stale");
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
  let text;
  const stale = allowStale ? problems() : [];
  if (stale.length) {
    console.log("\n  i18n/content.en.json is not current — building from the source instead (--allow-stale):");
    stale.forEach((x) => console.log(`    ${x}`));
    console.log("  Anything new stays in English until the translate bot has run.");
    text = assemble().text;
  } else {
    text = requireFresh().text;
  }
  for (const e of text) KEY_OF.set(normalise(e.en), e.key);
}
const entryOf = (text) => {
  const k = KEY_OF.get(normalise(text));
  return k ? MEMORY[k] : undefined;
};

const stat = {};
function tr(locale, text) {
  const t = String(text == null ? "" : text);
  const e = entryOf(t);
  const v = e && e[locale];
  const s = (stat[locale] ||= { hit: 0, miss: 0, missed: new Set() });
  if (v && /^\[stub-[a-z]+\] /.test(v)) s.stub = (s.stub || 0) + 1;
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
  (D.stageInfo || []).forEach((x) => { ["what", "who", "stall"].forEach((k) => { if (x[k]) x[k] = T(x[k]); }); });
  if (D.glossary) for (const k of Object.keys(D.glossary)) D.glossary[k] = T(D.glossary[k]);
  (D.changelog || []).forEach((c) => { c.plain = T(c.plain); c.summary = T(c.summary); });
  (D.products || []).forEach((p) => {
    ["note", "next", "flag", "classLabel", "barrier"].forEach((k) => { if (p[k]) p[k] = T(p[k]); });
    const d = p.detail || {};
    if (d.useCase) d.useCase = T(d.useCase);
    if (d.volumeNote) d.volumeNote = T(d.volumeNote);
    if (Array.isArray(d.access)) d.access = d.access.map(T);
    if (Array.isArray(d.adoption)) d.adoption = d.adoption.map(T);
    if (d.research && d.research.question) d.research.question = T(d.research.question);
    // the price guard — an unconfirmed note is never translated and never moves
    if (d.price && d.price.confirmedInWriting === true && d.price.note) d.price.note = T(d.price.note);
    (d.milestones || []).forEach((m) => {
      ["milestone", "label", "next"].forEach((k) => { if (m[k]) m[k] = T(m[k]); });
    });
    (p.stages || []).forEach((st) => {
      if (st.note) st.note = T(st.note);
      if (st.next) st.next = T(st.next);
    });
    // under detail, as in the data (was read from the product's top level)
    (d.journey || []).forEach((j) => { if (j.label) j.label = T(j.label); });
  });
  return D;
}

// The Sources footer — the same fields assemble-content.js collects, and only
// the one renderSources() shows: label, or title where there is no label.
function localiseSources(D, loc) {
  const T = (v) => (typeof v === "string" && v.trim() ? tr(loc, v) : v);
  (D.sources || []).forEach((src) => {
    if (!src.public) return;
    if (src.label) src.label = T(src.label);
    else src.title = T(src.title);
    src.plain = T(src.plain);
    (src.alsoSee || []).forEach((a) => { a.label = T(a.label); });
  });
  return D;
}
const LOCALISE = {
  "data/products.js": localiseProducts,
  "data/sources.js": localiseSources,
};

// Every data file the page loads, from its own <script src> tags. A fixed list
// here is how the locale pages lost data/sources.js when the Sources footer
// moved into it: the page loaded a file the build never copied.
const dataFilesOf = (html) => [...new Set([...html.matchAll(/<script src="(data\/[^"]+\.js)"/g)].map((m) => m[1]))];

// Local files a page references that are missing from its directory. Paths
// built at runtime (with ${...}) cannot be checked here and are skipped.
function missingFiles(dir) {
  const html = fs.readFileSync(path.join(dir, PAGE), "utf8");
  const refs = [...html.matchAll(/\bsrc="((?:data|assets)\/[^"?#]+)"/g)].map((m) => m[1]).filter((r) => !r.includes("${"));
  return [...new Set(refs)].filter((r) => !fs.existsSync(path.join(dir, r)));
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
// A build that can fail without saying so will fail again, so the build proves
// the locale output is complete: every data/ and assets/ file the page loads
// must be there, or part of the page would say its data did not load.
//
// It also proves each locale copy keeps the same product ids, in the same
// order, and the same number of stages as English (from Keith's branch, merged
// 2 Oct 2026). The ids are lookup keys shared with treatment-policy.js, and a
// translated lookup key fails silently: the page renders, logs nothing, and
// whatever was keyed on it draws nothing.
// ---------------------------------------------------------------------------
function keysOf(file) {
  const src = fs.readFileSync(file, "utf8");
  const m = GLOBALS["data/products.js"];
  const D = JSON.parse(src.slice(src.indexOf(m + " =") + m.length + 2).trim().replace(/;\s*$/, ""));
  return { ids: (D.products || []).map((p) => p.id), stages: (D.stages || []).length };
}

function verify() {
  let failures = 0;
  const say = (ok, msg) => { console.log(`       ${ok ? "✓" : "✗"} ${msg}`); if (!ok) failures++; };
  const en = keysOf(path.join(ROOT, "data", "products.js"));

  console.log("\n  Self-check — locale output must load every file the page needs, and keep English's lookup keys:");
  for (const loc of LOCALES) {
    console.log(`\n    ${loc}`);
    const missing = missingFiles(path.join(OUT, loc));
    say(!missing.length, missing.length
      ? `the page loads files that are not there: ${missing.join(", ")}`
      : "every data/ and assets/ file the page loads is there");
    const lc = keysOf(path.join(OUT, loc, "data", "products.js"));
    say(JSON.stringify(lc.ids) === JSON.stringify(en.ids), `product ids unchanged (${en.ids.join(", ")})`);
    say(lc.stages === en.stages, `${lc.stages} stages (English: ${en.stages})`);
  }

  if (failures) {
    console.error(`\n  BUILD FAILED — ${failures} check(s) did not pass.`);
    console.error("  Either the page loads a file the build did not write, and part of it would");
    console.error("  say its data did not load, or a locale copy changed a product id or the");
    console.error("  number of stages, and data keyed on them would silently not match.\n");
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
    const localised = {};
    for (const [rel, fn] of Object.entries(LOCALISE)) localised[rel] = fn(readData(rel), loc);

    const s = stat[loc];
    const pct = s.hit + s.miss ? Math.round((s.hit / (s.hit + s.miss)) * 100) : 0;
    console.log(`  ${loc}:  ${s.hit} translated · ${s.miss} left in English · ${pct}% coverage`);
    if (s.stub) console.log(`       ${s.stub} of them are stub values from a test run (TRANSLATE_ENGINE=stub), not translations`);

    if (!check) {
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dir, PAGE), page, "utf8");
      for (const [rel, obj] of Object.entries(localised)) {
        fs.writeFileSync(path.join(dir, rel), `${GLOBALS[rel]} = ${JSON.stringify(obj)};\n`, "utf8");
      }
      // whatever else the page loads (the map geometry today), unchanged
      for (const rel of dataFilesOf(html)) {
        if (!LOCALISE[rel]) fs.copyFileSync(path.join(ROOT, rel), path.join(dir, rel));
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

// scripts/build-dataset.js reuses the same localisation, so the French and
// Portuguese in the published dashboard.json are exactly those of /fr and /pt.
module.exports = { LOCALES, readData, localiseProducts, localiseSources, stat };

if (require.main === module) main();
