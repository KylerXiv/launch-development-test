#!/usr/bin/env node
/**
 * scripts/extract-strings.js  —  DEV-31 step 1
 *
 * Inventories every string that has to be translated to produce /fr/ and /pt/
 * copies of illustrated-journey-dashboard.html. Reads the repo, writes nothing
 * except the inventory. Run it any time; it is always safe.
 *
 *   node scripts/extract-strings.js            # summary only
 *   node scripts/extract-strings.js --write    # also write i18n/strings.en.json
 *   node scripts/extract-strings.js --list=js  # print one bucket in full
 *
 * Three buckets, because they are translated and substituted differently:
 *
 *   data    the strings the page renders out of data/*.js. For the two WHO
 *           files this is the meta block plus the dict entries the threat map
 *           decodes — NOT the 1,633 study rows, which are numbers and codes.
 *   markup  visible text nodes and rendering attributes in the static HTML
 *           above the <script src="data/..."> block.
 *   js      string literals inside the page's own JavaScript that reach the
 *           screen. Extracted as CANDIDATES only: the substitution step uses a
 *           reviewed list, never this regex output directly, because a literal
 *           that is actually a CSS class or a data key must never be replaced.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const { identifiers } = require("./i18n-identifiers");

const ROOT = path.resolve(__dirname, "..");
// Drug, marker and species names are LOOKUP KEYS, not labels — the page pivots
// and indexes on them. Derived from the data, never hand-listed.
const IDENT = identifiers(ROOT);
const PAGE = "illustrated-journey-dashboard.html";
const GLOBALS = {
  "data/products.js": "window.LAUNCH_DATA",
  "data/resistance.js": "window.LAUNCH_RESISTANCE",
  "data/molecular-markers.js": "window.LAUNCH_MOLECULAR_MARKERS",
};

function readDataFile(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const m = GLOBALS[rel];
  const at = src.indexOf(m + " =");
  if (at === -1) throw new Error(`${rel}: marker "${m} =" not found`);
  return JSON.parse(src.slice(at + m.length + 2).trim().replace(/;\s*$/, ""));
}

const out = { data: [], markup: [], js: [] };
const seen = new Set();
const add = (bucket, text, where) => {
  const t = String(text == null ? "" : text).trim();
  if (!t || !/[A-Za-z]{2}/.test(t)) return;
  if (IDENT.has(t)) return;                    // identifier, not a label — never translated
  const key = bucket + "\u0000" + t;
  if (seen.has(key)) return;
  seen.add(key);
  out[bucket].push({ text: t, where });
};

// ---------------------------------------------------------------------------
// 1. data — only what the page actually renders
// ---------------------------------------------------------------------------

// products.js: the allow-listed content fields (deny-list stays English —
// provenance must match the source it cites)
const P = readDataFile("data/products.js");
(P.stages || []).forEach((s, i) => add("data", s, `products.stages[${i}]`));
Object.entries(P.glossary || {}).forEach(([k, v]) => add("data", v, `products.glossary.${k}`));
(P.changelog || []).forEach((c, i) => {
  add("data", c.plain, `products.changelog[${i}].plain`);
  add("data", c.summary, `products.changelog[${i}].summary`);
});
(P.products || []).forEach((p, i) => {
  const b = `products.products[${i}]`;
  add("data", p.note, `${b}.note`);
  add("data", p.next, `${b}.next`);
  add("data", p.flag, `${b}.flag`);
  add("data", p.classLabel, `${b}.classLabel`);
  add("data", p.volumeNote, `${b}.volumeNote`);
  const d = p.detail || {};
  add("data", d.useCase, `${b}.detail.useCase`);
  (d.access || []).forEach((x, j) => add("data", x, `${b}.detail.access[${j}]`));
  (d.adoption || []).forEach((x, j) => add("data", x, `${b}.detail.adoption[${j}]`));
  if (d.research) add("data", d.research.question, `${b}.detail.research.question`);
  // price notes are excluded unless confirmed in writing — the guard, kept here
  if (d.price && d.price.confirmedInWriting === true) add("data", d.price.note, `${b}.detail.price.note`);
  (d.milestones || []).forEach((m, j) => {
    add("data", m.milestone, `${b}.detail.milestones[${j}].milestone`);
    add("data", m.label, `${b}.detail.milestones[${j}].label`);
    add("data", m.next, `${b}.detail.milestones[${j}].next`);
  });
  (p.stages || []).forEach((st, j) => add("data", st.note, `${b}.stages[${j}].note`));
  (p.journey || []).forEach((j2, j) => add("data", j2.label, `${b}.journey[${j}].label`));
});

// the two WHO files: meta prose + the dict columns the threat map decodes.
//
// dict.source and dict.citation are provenance and stay English.
//
// dict.drug and dict.marker are JOIN KEYS, not labels, and are deliberately
// excluded. The page pivots its study rows through
//     codeOf(field, value) => DS().dict[field].indexOf(value)
// where `value` is a key of the untranslated pivot object DS()[LAYER]. Translate
// the dictionary and every indexOf returns -1, every row is skipped, and the
// threat map draws nothing at all while throwing no error. dict.country is safe
// — the location filter matches on iso3 and the country dropdown is built from
// data/world-map.js, so dict.country is only ever displayed.
for (const [rel, tag] of [["data/resistance.js", "resistance"],
                          ["data/molecular-markers.js", "markers"]]) {
  const D = readDataFile(rel);
  const m = D.meta || {};
  add("data", m.metric, `${tag}.meta.metric`);
  add("data", m.rule, `${tag}.meta.rule`);
  add("data", m.derivation, `${tag}.meta.derivation`);
  Object.entries(m.metrics || {}).forEach(([k, v]) => {
    add("data", v.short, `${tag}.meta.metrics.${k}.short`);
    add("data", v.full, `${tag}.meta.metrics.${k}.full`);
  });
  Object.entries(m.markerDrug || {}).forEach(([k, v]) => add("data", v, `${tag}.meta.markerDrug[${JSON.stringify(k)}]`));
  for (const col of ["country"]) {                       // NOT drug/marker — join keys
    (((D.dict || {})[col]) || []).forEach((v, i) => add("data", v, `${tag}.dict.${col}[${i}]`));
  }
}

// ---------------------------------------------------------------------------
// 2 & 3. the page itself
// ---------------------------------------------------------------------------
const html = fs.readFileSync(path.join(ROOT, PAGE), "utf8");
const lines = html.split("\n");
const cut = lines.findIndex((l) => l.includes('src="data/products.js"'));
if (cut === -1) throw new Error("could not find the data script block");
const staticPart = lines.slice(0, cut).join("\n");
const jsPart = lines.slice(cut).join("\n");

// markup: text nodes, minus <style>/<script>/comments
let st = staticPart
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<!--[\s\S]*?-->/g, " ");
st.split(/<[^>]+>/).forEach((t) => {
  const v = t.replace(/\s+/g, " ").trim();
  if (v.length > 1 && /[A-Za-z]{3}/.test(v)) add("markup", v, "static text");
});
// rendering attributes
for (const m of staticPart.matchAll(/(title|aria-label|placeholder|alt)="([^"]{3,})"/g)) {
  add("markup", m[2], `static @${m[1]}`);
}

// js: candidate UI literals.
//
// Comments are stripped first — an earlier version of this pulled
// "is stage i-1 done" out of a code comment and offered it for translation.
//
// The filter is deliberately strict, because the substitution step replaces
// text in a working page: a false positive here can corrupt SVG markup or a
// CSS custom property. Anything rejected that IS user-facing gets added to
// the reviewed list by hand; anything accepted still gets read before use.
const jsNoComments = jsPart
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))   // keep line numbers
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(Math.max(m.length - p1.length, 0)));

const lineOf = (idx) => jsPart.slice(0, idx).split("\n").length + cut;
const LIT = /"([^"\\\n]{3,})"|'([^'\\\n]{3,})'|`([^`\\\n]{3,})`/g;

const isMarkup   = (t) => /[<>]/.test(t);                       // SVG/HTML fragments
const isCssVar   = (t) => /var\(--/.test(t);
const isUrlish   = (t) => /^(https?:|\/\/|sha\d|data:)/.test(t) || /^[A-Za-z0-9+/=]{40,}$/.test(t);
const isFragment = (t) => /^[\s),.:;+\]}=]/.test(t) || /[({[]$/.test(t);   // cut mid-expression
const isCodeish  = (t) => /\.(replace|split|join|match|test)\(/.test(t) || /\/[gimsuy]*,/.test(t);
const isAttrName = (t) => /^[a-z-]+=$/.test(t);
const isToken    = (t) => /^[\w.#/\[\]@$-]+$/.test(t);          // selectors, paths, keys, @context
const isUnit     = (t) => /^(px|em|rem|true|false|null|undefined|middle|none|round|butt)$/i.test(t);
// with the ${...} holes removed, is what remains only CSS-identifier material?
// catches `dot ${st.status}`, `pathnode${stacked ?`, `peek-txt peek-closed`
const bare       = (t) => t.replace(/\$\{[^}]*\}?/g, " ").replace(/\s+/g, " ").trim();
const isCssish   = (t) => /^[a-z0-9 _.#-]*$/.test(bare(t));
const isCssDecl  = (t) => /^[a-z-]+\s*:\s*[\w.%-]+$/.test(t);      // height:14px
const isSvgPath  = (t) => /^[MLQACVHZmlqacvhz]\s/.test(t);         // path data
const isMime     = (t) => /^[a-z]+\/[a-z+.-]+$/.test(t);
const isEntity   = (t) => /^&[a-z]+;$/.test(t);

// a UI string is prose: at least two letters, and either a space or sentence
// punctuation. "today" and ", ongoing" are real; "esc" and "ltr" are not.
const looksLikeProse = (t) => /[A-Za-z]{2}/.test(t) && (/\s/.test(t) || /[.,!?;:\u2014\u00b7]/.test(t) || t.length >= 5);

for (const m of jsNoComments.matchAll(LIT)) {
  const t = (m[1] || m[2] || m[3] || "").trim();
  if (!t) continue;
  if (isMarkup(t) || isCssVar(t) || isUrlish(t) || isFragment(t) ||
      isCodeish(t) || isAttrName(t) || isToken(t) || isUnit(t) ||
      isCssish(t) || isCssDecl(t) || isSvgPath(t) || isMime(t) || isEntity(t)) continue;
  if (!looksLikeProse(t)) continue;
  add("js", t, `line ${lineOf(m.index)}`);
}

// Second pass: many user-facing strings are wrapped in markup INSIDE a JS
// literal — `<span class="bl">\u26a0 Draft figures \u2014 not yet verified.</span>`.
// The loop above rejects those wholesale because replacing a literal that
// carries markup is unsafe. Their TEXT NODES are safe to translate on their
// own, so they are collected separately.
//
// Over-collection here is harmless: the builder only substitutes strings that
// are present in the translation memory, so a fragment that is really code
// simply never matches anything and is left alone.
// An arrow function followed by a comparison looks exactly like a text node:
//   some(iv => !(end < iv[0] - 6 || ...))
// matches "> !(end <" and captures "!(end". That shipped once and broke the
// page with "fin is not defined". Prose does not contain JS operators.
const isCodeChars = (t) => /[!=&|{}\\]/.test(t) || /=>/.test(t) ||
  /\b(return|const|let|var|function|typeof|null|undefined)\b/.test(t);

for (const m of jsNoComments.matchAll(/>([^<>{}`$]{3,})</g)) {
  const t = m[1].replace(/\s+/g, " ").trim();
  if (!/[A-Za-z]{3}/.test(t)) continue;
  if (!/^[\p{L}\d\u2022\u00b7\u26a0"'(]/u.test(t)) continue;   // must start like prose
  if (isCodeChars(t)) continue;
  if (isCssish(t) || isCssDecl(t) || isToken(t) || isUnit(t) || isUrlish(t)) continue;
  if (!looksLikeProse(t)) continue;
  add("js", t, `line ${lineOf(m.index)} (in markup)`);
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const chars = (a) => a.reduce((n, x) => n + x.text.length, 0);
const pad = (s, n) => String(s).padStart(n);

console.log("");
console.log("  Translatable strings in " + PAGE);
console.log("  " + "-".repeat(66));
for (const [k, label] of [["data", "data/*.js rendered by the page"],
                          ["markup", "static HTML text + attributes"],
                          ["js", "JS literals (CANDIDATES — need review)"]]) {
  console.log(`  ${pad(out[k].length, 5)} strings  ${pad(chars(out[k]).toLocaleString(), 8)} chars   ${label}`);
}
const total = out.data.length + out.markup.length + out.js.length;
const totalC = chars(out.data) + chars(out.markup) + chars(out.js);
console.log("  " + "-".repeat(66));
console.log(`  ${pad(total, 5)} strings  ${pad(totalC.toLocaleString(), 8)} chars   TOTAL per language`);
console.log(`  ${pad("", 5)}           ${pad((totalC * 2).toLocaleString(), 8)} chars   billable for fr + pt`);
console.log("");

const listArg = process.argv.find((a) => a.startsWith("--list="));
if (listArg) {
  const b = listArg.split("=")[1];
  if (!out[b]) { console.error(`no bucket "${b}" — use data, markup or js`); process.exit(1); }
  out[b].forEach((x, i) => console.log(`${pad(i + 1, 4)}. [${x.where}]\n      ${x.text.slice(0, 150)}`));
  console.log("");
}

if (process.argv.includes("--write")) {
  const dir = path.join(ROOT, "i18n");
  fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, "strings.en.json");
  fs.writeFileSync(f, JSON.stringify({
    generated_at: new Date().toISOString(),
    page: PAGE,
    note: "Inventory only. The js bucket is regex candidates and must be reviewed before any substitution.",
    counts: { data: out.data.length, markup: out.markup.length, js: out.js.length },
    strings: out,
  }, null, 2) + "\n", "utf8");
  console.log(`  wrote ${path.relative(ROOT, f)}`);
  console.log("");
}
