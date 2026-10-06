#!/usr/bin/env node
// Rwanda FDA register pull — downloads the Rwanda Food and Drugs Authority's
// register of human medicines in one call, keeps the portfolio-relevant
// records, and stages them:
//   node scripts/fetch-rwanda.js
//
// Endpoint: monitoring.rwandafda.gov.rw/register/hmdr/ — one HTML page with
// the whole register (2,619 medicines, 7.4 MB, about 10 s on 5 Oct 2026). It
// replaced rwandafda.gov.rw/register/monitoring_preview_register, which now
// returns 404. Every row is a <tr class="hm-reg-row"> carrying its fields as
// data attributes (data-regno, data-brand, data-generic, data-strength,
// data-form, data-mah, data-mfr, data-regdate, data-expirydate, and
// data-expiry = "valid" | "expired"), so no table scraping is needed. Dates
// are DD/MM/YYYY.
//
// Outputs: sourcing/raw/rwanda/<date>.json, sourcing/staging/rwanda_registrations.csv,
// sourcing/reports/rwanda-watch-<date>.md. Only ever writes under sourcing/.

const lib = require("./register-lib");

const PAGE = "https://monitoring.rwandafda.gov.rw/register/hmdr/";

const decode = s => String(s || "")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

// "12/05/2025" → "2025-05-12"; anything else passes through untouched.
function dmy(v) {
  const m = String(v || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : lib.clean(v);
}

// One object per register row: { regno, brand, generic, ... } from its data-* attributes.
function parseRows(html) {
  const rows = [];
  for (const m of html.matchAll(/<tr\s+class="hm-reg-row[^"]*"([\s\S]*?)>/g)) {
    const r = {};
    for (const a of m[1].matchAll(/data-([a-z-]+)="([^"]*)"/g)) r[a[1]] = decode(a[2]);
    rows.push(r);
  }
  return rows;
}

function toRows(snapshot) {
  return snapshot.records.map(r => ({
    productId: lib.mapProductId(`${r.brand} ${r.generic}`),
    iso3: "RWA",
    registrationNo: lib.clean(r.regno),
    brandName: lib.clean(r.brand),
    ingredients: lib.clean(r.generic),
    form: lib.clean(r.form),
    strength: lib.clean(r.strength),
    holder: lib.clean(r.mah),
    manufacturer: lib.clean(r.mfr),
    issueDate: dmy(r.regdate),
    expiryDate: dmy(r.expirydate),
    status: lib.clean(r.expiry),
    sourceUrl: PAGE,
    retrievedDate: snapshot.retrieved,
  })).filter(r => r.productId);
}

async function getHtml(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": lib.UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(300000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if (attempt >= 2) throw new Error(`Rwanda FDA register failed twice (${url}): ${e.cause?.code || e.message || e}`);
    return getHtml(url, attempt + 1);
  }
}

lib.run(async () => {
  const all = parseRows(await getHtml(PAGE));
  if (all.length < 1000) throw new Error(`Rwanda FDA register returned ${all.length} medicines; expected over 2,000. Not writing anything.`);

  const records = all.filter(r => lib.FAMILY.test(`${r.brand} ${r.generic}`))
    .map(({ search, ...r }) => r) // data-search repeats the other fields in lower case
    .sort((a, b) => String(a.regno).localeCompare(String(b.regno)));
  console.log(`Rwanda FDA register: ${all.length} medicines, ${records.length} in a portfolio ingredient family`);

  lib.writeOutputs({
    source: "rwanda",
    title: "Rwanda FDA watch",
    sourceLine: "Rwanda FDA register of human medicines, monitoring.rwandafda.gov.rw/register/hmdr/.",
    snapshot: { retrieved: lib.today, source: PAGE, registerSize: all.length, records },
    toRows,
  });
});
