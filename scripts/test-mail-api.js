#!/usr/bin/env node
// Tests for the Vercel functions behind the illustrated journey page's forms:
// "Subscribe for updates" (api/subscribe.js, api/unsubscribe.js), "Send
// feedback" (api/feedback.js), and the shared api/_mail.js.
//
// No network and no Resend key: global fetch is replaced with a stub that
// records every call and answers as Resend would, so these check exactly what
// would have been sent, and what the visitor would have been told.
//
//   node scripts/test-mail-api.js              run everything
//   node scripts/test-mail-api.js subscribe    run the groups whose name matches

const mail = require("../api/_mail.js");
const subscribe = require("../api/subscribe.js");
const unsubscribe = require("../api/unsubscribe.js");
const feedback = require("../api/feedback.js");

// The addresses as committed, copied before any test below swaps in its own.
const SHIPPED = JSON.parse(JSON.stringify(mail.ADDRESSES));
const SHIPPED_PARTNERS = JSON.parse(JSON.stringify(mail.PARTNERS));

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
  calls.push({ url, method: init.method, auth: init.headers.Authorization, body: init.body ? JSON.parse(init.body) : undefined });
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

// What the widget (assets/report-issue.js) posts.
const REPORT = {
  type: "correction",
  productId: "coartem-baby",
  productName: "Coartem Baby",
  message: "Tanzania approved this in June 2026 — TMDA register entry TZ/123.",
  name: "Amina",
  email: "amina@moh.example",
  organisation: "Ministry of Health",
  page: { url: "https://" + HOST + "/illustrated-journey-dashboard.html", path: "/illustrated-journey-dashboard.html", title: "LAUNCH", view: "illustrated" },
  data: { lastUpdated: "2026-09-20", dataStatus: "draft" },
  submittedAt: "2026-10-02T10:00:00.000Z",
  userAgent: "Mozilla/5.0 test"
};
const withReport = over => Object.assign({}, REPORT, over);

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

  r = await call(subscribe, { body: SUB, addr: { to: [" one@example.org ", "two@example.org", ""] }, answer: [NO_CONTACT] });
  is("ADDRESSES.to is a list, trimmed, blanks dropped", r.calls[3] && r.calls[3].body.to, ["one@example.org", "two@example.org"]);

  r = await call(subscribe, { body: SUB, answer: [NO_CONTACT] });
  is("ADDRESSES.from defaults to Resend's test sender", r.calls[2].body.from, "LAUNCH dashboard <onboarding@resend.dev>");

  r = await call(subscribe, { addr: Object.assign({}, ADDR, { from: "LAUNCH <updates@unitaid.example>" }), body: SUB, answer: [NO_CONTACT] });
  is("ADDRESSES.from overrides it", r.calls[2].body.from, "LAUNCH <updates@unitaid.example>");

  r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe?t=" + token("unsubscribe"), env: { RESEND_API_KEY: "re_x" } });
  is("the link page says it failed, as a page, when not configured", [r.status, /didn't work/.test(r.shown)], [503, true]);
});

group("the addresses as committed", async () => {
  ok("ADDRESSES.to has at least one address", SHIPPED.to.length > 0);
  ok("  and every one passes the form's own email check", SHIPPED.to.every(a => mail.EMAIL_RE.test(a)), JSON.stringify(SHIPPED.to));
  const from = /^[^<>]+ <([^<>\s]+)>$/.exec(SHIPPED.from);
  ok("ADDRESSES.from is empty or \"Name <address>\"", SHIPPED.from === "" || !!from, SHIPPED.from);
  ok("  and its address passes the email check", !from || mail.EMAIL_RE.test(from[1]));
  ok("ADDRESSES.segment is empty or a Resend segment id", SHIPPED.segment === "" ||
     /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(SHIPPED.segment), SHIPPED.segment);
  ok("every PARTNERS origin is https://host, with no path and no trailing slash",
     SHIPPED_PARTNERS.every(p => /^https:\/\/[a-z0-9.-]+(:\d{1,5})?$/i.test(p.origin)), JSON.stringify(SHIPPED_PARTNERS));
  ok("  and its dashboard is a page on that same origin",
     SHIPPED_PARTNERS.every(p => typeof p.dashboard === "string" && p.dashboard.startsWith(p.origin + "/")), JSON.stringify(SHIPPED_PARTNERS));
});

