#!/usr/bin/env node
// DAV (Viet Nam) register pull — searches the Drug Administration of Viet
// Nam's public register of marketing authorisations for each portfolio
// ingredient family, and stages the portfolio rows:
//   node scripts/fetch-dav.js
//
// Endpoint: POST dichvucong.dav.gov.vn/api/services/app/soDangKy/
// GetAllPublicServerPaging with a JSON body { filterText, skipCount,
// maxResultCount, ... }. filterText matches names and active ingredients.
// Vietnamese spellings drop the final "e" ("Pyronaridin", "Piperaquin"), so
// the search terms are the stems and register-lib.js's matcher accepts both.
//
// Status: the register flags each number isHetHan (expired) or not. Several
// older numbers carry no expiry date at all; they are staged as "valid"
// exactly as the register reports them.
//
// Outputs: sourcing/raw/dav/<date>.json, sourcing/staging/dav_registrations.csv,
// sourcing/reports/dav-watch-<date>.md. Only ever writes under sourcing/.

const lib = require("./register-lib");

const URL_ = "https://dichvucong.dav.gov.vn/api/services/app/soDangKy/GetAllPublicServerPaging";
const PAGE_URL = "https://dichvucong.dav.gov.vn/congbothuoc/index";
const TERMS = ["pyronaridin", "piperaquin", "ganaplacid", "amodiaquin", "Pyramax", "Eurartesim"];
const PAGE = 50;

async function search(term) {
  const items = [];
  let skip = 0, total = Infinity;
  while (skip < total) {
    const body = await lib.request(URL_, {
      method: "POST",
      body: JSON.stringify({ filterText: term, SoDangKyThuoc: {}, KichHoat: true, skipCount: skip, maxResultCount: PAGE, sorting: null }),
      headers: { "content-type": "application/json" },
      label: `DAV search "${term}"`,
    });
    total = body.result?.totalCount ?? 0;
    items.push(...(body.result?.items || []));
    skip += PAGE;
  }
  return items;
}

function toRows(snapshot) {
  return snapshot.records.map(r => {
    const basic = r.thongTinThuocCoBan || {};
    const reg = r.thongTinDangKyThuoc || {};
    return {
      productId: lib.mapProductId(`${r.tenThuoc} ${basic.hoatChatChinh}`),
      iso3: "VNM",
      registrationNo: lib.clean(r.soDangKy),
      brandName: lib.clean(r.tenThuoc),
      ingredients: lib.clean(basic.hoatChatChinh),
      form: lib.clean(basic.dangBaoChe),
      strength: lib.clean(basic.hamLuong),
      holder: lib.clean(r.congTyDangKy?.tenCongTyDangKy),
      manufacturer: lib.clean(r.congTySanXuat?.tenCongTySanXuat),
      issueDate: lib.isoDate(reg.ngayCapSoDangKy),
      expiryDate: lib.isoDate(reg.ngayHetHanSoDangKy),
      status: r.isHetHan ? "expired" : "valid",
      sourceUrl: PAGE_URL,
      retrievedDate: snapshot.retrieved,
    };
  }).filter(r => r.productId);
}

lib.run(async () => {
  const byId = new Map();
  for (const term of TERMS) {
    const items = await search(term); // sequential: be polite to the register
    items.forEach(i => byId.set(i.id ?? `${i.soDangKy}|${i.tenThuoc}`, i));
    console.log(`  "${term}": ${items.length}`);
  }
  const records = [...byId.values()].sort((a, b) => String(a.soDangKy).localeCompare(String(b.soDangKy)));
  console.log(`DAV register: ${records.length} distinct records across ${TERMS.length} searches`);

  lib.writeOutputs({
    source: "dav",
    title: "DAV watch",
    sourceLine: "DAV public register of marketing authorisations (Viet Nam), dichvucong.dav.gov.vn.",
    snapshot: { retrieved: lib.today, source: URL_, terms: TERMS, records },
    toRows,
  });
});
