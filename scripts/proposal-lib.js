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
// In a several-field proposal, empties a field — a stage that is now done has
// no next step. An empty form section cannot say that: it reads as "not given".
const CLEAR = "(clear)";

// A register watcher (scripts/propose-registers.js) also puts the country on
// the medicine's country map, under this section of a several-field proposal,
// one line per country: "NGA: registered". The source watcher only: a person's
// form has no such section. See docs/source-proposals-notes.md.
const COUNTRY_SECTION = "country map";
const LEVELS = ["registered", "guidelines", "mft"];
// The map warning written when a watcher draws the first country on a
// medicine that had no map at all.
const NEW_MAP_NOTE =
  "Only countries whose national register lists this medicine are shown, each citing that register. " +
  "Other countries have not been checked.";

// English country names, from the CLDR table the translated pages use.
let NAMES = null;
function countryName(iso3) {
  if (!NAMES) {
    NAMES = {};
    try {
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, "i18n", "country-names.json"), "utf8"));
      for (const [name, v] of Object.entries(t.names || {})) if (v && v.iso3 && !NAMES[v.iso3]) NAMES[v.iso3] = name;
    } catch (e) { /* names are a nicety: the code is shown instead */ }
  }
  return NAMES[iso3] || iso3;
}

// ---- reading the repo ----------------------------------------------------

function readData(file) {
  const raw = fs.readFileSync(file || PRODUCTS, "utf8");
  const got = rules.extractData(raw, "LAUNCH_DATA");
  if (!got.ok) throw new Error("cannot read products data: " + got.reason + " " + (got.message || ""));
  return { raw, data: got.data };
}

const DECISIONS = path.join(ROOT, "data", "decisions.js");

function readDecisions() {
  if (!fs.existsSync(DECISIONS)) return [];
  const got = rules.extractData(fs.readFileSync(DECISIONS, "utf8"), "LAUNCH_DECISIONS");
  return (got.ok && got.data && got.data.decisions) || [];
}