group("links in emails", async () => {
  const t = token("unsubscribe");
  is("an unsubscribe link reads back to its address", mail.readToken(SECRET, "unsubscribe", t), { email: "reader@example.org" });
  ok("  and the address cannot be read out of it", !Buffer.from(t, "base64url").toString("latin1").includes("reader"), t);
  ok("  two links for one address differ", t !== token("unsubscribe"));
  is("  it never expires: one made 400 days ago still works", mail.readToken(SECRET, "unsubscribe", token("unsubscribe", "reader@example.org", Date.now() - 400 * DAY)), { email: "reader@example.org" });
  is("a confirm link, as emailed before 6 Oct, is no good as an unsubscribe link", mail.readToken(SECRET, "unsubscribe", token("confirm")), null);
  is("another secret cannot read it", mail.readToken("another-secret-0123456789abcdef0123456789", "unsubscribe", t), null);
  const raw = Buffer.from(t, "base64url"); raw[20] ^= 1;
  is("one flipped bit and it is refused", mail.readToken(SECRET, "unsubscribe", raw.toString("base64url")), null);
  is("junk is refused", [mail.readToken(SECRET, "unsubscribe", "abc"), mail.readToken(SECRET, "unsubscribe", "not base64!"), mail.readToken(SECRET, "unsubscribe", "A".repeat(2000)), mail.readToken(SECRET, "unsubscribe", undefined)], [null, null, null, null]);
});

