#!/usr/bin/env node
// Tests for scripts/notify-subscribers.js, the daily update email to
// subscribers. No network and no Resend key: global fetch is replaced with a
// stub that records every call and answers as Resend would.
//
//   node scripts/test-notify-subscribers.js

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const N = require("./notify-subscribers.js");
const mail = require("../api/_mail.js");

let pass = 0, fail = 0;
const failures = [];
const queue = [];
function group(name, fn) { queue.push(async () => { console.log("\n\x1b[1m" + name + "\x1b[0m"); await fn(); }); }
function ok(label, cond, detail) {
  if (cond) { pass++; console.log("  \x1b[32mok\x1b[0m   " + label); }
  else { fail++; failures.push(label); console.log("  \x1b[31mFAIL\x1b[0m " + label + (detail !== undefined ? "\n         got " + JSON.stringify(detail) : "")); }
}

// ---- fixtures ----------------------------------------------------------------

const line = (date, product, change, plain) => ({ date, product, change, plain });
const OLD = [
  line("2026-10-01", "All", "Removed the study layers.", "We removed the drug-resistance results from the map."),
  line("2026-09-08", "ASPY", "Ghana adoption added.", "We found a real example of a country acting on WHO's advice.")
];
const before = { meta: { lastUpdated: "2026-10-01" }, changelog: OLD.slice() };
const withNew = (...fresh) => ({ meta: { lastUpdated: "2026-10-05" }, changelog: [...fresh, ...OLD] });

function tmpData(obj) {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "notify-")), "products.js");
  fs.writeFileSync(f, "// fixture\nwindow.LAUNCH_DATA =\n" + JSON.stringify(obj, null, 2) + "\n");
  return f;
}

// fetch stub: `answers` maps "METHOD path" to a body (or a function of the
// request); anything else is a 500.
function stubFetch(answers) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    const u = new URL(url);
    const keyed = (init.method || "GET") + " " + u.pathname + u.search;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ key: keyed, body, auth: init.headers && init.headers.Authorization });
    let a = answers[keyed];
    if (typeof a === "function") a = a(body);
    if (a === undefined) return new Response(JSON.stringify({ name: "stub", message: "no answer for " + keyed }), { status: 500 });
    return new Response(JSON.stringify(a.body !== undefined ? a.body : a), { status: a.status || 200 });
  };
  return calls;
}
const realFetch = global.fetch;

