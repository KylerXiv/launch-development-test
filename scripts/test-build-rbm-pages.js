#!/usr/bin/env node
// Tests for scripts/build-rbm-pages.js — the pages handed over to RBM.
//   node scripts/test-build-rbm-pages.js
// Transforms the English page in memory (writes nothing) and checks what the
// handover depends on: the data comes only from dashboard.json, the page's own
// code waits for it, paths point at the shared folders, the menu and Subscribe
// are gone, Send feedback is not connected, and a page that has drifted from
// what the build expects fails loudly instead of producing a broken bundle.
"use strict";
const fs = require("fs");
const path = require("path");
const { transform } = require("./build-rbm-pages");

const html = fs.readFileSync(path.join(__dirname, "..", "illustrated-journey-dashboard.html"), "utf8");
let passed = 0, failed = 0;
const ok = (c, name) => { if (c) passed++; else { failed++; console.log("  FAIL " + name); } };

const { html: out } = transform(html, "fr");
ok(!/<script src="(\.\.\/)?data\/(products|sources|treatment-policy)\.js"/.test(out), "products, sources and policy are not loaded as files");
// the map files and the feedback widget differ by language, so each page loads its own copy beside it
ok(/<script src="data\/world-map\.js"><\/script>/.test(out) && /src="data\/world-map-geo\.js"/.test(out), "map shapes load from the language's own data/");
ok(/src="assets\/report-issue\.js"/.test(out), "the feedback widget loads from the language's own assets/");
ok(!/(src|href)="(assets|data)\/(?!world-map\.js"|world-map-geo\.js"|report-issue\.js")/.test(out), "every other relative asset path points one level up");
ok(!/site-nav\.js/.test(out), "no site menu");
ok(/#sub-open, #subwrap \{ display: none !important; \}/.test(out), "Subscribe hidden");
ok(/\bconnected\s*:\s*true\b/.test(html) && !/\bconnected\s*:\s*true\b/.test(out) && /\bconnected: false\b/.test(out),
   "Send feedback, connected on the LAUNCH site, is not connected here");
ok(/LANG = "fr"/.test(out) && /dashboard\.json/.test(out), "the loader reads dashboard.json in the page's language");
const app = (out.match(/<script type="text\/x-launch-app">/g) || []).length;
const plain = (html.match(/<script>/g) || []).length;
ok(app === plain && app > 0, "every inline script of the page waits for the data");
ok(out.indexOf("var DATA_URL") < out.indexOf('<script type="text/x-launch-app">'), "the loader comes before the page's scripts");
ok(/s\.public = true/.test(out), "sources are marked public for the page's filter");
// the RBM look: after the page's own stylesheet, so its tokens win
ok(out.indexOf('<style id="rbm-skin">') > out.indexOf("</style>") && /--accent: #2563EB/.test(out), "the RBM skin comes after the page's CSS, with RBM Blue as the accent");
ok(/fonts\.googleapis\.com\/css2\?family=Poppins[^"]*Roboto/.test(out), "Roboto and Poppins load");
ok(!/#14657E/.test(out) && /const shades = \["#033FAF"/.test(out), "no teal left in the script colours");

// a page that no longer loads products.js the expected way must stop the build
let threw = false;
try { transform(html.replace('<script src="data/products.js"></script>', ""), "en"); } catch (e) { threw = true; }
ok(threw, "a page that changed how it loads its data stops the build");
threw = false;
try { transform(html.replace('const shades = ["#14657E"', 'const shades = ["#000000"'), "en"); } catch (e) { threw = true; }
ok(threw, "a page whose script colours changed stops the build, so no teal is left in the RBM look");

console.log(`\n  build-rbm-pages: ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
