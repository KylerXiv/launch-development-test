#!/usr/bin/env node
// Tests for scripts/build-rbm-messages.js — the interface-text files for the
// React version of the dashboard (dist/rbm-messages/{en,fr,pt}.json).
//   node scripts/test-build-rbm-messages.js
// Builds the three files in memory from the repository's own i18n/ files and
// checks what RBM's i18n.ts depends on: every key in every language, no empty
// value, the same {placeholders} in every language, en.json exactly
// i18n/ui.en.json, and nothing left of Spanish. Then small made-up inputs
// prove the conversion rules, and main() runs in a temporary folder to prove
// what it writes and when it refuses. Writes nothing in the repository.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { key } = require("./i18n-hash");
const { build, load, main, flatten, placeholders, serialise, LOCALES, OUT } = require("./build-rbm-messages");

let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };
const quiet = (fn) => { const e = console.error, l = console.log; let out = ""; console.error = console.log = (s) => { out += s + "\n"; }; try { return { code: fn(), out }; } finally { console.error = e; console.log = l; } };
// every key path of a nested message file
const pathsOf = (o, pre = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? pathsOf(v, pre + k + ".") : [[pre + k, v]]));

// ---------------------------------------------------------------------------
// 1. the repository's own files
// ---------------------------------------------------------------------------
const inputs = load();
const r = build(inputs);
ok(r.errors.length === 0, "ui.en.json and ui.page-forms.json are consistent" + (r.errors.length ? ": " + r.errors.slice(0, 3).join(" | ") : ""));
// the three files exactly as they would be written, read back
const files = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(serialise(r.messages[l]))]));
const flat = Object.fromEntries(LOCALES.map((l) => [l, Object.fromEntries(pathsOf(files[l]))]));
const uiFlat = flatten(inputs.ui);

