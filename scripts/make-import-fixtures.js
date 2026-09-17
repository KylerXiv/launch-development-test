#!/usr/bin/env node
// Generates the import test fixtures in test-data/import/.
//
// Written as a generator rather than 18 hand-made files so the set can be
// regenerated and extended, and so the large ones do not have to live in the
// repository as hand-typed text.
//
//   node scripts/make-import-fixtures.js

const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "..", "test-data", "import");
fs.mkdirSync(OUT, { recursive: true });

const write = (name, text) => {
  fs.writeFileSync(path.join(OUT, name), text, "utf8");
  console.log("  " + name.padEnd(34) + (text.length / 1024).toFixed(1) + " KB");
};

const MAKERS = ["Novartis", "Fosun Pharma", "Shin Poong Pharmaceutical", "Cipla", "Ipca Laboratories",
                "Guilin Pharmaceutical", "Sanofi", "Ajanta Pharma", "Strides", "Macleods"];
const STEMS = ["artem", "lumefan", "pyronar", "ferroquin", "ganaplac", "cipargam", "tafenoq", "piperaq"];
const SUFFIX = ["ine", "idine", "amine", "oquine", "antrine", "azine"];

function fakeName(i) {
  return STEMS[i % STEMS.length].replace(/^./, c => c.toUpperCase()) +
         SUFFIX[(i * 3) % SUFFIX.length] + " " + (100 + (i % 900));
}

// ---------------------------------------------------------------- small, clean
write("01-clean-small.csv",
`name,inn,manufacturer,short description,countries registered,in guidelines
Coartem Dispersible,artemether-lumefantrine,Novartis,Market · paediatric ACT,42,18
Pyramax Granules,pyronaridine-artesunate,Shin Poong Pharmaceutical,Market · paediatric,25,3
KAF156 Combination,ganaplacide-lumefantrine,Novartis,Pipeline · new chemical class,0,0
`);

// ---------------------------------------------------------------- messy headers
write("02-messy-headers.csv",
`  PRODUCT_NAME  ,Maker,Generic  Name,No. of Registrations,MFT,Reviewer Initials
Coartem Dispersible,Novartis,artemether-lumefantrine,42,12,KM
Pyramax Granules,Shin Poong,pyronaridine-artesunate,25,2,AB
`);

// ---------------------------------------------------------------- updates to real rows
write("03-updates-existing.csv",
`id,name,countries registered,in guidelines,price
pyramax,ASPY,31,5,US$1.10
dhappq,DHA–PPQ,58,22,US$0.95
ganlum,GanLum,0,0,TBC
`);

// ---------------------------------------------------------------- european export
write("04-semicolon-european.csv",
`Name;Manufacturer;Registrations;Price;Price date
Coartem Dispersible;Novartis;1.250;"US$ 1,20";14/03/2026
Pyramax Granules;Shin Poong;25;"US$ 0,95";03/04/2026
Artesun IV;Guilin Pharmaceutical;98;"US$ 2,40";25/12/2025
`);

// ---------------------------------------------------------------- junk above headers, tabs
write("05-tabs-with-junk.tsv",
`MALARIA PORTFOLIO EXPORT
Generated 17 September 2026 by the data team
CONFIDENTIAL — internal use

name\tmanufacturer\tcountries registered
Coartem Dispersible\tNovartis\t42
Pyramax Granules\tShin Poong Pharmaceutical\t25
`);

// ---------------------------------------------------------------- quoting
write("06-quoted-nightmare.csv",
`name,access barrier,manufacturer
"Coartem, Dispersible","Registered in 42 countries, but guideline inclusion lags",Novartis
"Pyramax Granules","The manufacturer said ""we are awaiting WHO PQ"" in March",Shin Poong
"Artesun IV","Supply is constrained.
A second line explains why.",Guilin Pharmaceutical
`);

// ---------------------------------------------------------------- ragged / duplicated / blank
write("07-ragged-and-blank.csv",
`name,manufacturer,name,countries registered

Coartem Dispersible,Novartis,dupe-value,42,EXTRA,MORE

Pyramax Granules,Shin Poong
,,,

Artesun IV,Guilin,x,98
`);

// ---------------------------------------------------------------- statuses
write("08-statuses-every-way.csv",
`name,R&D & clinical,Regulatory approval (SRA),WHO recommendation,WHO PQ listing,Country registration,National policy adoption,Procurement,In-country delivery
Coartem Dispersible,Complete,DONE,Approved,Listed,In Progress,ongoing,Not started,
Pyramax Granules,finished,Under review,Submitted,Delayed,blocked,at risk,n/a,-
Artesun IV,Complete (Feb 2024),in progress - awaiting GDG,STALLED,overdue,yes,no,banana,Not yet
`);

