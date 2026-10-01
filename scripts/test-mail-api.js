#!/usr/bin/env node
// Tests for the Vercel functions behind the illustrated journey page's
// "Subscribe for updates" — api/subscribe.js, api/confirm.js and
// api/unsubscribe.js — and the shared api/_mail.js. api/feedback.js and its
// tests join these when Send feedback is connected.
//
// No network and no Resend key: global fetch is replaced with a stub that
// records every call and answers as Resend would, so these check exactly what
// would have been sent, and what the visitor would have been told.
//
//   node scripts/test-mail-api.js            run everything
//   node scripts/test-mail-api.js confirm    run the groups whose name matches

const mail = require("../api/_mail.js");
const subscribe = require("../api/subscribe.js");
const confirm = require("../api/confirm.js");
const unsubscribe = require("../api/unsubscribe.js");

// The addresses as committed, copied before any test below swaps in its own.
const SHIPPED = JSON.parse(JSON.stringify(mail.ADDRESSES));

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

const SECRET = "test-secret-0123456789abcdef0123456789abcdef";
const ENV = { RESEND_API_KEY: "re_test_key", UNSUBSCRIBE_SECRET: SECRET };
const ENV_KEYS = ["RESEND_API_KEY", "UNSUBSCRIBE_SECRET"];
// Stands in for the ADDRESSES block in api/_mail.js, whatever it holds.
const ADDR = { from: "", to: ["team@example.org"], segment: "" };
const SEG = { from: "", to: ["team@example.org"], segment: "seg_123" };
const HOST = "launch.example.org";
const DAY = 86400 * 1000;

// Resend's answers, queued per call; anything unqueued is a plain success.
let calls = [], answers = [];
global.fetch = async (url, init) => {
  calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined });
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

