#!/usr/bin/env node
// Tests for the Vercel function behind the illustrated journey page's
// "Subscribe for updates" — api/subscribe.js — and the shared api/_mail.js.
// api/feedback.js and its tests join these when Send feedback is connected.
//
// No network and no Resend key: global fetch is replaced with a stub that
// records every call and answers as Resend would, so these check exactly what
// would have been sent, and what the visitor would have been told.
//
//   node scripts/test-mail-api.js            run everything
//   node scripts/test-mail-api.js subscribe  run one group

const mail = require("../api/_mail.js");
const subscribe = require("../api/subscribe.js");

let pass = 0, fail = 0, only = process.argv[2];
const failures = [];
const queue = [];

function group(name, fn) {
  if (only && !name.toLowerCase().includes(only.toLowerCase())) return;
  queue.push(async () => { console.log("\n\x1b[1m" + name + "\x1b[0m"); await fn(); });
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

// ---- harness ---------------------------------------------------------------

const ENV = { RESEND_API_KEY: "re_test_key" };
const ENV_KEYS = ["RESEND_API_KEY"];
// Stands in for the ADDRESSES block in api/_mail.js, whatever it holds.
const ADDR = { from: "", to: ["team@example.org"], segment: "" };

// Resend's answers, queued per call; anything unqueued is a plain success.
let calls = [], answers = [];
global.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  const a = answers.shift() || { status: 200, body: { id: "stub-id" } };
  if (a.throws) throw a.throws;
  return { ok: a.status >= 200 && a.status < 300, status: a.status, json: async () => a.body };
};

// Captures console output so the no-submission-in-logs rule can be checked.
let logs = [];
const realLog = console.log, realError = console.error;
function quiet(fn) {
  logs = [];
  console.log = (...a) => logs.push(a.join(" "));
  console.error = (...a) => logs.push(a.join(" "));
  return Promise.resolve(fn()).finally(() => { console.log = realLog; console.error = realError; });
}

async function call(handler, { method = "POST", headers, body, bodyThrows, env = ENV, addr = ADDR, answer = [] } = {}) {
  ENV_KEYS.forEach(k => delete process.env[k]);
  Object.assign(process.env, env);
  Object.assign(mail.ADDRESSES, { from: addr.from || "", to: (addr.to || []).slice(), segment: addr.segment || "" });
  calls = []; answers = answer.slice();
  const req = {
    method,
    headers: Object.assign({ host: "launch.example.org", "content-type": "application/json" }, headers),
    get body() { if (bodyThrows) throw new SyntaxError("Unexpected token"); return body; }
  };
  const res = {
    statusCode: 200, headers: {}, raw: "",
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    end(s) { this.raw = s || ""; }
  };
  await quiet(() => handler(req, res));
  let json = null;
  try { json = JSON.parse(res.raw); } catch (e) { /* left null */ }
  return { status: res.statusCode, json, headers: res.headers, calls, logs };
}


// ---- groups ----------------------------------------------------------------

const SUB = { email: "reader@example.org" };

group("request guard", async () => {
  let r = await call(subscribe, { method: "GET" });
  is("GET is refused with 405", r.status, 405);
  is("  and says POST is what is allowed", r.headers.allow, "POST");

  r = await call(subscribe, { method: "OPTIONS" });
  is("a CORS preflight gets 405 and no CORS headers", [r.status, r.headers["access-control-allow-origin"]], [405, undefined]);

  r = await call(subscribe, { headers: { origin: "https://evil.example" }, body: SUB });
  is("another site's Origin is refused with 403", r.status, 403);
  is("  and nothing reaches Resend", r.calls.length, 0);

  r = await call(subscribe, { headers: { origin: "https://launch.example.org" }, body: SUB });
  is("the page's own Origin is accepted", r.status, 200);

  r = await call(subscribe, { headers: { host: "internal", "x-forwarded-host": "launch.example.org", origin: "https://launch.example.org" }, body: SUB });
  is("an Origin matching x-forwarded-host is accepted", r.status, 200);

  r = await call(subscribe, { headers: { origin: "not a url" }, body: SUB });
  is("a malformed Origin is refused", r.status, 403);

  r = await call(subscribe, { body: SUB });
  is("no Origin at all (curl) is let through to validation", r.status, 200);

  r = await call(subscribe, { headers: { "content-type": "text/plain" }, body: JSON.stringify(SUB) });
  is("text/plain is refused with 415", r.status, 415);

  r = await call(subscribe, { bodyThrows: true });
  is("malformed JSON is a 400, not a crash", r.status, 400);

  r = await call(subscribe, { body: ["a@b.co"] });
  is("a JSON array body is a 400", r.status, 400);

  r = await call(subscribe, { body: null });
  is("an empty body is a 400", r.status, 400);
});