// Earlier rejections of exactly this change. The fingerprint is the change,
// not its evidence — so for a person's proposal this is a warning to the
// reviewer, not a refusal; the source watcher, which cannot judge evidence,
// skips it outright.
const rejectionsOf = (p, decisions) =>
  decisions.filter((d) => d.state === "rejected" && d.fingerprint && d.fingerprint === p.fingerprint);

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
  const mapLines = [];
  if (norm(fields["what changes"]) === SEVERAL) {
    if (!issue || issue.user !== BOT) {
      say("Only the source watcher can change several fields in one proposal. File one proposal per field.");
    } else {
      // One "### <field label>" section per field, labelled as in the form.
      several = [];
      // In reading order — status first — since this order is the changelog
      // line's. The fingerprint sorts, so it does not depend on it.
      const byField = Object.fromEntries(Object.entries(FIELD_BY_LABEL).map(([l, f]) => [f, l]));
      for (const field of ["status", "date", "note", "next", "nextDate"]) {
        const label = byField[field];
        let v = fields[label];
        if (!v) continue;
        if (norm(v) === CLEAR && field !== "status") { several.push({ field, now: "" }); continue; }
        if (field === "status") v = statusCode(v);
        if (v) several.push({ field, now: v });
      }
      for (const l of String(fields[COUNTRY_SECTION] || "").split("\n").map((x) => x.trim()).filter(Boolean)) {
        const m = /^([A-Z]{3})\s*:\s*([a-z]+)$/.exec(l);
        if (!m || !LEVELS.includes(m[2])) say("“" + l + "” is not a country-map line: a three-letter ISO code, a colon, and registered / guidelines / mft.");
        else if (mapLines.some((c) => c.iso3 === m[1])) say(m[1] + " is on the country map twice.");
        else mapLines.push({ iso3: m[1], now: m[2] });
      }
      if (!several.length && !mapLines.length) say("The source watcher proposed no fields.");
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
  // What each country now shows on the map, and the count the detail panel
  // shows beside it. A count below the countries the map draws would
  // contradict it ("Registered: 0" beside Nigeria), so it is raised to that
  // many — never lowered, and a "TBC" is left alone.
  const map = (product.detail && product.detail.countries) || null;
  const countries = mapLines.map((c) => {
    const cur = map && (map.list || []).find((e) => e.iso3 === c.iso3);
    return { iso3: c.iso3, name: countryName(c.iso3), was: cur ? cur.level : "", now: c.now };
  });
  let registeredCount = null;
  if (countries.length) {
    const drawn = new Set(((map && map.list) || []).map((e) => e.iso3).concat(countries.map((c) => c.iso3))).size;
    const reg = product.detail && product.detail.country && product.detail.country.registered;
    if (Number.isInteger(reg) && reg < drawn) registeredCount = { was: reg, now: drawn };
  }
  const proposal = {
    id: issue && issue.number ? "p-" + issue.number : "p-" + Date.now(),
    issue: (issue && issue.number) || null,
    target: { product: product.id, stage: stageIdx, field: several ? "several" : key },
    stageName: data.stages[stageIdx],
    productName: product.name,
    ...(several
      ? { changes: several.map((c) => ({ field: c.field, was: wasOf(c.field), now: c.now })) }
      : { was: wasOf(key), now }),
    ...(countries.length ? { countries } : {}),
    ...(registeredCount ? { registeredCount } : {}),
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

  // Nothing at all would change — not the value, not the citation. Merging it
  // would only add a changelog line claiming an update. Re-confirming a value
  // against a newer source changes the citation, so that still counts.
  const afterP = applyProposal(data, proposal, data.meta.lastUpdated).products.find((x) => x.id === product.id);
  const after = afterP.stages[stageIdx];
  if (JSON.stringify(after) === JSON.stringify(stage) &&
      JSON.stringify(afterP.detail.countries) === JSON.stringify(product.detail.countries) &&
      JSON.stringify(afterP.detail.country) === JSON.stringify(product.detail.country))
    return { ok: false, errors: ["This would change nothing: the dashboard already says exactly this, with the same source and date."] };

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
  // Only a proposal with countries has these, so every other fingerprint,
  // and every recorded decision, is unchanged.
  if (p.countries) parts.push(...p.countries.map((c) => "country:" + c.iso3 + "=" + c.now).sort());
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

  const fields = changesOf(proposal);
  for (const c of fields) stage[c.field] = c.now;
  // The citation travels with the value. This overwrites the previous one on
  // purpose: a figure cites where its CURRENT wording came from, and the
  // reviewer sees the swap in the summary before approving it. A proposal
  // that only draws a country on the map changes none of the stage's wording,
  // so the stage keeps its own citation; the changelog line carries this one.
  if (fields.length) {
    stage.source = proposal.evidence.srcLabel + (proposal.evidence.ref ? " (" + proposal.evidence.ref + ")" : "");
    stage.asOf = proposal.evidence.asOf;
  }
  if (proposal.countries) {
    if (!p.detail.countries) p.detail.countries = { status: "draft", note: NEW_MAP_NOTE, list: [] };
    for (const c of proposal.countries) {
      const e = p.detail.countries.list.find((x) => x.iso3 === c.iso3);
      // Each entry cites where it comes from, as every entry on a verified
      // list must (data-rules.js): the proposal's own source and date.
      const cite = { sources: [proposal.evidence.src], checked: proposal.evidence.asOf };
      if (e) Object.assign(e, { level: c.now }, cite);
      else p.detail.countries.list.push({ iso3: c.iso3, level: c.now, ...cite });
    }
    // Worked out here, from the map as it now stands, not taken from the
    // snapshot: two proposals for one medicine can be approved in either
    // order, and the second must count the first's country too. The
    // snapshot's registeredCount is what the reviewer was shown.
    const reg = p.detail.country && p.detail.country.registered;
    if (Number.isInteger(reg) && reg < p.detail.countries.list.length) p.detail.country.registered = p.detail.countries.list.length;
  }

  const date = today || new Date().toISOString().slice(0, 10);
  // publish.yml refuses a data change that did not bump this.
  next.meta.lastUpdated = date;

  const label = Object.keys(FIELD_BY_LABEL).find((k) => FIELD_BY_LABEL[k] === proposal.target.field);
  const drawn = (proposal.countries || []).map((c) => c.name + " (" + c.iso3 + ")" +
    (c.was ? " on the country map: " + c.was + " → " + c.now : " added to the country map as " + c.now));
  if (proposal.registeredCount) drawn.push("countries registered: " + proposal.registeredCount.was + " → " + proposal.registeredCount.now);
  const what = (proposal.changes
    ? proposal.changes.map((c) => SHORT[c.field] + (c.now === "" ? " cleared" : " set to “" + c.now + "”"))
    : [label + " updated to “" + proposal.now + "”"]).concat(drawn).join("; ");
  const names = (proposal.countries || []).map((c) => c.name).join(" and ");
  const staged = changesOf(proposal).length > 0;
  const by = proposal.decision && proposal.decision.by ? proposal.decision.by : "review";
  next.changelog.unshift({
    date,
    product: proposal.productName,
    change:
      proposal.stageName + ": " + what + ". Source: " +
      proposal.evidence.srcLabel + ", " + proposal.evidence.asOf +
      ". Proposed in issue #" + proposal.issue + ", approved by " + by + ".",
    // Public, so it keeps the stage's own capitals ("WHO PQ listing", not
    // "who pq listing") and names the source the way the Sources list does.
    plain:
      proposal.productName + " — " +
      (names && !staged ? names + " added to the country map"
        : proposal.stageName + " updated" + (names ? ", and " + names + " added to the country map" : "")) +
      " (source: " + proposal.evidence.srcLabel + ").",
  });
  return next;
}

// ---- what the bot says ---------------------------------------------------

function titleFor(p) {
  // A country in the title too, so two registers' proposals for one medicine
  // are two open issues, not one blocking the other.
  return "Proposal: " + p.productName + " · " + p.stageName +
    (p.countries && p.countries.length ? " · " + p.countries.map((c) => c.name).join(", ") : "");
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
    p.changes.forEach((c) => L.push("| **" + SHORT[c.field] + "** | " + bar(c.was || "_(empty)_") + " | " + (c.now === "" ? "_(cleared)_" : bar(c.now)) + " |"));
    (p.countries || []).forEach((c) => L.push("| **country map** | " + bar(c.name) + ": " + (c.was || "_(not on the map)_") + " | " + bar(c.name) + ": " + c.now + " |"));
    if (p.registeredCount) L.push("| **countries registered** | " + p.registeredCount.was + " | " + p.registeredCount.now + " |");
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
  const before = (findings && findings.rejectedBefore) || [];
  if (before.length) {
    L.push("> [!WARNING]");
    L.push("> **This exact change was rejected before** — " +
      before.map((d) => "#" + d.issue + " by @" + d.by + " on " + d.on + " (" + d.reason + ")").join("; ") +
      ". That compares the change, not its evidence: approve it only if the evidence is genuinely new.");
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
    res.rejectedBefore = rejectionsOf(built.proposal, readDecisions());
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

    // A stage that is now done has no next step: the watcher can clear it.
    const clearing = buildProposal(Object.assign({}, several, {
      "medicine": "alaq", "what happens next": "(clear)", "the date that next step is expected": "(clear)",
    }), { data, sources, issue: { number: 34, user: BOT } });
    const cn = clearing.ok && clearing.proposal.changes;
    ok("clears the next step when asked", cn && cn.find((c) => c.field === "next").now === "" &&
      cn.find((c) => c.field === "next").was !== "" && cn.find((c) => c.field === "nextDate").now === "", clearing.ok ? "" : clearing.errors.join("; "));
    if (clearing.ok) {
      const cres = checkApplied(data, clearing.proposal, "2026-09-22");
      const as = cres.applied.products.find((x) => x.id === "alaq").stages[3];
      ok("cleared fields apply empty, and pass the rules", as.next === "" && as.nextDate === "" && cres.errors.length === 0, cres.errors.join("; "));
      ok("the summary shows them as cleared", /_\(cleared\)_/.test(summaryMarkdown(clearing.proposal, cres)));
      ok("the changelog says cleared", /next step cleared/.test(cres.applied.changelog[0].change));
    }
  }

  // A register watcher's proposal: countries on the map, with or without the
  // stage. Built for the bot only, like any several-field proposal.
  const mapOnly = {
    "medicine": "dhappq",
    "which stage": "Country registration",
    "what changes": "Several fields at once (filed by the source watcher)",
    "country map": "UGA: registered",
    "source": "Tanzania: TMDA register",
    "date of the source": "2026-09-21",
  };
  const mo = buildProposal(mapOnly, { data, sources, issue: { number: 50, user: BOT } });
  ok("builds a country-only proposal for the watcher", mo.ok && mo.proposal.changes.length === 0 && mo.proposal.countries.length === 1, mo.ok ? "" : mo.errors.join("; "));
  ok("refuses a country line from a person", !buildProposal(mapOnly, { data, sources, issue: { number: 51, user: "KylerXiv" } }).ok);
  ok("refuses a line that is not ISO code: level",
    !buildProposal(Object.assign({}, mapOnly, { "country map": "Uganda: approved" }), { data, sources, issue: { number: 52, user: BOT } }).ok);
  // A country DHA–PPQ's map already draws as registered, citing the same
  // register and date the proposal would: nothing would change.
  const same = JSON.parse(JSON.stringify(data));
  const drawnReg = same.products.find((x) => x.id === "dhappq").detail.countries.list.find((e) => e.level === "registered");
  Object.assign(drawnReg, { sources: ["tmda"], checked: "2026-09-21" });
  const again2map = buildProposal(Object.assign({}, mapOnly, { "country map": drawnReg.iso3 + ": registered" }),
    { data: same, sources, issue: { number: 53, user: BOT } });
  ok("refuses a country already drawn at that level, citing the same source and date",
    !again2map.ok && /change nothing/.test(again2map.errors.join(" ")), again2map.ok ? "accepted" : again2map.errors.join("; "));
  if (mo.ok) {
    const mp = mo.proposal;
    ok("names the country, and records it was not on the map", mp.countries[0].name === "Uganda" && mp.countries[0].was === "");
    ok("puts the country in the title", titleFor(mp) === "Proposal: DHA–PPQ · Country registration · Uganda", titleFor(mp));
    const mres = checkApplied(data, mp, "2026-09-22");
    const md = mres.applied.products.find((x) => x.id === "dhappq");
    const was = data.products.find((x) => x.id === "dhappq");
    ok("draws the country at that level", md.detail.countries.list.some((e) => e.iso3 === "UGA" && e.level === "registered"));
    ok("keeps the stage, and its citation, as they were", JSON.stringify(md.stages[4]) === JSON.stringify(was.stages[4]));
    const uga = md.detail.countries.list.find((e) => e.iso3 === "UGA");
    ok("the new entry cites the register and the date it was read", uga && JSON.stringify(uga.sources) === JSON.stringify(["tmda"]) && uga.checked === "2026-09-21", uga);
    const reg = was.detail.country.registered;
    ok("the registered count is at least the countries drawn",
      Number.isInteger(reg) ? md.detail.country.registered === Math.max(reg, md.detail.countries.list.length) : md.detail.country.registered === reg, md.detail.country.registered);
    const tbc = JSON.parse(JSON.stringify(data)); tbc.products.find((x) => x.id === "dhappq").detail.country.registered = "TBC";
    ok("leaves a TBC count alone", applyProposal(tbc, mp, "2026-09-22").products.find((x) => x.id === "dhappq").detail.country.registered === "TBC");
    ok("the country-only result passes the rules", mres.errors.length === 0, mres.errors.join("; "));
    ok("the public changelog line names the country and the source",
      mres.applied.changelog[0].plain === "DHA–PPQ — Uganda added to the country map (source: Tanzania: TMDA register).", mres.applied.changelog[0].plain);
    ok("the summary shows the map row", /\| \*\*country map\*\* \| Uganda: _\(not on the map\)_ \| Uganda: registered \|/.test(summaryMarkdown(mp, mres)));
    ok("countries are part of the fingerprint", mp.fingerprint !== buildProposal(Object.assign({}, mapOnly, { "country map": "KEN: guidelines" }), { data, sources, issue: { number: 54, user: BOT } }).proposal.fingerprint);
  }
  const first = buildProposal(Object.assign({}, mapOnly, {
    "medicine": "ganlum", "country map": "NGA: registered",
    "the status of this stage": "in progress", "the date this stage was reached": "First registered 12 Mar 2027 (Nigeria)",
    "the sentence shown under this stage": "Registered in Nigeria: 1 presentation (NAFDAC A4-0001, Novartis), on 12 Mar 2027.",
  }), { data, sources, issue: { number: 55, user: BOT } });
  ok("builds a first registration: the stage and the map together", first.ok && first.proposal.changes.length === 3 && first.proposal.countries.length === 1, first.ok ? "" : first.errors.join("; "));
  if (first.ok) {
    const fres = checkApplied(data, first.proposal, "2026-09-22");
    const g = fres.applied.products.find((x) => x.id === "ganlum");
    ok("a medicine with no map gets one, as a draft with its warning", g.detail.countries.status === "draft" && g.detail.countries.note === NEW_MAP_NOTE && g.detail.countries.list.length === 1);
    ok("its registered count rises from 0 to 1", g.detail.country.registered === 1 && first.proposal.registeredCount.was === 0);
    ok("the stage carries the register's citation", g.stages[4].status === "prog" && /^Tanzania: TMDA register/.test(g.stages[4].source));
    ok("the first-registration result passes the rules", fres.errors.length === 0, fres.errors.join("; "));
    // Approved after another register's proposal drew a country first, it
    // counts both, whatever its snapshot said.
    const tza = buildProposal(Object.assign({}, mapOnly, { "medicine": "ganlum", "country map": "TZA: registered" }), { data, sources, issue: { number: 56, user: BOT } });
    const afterTza = checkApplied(data, tza.proposal, "2026-09-22").applied;
    const both = checkApplied(afterTza, first.proposal, "2026-09-23").applied.products.find((x) => x.id === "ganlum");
    ok("in either order, the count is the countries drawn", both.detail.country.registered === 2 && both.detail.countries.list.length === 2, both.detail.country.registered);
    ok("its changelog line says both", fres.applied.changelog[0].plain === "GanLum — Country registration updated, and Nigeria added to the country map (source: Tanzania: TMDA register).", fres.applied.changelog[0].plain);
  }

  // Nothing at all would change: refused. Only the citation changing: fine.
  // The fixture's proposal, filed again against the data it already produced.
  const noop = buildProposal(fields, { data: res.applied, sources, issue: { number: 40, user: "someone" } });
  ok("refuses a change that changes nothing", !noop.ok && /change nothing/.test((noop.errors || []).join(" ")),
    noop.ok ? "it was accepted" : noop.errors.join("; "));
  const reconfirm = buildProposal(Object.assign({}, fields, { "date of the source": "2026-09-29" }),
    { data: res.applied, sources, issue: { number: 41, user: "someone" } });
  ok("accepts the same value re-confirmed against a newer source date", reconfirm.ok, (reconfirm.errors || []).join("; "));

  // A change rejected before is flagged to the reviewer, by fingerprint.
  const flagged = summaryMarkdown(p, Object.assign({}, res, {
    rejectedBefore: rejectionsOf(p, [{ issue: 9, state: "rejected", by: "reviewer", on: "2026-09-01", reason: "rejected:wrong-value", fingerprint: p.fingerprint },
      { issue: 8, state: "approved", fingerprint: p.fingerprint }, { issue: 7, state: "rejected", fingerprint: "sha1:0000000000000000" }]),
  }));
  ok("warns when the same change was rejected before", /rejected before/.test(flagged) && /#9 by @reviewer/.test(flagged) && !/#8|#7/.test(flagged));

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
  CLEAR,
  COUNTRY_LABEL: "Country map",
  LEVELS,
  NEW_MAP_NOTE,
  countryName,
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
  readDecisions,
  rejectionsOf,
};

if (require.main === module) cli(process.argv.slice(2));
