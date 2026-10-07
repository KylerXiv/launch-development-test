// The RBM look for the pages handed over to RBM (used by build-rbm-pages.js).
// Source: RBM Dashboard Design Guidelines v1.0,
// https://dashboards.endmalaria.org/design-guidelines (read 7 Oct 2026).
//
// Same approach as build-unitaid-theme.js: the page's own CSS is left alone and
// a stylesheet that comes after it redefines the design tokens and restyles the
// components, so the skin follows any change to the source page on the next
// build. Only the RBM pages wear it; the LAUNCH site keeps its own look.
//
// What it maps (guideline → token):
//   RBM Blue #2563EB          → --accent (every primary action and active state)
//   canvas #EDF2F9, white     → --ground, --surface (white cards on the canvas)
//   slate-200 border          → --line; gray-900/700/600 text → --ink/-2/-3
//   emerald / amber / red     → --good / --warn / --crit (trend-badge pairs; red
//                               is RBM's Gap #CB1C1C)
//   map ramp #E0DDDD → #033FAF → --map1..3 at 50 / 75 / 100 %; land white with
//                               #4884CC borders
//   Roboto (UI), Poppins (title, KPI figures); rounded-md / rounded-lg corners;
//   shadow-md cards; gray-200 table head; neutral-100 modal head.
// Light only: RBM has no dark mode (the page is light-only already).
//
// Contrast, checked 7 Oct 2026: every text token clears 4.5:1 on white, the
// canvas, --surface-2, --accent-soft and the table head (the lowest is
// --warn-text on the canvas, 4.46:1 — it never sits there; on white and its own
// soft fill it is 5.0 / 4.8:1). Map levels against white land: 3.3 / 5.5 / 9.0:1.
"use strict";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap">';

const TOKENS = `
    --ground: #EDF2F9; --surface: #FFFFFF; --surface-2: #F3F4F6;
    --ink: #111827; --ink-2: #374151; --ink-3: #4B5563; --line: #E2E8F0;
    --accent: #2563EB; --accent-ink: #FFFFFF; --accent-soft: #EFF6FF;
    --good: #059669; --good-text: #047857; --good-soft: #ECFDF5;
    --warn: #D97706; --warn-text: #B45309; --warn-soft: #FFFBEB;
    --crit: #CB1C1C; --crit-soft: #FEF2F2;
    --idle: #6B7280; --idle-soft: #F3F4F6;
    --map1: #728EC6; --map2: #3A67BB; --map3: #033FAF;
    --map-nodata: #FFFFFF; --map-border: #4884CC;
    --shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);`;

const CSS = `
<style id="rbm-skin">
  /* RBM look — scripts/rbm-skin.js. Generated; do not edit. */
  :root, :root:not([data-theme="light"]), :root[data-theme="dark"] {${TOKENS}
  }
  body, button, input, select, textarea { font-family: Roboto, "Helvetica Neue", Arial, sans-serif; }
  .hd-title, .card .big { font-family: Poppins, Roboto, Arial, sans-serif; font-weight: 600; }
  .hd-title { letter-spacing: 0; }

  /* cards: rounded-lg + shadow-md on the canvas; panels inside them rounded-md */
  .pathway, .board, .updates, .disclaimer, .srcs, .viz, .gatewrap, .subwrap { border-radius: 8px; }
  .l1in, .gatepanel, .gw-band, .detail, .card, .mtable-box, .det-card, .map-legend-bar, .map-dock-rail,
  #mapwrap-gl, #mapwrap-gl .maplibregl-canvas { border-radius: 6px; }

  /* table head: gray-200 strip, gray-600 bold labels */
  .srow.hd { background: #E5E7EB; color: #4B5563; }
  .srow.hd .c-bar { color: #4B5563; }

  /* the source page's hard-coded teal tints, in RBM blue */
  .jcell.on { box-shadow: inset 1px 0 0 #BFDBFE, inset -1px 0 0 #BFDBFE; }
  .more { border-top-color: #BFDBFE; }
  .more:hover { background: #DBEAFE; }
  .det-pill.registered { color: #111827; }
  .mft-pchip { background: #F3F4F6; }

  /* buttons: rounded-md, RBM Blue primary (blue-700 on hover), no gradients */
  .dl-btn, .sub-btn, .sub-go, .swg, .det-q, .det-nav button { border-radius: 6px; }
  .sub-btn:hover, .sub-go:hover { background: #1D4ED8; border-color: #1D4ED8; }
  /* segmented control: active blue-600 / white, inactive gray-200 / gray-800 */
  .swg { border-color: #E5E7EB; }
  .swg button { background: #E5E7EB; color: #1F2937; }
  .swg button + button { border-left-color: #D1D5DB; }
  .swg button:not([aria-pressed="true"]):hover { background: #DBEAFE; color: #1D4ED8; }

  /* feedback dialog: neutral-100 head strip, rounded-lg, shadow-xl. The widget
     adds its own stylesheet when it loads, after this one, so these rules carry
     an extra "html" to win on specificity instead of source order. */
  html .ri-dialog { border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1); }
  html .ri-head { background: #F5F5F5; }
  html .ri-dialog::backdrop { background: rgba(0,0,0,.5); }
  html .ri-btn, html .ri-input, html .ri-select, html .ri-textarea { border-radius: 6px; }
  html .ri-primary:hover { background: #1D4ED8; }
</style>`;

// Colours the page writes from its scripts rather than its CSS. Each must be
// found exactly once, so a change in the source page stops the build instead
// of leaving a teal patch in the RBM look.
const SCRIPT_COLOURS = [
  // "Treatments procured" split bar: the default map ramp, dark to light
  ['const shades = ["#14657E", "#3E8CA3", "#77AFC0", "#B4D2DC"];',
   'const shades = ["#033FAF", "#3A67BB", "#728EC6", "#A9B6D2"];'],
];

// Adds the skin after the page's own stylesheet (so it wins by source order)
// and swaps the script colours. Throws when the page no longer matches.
function applySkin(html, lang) {
  const end = html.indexOf("</style>");
  if (end < 0) throw new Error(`${lang}: no </style> to put the RBM skin after`);
  let out = html.slice(0, end + 8) + "\n" + FONTS + CSS + html.slice(end + 8);
  for (const [from, to] of SCRIPT_COLOURS) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`${lang}: expected one ${from.slice(0, 40)}… for the RBM skin, found ${n} — update scripts/rbm-skin.js`);
    out = out.replace(from, to);
  }
  return out;
}

module.exports = { applySkin, TOKENS };
