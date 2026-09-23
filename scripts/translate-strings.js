#!/usr/bin/env node
/**
 * scripts/translate-strings.js  —  DEV-31 step 2
 *
 * Translates the inventory from extract-strings.js into French and Portuguese
 * using Google Cloud Translation, and saves the results in a translation
 * memory at i18n/translations.json.
 *
 *   node scripts/translate-strings.js --dry-run          # cost, no API calls
 *   node scripts/translate-strings.js --locale=fr
 *   node scripts/translate-strings.js --locale=pt
 *
 * Two rules govern everything here:
 *
 *   1. EMPTY-LOCALE-ONLY. A locale that already holds text is never touched,
 *      whether the engine wrote it last month or a person corrected it five
 *      minutes ago. That is what makes "fix it in the source file" work with
 *      no lock flags and no state to maintain.
 *
 *   2. CONTENT-ADDRESSED. Each entry is keyed by a fingerprint of the ENGLISH,
 *      sha256(text).slice(0,16). Edit the English and its fingerprint changes,
 *      nothing matches, and it re-translates by itself. Nobody has to keep a
 *      list of translations that went stale.
 *
 * GOOGLE_API_KEY comes from the environment. It is never committed, never read
 * from a file, and never reaches the browser.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { identifiers } = require("./i18n-identifiers");

const ROOT = path.resolve(__dirname, "..");
const MEM = path.join(ROOT, "i18n", "translations.json");
const TARGET = { fr: "fr", pt: "pt-PT" };

// ---------------------------------------------------------------------------
// Never send these, whatever bucket they turn up in.
// ---------------------------------------------------------------------------
const DENY_EXACT = new Set([
  "P. falciparum", "P. vivax", "P. malariae", "P. ovale", "P. knowlesi",
  "application/ld+json", "repeatCount=", "(prefers-color-scheme: dark)",
  'input[name="reslayer"]', 'input[name="reslayer"]:checked',
]);
// gene markers, amplifications and mutation codes — identifiers, not prose
const DENY_PATTERN = [
  /^Pf[A-Za-z]/,                 // Pfkelch13, Pfcrt, Pfplasmepsin 2-3 amplifications
  /^[A-Z]\d{2,4}[A-Z]$/,         // K76T, A675V
  /^NCT\d+$/,                    // trial registry IDs
  /^[a-z-]+\[[^\]]*\]/,          // css attribute selectors
];
// Drug, marker and species names are lookup keys, derived from the data files
// rather than hand-listed so a new WHO drug is protected the day it lands.
const IDENT = identifiers(ROOT);
const denied = (t) => IDENT.has(t) || DENY_EXACT.has(t) || DENY_PATTERN.some((r) => r.test(t));

const fp = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

// ---------------------------------------------------------------------------
// inventory — reuse the extractor rather than re-deriving the string list
// ---------------------------------------------------------------------------
function inventory() {
  const tmp = path.join(ROOT, "i18n", "strings.en.json");
  execFileSync(process.execPath, [path.join(__dirname, "extract-strings.js"), "--write"],
               { cwd: ROOT, stdio: "pipe" });
  const j = JSON.parse(fs.readFileSync(tmp, "utf8"));
  const all = [];
  for (const b of ["data", "markup", "js"]) {
    for (const s of j.strings[b]) all.push({ ...s, bucket: b });
  }
  return all;
}

function loadMemory() {
  if (!fs.existsSync(MEM)) return { schema: 1, entries: {} };
  return JSON.parse(fs.readFileSync(MEM, "utf8"));
}

function saveMemory(mem) {
  fs.mkdirSync(path.dirname(MEM), { recursive: true });
  // stable key order so a rerun that changes nothing produces no diff
  const ordered = {};
  for (const k of Object.keys(mem.entries).sort()) ordered[k] = mem.entries[k];
  mem.entries = ordered;
  fs.writeFileSync(MEM, JSON.stringify(mem, null, 2) + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Placeholder protection.
//
// About ten of these strings are template literals carrying ${...} holes:
//
//   "${esc(STAGES[b])} was reached ${yrs} yr${yrs === 1 ? "" : "s"} before ..."
//
// Sent raw, the engine translates the code inside the braces and the page
// breaks. Each hole is swapped for a rare bracketed token that engines leave
// alone, then restored. If a token does not survive the round trip the
// translation is REJECTED and the English is kept — a missing placeholder is
// a broken page, which is worse than an untranslated string.
// ---------------------------------------------------------------------------
const HOLE = /\$\{(?:[^{}]|\{[^{}]*\})*\}/g;

// ---------------------------------------------------------------------------
// Protected terms — the glossary Google's API-key endpoint does not give us.
//
// Google Translation v2 has no glossary support; that needs v3 Advanced with a
// service account. Masking the terms here does the same job for the cost of a
// regex, and keeps the whole pipeline on a simple API key that nobody has to
// own after handover.
//
// Without this the engine produced, in the first real build:
//   "LAUNCH Transparency Dashboard" -> "LANCEMENT Tableau de bord"
//   "WHO PQ listing"                -> "Liste des questions periodiques"
// Both are the project's own vocabulary, and both are wrong in any language.
//
// Longest first, so "ACTs" masks before "ACT" and "Pfkelch13" before "Pf".
// ---------------------------------------------------------------------------
const PROTECT = [
  // project and product names
  "LAUNCH", "GanLum", "Pyramax", "Eurartesim", "Coartem", "KALUMA", "ALAQ",
  // organisations whose names do not localise
  "Unitaid", "Novartis", "NAFDAC", "TMDA", "MMV", "RBM",
  // domain acronyms that are read as words if translated
  "ACTs", "ACT", "MFT", "PQ", "SRA", "TES", "PCR", "INN",
  // species and gene markers
  "P. falciparum", "P. vivax", "Pfplasmepsin", "Pfkelch13", "Pfcrt", "Pfmdr1",
].sort((a, b) => b.length - a.length);

const TERM = new RegExp(
  "(?<![\\p{L}\\d])(" + PROTECT.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") +
  ")(?![\\p{L}\\d])", "gu");

function protect(text) {
  const holes = [];
  const take = (m) => { holes.push(m); return `\u27e6${holes.length - 1}\u27e7`; };
  // ${...} first, then protected terms — a term inside a hole must not double-mask
  return { masked: text.replace(HOLE, take).replace(TERM, take), holes };
}

function restore(masked, holes) {
  let out = masked;
  for (let i = 0; i < holes.length; i++) {
    const tok = new RegExp(`\u27e6\\s*${i}\\s*\u27e7`);
    if (!tok.test(out)) return null;            // placeholder lost — reject
    out = out.replace(tok, () => holes[i]);
  }
  if (/[\u27e6\u27e7]/.test(out)) return null;   // stray token left behind
  return out;
}

// ---------------------------------------------------------------------------
// Google Cloud Translation v2
// ---------------------------------------------------------------------------
async function googleTranslate(texts, locale) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not set");
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ q: texts, source: "en", target: TARGET[locale], format: "text" }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).data.translations.map((t) => t.translatedText);
}

// ---------------------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const arg = (n, d) => { const a = argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.split("=")[1] : d; };
  const locale = arg("locale", null);

  if (!dryRun && !TARGET[locale]) {
    console.error("usage: --locale=fr | --locale=pt   (or --dry-run)");
    process.exit(1);
  }

  const all = inventory();
  const mem = loadMemory();

  const kept = all.filter((s) => !denied(s.text));
  const skipped = all.length - kept.length;

  // what is actually missing for this locale — the empty-locale-only rule
  const locales = locale ? [locale] : ["fr", "pt"];
  const report = {};
  for (const loc of locales) {
    const todo = kept.filter((s) => {
      const e = mem.entries[fp(s.text)];
      return !e || !e[loc];
    });
    report[loc] = todo;
  }

  console.log("");
  console.log(`  inventory        ${all.length} strings`);
  console.log(`  deny-listed      ${skipped} skipped (species, gene markers, selectors)`);
  console.log(`  translatable     ${kept.length}`);
  for (const loc of locales) {
    const t = report[loc];
    const chars = t.reduce((n, s) => n + s.text.length, 0);
    const have = kept.length - t.length;
    console.log(`  ${loc}: ${have} already in memory · ${t.length} to translate · ${chars.toLocaleString()} characters`);
  }
  console.log("");

  if (dryRun) { console.log("  --dry-run: no API calls made.\n"); return; }

  const todo = report[locale];
  if (!todo.length) { console.log("  nothing to do — every string already has this locale.\n"); return; }

  // batch by payload size; Google takes an array of q values per call
  const BATCH = 80;
  let done = 0;
  const rejected = [];
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const masked = slice.map((s) => protect(s.text));
    const outs = await googleTranslate(masked.map((m) => m.masked), locale);
    slice.forEach((s, j) => {
      const back = restore(outs[j], masked[j].holes);
      if (back === null) { rejected.push(s.text); return; }   // keep English
      const k = fp(s.text);
      const e = (mem.entries[k] ||= { en: s.text, where: s.where, bucket: s.bucket });
      if (!e[locale]) e[locale] = back;          // empty-locale-only, enforced here too
    });
    done += slice.length;
    process.stdout.write(`\r  google → ${locale} … ${done}/${todo.length}`);
  }
  console.log("");
  saveMemory(mem);
  console.log(`  wrote ${path.relative(ROOT, MEM)} — ${Object.keys(mem.entries).length} entries`);
  if (rejected.length) {
    console.log(`\n  ${rejected.length} REJECTED — placeholders did not survive, English kept:`);
    rejected.forEach((t) => console.log(`    ${t.slice(0, 90)}`));
    console.log("  Re-run to retry them, or translate those by hand in i18n/translations.json.");
  }
  console.log("");
}

main().catch((e) => { console.error("\n  " + e.message + "\n"); process.exit(1); });
