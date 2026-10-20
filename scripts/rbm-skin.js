// The Unitaid look for the pages handed over to RBM (used by build-rbm-pages.js).
// Source: Unitaid's brand guidelines, https://brandpad.io/unitaid (Colour,
// Typography, Logo; read 19 Oct 2026). Until 19 Oct 2026 these pages wore
// RBM's own look, from the RBM Dashboard Design Guidelines v1.0; Unitaid's
// Comms team asked for Unitaid's brand instead (feedback sheet, 15 Oct:
// "Unitaid Brand Integration"). docs/unitaid-brand-rbm-notes.md has the
// decisions and the numbers.
//
// Same approach as the old Unitaid brand edition: the page's own CSS is left alone and
// a stylesheet that comes after it redefines the design tokens and restyles the
// components, so the skin follows any change to the source page on the next
// build. Text and layout are the page's own; only colours, type and the weight
// of headings change. Only the RBM pages wear it; the LAUNCH site keeps its own
// look. (The file keeps its name: it is the RBM pages' skin, and
// release-rbm-pages.yml watches it by name.)
//
// What it maps (brand → token):
//   Unitaid Navy #212E92        → --ink (text, headings, tooltips, step badges),
//                                 hover on blue buttons, text on blue tints
//   Unitaid Blue #0066FF        → --accent (every primary action and active
//                                 state; links on white)
//   Unitaid Red #CC0033         → --crit (Delayed)
//   Unitaid Grey #E6EAEE        → table and panel heads; its 60% tint #F0F2F5
//                                 is the canvas (--ground)
//   official 15% / 60% tints    → --line (navy 15%), --exp-line (navy 60%),
//                                 the "Treatments procured" bar (blue 60%)
//   Source Sans 3 (brand web font), Bold for headings
//   Done: Unitaid Green's hue, darkened to #00804F so the white tick on it
//         reads (Unitaid Green itself is 2.2:1 under white).
//   In progress: the LAUNCH site's amber. Unitaid has no amber, and its
//         Orange beside its Red reads as a second red.
//   The country access map and its legend keep LAUNCH's own colours (--map*,
//   untouched), as they did in the RBM look: the brand has no ramp for a map
//   of access stages. The journey icons keep WHO's blue (--journey-icon), which
//   the page ties to the WHO emblem that cannot be recoloured.
//   Corners and shadows stay as in the RBM look (the brand says nothing on
//   them), so nothing moves.
// Light only, like the page.
//
// Contrast, checked 19 Oct 2026: every text token clears 4.5:1 on white, the
// canvas, --surface-2, --accent-soft and the Unitaid Grey heads. Unitaid Blue
// is 4.8:1 on white but under 4.5:1 on any tint, so blue text is kept to white
// and --surface-2 (4.55:1): the Download CSV button gets a white fill, and
// hovers that would put blue text on a blue tint turn the text navy.
"use strict";

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400..800;1,400..700&display=swap">';

const TOKENS = `
    --ground: #F0F2F5; --surface: #FFFFFF; --surface-2: #F7F8FA;
    --ink: #212E92; --ink-2: #3D4678; --ink-3: #525A82; --line: #DEE0EF;
    --accent: #0066FF; --accent-ink: #FFFFFF; --accent-soft: #EBF3FF;
    --good: #00804F; --good-text: #00704A; --good-soft: #D9F7EC;
    --warn: #B87500; --warn-text: #8C5A00; --warn-soft: #FBF0DA;
    --crit: #CC0033; --crit-soft: #FBEBEF;
    --idle: #5F6690; --idle-soft: #EEF0F5;
    --exp-line: #7A82BE; --exp-ink: #212E92;
    --diff: #212E92; --diff-soft: #EBF3FF;
    --ph-mkt-soft: #EBF3FF; --ph-mkt-ink: #212E92;
    --ph-cty-soft: #EBF3FF; --ph-cty-ink: #212E92;
    --shadow: 0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1);`;