async function call(handler, { method = "POST", url = "/", headers, body, bodyThrows, env = ENV, addr = ADDR, answer = [] } = {}) {
  ENV_KEYS.forEach(k => delete process.env[k]);
  Object.assign(process.env, env);
  Object.assign(mail.ADDRESSES, { from: addr.from || "", to: (addr.to || []).slice(), segment: addr.segment || "" });
  calls = []; answers = answer.slice();
  const req = {
    method, url,
    headers: Object.assign({ host: HOST, "content-type": "application/json" }, headers),
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
  // `shown`: a page's text as a browser shows it, entities decoded, so the
  // checks below read "You're", not "You&#39;re". `raw` stays as sent.
  const shown = res.raw.replace(/<[^>]*>/g, " ").replace(/&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  return { status: res.statusCode, json, raw: res.raw, shown, headers: res.headers, calls, logs };
}

const token = (purpose, email = "reader@example.org", now) => mail.makeToken(SECRET, purpose, email, now);
const FORM = { "content-type": "application/x-www-form-urlencoded", origin: "https://" + HOST };
// A link's token, read back out of an email or page.
const tokenIn = (s, path) => { const m = new RegExp(path.replace(/\//g, "\\/") + "\\?t=([A-Za-z0-9_-]+)").exec(s || ""); return m && m[1]; };
const pathOf = (c) => c.method + " " + c.url.replace("https://api.resend.com", "");

// Resend answers for each kind of lookup.
const NO_CONTACT = { status: 404, body: { name: "not_found", message: "Contact not found" } };
const SUBSCRIBED = { status: 200, body: { object: "contact", id: "c1", email: "reader@example.org", unsubscribed: false } };
const UNSUBSCRIBED = { status: 200, body: { object: "contact", id: "c1", email: "reader@example.org", unsubscribed: true } };

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

  r = await call(subscribe, { headers: { origin: "https://" + HOST }, body: SUB });
  is("the page's own Origin is accepted", r.status, 200);

  r = await call(subscribe, { headers: { host: "internal", "x-forwarded-host": HOST, origin: "https://" + HOST }, body: SUB });
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
  let r = await call(subscribe, { env: { UNSUBSCRIBE_SECRET: SECRET }, body: SUB });
  is("no RESEND_API_KEY → 503", r.status, 503);
  is("  and nothing reaches Resend", r.calls.length, 0);
  ok("  and the log names what is needed", r.logs.some(l => l.includes("RESEND_API_KEY") && l.includes("UNSUBSCRIBE_SECRET") && l.includes("ADDRESSES.to")));

  r = await call(subscribe, { env: { RESEND_API_KEY: "re_x" }, body: SUB });
  is("no UNSUBSCRIBE_SECRET → 503", r.status, 503);

  r = await call(subscribe, { env: { RESEND_API_KEY: "re_x", UNSUBSCRIBE_SECRET: "too-short" }, body: SUB });
  is("an UNSUBSCRIBE_SECRET under 32 characters → 503", r.status, 503);

  r = await call(subscribe, { addr: { to: [] }, body: SUB });
  is("no ADDRESSES.to → 503", r.status, 503);

  r = await call(confirm, { headers: FORM, body: { t: token("confirm") }, addr: { to: [" one@example.org ", "two@example.org", ""] }, answer: [NO_CONTACT] });
  is("ADDRESSES.to is a list, trimmed, blanks dropped", r.calls[3] && r.calls[3].body.to, ["one@example.org", "two@example.org"]);

  r = await call(subscribe, { body: SUB });
  is("ADDRESSES.from defaults to Resend's test sender", r.calls[0].body.from, "LAUNCH dashboard <onboarding@resend.dev>");

  r = await call(subscribe, { addr: Object.assign({}, ADDR, { from: "LAUNCH <updates@unitaid.example>" }), body: SUB });
  is("ADDRESSES.from overrides it", r.calls[0].body.from, "LAUNCH <updates@unitaid.example>");

  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + token("confirm"), env: { RESEND_API_KEY: "re_x" } });
  is("the link pages say they failed, as a page, when not configured", [r.status, /didn't work/.test(r.shown)], [503, true]);
});

group("the addresses as committed", async () => {
  ok("ADDRESSES.to has at least one address", SHIPPED.to.length > 0);
  ok("  and every one passes the form's own email check", SHIPPED.to.every(a => mail.EMAIL_RE.test(a)), JSON.stringify(SHIPPED.to));
  const from = /^[^<>]+ <([^<>\s]+)>$/.exec(SHIPPED.from);
  ok("ADDRESSES.from is empty or \"Name <address>\"", SHIPPED.from === "" || !!from, SHIPPED.from);
  ok("  and its address passes the email check", !from || mail.EMAIL_RE.test(from[1]));
  ok("ADDRESSES.segment is empty or a Resend segment id", SHIPPED.segment === "" ||
     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(SHIPPED.segment), SHIPPED.segment);
});

group("links in emails", async () => {
  const now = Date.UTC(2026, 9, 1);
  const t = token("confirm", "reader@example.org", now);
  is("a confirm link reads back to its address", mail.readToken(SECRET, "confirm", t, now), { email: "reader@example.org" });
  ok("  and the address cannot be read out of it", !Buffer.from(t, "base64url").toString("latin1").includes("reader"), t);
  ok("  two links for one address differ", t !== token("confirm", "reader@example.org", now));
  is("  6 days on, it still works", mail.readToken(SECRET, "confirm", t, now + 6 * DAY), { email: "reader@example.org" });
  is("  8 days on, it has expired", mail.readToken(SECRET, "confirm", t, now + 8 * DAY), { expired: true });
  is("an unsubscribe link still works 400 days on", mail.readToken(SECRET, "unsubscribe", token("unsubscribe", "reader@example.org", now), now + 400 * DAY), { email: "reader@example.org" });
  is("a confirm link is no good as an unsubscribe link", mail.readToken(SECRET, "unsubscribe", t, now), null);
  is("another secret cannot read it", mail.readToken("another-secret-0123456789abcdef0123456789", "confirm", t, now), null);
  const raw = Buffer.from(t, "base64url"); raw[20] ^= 1;
  is("one flipped bit and it is refused", mail.readToken(SECRET, "confirm", raw.toString("base64url"), now), null);
  is("junk is refused", [mail.readToken(SECRET, "confirm", "abc"), mail.readToken(SECRET, "confirm", "not base64!"), mail.readToken(SECRET, "confirm", "A".repeat(2000)), mail.readToken(SECRET, "confirm", undefined)], [null, null, null, null]);
});

group("subscribe — sends the confirmation, saves nothing", async () => {
  let r = await call(subscribe, { body: { email: "reader@example.org", page: "https://" + HOST + "/x" } });
  is("a valid address is a 200 ok, pending confirmation", [r.status, r.json && r.json.ok, r.json && r.json.pending], [200, true, true]);
  is("  one call to Resend: the email, nothing saved", r.calls.map(pathOf), ["POST /emails"]);
  is("  sent to the address itself", r.calls[0].body.to, ["reader@example.org"]);
  is("  asking to confirm", r.calls[0].body.subject, "Confirm your subscription to LAUNCH dashboard updates");
  const link = tokenIn(r.calls[0].body.text, "https://" + HOST + "/api/confirm");
  is("  with a confirm link on this site, for this address", link && mail.readToken(SECRET, "confirm", link), { email: "reader@example.org" });
  ok("  in the HTML too", r.calls[0].body.html.includes("https://" + HOST + "/api/confirm?t=" + link));
  ok("  and never the page address the visitor sent", !JSON.stringify(r.calls[0].body).includes("/x\""));

  r = await call(subscribe, { headers: { host: "internal", "x-forwarded-host": "preview-abc.vercel.app" }, body: SUB });
  ok("on a preview, the link points at that preview", r.calls[0].body.text.includes("https://preview-abc.vercel.app/api/confirm?t="));

  r = await call(subscribe, { headers: { host: "evil.example/phish?" }, body: SUB });
  is("a host that is not a host name is refused, and nothing is sent", [r.status, r.calls.length], [400, 0]);

  r = await call(subscribe, { body: SUB, answer: [{ status: 500, body: { name: "application_error" } }] });
  is("Resend failing → 502", r.status, 502);
  ok("  and the log says what failed", r.logs.some(l => l.includes("send confirmation failed")));

  r = await call(subscribe, { body: { email: "nope" } });
  is("a malformed address is a 400", r.status, 400);
  is("  and nothing reaches Resend", r.calls.length, 0);

  r = await call(subscribe, { body: { email: "a@b.co\r\nBcc: victim@example.org" } });
  is("an address with a smuggled header line is refused", r.status, 400);

  r = await call(subscribe, { body: { email: 12345 } });
  is("a non-string address is a 400, not a crash", r.status, 400);
});

group("confirm — the page the link opens", async () => {
  const t = token("confirm");
  let r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + t, headers: { "content-type": undefined } });
  is("GET shows a page, and changes nothing", [r.status, r.calls.length], [200, 0]);
  ok("  with a button that posts the link back", r.raw.includes('<form method="post" action="/api/confirm">') && r.raw.includes(`name="t" value="${t}"`));
  ok("  naming the address", r.raw.includes("reader@example.org"));
  is("  never cached, indexed or framed, and no Referer", [r.headers["cache-control"], r.headers["x-robots-tag"], r.headers["referrer-policy"], /frame-ancestors 'none'/.test(r.headers["content-security-policy"])], ["no-store", "noindex", "no-referrer", true]);

  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + token("confirm", "<b>x</b>@example.org") });
  ok("the address is escaped on the page", r.raw.includes("&lt;b&gt;x&lt;/b&gt;@example.org") && !r.raw.includes("<b>x</b>"));

  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + token("confirm", "reader@example.org", Date.now() - 8 * DAY) });
  is("an expired link says so", [r.status, /expired/.test(r.shown), r.calls.length], [400, true, 0]);

  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + t.slice(0, -4) });
  is("a cut-short link says it doesn't work", [r.status, /doesn't work/.test(r.shown)], [400, true]);

  r = await call(confirm, { method: "GET", url: "/api/confirm" });
  is("no link at all, the same", r.status, 400);

  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + token("unsubscribe") });
  is("an unsubscribe link does not confirm", r.status, 400);

  r = await call(confirm, { method: "PUT", url: "/api/confirm?t=" + t });
  is("other methods are refused", [r.status, r.headers.allow], [405, "GET, POST"]);
});

