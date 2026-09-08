#!/usr/bin/env node
// One-off generator for data/world-map-geo.js (committed output; rerun only to
// change the country set or basemap resolution).
//
// This is a SIBLING to build-map.js, not a replacement for it: data/world-map.js
// is loaded by 12 pages and stays on its 110m SVG-path shape. This script exists
// because illustrated-journey-dashboard.html alone moved its map rendering to
// MapLibre GL JS (DEV-13 D18, superseding D13's no-mapping-library decision) and
// MapLibre needs real GeoJSON geometry, not SVG path strings.
//
// Dev-only dependencies — install anywhere and point NODE_PATH at it:
//   npm i topojson-client world-atlas antimeridian-ts i18n-iso-countries
//   node scripts/build-map-geo.js [path-to-node_modules]
//
// Output: data/world-map-geo.js -> window.LAUNCH_MAP_GEO = GeoJSON FeatureCollection,
// one feature per country/territory, properties = { iso3, name }.
// Uses Natural Earth 50m (public domain) via the world-atlas package — one
// resolution step up from build-map.js's 110m, chosen because a page-specific
// basemap can carry more detail without the 12-page blast radius a change to
// data/world-map.js would have (see dev-13-resistance-handover.md D17).
//
// Country set: EVERY country/territory world-atlas's topology can resolve to an
// ISO 3166-1 alpha-3 code (via i18n-iso-countries' numeric->alpha3 table) — this
// reverses D17's original "identical to build-map.js's NUM_TO_A3, not a
// superset" choice, specifically and only for this file (see the later
// decision recorded in dev-13-resistance-handover.md — the Location filter's
// "Region" picker needs every WHO region to actually have country shapes to
// show, including regions like Europe with no WHO malaria-resistance tracking
// at all, the same way WHO's own threat map always draws the full world and
// greys out whatever has no data). data/world-map.js (94 countries) is
// UNCHANGED and stays the sole authority for "which countries count as
// drawn" (sitesFor, drawnCount, the legend counts, the validator's
// undrawn-country warning) — this expansion only ever supplies extra
// geometry for countries the rest of the page paints as "no data" by default,
// never data itself.
// A handful of topology entries have no numeric ISO code at all (disputed or
// unrecognised: Kosovo, Somaliland, Northern Cyprus, Siachen Glacier, the
// Indian Ocean Territory) and are skipped — Natural Earth carries them as
// separate shapes without an ISO 3166 assignment, so there is no iso3 to key
// them on.
//
// Antimeridian cut: Natural Earth stores Russia (and a few others — the USA
// via the Aleutians, New Zealand, Fiji, Kiribati) as a single ring that
// crosses ±180° longitude rather than as a MultiPolygon split there. Left
// alone, a WebGL renderer triangulates that ring as if it wrapped the SHORT
// way through 0°, producing a giant invalid sliver across the whole map (D28
// found this after D27 widened the basemap to the whole world — Russia was
// never part of the 100-country set D27 started from, so the bug had no
// chance to surface before). `fixGeoJson` (from `antimeridian-ts`) runs per
// feature, after `topojson.feature` extracts it, splitting every
// antimeridian-crossing ring into proper MultiPolygon pieces. Tried first:
// `geoStitch` (from `d3-geo-projection`), which operates on the raw topology
// before extraction — it fixed the USA, New Zealand, Fiji and Kiribati
// completely, but left Russia's *mainland* ring (not a small island — 4,894
// points, the bulk of the country) still wrapping, because the one arc where
// it crosses near Chukotka isn't shared with a neighbouring country and
// geoStitch's arc-based approach missed it. `antimeridian-ts` fixes every one
// of these (Russia included) with 0 wide (>170°) polygon parts remaining
// across all 236 countries — the only exception is Antarctica, which
// genuinely does span every longitude at the pole: a landmass encircling a
// pole has no valid "inside" boundary once flattened to a simple lon/lat
// polygon, antimeridian cutting or not. Explicitly dropped below rather than
// left broken — it was never a WHO region member or reachable data-wise, and
// D30's wider maxBounds (down to -85°, up from -55°, so 1x is actually
// reachable) means it's no longer off in unreachable space either; it would
// render as an invalid shape the first time anyone panned that far south.

const path = require("path");
const fs = require("fs");

const extra = process.argv[2];
if (extra) module.paths.unshift(path.resolve(extra));

const topojson = require("topojson-client");
const { fixGeoJson } = require("antimeridian-ts");
const world = require(require.resolve("world-atlas/countries-50m.json"));
const isoCountries = require("i18n-iso-countries");

// Coordinate precision: round to 3 decimal places (~110m at the equator, well
// under a single screen pixel at any zoom this map reaches) to keep file size
// down without visibly changing the geometry MapLibre renders.
function roundCoords(node) {
  if (typeof node[0] === "number") {
    node[0] = Math.round(node[0] * 1000) / 1000;
    node[1] = Math.round(node[1] * 1000) / 1000;
    return node;
  }
  for (const child of node) roundCoords(child);
  return node;
}

const feats = topojson.feature(world, world.objects.countries).features;
const out = [];
let skipped = 0;
for (const f of feats) {
  if (f.id == null) { skipped++; continue; }
  const a3 = isoCountries.numericToAlpha3(String(f.id).padStart(3, "0"));
  if (!a3) { skipped++; continue; }
  if (a3 === "ATA") { skipped++; continue; }   // pole-wrapping geometry, see comment above
  const fixed = fixGeoJson(f);
  out.push({
    type: "Feature",
    properties: { iso3: a3, name: f.properties.name },
    geometry: { type: fixed.geometry.type, coordinates: roundCoords(fixed.geometry.coordinates) },
  });
}

const geo = { type: "FeatureCollection", features: out };
const file =
  "// GENERATED by scripts/build-map-geo.js from world-atlas (Natural Earth 50m, public domain).\n" +
  "// Do not edit by hand; rerun the generator instead.\n" +
  "window.LAUNCH_MAP_GEO = " +
  JSON.stringify(geo) + ";\n";

fs.writeFileSync(path.join(__dirname, "..", "data", "world-map-geo.js"), file);
console.log("Wrote data/world-map-geo.js — " + out.length + " countries (" + skipped + " unresolvable shapes skipped), " + Math.round(file.length / 1024) + " KB");