async function withKey(key, fn) {
  const saved = process.env.RESEND_API_KEY;
  if (key === null) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = key;
  try { return await fn(); } finally {
    if (saved === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = saved;
    global.fetch = realFetch;
  }
}

// ---- which lines are new -----------------------------------------------------

group("Which changelog lines are new", () => {
  const added = line("2026-10-05", "GanLum", "Stage set.", "GanLum — regulatory approval was updated from the EMA list.");
  ok("an added line is new", JSON.stringify(N.freshEntries(before, withNew(added))) === JSON.stringify([added]));
  ok("nothing added, nothing new", N.freshEntries(before, withNew()).length === 0);

  const reworded = { meta: { lastUpdated: "2026-10-05" }, changelog: [line("2026-09-08", "ASPY", "Ghana adoption added, corrected.", "x"), OLD[0]] };
  ok("an older line whose wording was corrected is not news", N.freshEntries(before, reworded).length === 0);

  const plainOnly = { meta: { lastUpdated: "2026-10-05" }, changelog: OLD.map((e) => ({ ...e, plain: e.plain + " (reworded)" })) };
  ok("a reworded public sentence alone is not sent again", N.freshEntries(before, plainOnly).length === 0);

  const sameDay = line("2026-10-01", "ALAQ", "Trial renamed.", "We renamed the trial.");
  ok("a line added later on the last email's own day is new", N.freshEntries(before, withNew(sameDay)).length === 1);

  const reverted = { meta: { lastUpdated: "2026-10-05" }, changelog: OLD.slice() };
  ok("a proposal applied and reverted between two runs sends nothing", N.freshEntries(before, reverted).length === 0);
});

// ---- the email ---------------------------------------------------------------

group("What the email says", () => {
  ok("a line about one medicine is led by its name", N.sentence(OLD[1]) === "ASPY: We found a real example of a country acting on WHO's advice.");
  ok("a line about the whole page is left as it is", N.sentence(OLD[0]) === OLD[0].plain);
  const p = line("2026-10-05", "GanLum", "x", "GanLum — regulatory approval was updated from the EMA list.");
  ok("a proposal's line, which already names it, is not named twice", N.sentence(p) === p.plain);
  ok("no public sentence falls back to the internal one", N.sentence(line("2026-10-05", "ALAQ", "Internal note.")) === "ALAQ: Internal note.");

  ok("the subject names the medicines", N.subjectFor([p, OLD[1], OLD[0]]) === "LAUNCH dashboard updated: GanLum, ASPY");
  ok("page-wide changes only: a plain subject", N.subjectFor([OLD[0]]) === "LAUNCH dashboard updated");

  const e = N.compose([p, OLD[1]]);
  ok("text and HTML both carry Resend's unsubscribe placeholder", e.text.includes(N.UNSUBSCRIBE) && e.html.includes('href="' + N.UNSUBSCRIBE + '"'));
  ok("it links to the public dashboard", e.html.includes(N.SITE + mail.DASHBOARD) && /^https:\/\//.test(N.SITE));
  ok("dates across months are both written in full", e.text.includes("updated between 8 September 2026 and 5 October 2026:"));
  ok("dates within a month read 'between 1 and 5 October 2026'",
    N.compose([line("2026-10-05", "All", "a", "A."), line("2026-10-01", "All", "b", "B.")]).text.includes("updated between 1 and 5 October 2026:"));
  ok("one day reads 'on 5 October 2026'", N.compose([p]).text.includes("updated on 5 October 2026:"));

  const evil = N.compose([line("2026-10-05", "<b>X</b>", "x", "<script>alert(1)</script> & more")]);
  ok("everything from the data is escaped in the HTML", !evil.html.includes("<script>") && evil.html.includes("&lt;script&gt;") && !evil.html.includes("<b>X</b>"));

  const many = Array.from({ length: N.MAX_LINES + 3 }, (_, i) => line("2026-10-05", "All", "c" + i, "Change " + i + "."));
  const long = N.compose(many);
  ok("a long round-up lists the first " + N.MAX_LINES + " and counts the rest",
    long.text.includes("Change " + (N.MAX_LINES - 1) + ".") && !long.text.includes("Change " + N.MAX_LINES + ".") && long.text.includes("and 3 more changes"));

  const pv = N.compose([p], { preview: true });
  ok("a preview says so in its subject and first line", pv.subject.startsWith("[Preview] ") && pv.text.includes("Preview for the team"));
  ok("a preview carries no unfilled placeholder", !pv.text.includes("{{{") && !pv.html.includes("{{{"));
});

group("The broadcast's name", () => {
  const a = line("2026-10-05", "GanLum", "x", "y");
  ok("is the same for the same lines", N.broadcastName([a, OLD[1]]) === N.broadcastName([a, OLD[1]]));
  ok("differs when the lines differ", N.broadcastName([a]) !== N.broadcastName([a, OLD[1]]));
  ok("does not change when only the public sentence is reworded", N.broadcastName([a]) === N.broadcastName([{ ...a, plain: "z" }]));
  ok("starts with the latest date", /^LAUNCH update 2026-10-05 [0-9a-f]{12}$/.test(N.broadcastName([a, OLD[1]])));
});

// ---- sending -----------------------------------------------------------------

const added = line("2026-10-05", "GanLum", "Stage set.", "GanLum — regulatory approval was updated from the EMA list.");
const sinceFile = tmpData(before);
const dataFile = tmpData(withNew(added));

group("Send: a new broadcast to the subscriber segment", () => withKey("re_test", async () => {
  const calls = stubFetch({
    "GET /broadcasts?limit=100": { object: "list", has_more: false, data: [] },
    "POST /broadcasts": { object: "broadcast", id: "bc-1" }
  });
  const r = await N.run({ mode: "send", sinceFile, dataFile });
  ok("exits 0", r.code === 0, r);
  const create = calls.find((c) => c.key === "POST /broadcasts");
  ok("creates one broadcast and sends it in the same call", !!create && create.body.send === true && calls.length === 2);
  ok("to the segment in api/_mail.js", create && create.body.segment_id === mail.ADDRESSES.segment);
  ok("from the sender in api/_mail.js", create && create.body.from === mail.ADDRESSES.from);
  ok("named after its lines", create && create.body.name === N.broadcastName([added]));
  ok("with the placeholder for each recipient's unsubscribe link", create && create.body.html.includes(N.UNSUBSCRIBE) && create.body.text.includes(N.UNSUBSCRIBE));
  ok("using the key from the environment", calls.every((c) => c.auth === "Bearer re_test"));
  ok("and says which broadcast", r.lines.some((l) => l.includes("bc-1")));
}));

group("Send: a re-run after a send sends nothing twice", () => withKey("re_test", async () => {
  const calls = stubFetch({
    "GET /broadcasts?limit=100": { object: "list", data: [{ id: "bc-1", name: N.broadcastName([added]), status: "sent" }] }
  });
  const r = await N.run({ mode: "send", sinceFile, dataFile });
  ok("exits 0", r.code === 0, r);
  ok("makes no second broadcast", calls.length === 1 && !calls.some((c) => c.key.startsWith("POST")));
  ok("and says it was already sent", r.lines.some((l) => /Already sent as broadcast bc-1/.test(l)));
}));

group("Send: a draft left by a failed run is sent, not copied", () => withKey("re_test", async () => {
  const calls = stubFetch({
    "GET /broadcasts?limit=100": { object: "list", data: [{ id: "bc-9", name: N.broadcastName([added]), status: "draft" }] },
    "POST /broadcasts/bc-9/send": { id: "bc-9" }
  });
  const r = await N.run({ mode: "send", sinceFile, dataFile });
  ok("exits 0", r.code === 0, r);
  ok("sends the draft", calls.some((c) => c.key === "POST /broadcasts/bc-9/send"));
  ok("creates nothing new", !calls.some((c) => c.key === "POST /broadcasts"));
}));

group("Send: failures fail the run", () => withKey("re_test", async () => {
  stubFetch({ "GET /broadcasts?limit=100": { object: "list", data: [] }, "POST /broadcasts": { status: 422, body: { name: "validation_error", message: "bad" } } });
  const r = await N.run({ mode: "send", sinceFile, dataFile });
  ok("a refused broadcast exits 1", r.code === 1 && r.lines.some((l) => /Not sent: creating the broadcast failed: HTTP 422/.test(l)), r);

  stubFetch({ "GET /broadcasts?limit=100": { status: 401, body: { name: "restricted_api_key", message: "no" } } });
  const r2 = await N.run({ mode: "send", sinceFile, dataFile });
  ok("a key that cannot list broadcasts exits 1, before sending anything", r2.code === 1 && r2.lines.some((l) => /listing broadcasts failed: HTTP 401/.test(l)), r2);
}));

group("Send: no key, no send", () => withKey(null, async () => {
  const calls = stubFetch({});
  const r = await N.run({ mode: "send", sinceFile, dataFile });
  ok("exits 1 and says why", r.code === 1 && r.lines.some((l) => /RESEND_API_KEY is not set/.test(l)), r);
  ok("calls nothing", calls.length === 0);
  const r2 = await N.run({ mode: "send", sinceFile, dataFile: sinceFile });
  ok("fails even on a day with nothing to send, so a missing key shows at once", r2.code === 1, r2);
  const r3 = await N.run({ mode: "preview", sinceFile, dataFile });
  ok("a preview needs the key too", r3.code === 1, r3);
  const r4 = await N.run({ sinceFile, dataFile });
  ok("a dry run does not", r4.code === 0, r4);
}));

group("Send: nothing new, nothing sent", () => withKey("re_test", async () => {
  const calls = stubFetch({});
  const r = await N.run({ mode: "send", sinceFile, dataFile: sinceFile });
  ok("exits 0", r.code === 0, r);
  ok("calls nothing", calls.length === 0);
}));

group("Send: the first run only marks the starting point", () => withKey("re_test", async () => {
  const calls = stubFetch({});
  const r = await N.run({ mode: "send", dataFile });
  ok("exits 0", r.code === 0, r);
  ok("sends nothing, even with lines in the changelog", calls.length === 0);
  ok("and says so", r.lines.some((l) => /only marks the starting point/.test(l)));
}));

group("Preview: the team inbox only", () => withKey("re_test", async () => {
  const calls = stubFetch({ "POST /emails": { id: "em-1" } });
  const r = await N.run({ mode: "preview", sinceFile, dataFile });
  ok("exits 0", r.code === 0, r);
  const sent = calls.find((c) => c.key === "POST /emails");
  ok("is one ordinary email, never a broadcast", calls.length === 1 && !!sent);
  ok("to the team inbox in api/_mail.js", sent && JSON.stringify(sent.body.to) === JSON.stringify(mail.ADDRESSES.to));
  ok("marked as a preview", sent && sent.body.subject.startsWith("[Preview] "));

  const calls2 = stubFetch({ "POST /emails": { id: "em-2" } });
  const r2 = await N.run({ mode: "preview", sinceFile, dataFile: sinceFile });
  const s2 = calls2.find((c) => c.key === "POST /emails");
  ok("with nothing new, it previews the latest line and says it is a sample",
    r2.code === 0 && s2 && s2.body.text.includes("as a sample") && s2.body.text.includes(OLD[0].plain), r2);
}));

group("Dry run (the default): prints, sends nothing", () => withKey("re_test", async () => {
  const calls = stubFetch({});
  const r = await N.run({ sinceFile, dataFile });
  ok("exits 0", r.code === 0, r);
  ok("calls nothing", calls.length === 0);
  ok("prints the subject", r.lines.includes("Subject: LAUNCH dashboard updated: GanLum"));
}));

group("Command line", () => {
  const cli = (args) => {
    try { return { code: 0, out: execFileSync(process.execPath, [path.join(__dirname, "notify-subscribers.js"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, RESEND_API_KEY: "", GITHUB_STEP_SUMMARY: "" } }) }; }
    catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; }
  };
  const a = cli(["--since-file", sinceFile, "--data", dataFile]);
  ok("a dry run from the command line exits 0", a.code === 0 && a.out.includes("Dry run: nothing sent."), a);
  ok("an unknown mode exits 2", cli(["--mode", "blast", "--since-file", sinceFile]).code === 2);
  ok("an unknown argument exits 2", cli(["--everyone"]).code === 2);
  ok("--since refuses anything but a commit hash", cli(["--since", "main;rm -rf /"]).code === 1);
  const real = cli([]);
  ok("on the real data file, with no earlier email, a dry run says a send would only mark the start", real.code === 0 && real.out.includes("would only mark the starting point"), real);
});

group("The addresses it sends with", () => {
  ok("a sender on a verified domain is set", /<[^@\s]+@[^@\s]+>$/.test(mail.ADDRESSES.from));
  ok("a subscriber segment is set", /^[0-9a-f-]{36}$/.test(mail.ADDRESSES.segment));
});

(async () => {
  for (const t of queue) await t();
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log("Failed:\n  " + failures.join("\n  ")); process.exit(1); }
})();
