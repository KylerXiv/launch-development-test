#!/usr/bin/env node
// Tests for scripts/build-rbm-pages.js — the pages handed over to RBM.
//   node scripts/test-build-rbm-pages.js
// Transforms the English page in memory (writes nothing) and checks what the
// handover depends on: the data comes only from dashboard.json, the page's own
// code waits for it, paths point at the shared folders, the menu and Subscribe
// are gone, and a page that has drifted from what the build expects fails
// loudly instead of producing a broken bundle.
"use strict";
const fs = require("fs");
const path = require("path");
const { transform } = require("./build-rbm-pages");

const html = fs.readFileSync(path.join(__dirname, "..", "illustrated-journey-dashboard.html"), "utf8");
let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };

const { html: out } = transform(html, "fr");
ok(!/<script src="(\.\.\/)?data\/(products|sources|treatment-policy)\.js"/.test(out), "products, sources and policy are not loaded as files");
ok(/<script src="\.\.\/data\/world-map\.js"><\/script>/.test(out) && /\.\.\/data\/world-map-geo\.js/.test(out), "map shapes load from ../data/");
ok(!/(src|href)="(assets|data)\//.test(out), "every relative asset path points one level up");
ok(!/site-nav\.js/.test(out), "no site menu");
ok(/#sub-open, #subwrap \{ display: none !important; \}/.test(out), "Subscribe hidden");
ok(/LANG = "fr"/.test(out) && /dashboard\.json/.test(out), "the loader reads dashboard.json in the page's language");
const app = (out.match(/<script type="text\/x-launch-app">/g) || []).length;
const plain = (html.match(/<script>/g) || []).length;
ok(app === plain && app > 0, "every inline script of the page waits for the data");
ok(out.indexOf("var DATA_URL") < out.indexOf('<script type="text/x-launch-app">'), "the loader comes before the page's scripts");
ok(/s\.public = true/.test(out), "sources are marked public for the page's filter");

// a page that no longer loads products.js the expected way must stop the build
let threw = false;
try { transform(html.replace('<script src="data/products.js"></script>', ""), "en"); } catch (e) { threw = true; }
ok(threw, "a page that changed how it loads its data stops the build");

console.log(`\n  build-rbm-pages: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
