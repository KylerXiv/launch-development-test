#!/usr/bin/env node
// ZAMRA (Zambia) register pull — downloads the Zambia Medicines Regulatory
// Authority's public register of human medicines in one call, keeps the
// portfolio-relevant records, and stages them:
//   node scripts/fetch-zamra.js
//
// Endpoint: the same IMIS public-access backend TMDA runs
// (scripts/fetch-tmda.js), on ZAMRA's own host and port:
//   publicaccess/onSearchPublicRegisteredproducts?skip&take&section_id=2&extra_paramsdata={}
// With no filter it returns the whole register (3,665 medicines, ~12 MB, on
// 1 Oct 2026), so the snapshot keeps only records whose names mention a
// portfolio ingredient family — the rest would add 12 MB a month for nothing.
// Its totalCount over-reports: 3,665 against 3,511 rows actually returned on
// 1 Oct 2026, and paging in 500s gives the same 3,511 distinct registrations,
// so one call with take=20000 is the whole register.
//
// Outputs: sourcing/raw/zamra/<date>.json, sourcing/staging/zamra_registrations.csv,
// sourcing/reports/zamra-watch-<date>.md. Only ever writes under sourcing/.

const lib = require("./register-lib");

const BASE = "https://app.zamra.co.zm:42882/portal/publicaccess/onSearchPublicRegisteredproducts";
const PAGE = 20000;
// ZAMRA's server sends its own certificate without DigiCert's intermediate,
// so Node cannot build the chain ("unable to verify the first certificate";
// browsers and Windows fetch the missing link themselves). The public
// intermediate is kept in scripts/certs/ and added to Node's roots for this
// host only. Checked 1 Oct 2026: issued by DigiCert Global Root G2, valid to
// 29 Mar 2031. If ZAMRA fixes its chain this still works unchanged.
const CA = "digicert-global-g2-tls-rsa-sha256-2020-ca1.pem";

function toRows(snapshot) {
  return snapshot.records.map(r => ({
    productId: lib.mapProductId(`${r.brand_name} ${r.generic_name} ${r.active_ingredient}`),
    iso3: "ZMB",
    registrationNo: lib.clean(r.certificate_no),
    brandName: lib.clean(r.brand_name),
    ingredients: lib.clean(r.generic_name || r.active_ingredient),
    form: lib.clean(r.dosage_form),
    strength: lib.clean(r.product_strength),
    holder: lib.clean(r.registrant).replace(/\+$/, ""),
    manufacturer: lib.clean(r.manufacturer),
    issueDate: lib.isoDate(r.certificate_issue_date),
    expiryDate: lib.isoDate(r.app_expiry_Date),
    status: lib.clean(r.registration_status || r.validity_status),
    sourceUrl: `${BASE}?section_id=2`,
    retrievedDate: snapshot.retrieved,
  })).filter(r => r.productId);
}

lib.run(async () => {
  const all = [];
  let skip = 0, total = Infinity;
  while (skip < total) {
    const q = new URLSearchParams({ skip: String(skip), take: String(PAGE), section_id: "2", extra_paramsdata: "{}" });
    const body = await lib.request(`${BASE}?${q}`, { label: "ZAMRA register", timeout: 180000, ca: CA });
    total = body.totalCount ?? 0;
    all.push(...(body.data || []));
    skip += PAGE;
  }
  if (all.length < 1000) throw new Error(`ZAMRA returned ${all.length} medicines; expected over 3,000. Not writing anything.`);

  const records = all.filter(r => lib.FAMILY.test(`${r.brand_name} ${r.generic_name} ${r.active_ingredient}`))
    .sort((a, b) => String(a.certificate_no).localeCompare(String(b.certificate_no)));
  console.log(`ZAMRA register: ${all.length} medicines, ${records.length} in a portfolio ingredient family`);

  lib.writeOutputs({
    source: "zamra",
    title: "ZAMRA watch",
    sourceLine: "ZAMRA public register of human medicines (Zambia), app.zamra.co.zm.",
    snapshot: { retrieved: lib.today, source: BASE, registerSize: all.length, records },
    toRows,
  });
});
