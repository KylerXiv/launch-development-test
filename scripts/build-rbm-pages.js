#!/usr/bin/env node
// Builds the pages handed over to RBM: the illustrated journey dashboard, one
// page per language, reading its data at runtime from the published
// dashboard.json instead of from data/*.js. RBM embeds them (iframe) under its
// /en, /fr and /pt routes; /es is ready for when it has one (RBM's platform had
// no Spanish route on 22 Sep 2026, docs/source-registry-notes.md).
//
//   node scripts/build-rbm-pages.js                      # → dist/rbm/
//   node scripts/build-rbm-pages.js --data-url <url>     # read another dashboard.json
//   node scripts/build-rbm-pages.js --api-url <origin>   # where the two forms post
//   node scripts/build-rbm-pages.js --api-url none       # both forms off
//   node scripts/build-rbm-pages.js --allow-stale        # as build-locale-pages.js
//
// Output (self-contained; host it as static files anywhere):
//   dist/rbm/en/index.html, fr/index.html, pt/index.html, es/index.html
//   dist/rbm/{en,fr,pt,es}/data/world-map.js, world-map-geo.js   map shapes, with that
//                               language's country names (static, never change)
//   dist/rbm/{en,fr,pt,es}/assets/report-issue.js   the feedback form, in that language
//   dist/rbm/assets/            icons and logos (shared)
//   dist/rbm/README.md          how to host and embed
//
// HOW. The English page and the French, Portuguese and Spanish pages that
// build-locale-pages.js writes (interface text already translated) are taken
// as they are, and four things change:
//   1. the <script src> tags for products.js, sources.js and treatment-policy.js
//      go; a small loader fetches dashboard.json, picks the page's language out
//      of every { en, fr, pt, es } text (English where the file has no such
//      language yet), rebuilds the three globals the page has
//      always read (LAUNCH_DATA, LAUNCH_SOURCES, LAUNCH_TREATMENT_POLICY), and
//      only then runs the page's own scripts (kept, unchanged, as deferred
//      <script type="text/x-launch-app"> blocks);
//   2. relative paths point one level up, to the shared assets/, except the
//      per-language map files and feedback widget (PER_LANGUAGE);
//   3. the site menu goes (its Pipeline and Story pages are not part of the
//      handover; RBM's platform has its own navigation);
//   4. Subscribe for updates and Send feedback post to the LAUNCH Vercel
//      project (--api-url), whose api/ lists RBM's host as a partner, since
//      RBM's static host has no api/ of its own. With --api-url none,
//      Subscribe is hidden and Send feedback is not connected instead.
//   5. the RBM look goes on top (scripts/rbm-skin.js, from RBM's design
//      guidelines): colours, fonts and components. The page's own CSS is
//      unchanged, so the LAUNCH site keeps its look.
// If dashboard.json cannot be fetched, or its schema_version is not 1, the page
// says so in its banner and draws nothing, rather than a half-rendered chart.
//
// Requires Node 18+. No dependencies. Builds the locale pages first.
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { applySkin } = require("./rbm-skin");

const ROOT = path.resolve(__dirname, "..");
const PAGE = "illustrated-journey-dashboard.html";
const OUT = path.join(ROOT, "dist", "rbm");
const LOCALES = ["en", "fr", "pt", "es"];
const args = process.argv.slice(2);
const argOf = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const DATA_URL = argOf("--data-url") || "https://codebyjackson.github.io/launch-data-test/v1/dashboard.json";
const SCHEMA = 1;
// Where the two forms post: the origin of the LAUNCH Vercel project, whose
// api/_mail.js must list the host these pages are served from in PARTNERS, or
// the browser blocks every post. Production, never a PR preview (those
// addresses expire). "none" turns both forms off. The address changes when
// the project moves to Unitaid's hosting: rebuild with the new one.
const API_ARG = argOf("--api-url") || "https://launch-development-test.vercel.app";
const API_URL = API_ARG === "none" ? null : API_ARG.replace(/\/+$/, "");
if (API_URL && !/^https?:\/\/[^/\s]+$/.test(API_URL)) {
  throw new Error(`--api-url must be an origin like https://example.org (no path), or "none"; got ${API_ARG}`);
}

// Data files the loader replaces. Anything else the page loads (the map shapes)
// is copied as a static file.
const REPLACED = ["data/products.js", "data/sources.js", "data/treatment-policy.js"];
// Files whose text differs by language, so each language folder has its own
// copy, from the locale build: country names in the map files, the feedback
// form's wording in report-issue.js. Everything else in assets/ is shared.
const PER_LANGUAGE = ["data/world-map.js", "data/world-map-geo.js", "assets/report-issue.js"];

