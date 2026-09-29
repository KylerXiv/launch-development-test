#!/usr/bin/env node
// Turns a filed proposal form into a reviewable, appliable change — and back
// out again as house-style data.
//
// This is the piece both proposal workflows call, and the only place that
// knows how the issue form's labels map onto the data contract. Keeping it
// here rather than inside the workflow YAML means it can be run by hand and
// tested without GitHub:
//
//   node scripts/proposal-lib.js parse    <issue-body.md>   -> the proposal, as JSON
//   node scripts/proposal-lib.js check    <issue-body.md>   -> what the bot would comment
//   node scripts/proposal-lib.js apply    <proposal.json> [YYYY-MM-DD]
//                                                           -> writes data/products.js
//   node scripts/proposal-lib.js selftest                   -> runs the fixture end to end
//
// It never publishes anything. `apply` writes the data file and stops; the
// pull request, the checks and the merge are the workflow's job.

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rules = require("./data-rules.js");
const ser = require("./serialize-products.js");

const ROOT = path.join(__dirname, "..");
const PRODUCTS = path.join(ROOT, "data", "products.js");
const SOURCES = path.join(ROOT, "data", "sources.js");

// ---- the form's labels, and what they mean in the data -------------------
// These mirror .github/ISSUE_TEMPLATE/propose-change.yml. Changing an option
// there means changing it here — the round trip in `selftest` is what catches
// it if you forget.

const FIELD_BY_LABEL = {
  "the sentence shown under this stage": "note",
  "the status of this stage": "status",
  "the date this stage was reached": "date",
  "what happens next": "next",
  "the date that next step is expected": "nextDate",
};

const STATUS_BY_WORD = {
  "done": "done",
  "complete": "done",
  "in progress": "prog",
  "prog": "prog",
  "delayed": "late",
  "late": "late",
  "not started": "idle",
  "idle": "idle",
};

const NOT_LISTED = "not in this list";

// The source watcher (scripts/propose-regulatory.js) proposes what one source
// event changes as a unit — status, date and sentence together — because
// approving the status alone would leave a sentence contradicting it. People
// still file one field per proposal: only the bot may use this.
const BOT = "github-actions[bot]";
const SEVERAL = "several fields at once (filed by the source watcher)";
const SHORT = { note: "sentence", status: "status", date: "date", next: "next step", nextDate: "next-step date" };

// ---- reading the repo ----------------------------------------------------

function readData(file) {
  const raw = fs.readFileSync(file || PRODUCTS, "utf8");
  const got = rules.extractData(raw, "LAUNCH_DATA");
  if (!got.ok) throw new Error("cannot read products data: " + got.reason + " " + (got.message || ""));
  return { raw, data: got.data };
}

function readSources() {
  if (!fs.existsSync(SOURCES)) return [];
  const got = rules.extractData(fs.readFileSync(SOURCES, "utf8"), "LAUNCH_SOURCES");
  if (!got.ok) return [];
  return (got.data && got.data.sources) || [];
}

// ---- parsing the filed form ---------------------------------------------
// GitHub renders an issue form as "### Label" followed by the answer, and
// writes "_No response_" where a field was left empty.

function parseIssueBody(body) {
  const out = {};
  const parts = String(body).split(/^###\s+/m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf("\n");
    const label = (nl === -1 ? part : part.slice(0, nl)).trim();
    let value = (nl === -1 ? "" : part.slice(nl + 1)).trim();
    if (/^_?no response_?$/i.test(value)) value = "";
    // People paste the question back in with their answer. Drop it.
    const echoed = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*:\\s*", "i");
    value = value.replace(echoed, "").trim();
    out[label.toLowerCase()] = value;
  }
  return out;
}

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// ---- building the proposal ----------------------------------------------

