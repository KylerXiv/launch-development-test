#!/usr/bin/env node
// Decides whether a data file may replace the history snapshot already taken
// for its own date — i.e. whether it is a LATER change on the same day, rather
// than an edit that forgot to bump meta.lastUpdated.
//
//   node scripts/history-continues.js <snapshot.js> <data.js> <YYYY-MM-DD>
//   exit 0: yes, replace it    exit 1: no, refuse (and says why)
//
// publish.yml keeps one snapshot per date: the day's final state. Two
// approvals on one day both carry that day as lastUpdated, and before this
// the second one failed the "never overwrite" guard. A continuation is
// recognised by its changelog: the newest entry is dated this day, and every
// entry the snapshot had is still there, unchanged, beneath the new ones. An
// edit that forgot to bump the date either adds an entry dated later, or adds
// none — both still refused, as before.

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

const before = load(oldFile).changelog || [];
const after = load(newFile).changelog || [];
const added = after.length - before.length;

if (added <= 0) refuse("no new changelog entry — an edit that did not bump meta.lastUpdated");
if (after.slice(0, added).some((c) => c.date !== date))
  refuse("a new changelog entry is not dated " + date + " — bump meta.lastUpdated");
if (JSON.stringify(after.slice(added)) !== JSON.stringify(before))
  refuse("the snapshot's own changelog entries were changed — not a continuation of it");

console.log("a later change on " + date + " (" + added + " new changelog entr" + (added === 1 ? "y" : "ies") + ")");