group("confirm — pressing the button", async () => {
  const t = token("confirm");
  let r = await call(confirm, { headers: FORM, body: { t }, addr: SEG, answer: [NO_CONTACT] });
  is("a new address: look up, create, welcome, tell the team", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "POST /contacts", "POST /emails", "POST /emails"]);
  is("  created subscribed, in the segment", r.calls[1].body, { email: "reader@example.org", unsubscribed: false, segments: [{ id: "seg_123" }] });
  is("  the page says subscribed", [r.status, /You're subscribed/.test(r.shown)], [200, true]);
  const welcome = r.calls[2].body, team = r.calls[3].body;
  is("  the welcome goes to the subscriber", [welcome.to, welcome.subject], [["reader@example.org"], "You're subscribed to LAUNCH dashboard updates"]);
  const unsub = tokenIn(welcome.text, "https://" + HOST + "/api/unsubscribe");
  is("  with an unsubscribe link for this address", unsub && mail.readToken(SECRET, "unsubscribe", unsub), { email: "reader@example.org" });
  is("  and the mail app's own one-click unsubscribe", welcome.headers,
     { "List-Unsubscribe": `<https://${HOST}/api/unsubscribe?t=${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  ok("  and a link to the dashboard on this site", welcome.html.includes(`https://${HOST}/illustrated-journey-dashboard.html`));
  is("  the team is told", team.to, ["team@example.org"]);
  ok("  who, and that it is not a returning subscriber", team.text.includes("Email: reader@example.org") && team.text.includes("Returning: no") && team.text.includes("Segment: seg_123"));

  r = await call(confirm, { headers: FORM, body: "t=" + t, answer: [NO_CONTACT] });
  is("the link also arrives as a raw form string", r.status, 200);
  r = await call(confirm, { url: "/api/confirm?t=" + t, headers: FORM, body: "", answer: [NO_CONTACT] });
  is("  or in the query string", r.status, 200);

  r = await call(confirm, { headers: FORM, body: { t }, addr: SEG, answer: [UNSUBSCRIBED] });
  is("an address that had unsubscribed: re-subscribed, into the segment, welcomed", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "PATCH /contacts/reader%40example.org", "POST /contacts/reader%40example.org/segments/seg_123", "POST /emails", "POST /emails"]);
  is("  the update is just unsubscribed: false", r.calls[1].body, { unsubscribed: false });
  ok("  and the team hears it is a returning subscriber", r.calls[4].body.text.includes("Returning: yes"));

  r = await call(confirm, { headers: FORM, body: { t }, addr: SEG, answer: [SUBSCRIBED] });
  is("already subscribed: made sure of the segment, and nothing sent", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "POST /contacts/reader%40example.org/segments/seg_123"]);
  is("  the page says already subscribed", [r.status, /already subscribed/.test(r.shown)], [200, true]);
  const offered = (/<form method="post" action="\/api\/unsubscribe"><input type="hidden" name="t" value="([^"]+)">/.exec(r.raw) || [])[1];
  is("  and offers an Unsubscribe button, for this address", offered && mail.readToken(SECRET, "unsubscribe", offered), { email: "reader@example.org" });
  r = await call(unsubscribe, { headers: Object.assign({}, FORM, { origin: "null" }), body: { t: offered } });
  is("  which unsubscribes", [r.status, r.calls.map(c => [pathOf(c), c.body])], [200, [["PATCH /contacts/reader%40example.org", { unsubscribed: true }]]]);

  r = await call(confirm, { headers: FORM, body: { t }, addr: SEG, answer: [SUBSCRIBED, { status: 500, body: { name: "application_error" } }] });
  is("  a segment failure is not shown to them", [r.status, /already subscribed/.test(r.shown)], [200, true]);
  ok("  but it is logged", r.logs.some(l => l.includes("add to segment failed")));

  r = await call(confirm, { headers: FORM, body: { t }, addr: SEG, answer: [UNSUBSCRIBED, { status: 200, body: {} }, { status: 500, body: {} }] });
  ok("a returning subscriber outside the segment: the team note says to add them by hand", r.calls[4] && r.calls[4].body.text.includes("NOT ADDED to seg_123"));

  r = await call(confirm, { headers: FORM, body: { t }, answer: [{ status: 422, body: { name: "validation_error" } }] });
  is("a lookup answering some other 4xx is taken as 'no such contact'", r.calls.map(pathOf).slice(0, 2), ["GET /contacts/reader%40example.org", "POST /contacts"]);

  r = await call(confirm, { headers: FORM, body: { t }, answer: [{ status: 401, body: { name: "restricted_api_key" } }] });
  is("a sending-only key: the page says it failed, nothing else happens", [r.status, /didn't work/.test(r.shown), r.calls.length], [502, true, 1]);
  ok("  and the log says why", r.logs.some(l => l.includes("restricted_api_key")));

  r = await call(confirm, { headers: FORM, body: { t }, answer: [NO_CONTACT, { status: 500, body: { name: "application_error" } }] });
  is("the create failing: failure page, and no welcome or team note", [r.status, r.calls.length], [502, 2]);

  r = await call(confirm, { headers: FORM, body: { t }, answer: [NO_CONTACT, { status: 201, body: {} }, { status: 500, body: {} }] });
  is("the welcome failing does not undo the subscription", [r.status, /You're subscribed/.test(r.shown), r.calls.length], [200, true, 4]);
  ok("  but it is logged", r.logs.some(l => l.includes("send welcome failed")));

  r = await call(confirm, { headers: FORM, body: { t }, answer: [NO_CONTACT, { status: 201, body: {} }, { status: 200, body: {} }, { status: 500, body: {} }] });
  is("the team's note failing does not either", [r.status, /You're subscribed/.test(r.shown)], [200, true]);
  ok("  but it is logged", r.logs.some(l => l.includes("notify team failed")));

  r = await call(confirm, { headers: Object.assign({}, FORM, { origin: "https://evil.example" }), body: { t } });
  is("a POST from another site is refused, and nothing reaches Resend", [r.status, r.calls.length], [403, 0]);

  // Found by the browser run, not by these tests: with the page's
  // no-referrer policy, Chrome sends the button's POST as `Origin: null`.
  r = await call(confirm, { headers: Object.assign({}, FORM, { origin: "null" }), body: { t }, answer: [NO_CONTACT] });
  is("the page's own button, which posts with Origin: null, is accepted", [r.status, /You're subscribed/.test(r.shown)], [200, true]);

  r = await call(confirm, { headers: FORM, body: { t: token("confirm", "reader@example.org", Date.now() - 8 * DAY) } });
  is("an expired link cannot be confirmed", [r.status, r.calls.length], [400, 0]);
});

group("unsubscribe", async () => {
  const t = token("unsubscribe");
  let r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe?t=" + t });
  is("GET shows a page, and changes nothing", [r.status, r.calls.length], [200, 0]);
  ok("  with a button that posts the link back", r.raw.includes('<form method="post" action="/api/unsubscribe">') && r.raw.includes(`value="${t}"`));

  r = await call(unsubscribe, { headers: FORM, body: { t } });
  is("the button: the contact is marked unsubscribed", r.calls.map(c => [pathOf(c), c.body]), [["PATCH /contacts/reader%40example.org", { unsubscribed: true }]]);
  is("  and the page says so", [r.status, /You're unsubscribed/.test(r.shown)], [200, true]);

  r = await call(unsubscribe, { url: "/api/unsubscribe?t=" + t, headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click" });
  is("the mail app's one-click POST (no Origin, token in the URL) works", [r.status, r.calls.map(pathOf)], [200, ["PATCH /contacts/reader%40example.org"]]);

  r = await call(unsubscribe, { headers: FORM, body: { t }, answer: [NO_CONTACT] });
  is("an address that is not a contact is still 'unsubscribed'", [r.status, /You're unsubscribed/.test(r.shown)], [200, true]);

  r = await call(unsubscribe, { headers: FORM, body: { t }, answer: [{ status: 500, body: { name: "application_error" } }] });
  is("Resend failing: the page says it didn't work", [r.status, /didn't work/.test(r.shown)], [502, true]);

  r = await call(unsubscribe, { headers: FORM, body: { t: token("unsubscribe", "reader@example.org", Date.now() - 400 * DAY) } });
  is("a link from a year-old email still unsubscribes", r.status, 200);

  r = await call(unsubscribe, { headers: FORM, body: { t: token("confirm") } });
  is("a confirm link does not unsubscribe", [r.status, r.calls.length], [400, 0]);

  r = await call(unsubscribe, { headers: Object.assign({}, FORM, { origin: "https://evil.example" }), body: { t } });
  is("a POST from another site is refused", [r.status, r.calls.length], [403, 0]);

  r = await call(unsubscribe, { headers: Object.assign({}, FORM, { origin: "null" }), body: { t } });
  is("the page's own button (Origin: null) is accepted", r.status, 200);

  r = await call(subscribe, { headers: { origin: "null" }, body: SUB });
  is("the dashboard form's JSON endpoint still refuses Origin: null", r.status, 403);
});

group("the whole journey", async () => {
  let r = await call(subscribe, { body: SUB, addr: SEG });
  const confirmLink = tokenIn(r.calls[0].body.text, "https://" + HOST + "/api/confirm");
  r = await call(confirm, { method: "GET", url: "/api/confirm?t=" + confirmLink, addr: SEG });
  const posted = (/name="t" value="([^"]+)"/.exec(r.raw) || [])[1];
  r = await call(confirm, { headers: FORM, body: { t: posted }, addr: SEG, answer: [NO_CONTACT] });
  is("subscribe → the emailed link → its page's button → subscribed", [r.status, /You're subscribed/.test(r.shown)], [200, true]);
  const unsubLink = tokenIn(r.calls[2].body.text, "https://" + HOST + "/api/unsubscribe");
  r = await call(unsubscribe, { url: "/api/unsubscribe?t=" + unsubLink, headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click", addr: SEG });
  is("  → the welcome's one-click unsubscribe → unsubscribed", [r.status, r.calls.map(c => c.body)], [200, [{ unsubscribed: true }]]);
});

group("logs never carry the submission", async () => {
  const who = "private.person@example.org";
  const runs = [
    await call(subscribe, { body: { email: who } }),
    await call(subscribe, { body: { email: who }, answer: [{ status: 500, body: { name: "application_error", message: "An unexpected error occurred." } }] }),
    await call(confirm, { headers: FORM, body: { t: token("confirm", who) }, answer: [NO_CONTACT] }),
    await call(confirm, { headers: FORM, body: { t: token("confirm", who) }, answer: [{ status: 500, body: { name: "application_error" } }] }),
    await call(unsubscribe, { headers: FORM, body: { t: token("unsubscribe", who) } }),
    await call(unsubscribe, { headers: FORM, body: { t: token("unsubscribe", who) }, answer: [{ status: 500, body: {} }] })
  ];
  ok("six runs, success and failure, each logged something", runs.every(r => r.logs.length > 0), JSON.stringify(runs.map(r => r.logs)));
  ok("  and none of it names the address", runs.every(r => r.logs.every(l => !l.includes("private.person"))), JSON.stringify(runs.map(r => r.logs)));
});

(async () => {
  for (const run of queue) await run();
  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) console.log("Failed:\n  " + failures.join("\n  "));
  process.exit(fail ? 1 : 0);
})();