function buildProposal(fields, ctx) {
  const errors = [];
  const { data, sources, issue } = ctx;
  const say = (m) => errors.push(m);

  // medicine -> product id. Tolerant of "ASPY (Pyramax)" against name "ASPY".
  const wantP = norm(fields["medicine"]).replace(/\s*\(.*\)\s*/, "");
  const product = data.products.find(
    (p) => norm(p.name) === wantP || norm(p.id) === wantP || norm(p.name).startsWith(wantP)
  );
  if (!fields["medicine"]) say("No medicine was chosen.");
  else if (!product) say("“" + fields["medicine"] + "” is not a medicine in the data.");

  // stage label -> index into products[].stages
  const stageIdx = data.stages.findIndex((s) => norm(s) === norm(fields["which stage"]));
  if (!fields["which stage"]) say("No stage was chosen.");
  else if (stageIdx === -1) say("“" + fields["which stage"] + "” is not one of the eight stages.");

  const statusCode = (v) => {
    const code = STATUS_BY_WORD[norm(v)];
    if (!code) say("Status must be one of: done / in progress / delayed / not started — got “" + v + "”.");
    return code;
  };

  let key = null, now = null, several = null;
  if (norm(fields["what changes"]) === SEVERAL) {
    if (!issue || issue.user !== BOT) {
      say("Only the source watcher can change several fields in one proposal. File one proposal per field.");
    } else {
      // One "### <field label>" section per field, labelled as in the form.
      several = [];
      for (const [label, field] of Object.entries(FIELD_BY_LABEL)) {
        let v = fields[label];
        if (!v) continue;
        if (field === "status") v = statusCode(v);
        if (v) several.push({ field, now: v });
      }
      if (!several.length) say("The source watcher proposed no fields.");
    }
  } else {
    key = FIELD_BY_LABEL[norm(fields["what changes"])];
    if (!fields["what changes"]) say("No field was chosen under “What changes”.");
    else if (!key) say("“" + fields["what changes"] + "” is not a field this form can change.");

    now = fields["what it should say"];
    if (!now) say("“What it should say” is empty — there is nothing to propose.");
    if (key === "status" && now) now = statusCode(now);
  }

  // source label -> registry id
  const srcLabel = fields["source"] || "";
  let src = null;
  if (!srcLabel) say("No source was chosen.");
  else if (norm(srcLabel).startsWith(NOT_LISTED))
    say("This source is not in the registry yet. It has to be added to data/sources.js before a figure can cite it.");
  else {
    const hit = sources.find((s) => norm(s.label) === norm(srcLabel) || norm(s.title) === norm(srcLabel));
    if (!hit) say("“" + srcLabel + "” is not in data/sources.js. Sources must exist in the registry before they can be cited.");
    else src = hit.id;
  }

  const asOf = (fields["date of the source"] || "").trim();
  if (!asOf) say("No source date was given.");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) say("The source date must be YYYY-MM-DD — got “" + asOf + "”.");
  else if (Number.isNaN(Date.parse(asOf))) say("“" + asOf + "” is not a real date.");

  if (errors.length) return { ok: false, errors };

  const stage = product.stages[stageIdx];
  const wasOf = (f) => (stage[f] === undefined ? "" : stage[f]);
  const proposal = {
    id: issue && issue.number ? "p-" + issue.number : "p-" + Date.now(),
    issue: (issue && issue.number) || null,
    target: { product: product.id, stage: stageIdx, field: several ? "several" : key },
    stageName: data.stages[stageIdx],
    productName: product.name,
    ...(several
      ? { changes: several.map((c) => ({ field: c.field, was: wasOf(c.field), now: c.now })) }
      : { was: wasOf(key), now }),
    evidence: {
      src,
      srcLabel: (sources.find((s) => s.id === src) || {}).label || srcLabel,
      asOf,
      ref: fields["link or reference"] || null,
    },
    notes: fields["anything the reviewer should know"] || null,
    origin: issue && issue.user ? (issue.user === BOT ? "watcher:" : "analyst:") + issue.user : "analyst:unknown",
    state: "waiting",
  };
  proposal.fingerprint = fingerprint(proposal);
  return { ok: true, proposal };
}

