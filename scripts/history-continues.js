#!/usr/bin/env node
// Decides whether a data file may replace the history snapshot already taken
// for its own date — i.e. whether it is a later change on that same day,
// rather than an edit that forgot to bump meta.lastUpdated.
//
//   node scripts/history-continues.js <snapshot.js> <data.js> <YYYY-MM-DD>
//   exit 0: yes, replace it    exit 1: no, refuse (and says why)
//
// publish.yml keeps one snapshot per date: the day's final state. So within
// that day anything the changelog records may change — a second approval, a
// same-day revert, a corrected entry — and nothing from any earlier day may.
// Judged from the changelog, which every approved change writes to:
//   - entries dated before the day are exactly as the snapshot has them;
//   - no entry is dated after the day (that edit needed a new date);
//   - the day's own entries differ from the snapshot's, so the difference
//     is one the changelog records. Same entries, different data means an
//     edit that did not bump the date — refused, as the guard always did.
//
// The first version (29 Sep) demanded that every entry the snapshot had was
// still there. A same-day revert removes one, so it refused a revert followed
// by another approval that day, which is exactly what then happened.

"use strict";

const fs = require("fs");

const [oldFile, newFile, date] = process.argv.slice(2);
if (!oldFile || !newFile || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
  console.error("usage: history-continues.js <snapshot.js> <data.js> <YYYY-MM-DD>");
  process.exit(2);
}

const load = (f) => {
  const raw = fs.readFileSync(f, "utf8");
  const m = raw.match(/^window\.LAUNCH_DATA\s*=\s*/m);
  if (!m) throw new Error("no window.LAUNCH_DATA in " + f);
  return JSON.parse(raw.slice(m.index + m[0].length).replace(/;?\s*$/, ""));
};
const refuse = (why) => { console.log(why); process.exit(1); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const before = load(oldFile).changelog || [];
const after = load(newFile).changelog || [];
const on = (cl, test) => cl.filter((c) => test(String(c.date || "")));

if (on(after, (d) => d > date).length)
  refuse("a changelog entry is dated after " + date + " — bump meta.lastUpdated");
if (!same(on(after, (d) => d < date), on(before, (d) => d < date)))
  refuse("changelog entries from before " + date + " were changed — earlier days are history");
const todayBefore = on(before, (d) => d === date);
const todayAfter = on(after, (d) => d === date);
if (same(todayAfter, todayBefore))
  refuse("the data changed but " + date + "'s changelog entries did not — an edit that did not bump meta.lastUpdated");

const key = (c) => JSON.stringify(c);
const added = todayAfter.filter((c) => !todayBefore.map(key).includes(key(c))).length;
const dropped = todayBefore.filter((c) => !todayAfter.map(key).includes(key(c))).length;
console.log(`a later change on ${date} (${added} changelog entr${added === 1 ? "y" : "ies"} added` +
  (dropped ? `, ${dropped} from earlier that day withdrawn` : "") + ")");
