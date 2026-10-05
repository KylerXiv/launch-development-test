#!/usr/bin/env node
// Records a decided proposal — approved or rejected — in data/decisions.js,
// and removes it from the queue in data/proposals.js.
//
//   ISSUE_NUMBER=… STATE=approved|rejected DECIDER=… [REASON=…] [PR=…] [COMMIT=…] \
//     [CONTENT_HASH=…] [REVIEWED_CONTENT_HASH=…] node scripts/record-decision.js
//
// Inputs arrive through the environment, never as arguments spliced into a
// shell command: the rejection reason is a label name, and anyone who can
// create labels chooses it.
//
// decisions.js is append-only: every decision, with the proposal's
// fingerprint, so a rejection can be recognised when the same change comes
// back (scripts/propose-regulatory.js skips it; intake warns the reviewer).
// Called by both jobs of .github/workflows/proposal-decision.yml. Writes the
// two files and stops; committing is the workflow's job.
//
// An approval also records the contentHash it approved (CP-4): the English
// content that was merged and translated, from scripts/proposal-translate.sh.
// When main's page or other data files had moved since the pull request was
// opened, the pull request's own contentHash differs, and is recorded beside
// it as reviewedContentHash.

"use strict";

const fs = require("fs");
const path = require("path");
const rules = require("./data-rules.js");

const ROOT = path.join(__dirname, "..");
const { ISSUE_NUMBER, STATE, DECIDER, REASON, PR, COMMIT, CONTENT_HASH, REVIEWED_CONTENT_HASH } = process.env;
const n = Number(ISSUE_NUMBER);
if (!Number.isInteger(n) || n <= 0) { console.error("record-decision: ISSUE_NUMBER must be an issue number"); process.exit(2); }
if (!["approved", "rejected"].includes(STATE)) { console.error("record-decision: STATE must be approved or rejected"); process.exit(2); }

const today = new Date().toISOString().slice(0, 10);

// The assignment at a line start, as extractData finds it: proposals.js quotes
// it in its header comment, and a plain indexOf cut the file there.
function read(rel, global) {
  const file = path.join(ROOT, rel);
  const raw = fs.readFileSync(file, "utf8");
  const got = rules.extractData(raw, global);
  if (!got.ok) throw new Error("cannot read " + rel);
  return { file, head: raw.slice(0, raw.search(new RegExp("^window\\." + global + "\\s*=", "m"))), data: got.data };
}
const write = (f, global, body) =>
  fs.writeFileSync(f.file, f.head + "window." + global + " =\n" + JSON.stringify(body, null, 2) + "\n");

const queue = read("data/proposals.js", "LAUNCH_PROPOSALS");
const log = read("data/decisions.js", "LAUNCH_DECISIONS");
const p = queue.data.proposals.find((x) => x.issue === n);

log.data.decisions.push({
  issue: n,
  state: STATE,
  ...(STATE === "rejected" ? { reason: REASON || null } : {}),
  by: DECIDER || null,
  on: today,
  target: p ? p.target : null,
  // A register watcher's proposal also draws countries on the map; those are
  // part of what was decided. Every other shape is recorded as before.
  proposed: p ? (p.countries ? { changes: p.changes || [], countries: p.countries } : (p.changes || p.now)) : null,
  fingerprint: p ? p.fingerprint : null,
  ...(PR ? { pr: Number(PR) } : {}),
  ...(COMMIT ? { commit: COMMIT } : {}),
  ...(CONTENT_HASH ? { contentHash: CONTENT_HASH } : {}),
  ...(REVIEWED_CONTENT_HASH && REVIEWED_CONTENT_HASH !== CONTENT_HASH ? { reviewedContentHash: REVIEWED_CONTENT_HASH } : {}),
});
write(log, "LAUNCH_DECISIONS", { meta: { updated: today }, decisions: log.data.decisions });
write(queue, "LAUNCH_PROPOSALS", { meta: { updated: today }, proposals: queue.data.proposals.filter((x) => x.issue !== n) });

console.log(`Recorded #${n}: ${STATE}${p ? "" : " (no queued snapshot found — recorded without one)"}.`);