group("configuration", async () => {
  let r = await call(subscribe, { env: {}, body: SUB });
  is("no RESEND_API_KEY → 503", r.status, 503);
  is("  and nothing reaches Resend", r.calls.length, 0);
  ok("  and the log names what is missing", r.logs.some(l => l.includes("RESEND_API_KEY") && l.includes("ADDRESSES.to")));

  r = await call(subscribe, { addr: { to: [] }, body: SUB });
  is("no ADDRESSES.to → 503", r.status, 503);

  r = await call(subscribe, { addr: { to: [" one@example.org ", "two@example.org", ""] }, body: SUB });
  is("ADDRESSES.to is a list, trimmed, blanks dropped", r.calls[1].body.to, ["one@example.org", "two@example.org"]);

  r = await call(subscribe, { body: SUB });
  is("ADDRESSES.from defaults to Resend's test sender", r.calls[1].body.from, "LAUNCH dashboard <onboarding@resend.dev>");

  r = await call(subscribe, { addr: Object.assign({}, ADDR, { from: "LAUNCH <updates@unitaid.example>" }), body: SUB });
  is("ADDRESSES.from overrides it", r.calls[1].body.from, "LAUNCH <updates@unitaid.example>");
});

group("subscribe", async () => {
  let r = await call(subscribe, { body: { email: "reader@example.org", page: "https://launch.example.org/x" } });
  is("a valid address is a 200 ok", [r.status, r.json && r.json.ok], [200, true]);
  is("  saving the contact first, then telling the team", r.calls.map(c => c.url),
     ["https://api.resend.com/contacts", "https://api.resend.com/emails"]);
  is("  the contact is just the address — no segment unless configured", r.calls[0].body, { email: "reader@example.org" });
  is("  the team's note goes to ADDRESSES.to", r.calls[1].body.to, ["team@example.org"]);
  ok("  and names the address and page", r.calls[1].body.text.includes("Email: reader@example.org") && r.calls[1].body.text.includes("Page: https://launch.example.org/x"));
  ok("  nothing is ever sent to the subscriber", r.calls.every(c => c.url.endsWith("/contacts") || !JSON.stringify(c.body.to).includes("reader@example.org")));

  r = await call(subscribe, { addr: Object.assign({}, ADDR, { segment: "seg_123" }), body: { email: "reader@example.org" } });
  is("ADDRESSES.segment adds the contact to that segment", r.calls[0].body.segments, [{ id: "seg_123" }]);

  r = await call(subscribe, { body: { email: "reader@example.org" }, answer: [{ status: 409, body: { name: "conflict" } }] });
  is("already a contact (409) still counts as subscribed", [r.status, r.calls.length], [200, 2]);

  r = await call(subscribe, { body: { email: "reader@example.org" }, answer: [{ status: 401, body: { name: "restricted_api_key", message: "This API key is restricted to only send emails." } }] });
  is("a sending-only key cannot save contacts → 502", r.status, 502);
  is("  and the team is not told of a subscriber who was not saved", r.calls.length, 1);
  ok("  and the log says why", r.logs.some(l => l.includes("restricted_api_key")));

  r = await call(subscribe, { body: { email: "reader@example.org" }, answer: [{ status: 200, body: { id: "c1" } }, { status: 500, body: { name: "application_error" } }] });
  is("the team's note failing does not undo the subscription", [r.status, r.json.ok], [200, true]);
  ok("  but it is logged", r.logs.some(l => l.includes("notify team failed")));

  r = await call(subscribe, { body: { email: "nope" } });
  is("a malformed address is a 400", r.status, 400);
  is("  and nothing reaches Resend", r.calls.length, 0);

  r = await call(subscribe, { body: { email: "a@b.co\r\nBcc: victim@example.org" } });
  is("an address with a smuggled header line is refused", r.status, 400);

  r = await call(subscribe, { body: { email: 12345 } });
  is("a non-string address is a 400, not a crash", r.status, 400);
});

group("logs never carry the submission", async () => {
  let r = await call(subscribe, { body: { email: "private.person@example.org" } });
  ok("a subscription does not log the address", r.logs.every(l => !l.includes("private.person")), JSON.stringify(r.logs));

  r = await call(subscribe, { body: { email: "private.person@example.org" }, answer: [{ status: 500, body: { name: "application_error", message: "An unexpected error occurred." } }] });
  ok("a failed subscription does not log the address either",
     r.logs.length > 0 && r.logs.every(l => !l.includes("private.person")), JSON.stringify(r.logs));
});

(async () => {
  for (const run of queue) await run();
  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) console.log("Failed:\n  " + failures.join("\n  "));
  process.exit(fail ? 1 : 0);
})();
