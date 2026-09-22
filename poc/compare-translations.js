#!/usr/bin/env node
"use strict";
/**
 * poc/compare-translations.js — DEV-28 (proof of concept, gitignored)
 *
 * Sends the same sample of REAL strings from this repo through Google Translate
 * and DeepL, then writes a side-by-side page for scoring against
 * poc/scoring-sheet.md.
 *
 * Zero dependencies, Node 22, native fetch. Do not add a package.json.
 *
 *   node poc/compare-translations.js --dry-run
 *   node poc/compare-translations.js --source=surveillance --dry-run
 *   node poc/compare-translations.js --locale=fr
 *   node poc/compare-translations.js --locale=pt --engines=deepl
 *
 * Keys come from the environment only. Never commit them:
 *   export DEEPL_API_KEY=...
 *   export GOOGLE_API_KEY=...
 *
 * WHAT THIS CAN AND CANNOT MEASURE
 * It checks, objectively, whether every number, percentage, gene identifier,
 * trial ID and brand name survived the round trip. That is a real percentage.
 * It CANNOT judge whether the meaning is right — no script can. An engine can
 * keep 100% of its protected tokens and still invert a negation. Meaning, tone
 * and register are scored by a human in poc/scoring-sheet.md.
 *
 * KNOWN ASYMMETRY — read before judging the results.
 * DeepL supports glossaries on its free tier. Google's simple API-key endpoint
 * (Translation v2) does NOT; glossaries need Translation v3 Advanced, which
 * requires a GCP project and OAuth rather than an API key. So an out-of-the-box
 * comparison flatters DeepL on brand names and INNs. Judge the two engines on
 * prose quality, where the comparison is fair.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "engine-comparison.html");   // stays inside poc/, which is gitignored
const GLOSSARY_IDS = path.join(ROOT, "i18n", "glossary-ids.json");

const TARGET = {
  fr: { deepl: "FR", google: "fr" },
  pt: { deepl: "PT-PT", google: "pt-PT" },
};

const GLOBALS = {
  "data/products.js": "window.LAUNCH_DATA",
  "data/resistance.js": "window.LAUNCH_RESISTANCE",
  "data/molecular-markers.js": "window.LAUNCH_MOLECULAR_MARKERS",
};

// ---------------------------------------------------------------------------
// Reading the data files
// ---------------------------------------------------------------------------

function readDataFile(rel, marker) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const m = marker || GLOBALS[rel];
  const at = src.indexOf(m + " =");
  if (at === -1) throw new Error(`${rel}: marker "${m} =" not found`);
  return JSON.parse(src.slice(at + m.length + 2).trim().replace(/;\s*$/, ""));
}

// ---------------------------------------------------------------------------
// Sample A — mixed, across all three files. Each pick says WHY it is here.
// ---------------------------------------------------------------------------

const PICKS = [
  { file: "data/resistance.js",        at: (d) => d.meta.rule,                           path: "meta.rule", why: "Long technical sentence — the hardest thing either engine does" },
  { file: "data/resistance.js",        at: (d) => d.meta.metrics.treatmentFailure.full,  path: "meta.metrics.treatmentFailure.full", why: "Metric definition with a percentage and a qualifier" },
  { file: "data/resistance.js",        at: (d) => d.meta.metrics.delayedClearance.full,  path: "meta.metrics.delayedClearance.full", why: "Clinical threshold language — WHO has settled wording for this" },
  { file: "data/molecular-markers.js", at: (d) => d.meta.derivation,                     path: "meta.derivation", why: "Methodological caveat — tone and hedging matter" },
  { file: "data/molecular-markers.js", at: (d) => d.meta.markerDrug["Pfcrt K76T"],       path: 'meta.markerDrug["Pfcrt K76T"]', why: "Drug name that must survive unchanged" },
  { file: "data/products.js",          at: (d) => d.products[0].detail.useCase,          path: "products[0].detail.useCase", why: "Product description with a domain term" },
  { file: "data/products.js",          at: (d) => d.products[0].stages[0].note,          path: "products[0].stages[0].note", why: "Trial name, registry ID and figures inside prose" },
  { file: "data/products.js",          at: (d) => d.products[0].classLabel,              path: "products[0].classLabel", why: "Short label — length growth shows up worst here" },
  { file: "data/products.js",          at: (d) => d.products[0].detail.access[0],        path: "products[0].detail.access[0]", why: "Access commitment — formal register" },
  { file: "data/products.js",          at: (d) => d.products[0].detail.adoption[0],      path: "products[0].detail.adoption[0]", why: "Adoption note, often a sentence fragment" },
  { file: "data/products.js",          at: (d) => d.glossary.ACT,                        path: "glossary.ACT", why: "Glossary definition — dense, defines a term of art" },
  { file: "data/products.js",          at: (d) => d.glossary.MFT,                        path: "glossary.MFT", why: "Glossary definition with an embedded policy concept" },
  { file: "data/products.js",          at: (d) => d.glossary.PQ,                         path: "glossary.PQ", why: "Glossary definition naming an institution" },
  { file: "data/products.js",          at: (d) => d.changelog[0].plain,                  path: "changelog[0].plain", why: "Plain-language summary written for a lay reader" },
  { file: "data/products.js",          at: (d) => d.stages[0],                           path: "stages[0]", why: "UI-adjacent stage name — very short, must stay short" },
  { file: "data/products.js",          at: (d) => d.stages[3],                           path: "stages[3]", why: "Stage name containing an acronym" },
  { file: "data/products.js",          at: (d) => d.products[0].detail.research.question, path: "products[0].detail.research.question", why: "Research question — interrogative form" },
  { file: "data/products.js",          at: (d) => d.products[0].detail.milestones[0].milestone, path: "products[0].detail.milestones[0].milestone", why: "Milestone label with a trial name in brackets" },
  { file: "data/products.js",          at: (d) => (d.products.find((x) => x.flag) || {}).flag, path: "(d.products.find((x) => x.flag) || {}).flag", why: "Warning sentence — meaning must not soften" },
  { file: "data/products.js",          at: (d) => d.products[0].name,                    path: "products[0].name", why: "Brand name — MUST come back identical" },
  { file: "data/products.js",          at: (d) => d.products[0].inn,                     path: "products[0].inn", why: "INN — MUST come back identical or correctly localised" },
  { file: "data/resistance.js",        at: (d) => d.dict.country[0],                     path: "dict.country[0]", why: "Country name" },
  { file: "data/resistance.js",        at: (d) => d.dict.country[12],                    path: "dict.country[12]", why: "Country name where FR and EN differ" },
  { file: "data/resistance.js",        at: (d) => d.dict.drug[0],                        path: "dict.drug[0]", why: "Drug INN — glossary target" },
  { file: "data/resistance.js",        at: (d) => d.dict.drug[5],                        path: "dict.drug[5]", why: "Combination drug name with a separator" },
];

function mixedSample() {
  const cache = {};
  const out = [];
  for (const p of PICKS) {
    if (!cache[p.file]) cache[p.file] = readDataFile(p.file);
    let text;
    try { text = p.at(cache[p.file]); } catch { text = null; }
    if (typeof text !== "string" || !text.trim()) {
      console.warn(`  skipped (not found): ${p.why}`);
      continue;
    }
    out.push({ text: text.trim(), why: p.why, file: p.file, path: p.path || "" });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sample B — every prose string in the two WHO surveillance files, not a sample
// ---------------------------------------------------------------------------
// There are only 15, and they are the hardest content in the dataset: two very
// long technical sentences, definitions carrying clinical thresholds, and a
// methodological caveat whose hedging must survive. Plus a spread of country
// and drug names. Deduped — the two files share most country names.

function surveillanceSample() {
  const out = [];
  const seen = new Set();
  for (const file of ["data/resistance.js", "data/molecular-markers.js"]) {
    const d = readDataFile(file);
    const m = d.meta || {};
    const tag = file.includes("molecular") ? "markers" : "resistance";
    const push = (text, why) => {
      if (typeof text !== "string" || !text.trim()) return;
      const t = text.trim();
      if (seen.has(t)) return;
      seen.add(t);
      out.push({ text: t, why: `${tag} · ${why}`, file,
                 path: String(why).split(" — ")[0].trim() });
    };
    push(m.metric, "meta.metric — the headline metric definition");
    push(m.rule, "meta.rule — the longest technical sentence in the dataset");
    push(m.derivation, "meta.derivation — methodological caveat, hedging must survive");
    for (const [k, v] of Object.entries(m.metrics || {})) {
      push(v.short, `metrics.${k}.short — short label, length growth shows worst here`);
      push(v.full, `metrics.${k}.full — definition carrying a threshold or percentage`);
    }
    for (const [k, v] of Object.entries(m.markerDrug || {}))
      push(v, `markerDrug[${k}] — drug name that must survive unchanged`);
    const dict = d.dict || {};
    (dict.country || []).slice(0, 6).forEach((c, i) => push(c, `dict.country[${i}] — country name`));
    (dict.drug || []).slice(0, 6).forEach((c, i) => push(c, `dict.drug[${i}] — drug INN, glossary target`));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Automated checks — the only things a script can honestly judge
// ---------------------------------------------------------------------------

// Names that must come back byte-identical. A change here is a real defect.
const INVARIANT = ["GanLum", "Pyramax", "ALAQ", "Eurartesim", "Coartem", "Novartis",
                   "MMV", "Unitaid", "NAFDAC", "TMDA", "KALUMA"];

// Names that SHOULD change, because the organisation has an official name in the
// target language. WHO's own French and Portuguese publications say OMS, so
// checking these as invariant reports correct translations as failures.
const LOCALISED = {
  "WHO":         { fr: ["OMS"],           pt: ["OMS"] },
  "Global Fund": { fr: ["Fonds mondial"], pt: ["Fundo Global"] },
};

// 97.4 and 97,4 are the same number, and so are 1,720 / 1.720 / 1 720 / 1720.
// French and Portuguese use the comma as the decimal mark; French also inserts a
// space before %. Accept every spelling of the same value.
function numberVariants(tok) {
  const v = new Set([tok, tok.replace(/[.,\s\u00a0\u202f]/g, "")]);
  if (/[.,]/.test(tok)) {
    v.add(tok.replace(".", ","));
    v.add(tok.replace(",", "."));
    v.add(tok.replace(/[.,]/, "\u00a0"));
    v.add(tok.replace(/[.,]/, "\u202f"));
    v.add(tok.replace(/[.,]/, " "));
  }
  return [...v];
}

function protectedTokens(src) {
  const nums = new Set(), names = new Set(), locs = new Set();
  (src.match(/\d+(?:[.,]\d+)?/g) || []).forEach((x) => nums.add(x));         // numbers and percentages
  (src.match(/\bPf[A-Za-z]+[\d-]*\b/g) || []).forEach((x) => names.add(x));  // Pfkelch13, Pfcrt, Pfmdr1
  (src.match(/\b[A-Z]\d{2,4}[A-Z]\b/g) || []).forEach((x) => names.add(x));  // K76T, A675V
  (src.match(/\bNCT\d+\b/g) || []).forEach((x) => names.add(x));             // trial registry IDs
  INVARIANT.forEach((b) => { if (src.includes(b)) names.add(b); });
  Object.keys(LOCALISED).forEach((b) => { if (src.includes(b)) locs.add(b); });
  return { nums: [...nums], names: [...names], locs: [...locs] };
}

function checkRow(src, out, locale) {
  if (out == null) return null;
  const t = protectedTokens(src);
  const lost = [];
  t.nums.forEach((n) => { if (!numberVariants(n).some((v) => out.includes(v))) lost.push(n); });
  t.names.forEach((n) => { if (!out.includes(n)) lost.push(n); });
  // A localisable name passes if EITHER the original OR its official
  // target-language form is present.
  t.locs.forEach((n) => {
    const accept = [n].concat((LOCALISED[n] || {})[locale] || []);
    if (!accept.some((v) => out.includes(v))) lost.push(n);
  });
  return { total: t.nums.length + t.names.length + t.locs.length, lost };
}

const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

// ---------------------------------------------------------------------------
// Engines — each is one function, so adding a third is one function
// ---------------------------------------------------------------------------

async function deepl(texts, locale) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_API_KEY is not set");
  const glossary = fs.existsSync(GLOSSARY_IDS)
    ? JSON.parse(fs.readFileSync(GLOSSARY_IDS, "utf8"))[locale] : null;
  const body = { text: texts, target_lang: TARGET[locale].deepl, source_lang: "EN", preserve_formatting: true };
  if (glossary) body.glossary_id = glossary;
  // DeepL routes free-tier keys and paid keys to different hosts, and using the
  // wrong one returns 403 with no hint. Free keys end in ":fx"; everything else
  // (Developer, Growth, Pro) goes to the paid host.
  const host = key.trim().endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  const res = await fetch(`https://${host}/v2/translate`, {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status} via ${host}: ${(await res.text()).slice(0, 200)}`);
  return { out: (await res.json()).translations.map((t) => t.text), glossary: Boolean(glossary) };
}

async function google(texts, locale) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source: "en", target: TARGET[locale].google, format: "text" }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")
                         .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return { out: (await res.json()).data.translations.map((t) => decode(t.translatedText)), glossary: false };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const grow = (a, b) => (b && b.length && a.length ? Math.round(((b.length - a.length) / a.length) * 100) : 0);

function writePage(sample, results, locale, meta) {
  const totalWords = sample.reduce((n, s) => n + words(s.text), 0);
  const totalChars = sample.reduce((n, s) => n + s.text.length, 0);
  const grp = {};
  sample.forEach((s) => { const k = s.file.replace("data/", ""); grp[k] = (grp[k] || 0) + 1; });
  const breakdown = Object.entries(grp).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${v} from ${k}`).join(" · ");

  const cell = (src, out) => {
    if (out == null) return "<em>&mdash;</em>";
    const c = checkRow(src, out, locale);
    const pct = `${grow(src, out) >= 0 ? "+" : ""}${grow(src, out)}%`;
    const flag = !c || !c.total ? ""
      : c.lost.length ? `<span class="lost">lost: ${c.lost.map(esc).join(", ")}</span>`
                      : `<span class="kept">${c.total}/${c.total} kept</span>`;
    return `${esc(out)}<span class="len">${pct}</span>${flag}`;
  };

  const tally = (arr) => {
    if (!arr) return null;
    let total = 0, lost = 0;
    sample.forEach((s, i) => {
      const c = checkRow(s.text, arr[i], locale);
      if (c) { total += c.total; lost += c.lost.length; }
    });
    return { total, kept: total - lost, pct: total ? Math.round(((total - lost) / total) * 100) : null };
  };
  const tD = tally(results.deepl), tG = tally(results.google);

  const avg = (arr) => arr && arr.length
    ? Math.round(arr.reduce((n, t, i) => n + grow(sample[i].text, t), 0) / arr.length) : null;

  const rows = sample.map((s, i) => `
    <tr>
      <td class="why">${esc(s.why)}<span class="src">${esc(s.file.replace("data/", ""))} · ${words(s.text)} words</span></td>
      <td class="en">${esc(s.text)}</td>
      <td>${cell(s.text, results.deepl ? results.deepl[i] : null)}</td>
      <td>${cell(s.text, results.google ? results.google[i] : null)}</td>
      <td class="score"></td>
    </tr>`).join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Engine comparison — ${locale.toUpperCase()}</title>
<style>
  :root { color-scheme: light dark; --line:#d5dce4; --muted:#667; --bg:#fff; --alt:#f7f9fb; --ink:#111; }
  @media (prefers-color-scheme: dark){ :root{ --line:#334; --muted:#99a; --bg:#11151a; --alt:#161b22; --ink:#e6edf3; } }
  body { font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin:0; padding:28px 20px 60px; background:var(--bg); color:var(--ink); }
  .wrap { max-width:1400px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 6px; } .sub { color:var(--muted); margin:0 0 22px; font-size:13px; }
  .warn { border-left:3px solid #c08400; background:var(--alt); padding:12px 16px; margin:0 0 14px; font-size:13px; border-radius:0 4px 4px 0; }
  .scorecard { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:12px; margin:0 0 20px; }
  .sc { border:1px solid var(--line); border-radius:4px; padding:14px 16px; background:var(--alt); }
  .sc h3 { margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:600; }
  .sc .big { font-size:26px; font-family:ui-monospace,monospace; }
  .sc .sub2 { font-size:12px; color:var(--muted); margin-top:4px; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th,td { text-align:left; vertical-align:top; padding:10px 12px; border-bottom:1px solid var(--line); }
  thead th { position:sticky; top:0; background:var(--bg); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); border-bottom:2px solid var(--line); }
  tbody tr:nth-child(even) { background:var(--alt); }
  td.why { width:16%; color:var(--muted); font-size:12px; }
  td.why .src { display:block; font-family:ui-monospace,monospace; font-size:10.5px; opacity:.7; margin-top:4px; }
  td.en { width:22%; }
  .len { display:block; font-family:ui-monospace,monospace; font-size:10.5px; color:var(--muted); margin-top:5px; }
  .lost { display:block; font-family:ui-monospace,monospace; font-size:10.5px; color:#b3261e; margin-top:3px; }
  .kept { display:block; font-family:ui-monospace,monospace; font-size:10.5px; color:#1a7f5a; margin-top:3px; }
  @media (prefers-color-scheme: dark){ .lost{color:#f2917f;} .kept{color:#6ed3a8;} }
  td.score { width:9%; background:#fffbe6; } @media (prefers-color-scheme: dark){ td.score{ background:#2a2410; } }
  .foot { margin-top:22px; color:var(--muted); font-size:12px; }
</style></head><body><div class="wrap">
<h1>Translation engine comparison — English to ${locale.toUpperCase()}</h1>
<p class="sub">Source set <strong>${meta.source}</strong> · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</p>

<div class="scorecard">
  <div class="sc"><h3>Sample</h3><div class="big">${sample.length}</div>
    <div class="sub2">strings · ${totalWords.toLocaleString()} words · ${totalChars.toLocaleString()} characters<br>${breakdown}</div></div>
  <div class="sc"><h3>Protected tokens kept — DeepL</h3><div class="big">${tD ? tD.pct + "%" : "&mdash;"}</div>
    <div class="sub2">${tD ? `${tD.kept} of ${tD.total}` : "not run"} · avg length ${avg(results.deepl) != null ? (avg(results.deepl) >= 0 ? "+" : "") + avg(results.deepl) + "%" : "&mdash;"}</div></div>
  <div class="sc"><h3>Protected tokens kept — Google</h3><div class="big">${tG ? tG.pct + "%" : "&mdash;"}</div>
    <div class="sub2">${tG ? `${tG.kept} of ${tG.total}` : "not run"} · avg length ${avg(results.google) != null ? (avg(results.google) >= 0 ? "+" : "") + avg(results.google) + "%" : "&mdash;"}</div></div>
</div>

<div class="warn"><strong>The only percentage here is the automated one.</strong> &ldquo;Protected tokens kept&rdquo; counts whether every number, percentage, gene identifier (Pfkelch13, K76T), trial ID and brand name in the English survived into the translation. That is objective and a script can judge it. <strong>Whether the meaning is right cannot be checked automatically</strong> — no score for that is generated here. You read the rows and fill in <code>poc/scoring-sheet.md</code>. An engine can keep 100% of its tokens and still invert a negation.</div>

<div class="warn"><strong>The glossary comparison is not fair.</strong> DeepL glossary: <strong>${meta.deeplGlossary ? "ON" : "off"}</strong> · Google glossary: <strong>not available</strong> on the API-key endpoint (needs Translation v3 Advanced with OAuth). Brand names and INNs therefore flatter DeepL — judge prose quality on the sentence rows, where both engines are unaided.</div>

<table>
<thead><tr><th>What this row tests</th><th>English</th><th>DeepL</th><th>Google</th><th>Better?</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="foot">Percentages beside each translation are length growth against English. French and Portuguese commonly run 15–30% longer; an engine consistently above that costs layout work later. Score each row in <code>poc/scoring-sheet.md</code>.</p>
</div></body></html>`;

  // The source set has to be in the filename, or a --source run silently
  // overwrites the mixed-sample run for the same locale.
  const tag = meta.source && meta.source !== "all" ? `-${meta.source}` : "";
  const file = OUT.replace(".html", `-${locale}${tag}.html`);
  fs.writeFileSync(file, html, "utf8");

  // Companion JSON — the same data, machine-readable. Upload this to a reviewer
  // (human or model) who can read French and Portuguese and judge meaning,
  // which the automated token check deliberately does not attempt.
  const jsonFile = file.replace(".html", ".json");
  fs.writeFileSync(jsonFile, JSON.stringify({
    locale,
    source: meta.source,
    generated_at: new Date().toISOString(),
    deepl_glossary: meta.deeplGlossary,
    google_glossary: false,
    totals: {
      strings: sample.length,
      words: totalWords,
      characters: totalChars,
      by_file: grp,
      protected_tokens: { deepl: tD, google: tG },
      avg_length_growth: { deepl: avg(results.deepl), google: avg(results.google) },
    },
    rows: sample.map((s, i) => ({
      tests: s.why,
      file: s.file,
      path: s.path || "",
      words: words(s.text),
      en: s.text,
      deepl: results.deepl ? results.deepl[i] : null,
      google: results.google ? results.google[i] : null,
      protected_lost: {
        deepl: results.deepl ? (checkRow(s.text, results.deepl[i], locale) || {}).lost : null,
        google: results.google ? (checkRow(s.text, results.google[i], locale) || {}).lost : null,
      },
    })),
  }, null, 2), "utf8");

  return { file, jsonFile };
}

// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => { const a = argv.find((x) => x.startsWith(f + "=")); return a ? a.slice(f.length + 1) : d; };
  const locale = val("--locale", "fr");
  const source = val("--source", "all");
  const engines = val("--engines", "deepl,google").split(",").map((s) => s.trim());
  const dryRun = argv.includes("--dry-run");

  if (!TARGET[locale]) throw new Error(`Unknown locale "${locale}" — use fr or pt`);
  if (!["all", "surveillance", "products"].includes(source))
    throw new Error(`Unknown --source "${source}" — use all, surveillance or products`);

  const sample = source === "surveillance" ? surveillanceSample()
               : source === "products"     ? mixedSample().filter((x) => x.file.includes("products"))
               : mixedSample();

  const chars = sample.reduce((n, s) => n + s.text.length, 0);
  const totalWords = sample.reduce((n, s) => n + words(s.text), 0);
  console.log(`\nSource    ${source}`);
  console.log(`Sample    ${sample.length} strings, ${totalWords.toLocaleString()} words, ${chars.toLocaleString()} characters`);
  console.log(`Cost      ${(chars * engines.length).toLocaleString()} characters across ${engines.length} engine(s)\n`);

  const by = {};
  for (const s of sample) {
    const k = s.file.replace("data/", "");
    by[k] = by[k] || { n: 0, w: 0, c: 0 };
    by[k].n++; by[k].w += words(s.text); by[k].c += s.text.length;
  }
  console.log("  strings  words   chars   source file");
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1].n - a[1].n))
    console.log(`  ${String(v.n).padStart(7)}  ${String(v.w).padStart(5)}  ${String(v.c).padStart(6)}   ${k}`);
  const prot = sample.reduce((n, s) => {
    const t = protectedTokens(s.text);
    return n + t.nums.length + t.names.length + t.locs.length;
  }, 0);
  console.log(`\n  ${prot} protected tokens (numbers, gene IDs, brand names) — checked automatically\n`);

  if (dryRun) {
    sample.forEach((s, i) => console.log(`${String(i + 1).padStart(2)}. ${s.why}\n` + `    ${s.file.replace("data/", "")} → ${s.path || "?"}\n` + `    ${s.text.slice(0, 110)}${s.text.length > 110 ? "…" : ""}\n`));
    console.log("--dry-run: no API calls made.");
    return;
  }

  const texts = sample.map((s) => s.text);
  const results = {};
  const meta = { deeplGlossary: false, source };

  for (const e of engines) {
    process.stdout.write(`${e} → ${locale} … `);
    const fn = e === "deepl" ? deepl : e === "google" ? google : null;
    if (!fn) throw new Error(`Unknown engine "${e}"`);
    const r = await fn(texts, locale);
    results[e] = r.out;
    if (e === "deepl") meta.deeplGlossary = r.glossary;
    console.log("ok");
  }

  const { file, jsonFile } = writePage(sample, results, locale, meta);
  console.log(`\nWrote ${path.relative(ROOT, file)}`);
  console.log(`Wrote ${path.relative(ROOT, jsonFile)}  ← upload this for a meaning review`);
  console.log("Open it, score each row in poc/scoring-sheet.md, then record the decision in docs/i18n-schema.md.");
  console.log("Delete the comparison HTML once the decision is written down — it is gitignored and goes stale fast.");
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
