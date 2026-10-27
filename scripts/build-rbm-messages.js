#!/usr/bin/env node
// Builds the interface-text files for the React version of the dashboard that
// RBM's Next.js app loads through its i18n.ts: one JSON file per language,
// nested by key path.
//
//   node scripts/build-rbm-messages.js                 # → dist/rbm-messages/{en,fr,pt}.json
//   node scripts/build-rbm-messages.js --check         # the same checks, writes nothing
//   node scripts/build-rbm-messages.js --allow-stale   # a string with no translation stays English
//
// Only the INTERFACE text is here: buttons, labels, headings, messages, the
// feedback form, the failure messages. Data texts (products, sources, stages,
// glossary, country names) come translated inside dashboard.json.
//
// HOW. The English is i18n/ui.en.json: named keys, {name} placeholders. French
// and Portuguese come from the translation memory, i18n/translations.json,
// whose entries are filed under key(English as the page writes it)
// (scripts/i18n-hash.js):
//   - a key without placeholders holds the page's exact English, so its
//     translation is memory[key(English)];
//   - a key with placeholders has its page form in i18n/ui.page-forms.json
//     ("Stage ${stepNo(i)} of ${STAGE_COLUMNS.length}", or words the page joins
//     with +). Its translation is looked up under that form, and each ${...}
//     hole in it is turned into the {placeholder} ui.en.json uses.
// Every translated string must keep exactly the English's placeholders, or it
// counts as missing.
//
// A string with no translation (or one that cannot be converted): the build
// fails and lists them, unless --allow-stale, which writes the English in its
// place and says so. A string the memory holds only as a stub
// (TRANSLATE_ENGINE=stub) counts as missing.
//
// Not wired into scripts/assemble-content.js yet, so ui.en.json is not part of
// the approval hash and the translate bot does not see its new strings:
// docs/rbm-messages-notes.md.
//
// Requires Node 18+. No dependencies.
"use strict";
const fs = require("fs");
const path = require("path");
const { key } = require("./i18n-hash");
const { LOCALES } = require("./rbm-manifest");

const ROOT = path.resolve(__dirname, "..");
const UI = path.join(ROOT, "i18n", "ui.en.json");
const FORMS = path.join(ROOT, "i18n", "ui.page-forms.json");
const MEM = path.join(ROOT, "i18n", "translations.json");
const CONTENT = path.join(ROOT, "i18n", "content.en.json");
const OUT = path.join(ROOT, "dist", "rbm-messages");
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

// ---------------------------------------------------------------------------
// keys
// ---------------------------------------------------------------------------
// camelCase segments, dot-separated. Keys starting with "_" are notes for the
// reader of ui.en.json, never messages.
const SEGMENT = /^[a-z][A-Za-z0-9]*$/;

// { a: { b: "x" } } → [["a.b", "x"]], in file order
function flatten(obj, prefix = "", out = [], errors = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("_")) continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (!SEGMENT.test(k)) errors.push(`${p}: "${k}" is not a camelCase key`);
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, p, out, errors);
    else if (typeof v !== "string" || !v.trim()) errors.push(`${p}: not a non-empty string`);
    else out.push([p, v]);
  }
  return Object.assign(out, { errors });
}

// [["a.b", "x"]] → { a: { b: "x" } }
function nest(pairs) {
  const root = {};
  for (const [p, v] of pairs) {
    const parts = p.split(".");
    let o = root;
    parts.slice(0, -1).forEach((s) => { o = (o[s] ||= {}); });
    o[parts[parts.length - 1]] = v;
  }
  return root;
}

// ICU-style {name} placeholders, sorted, without repeats
const PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const placeholders = (s) => [...new Set([...String(s).matchAll(PLACEHOLDER)].map((m) => m[1]))].sort();

