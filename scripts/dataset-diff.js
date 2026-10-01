#!/usr/bin/env node
// What a publish would change for RBM: compares the `data` of two dashboard.json
// files and prints Markdown — the run summary the approver reads, and the
// CHANGELOG.md entry of the public data repo.
//
//   node scripts/dataset-diff.js <published.json | -> <new.json> [--out <file>]
//
// "-" (or a missing file) means nothing is published yet. Exit code 0 always;
// writes `changed=true|false` to $GITHUB_OUTPUT when it is set. Only `data`
// is compared: the envelope (dates, approver, commit) changes on every build
// and is not a change for RBM's readers.
"use strict";
const fs = require("fs");

const [oldFile, newFile] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const outAt = process.argv.indexOf("--out");
const outFile = outAt >= 0 ? process.argv[outAt + 1] : null;
if (!newFile) { console.error("usage: dataset-diff.js <published.json|-> <new.json> [--out file]"); process.exit(2); }

const read = (f) => (f && f !== "-" && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
const before = read(oldFile);
const after = read(newFile);

const isText = (v) => v && typeof v === "object" && !Array.isArray(v) && typeof v.en === "string";
const short = (v) => {
  // a whole entry (an added changelog line, a new product): its readable part
  if (v && typeof v === "object" && !Array.isArray(v) && !isText(v)) {
    if (isText(v.plain)) return (v.date ? v.date + " · " : "") + v.plain.en;
    if (typeof v.id === "string") return v.id;
  }
  const s = isText(v) ? v.en : typeof v === "string" ? v : JSON.stringify(v);
  return s === undefined || s === "" ? "—" : s.length > 90 ? s.slice(0, 87) + "…" : s;
};
// readable addresses: products[ganlum].stages[3].status rather than products[0]…
const label = (arr, i) => (arr[i] && arr[i].id ? arr[i].id : i);

function diff(a, b, at, out) {
  if (JSON.stringify(a) === JSON.stringify(b)) return;
  if (isText(a) && isText(b)) {
    if (a.en !== b.en) out.push({ at, was: a, now: b });
    else for (const l of ["fr", "pt"]) if (a[l] !== b[l]) out.push({ at: `${at} (${l})`, was: a[l], now: b[l] });
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const hasIds = (arr) => arr.length && arr.every((x) => x && typeof x === "object" && typeof x.id === "string");
    // products, sources: match by id, so a reordering is not a change
    if (hasIds(a) && hasIds(b)) {
      const A = new Map(a.map((x) => [x.id, x])), B = new Map(b.map((x) => [x.id, x]));
      for (const [id, x] of B) {
        if (A.has(id)) diff(A.get(id), x, `${at}[${id}]`, out);
        else out.push({ at: `${at}[${id}]`, was: undefined, now: x, kind: "added" });
      }
      for (const [id, x] of A) if (!B.has(id)) out.push({ at: `${at}[${id}]`, was: x, now: undefined, kind: "removed" });
      return;
    }
    // a list that grew or shrank (the changelog gains a line at the top on
    // every approval): report the entries added and removed, by content —
    // comparing by position would show every entry below as changed
    if (a.length !== b.length) {
      const key = (x) => JSON.stringify(x);
      const left = new Map();
      a.forEach((x) => left.set(key(x), (left.get(key(x)) || 0) + 1));
      b.forEach((x) => {
        const k = key(x);
        if (left.get(k)) left.set(k, left.get(k) - 1);
        else out.push({ at: `${at}[+]`, was: undefined, now: x, kind: "added" });
      });
      a.forEach((x) => {
        const k = key(x);
        if (left.get(k)) { left.set(k, left.get(k) - 1); out.push({ at: `${at}[−]`, was: x, now: undefined, kind: "removed" }); }
      });
      return;
    }
    // same length (a product's eight stages, the stage names): by position
    for (let i = 0; i < b.length; i++) diff(a[i], b[i], `${at}[${label(b, i)}]`, out);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[k], b[k], at ? `${at}.${k}` : k, out);
    return;
  }
  out.push({ at, was: a, now: b });
}

const changes = [];
if (before) diff(before.data, after.data, "", changes);
const changed = !before || changes.length > 0;

const lines = [];
const who = after.approval.trigger === "approval"
  ? `approval of proposal #${after.approval.issue} by @${after.approved_by}`
  : `published by @${after.approved_by}: ${after.approval.reason}`;
if (!before) {
  lines.push(`First publish (${who}).`, "", `${after.data.products.length} products, ${after.data.sources.length} sources, schema v${after.schema_version}.`);
} else if (!changes.length) {
  lines.push(`No change for RBM's readers (${who}): the data is identical to what is published.`);
} else {
  lines.push(`${changes.length} change${changes.length === 1 ? "" : "s"} for RBM's readers (${who}):`, "");
  changes.slice(0, 40).forEach((c) => lines.push(
    c.kind === "added" ? `- added \`${c.at.replace(/\[\+\]$/, "")}\`: ${short(c.now)}`
    : c.kind === "removed" ? `- removed \`${c.at.replace(/\[−\]$/, "")}\`: ${short(c.was)}`
    : `- \`${c.at}\`: ${short(c.was)} → ${short(c.now)}`));
  if (changes.length > 40) lines.push(`- … and ${changes.length - 40} more`);
}
const md = lines.join("\n") + "\n";
process.stdout.write(md);
if (outFile) fs.writeFileSync(outFile, md, "utf8");
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
