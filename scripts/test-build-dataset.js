#!/usr/bin/env node
// Tests for scripts/build-dataset.js — the RBM dashboard.json.
//   node scripts/test-build-dataset.js [--allow-stale]
// Builds in memory (writes nothing) and checks what RBM's pages depend on:
// the schema, that nothing internal leaks, that every text carries en/fr/pt/es
// identical to the /fr, /pt and /es pages, and that the schema check and the
// TEXT_PATHS guard actually catch what they are meant to.
"use strict";
const fs = require("fs");
const path = require("path");
const { build, validate, mergeText, coverage } = require("./build-dataset");
const locale = require("./build-locale-pages");

const ROOT = path.resolve(__dirname, "..");
const schema = JSON.parse(fs.readFileSync(path.join(ROOT, "public-data", "v1", "schema.json"), "utf8"));
let failed = 0, passed = 0;
const ok = (cond, name, detail) => {
  if (cond) { passed++; return; }
  failed++; console.log(`  FAIL ${name}${detail ? " — " + detail : ""}`);
};
const isText = (v) => v && typeof v === "object" && ["en", "fr", "pt", "es"].every((l) => typeof v[l] === "string");

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
const esStages = locale.localiseProducts(locale.readData("data/products.js"), "es").stages;
ok(d.data.stages.every((s, i) => s.es === esStages[i]), "stage names in es are exactly those of the /es page");
const esPolicy = locale.localiseTreatmentPolicy(JSON.parse(JSON.stringify(require("./data-rules").extractData(fs.readFileSync(path.join(ROOT, "data", "treatment-policy.js"), "utf8"), "LAUNCH_TREATMENT_POLICY").data)), "es");
ok(Object.entries(d.data.treatmentPolicy.countries).every(([k, c]) => !c.name || c.name.es === esPolicy.countries[k].name) &&
   Object.values(d.data.treatmentPolicy.countries).some((c) => c.name && c.name.es !== c.name.en), "country names in es come from the CLDR table, as on /es");
const p = d.data.products.find((x) => x.stages && x.stages[0]);
ok(p.stages.every((s) => s.note === null || s.note === undefined || isText(s.note)), "stage notes are text");
ok(d.data.products.every((x) => x.barrier === null || x.barrier === undefined || isText(x.barrier)), "barriers are text or null");
ok(d.data.sources.every((s) => isText(s.plain)), "every source's plain line is text");
ok(d.data.products.every((x) => typeof x.id === "string" && typeof x.name === "string"), "ids and names stay plain strings");
const c = coverage(d);
ok(c.text > 100 && c.fr > 0 && c.pt > 0 && typeof c.es === "number", "coverage counts something, for every language", JSON.stringify(c));

// envelope
ok(d.locales.join() === "en,fr,pt,es", "locales are en, fr, pt, es");
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
const r = mergeText(en, { en, fr: { a: "Bonjour", b: { c: "Monde" } }, pt: { a: "Olá", b: { c: "World" } }, es: { a: "Hola", b: { c: "World" } } }, ["a"], "t");
ok(r.merged.a.fr === "Bonjour" && r.merged.a.pt === "Olá" && r.merged.a.es === "Hola", "listed fields get en/fr/pt/es");
ok(r.merged.b.c === "World", "unlisted fields stay strings");
ok(r.untracked.length === 1 && /b\.c/.test(r.untracked[0]), "a translated field missing from the list is reported", JSON.stringify(r.untracked));

console.log(`\n  build-dataset: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
