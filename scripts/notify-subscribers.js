#!/usr/bin/env node
// Emails everyone subscribed on the illustrated journey page about what has
// changed on the dashboard since the last update email.
//
// "What changed" is the changelog in data/products.js: every line added since
// the version the last update email was built from. Each approved proposal
// adds one, and so does every hand edit that records itself, so the changelog
// already says, in plain English, what a subscriber was promised to hear about.
//
// The email goes out as a Resend broadcast to ADDRESSES.segment in
// api/_mail.js, the segment that confirmed subscribers join. Resend gives each
// recipient their own unsubscribe link ({{{RESEND_UNSUBSCRIBE_URL}}}) and never
// sends to a contact who has unsubscribed, by either that link or this repo's
// own unsubscribe page (both set the same flag).
//
// Run once a day by .github/workflows/notify-subscribers.yml, which works out
// --since from the last run that sent. See docs/subscriber-updates-notes.md.
//
//   node scripts/notify-subscribers.js --since <commit>            dry run: print it, send nothing
//   node scripts/notify-subscribers.js --since <commit> --mode preview   email the team inbox only
//   node scripts/notify-subscribers.js --since <commit> --mode send      email every subscriber
//
// --since-file <path> reads the earlier version from a file instead of git
// (the tests use it). With neither, there is no earlier update email: nothing
// is sent, and the run only marks where the next one starts.
//
// preview and send need RESEND_API_KEY, with Full access: a sending-only key
// cannot create a broadcast.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const mail = require("../api/_mail.js");

// The public site the email links to. Not secret, so it lives here, where a
// change is reviewed. Change it when the dashboard moves to its real domain.
const SITE = "https://launch-development-test.vercel.app";

// Resend fills this in per recipient, in both the HTML and the text.
const UNSUBSCRIBE = "{{{RESEND_UNSUBSCRIBE_URL}}}";

// A day's round-up rarely holds more than a few lines; a bulk edit can hold
// many more. Past this many, the email lists these and points to the page.
const MAX_LINES = 20;

const ROOT = path.join(__dirname, "..");

// ---- reading the data --------------------------------------------------------

function parseData(raw, where) {
  const m = raw.match(/^window\.LAUNCH_DATA\s*=\s*/m);
  if (!m) throw new Error(where + ": no `window.LAUNCH_DATA =` line");
  return JSON.parse(raw.slice(m.index + m[0].length).replace(/;?\s*$/, ""));
}

function readSince(opts) {
  if (opts.sinceFile) return parseData(fs.readFileSync(opts.sinceFile, "utf8"), opts.sinceFile);
  if (!opts.since) return null;
  // execFileSync, not a shell: the commit comes from an API answer.
  if (!/^[0-9a-f]{7,40}$/i.test(opts.since)) throw new Error("--since must be a commit hash");
  const raw = execFileSync("git", ["show", opts.since + ":data/products.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
  return parseData(raw, "data/products.js at " + opts.since);
}

// The lines a subscriber has not been sent yet: in the changelog now, not in
// the version the last email was built from, and dated no earlier than that
// version's lastUpdated. The date floor matters: correcting the wording of an
// old line makes it look new to the first test, and it is not news.
//
// A line is matched on date, medicine and the internal `change` text, never on
// `plain`, so rewording the public sentence (a translation fix, say) does not
// send it again.
function freshEntries(before, now) {
  const key = (e) => [e.date, e.product, e.change].join("\u0000");
  const seen = new Set((before.changelog || []).map(key));
  const floor = (before.meta && before.meta.lastUpdated) || "";
  return (now.changelog || []).filter((e) => !seen.has(key(e)) && (e.date || "") >= floor);
}

// ---- the email ---------------------------------------------------------------

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

function longDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso);
}

// "on 5 October 2026", or "between 3 and 5 October 2026" when a round-up
// spans days (a missed run, or a line dated before it was approved).
function when(entries) {
  const dates = [...new Set(entries.map((e) => e.date).filter(Boolean))].sort();
  if (!dates.length) return "";
  if (dates.length === 1) return "on " + longDate(dates[0]);
  const first = dates[0], last = dates[dates.length - 1];
  // "between 1 and 2 October 2026" within a month, both dates in full across months.
  const start = first.slice(0, 7) === last.slice(0, 7) ? String(Number(first.slice(8, 10))) : longDate(first);
  return "between " + start + " and " + longDate(last);
}