group("subscribe — a new address goes straight onto the list", async () => {
  let r = await call(subscribe, { body: { email: "reader@example.org", page: "https://" + HOST + "/x" }, addr: SEG, answer: [NO_CONTACT] });
  is("look up, create, welcome, tell the team", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "POST /contacts", "POST /emails", "POST /emails"]);
  is("  created subscribed, in the segment", r.calls[1].body, { email: "reader@example.org", unsubscribed: false, segments: [{ id: "seg_123" }] });
  is("  the form is told ok, with nothing pending", [r.status, r.json], [200, { ok: true }]);
  ok("  and no email asks anyone to confirm", !JSON.stringify(r.calls).includes("/api/confirm") && r.calls.every(c => !c.body || !/confirm/i.test(c.body.subject)));
  const welcome = r.calls[2].body, team = r.calls[3].body;
  is("  the welcome goes to the subscriber", [welcome.to, welcome.subject], [["reader@example.org"], "You're subscribed to LAUNCH dashboard updates"]);
  ok("  opening with the owner's sentence", welcome.text.includes("You're now subscribed to the LAUNCH Transparency Dashboard.") && welcome.html.includes("You&#39;re now subscribed to the LAUNCH Transparency Dashboard."));
  const unsub = tokenIn(welcome.text, "https://" + HOST + "/api/unsubscribe");
  is("  with an unsubscribe link for this address", unsub && mail.readToken(SECRET, "unsubscribe", unsub), { email: "reader@example.org" });
  ok("  in the HTML too", welcome.html.includes(`https://${HOST}/api/unsubscribe?t=${unsub}`));
  ok("  offered to whoever did not sign up, too", welcome.text.includes(`Didn't sign up, or don't want these emails? https://${HOST}/api/unsubscribe?t=${unsub}`));
  is("  and the mail app's own one-click unsubscribe", welcome.headers,
     { "List-Unsubscribe": `<https://${HOST}/api/unsubscribe?t=${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
  ok("  and a link to the dashboard on this site", welcome.html.includes(`https://${HOST}/illustrated-journey-dashboard.html`));
  ok("  and never the page address the visitor sent", !JSON.stringify(r.calls).includes("/x\""));
  is("  the team is told", team.to, ["team@example.org"]);
  ok("  who, and that it is not a returning subscriber", team.text.includes("Email address: reader@example.org") && team.text.includes("Subscriber: New") && team.text.includes("Mailing list: " + mail.SEGMENT_NAME));

  r = await call(subscribe, { headers: { host: "internal", "x-forwarded-host": "preview-abc.vercel.app" }, body: SUB, answer: [NO_CONTACT] });
  ok("on a preview, the links point at that preview", r.calls[2].body.text.includes("https://preview-abc.vercel.app/api/unsubscribe?t="));

  r = await call(subscribe, { headers: { host: "evil.example/phish?" }, body: SUB });
  is("a host that is not a host name is refused, and nothing is saved or sent", [r.status, r.calls.length], [400, 0]);

  r = await call(subscribe, { body: { email: "nope" } });
  is("a malformed address is a 400", r.status, 400);
  is("  and nothing reaches Resend", r.calls.length, 0);

  r = await call(subscribe, { body: { email: "a@b.co\r\nBcc: victim@example.org" } });
  is("an address with a smuggled header line is refused", r.status, 400);

  r = await call(subscribe, { body: { email: 12345 } });
  is("a non-string address is a 400, not a crash", r.status, 400);
});

group("subscribe — returning, already subscribed, and failures", async () => {
  let r = await call(subscribe, { body: SUB, addr: SEG, answer: [UNSUBSCRIBED] });
  is("an address that had unsubscribed: re-subscribed, into the segment, welcomed", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "PATCH /contacts/reader%40example.org", "POST /contacts/reader%40example.org/segments/seg_123", "POST /emails", "POST /emails"]);
  is("  the update is just unsubscribed: false", r.calls[1].body, { unsubscribed: false });
  ok("  and the team hears it is a returning subscriber", r.calls[4].body.text.includes("Subscriber: Returning"));

  const fresh = await call(subscribe, { body: SUB, addr: SEG, answer: [NO_CONTACT] });
  r = await call(subscribe, { body: SUB, addr: SEG, answer: [SUBSCRIBED] });
  is("already subscribed: made sure of the segment, and nothing sent", r.calls.map(pathOf),
     ["GET /contacts/reader%40example.org", "POST /contacts/reader%40example.org/segments/seg_123"]);
  is("  the same answer as a new address, so the form cannot tell who is on the list", [r.status, r.json], [fresh.status, fresh.json]);

  r = await call(subscribe, { body: SUB, addr: SEG, answer: [SUBSCRIBED, { status: 500, body: { name: "application_error" } }] });
  is("  a segment failure is not shown to them", [r.status, r.json], [200, { ok: true }]);
  ok("  but it is logged", r.logs.some(l => l.includes("add to segment failed")));

  r = await call(subscribe, { body: SUB, addr: SEG, answer: [UNSUBSCRIBED, { status: 200, body: {} }, { status: 500, body: {} }] });
  ok("a returning subscriber outside the segment: the team note says to add them by hand", r.calls[4] && r.calls[4].body.text.includes("Not added") && r.calls[4].body.text.includes("by hand in Resend (segment seg_123)") && r.calls[4].body.text.includes("One thing to do"));

  r = await call(subscribe, { body: SUB, answer: [{ status: 422, body: { name: "validation_error" } }] });
  is("a lookup answering some other 4xx is taken as 'no such contact'", r.calls.map(pathOf).slice(0, 2), ["GET /contacts/reader%40example.org", "POST /contacts"]);

  r = await call(subscribe, { body: SUB, answer: [{ status: 401, body: { name: "restricted_api_key" } }] });
  is("a sending-only key: the form is told it failed, nothing else happens", [r.status, r.json.ok, r.calls.length], [502, false, 1]);
  ok("  and the log says why", r.logs.some(l => l.includes("restricted_api_key")));

  r = await call(subscribe, { body: SUB, answer: [{ status: 500, body: { name: "application_error" } }] });
  is("Resend down at the lookup → 502, nothing saved or sent", [r.status, r.calls.length], [502, 1]);
  ok("  and the log says what failed", r.logs.some(l => l.includes("look up contact failed")));

  r = await call(subscribe, { body: SUB, answer: [NO_CONTACT, { status: 500, body: { name: "application_error" } }] });
  is("the create failing: 502, and no welcome or team note", [r.status, r.calls.length], [502, 2]);

  r = await call(subscribe, { body: SUB, answer: [NO_CONTACT, { status: 201, body: {} }, { status: 500, body: {} }] });
  is("the welcome failing does not undo the subscription", [r.status, r.json, r.calls.length], [200, { ok: true }, 4]);
  ok("  but it is logged", r.logs.some(l => l.includes("send welcome failed")));

  r = await call(subscribe, { body: SUB, answer: [NO_CONTACT, { status: 201, body: {} }, { status: 200, body: {} }, { status: 500, body: {} }] });
  is("the team's note failing does not either", [r.status, r.json], [200, { ok: true }]);
  ok("  but it is logged", r.logs.some(l => l.includes("notify team failed")));
});