// A rejected proposal is remembered by what it proposed, not by its issue
// number — so the same suggestion arriving again next month is recognised.
// A single-field proposal's recipe is unchanged, so recorded decisions still
// match; several fields are hashed together, in field order.
function fingerprint(p) {
  const parts = p.changes
    ? [p.target.product, p.target.stage].concat(p.changes.map((c) => c.field + "=" + String(c.now).trim()).sort())
    : [p.target.product, p.target.stage, p.target.field, String(p.now).trim()];
  return "sha1:" + crypto.createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
}

// Every proposal as a list of field changes, whichever shape it was filed in.
const changesOf = (p) => p.changes || [{ field: p.target.field, was: p.was, now: p.now }];

// ---- applying it ---------------------------------------------------------

function applyProposal(data, proposal, today) {
  const next = JSON.parse(JSON.stringify(data));
  const p = next.products.find((x) => x.id === proposal.target.product);
  if (!p) throw new Error("no such product: " + proposal.target.product);
  const stage = p.stages[proposal.target.stage];
  if (!stage) throw new Error("no stage " + proposal.target.stage + " on " + p.id);

  for (const c of changesOf(proposal)) stage[c.field] = c.now;
  // The citation travels with the value. This overwrites the previous one on
  // purpose: a figure cites where its CURRENT wording came from, and the
  // reviewer sees the swap in the summary before approving it.
  stage.source = proposal.evidence.srcLabel + (proposal.evidence.ref ? " (" + proposal.evidence.ref + ")" : "");
  stage.asOf = proposal.evidence.asOf;

  const date = today || new Date().toISOString().slice(0, 10);
  // publish.yml refuses a data change that did not bump this.
  next.meta.lastUpdated = date;

  const label = Object.keys(FIELD_BY_LABEL).find((k) => FIELD_BY_LABEL[k] === proposal.target.field);
  const what = proposal.changes
    ? proposal.changes.map((c) => SHORT[c.field] + " set to “" + c.now + "”").join("; ")
    : label + " updated to “" + proposal.now + "”";
  const by = proposal.decision && proposal.decision.by ? proposal.decision.by : "review";
  next.changelog.unshift({
    date,
    product: proposal.productName,
    change:
      proposal.stageName + ": " + what + ". Source: " +
      proposal.evidence.srcLabel + ", " + proposal.evidence.asOf +
      ". Proposed in issue #" + proposal.issue + ", approved by " + by + ".",
    plain:
      proposal.productName + " — " + proposal.stageName.toLowerCase() +
      " was updated from the " + proposal.evidence.srcLabel + ".",
  });
  return next;
}

// ---- what the bot says ---------------------------------------------------

function titleFor(p) {
  return "Proposal: " + p.productName + " · " + p.stageName;
}

// A replacement that drops a third or more of the existing wording is far
// more often a mistake than an intention. Not an error — sometimes a sentence
// really is being cut down — so it is flagged for the reviewer, not refused.
function shortfall(p) {
  const note = changesOf(p).find((c) => c.field === "note");
  if (!note) return null;
  const wasLen = String(note.was || "").length;
  const nowLen = String(note.now || "").length;
  if (wasLen < 80 || nowLen >= wasLen * 0.66) return null;
  return { wasLen, nowLen, pct: Math.round((1 - nowLen / wasLen) * 100) };
}