// The public sentence, led by the medicine it is about. Most lines say "this
// medicine", so the name has to come first. Lines about the whole page
// ("All") and lines that already start with the name (a proposal writes
// "GanLum — regulatory approval was updated …") are left as they are.
function sentence(e) {
  const text = String(e.plain || e.change || "").trim();
  const product = String(e.product || "").trim();
  if (!product || product === "All" || text.startsWith(product)) return text;
  return product + ": " + text;
}

function subjectFor(entries) {
  const names = [...new Set(entries.map((e) => String(e.product || "").trim()))]
    .filter((p) => p && p !== "All");
  return names.length ? "LAUNCH dashboard updated: " + names.join(", ") : "LAUNCH dashboard updated";
}

// The same letter() as the welcome email, so the two look alike. `preview`
// adds a line for the team and points the unsubscribe link at the page,
// because only Resend's broadcast fills in the real one.
function compose(entries, { preview = false, sample = false } = {}) {
  const shown = entries.slice(0, MAX_LINES);
  const more = entries.length - shown.length;
  const paras = [];
  if (preview) {
    paras.push(sample
      ? "Preview for the team, using the latest changelog line as a sample: nothing has changed since the last update email, so subscribers would get nothing today."
      : "Preview for the team: this is the email subscribers will get in the next update. Its unsubscribe link works only in the real one.");
  }
  paras.push(`The LAUNCH Transparency Dashboard was updated ${when(entries)}:`.replace(/ :$/, ":"));
  shown.forEach((e) => paras.push(sentence(e)));
  if (more > 0) paras.push(`… and ${more} more change${more === 1 ? "" : "s"}, listed on the dashboard.`);

  const body = mail.letter({
    heading: "What changed on the dashboard",
    paras,
    button: { label: "Open the dashboard", href: SITE + mail.DASHBOARD },
    small: [
      { text: "You're getting this because you subscribed to updates from the LAUNCH Transparency Dashboard." },
      { text: "Don't want these emails?", link: preview ? SITE + mail.DASHBOARD : UNSUBSCRIBE, linkLabel: "Unsubscribe" }
    ],
    // a broadcast takes no attachments, so its logo is loaded from the site
    site: SITE,
    logo: "hosted"
  });
  return { subject: (preview ? "[Preview] " : "") + subjectFor(entries), ...body };
}

// The broadcast's name in Resend. Built from the lines it carries, so a re-run
// of a run that sent (one that failed after Resend accepted it) finds its own
// broadcast and sends nothing twice. Broadcasts take no idempotency key, so
// this is the check.
function broadcastName(entries) {
  const latest = entries.map((e) => e.date).filter(Boolean).sort().pop() || "undated";
  const digest = crypto.createHash("sha256")
    .update(entries.map((e) => [e.date, e.product, e.change].join("\u0000")).join("\n"))
    .digest("hex").slice(0, 12);
  return `LAUNCH update ${latest} ${digest}`;
}

// ---- sending -----------------------------------------------------------------

async function sendPreview(cfg, email) {
  const r = await mail.sendEmail(cfg, { ...email, form: "subscriber-update-preview" });
  if (!r.ok) throw new Error(`preview email failed: HTTP ${r.status} ${r.name} ${r.message}`.trim());
  return { emailed: "team inbox", id: r.data && r.data.id };
}

async function sendBroadcast(cfg, email, name) {
  if (!cfg.segment) throw new Error("ADDRESSES.segment in api/_mail.js is empty: there is no list to send to");

  const list = await mail.resendRequest(cfg, "GET", "/broadcasts?limit=100");
  if (!list.ok) throw new Error(`listing broadcasts failed: HTTP ${list.status} ${list.name} ${list.message}`.trim());
  const mine = ((list.data && list.data.data) || []).find((b) => b.name === name);
  if (mine && mine.status !== "draft") return { already: true, id: mine.id, status: mine.status };
  if (mine) {
    // Created, but the send never went through: send that one, not a copy.
    const r = await mail.resendRequest(cfg, "POST", "/broadcasts/" + encodeURIComponent(mine.id) + "/send", {});
    if (!r.ok) throw new Error(`sending broadcast ${mine.id} failed: HTTP ${r.status} ${r.name} ${r.message}`.trim());
    return { id: mine.id, resumed: true };
  }

  const r = await mail.resendRequest(cfg, "POST", "/broadcasts", {
    segment_id: cfg.segment,
    from: cfg.from,
    subject: email.subject,
    html: email.html,
    text: email.text,
    name,
    send: true
  });
  if (!r.ok) throw new Error(`creating the broadcast failed: HTTP ${r.status} ${r.name} ${r.message}`.trim());
  return { id: r.data && r.data.id };
}

