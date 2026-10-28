#!/usr/bin/env node
// Tests for scripts/build-dataset.js — the RBM dashboard.json.
//   node scripts/test-build-dataset.js [--allow-stale]
// Builds in memory (writes nothing) and checks what RBM's pages depend on:
// the schema, that nothing internal leaks, that every text carries en/fr/pt
// identical to the /fr and /pt pages, and that the schema check and the
// TEXT_PATHS guard actually catch what they are meant to.
"use strict";
const fs = require("fs");
const path = require("path");
const { build, validate, mergeText, coverage, forLocale, langSchema, langFile } = require("./build-dataset");
const locale = require("./build-locale-pages");

const ROOT = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "public-data", "v1", "schema.json"), "utf8"));
let failed = 0, passed = 0;
const ok = (cond, name, detail) => {
  if (cond) { passed++; return; }
  failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`);
};
const isText = (v) => v && typeof v === "object" && ["en", "fr", "pt"].every((l) => typeof v[l] === "string");

// ---- the real build --------------------------------------------------------
const { dataset: d, untracked } = build();
const errs = validate(schema, d);
ok(!errs.length, "the build matches public-data/v1/schema.json", errs.slice(0, 3).join("; "));
ok(!untracked.length, "every translated field is published as text", untracked.slice(0, 3).join("; "));

const json = JSON.stringify(d);
ok(!/"findings"|"relevance"/.test(json), "sources' internal fields are left out");
const srcRaw = locale.readData("data/sources.js");
const publicIds = srcRaw.sources.filter((s) => s.public).map((s) => s.id);
ok(JSON.stringify(d.data.sources.map((s) => s.id)) === JSON.stringify(publicIds), "only public sources, in registry order");
const prodRaw = locale.readData("data/products.js");
ok(JSON.stringify(d.data.products.map((p) => p.id)) === JSON.stringify(prodRaw.products.filter((p) => !p.placeholder).map((p) => p.id)),
   "products are the real dataset's, placeholders dropped");
ok(!/LAUNCH_PROPOSALS|"fingerprint"|LAUNCH_RESISTANCE/.test(json), "no proposals, decisions or removed layers");
ok(!("features" in d.data) && !/"coordinates"/.test(json), "no map shapes (they ship with the pages)");

// text fields: shape, and the same French as /fr
ok(d.data.stages.length === 8 && d.data.stages.every(isText), "the eight stage names are text");
const frStages = locale.localiseProducts(locale.readData("data/products.js"), "fr").stages;
ok(d.data.stages.every((s, i) => s.fr === frStages[i]), "stage names in fr are exactly those of the /fr page");
const ptPolicy = locale.localiseTreatmentPolicy(JSON.parse(JSON.stringify(require("./data-rules").extractData(fs.readFileSync(path.join(ROOT, "data", "treatment-policy.js"), "utf8"), "LAUNCH_TREATMENT_POLICY").data)), "pt");
ok(Object.entries(d.data.treatmentPolicy.countries).every(([k, c]) => !c.name || c.name.pt === ptPolicy.countries[k].name) &&
   Object.values(d.data.treatmentPolicy.countries).some((c) => c.name && c.name.pt !== c.name.en), "country names in pt come from the CLDR table, as on /pt");
ok(!/"es":/.test(json), "no Spanish anywhere in the file (removed 27 Oct 2026)");
const p = d.data.products.find((x) => x.stages && x.stages[0]);
ok(p.stages.every((s) => s.note === null || s.note === undefined || isText(s.note)), "stage notes are text");
ok(d.data.products.every((x) => x.barrier === null || x.barrier === undefined || isText(x.barrier)), "barriers are text or null");
ok(d.data.sources.every((s) => isText(s.plain)), "every source's plain line is text");
ok(d.data.products.every((x) => typeof x.id === "string" && typeof x.name === "string"), "ids and names stay plain strings");
const c = coverage(d);
ok(c.text > 100 && c.fr > 0 && c.pt > 0 && !("es" in c), "coverage counts something, for every language", JSON.stringify(c));

// envelope
ok(d.locales.join() === "en,fr,pt", "locales are en, fr, pt");
ok(/^[0-9a-f]{64}$/.test(d.content_hash), "content_hash is a sha256");
ok(d.data_status === prodRaw.meta.dataStatus && d.last_updated === prodRaw.meta.lastUpdated, "data status and date come from meta");
const illus = d.data.products.filter((x) => x.detail && x.detail.countries);
ok(illus.every((x) => x.detail.countries.status && x.detail.countries.note !== undefined), "country lists keep their status and note");

// approval from data/decisions.js
process.env.PUBLISH_TRIGGER = "approval";
const a = build().dataset;
delete process.env.PUBLISH_TRIGGER;
ok(a.approval.trigger === "approval" && Number.isInteger(a.approval.issue) && typeof a.approved_by === "string" && a.approved_by,
   "an approval publish names the approver and the issue", JSON.stringify(a.approval));
process.env.PUBLISHED_BY = "someone"; process.env.PUBLISH_REASON = "Revert test proposal #28";
const m = build().dataset;
delete process.env.PUBLISHED_BY; delete process.env.PUBLISH_REASON;
ok(m.approval.trigger === "manual" && m.approved_by === "someone" && m.approval.reason === "Revert test proposal #28",
   "a manual publish records who clicked and why");

// ---- the schema check catches what it should --------------------------------
const clone = () => JSON.parse(JSON.stringify(d));
let x = clone(); delete x.approved_by;
ok(validate(schema, x).some((e) => /approved_by: missing/.test(e)), "a missing envelope field is caught");
x = clone(); x.data.products[0].stages[0].status = "maybe";
ok(validate(schema, x).some((e) => /status/.test(e)), "an unknown stage status is caught");
x = clone(); x.data.stages[0] = "R&D";
ok(validate(schema, x).some((e) => /stages\[0\]/.test(e)), "a text field published as a bare string is caught");
x = clone(); x.schema_version = 2;
ok(validate(schema, x).some((e) => /schema_version/.test(e)), "a different schema version is caught");
x = clone(); x.data.products[0].barrier = null;
ok(!validate(schema, x).length, "a null barrier is allowed");

// ---- the TEXT_PATHS guard -----------------------------------------------------
const en = { a: "Hello", b: { c: "World" } };
const r = mergeText(en, { en, fr: { a: "Bonjour", b: { c: "Monde" } }, pt: { a: "Olá", b: { c: "World" } } }, ["a"], "t");
ok(r.merged.a.fr === "Bonjour" && r.merged.a.pt === "Olá" && !("es" in r.merged.a), "listed fields get en/fr/pt");
ok(r.merged.b.c === "World", "unlisted fields stay strings");
ok(r.untracked.length === 1 && /b\.c/.test(r.untracked[0]), "a translated field missing from the list is reported", JSON.stringify(r.untracked));

// ---- one file per language (dashboard.<locale>.json) ---------------------------
const lSchema = langSchema(schema);
ok(lSchema.$id.endsWith("/v1/schema.lang.json") && lSchema.required.includes("locale") && !lSchema.required.includes("locales") &&
   !("locales" in lSchema.properties) && lSchema.$defs.text.type === "string", "schema.lang.json: texts are strings, locales is locale");
ok(JSON.stringify(Object.keys(lSchema.properties)) === JSON.stringify(Object.keys(schema.properties).map((k) => (k === "locales" ? "locale" : k))),
   "schema.lang.json keeps every other field of schema.json, in order");
ok(langFile("/tmp/x/dashboard.json", "fr") === "/tmp/x/dashboard.fr.json", "the language files sit beside dashboard.json");

// Walks the combined file and one language file side by side: where the
// combined has a text, the language file has its string; everywhere else the
// two are the same shape and value.
const sameButText = (comb, one, loc, at = "") => {
  if (isText(comb)) return typeof one === "string" && one === (comb[loc] || comb.en) ? null : `${at}: ${JSON.stringify(one)}`;
  if (Array.isArray(comb)) {
    if (!Array.isArray(one) || one.length !== comb.length) return `${at}: not the same list`;
    for (let i = 0; i < comb.length; i++) { const e = sameButText(comb[i], one[i], loc, `${at}[${i}]`); if (e) return e; }
    return null;
  }
  if (comb && typeof comb === "object") {
    if (!one || typeof one !== "object" || JSON.stringify(Object.keys(one)) !== JSON.stringify(Object.keys(comb))) return `${at}: not the same keys`;
    for (const k of Object.keys(comb)) { const e = sameButText(comb[k], one[k], loc, `${at}.${k}`); if (e) return e; }
    return null;
  }
  return comb === one ? null : `${at}: ${JSON.stringify(one)} is not ${JSON.stringify(comb)}`;
};
const hasTextObject = (v) => isText(v) || (v && typeof v === "object" && Object.values(v).some(hasTextObject));
for (const loc of d.locales) {
  const f = forLocale(d, loc);
  const e = validate(lSchema, f);
  ok(!e.length, `dashboard.${loc}.json matches schema.lang.json`, e.slice(0, 3).join("; "));
  ok(f.locale === loc && !("locales" in f), `dashboard.${loc}.json says it is ${loc}`);
  ok(!hasTextObject(f), `dashboard.${loc}.json holds no { en, fr, pt } text`);
  ok(sameButText(d.data, f.data, loc) === null, `dashboard.${loc}.json data is the combined data in ${loc}`, sameButText(d.data, f.data, loc));
  ok(sameButText(d.source_coverage, f.source_coverage, loc) === null, `dashboard.${loc}.json source_coverage in ${loc}`);
  ok(["schema_version", "generated_at", "approved_at", "approved_by", "approval", "pipeline_commit", "content_hash", "data_status", "last_updated"]
     .every((k) => JSON.stringify(f[k]) === JSON.stringify(d[k])), `dashboard.${loc}.json has the combined file's envelope`);
}
const fr = forLocale(d, "fr");
ok(fr.data.stages.every((s, i) => s === frStages[i]), "dashboard.fr.json stage names are exactly those of the /fr page");
ok(JSON.stringify(fr.data) !== JSON.stringify(forLocale(d, "en").data), "dashboard.fr.json differs from dashboard.en.json");
ok(forLocale({ locales: ["en", "fr"], data: { t: { en: "Yes", fr: "" }, n: { en: "x", other: 1 } } }, "fr").data.t === "Yes",
   "an empty translation falls back to the English");
ok(JSON.stringify(forLocale({ locales: ["en", "fr"], data: { n: { en: "x", other: 1 } } }, "fr").data.n) === '{"en":"x","other":1}',
   "an object with other keys is data, not a text, and is left alone");

// schema.lang.json catches what it should
let y = forLocale(d, "pt"); y.data.stages[0] = d.data.stages[0];
ok(validate(lSchema, y).some((e) => /stages\[0\]/.test(e)), "a { en, fr, pt } text left in a language file is caught");
y = forLocale(d, "pt"); delete y.locale;
ok(validate(lSchema, y).some((e) => /locale: missing/.test(e)), "a language file without locale is caught");
y = forLocale(d, "pt"); y.locale = "es";
ok(validate(lSchema, y).some((e) => /locale/.test(e)), "a language that is not published is caught");

console.log(`\n  build-dataset: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
