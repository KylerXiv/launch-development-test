#!/usr/bin/env node
// Builds the pages handed over to RBM: the illustrated journey dashboard, one
// page per language, reading its data at runtime from the published
// dashboard.json instead of from data/*.js. RBM embeds them (iframe) under its
// /en, /fr and /pt routes.
//
//   node scripts/build-rbm-pages.js                      # → dist/rbm/
//   node scripts/build-rbm-pages.js --data-url <url>     # read another dashboard.json
//   node scripts/build-rbm-pages.js --allow-stale        # as build-locale-pages.js
//
// Output (self-contained; host it as static files anywhere):
//   dist/rbm/en/index.html, fr/index.html, pt/index.html
//   dist/rbm/{en,fr,pt}/data/world-map.js, world-map-geo.js   map shapes, with that
//                               language's country names (static, never change)
//   dist/rbm/{en,fr,pt}/assets/report-issue.js   the feedback form, in that language
//   dist/rbm/assets/            icons and logos (shared)
//   dist/rbm/README.md          how to host and embed
//
// HOW. The English page and the French and Portuguese pages that
// build-locale-pages.js writes (interface text already translated) are taken
// as they are, and four things change:
//   1. the <script src> tags for products.js, sources.js and treatment-policy.js
//      go; a small loader fetches dashboard.json, picks the page's language out
//      of every { en, fr, pt } text, rebuilds the three globals the page has
//      always read (LAUNCH_DATA, LAUNCH_SOURCES, LAUNCH_TREATMENT_POLICY), and
//      only then runs the page's own scripts (kept, unchanged, as deferred
//      <script type="text/x-launch-app"> blocks);
//   2. relative paths point one level up, to the shared assets/, except the
//      per-language map files and feedback widget (PER_LANGUAGE);
//   3. the site menu goes (its Pipeline and Story pages are not part of the
//      handover; RBM's platform has its own navigation);
//   4. Subscribe for updates goes, and Send feedback is not connected (their
//      email backend, api/, runs on the LAUNCH Vercel project and does not come
//      with these files).
// If dashboard.json cannot be fetched, or its schema_version is not 1, the page
// says so in its banner and draws nothing, rather than a half-rendered chart.
//
// Requires Node 18+. No dependencies. Builds the locale pages first.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PAGE = "illustrated-journey-dashboard.html";
const OUT = path.join(ROOT, "dist", "rbm");
const LOCALES = ["en", "fr", "pt"];
const args = process.argv.slice(2);
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const DATA_URL = argOf("--data-url") || "https://codebyjackson.github.io/launch-data-test/v1/dashboard.json";
const SCHEMA = 1;

// Data files the loader replaces. Anything else the page loads (the map shapes)
// is copied as a static file.
const REPLACED = ["data/products.js", "data/sources.js", "data/treatment-policy.js"];
// Files whose text differs by language, so each language folder has its own
// copy, from the locale build: country names in the map files, the feedback
// form's wording in report-issue.js. Everything else in assets/ is shared.
const PER_LANGUAGE = ["data/world-map.js", "data/world-map-geo.js", "assets/report-issue.js"];

// Reader-facing messages, per language. New strings the translation memory does
// not hold, so they are written here by hand — NOT reviewed yet: have a French
// and a Portuguese speaker check them (docs/rbm-handover-notes.md).
const MSG = {
  en: { fail: "<b>The dashboard data could not be loaded.</b> Please try again in a few minutes.",
        schema: "<b>This dashboard is being updated.</b> Please check back shortly." },
  fr: { fail: "<b>Les données du tableau de bord n'ont pas pu être chargées.</b> Veuillez réessayer dans quelques minutes.",
        schema: "<b>Ce tableau de bord est en cours de mise à jour.</b> Veuillez revenir un peu plus tard." },
  pt: { fail: "<b>Não foi possível carregar os dados do painel.</b> Tente novamente dentro de alguns minutos.",
        schema: "<b>Este painel está a ser atualizado.</b> Volte a consultá-lo em breve." },
};

function loader(lang) {
  return `<style>#sub-open, #subwrap { display: none !important; }</style>
<script>
/* Loads the LAUNCH dataset (scripts/build-rbm-pages.js). Generated; do not edit. */
(function () {
  "use strict";
  var DATA_URL = ${JSON.stringify(DATA_URL)}, LANG = ${JSON.stringify(lang)}, SCHEMA = ${SCHEMA};
  var MSG = ${JSON.stringify(MSG[lang])};
  // every reader-facing text in dashboard.json is { en, fr, pt }: keep this page's
  var isText = function (v) {
    return v && typeof v === "object" && !Array.isArray(v) && typeof v.en === "string" &&
      Object.keys(v).length === 3 && "fr" in v && "pt" in v;
  };
  var pick = function (v) {
    if (Array.isArray(v)) return v.map(pick);
    if (isText(v)) return v[LANG] || v.en;
    if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = pick(v[k]); }); return o; }
    return v;
  };
  var notice = function (html) {
    var b = document.getElementById("banner");
    if (b) { b.hidden = false; b.classList.add("error"); b.innerHTML = html; }
  };
  var run = function () {
    Array.prototype.forEach.call(document.querySelectorAll('script[type="text/x-launch-app"]'), function (s) {
      var n = document.createElement("script");
      n.text = s.text;
      s.parentNode.replaceChild(n, s);
    });
  };
  var start = function () {
    fetch(DATA_URL, { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (ds) {
        if (ds.schema_version !== SCHEMA) { notice(MSG.schema); return; }
        var d = pick(ds.data);
        window.LAUNCH_DATA = {
          meta: { lastUpdated: ds.last_updated, dataStatus: ds.data_status, host: d.host },
          stages: d.stages, stageColumns: d.stageColumns, stageInfo: d.stageInfo,
          glossary: d.glossary, changelog: d.changelog, products: d.products
        };
        // everything published is public; the page lists only entries marked so
        window.LAUNCH_SOURCES = { sources: d.sources.map(function (s) { s.public = true; return s; }) };
        window.LAUNCH_TREATMENT_POLICY = d.treatmentPolicy;
        window.LAUNCH_DATASET = { approved_at: ds.approved_at, generated_at: ds.generated_at, url: DATA_URL };
        run();
      })
      .catch(function () { notice(MSG.fail); });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
</script>
`;
}