function summaryMarkdown(p, findings) {
  const bar = (s) => String(s).replace(/\|/g, "\\|");
  const L = [];
  L.push("**" + p.productName + " · " + p.stageName + "**");
  L.push("");
  const watcher = /^watcher:/.test(p.origin);
  if (p.changes) {
    L.push("| | Now says | Would say |");
    L.push("| --- | --- | --- |");
    p.changes.forEach((c) => L.push("| **" + SHORT[c.field] + "** | " + bar(c.was || "_(empty)_") + " | " + bar(c.now) + " |"));
    L.push("");
    L.push("| | |");
    L.push("| --- | --- |");
  } else {
    L.push("| | |");
    L.push("| --- | --- |");
    L.push("| **Now says** | " + bar(p.was || "_(empty)_") + " |");
    L.push("| **Would say** | " + bar(p.now) + " |");
  }
  L.push("| **Source** | " + bar(p.evidence.srcLabel + ", " + p.evidence.asOf + (p.evidence.ref ? " — " + p.evidence.ref : "")) + " |");
  L.push("| **Proposed by** | " + (watcher ? "the source watcher (automated)" : p.origin.replace("analyst:", "@")) + " |");
  L.push("");
  // The form replaces a whole sentence, so someone meaning to ADD a fact can
  // silently delete the ones already there. Cheap to spot, expensive to miss.
  const lost = shortfall(p);
  if (lost) {
    L.push("> [!WARNING]");
    L.push("> **This replaces the whole sentence, and it is " + lost.pct + "% shorter** (" +
      lost.wasLen + " characters down to " + lost.nowLen + "). Anything in the current wording that is not repeated above will disappear from the dashboard. If you meant to *add* to it, the proposal needs the complete new sentence, not just the new part.");
    L.push("");
  }
  if (findings && findings.errors && findings.errors.length) {
    L.push("### ❌ This cannot be approved yet");
    L.push("");
    findings.errors.forEach((e) => L.push("- " + e));
    L.push("");
    L.push("Edit the issue to fix it, or close it if it was filed by mistake.");
  } else {
    L.push("### ✅ Ready for review");
    L.push("");
    L.push("Checked against the data rules with the change applied — no errors.");
    L.push("");
    L.push(watcher
      ? "Filed automatically from a public source, so **any one reviewer** decides — check the preview against the source first:"
      : "A reviewer **other than the person who proposed it** decides:");
    L.push("");
    L.push("- label **`approved`** — the change is applied, checked and merged. Nothing else to do.");
    L.push("- label starting **`rejected:`** — the reason is recorded and this will not be proposed again.");
  }
  return L.join("\n");
}

// Runs the real governance rules against the data as it WOULD be.
function checkApplied(data, proposal, today) {
  const applied = applyProposal(data, proposal, today);
  const findings = rules.checkData(applied);
  return { applied, errors: findings.errors, warnings: findings.warnings };
}

// ---- CLI -----------------------------------------------------------------

function cli(argv) {
  const cmd = argv[0];
  const arg = argv[1];
  const sources = readSources();

  if (cmd === "parse" || cmd === "check") {
    const body = fs.readFileSync(arg, "utf8");
    const got = readData();
    const issue = {
      number: Number(process.env.ISSUE_NUMBER || 0) || null,
      user: process.env.ISSUE_USER || null,
    };
    const built = buildProposal(parseIssueBody(body), { data: got.data, sources, issue });
    if (!built.ok) {
      if (cmd === "parse") {
        console.error(JSON.stringify({ ok: false, errors: built.errors }, null, 2));
        process.exit(1);
      }
      console.log(["**The form could not be read as a proposal.**", ""].concat(built.errors.map((e) => "- " + e)).join("\n"));
      process.exit(1);
    }
    if (cmd === "parse") {
      console.log(JSON.stringify(built.proposal, null, 2));
      return;
    }
    const res = checkApplied(got.data, built.proposal);
    console.log(summaryMarkdown(built.proposal, res));
    if (res.errors.length) process.exit(1);
    return;
  }

  if (cmd === "apply") {
    const proposal = JSON.parse(fs.readFileSync(arg, "utf8"));
    // Optional fixed date, so the approval can rebuild the proposal commit
    // exactly as intake built it and compare the two — see proposal-decision.yml.
    const on = argv[2];
    if (on && !/^\d{4}-\d{2}-\d{2}$/.test(on)) {
      console.error("apply: the date must be YYYY-MM-DD, got " + on);
      process.exit(2);
    }
    const got = readData();
    const res = checkApplied(got.data, proposal, on);
    if (res.errors.length) {
      console.error("Refusing to apply — the result would break the data rules:");
      res.errors.forEach((e) => console.error("  " + e));
      process.exit(1);
    }
    // serializeProducts takes the old file text and reuses its header itself —
    // prepending fileHeader() as well writes the assignment line twice.
    fs.writeFileSync(PRODUCTS, ser.serializeProducts(res.applied, got.raw), "utf8");
    console.log("Applied " + proposal.id + " to data/products.js (" + res.warnings.length + " warning(s)).");
    return;
  }

  if (cmd === "selftest") return selftest();

  console.error("usage: proposal-lib.js parse|check <issue-body.md> | apply <proposal.json> [YYYY-MM-DD] | selftest");
  process.exit(2);
}

