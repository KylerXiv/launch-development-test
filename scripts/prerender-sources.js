#!/usr/bin/env node
// Writes the Sources list into a built illustrated journey page, so the page's
// HTML carries it before any script runs.
//
//   node scripts/prerender-sources.js <page.html> <sources.js>   # rewrites page.html
//   const { prerenderSources } = require("./prerender-sources");  // html in, html out
//
// Why (partner feedback, 15 Oct 2026): the page says "Everything on this page
// is traceable to one of the public sources below", but the list under it was
// an empty <ul> until the page's script filled it from data/sources.js. Anything
// that reads the page without running scripts (an AI tool given the link, a
// text copy, a link preview) saw the sentence and no sources.
//
// How: the page's own renderSources() and esc() are taken out of the page and
// run here, against that page's sources file (the translated copy for /fr, /pt
// and /es), and their output is put into the empty lists. So the HTML is
// exactly what the script draws, in the page's language, and there is no
// second copy of the list markup to go stale. The script still runs in the
// browser and draws the same list again, from the data the page actually has.
//
// It fails, rather than skip quietly, if the page no longer has the pieces it
// looks for.
"use strict";
const fs = require("fs");
const vm = require("vm");

const DATA_UL = '<ul class="srclist" id="srclist"></ul>';
const DOCS_UL = '<ul class="srclist" id="srcdocs"></ul>';
const DOCS_WRAP = '<div id="srcdocs-wrap" hidden>';

function between(html, start, end) {
  const a = html.indexOf(start);
  if (a === -1) throw new Error(`prerender-sources: "${start}" not found in the page`);
  const b = html.indexOf(end, a);
  if (b === -1) throw new Error(`prerender-sources: end of "${start}" not found`);
  return html.slice(a, b + end.length);
}

function readSources(file) {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), ctx, { filename: file });
  if (!ctx.window.LAUNCH_SOURCES) throw new Error(`prerender-sources: ${file} does not set window.LAUNCH_SOURCES`);
  return ctx.window.LAUNCH_SOURCES;
}

function prerenderSources(html, sources) {
  for (const m of [DATA_UL, DOCS_UL, DOCS_WRAP])
    if (html.split(m).length !== 2) throw new Error(`prerender-sources: expected exactly one ${m} in the page`);
  const escFn = html.match(/function esc\(s\) \{[^\n]*\}/);
  if (!escFn) throw new Error('prerender-sources: "function esc(s) {" not found in the page');
  const esc = escFn[0];
  const render = between(html, "(function renderSources() {", "\n  })();");
  const lang = (html.match(/<html[^>]*\blang="([^"]+)"/) || [, "en"])[1];

  const el = { srclist: { innerHTML: "" }, srcdocs: { innerHTML: "" }, "srcdocs-wrap": { hidden: true } };
  const ctx = {
    window: { LAUNCH_SOURCES: sources },
    document: { getElementById: (id) => el[id] || null },
    PAGE_LANG: lang,
    console,
  };
  vm.runInNewContext(`${esc}\n${render}`, ctx);
  if (!el.srclist.innerHTML) throw new Error("prerender-sources: renderSources() drew no sources");

  let out = html.replace(DATA_UL, DATA_UL.replace("></ul>", ">" + el.srclist.innerHTML + "</ul>"));
  if (!el["srcdocs-wrap"].hidden) {
    out = out.replace(DOCS_UL, DOCS_UL.replace("></ul>", ">" + el.srcdocs.innerHTML + "</ul>"))
             .replace(DOCS_WRAP, '<div id="srcdocs-wrap">');
  }
  return out;
}

if (require.main === module) {
  const [page, src] = process.argv.slice(2);
  if (!page || !src) {
    console.error("usage: prerender-sources.js <page.html> <sources.js>");
    process.exit(2);
  }
  fs.writeFileSync(page, prerenderSources(fs.readFileSync(page, "utf8"), readSources(src)));
}

module.exports = { prerenderSources, readSources };