function transform(html, lang) {
  let out = html;
  let removed = 0;
  for (const rel of REPLACED) {
    const tag = new RegExp(`<script src="${rel.replace(/\./g, "\\.")}"></script>\\r?\\n?`);
    if (!tag.test(out)) throw new Error(`${lang}: <script src="${rel}"> not found — the page changed; update build-rbm-pages.js`);
    out = out.replace(tag, "");
    removed++;
  }
  // the page's own inline scripts wait for the data
  let deferred = 0;
  out = out.replace(/<script>(?=[\s\S]*?<\/script>)/g, () => { deferred++; return '<script type="text/x-launch-app">'; });
  if (!deferred) throw new Error(`${lang}: no inline <script> to defer`);
  // site menu out (its other pages are not handed over)
  const nav = /<script src="assets\/site-nav\.js"[^>]*><\/script>\r?\n?/;
  if (!nav.test(out)) throw new Error(`${lang}: site-nav.js tag not found`);
  out = out.replace(nav, "");
  // Subscribe out (its backend is not handed over): hidden by CSS that comes
  // with the loader (the page has no </head> to put it in), so the page's own
  // code still finds the elements it wires up
  // Send feedback not connected, for the same reason: on RBM's host
  // /api/feedback does not exist, so the widget keeps Send blocked and its red
  // note instead of failing every report
  out = out.replace(/(\bconnected\s*:\s*)true\b/g, "$1false");
  // shared files one level up, except the ones each language has its own copy
  // of (PER_LANGUAGE): the map files carry the country names, the feedback
  // widget its wording
  out = out.replace(/(src|href)="(assets|data)\//g, '$1="../$2/');
  out = out.replace(/url\((["']?)(assets|data)\//g, "url($1../$2/");
  for (const rel of PER_LANGUAGE) out = out.split(`="../${rel}"`).join(`="${rel}"`);
  // the loader runs before the deferred scripts, right after the map/icon libraries
  const firstApp = out.indexOf('<script type="text/x-launch-app">');
  out = out.slice(0, firstApp) + loader(lang) + out.slice(firstApp);
  return { html: out, removed, deferred };
}

function main() {
  // the French and Portuguese pages (interface text) come from the locale build
  const stale = args.includes("--allow-stale") ? ["--allow-stale"] : [];
  execFileSync(process.execPath, [path.join(__dirname, "build-locale-pages.js"), ...stale], { cwd: ROOT, stdio: "ignore" });

  fs.rmSync(OUT, { recursive: true, force: true });
  const sources = { en: path.join(ROOT, PAGE), fr: path.join(ROOT, "dist", "locale", "fr", PAGE), pt: path.join(ROOT, "dist", "locale", "pt", PAGE) };
  for (const lang of LOCALES) {
    const { html, removed, deferred } = transform(fs.readFileSync(sources[lang], "utf8"), lang);
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    fs.writeFileSync(path.join(OUT, lang, "index.html"), html, "utf8");
    // this language's own map files and feedback widget
    const from = lang === "en" ? ROOT : path.join(ROOT, "dist", "locale", lang);
    for (const rel of PER_LANGUAGE) {
      fs.mkdirSync(path.dirname(path.join(OUT, lang, rel)), { recursive: true });
      fs.copyFileSync(path.join(from, rel), path.join(OUT, lang, rel));
    }
    console.log(`  ${lang}/index.html + ${PER_LANGUAGE.join(", ")}  (${removed} data files → dashboard.json, ${deferred} scripts deferred)`);
  }
  fs.cpSync(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });
  fs.rmSync(path.join(OUT, "assets", "site-nav.js"), { force: true });
  fs.rmSync(path.join(OUT, "assets", "report-issue.js"), { force: true });   // per language now
  fs.copyFileSync(path.join(ROOT, "rbm", "README.md"), path.join(OUT, "README.md"));
  console.log(`  assets/ (shared), README.md\n  data: ${DATA_URL}\n  → ${path.relative(ROOT, OUT)}/`);
}

module.exports = { transform, loader };
if (require.main === module) main();