// ---- self test -----------------------------------------------------------
// Proves the whole chain without GitHub: a filed form becomes a proposal, the
// proposal applies, and the applied data still passes the real rules.

function selftest() {
  const fixture = path.join(ROOT, "test-data", "proposal", "sample-issue.md");
  const body = fs.readFileSync(fixture, "utf8");
  const got = readData();
  const data = got.data;
  const sources = readSources();
  let pass = 0;
  let fail = 0;
  const ok = (name, cond, extra) => {
    if (cond) { pass++; console.log("  ok   " + name); }
    else { fail++; console.log("  FAIL " + name + (extra ? " — " + extra : "")); }
  };

  const fields = parseIssueBody(body);
  ok("parses every field", Object.keys(fields).length >= 8, Object.keys(fields).length + " found");
  ok("drops _No response_", fields["link or reference"] === "");
  ok("strips an echoed question", !/^what it should say/i.test(fields["what it should say"]));

  const built = buildProposal(fields, { data, sources, issue: { number: 11, user: "KylerXiv" } });
  ok("builds a proposal", built.ok, built.ok ? "" : built.errors.join("; "));
  if (!built.ok) { console.log("\n" + pass + " passed, " + fail + " failed."); process.exit(1); }

  const p = built.proposal;
  ok("targets the right product", p.target.product === "pyramax", p.target.product);
  ok("targets Country registration", p.stageName === "Country registration", p.stageName);
  ok("resolves the source to a registry id", p.evidence.src === "rwanda-fda", String(p.evidence.src));
  ok("captures the current wording", typeof p.was === "string" && p.was.length > 0);
  ok("has a fingerprint", /^sha1:[0-9a-f]{16}$/.test(p.fingerprint));

  const res = checkApplied(data, p, "2026-09-22");
  ok("applied data still passes the rules", res.errors.length === 0, res.errors.join("; "));
  ok("the stage carries the new wording",
    res.applied.products.find((x) => x.id === "pyramax").stages[4].note === p.now);
  ok("the citation travelled with it",
    res.applied.products.find((x) => x.id === "pyramax").stages[4].asOf === "2026-09-21");
  ok("meta.lastUpdated was bumped", res.applied.meta.lastUpdated === "2026-09-22");
  ok("a changelog line was added", res.applied.changelog.length === data.changelog.length + 1);
  ok("the original data was not mutated",
    data.products.find((x) => x.id === "pyramax").stages[4].note !== p.now);

  // A rejected proposal must be recognisable when it arrives again.
  const again = buildProposal(fields, { data, sources, issue: { number: 99, user: "someone" } });
  ok("same change, same fingerprint", again.proposal.fingerprint === p.fingerprint);

  // And a broken form must be refused, not guessed at.
  const badFields = Object.assign({}, fields, {
    "date of the source": "21 Sep 2026",
    "source": "Nowhere in particular",
  });
  const bad = buildProposal(badFields, { data, sources, issue: { number: 12, user: "x" } });
  ok("refuses a bad date and an unknown source", !bad.ok && bad.errors.length === 2, (bad.errors || []).join("; "));

  // The fixture replaces a long verified sentence with a short one — exactly
  // the mistake that quietly deletes facts. It must be flagged, not refused.
  const warned = summaryMarkdown(p, res);
  ok("warns that a much shorter replacement drops the rest", /WARNING/.test(warned) && /shorter/.test(warned));
  const noWarn = summaryMarkdown(Object.assign({}, p, { was: "short" }), res);
  ok("does not warn when there was little to lose", !/WARNING/.test(noWarn));

  // The source watcher's several-field proposal — built for the bot only.
  const several = {
    "medicine": "ganlum",
    "which stage": "WHO PQ listing",
    "what changes": "Several fields at once (filed by the source watcher)",
    "the status of this stage": "done",
    "the date this stage was reached": "15 Sep 2026",
    "the sentence shown under this stage": "Prequalified by WHO on 15 Sep 2026 (WHO ref MA999, Novartis Pharma AG).",
    "source": "WHO prequalification list",
    "date of the source": "2026-09-21",
    "link or reference": "",
    "anything the reviewer should know": "",
  };
  const byPerson = buildProposal(several, { data, sources, issue: { number: 30, user: "KylerXiv" } });
  ok("refuses several fields from a person", !byPerson.ok && /Only the source watcher/.test((byPerson.errors || []).join(" ")));
  const byBot = buildProposal(several, { data, sources, issue: { number: 31, user: BOT } });
  ok("builds several fields for the watcher", byBot.ok && byBot.proposal.changes.length === 3, byBot.ok ? "" : byBot.errors.join("; "));
  if (byBot.ok) {
    const bp = byBot.proposal;
    ok("maps the status word to its code", bp.changes.find((c) => c.field === "status").now === "done");
    ok("records what each field says now", bp.changes.find((c) => c.field === "status").was === "idle");
    const bres = checkApplied(data, bp, "2026-09-22");
    const gs = bres.applied.products.find((x) => x.id === "ganlum").stages[3];
    ok("applies all three fields", gs.status === "done" && gs.date === "15 Sep 2026" && /MA999/.test(gs.note));
    ok("the several-field result passes the rules", bres.errors.length === 0, bres.errors.join("; "));
    const again2 = buildProposal(several, { data, sources, issue: { number: 32, user: BOT } });
    ok("several fields, same fingerprint", again2.proposal.fingerprint === bp.fingerprint);
    const later = buildProposal(Object.assign({}, several, { "the date this stage was reached": "16 Sep 2026" }),
      { data, sources, issue: { number: 33, user: BOT } });
    ok("a different value is a different fingerprint", later.proposal.fingerprint !== bp.fingerprint);
    ok("names the watcher as proposer", /source watcher \(automated\)/.test(summaryMarkdown(bp, bres)));
  }

  // The serializer must still round-trip what we hand it.
  const written = ser.serializeProducts(res.applied, got.raw);
  const reread = rules.extractData(written, "LAUNCH_DATA");
  ok("the written file parses back", reread.ok && reread.data.meta.lastUpdated === "2026-09-22");

  console.log("\n" + pass + " passed, " + fail + " failed.");
  if (fail) process.exit(1);
}

module.exports = {
  BOT,
  SEVERAL_LABEL: "Several fields at once (filed by the source watcher)",
  FIELD_BY_LABEL,
  parseIssueBody,
  buildProposal,
  applyProposal,
  checkApplied,
  fingerprint,
  summaryMarkdown,
  shortfall,
  titleFor,
  readData,
  readSources,
};

if (require.main === module) cli(process.argv.slice(2));
