#!/usr/bin/env node
"use strict";
/**
 * scripts/compare-translations.js — DEV-28
 *
 * Sends the same sample of REAL strings from this repo through Google Translate
 * and DeepL, then writes a side-by-side page for scoring against
 * docs/engine-comparison-scoring.md.
 *
 * Zero dependencies, Node 22, native fetch. Do not add a package.json.
 *
 *   node scripts/compare-translations.js --dry-run        # show the sample, no API calls
 *   node scripts/compare-translations.js --locale=fr
 *   node scripts/compare-translations.js --locale=fr --engines=deepl
 *
 * Keys come from the environment only. Never commit them:
 *   export DEEPL_API_KEY=...
 *   export GOOGLE_API_KEY=...
 *
 * KNOWN ASYMMETRY — read before judging the results.
 * DeepL supports glossaries on its free tier. Google's simple API-key endpoint
 * (Translation v2) does NOT; glossaries need Translation v3 Advanced, which
 * requires a GCP project and OAuth rather than an API key. So an out-of-the-box
 * comparison flatters DeepL on brand names and INNs. Score those separately —
 * see the scoring sheet — and judge the two engines on prose quality, where the
 * comparison is fair.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "engine-comparison.html");   // gitignored — a throwaway decision aid, not a repo artefact

const TARGET = {
  fr: { deepl: "FR", google: "fr" },
  pt: { deepl: "PT-PT", google: "pt-PT" },
};

// ---------------------------------------------------------------------------
// The sample — deliberately chosen, not random
// ---------------------------------------------------------------------------
// Each entry names WHY it is in the sample, so a reader of the results knows
// what each row is testing. Pulled live from the repo so the comparison is
// against our actual content.

const PICKS = [
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.meta.rule,                          why: "Long technical sentence — the hardest thing either engine does" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.meta.metrics.treatmentFailure.full, why: "Metric definition with a percentage and a qualifier" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.meta.metrics.delayedClearance.full,  why: "Clinical threshold language — WHO has settled wording for this" },
  { file: "data/molecular-markers.js", g: "window.LAUNCH_MOLECULAR_MARKERS", at: (d) => d.meta.derivation,                    why: "Methodological caveat — tone and hedging matter" },
  { file: "data/molecular-markers.js", g: "window.LAUNCH_MOLECULAR_MARKERS", at: (d) => d.meta.markerDrug["Pfcrt K76T"],      why: "Drug name that must survive unchanged" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].detail.useCase,          why: "Product description with a domain term" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].stages[0].note,          why: "Trial name, registry ID and figures inside prose" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].classLabel,              why: "Short label — length growth shows up worst here" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].detail.access[0],        why: "Access commitment — formal register" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].detail.adoption[0],      why: "Adoption note, often a sentence fragment" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.glossary.ACT,                        why: "Glossary definition — dense, defines a term of art" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.glossary.MFT,                        why: "Glossary definition with an embedded policy concept" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.glossary.PQ,                         why: "Glossary definition naming an institution" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.changelog[0].plain,                  why: "Plain-language summary written for a lay reader" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.stages[0],                           why: "UI-adjacent stage name — very short, must stay short" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.stages[3],                           why: "Stage name containing an acronym" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].detail.research.question, why: "Research question — interrogative form" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].detail.milestones[0].milestone, why: "Milestone label with a trial name in brackets" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => (d.products.find((x) => x.flag) || {}).flag, why: "Warning sentence — meaning must not soften" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].name,                    why: "Brand name — MUST come back identical" },
  { file: "data/products.js",          g: "window.LAUNCH_DATA",              at: (d) => d.products[0].inn,                     why: "INN — MUST come back identical or correctly localised" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.dict.country[0],                     why: "Country name" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.dict.country[12],                    why: "Country name where FR and EN differ" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.dict.drug[0],                        why: "Drug INN — glossary target" },
  { file: "data/resistance.js",        g: "window.LAUNCH_RESISTANCE",        at: (d) => d.dict.drug[5],                        why: "Combination drug name with a separator" },
];

function readDataFile(rel, marker) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const at = src.indexOf(marker + " =");
  if (at === -1) throw new Error(`${rel}: marker not found`);
  return JSON.parse(src.slice(at + marker.length + 2).trim().replace(/;\s*$/, ""));
}

function buildSample() {
  const cache = {};
  const out = [];
  for (const p of PICKS) {
    if (!cache[p.file]) cache[p.file] = readDataFile(p.file, p.g);
    let text;
    try { text = p.at(cache[p.file]); } catch { text = null; }
    if (typeof text !== "string" || !text.trim()) {
      console.warn(`  skipped (not found): ${p.why}`);
      continue;
    }
    out.push({ text: text.trim(), why: p.why, file: p.file });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Engines — each is one function, so adding a third is one function
// ---------------------------------------------------------------------------

async function deepl(texts, locale) {
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new Error("DEEPL_API_KEY is not set");
  const glossaryFile = path.join(ROOT, "i18n", "glossary-ids.json");
  const glossary = fs.existsSync(glossaryFile)
    ? JSON.parse(fs.readFileSync(glossaryFile, "utf8"))[locale]
    : null;
  const body = { text: texts, target_lang: TARGET[locale].deepl, source_lang: "EN", preserve_formatting: true };
  if (glossary) body.glossary_id = glossary;
  const res = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}: ${(await res.text()).slice(0, 200)}`);
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
const grow = (a, b) => (b.length && a.length ? Math.round(((b.length - a.length) / a.length) * 100) : 0);

function writePage(sample, results, locale, meta) {
  const rows = sample.map((s, i) => {
    const d = results.deepl ? results.deepl[i] : null;
    const g = results.google ? results.google[i] : null;
    return `
    <tr>
      <td class="why">${esc(s.why)}<span class="src">${esc(s.file.replace("data/", ""))}</span></td>
      <td class="en">${esc(s.text)}</td>
      <td>${d == null ? "<em>—</em>" : esc(d)}${d == null ? "" : `<span class="len">${grow(s.text, d) >= 0 ? "+" : ""}${grow(s.text, d)}%</span>`}</td>
      <td>${g == null ? "<em>—</em>" : esc(g)}${g == null ? "" : `<span class="len">${grow(s.text, g) >= 0 ? "+" : ""}${grow(s.text, g)}%</span>`}</td>
      <td class="score"></td>
    </tr>`;
  }).join("");

  const avg = (arr) => arr && arr.length
    ? Math.round(arr.reduce((n, t, i) => n + grow(sample[i].text, t), 0) / arr.length) : null;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>Engine comparison — ${locale.toUpperCase()}</title>
<style>
  :root { color-scheme: light dark; --line:#d5dce4; --muted:#667; --bg:#fff; --alt:#f7f9fb; --ink:#111; }
  @media (prefers-color-scheme: dark){ :root{ --line:#334; --muted:#99a; --bg:#11151a; --alt:#161b22; --ink:#e6edf3; } }
  body { font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; margin:0; padding:28px 20px 60px; background:var(--bg); color:var(--ink); }
  .wrap { max-width:1400px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 6px; } .sub { color:var(--muted); margin:0 0 22px; font-size:13px; }
  .warn { border-left:3px solid #c08400; background:var(--alt); padding:12px 16px; margin:0 0 22px; font-size:13px; border-radius:0 4px 4px 0; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th,td { text-align:left; vertical-align:top; padding:10px 12px; border-bottom:1px solid var(--line); }
  thead th { position:sticky; top:0; background:var(--bg); font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); border-bottom:2px solid var(--line); }
  tbody tr:nth-child(even) { background:var(--alt); }
  td.why { width:15%; color:var(--muted); font-size:12px; }
  td.why .src { display:block; font-family:ui-monospace,monospace; font-size:10.5px; opacity:.7; margin-top:4px; }
  td.en { width:23%; }
  .len { display:block; font-family:ui-monospace,monospace; font-size:10.5px; color:var(--muted); margin-top:5px; }
  td.score { width:9%; background:#fffbe6; } @media (prefers-color-scheme: dark){ td.score{ background:#2a2410; } }
  .foot { margin-top:22px; color:var(--muted); font-size:12px; }
</style></head><body><div class="wrap">
<h1>Translation engine comparison — English to ${locale.toUpperCase()}</h1>
<p class="sub">${sample.length} strings from the live repository · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</p>
<div class="warn"><strong>Read this before scoring.</strong> DeepL glossary: <strong>${meta.deeplGlossary ? "ON" : "off"}</strong> · Google glossary: <strong>not available</strong> on the API-key endpoint (needs Translation v3 Advanced with OAuth). Brand names and INNs are therefore not a fair comparison — score those rows separately. Judge prose quality on the sentence rows, where both engines are unaided.</div>
<table>
<thead><tr><th>What this row tests</th><th>English</th><th>DeepL${avg(results.deepl) != null ? ` · avg ${avg(results.deepl) >= 0 ? "+" : ""}${avg(results.deepl)}%` : ""}</th><th>Google${avg(results.google) != null ? ` · avg ${avg(results.google) >= 0 ? "+" : ""}${avg(results.google)}%` : ""}</th><th>Better?</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="foot">Percentages are length growth against English. French and Portuguese commonly run 15–30% longer; an engine consistently above that costs layout work later. Score each row in <code>docs/engine-comparison-scoring.md</code>.</p>
</div></body></html>`;

  const file = OUT.replace(".html", `-${locale}.html`);
  fs.writeFileSync(file, html, "utf8");
  return file;
}

// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const val = (f, d) => { const a = argv.find((x) => x.startsWith(f + "=")); return a ? a.slice(f.length + 1) : d; };
  const locale = val("--locale", "fr");
  const engines = val("--engines", "deepl,google").split(",").map((s) => s.trim());
  const dryRun = argv.includes("--dry-run");

  if (!TARGET[locale]) throw new Error(`Unknown locale "${locale}" — use fr or pt`);

  const sample = buildSample();
  const chars = sample.reduce((n, s) => n + s.text.length, 0);
  console.log(`Sample    ${sample.length} strings, ${chars.toLocaleString()} characters`);
  console.log(`Cost      ${(chars * engines.length).toLocaleString()} characters total across ${engines.length} engine(s)\n`);

  if (dryRun) {
    sample.forEach((s, i) => console.log(`${String(i + 1).padStart(2)}. ${s.why}\n    ${s.text.slice(0, 110)}${s.text.length > 110 ? "…" : ""}\n`));
    console.log("--dry-run: no API calls made.");
    return;
  }

  const texts = sample.map((s) => s.text);
  const results = {};
  const meta = { deeplGlossary: false };

  for (const e of engines) {
    process.stdout.write(`${e} → ${locale} … `);
    const fn = e === "deepl" ? deepl : e === "google" ? google : null;
    if (!fn) throw new Error(`Unknown engine "${e}"`);
    const r = await fn(texts, locale);
    results[e] = r.out;
    if (e === "deepl") meta.deeplGlossary = r.glossary;
    console.log("ok");
  }

  const file = writePage(sample, results, locale, meta);
  console.log(`\nWrote ${path.relative(ROOT, file)}`);
  console.log("Open it, score each row in docs/engine-comparison-scoring.md, then record the decision in docs/i18n-schema.md.");
}

main().catch((e) => { console.error(`\n${e.message}`); process.exit(1); });