function config() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  const to = mail.ADDRESSES.to.map((s) => s.trim()).filter(Boolean);
  return {
    key,
    to,
    from: mail.ADDRESSES.from.trim() || "LAUNCH dashboard <onboarding@resend.dev>",
    segment: mail.ADDRESSES.segment.trim() || null
  };
}

// ---- the run -----------------------------------------------------------------

// Returns { code, lines }: what to print, and the exit code. No address is
// ever printed: the only ones here are the team inbox and the segment, and
// Resend holds the subscribers.
async function run(opts) {
  const out = [];
  const mode = opts.mode || "dry-run";
  if (!["dry-run", "preview", "send"].includes(mode)) return { code: 2, lines: ["--mode must be dry-run, preview or send"] };

  // Checked first, even on a day with nothing to send, so a missing or
  // mistyped secret fails the very next run instead of the first busy one.
  const cfg = mode === "dry-run" ? null : config();
  if (mode !== "dry-run" && !cfg) return { code: 1, lines: ["RESEND_API_KEY is not set, so nothing was sent."] };

  const now = parseData(fs.readFileSync(opts.dataFile || path.join(ROOT, "data", "products.js"), "utf8"), "data/products.js");
  const before = readSince(opts);

  let entries = before ? freshEntries(before, now) : [];
  if (!before && mode === "send") {
    out.push("No earlier update email, so this run only marks the starting point.",
      "Changes from now on go to subscribers in the next update email.");
  } else if (!before) {
    // Only a send run is a starting point: the workflow looks for "(send)".
    out.push("No earlier update email to compare with: a send now would only mark the starting point.");
  } else {
    out.push(`${entries.length} new changelog line${entries.length === 1 ? "" : "s"} since ${opts.since || opts.sinceFile}.`);
  }

  // A preview always has something to show.
  const sample = mode === "preview" && !entries.length;
  if (sample) entries = (now.changelog || []).slice(0, 1);
  if (!entries.length) return { code: 0, lines: out.concat("Nothing to send.") };

  const email = compose(entries, { preview: mode === "preview", sample });
  out.push("Subject: " + email.subject, "", email.text);
  if (mode === "dry-run") return { code: 0, lines: out.concat("Dry run: nothing sent.") };

  try {
    if (mode === "preview") {
      await sendPreview(cfg, email);
      return { code: 0, lines: out.concat("Preview emailed to the team inbox.") };
    }
    const name = broadcastName(entries);
    const r = await sendBroadcast(cfg, email, name);
    if (r.already) return { code: 0, lines: out.concat(`Already sent as broadcast ${r.id} (${r.status}); nothing sent again.`) };
    return { code: 0, lines: out.concat(`Sent to subscribers as broadcast ${r.id}` + (r.resumed ? " (a draft left by an earlier run)" : "") + ` — "${name}".`) };
  } catch (err) {
    return { code: 1, lines: out.concat("Not sent: " + err.message) };
  }
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => { const v = argv[++i]; if (v === undefined) throw new Error(a + " needs a value"); return v; };
    if (a === "--since") opts.since = val();
    else if (a === "--since-file") opts.sinceFile = val();
    else if (a === "--data") opts.dataFile = val();
    else if (a === "--mode") opts.mode = val();
    else throw new Error("unknown argument " + a);
  }
  return opts;
}

if (require.main === module) {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (err) { console.error(err.message); process.exit(2); }
  run(opts).then(({ code, lines }) => {
    console.log(lines.join("\n"));
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "```\n" + lines.join("\n") + "\n```\n");
    }
    process.exit(code);
  }, (err) => { console.error("Not sent: " + err.message); process.exit(1); });
}

module.exports = { SITE, UNSUBSCRIBE, MAX_LINES, parseData, freshEntries, sentence, subjectFor, compose, broadcastName, sendBroadcast, run, parseArgs };