// What an ICU message reader would misread: a brace that is not part of a
// {name}, and an ASCII apostrophe next to a brace or another apostrophe (ICU's
// quoting character: "l'{stage}" would print "{stage}" literally).
function icuProblems(s) {
  const p = [];
  if (/[{}]/.test(String(s).replace(PLACEHOLDER, ""))) p.push("a { or } that is not a {placeholder}");
  if (/'[{}']|[{}]'/.test(s)) p.push("an ASCII apostrophe next to a brace or another apostrophe (ICU quoting)");
  if (/\$\{/.test(s)) p.push("a ${...} hole left in");
  return p;
}

// ---------------------------------------------------------------------------
// page forms
// ---------------------------------------------------------------------------
// One form as a list of parts: a string is copied as it is; { t, holes, drop }
// is a memory string.
function partsOf(form) {
  if (Array.isArray(form.parts)) return form.parts;
  if (typeof form.page === "string") return [{ t: form.page, holes: form.holes || {}, drop: form.drop }];
  return null;
}

// One memory string with its holes filled and its leading `drop` removed. The
// same function makes the English (from the form) and each translation, so the
// two are converted by one rule. Fails if a hole is not there exactly as often
// as in the English page form, or the drop is not where it should be.
function fill(text, part, englishText) {
  let s = String(text);
  if (part.drop) {
    if (!s.startsWith(part.drop)) return { error: `does not start with "${part.drop}"` };
    s = s.slice(part.drop.length);
  }
  for (const [hole, to] of Object.entries(part.holes || {})) {
    const want = englishText.split(hole).length - 1;
    const have = s.split(hole).length - 1;
    if (!want) return { error: `the form's hole ${hole} is not in its page text` };
    if (have !== want) return { error: `has ${hole} ${have} time(s), the English ${want}` };
    s = s.split(hole).join(to);
  }
  return { text: s };
}

// ---------------------------------------------------------------------------
// the build
// ---------------------------------------------------------------------------
const STUB = /^\[stub-[a-z]+\] /;

// Everything in memory: returns the messages per language (flat), what is
// missing, how each placeholder key was found, and any error that is not a
// translation gap (a broken ui.en.json or page-forms file). Reads nothing
// itself, so the tests can feed it what they like.
function build({ ui, forms, memory, contentKeys = null }) {
  const errors = [];
  const flat = flatten(ui);
  errors.push(...flat.errors);
  const formOf = (forms && forms.forms) || {};
  const uiKeys = new Set(flat.map(([k]) => k));
  for (const k of Object.keys(formOf)) if (!uiKeys.has(k)) errors.push(`${rel(FORMS)}: "${k}" is not a key in ${rel(UI)}`);
  if (LOCALES[0] !== "en") errors.push(`LOCALES must start with "en", got ${LOCALES.join(",")}`);

  const messages = Object.fromEntries(LOCALES.map((l) => [l, []]));
  const missing = Object.fromEntries(LOCALES.map((l) => [l, []]));
  const stubs = Object.fromEntries(LOCALES.map((l) => [l, 0]));
  const placeholderKeys = [];
  const converted = Object.fromEntries(LOCALES.map((l) => [l, 0]));
  const notInContent = new Set();

  for (const [k, en] of flat) {
    for (const p of icuProblems(en)) errors.push(`${k}: the English has ${p}`);
    const ph = placeholders(en);
    const form = formOf[k];
    let parts;
    if (form) {
      parts = partsOf(form);
      if (!parts) { errors.push(`${k}: its page form has neither "page" nor "parts"`); continue; }
    } else if (ph.length) {
      errors.push(`${k}: has {${ph.join("}, {")}} but no page form in ${rel(FORMS)}, so its translation cannot be found`);
      continue;
    } else {
      parts = [{ t: en }];
    }
    if (ph.length) placeholderKeys.push(k);

    // the form must rebuild this key's English exactly, by the same rule the
    // translations go through
    let rebuilt = "", broken = false;
    for (const part of parts) {
      if (typeof part === "string") { rebuilt += part; continue; }
      const r = fill(part.t, part, part.t);
      if (r.error) { errors.push(`${k}: its page form ${r.error}`); broken = true; break; }
      rebuilt += r.text;
    }
    if (broken) continue;
    if (rebuilt !== en) { errors.push(`${k}: its page form gives "${rebuilt}", ${rel(UI)} says "${en}"`); continue; }
    if (contentKeys) parts.forEach((part) => { if (typeof part !== "string" && !contentKeys.has(key(part.t))) notInContent.add(part.t); });

    messages.en.push([k, en]);
    for (const loc of LOCALES.slice(1)) {
      let out = "", why = null;
      for (const part of parts) {
        if (typeof part === "string") { out += part; continue; }
        const e = memory[key(part.t)];
        const v = e && e[loc];
        if (!v) { why = `no ${loc} translation of "${part.t}"`; break; }
        if (STUB.test(v)) { stubs[loc]++; why = `only a stub ${loc} value for "${part.t}"`; break; }
        const r = fill(v, part, part.t);
        if (r.error) { why = `the ${loc} of "${part.t}" ${r.error}`; break; }
        out += r.text;
      }
      if (!why) {
        const got = placeholders(out).join(), want = ph.join();
        const icu = icuProblems(out);
        if (got !== want) why = `the ${loc} has {${placeholders(out).join("}, {")}}, the English {${ph.join("}, {")}}: "${out}"`;
        else if (icu.length) why = `the ${loc} has ${icu.join("; ")}: "${out}"`;
      }
      if (why) { missing[loc].push({ key: k, en, why }); messages[loc].push([k, en]); continue; }
      if (ph.length) converted[loc]++;
      messages[loc].push([k, out]);
    }
  }
  return { keys: flat.map(([k]) => k), messages, missing, stubs, placeholderKeys, converted, notInContent: [...notInContent], errors };
}

// The repository's own files.
function load() {
  const content = fs.existsSync(CONTENT) ? readJson(CONTENT) : null;
  return {
    ui: readJson(UI),
    forms: fs.existsSync(FORMS) ? readJson(FORMS) : { forms: {} },
    memory: readJson(MEM).entries || {},
    contentKeys: content ? new Set((content.text || []).map((e) => e.key)) : null,
  };
}

// The file each language gets: nested, two-space indent, LF, newline at the end.
const serialise = (pairs) => JSON.stringify(nest(pairs), null, 2) + "\n";

// ---------------------------------------------------------------------------
// Returns the exit code. The tests pass their own inputs and folder.
function main(args = [], inputs = load(), outDir = OUT) {
  const check = args.includes("--check");
  const allowStale = args.includes("--allow-stale");
  const r = build(inputs);

  if (r.errors.length) {
    console.error(`\n  ${rel(UI)} / ${rel(FORMS)} are not consistent:`);
    r.errors.forEach((e) => console.error(`    ${e}`));
    console.error("  Nothing written.\n");
    return 1;
  }

  // coverage
  const areas = {};
  r.keys.forEach((k) => { const a = k.split(".")[0]; areas[a] = (areas[a] || 0) + 1; });
  console.log(`\n  ${rel(UI)}: ${r.keys.length} keys (${Object.entries(areas).map(([a, n]) => `${a} ${n}`).join(", ")})`);
  console.log(`  ${r.placeholderKeys.length} with {placeholders}, found through ${rel(FORMS)}`);
  for (const loc of LOCALES.slice(1)) {
    const miss = r.missing[loc].length;
    const pct = Math.round(((r.keys.length - miss) / r.keys.length) * 100);
    const phMiss = r.missing[loc].filter((m) => placeholders(m.en).length).length;
    console.log(`  ${loc}: ${r.keys.length - miss} translated · ${miss} missing · ${pct}% · placeholder keys converted ${r.converted[loc]} of ${r.placeholderKeys.length}${phMiss ? ` (${phMiss} missing)` : ""}${r.stubs[loc] ? ` · ${r.stubs[loc]} stub value(s) counted as missing` : ""}`);
  }
  if (r.notInContent.length) {
    console.log(`  ${r.notInContent.length} of the English strings looked up are not in i18n/content.en.json, so the translate bot does not translate them yet:`);
    r.notInContent.forEach((t) => console.log(`    "${t}"`));
  }

  const anyMissing = LOCALES.some((l) => r.missing[l].length);
  if (anyMissing) {
    console.log("\n  No translation" + (allowStale ? " (English used, --allow-stale):" : ":"));
    for (const loc of LOCALES.slice(1)) r.missing[loc].forEach((m) => console.log(`    [${loc}] ${m.key}: ${m.why}`));
  }
  if (anyMissing && !allowStale) {
    console.error("\n  BUILD FAILED — strings with no translation (above). Translate them into i18n/translations.json,");
    console.error("  or build with --allow-stale to ship them in English. Nothing written.\n");
    return 1;
  }

  const files = Object.fromEntries(LOCALES.map((l) => [l, serialise(r.messages[l])]));
  if (check) {
    const state = LOCALES.map((l) => {
      const f = path.join(outDir, `${l}.json`);
      return `${l}.json ${!fs.existsSync(f) ? "not built" : fs.readFileSync(f, "utf8") === files[l] ? "up to date" : "differs"}`;
    });
    console.log(`\n  ${rel(outDir)}/: ${state.join(", ")}\n  --check: nothing written.\n`);
    return 0;
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const l of LOCALES) fs.writeFileSync(path.join(outDir, `${l}.json`), files[l], "utf8");
  // a language that is no longer built (Spanish, until 27 Oct 2026) must not linger beside them
  for (const f of fs.readdirSync(outDir)) {
    if (/\.json$/.test(f) && !LOCALES.includes(f.replace(/\.json$/, ""))) { fs.rmSync(path.join(outDir, f)); console.log(`  removed ${rel(path.join(outDir, f))}`); }
  }
  console.log(`\n  wrote ${rel(outDir)}/{${LOCALES.join(",")}}.json\n`);
  return 0;
}

module.exports = { build, load, main, flatten, nest, placeholders, icuProblems, serialise, LOCALES, OUT, UI, FORMS };
if (require.main === module) process.exitCode = main(process.argv.slice(2));
