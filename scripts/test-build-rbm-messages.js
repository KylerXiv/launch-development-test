#!/usr/bin/env node
// Tests for scripts/build-rbm-messages.js — the interface-text files for the
// React version of the dashboard (dist/rbm-messages/{en,fr,pt}.json).
//   node scripts/test-build-rbm-messages.js
// Builds the three files in memory from the repository's own i18n/ files and
// checks what RBM's i18n.ts depends on: every key in every language, no empty
// value, the same {placeholders} in every language, en.json exactly
// i18n/ui.en.json, every message on the old page or marked uiOnly, all under
// "launchDashboard", and nothing left of Spanish. Then small made-up inputs
// prove the rules, and main() runs in a temporary folder to prove what it
// writes and when it refuses. Writes nothing in the repository.
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { key } = require("./i18n-hash");
const { build, load, main, flatten, placeholders, serialise, LOCALES, OUT, NAMESPACE } = require("./build-rbm-messages");

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
ok(r.errors.length === 0, "ui.en.json and ui.page-forms.json are consistent, and the page says every message" + (r.errors.length ? ": " + r.errors.slice(0, 3).join(" | ") : ""));
ok(inputs.pageKeys && inputs.pageKeys.size > 0, "the page check ran: content.en.json's page buckets were read");
// the three files exactly as they would be written, read back
const written = Object.fromEntries(LOCALES.map((l) => [l, JSON.parse(serialise(r.messages[l]))]));
ok(NAMESPACE === "launchDashboard" && LOCALES.every((l) => Object.keys(written[l]).join() === NAMESPACE),
   "every file holds one key, launchDashboard, with all the messages under it");
const files = Object.fromEntries(LOCALES.map((l) => [l, written[l][NAMESPACE]]));
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
// every placeholder key has its page form (or is marked uiOnly)
ok(r.placeholderKeys.length === uiFlat.filter(([, v]) => placeholders(v).length).length &&
   r.placeholderKeys.every((k) => inputs.forms.forms[k]), "every key with {placeholders} has its page form, or uiOnly");
// the translations are in the memory under each message's own English
// (decision 11): the bot translates ui.en.json as one of content.en.json's buckets
{ const content = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "i18n", "content.en.json"), "utf8"));
  const ui = new Set(content.text.filter((e) => e.bucket === "ui").map((e) => e.en));
  ok(uiFlat.every(([, v]) => ui.has(v)), "every message is in content.en.json's ui bucket, so the translate bot sees it");
  const noMem = uiFlat.filter(([, v]) => !inputs.memory[key(v)]).map(([k]) => k);
  ok(!noMem.length, "every message has a memory entry under its own English" + (noMem.length ? ": " + noMem.slice(0, 5).join(", ") : "")); }