group("unsubscribe — the page the link opens", async () => {
  const t = token("unsubscribe");
  let r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe?t=" + t, headers: { "content-type": undefined } });
  is("GET shows a page, and changes nothing", [r.status, r.calls.length], [200, 0]);
  ok("  naming the address", r.raw.includes("reader@example.org"));
  is("  never cached, indexed or framed, and no Referer", [r.headers["cache-control"], r.headers["x-robots-tag"], r.headers["referrer-policy"], /frame-ancestors 'none'/.test(r.headers["content-security-policy"])], ["no-store", "noindex", "no-referrer", true]);

  r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe?t=" + token("unsubscribe", "<b>x</b>@example.org") });
  ok("the address is escaped on the page", r.raw.includes("&lt;b&gt;x&lt;/b&gt;@example.org") && !r.raw.includes("<b>x</b>"));

  r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe?t=" + t.slice(0, -4) });
  is("a cut-short link says it doesn't work", [r.status, /doesn't work/.test(r.shown)], [400, true]);

  r = await call(unsubscribe, { method: "GET", url: "/api/unsubscribe" });
  is("no link at all, the same", r.status, 400);

  r = await call(unsubscribe, { method: "PUT", url: "/api/unsubscribe?t=" + t });
  is("other methods are refused", [r.status, r.headers.allow], [405, "GET, POST"]);
});

group("partners — RBM's pages, on another site (CORS)", async () => {
  const PARTNER = { origin: "https://rbm.example.org", dashboard: "https://rbm.example.org/launch/en/" };
  mail.PARTNERS.splice(0, mail.PARTNERS.length, PARTNER);
  const from = (origin, extra) => Object.assign({ origin }, extra);
  const PREFLIGHT = { "access-control-request-method": "POST", "access-control-request-headers": "content-type" };
  try {
    let r = await call(subscribe, { method: "OPTIONS", headers: from(PARTNER.origin, PREFLIGHT) });
    is("a partner's preflight: 204, allowing POST with Content-Type, for that origin only",
       [r.status, r.headers["access-control-allow-origin"], r.headers["access-control-allow-methods"], r.headers["access-control-allow-headers"]],
       [204, PARTNER.origin, "POST", "Content-Type"]);
    is("  and nothing reaches Resend", r.calls.length, 0);

    r = await call(subscribe, { method: "OPTIONS", headers: from("https://evil.example", PREFLIGHT) });
    is("anyone else's preflight: 405, and no CORS headers, so the browser blocks the post",
       [r.status, r.headers["access-control-allow-origin"]], [405, undefined]);

    r = await call(subscribe, { headers: from(PARTNER.origin), body: SUB, addr: SEG, answer: [NO_CONTACT] });
    is("a partner's subscribe goes through, and the page may read the answer",
       [r.status, r.json, r.headers["access-control-allow-origin"], r.headers.vary], [200, { ok: true }, PARTNER.origin, "Origin"]);
    const welcome = r.calls[2].body, team = r.calls[3].body;
    ok("  the welcome's dashboard link goes back to the partner's page", welcome.html.includes(`href="${PARTNER.dashboard}"`) && welcome.text.includes(PARTNER.dashboard));
    ok("  its unsubscribe link stays on this site, where the function is", welcome.text.includes(`https://${HOST}/api/unsubscribe?t=`) && !welcome.text.includes(PARTNER.origin + "/api/"));
    ok("  and the team hears which site it came from", team.text.includes("Signed up on: " + PARTNER.dashboard));

    r = await call(subscribe, { headers: from(PARTNER.origin), body: { email: "nope" } });
    is("a partner's failed request is readable too, so its page can show the failure", [r.status, r.headers["access-control-allow-origin"]], [400, PARTNER.origin]);

    r = await call(feedback, { headers: from(PARTNER.origin), body: REPORT });
    is("a partner's feedback goes through, readable by its page", [r.status, r.json && r.json.ok, r.headers["access-control-allow-origin"]], [200, true, PARTNER.origin]);

    for (const other of ["https://evil.example", "https://rbm.example.org.evil.example", "http://rbm.example.org", "https://rbm.example.org/launch", "null"]) {
      r = await call(subscribe, { headers: from(other), body: SUB });
      is(`not a partner: ${other} → 403, no CORS header, nothing sent`, [r.status, r.headers["access-control-allow-origin"], r.calls.length], [403, undefined, 0]);
    }

    r = await call(subscribe, { headers: from("https://" + HOST), body: SUB, answer: [NO_CONTACT] });
    is("the LAUNCH site's own page needs no CORS header", [r.status, r.headers["access-control-allow-origin"]], [200, undefined]);
    ok("  and its welcome links to this site's page", r.calls[2].body.html.includes(`href="https://${HOST}/illustrated-journey-dashboard.html"`));
  } finally {
    mail.PARTNERS.splice(0, mail.PARTNERS.length, ...SHIPPED_PARTNERS);
  }
});

group("the team's emails, laid out as a form", async () => {
  is("a time reads as a person would write it", mail.when(new Date(Date.UTC(2026, 9, 7, 15, 48, 57))), "7 Oct 2026, 15:48 UTC");
  is("  with leading zeros where a clock has them", mail.when(new Date(Date.UTC(2026, 0, 3, 4, 5))), "3 Jan 2026, 04:05 UTC");

  let r = await call(subscribe, { body: SUB, addr: SEG, answer: [NO_CONTACT] });
  const team = r.calls[3].body;
  ok("the subscriber note: a brand bar, a title, and what happened", team.html.includes("LAUNCH Transparency Dashboard") && team.html.includes(">New subscriber<") && team.html.includes("Nothing to do"));
  ok("  the details as a two-column table, label on grey", (team.html.match(/<td width="34%"/g) || []).length === 5 && team.html.includes("background:#f5f8f9"));
  ok("  a readable time, not an ISO stamp", /Signed up: \d{1,2} [A-Z][a-z]{2} \d{4}, \d\d:\d\d UTC/.test(team.text) && !/\d{4}-\d\d-\d\dT/.test(team.text + team.html));
  ok("  the list by name, not by id", team.text.includes("Mailing list: " + mail.SEGMENT_NAME) && !team.html.includes("seg_123"));
  ok("  the page they signed up on is a link, because this code built it", team.html.includes(`href="https://${HOST}/illustrated-journey-dashboard.html"`));
  ok("  the address they typed is not a link", !/href="[^"]*reader@example\.org/.test(team.html));
  ok("  and a footer", team.html.includes("Sent automatically when someone subscribes"));

  r = await call(subscribe, { body: SUB, addr: SEG, answer: [UNSUBSCRIBED, { status: 200, body: {} }, { status: 500, body: {} }] });
  ok("a list that failed shows as something to do, in the warning colour", r.calls[4].body.html.includes("color:#b42318;font-weight:700\">Not added."));

  r = await call(feedback, { body: withReport({ page: { url: "https://phish.example/x" } }) });
  const fb = r.calls[0].body;
  ok("the feedback note: title, type and medicine, the message in its own box", fb.html.includes(">New feedback<") && fb.html.includes("A data point looks wrong · Coartem Baby") && fb.html.includes("border-left:3px solid #0E5A73") && fb.html.includes("Tanzania approved this"));
  ok("  the page the visitor reports is shown, never linked", fb.html.includes("https://phish.example/x") && !fb.html.includes('href="https://phish.example'));
  ok("  the footer says a reply reaches them", fb.text.includes("Reply to this email to answer them: the reply goes to amina@moh.example."));
  r = await call(feedback, { body: withReport({ email: null, name: null }) });
  ok("  with no address: says it cannot be answered, in the warning colour", r.calls[0].body.html.includes("color:#b42318;font-weight:700\">Not given, so this cannot be answered") && r.calls[0].body.text.includes("They left no email address"));
});

group("feedback — request guard and configuration", async () => {
  // The guard is _mail.js's, tested in full above through subscribe; these
  // check feedback goes through it at all.
  let r = await call(feedback, { method: "GET" });
  is("GET is refused with 405", r.status, 405);
  r = await call(feedback, { headers: { origin: "https://evil.example" }, body: REPORT });
  is("another site's Origin is refused with 403", [r.status, r.calls.length], [403, 0]);
  r = await call(feedback, { headers: { origin: "https://" + HOST }, body: REPORT });
  is("the page's own Origin is accepted", r.status, 200);
  r = await call(feedback, { headers: { "content-type": "text/plain" }, body: JSON.stringify(REPORT) });
  is("text/plain is refused with 415", r.status, 415);
  r = await call(feedback, { bodyThrows: true });
  is("malformed JSON is a 400, not a crash", r.status, 400);

  r = await call(feedback, { env: { UNSUBSCRIBE_SECRET: SECRET }, body: REPORT });
  is("no RESEND_API_KEY → 503", [r.status, r.calls.length], [503, 0]);
  ok("  and the log names what is needed", r.logs.some(l => l.startsWith("[feedback] not configured") && l.includes("RESEND_API_KEY")));
  r = await call(feedback, { env: { RESEND_API_KEY: "re_x" }, body: REPORT });
  is("no UNSUBSCRIBE_SECRET → 503 too: one switch-on list for every function", r.status, 503);
  r = await call(feedback, { addr: { to: [] }, body: REPORT });
  is("no ADDRESSES.to → 503", r.status, 503);
});

group("feedback — the team's email", async () => {
  let r = await call(feedback, { body: REPORT });
  is("a valid report is a 200", r.status, 200);
  ok("  answering ok with a LAUNCH-XXXXXXXX reference", r.json && r.json.ok === true && /^LAUNCH-[0-9A-F]{8}$/.test(r.json.ref), JSON.stringify(r.json));
  is("  in exactly one call to Resend", r.calls.length, 1);
  const c = r.calls[0];
  is("  to the send-email endpoint", pathOf(c), "POST /emails");
  is("  authorised with the key", c.auth, "Bearer re_test_key");
  is("  addressed to ADDRESSES.to", c.body.to, ["team@example.org"]);
  is("  from ADDRESSES.from (here the test sender)", c.body.from, "LAUNCH dashboard <onboarding@resend.dev>");
  is("  with Reply-To set to the visitor", c.body.reply_to, "amina@moh.example");
  ok("  subject carries type, medicine and the same reference",
     c.body.subject === `[LAUNCH feedback] A data point looks wrong — Coartem Baby (${r.json.ref})`, c.body.subject);
  ok("  text body carries the message", c.body.text.includes(REPORT.message));
  ok("  and the page it came from", c.body.text.includes("Page: https://" + HOST + "/illustrated-journey-dashboard.html"));
  ok("  and the data version the visitor saw", c.body.text.includes("Data version: 2026-09-20 · draft"));
  is("  and is tagged for filtering in Resend", c.body.tags, [{ name: "form", value: "feedback" }]);
  const r2 = await call(feedback, { body: REPORT });
  ok("two reports get different references", r2.json.ref !== r.json.ref);

  r = await call(feedback, { body: withReport({ email: null }) });
  is("no email given → no reply_to at all", "reply_to" in r.calls[0].body, false);
  ok("  and the team is told it cannot be answered", r.calls[0].body.text.includes("cannot be answered"));

  r = await call(feedback, { body: withReport({ message: "too short" }) });
  is("a message under 10 characters is a 400", [r.status, r.calls.length], [400, 0]);
  r = await call(feedback, { body: withReport({ message: "          x         " }) });
  is("padding does not count towards the 10", r.status, 400);
  r = await call(feedback, { body: withReport({ message: "x".repeat(5000) }) });
  is("a long message is capped at the widget's 2000", (r.calls[0].body.text.split("\n").find(l => /^x+$/.test(l)) || "").length, 2000);
  r = await call(feedback, { body: withReport({ message: "Line one of it\r\nline two" }) });
  ok("line breaks in the message survive, as \\n", r.calls[0].body.text.includes("Line one of it\nline two"));
  r = await call(feedback, { body: withReport({ email: "not-an-address" }) });
  is("a malformed email is a 400", [r.status, r.calls.length], [400, 0]);

  r = await call(feedback, { body: withReport({ type: "__proto__" }) });
  ok("an unknown type falls back to 'Something else'", r.status === 200 && r.calls[0].body.subject.includes("Something else"));
  r = await call(feedback, { body: withReport({ productName: null }) });
  ok("no medicine → 'General'", r.calls[0].body.subject.includes("General — the dashboard as a whole"));
  r = await call(feedback, { body: withReport({ productName: "X\r\nBcc: victim@example.org" }) });
  ok("CR/LF typed into a field cannot break the subject line", !/[\r\n]/.test(r.calls[0].body.subject), JSON.stringify(r.calls[0].body.subject));
  r = await call(feedback, { body: withReport({ message: '<script>alert(1)</script> <a href="https://phish.example">click</a>' }) });
  const html = r.calls[0].body.html;
  ok("HTML in the message is escaped, not rendered", html.includes("&lt;script&gt;") && !html.includes("<script>"));
  ok("  and no visitor URL becomes a link", !html.includes('href="https://phish.example"'));
  r = await call(feedback, { body: withReport({ page: "a string", data: 7, name: 42, userAgent: {} }) });
  is("wrong-typed optional fields are ignored, not fatal", r.status, 200);

  r = await call(feedback, { body: REPORT, answer: [{ status: 403, body: { name: "validation_error", message: "You can only send testing emails to your own email address" } }] });
  is("Resend refusing is a 502 to the widget", r.status, 502);
  is("  answering ok:false, which the widget shows as its failure message", r.json.ok, false);
  ok("  and Resend's reason is in the log", r.logs.some(l => l.includes("HTTP 403 validation_error You can only send testing")));
  r = await call(feedback, { body: REPORT, answer: [{ throws: Object.assign(new Error("timed out"), { name: "TimeoutError" }) }] });
  is("a network failure or timeout is a 502, not a crash", r.status, 502);
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
  is("a confirm link from before 6 Oct does not unsubscribe", [r.status, r.calls.length], [400, 0]);

  r = await call(unsubscribe, { headers: Object.assign({}, FORM, { origin: "https://evil.example" }), body: { t } });
  is("a POST from another site is refused", [r.status, r.calls.length], [403, 0]);

  r = await call(unsubscribe, { headers: Object.assign({}, FORM, { origin: "null" }), body: { t } });
  is("the page's own button (Origin: null) is accepted", r.status, 200);

  r = await call(subscribe, { headers: { origin: "null" }, body: SUB });
  is("the dashboard form's JSON endpoint still refuses Origin: null", r.status, 403);
});

group("the whole journey", async () => {
  let r = await call(subscribe, { body: SUB, addr: SEG, answer: [NO_CONTACT] });
  is("subscribe → on the list at once, and welcomed", [r.status, r.calls.map(pathOf)],
     [200, ["GET /contacts/reader%40example.org", "POST /contacts", "POST /emails", "POST /emails"]]);
  const unsubLink = tokenIn(r.calls[2].body.text, "https://" + HOST + "/api/unsubscribe");
  r = await call(unsubscribe, { url: "/api/unsubscribe?t=" + unsubLink, headers: { "content-type": "application/x-www-form-urlencoded" }, body: "List-Unsubscribe=One-Click", addr: SEG });
  is("  → the welcome's one-click unsubscribe → unsubscribed", [r.status, r.calls.map(c => c.body)], [200, [{ unsubscribed: true }]]);
  r = await call(subscribe, { body: SUB, addr: SEG, answer: [UNSUBSCRIBED] });
  is("  → subscribe again → back on the list, with a new welcome", [r.status, r.calls[1].body, r.calls[3] && r.calls[3].body.subject],
     [200, { unsubscribed: false }, "You're subscribed to LAUNCH dashboard updates"]);
});

group("logs never carry the submission", async () => {
  const who = "private.person@example.org";
  const runs = [
    await call(subscribe, { body: { email: who }, answer: [NO_CONTACT] }),
    await call(subscribe, { body: { email: who }, answer: [SUBSCRIBED] }),
    await call(subscribe, { body: { email: who }, answer: [NO_CONTACT, { status: 500, body: { name: "application_error", message: "An unexpected error occurred." } }] }),
    await call(subscribe, { body: { email: who }, answer: [NO_CONTACT, { status: 201, body: {} }, { status: 500, body: { name: "application_error" } }] }),
    await call(unsubscribe, { headers: FORM, body: { t: token("unsubscribe", who) } }),
    await call(unsubscribe, { headers: FORM, body: { t: token("unsubscribe", who) }, answer: [{ status: 500, body: {} }] })
  ];
  ok("six runs, success and failure, each logged something", runs.every(r => r.logs.length > 0), JSON.stringify(runs.map(r => r.logs)));
  ok("  and none of it names the address", runs.every(r => r.logs.every(l => !l.includes("private.person"))), JSON.stringify(runs.map(r => r.logs)));

  const text = "UNIQUE-MESSAGE-TEXT-7731";
  let r = await call(feedback, { body: withReport({ message: "Please look at " + text, email: who }) });
  ok("a sent report logs the reference only", r.logs.length === 1 && r.logs[0] === `[feedback] sent ${r.json.ref}`, JSON.stringify(r.logs));
  r = await call(feedback, { body: withReport({ message: "Please look at " + text, email: who }), answer: [{ status: 500, body: { name: "application_error", message: "An unexpected error occurred." } }] });
  ok("a failed report logs neither message nor address",
     r.logs.length > 0 && r.logs.every(l => !l.includes(text) && !l.includes("private.person")), JSON.stringify(r.logs));
});

(async () => {
  for (const run of queue) await run();
  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) console.log("Failed:\n  " + failures.join("\n  "));
  process.exit(fail ? 1 : 0);
})();
