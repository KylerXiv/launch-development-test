#!/usr/bin/env node
// Regenerates the standalone journey icon assets from assets/journey-icons/icons.js,
// which is the single source of truth for the geometry:
//
//   assets/journey-icons/NN-stage.svg   one file per stage, 512x512, accent-inked
//   assets/journey-icons/journey-strip.svg   all eight with arrows between
//   assets/journey-icons/png/*.png      raster fallbacks (needs Chrome; skipped if absent)
//
// Run after editing any path in icons.js:  node scripts/build-journey-icons.js

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "assets", "journey-icons");
const PNG_DIR = path.join(DIR, "png");

// The icons are authored as a browser script; give it a window and read it back.
const sandbox = { window: {} };
new Function("window", fs.readFileSync(path.join(DIR, "icons.js"), "utf8"))(sandbox.window);
const { list: ICONS, attrs: ATTR } = sandbox.window.LaunchJourneyIcons;

// Standalone files carry one ink colour (the dashboard accent) because an <img>
// cannot inherit currentColor. In the pages themselves the icons are inlined and
// take their colour from the status they report.
const INK = "#14657E";
const body = ic => ic.body.replace(/\s+/g, " ").trim();
const escXml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- one file per stage -----------------------------------------------------
const SIZE = 512;
for (const ic of ICONS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${SIZE}" height="${SIZE}" color="${INK}">
  <title>${escXml(ic.title)}</title>
  <g ${ATTR}>${body(ic)}</g>
</svg>
`;
  fs.writeFileSync(path.join(DIR, `${ic.id}.svg`), svg);
}

// ---- the eight-stage strip --------------------------------------------------
const CELL = 64;      // icon box
const GAP = 26;       // room for the arrow between cells
const PAD = 8;
const stripW = PAD * 2 + ICONS.length * CELL + (ICONS.length - 1) * GAP;
const stripH = PAD * 2 + CELL;

const parts = [];
ICONS.forEach((ic, i) => {
  const x = PAD + i * (CELL + GAP);
  parts.push(
    `  <g transform="translate(${x} ${PAD}) scale(${CELL / 24})">` +
    `<title>${escXml(ic.title)}</title><g ${ATTR}>${body(ic)}</g></g>`
  );
  if (i < ICONS.length - 1) {
    const ax = x + CELL + GAP / 2 - 4;
    const ay = PAD + CELL / 2;
    parts.push(
      `  <path d="M${ax} ${ay - 5}l5 5-5 5" fill="none" stroke="#7C8E99" ` +
      `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }
});

fs.writeFileSync(path.join(DIR, "journey-strip.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${stripW} ${stripH}" width="${stripW}" height="${stripH}" color="${INK}">
  <title>Product journey — 8 stages</title>
${parts.join("\n")}
</svg>
`);

console.log(`Wrote ${ICONS.length} icon SVGs + journey-strip.svg to assets/journey-icons/`);

// ---- raster fallbacks ------------------------------------------------------
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(CHROME)) {
  console.log("PNGs skipped — no Chrome at " + CHROME + " to rasterise with.");
  process.exit(0);
}

fs.mkdirSync(PNG_DIR, { recursive: true });
const shots = [...ICONS.map(ic => [`${ic.id}.svg`, `${ic.id}.png`, SIZE, SIZE]),
  ["journey-strip.svg", "journey-strip.png", stripW * 2, stripH * 2]];

for (const [src, out, w, h] of shots) {
  // Chrome screenshots the viewport, so wrap the SVG at exactly the target size.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ji-"));
  const page = path.join(tmp, "page.html");
  fs.writeFileSync(page,
    `<style>html,body{margin:0;padding:0}img{display:block;width:${w}px;height:${h}px}</style>` +
    `<img src="file://${path.join(DIR, src)}">`);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--hide-scrollbars",
    "--default-background-color=00000000",
    `--window-size=${w},${h}`,
    `--screenshot=${path.join(PNG_DIR, out)}`,
    `file://${page}`
  ], { stdio: "ignore" });
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(`Wrote ${shots.length} PNGs to assets/journey-icons/png/`);
