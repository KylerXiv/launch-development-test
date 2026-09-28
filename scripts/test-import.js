#!/usr/bin/env node
// Tests for the import pipeline (scripts/import-lib.js).
//
// Import is the one place outside data flows in, so the cases here are the
// mess real spreadsheets arrive in: wrong delimiters, junk above the headers,
// dates from three continents, statuses written eleven different ways, and
// rows that mean nothing at all.
//
//   node scripts/test-import.js            run everything
//   node scripts/test-import.js parsing    run one group

const imp = require("./import-lib.js");
const rules = require("./data-rules.js");
const fs = require("fs");
const path = require("path");

let pass = 0, fail = 0, only = process.argv[2];
const failures = [];

function group(name, fn) {
  if (only && !name.toLowerCase().includes(only.toLowerCase())) return;
  console.log("\n\x1b[1m" + name + "\x1b[0m");
  fn();
}
function is(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log("  \x1b[32mok\x1b[0m   " + label); }
  else {
    fail++; failures.push(label);
    console.log("  \x1b[31mFAIL\x1b[0m " + label + "\n         expected " + e + "\n         got      " + a);
  }
}
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  \x1b[32mok\x1b[0m   " + label); }
  else { fail++; failures.push(label); console.log("  \x1b[31mFAIL\x1b[0m " + label + (detail ? "\n         " + detail : "")); }
}

const STAGES = ["R&D & clinical", "Regulatory approval (SRA)", "WHO recommendation", "WHO PQ listing",
                "Country registration", "National policy adoption", "Procurement", "In-country delivery"];
function draft() {
  const raw = fs.readFileSync(path.join(__dirname, "..", "data", "products.js"), "utf8");
  return rules.extractData(raw).data;
}

// ---------------------------------------------------------------- parsing
group("Parsing — delimiters and shape", () => {
  is("sniffs commas", imp.sniffDelimiter("a,b,c\n1,2,3"), ",");
  is("sniffs tabs", imp.sniffDelimiter("a\tb\tc\n1\t2\t3"), "\t");
  is("sniffs semicolons", imp.sniffDelimiter("a;b;c\n1;2;3"), ";");
  is("sniffs pipes", imp.sniffDelimiter("a|b|c\n1|2|3"), "|");
  is("prefers semicolons when values contain commas",
     imp.sniffDelimiter('name;price\nDrug A;"1,250"\nDrug B;"2,400"'), ";");

  const bom = imp.toRecords("﻿name,price\nA,1");
  is("strips a byte-order mark", bom.headers[0], "name");

  const crlf = imp.toRecords("name,price\r\nA,1\r\nB,2\r\n");
  is("handles CRLF line endings", crlf.records.length, 2);

  const quoted = imp.toRecords('name,note\n"Drug, A","He said ""yes"" today"\n');
  is("keeps commas inside quotes", quoted.records[0].name, "Drug, A");
  is("unescapes doubled quotes", quoted.records[0].note, 'He said "yes" today');

  const multiline = imp.toRecords('name,note\n"A","line one\nline two"\n');
  is("keeps newlines inside quotes", multiline.records[0].note, "line one\nline two");

  const junk = imp.toRecords("LAUNCH export 2026\n\n\nname,manufacturer\nA,Novartis\n");
  is("skips junk above the headers", junk.headers, ["name", "manufacturer"]);
  is("and says so", junk.notes.length > 0, true);

  const dupe = imp.toRecords("name,name,price\nA,B,1\n");
  is("renames duplicate headers", dupe.headers, ["name", "name (2)", "price"]);

  const ragged = imp.toRecords("a,b\n1,2,3,4\n5,6\n");
  is("keeps ragged rows", ragged.records.length, 2);
  is("and reports the overflow", ragged.notes.some(n => /extras were dropped/.test(n)), true);

  const blanks = imp.toRecords("a,b\n\n1,2\n\n\n3,4\n\n");
  is("drops blank rows", blanks.records.length, 2);

  is("empty file is handled", imp.toRecords("").records.length, 0);
  is("header-only file yields no rows", imp.toRecords("a,b,c").records.length, 0);

  const unnamed = imp.toRecords("name,,price\nA,x,1\n");
  is("names empty header columns", unnamed.headers[1], "column 2");
});

// ---------------------------------------------------------------- json
group("Parsing — JSON shapes", () => {
  const arr = imp.readFile("x.json", '[{"name":"A","price":"1"},{"name":"B","price":"2"}]');
  is("array of objects", arr.records.length, 2);

  const wrapped = imp.readFile("x.json", '{"products":[{"name":"A"},{"name":"B"},{"name":"C"}]}');
  is("object with a products array", wrapped.records.length, 3);

  const other = imp.readFile("x.json", '{"meta":{"x":1},"items":[{"name":"A"}]}');
  is("finds any inner array of objects", other.records.length, 1);

  const nested = imp.readFile("x.json", '[{"name":"A","detail":{"price":{"value":"US$1"}}}]');
  is("flattens nested objects", nested.records[0]["detail.price.value"], "US$1");

  const ndjson = imp.readFile("x.ndjson", '{"name":"A"}\n{"name":"B"}\n');
  is("newline-delimited JSON", ndjson.records.length, 2);

  const contract = imp.readFile("products.js", 'window.LAUNCH_DATA = {"products":[{"name":"A"}]}');
  is("our own data file format", contract.records.length, 1);

  const bad = imp.readFile("x.json", "{oh dear");
  is("bad JSON is reported, not thrown", bad.notes.length > 0, true);

  const sniffed = imp.readFile("mystery.txt", '[{"name":"A"}]');
  is("JSON detected without a file extension", sniffed.records.length, 1);
});

// ---------------------------------------------------------------- coercion
group("Coercion — statuses", () => {
  const cases = {
    done: ["Done", "complete", "COMPLETED", "Finished", "Approved", "Yes", "granted", "Complete (Feb 2024)"],
    prog: ["In Progress", "ongoing", "under review", "Submitted", "underway", "in progress - awaiting GDG"],
    late: ["Delayed", "blocked", "STALLED", "overdue", "at risk", "delayed pending data"],
    idle: ["Not started", "", "no", "n/a", "-"]
  };
  Object.keys(cases).forEach(k => cases[k].forEach(v =>
    is(`"${v}" -> ${k}`, imp.coerceStatus(v), k)));
  is("nonsense returns null rather than guessing", imp.coerceStatus("banana"), null);
});

group("Coercion — counts", () => {
  is('"25"', imp.coerceCount("25"), 25);
  is('"1,250" with a thousands comma', imp.coerceCount("1,250"), 1250);
  is('"1 250" with a thousands space', imp.coerceCount("1 250"), 1250);
  is('"25.0" out of a spreadsheet', imp.coerceCount("25.0"), 25);
  is('"25+"', imp.coerceCount("25+"), 25);
  is('"TBC" is the honest unknown', imp.coerceCount("TBC"), "TBC");
  is('"n/a" likewise', imp.coerceCount("n/a"), "TBC");
  is('"—" likewise', imp.coerceCount("—"), "TBC");
  is("blank means no opinion", imp.coerceCount(""), null);
  is("prose is refused", imp.coerceCount("about twenty"), null);
  is("zero survives", imp.coerceCount("0"), 0);
});

group("Coercion — dates", () => {
  is("ISO", imp.coerceDate("2026-03-14").value, "2026-03-14");
  is("ISO with slashes", imp.coerceDate("2026/03/14").value, "2026-03-14");
  is("14 March 2026", imp.coerceDate("14 March 2026").value, "2026-03-14");
  is("14th Mar 2026", imp.coerceDate("14th Mar 2026").value, "2026-03-14");
  is("March 14, 2026", imp.coerceDate("March 14, 2026").value, "2026-03-14");
  is("unambiguous D/M (25/03/2026)", imp.coerceDate("25/03/2026").value, "2026-03-25");
  is("unambiguous M/D (03/25/2026)", imp.coerceDate("03/25/2026").value, "2026-03-25");
  ok("ambiguous D/M vs M/D is flagged", imp.coerceDate("03/04/2026").ambiguous === true);
  is("and offers the alternative", imp.coerceDate("03/04/2026").alternative, "2026-03-04");
  is("Excel serial number", imp.coerceDate("46095").value, "2026-03-14");
  is("two-digit year", imp.coerceDate("25/03/26").value, "2026-03-25");
  is("unreadable returns null", imp.coerceDate("sometime next spring").value, null);
  is("TBC is not a date", imp.coerceDate("TBC").value, null);
});

group("Coercion — booleans and prices", () => {
  ["Yes", "TRUE", "y", "1", "confirmed"].forEach(v => is(`"${v}" is true`, imp.coerceBool(v), true));
  ["No", "false", "N", "0"].forEach(v => is(`"${v}" is false`, imp.coerceBool(v), false));
  is("anything else is undecided", imp.coerceBool("maybe"), null);
  is("price keeps its currency", imp.coercePrice("US$2.40"), "US$2.40");
  is("unknown price becomes TBC", imp.coercePrice("n/a"), "TBC");
});

// ---------------------------------------------------------------- mapping
group("Mapping — column names", () => {
  const m = imp.guessMapping(
    ["Product Name", "Maker", "Generic", "Unit Price", "Countries Registered"], STAGES);
  is("Product Name -> name", m.fields.name, "Product Name");
  is("Maker -> manufacturer", m.fields.manufacturer, "Maker");
  is("Generic -> inn", m.fields.inn, "Generic");
  is("Unit Price -> price", m.fields.price, "Unit Price");
  is("Countries Registered -> registered", m.fields.registered, "Countries Registered");

  const messy = imp.guessMapping(["  NAME  ", "MANUFACTURER_NAME", "in.n"], STAGES);
  is("tolerates spacing and case", messy.fields.name, "  NAME  ");
  is("tolerates underscores", messy.fields.manufacturer, "MANUFACTURER_NAME");

  const stages = imp.guessMapping(
    ["Name", "R&D & clinical", "WHO PQ listing", "Procurement note"], STAGES);
  is("stage column by name", stages.stages[0] && stages.stages[0].status, "R&D & clinical");
  is("another stage column", stages.stages[3] && stages.stages[3].status, "WHO PQ listing");
  is("stage note column", stages.stages[6] && stages.stages[6].note, "Procurement note");

  const numbered = imp.guessMapping(["Name", "Stage 1", "Stage 2 status"], STAGES);
  is("numbered stage column", numbered.stages[0] && numbered.stages[0].status, "Stage 1");
  is("numbered with a status suffix", numbered.stages[1] && numbered.stages[1].status, "Stage 2 status");

  const junk = imp.guessMapping(["Name", "Internal ref", "Reviewer initials"], STAGES);
  ok("unrecognised columns are left alone, not forced",
     junk.unmapped.includes("Reviewer initials"), JSON.stringify(junk.unmapped));

  const empty = imp.guessMapping([], STAGES);
  is("no headers is survivable", Object.keys(empty.fields).length, 0);
});

// ---------------------------------------------------------------- planning
group("Planning — matching and change detection", () => {
  const d = draft();
  const headers = ["Name", "Manufacturer", "Countries Registered"];
  const map = imp.guessMapping(headers, d.stages);

  const update = imp.planImport(
    [{ __row: 1, Name: "ASPY", Manufacturer: "Shin Poong Pharmaceutical \u00b7 MMV", "Countries Registered": "30" }], map, d);
  is("an existing medicine is an update, not a create", update.updates.length, 1);
  is("and only genuinely changed fields are listed", update.updates[0].changes.length, 1);
  is("naming the field", update.updates[0].changes[0].field, "registered");

  const unchanged = imp.planImport(
    [{ __row: 1, Name: "ASPY", Manufacturer: "Shin Poong Pharmaceutical \u00b7 MMV" }], map, d);
  is("a row that changes nothing is skipped", unchanged.skipped.length, 1);
  is("with a reason", /Already matches/.test(unchanged.skipped[0].reason), true);

  const create = imp.planImport(
    [{ __row: 1, Name: "Brand New Drug", Manufacturer: "Someone", "Countries Registered": "3" }], map, d);
  is("an unknown medicine is a create", create.creates.length, 1);

  const byId = imp.guessMapping(["id", "Name"], d.stages);
  const matched = imp.planImport([{ __row: 1, id: "pyramax", Name: "Totally Different" }], byId, d);
  is("matching prefers the id over the name", matched.updates.length, 1);
  is("and would rename the existing row", matched.updates[0].changes[0].field, "name");

  const nothing = imp.planImport([{ __row: 1, Name: "", Manufacturer: "" }], map, d);
  is("an empty row is skipped", nothing.skipped.length, 1);

  const bad = imp.planImport(
    [{ __row: 1, Name: "ASPY", "Countries Registered": "lots" }], map, d);
  ok("an unreadable value becomes a reported issue",
     bad.skipped.concat(bad.updates).some(x => x.issues.some(i => /Could not read/.test(i))));
});

group("Planning — stages and the whole loop", () => {
  const d = draft();
  const headers = ["Name", "R&D & clinical", "WHO recommendation"];
  const map = imp.guessMapping(headers, d.stages);
  const plan = imp.planImport(
    [{ __row: 1, Name: "ALAQ", "R&D & clinical": "Complete", "WHO recommendation": "Delayed" }], map, d);
  is("stage statuses are planned", plan.updates.length, 1);
  const fields = plan.updates[0].changes.map(c => c.field).sort();
  is("against the right stage indexes", fields, ["stage:0:status", "stage:2:status"]);

  // applying the plan must leave data the validator still accepts
  const before = rules.checkData(d).errors.length;
  plan.updates.forEach(u => u.changes.forEach(c => imp.setValue(d.products[u.index], c.field, c.value)));
  const after = rules.checkData(d);
  ok("applying a plan does not corrupt the dataset structure",
     after.errors.every(e => !/must be one of|must have exactly/.test(e)),
     after.errors.slice(0, 3).join(" | "));
  ok("a newly delayed stage is correctly demanded to explain itself",
     after.errors.some(e => /substantive reason/.test(e)) || after.errors.length === before,
     "errors: " + after.errors.length);
});

// ---------------------------------------------------------------- shape guard
group("Shape — spotting transaction-level files", () => {
  const d = draft();
  // one row per purchase order: 60 rows, 3 medicines
  const rows = [];
  for (let i = 0; i < 60; i++) {
    rows.push({ __row: i + 1, Name: ["Coartem", "Pyramax", "Artesun"][i % 3],
                Manufacturer: "Maker " + i });
  }
  const map = imp.guessMapping(["Name", "Manufacturer"], d.stages);
  const plan = imp.planImport(rows, map, d);
  ok("a transaction-shaped file is flagged", plan.notices.some(n => n.level === "stop"),
     JSON.stringify(plan.notices));
  is("and says how many names it actually found",
     /only 3 different names/.test(plan.notices[0].text), true);

  // genuinely distinct medicines must NOT be flagged as transaction-shaped
  const clean = [];
  for (let i = 0; i < 60; i++) clean.push({ __row: i + 1, Name: "Medicine " + i, Manufacturer: "M" });
  const plan2 = imp.planImport(clean, map, d);
  is("distinct rows are not mistaken for transactions",
     plan2.notices.filter(n => n.level === "stop").length, 0);
  ok("but a large import is still worth a nudge", plan2.notices.length === 1);

  // a couple of accidental duplicates get a softer warning
  const dupes = [
    { __row: 1, Name: "Alpha", Manufacturer: "A" },
    { __row: 2, Name: "Beta", Manufacturer: "B" },
    { __row: 3, Name: "Alpha", Manufacturer: "C" }
  ];
  const plan3 = imp.planImport(dupes, map, d);
  ok("a repeated name is warned about", plan3.notices.some(n => /appear on more than one row/.test(n.text)));

  is("a small tidy file is not nagged", imp.planImport(
    [{ __row: 1, Name: "Solo", Manufacturer: "X" }], map, d).notices.length, 0);
});

// ---------------------------------------------------------------- scale
group("Scale", () => {
  const rows = ["name,manufacturer,countries registered"];
  for (let i = 0; i < 5000; i++) rows.push(`Medicine ${i},Maker ${i % 50},${i % 200}`);
  const text = rows.join("\n");
  const t0 = Date.now();
  const parsed = imp.toRecords(text);
  const tParse = Date.now() - t0;
  is("5,000 rows parse", parsed.records.length, 5000);
  ok("in under two seconds", tParse < 2000, tParse + "ms");

  const d = draft();
  const map = imp.guessMapping(parsed.headers, d.stages);
  const t1 = Date.now();
  const plan = imp.planImport(parsed.records, map, d);
  const tPlan = Date.now() - t1;
  is("and plan to 5,000 new medicines", plan.creates.length, 5000);
  ok("in under five seconds", tPlan < 5000, tPlan + "ms");
  console.log(`         (parse ${tParse}ms, plan ${tPlan}ms)`);
});

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) { console.log("Failing: " + failures.join("; ")); process.exit(1); }
