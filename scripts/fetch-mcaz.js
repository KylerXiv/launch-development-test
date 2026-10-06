#!/usr/bin/env node
// MCAZ (Zimbabwe) register pull — downloads the Medicines Control Authority
// of Zimbabwe's online register of human medicines in one call, keeps the
// portfolio-relevant records, and stages them:
//   node scripts/fetch-mcaz.js
//
// Endpoint: POST onlineservices.mcaz.co.zw/onlineregister/Medicines/
// GetMedicinesByCategory?category=1 (the register page's Kendo grid). An
// empty form body returns the whole register (3,152 medicines on 1 Oct 2026);
// MCAZ says the register is updated daily.
//
// Outputs: sourcing/raw/mcaz/<date>.json, sourcing/staging/mcaz_registrations.csv,
// sourcing/reports/mcaz-watch-<date>.md. Only ever writes under sourcing/.

const lib = require("./register-lib");

const URL_ = "https://onlineservices.mcaz.co.zw/onlineregister/Medicines/GetMedicinesByCategory?category=1";
const PAGE = "https://onlineservices.mcaz.co.zw/onlineregister/";

function toRows(snapshot) {
  return snapshot.records.map(r => ({
    productId: lib.mapProductId(`${r.Trade_Name} ${r.Generic_Name}`),
    iso3: "ZWE",
    registrationNo: lib.clean(r.Registration_No),
    brandName: lib.clean(r.Trade_Name),
    ingredients: lib.clean(r.Generic_Name),
    form: lib.clean(r.Forms),
    strength: lib.clean(r.Strength),
    holder: lib.clean(r.ApplicantName),
    manufacturer: lib.clean(r.Manufacturers).replace(/[;\s]+$/, ""),
    issueDate: lib.isoDate(r.Date_Registered),
    expiryDate: lib.isoDate(r.Expiry_Date),
    // The register lists current registrations only; expiry is the signal.
    status: r.Expiry_Date && lib.isoDate(r.Expiry_Date) < snapshot.retrieved ? "expired" : "registered",
    sourceUrl: PAGE,
    retrievedDate: snapshot.retrieved,
  })).filter(r => r.productId);
}

lib.run(async () => {
  const body = await lib.request(URL_, {
    method: "POST",
    body: "",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    label: "MCAZ register",
    timeout: 180000,
  });
  const all = body.Data || [];
  if (all.length < 1000) throw new Error(`MCAZ returned ${all.length} medicines; expected over 3,000. Not writing anything.`);

  const records = all.filter(r => lib.FAMILY.test(`${r.Trade_Name} ${r.Generic_Name}`))
    .sort((a, b) => String(a.Registration_No).localeCompare(String(b.Registration_No)));
  console.log(`MCAZ register: ${all.length} medicines, ${records.length} in a portfolio ingredient family`);

  lib.writeOutputs({
    source: "mcaz",
    title: "MCAZ watch",
    sourceLine: "MCAZ online register of medicines (Zimbabwe), onlineservices.mcaz.co.zw.",
    snapshot: { retrieved: lib.today, source: URL_, registerSize: all.length, records },
    toRows,
  });
});