const CSS = `
<style id="rbm-skin">
  /* Unitaid look — scripts/rbm-skin.js. Generated; do not edit. */
  :root, :root:not([data-theme="light"]), :root[data-theme="dark"] {${TOKENS}
  }
  body, button, input, select, textarea { font-family: "Source Sans 3", Arial, sans-serif; }
  /* headings in the brand's Bold, navy */
  .hd-title, .viz h2, .disclaimer h3, .srcs-title, .ft-sec h3, .mft-name, .det-cname, .card .big {
    font-weight: 700; color: var(--ink); letter-spacing: 0;
  }

  /* cards: rounded-lg on the canvas; panels inside them rounded-md (as in the RBM look) */
  .pathway, .board, .updates, .disclaimer, .srcs, .viz, .gatewrap, .subwrap { border-radius: 8px; }
  .l1in, .gatepanel, .gw-band, .detail, .card, .mtable-box, .det-card, .map-legend-bar, .map-dock-rail,
  #mapwrap-gl, #mapwrap-gl .maplibregl-canvas { border-radius: 6px; }

  /* table and panel heads: Unitaid Grey strip, navy-grey bold labels */
  .srow.hd, .phase-t, .ystable thead th, .det-table th, .ftab thead th { background: #E6EAEE; color: var(--ink-2); }
  .srow.hd .c-bar, .ftab thead th.n { color: var(--ink-2); }
  .ystable tr.ysgrp th { background: var(--surface-2); }

  /* the source page's hard-coded teal tints, in Unitaid Blue tints (30% and 15%) */
  .jcell.on { box-shadow: inset 1px 0 0 #B2D1FF, inset -1px 0 0 #B2D1FF; }
  .more { border-top-color: #B2D1FF; color: var(--ink); }   /* it sits on --accent-soft */
  .more:hover { background: #D9E8FF; }
  .mft-pchip { background: #F0F2F5; }
  .chip.pipeline { color: var(--ink); }

  /* buttons: rounded-md, Unitaid Blue, navy on hover, no gradients */
  .dl-btn, .sub-btn, .sub-go, .swg, .det-q, .det-nav button { border-radius: 6px; }
  .dl-btn { background: var(--surface); }
  .dl-btn:hover { background: var(--accent); color: var(--accent-ink); }
  .sub-btn:hover, .sub-go:hover { background: #212E92; border-color: #212E92; }
  .swg button:not([aria-pressed="true"]):hover { background: var(--accent-soft); color: var(--ink); }
  .tab[aria-selected="false"]:hover { color: var(--ink); border-color: var(--accent); }

  /* feedback dialog: Unitaid Grey head strip, rounded-lg, shadow-xl. The widget
     adds its own stylesheet when it loads, after this one, so these rules carry
     an extra "html" to win on specificity instead of source order. */
  html .ri-dialog { border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0,0,0,.1), 0 8px 10px -6px rgba(0,0,0,.1); }
  html .ri-head { background: #F0F2F5; }
  html .ri-dialog::backdrop { background: rgba(0,0,0,.5); }
  html .ri-btn, html .ri-input, html .ri-select, html .ri-textarea { border-radius: 6px; }
  html .ri-primary:hover { background: #212E92; }
</style>`;

// Colours the page writes from its scripts rather than its CSS. Each must be
// found exactly once, so a change in the source page stops the build instead
// of leaving a teal patch in the Unitaid look.
const SCRIPT_COLOURS = [
  // "Treatments procured" split bar, dark to light: Navy, Blue, Blue at 60%,
  // Sky Blue (full colours or 60% tints only: the brand advises against
  // lighter tints for data)
  ['const shades = ["#14657E", "#3E8CA3", "#77AFC0", "#B4D2DC"];',
   'const shades = ["#212E92", "#0066FF", "#66A3FF", "#75D8F7"];'],
];

// Adds the skin after the page's own stylesheet (so it wins by source order)
// and swaps the script colours. Throws when the page no longer matches.
function applySkin(html, lang) {
  const end = html.indexOf("</style>");
  if (end < 0) throw new Error(`${lang}: no </style> to put the Unitaid skin after`);
  let out = html.slice(0, end + 8) + "\n" + FONTS + CSS + html.slice(end + 8);
  for (const [from, to] of SCRIPT_COLOURS) {
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(`${lang}: expected one ${from.slice(0, 40)}… for the Unitaid skin, found ${n} — update scripts/rbm-skin.js`);
    out = out.replace(from, to);
  }
  return out;
}

module.exports = { applySkin, TOKENS };