// Reader-facing messages, per language. New strings the translation memory does
// not hold, so they are written here by hand — NOT reviewed yet: have a French,
// a Portuguese and a Spanish speaker check them (docs/rbm-handover-notes.md,
// docs/jackson/spanish.md).
const MSG = {
  en: { fail: "<b>The dashboard data could not be loaded.</b> Please try again in a few minutes.",
        schema: "<b>This dashboard is being updated.</b> Please check back shortly." },
  fr: { fail: "<b>Les données du tableau de bord n'ont pas pu être chargées.</b> Veuillez réessayer dans quelques minutes.",
        schema: "<b>Ce tableau de bord est en cours de mise à jour.</b> Veuillez revenir un peu plus tard." },
  pt: { fail: "<b>Não foi possível carregar os dados do painel.</b> Tente novamente dentro de alguns minutos.",
        schema: "<b>Este painel está a ser atualizado.</b> Volte a consultá-lo em breve." },
  es: { fail: "<b>No se pudieron cargar los datos del panel.</b> Vuelva a intentarlo dentro de unos minutos.",
        schema: "<b>Este panel se está actualizando.</b> Vuelva a consultarlo en breve." },
};

function loader(lang, apiUrl = API_URL) {
  // with no API to post to, Subscribe is hidden here (the page has no </head>
  // to put it in), so the page's own code still finds the elements it wires up
  return `${apiUrl ? "" : "<style>#sub-open, #subwrap { display: none !important; }</style>\n"}<script>
/* Loads the LAUNCH dataset (scripts/build-rbm-pages.js). Generated; do not edit. */
(function () {
  "use strict";
  var DATA_URL = ${JSON.stringify(DATA_URL)}, LANG = ${JSON.stringify(lang)}, SCHEMA = ${SCHEMA};
  var MSG = ${JSON.stringify(MSG[lang])};
  // every reader-facing text in dashboard.json is { en, fr, pt, ... }, one key
  // per language the file lists in ds.locales: keep this page's, or the English
  // where the file does not have this language yet. No fixed number of keys,
  // so a language added to the file never breaks a page built before it.
  var LOCS = ["en"];
  var isText = function (v) {
    return v && typeof v === "object" && !Array.isArray(v) && typeof v.en === "string" &&
      Object.keys(v).every(function (k) { return LOCS.indexOf(k) >= 0; });
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
        LOCS = Array.isArray(ds.locales) && ds.locales.indexOf("en") >= 0 ? ds.locales : ["en", "fr", "pt"];
        var d = pick(ds.data);
        window.LAUNCH_DATA = {
          meta: { lastUpdated: ds.last_updated, dataStatus: ds.data_status, host: d.host },
          stages: d.stages, stageColumns: d.stageColumns, stageInfo: d.stageInfo, yardstick: d.yardstick,
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

// The page's inline script that only sets the feedback widget's settings (it
// may open with a comment).
const WIDGET_SETTINGS = /^\s*(\/\*[\s\S]*?\*\/\s*)?window\.LAUNCH_FEEDBACK_COPY\s*=/;

function transform(html, lang, { apiUrl = API_URL } = {}) {
  let out = html;
  let removed = 0;
  for (const rel of REPLACED) {
    const tag = new RegExp(`<script src="${rel.replace(/\./g, "\\.")}"></script>\\r?\\n?`);
    if (!tag.test(out)) throw new Error(`${lang}: <script src="${rel}"> not found — the page changed; update build-rbm-pages.js`);
    out = out.replace(tag, "");
    removed++;
  }
  // the page's own inline scripts wait for the data, except the feedback
  // widget's settings: they read no data, and the widget (a deferred <script
  // src>) reads them as soon as it runs, before the data arrives. Deferred,
  // the widget never saw them (found 2 Oct, fixed 7 Oct).
  let deferred = 0, settings = 0;
  out = out.replace(/<script>([\s\S]*?)<\/script>/g, (all, body) => {
    if (WIDGET_SETTINGS.test(body)) { settings++; return all; }
    deferred++;
    return '<script type="text/x-launch-app">' + body + "</script>";
  });
  if (!deferred) throw new Error(`${lang}: no inline <script> to defer`);
  if (settings !== 1) throw new Error(`${lang}: expected one window.LAUNCH_FEEDBACK_COPY script, found ${settings} — the page changed; update build-rbm-pages.js`);
  // site menu out (its other pages are not handed over)
  const nav = /<script src="assets\/site-nav\.js"[^>]*><\/script>\r?\n?/;
  if (!nav.test(out)) throw new Error(`${lang}: site-nav.js tag not found`);
  out = out.replace(nav, "");
  if (apiUrl) {
    // Subscribe posts to the LAUNCH API: RBM's host has no /api/subscribe
    const sub = /fetch\("\/api\/subscribe"/g;
    const found = (out.match(sub) || []).length;
    if (found !== 1) throw new Error(`${lang}: expected one fetch("/api/subscribe"), found ${found} — the page changed; update build-rbm-pages.js`);
    out = out.replace(sub, `fetch(${JSON.stringify(apiUrl + "/api/subscribe")}`);
    // Send feedback stays connected; its endpoint is set in the widget's own
    // copy beside the page (widget(), below)
  } else {
    // No API: Subscribe is hidden (loader) and Send feedback is not connected,
    // so the widget keeps Send blocked and its red note instead of failing
    // every report
    out = out.replace(/(\bconnected\s*:\s*)true\b/g, "$1false");
  }
  // shared files one level up, except the ones each language has its own copy
  // of (PER_LANGUAGE): the map files carry the country names, the feedback
  // widget its wording
  out = out.replace(/(src|href)="(assets|data)\//g, '$1="../$2/');
  out = out.replace(/url\((["']?)(assets|data)\//g, "url($1../$2/");
  for (const rel of PER_LANGUAGE) out = out.split(`="../${rel}"`).join(`="${rel}"`);
  // the loader runs before the deferred scripts, right after the map/icon libraries
  const firstApp = out.indexOf('<script type="text/x-launch-app">');
  out = out.slice(0, firstApp) + loader(lang, apiUrl) + out.slice(firstApp);
  // the RBM look, after the page's own stylesheet
  out = applySkin(out, lang);
  return { html: out, removed, deferred };
}

// The feedback widget posts to a fixed "/api/feedback", which RBM's host does
// not have, so the copy beside each page posts to the LAUNCH API instead.
// Without an API it is left as it is: not connected, it never posts.
function widget(js, apiUrl = API_URL) {
  if (!apiUrl) return js;
  const endpoint = /(var ENDPOINT = )"\/api\/feedback";/;
  if (!endpoint.test(js)) throw new Error('report-issue.js: var ENDPOINT = "/api/feedback" not found — the widget changed; update build-rbm-pages.js');
  return js.replace(endpoint, `$1${JSON.stringify(apiUrl + "/api/feedback")};`);
}

function main() {
  // the translated pages (interface text) come from the locale build
  const stale = args.includes("--allow-stale") ? ["--allow-stale"] : [];
  execFileSync(process.execPath, [path.join(__dirname, "build-locale-pages.js"), ...stale], { cwd: ROOT, stdio: "ignore" });

  fs.rmSync(OUT, { recursive: true, force: true });
  const sources = Object.fromEntries(LOCALES.map((l) => [l, l === "en" ? path.join(ROOT, PAGE) : path.join(ROOT, "dist", "locale", l, PAGE)]));
  for (const lang of LOCALES) {
    const { html, removed, deferred } = transform(fs.readFileSync(sources[lang], "utf8"), lang);
    fs.mkdirSync(path.join(OUT, lang), { recursive: true });
    fs.writeFileSync(path.join(OUT, lang, "index.html"), html, "utf8");
    // this language's own map files and feedback widget
    const from = lang === "en" ? ROOT : path.join(ROOT, "dist", "locale", lang);
    for (const rel of PER_LANGUAGE) {
      fs.mkdirSync(path.dirname(path.join(OUT, lang, rel)), { recursive: true });
      if (rel === "assets/report-issue.js") {
        fs.writeFileSync(path.join(OUT, lang, rel), widget(fs.readFileSync(path.join(from, rel), "utf8")), "utf8");
      } else {
        fs.copyFileSync(path.join(from, rel), path.join(OUT, lang, rel));
      }
    }
    console.log(`  ${lang}/index.html + ${PER_LANGUAGE.join(", ")}  (${removed} data files → dashboard.json, ${deferred} scripts deferred)`);
  }
  fs.cpSync(path.join(ROOT, "assets"), path.join(OUT, "assets"), { recursive: true });
  fs.rmSync(path.join(OUT, "assets", "site-nav.js"), { force: true });
  fs.rmSync(path.join(OUT, "assets", "report-issue.js"), { force: true });   // per language now
  fs.copyFileSync(path.join(ROOT, "rbm", "README.md"), path.join(OUT, "README.md"));
  console.log(`  assets/ (shared), README.md\n  data: ${DATA_URL}\n  forms: ${API_URL ? API_URL + "/api/{subscribe,feedback}" : "off (--api-url none)"}\n  → ${path.relative(ROOT, OUT)}/`);
}

module.exports = { transform, loader, widget };
if (require.main === module) main();