// ---------------------------------------------------------------- dates
write("09-dates-every-way.csv",
`name,price,price as of
Coartem Dispersible,US$1.20,2026-03-14
Pyramax Granules,US$0.95,14 March 2026
Artesun IV,US$2.40,March 14 2026
Fansidar,US$0.30,14/03/2026
Malarone,US$3.10,03/25/2026
Riamet,US$1.90,03/04/2026
Duo-Cotecxin,US$1.40,46095
Arterakine,US$1.10,25/03/26
Winthrop AS-AQ,US$0.85,sometime next spring
`);

// ---------------------------------------------------------------- stage notes
write("10-stages-and-notes.csv",
`name,Country registration,Country registration note,Procurement,Procurement note
ASPY,Complete,"Registered in 25+ endemic countries since 2014",In Progress,"Global Fund procurement 2018-2025"
DHA–PPQ,Complete,"Widely registered across Africa and Asia",Complete,"11.5m packs 2008-2026"
`);

// ---------------------------------------------------------------- JSON
write("11-products.json", JSON.stringify([
  { name: "Coartem Dispersible", inn: "artemether-lumefantrine", manufacturer: "Novartis",
    detail: { price: { value: "US$1.20", confirmedInWriting: true }, country: { registered: 42 } } },
  { name: "Pyramax Granules", inn: "pyronaridine-artesunate", manufacturer: "Shin Poong Pharmaceutical",
    detail: { price: { value: "US$0.95", confirmedInWriting: false }, country: { registered: 25 } } }
], null, 2) + "\n");

write("12-launch-contract.js",
`window.LAUNCH_DATA = ${JSON.stringify({
  meta: { lastUpdated: "2026-09-17", dataStatus: "draft" },
  products: [
    { id: "coartem-d", name: "Coartem Dispersible", inn: "artemether-lumefantrine", manufacturer: "Novartis" },
    { id: "artesun-iv", name: "Artesun IV", inn: "artesunate", manufacturer: "Guilin Pharmaceutical" }
  ]
}, null, 2)}
`);

write("13-lines.ndjson",
  [{ name: "Fansidar", manufacturer: "Roche" },
   { name: "Malarone", manufacturer: "GSK" },
   { name: "Riamet", manufacturer: "Novartis" }]
    .map(o => JSON.stringify(o)).join("\n") + "\n");

// ---------------------------------------------------------------- nothing usable
write("14-nothing-useful.csv",
`Reviewer,Meeting date,Agenda item,Minutes reference
KM,2026-03-04,Item 3,MIN-2026-03
AB,2026-04-11,Item 7,MIN-2026-04
`);

write("15-empty.csv", "");
write("16-headers-only.csv", "name,manufacturer,countries registered\n");

// ---------------------------------------------------------------- volume
const mid = ["name,manufacturer,inn,countries registered,in guidelines,price,R&D & clinical,Regulatory approval (SRA)"];
for (let i = 0; i < 500; i++) {
  mid.push([
    fakeName(i),
    MAKERS[i % MAKERS.length],
    STEMS[i % STEMS.length] + "-" + SUFFIX[(i * 5) % SUFFIX.length],
    i % 190,
    i % 60,
    "US$" + (0.5 + (i % 40) / 10).toFixed(2),
    ["Complete", "In progress", "Not started", "Delayed"][i % 4],
    ["Complete", "Submitted", "Not started", "at risk"][(i + 1) % 4]
  ].join(","));
}
write("17-large-500.csv", mid.join("\n") + "\n");

const big = ["name,manufacturer,inn,countries registered,in guidelines,price"];
for (let i = 0; i < 5000; i++) {
  big.push([fakeName(i), MAKERS[i % MAKERS.length],
            STEMS[i % STEMS.length] + "-" + i,
            i % 190, i % 60, "US$" + (0.4 + (i % 70) / 10).toFixed(2)].join(","));
}
write("18-large-5000.csv", big.join("\n") + "\n");

// ---------------------------------------------------------------- everything at once
write("19-mixed-mess.csv",
`﻿PORTFOLIO REVIEW — DRAFT, DO NOT CIRCULATE

 PRODUCT_NAME ;Maker;No. of Registrations;MFT;Price;Price Date;R&D & clinical;Notes
Coartem Dispersible;Novartis;1.250;12;"US$ 1,20";14/03/2026;Complete;"Registered widely, incl. ""paediatric"" forms"

Pyramax Granules;Shin Poong;25;TBC;US$0.95;03/04/2026;finished;
;;;;;;;
Artesun IV;Guilin;lots;2;n/a;sometime soon;banana;"Multi-line
note here"
ASPY;Shin Poong Pharmaceutical · MMV;31;;;;Complete;Existing row, should update
`);

console.log("\nFixtures written to test-data/import/");