ok(LOCALES.join() === "en,fr,pt", "the files are English, French and Portuguese (no Spanish since 27 Oct 2026)");
ok(uiFlat.length > 0 && uiFlat.errors.length === 0, "ui.en.json has keys, all camelCase, all non-empty strings");
ok(JSON.stringify(pathsOf(files.en)) === JSON.stringify(uiFlat.map(([k, v]) => [k, v])), "en.json is ui.en.json exactly: same keys, same order, same English");
ok(!pathsOf(files.en).some(([k]) => k.split(".").some((s) => s.startsWith("_"))), "the _note in ui.en.json does not reach the files");
const enKeys = Object.keys(flat.en).join("\n");
for (const l of LOCALES) {
  ok(Object.keys(flat[l]).join("\n") === enKeys, `${l}.json has every key of en.json, and no other`);
  ok(Object.values(flat[l]).every((v) => typeof v === "string" && v.trim()), `${l}.json has no empty value`);
}
{ const off = Object.keys(flat.en).filter((k) => LOCALES.some((l) => placeholders(flat[l][k]).join() !== placeholders(flat.en[k]).join()));
  ok(!off.length, "every key has the same {placeholders} in every language" + (off.length ? ": " + off.slice(0, 5).join(", ") : "")); }
{ const holes = LOCALES.flatMap((l) => Object.entries(flat[l]).filter(([, v]) => /\$\{/.test(v)).map(([k]) => `${l}:${k}`));
  ok(!holes.length, "no ${...} hole from the page is left in any file" + (holes.length ? ": " + holes.join(", ") : "")); }
// French typography (decision 9): only an English fallback may keep a straight '
{ const straight = Object.entries(flat.fr).filter(([k, v]) => v.includes("'") && !r.missing.fr.some((m) => m.key === k)).map(([k]) => k);
  ok(!straight.length, "fr.json has no straight apostrophe in a translation (’ throughout)" + (straight.length ? ": " + straight.slice(0, 5).join(", ") : "")); }
// Spanish: no file, no key, nothing in the memory the build reads from
ok(!LOCALES.includes("es") && !Object.prototype.hasOwnProperty.call(r.messages, "es"), "no Spanish file is built");
ok(!fs.existsSync(path.join(OUT, "es.json")), "no es.json left in dist/rbm-messages/");
ok(!Object.values(inputs.memory).some((e) => Object.prototype.hasOwnProperty.call(e, "es")), "the translation memory carries no Spanish for the build to pick up");
// every placeholder key has its page form, and the counts add up
ok(r.placeholderKeys.length === uiFlat.filter(([, v]) => placeholders(v).length).length &&
   r.placeholderKeys.every((k) => inputs.forms.forms[k]), "every key with {placeholders} has its page form");
for (const l of LOCALES.slice(1)) {
  const phMissing = r.missing[l].filter((m) => placeholders(m.en).length).length;
  ok(r.converted[l] + phMissing === r.placeholderKeys.length, `${l}: each placeholder key is either converted or reported missing`);
  ok(r.missing[l].every((m) => flat[l][m.key] === m.en), `${l}: a missing string is the English, and is reported`);
}
// files already built must match a build from the current sources
for (const l of LOCALES) {
  const f = path.join(OUT, `${l}.json`);
  if (fs.existsSync(f)) ok(fs.readFileSync(f, "utf8") === serialise(r.messages[l]), `dist/rbm-messages/${l}.json matches the sources (rebuild if not)`);
}

// ---------------------------------------------------------------------------
// 2. the rules, on made-up inputs
// ---------------------------------------------------------------------------
const mem = (...rows) => Object.fromEntries(rows.map(([en, fr, pt]) => [key(en), { en, fr, pt }]));
const one = (ui, forms, memory) => build({ ui, forms: { forms }, memory });
const got = (res, l, k) => Object.fromEntries(res.messages[l])[k];

{ // a plain key: found by key(English)
  const t = one({ a: { b: "Close" } }, {}, mem(["Close", "Fermer", "Fechar"]));
  ok(got(t, "fr", "a.b") === "Fermer" && got(t, "pt", "a.b") === "Fechar" && !t.missing.fr.length, "a key without placeholders is found by key(English)"); }
{ // a page form with holes: looked up under the page's text, holes become {names}
  const t = one({ s: "Stage {n} of {total}" },
    { s: { page: "Stage ${i} of ${len}", holes: { "${i}": "{n}", "${len}": "{total}" } } },
    mem(["Stage ${i} of ${len}", "Étape ${i} sur ${len}", "Etapa ${i} de ${len}"]));
  ok(got(t, "fr", "s") === "Étape {n} sur {total}" && got(t, "pt", "s") === "Etapa {n} de {total}" && t.converted.fr === 1, "a page form's ${...} holes become {placeholders}, in the translation's own word order"); }
{ // a hole whose value is always empty, and text appended after the memory string
  const t = one({ s: "Stage {n}, {stage}." },
    { s: { parts: [{ t: "Stage ${i}, ${s}${exp}${n ?", holes: { "${i}": "{n}", "${s}": "{stage}", "${exp}": "", "${n ?": "" } }, "."] } },
    mem(["Stage ${i}, ${s}${exp}${n ?", "Étape ${i}, ${s}${exp}${n ?", "Fase ${i}, ${s}${exp}${n ?"]));
  ok(got(t, "fr", "s") === "Étape {n}, {stage}.", "a hole mapped to \"\" is dropped, and a literal part is appended as it is"); }
{ // words joined with +, and a leading separator dropped
  const t = one({ a: "Last updated {date}", b: "expected {date}" },
    { a: { parts: [{ t: "Last updated" }, " {date}"] }, b: { parts: [{ t: "· expected", drop: "· " }, " {date}"] } },
    mem(["Last updated", "Dernière mise à jour", "Última atualização"], ["· expected", "· attendu", "· esperado"]));
  ok(got(t, "fr", "a") === "Dernière mise à jour {date}" && got(t, "pt", "b") === "esperado {date}", "parts join a translated fragment with its placeholder; drop removes the page's own separator"); }
{ // a translation that lost a hole is not shipped broken
  const t = one({ s: "Show journey for {medicine}" },
    { s: { page: "Show journey for ${name}", holes: { "${name}": "{medicine}" } } },
    mem(["Show journey for ${name}", "Afficher le parcours", "Mostrar ${name} ${name}"]));
  ok(got(t, "fr", "s") === "Show journey for {medicine}" && /\$\{name\} 0 time/.test(t.missing.fr[0].why), "a translation that lost a hole counts as missing, and stays English");
  ok(t.missing.pt.length === 1 && /2 time/.test(t.missing.pt[0].why), "a translation with a hole twice counts as missing"); }
{ // a separator the translation does not start with
  const t = one({ b: "expected {date}" }, { b: { parts: [{ t: "· expected", drop: "· " }, " {date}"] } }, mem(["· expected", "attendu", "· esperado"]));
  ok(t.missing.fr.length === 1 && t.missing.pt.length === 0, "a translation without the separator to drop counts as missing"); }
{ // missing, and stub values from a test run
  const t = one({ a: "Packs", b: "Close" }, {}, mem(["Close", "[stub-fr] Close", "Fechar"]));
  ok(t.missing.fr.map((m) => m.key).join() === "a,b" && t.missing.pt.map((m) => m.key).join() === "a" && t.stubs.fr === 1,
     "a string with no translation, or only a stub value, counts as missing"); }
{ // the forms file must describe the English, and every placeholder key needs one
  const noForm = one({ s: "Reached in {year}" }, {}, {});
  ok(noForm.errors.length === 1 && /no page form/.test(noForm.errors[0]), "a key with {placeholders} and no page form is an error, not a gap");
  const wrong = one({ s: "Reached in {year}" }, { s: { page: "Reached by ${y}", holes: { "${y}": "{year}" } } }, {});
  ok(wrong.errors.length === 1 && /gives "Reached by \{year\}"/.test(wrong.errors[0]), "a page form that does not rebuild the English is an error");
  const ghost = one({ s: "Close" }, { t: { page: "x" } }, {});
  ok(ghost.errors.some((e) => /"t" is not a key/.test(e)), "a page form for a key that does not exist is an error");
  const bad = one({ Bad: "x", a: { b: "" } }, {}, {});
  ok(bad.errors.length === 2, "a key that is not camelCase, and an empty value, are errors"); }
{ // ICU: an apostrophe next to a brace would print the placeholder literally.
  // French is typeset first (decision 9), and ’ is not ICU's quoting character.
  const t = one({ s: "of {stage}" }, { s: { page: "of ${s}", holes: { "${s}": "{stage}" } } },
    mem(["of ${s}", "de l'${s}", "d'${s}"]));
  ok(t.missing.pt.length === 1 && /ICU quoting/.test(t.missing.pt[0].why), "a translation an ICU reader would misread (d'{stage}) counts as missing");
  ok(!t.missing.fr.length && got(t, "fr", "s") === "de l’{stage}", "French l'{stage} ships as l’{stage}, which an ICU reader reads as it is"); }
{ // French typography (decision 9): every straight apostrophe becomes ’, in
  // translations only
  const t = one({ a: "It's time", b: "LAUNCH's data" }, {}, mem(["It's time", "C'est l'heure", "É d'ouro"]));
  ok(got(t, "fr", "a") === "C’est l’heure", "French takes the typographic apostrophe ’ for every straight one");
  ok(got(t, "pt", "a") === "É d'ouro" && got(t, "en", "a") === "It's time", "Portuguese and English keep their apostrophes as they are");
  ok(got(t, "fr", "b") === "LAUNCH's data" && t.missing.fr.length === 1, "an English fallback in the French file stays English, apostrophe included"); }

// ---------------------------------------------------------------------------
// 3. main(): what it writes, and when it refuses
// ---------------------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rbm-messages-"));
const small = { ui: { a: { b: "Close", c: "Packs" } }, forms: { forms: {} }, memory: mem(["Close", "Fermer", "Fechar"]) };
const full = { ...small, ui: { a: { b: "Close" } } };
const out = path.join(tmp, "out");
let run = quiet(() => main([], small, out));
ok(run.code === 1 && !fs.existsSync(out) && /BUILD FAILED/.test(run.out) && /\[fr\] a\.c/.test(run.out), "a string with no translation fails the build, names it, and writes nothing");
run = quiet(() => main(["--check"], small, out));
ok(run.code === 1 && !fs.existsSync(out), "--check fails the same way");
run = quiet(() => main(["--check", "--allow-stale"], small, out));
ok(run.code === 0 && !fs.existsSync(out), "--check writes nothing");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "es.json"), "{}\n");
run = quiet(() => main(["--allow-stale"], small, out));
const fr = JSON.parse(fs.readFileSync(path.join(out, "fr.json"), "utf8"));
ok(run.code === 0 && fr.a.b === "Fermer" && fr.a.c === "Packs" && /English used/.test(run.out), "--allow-stale writes the English in its place and says so");
ok(!fs.existsSync(path.join(out, "es.json")) && /removed .*es\.json/.test(run.out), "an es.json left from before is removed");
ok(fs.readdirSync(out).sort().join() === "en.json,fr.json,pt.json", "the folder holds exactly en.json, fr.json and pt.json");
run = quiet(() => main([], full, out));
ok(run.code === 0 && JSON.parse(fs.readFileSync(path.join(out, "pt.json"), "utf8")).a.b === "Fechar", "with everything translated the build passes without --allow-stale");
run = quiet(() => main(["--check"], full, out));
ok(run.code === 0 && /en\.json up to date, fr\.json up to date, pt\.json up to date/.test(run.out), "--check says when the written files are up to date");
run = quiet(() => main([], { ...full, ui: { s: "Reached in {year}" } }, path.join(tmp, "none")));
ok(run.code === 1 && !fs.existsSync(path.join(tmp, "none")), "an inconsistent ui.en.json writes nothing, even with nothing to translate");
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n  build-rbm-messages: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
