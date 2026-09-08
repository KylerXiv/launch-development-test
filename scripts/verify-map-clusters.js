#!/usr/bin/env node
// Re-measures the clustering invariants D15 originally proved for the SVG
// renderer, against the MapLibre renderer that superseded it (DEV-13 D17-D21).
// D15's numbers do not transfer across the equirectangular->Mercator
// projection change (D20) -- this script is what re-proves the *invariant*
// (same-country overlap = 0) rather than assuming it, across every populated
// drug x species cell, not just one worked example.
//
// Dev-only dependency -- install anywhere and point NODE_PATH at it:
//   npm i puppeteer
//   node scripts/verify-map-clusters.js [path-to-node_modules]
//
// Drives the real page in a headless browser: sets each drug/species pair via
// window.__DEV13_MAP__.setDrugSpecies() (test-only hook, see
// illustrated-journey-dashboard.html) rather than the real Drug picker --
// D24 restricted that picker to the 4 tracked products, but D5 still ships
// all 26 drugs' data, and this sweep exists to verify the CLUSTERING
// ALGORITHM against everything RES.studies carries, independent of what any
// given day's UI happens to expose. Zooms the real map via the same hook, and
// reads the ACTUAL rendered .res-dot marker positions/sizes from the DOM --
// not a reimplementation of the clustering math, so there is nothing here to
// drift out of sync with what a reader actually sees.
//
// Exit code is 0 only if every same-country pair, at every tested zoom, in
// every populated cell, has zero overlap. Cross-border overlaps are counted
// and reported (D15 established these are expected and shrink with zoom, not
// a defect), not treated as failures.

const path = require("path");

const extra = process.argv[2];
if (extra) module.paths.unshift(path.resolve(extra));

const puppeteer = require("puppeteer");

const PAGE_URL = "file:///" + path.resolve(__dirname, "..", "illustrated-journey-dashboard.html").replace(/\\/g, "/");
// A spread from world view to a heavily zoomed-in view, matching D15's
// original 1x/2.6x/4.1x/6.6x/8x spirit -- MapLibre's zoom is log2 scale
// (2^zoom), so these roughly correspond to 1x/2.6x/4x/6.5x/8x/16x/23x/32x/45x/64x.
// Extended past 4.0 (16x) per D29, when ZMAX went from 16 to 64 -- the whole
// point of re-running this script on a zoom-range change is to cover the new
// range, not just the old one.
const ZOOMS = [0, 1.4, 2.0, 2.7, 3.0, 4.0, 4.5, 5.0, 5.5, 6.0];

async function readMarks(page) {
  return page.evaluate(() => {
    const els = [...document.querySelectorAll(".res-dot")];
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      return { iso3: el.dataset.iso3, cx: r.left + r.width / 2, cy: r.top + r.height / 2, radius: r.width / 2 };
    });
  });
}

function countOverlaps(marks) {
  let sameCountry = 0, crossBorder = 0;
  const sameCountryPairs = [];
  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      const a = marks[i], b = marks[j];
      const dx = a.cx - b.cx, dy = a.cy - b.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.radius + b.radius) {
        if (a.iso3 === b.iso3) { sameCountry++; sameCountryPairs.push([a, b, dist]); }
        else crossBorder++;
      }
    }
  }
  return { sameCountry, crossBorder, sameCountryPairs };
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 30000 });
  await page.waitForFunction("window.__DEV13_MAP__ && window.__DEV13_MAP__.getMap().isStyleLoaded()", { timeout: 15000 });

  // Populated (drug, species) cells -- same traversal allDrugs/speciesFor use
  // internally, done here against the plain data global so the test doesn't
  // need access to the page's own closures.
  const cells = await page.evaluate(() => {
    const RES = window.LAUNCH_RESISTANCE;
    const layer = RES.treatmentFailure || {};
    const out = [];
    for (const drug of Object.keys(layer)) {
      for (const species of Object.keys(layer[drug])) {
        if (Object.keys(layer[drug][species]).length > 0) out.push([drug, species]);
      }
    }
    return out;
  });

  console.log(`${cells.length} populated drug×species cells; ${ZOOMS.length} zoom levels each = ${cells.length * ZOOMS.length} checks.\n`);

  let worstSameCountry = { n: 0 };
  let totalSameCountryFailures = 0;
  const crossBorderByZoom = {};

  for (const [drug, species] of cells) {
    await page.evaluate((drug, species) => window.__DEV13_MAP__.setDrugSpecies(drug, species), drug, species);

    for (const z of ZOOMS) {
      await page.evaluate((z) => window.__DEV13_MAP__.getMap().setZoom(z), z);
      await page.evaluate(() => new Promise((resolve) => {
        const m = window.__DEV13_MAP__.getMap();
        if (!m.isMoving() && !m.isZooming()) return resolve();
        m.once("idle", resolve);
      }));
      await new Promise((r) => setTimeout(r, 30));   // let drawMarks()'s DOM writes settle

      const marks = await readMarks(page);
      const { sameCountry, crossBorder, sameCountryPairs } = countOverlaps(marks);
      if (sameCountry > 0) {
        totalSameCountryFailures++;
        if (sameCountry > worstSameCountry.n) worstSameCountry = { n: sameCountry, drug, species, z, pairs: sameCountryPairs };
      }
      crossBorderByZoom[z] = (crossBorderByZoom[z] || 0) + crossBorder;
    }
  }

  console.log("Cross-border overlapping pairs, summed across all cells, by zoom:");
  for (const z of ZOOMS) console.log(`  zoom ${z} (~${Math.pow(2, z).toFixed(1)}x): ${crossBorderByZoom[z]}`);
  console.log();

  if (consoleErrors.length) {
    console.log("Page errors encountered during the run:");
    consoleErrors.forEach((e) => console.log("  " + e));
    console.log();
  }

  if (totalSameCountryFailures > 0) {
    console.log(`FAIL: same-country overlap found in ${totalSameCountryFailures} of ${cells.length * ZOOMS.length} (cell, zoom) checks.`);
    console.log(`Worst: ${worstSameCountry.n} pair(s) at ${worstSameCountry.drug} / ${worstSameCountry.species}, zoom ${worstSameCountry.z}.`);
    await browser.close();
    process.exit(1);
  }

  console.log(`PASS: 0 same-country overlaps across ${cells.length} cells × ${ZOOMS.length} zoom levels (${cells.length * ZOOMS.length} checks).`);
  await browser.close();
})().catch((e) => { console.error("verify-map-clusters.js failed:", e); process.exit(1); });