for (const l of LOCALES.slice(1)) {
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
// pageKeys: what the old page says (null: no page check)
const one = (ui, forms, memory, page = null) => build({ ui, forms: { forms }, memory, pageKeys: page && new Set(page.map(key)) });
const got = (res, l, k) => Object.fromEntries(res.messages[l])[k];

{ // a plain key: found by key(English)
  const t = one({ a: { b: "Close" } }, {}, mem(["Close", "Fermer", "Fechar"]));
  ok(got(t, "fr", "a.b") === "Fermer" && got(t, "pt", "a.b") === "Fechar" && !t.missing.fr.length, "a key without placeholders is found by key(English)"); }
{ // a key with placeholders: found by key(its own English), as the bot files it
  const t = one({ s: "Stage {n} of {total}" },
    { s: { page: "Stage ${i} of ${len}", holes: { "${i}": "{n}", "${len}": "{total}" } } },
    mem(["Stage {n} of {total}", "Étape {n} sur {total}", "Etapa {n} de {total}"]), ["Stage ${i} of ${len}"]);
  ok(got(t, "fr", "s") === "Étape {n} sur {total}" && got(t, "pt", "s") === "Etapa {n} de {total}" && !t.errors.length,
     "a key with {placeholders} is found by key(its own English), not through the page's text"); }
{ // a translation that lost or doubled a placeholder is not shipped broken
  const t = one({ s: "Show journey for {medicine}" }, { s: { uiOnly: true } },
    mem(["Show journey for {medicine}", "Afficher le parcours", "Mostrar {medicine} {other}"]));
  ok(got(t, "fr", "s") === "Show journey for {medicine}" && /the fr has \{\}/.test(t.missing.fr[0].why), "a translation that lost a placeholder counts as missing, and stays English");
  ok(t.missing.pt.length === 1 && /\{medicine\}, \{other\}/.test(t.missing.pt[0].why), "a translation with another placeholder counts as missing"); }
{ // missing, and stub values from a test run
  const t = one({ a: "Packs", b: "Close" }, {}, mem(["Close", "[stub-fr] Close", "Fechar"]));
  ok(t.missing.fr.map((m) => m.key).join() === "a,b" && t.missing.pt.map((m) => m.key).join() === "a" && t.stubs.fr === 1,
     "a string with no translation, or only a stub value, counts as missing"); }
{ // the old page must say the same (while it runs, docs/rbm-messages-notes.md decision 12)
  const page = ["Close", "Last updated", "Stage ${i} of ${len}"];
  const said = one({ a: "Close", b: "Last updated {date}" }, { b: { parts: [{ t: "Last updated" }, " {date}"] } }, {}, page);
  ok(!said.errors.length, "a message the page says, word for word or through its page form, passes");
  const reworded = one({ a: "Close the panel" }, {}, {}, page);
  ok(reworded.errors.length === 1 && /the page does not say "Close the panel"/.test(reworded.errors[0]), "a plain message the page does not say is an error");
  const formGone = one({ s: "Step {n} of {total}" }, { s: { page: "Step ${i} of ${len}", holes: { "${i}": "{n}", "${len}": "{total}" } } }, {}, page);
  ok(formGone.errors.length === 1 && /no longer has "Step \$\{i\} of \$\{len\}"/.test(formGone.errors[0]), "a page form whose text the page no longer has is an error");
  const only = one({ a: "Open in RBM's menu", s: "Shown {n}" }, { a: { uiOnly: true }, s: { uiOnly: true } }, {}, page);
  ok(!only.errors.length && only.uiOnly.join() === "a,s", "a message marked uiOnly is not checked against the page");
  const noCheck = one({ a: "Anything" }, {}, {});
  ok(!noCheck.errors.length, "without content.en.json the page check is skipped"); }
{ // the forms file must describe the English, and every placeholder key needs one
  const noForm = one({ s: "Reached in {year}" }, {}, {});
  ok(noForm.errors.length === 1 && /no page form/.test(noForm.errors[0]) && /uiOnly/.test(noForm.errors[0]), "a key with {placeholders} and no page form (nor uiOnly) is an error, not a gap");
  const wrong = one({ s: "Reached in {year}" }, { s: { page: "Reached by ${y}", holes: { "${y}": "{year}" } } }, {});
  ok(wrong.errors.length === 1 && /gives "Reached by \{year\}"/.test(wrong.errors[0]), "a page form that does not rebuild the English is an error");
  const ghost = one({ s: "Close" }, { t: { page: "x" } }, {});
  ok(ghost.errors.some((e) => /"t" is not a key/.test(e)), "a page form for a key that does not exist is an error");
  const bad = one({ Bad: "x", a: { b: "" } }, {}, {});
  ok(bad.errors.length === 2, "a key that is not camelCase, and an empty value, are errors"); }
{ // ICU: an apostrophe next to a brace would print the placeholder literally.
  // French is typeset first (decision 9), and ’ is not ICU's quoting character.
  const t = one({ s: "of {stage}" }, { s: { uiOnly: true } }, mem(["of {stage}", "de l'{stage}", "d'{stage}"]));
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
const fr = JSON.parse(fs.readFileSync(path.join(out, "fr.json"), "utf8"))[NAMESPACE];
ok(run.code === 0 && fr.a.b === "Fermer" && fr.a.c === "Packs" && /English used/.test(run.out), "--allow-stale writes the English in its place and says so");
ok(!fs.existsSync(path.join(out, "es.json")) && /removed .*es\.json/.test(run.out), "an es.json left from before is removed");
ok(fs.readdirSync(out).sort().join() === "en.json,fr.json,pt.json", "the folder holds exactly en.json, fr.json and pt.json");
run = quiet(() => main([], full, out));
ok(run.code === 0 && JSON.parse(fs.readFileSync(path.join(out, "pt.json"), "utf8"))[NAMESPACE].a.b === "Fechar", "with everything translated the build passes without --allow-stale");
run = quiet(() => main(["--check"], full, out));
ok(run.code === 0 && /en\.json up to date, fr\.json up to date, pt\.json up to date/.test(run.out), "--check says when the written files are up to date");
run = quiet(() => main([], { ...full, ui: { s: "Reached in {year}" } }, path.join(tmp, "none")));
ok(run.code === 1 && !fs.existsSync(path.join(tmp, "none")), "an inconsistent ui.en.json writes nothing, even with nothing to translate");
fs.rmSync(tmp, { recursive: true, force: true });

console.log(`\n  build-rbm-messages: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
