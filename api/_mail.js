// Shared code for the Vercel functions behind the illustrated journey page's
// forms: the three of "Subscribe for updates" (api/subscribe.js,
// api/confirm.js, api/unsubscribe.js) and "Send feedback" (api/feedback.js).
// The leading underscore keeps Vercel from deploying this file as a route of
// its own.
//
// Resend is called with plain fetch, not its npm package: the repo has no
// package.json on purpose (docs/developer-guide.md §1), and a handful of
// requests do not justify starting one.
//
// Two secrets, set on the Vercel project and never in the repo:
//   RESEND_API_KEY      Full access, not "Sending access" — confirming writes a
//                       contact, which a sending-only key may not do
//   UNSUBSCRIBE_SECRET  32+ random characters. Encrypts the confirm and
//                       unsubscribe links, so none can be forged or read
// The addresses below are not secret, so they live here, where a change to
// them is reviewed like any other.
//
// See docs/email-backend-notes.md for why it is built this way.

const crypto = require("crypto");

const RESEND = "https://api.resend.com";

// Where the mail goes. `to` is required: until it is filled in, the functions
// answer 503 and the log says what is missing.
const ADDRESSES = {
  // Sender, on a domain verified in Resend. Left empty, Resend's shared test
  // sender is used, which only delivers to the Resend account's own address.
  from: "LAUNCH dashboard <updates@tamarind.tech>",
  // The team inbox, as a list. A shared mailbox is the aim; one person's
  // address while this is being tested.
  to: ["kyler@oqtiva.ai"],
  // Resend segment that subscribers join ("LAUNCH dashboard updates"), so a
  // broadcast can go to exactly them. Optional: without it they are plain
  // contacts.
  segment: "759df0a9-0fe5-4b96-ac7a-581fb77a5edc"
};
const DEFAULT_FROM = "LAUNCH dashboard <onboarding@resend.dev>";

// The page every email and every confirm/unsubscribe page links back to.
const DASHBOARD = "/illustrated-journey-dashboard.html";

// How long a confirm link works. Unsubscribe links never expire: they sit in
// emails people keep.
const CONFIRM_DAYS = 7;

// The same test both forms already run in the browser, so an address the page
// accepts is never refused here.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function config() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  const secret = (process.env.UNSUBSCRIBE_SECRET || "").trim();
  const to = ADDRESSES.to.map(s => s.trim()).filter(Boolean);
  if (!key || secret.length < 32 || !to.length) return null;
  return {
    key,
    secret,
    to,
    from: ADDRESSES.from.trim() || DEFAULT_FROM,
    segment: ADDRESSES.segment.trim() || null
  };
}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

// Same-origin only. The page posts from its own origin even inside RBM's
// iframe, so any other Origin is a different site trying to use this as a
// mail relay. A request with no Origin is curl or a server, which could forge
// the header anyway — this guards browsers, not scripts. It is also how a mail
// provider's one-click unsubscribe arrives, so that has to stay allowed.
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host = null;
  try { host = new URL(origin).host; } catch (e) { /* malformed → refused */ }
  const own = [req.headers["x-forwarded-host"], req.headers.host].filter(Boolean);
  return !!host && own.includes(host);
}

// Returns the parsed JSON body, or sends the error response and returns null.
function readRequest(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reply(res, 405, { ok: false, error: "Use POST." });
    return null;
  }

  if (!sameOrigin(req)) {
    reply(res, 403, { ok: false, error: "Cross-origin requests are not accepted." });
    return null;
  }

  // JSON only. Besides being the only thing the forms send, it means a
  // cross-origin browser request needs a CORS preflight, which this never
  // answers — so the check above is not the only thing in the way.
  if (!/^application\/json\b/i.test(req.headers["content-type"] || "")) {
    reply(res, 415, { ok: false, error: "Send JSON." });
    return null;
  }

  let body;
  try { body = req.body; } catch (e) { body = null; }   // Vercel's getter throws on malformed JSON
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    reply(res, 400, { ok: false, error: "Malformed request." });
    return null;
  }
  return body;
}

function notConfigured(res, form) {
  logNotConfigured(form);
  reply(res, 503, { ok: false, error: "Not configured." });
}

// Loud in the logs, because from the outside this looks like any failure.
function logNotConfigured(form) {
  console.error(`[${form}] not configured: needs RESEND_API_KEY and UNSUBSCRIBE_SECRET (32+ characters) on the Vercel project, and ADDRESSES.to in api/_mail.js.`);
}

// One line of visitor text: control characters (CR/LF included) become
// spaces, so nothing typed can break a subject line.
function line(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

// A block of visitor text: keeps line breaks and tabs, drops other controls.
function block(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// A feedback report's reference. The visitor is shown it and may quote it, so
// it also goes in the subject line of the team's copy, where search finds it.
function newRef() {
  return "LAUNCH-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// ---- links in emails ---------------------------------------------------------

// The site's own address, for links in emails. Vercel sets the host the
// request arrived on, so a preview's emails link to that preview. Anything
// that does not look like a host name is refused rather than mailed out.
function siteUrl(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return null;
  const proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  return (proto === "http" ? "http" : "https") + "://" + host;
}

// A confirm or unsubscribe link carries its address ENCRYPTED (AES-256-GCM),
// not merely signed. Signing would stop forgery, but the address would still
// be readable in the URL — and URLs land in Vercel's request logs, which must
// never carry an address. The key is derived from UNSUBSCRIBE_SECRET.
function linkKey(secret) {
  return Buffer.from(crypto.hkdfSync("sha256", secret, "launch-dashboard", "email-links-v1", 32));
}

function makeToken(secret, purpose, email, now = Date.now()) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", linkKey(secret), iv);
  const plain = JSON.stringify({ p: purpose, e: email, t: Math.floor(now / 1000) });
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, body, c.getAuthTag()]).toString("base64url");
}

// → { email } for a good link, { expired: true } for a confirm link past its
// days, or null for anything else: tampered, wrong purpose, wrong key, junk.
function readToken(secret, purpose, token, now = Date.now()) {
  if (typeof token !== "string" || token.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const raw = Buffer.from(token, "base64url");
  if (raw.length < 12 + 16 + 2) return null;
  let v;
  try {
    const d = crypto.createDecipheriv("aes-256-gcm", linkKey(secret), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(raw.length - 16));
    v = JSON.parse(Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString("utf8"));
  } catch (e) {
    return null;
  }
  if (!v || v.p !== purpose || typeof v.e !== "string" || !EMAIL_RE.test(v.e) || !Number.isInteger(v.t)) return null;
  if (purpose === "confirm" && now / 1000 - v.t > CONFIRM_DAYS * 86400) return { expired: true };
  return { email: v.e };
}

// For the two link endpoints (confirm, unsubscribe): GET shows a page with a
// button, POST does the thing. Returns { method, token }, or sends the error
// page and returns null. The token comes from the query string (the link in
// the email, and a mail provider's one-click POST) or the posted form.
function readLink(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    page(res, 405, { title: "Not here", paras: ["Open the link from your email instead."] });
    return null;
  }
  // The button on these pages posts with `Origin: null`: their
  // Referrer-Policy is no-referrer (so the token in the URL is never passed
  // on), and a browser then sends a null Origin even to the same site. The
  // encrypted token is what authorises the POST; this check only turns away
  // a request that names some other site.
  if (req.method === "POST" && req.headers.origin !== "null" && !sameOrigin(req)) {
    page(res, 403, { title: "Not here", paras: ["Open the link from your email instead."] });
    return null;
  }
  let token = "";
  try { token = new URL(req.url || "/", "http://x").searchParams.get("t") || ""; } catch (e) { /* none */ }
  if (!token && req.method === "POST") {
    let body = null;
    try { body = req.body; } catch (e) { body = null; }
    if (typeof body === "string") token = new URLSearchParams(body).get("t") || "";
    else if (body && typeof body === "object" && typeof body.t === "string") token = body.t;
  }
  return { method: req.method, token };
}

// ---- pages -------------------------------------------------------------------

// The small pages a confirm or unsubscribe link opens. Not indexed, not
// framed, and no Referer: the URL carries the token, and "Back to the
// dashboard" must not hand it to anyone.
function page(res, status, { title, paras = [], form = null, back = true }) {
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
  const button = form
    ? `<form method="post" action="${esc(form.action)}"><input type="hidden" name="t" value="${esc(form.token)}">` +
      `<button type="submit">${esc(form.label)}</button></form>`
    : "";
  res.end(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)} · LAUNCH dashboard</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; background: #f4f7f8; color: #1a1a1a; font: 16px/1.55 -apple-system, "Segoe UI", Arial, sans-serif; }
  main { max-width: 520px; margin: 12vh auto 0; padding: 32px 28px; background: #fff; border: 1px solid #dde5e8; border-radius: 14px; }
  .brand { margin: 0 0 18px; color: #0E5A73; font-size: 13px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
  h1 { margin: 0 0 12px; font-size: 24px; line-height: 1.25; }
  p { margin: 0 0 14px; }
  button { margin-top: 8px; padding: 11px 20px; border: 0; border-radius: 8px; background: #0E5A73; color: #fff; font: inherit; font-weight: 650; cursor: pointer; }
  button:focus-visible, a:focus-visible { outline: 2px solid #1a1a1a; outline-offset: 2px; }
  a { color: #0E5A73; }
  .back { margin-top: 22px; font-size: 14px; }
  @media (max-width: 560px) { main { margin: 16px; padding: 24px 20px; } }
</style></head>
<body><main>
<p class="brand">LAUNCH Transparency Dashboard</p>
<h1>${esc(title)}</h1>
${paras.map(p => `<p>${esc(p)}</p>`).join("\n")}
${button}
${back ? `<p class="back"><a href="${DASHBOARD}">Back to the dashboard</a></p>` : ""}
</main></body></html>`);
}

// ---- emails ------------------------------------------------------------------

// Plain-text and HTML bodies from the same parts. Every visitor-supplied value
// is escaped, and none is ever made into a link: the inbox reading these is
// the team's, and a form is an easy way to put a phishing URL in front of it.
function render(heading, message, rows) {
  const text = [heading, "", message, "", ...rows.map(([k, v]) => `${k}: ${v}`)]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
  const cell = "padding:3px 14px 3px 0;vertical-align:top";
  const html =
    `<div style="font:14px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#1a1a1a">` +
    `<p style="margin:0 0 12px;font-weight:600">${esc(heading)}</p>` +
    (message
      ? `<div style="margin:0 0 16px;padding:12px 14px;border-left:3px solid #0E5A73;background:#f4f7f8;white-space:pre-wrap">${esc(message)}</div>`
      : "") +
    `<table style="border-collapse:collapse;font-size:13px">` +
    rows.map(([k, v]) =>
      `<tr><td style="${cell};color:#666">${esc(k)}</td><td style="${cell}">${esc(v)}</td></tr>`).join("") +
    `</table></div>`;
  return { text, html };
}

// An email to a subscriber: a heading, a few paragraphs, one button, and small
// print. Every link in it is one this code built from the site's own address,
// never anything a visitor typed.
function letter({ heading, paras, button, small = [] }) {
  const text = [heading, "", ...paras.flatMap(p => [p, ""]),
    `${button.label}: ${button.href}`, "", ...small.map(s => s.link ? `${s.text} ${s.link}` : s.text)]
    .join("\n").replace(/\n+$/, "") + "\n";
  const html =
    `<div style="max-width:520px;font:15px/1.55 -apple-system,Segoe UI,Arial,sans-serif;color:#1a1a1a">` +
    `<p style="margin:0 0 6px;color:#0E5A73;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">LAUNCH Transparency Dashboard</p>` +
    `<p style="margin:0 0 14px;font-size:20px;font-weight:650">${esc(heading)}</p>` +
    paras.map(p => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("") +
    `<p style="margin:18px 0 22px"><a href="${esc(button.href)}" style="display:inline-block;padding:11px 20px;border-radius:8px;background:#0E5A73;color:#ffffff;font-weight:650;text-decoration:none">${esc(button.label)}</a></p>` +
    small.map(s => `<p style="margin:0 0 8px;color:#666;font-size:13px">${esc(s.text)}` +
      (s.link ? ` <a href="${esc(s.link)}" style="color:#666">${esc(s.linkLabel || s.link)}</a>` : "") + `</p>`).join("") +
    `</div>`;
  return { text, html };
}

// ---- Resend ------------------------------------------------------------------

async function resendRequest(cfg, method, path, body) {
  let res;
  try {
    const init = { method, headers: { Authorization: "Bearer " + cfg.key }, signal: AbortSignal.timeout(8000) };
    if (body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    res = await fetch(RESEND + path, init);
  } catch (err) {
    return { ok: false, status: 0, name: err.name || "network_error", message: err.message || "" };
  }
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, name: data.name || "", message: data.message || "", data };
}

// Status and Resend's own error name/message only. Never the submission: the
// payload carries names, addresses and organisations, and function logs are
// kept on the Vercel project under whatever retention it happens to have.
function logFailure(form, what, r) {
  console.error(`[${form}] ${what} failed: HTTP ${r.status} ${r.name} ${String(r.message).slice(0, 200)}`.trim());
}

// To the team inbox unless `to` says otherwise.
function sendEmail(cfg, { to, subject, text, html, replyTo, headers, form }) {
  const body = { from: cfg.from, to: to || cfg.to, subject, text, html, tags: [{ name: "form", value: form }] };
  if (replyTo) body.reply_to = replyTo;
  if (headers) body.headers = headers;
  return resendRequest(cfg, "POST", "/emails", body);
}

const contactPath = (email) => "/contacts/" + encodeURIComponent(email);

function getContact(cfg, email) {
  return resendRequest(cfg, "GET", contactPath(email));
}

function updateContact(cfg, email, fields) {
  return resendRequest(cfg, "PATCH", contactPath(email), fields);
}

function addContact(cfg, email) {
  const body = { email, unsubscribed: false };
  if (cfg.segment) body.segments = [{ id: cfg.segment }];
  return resendRequest(cfg, "POST", "/contacts", body);
}

function addToSegment(cfg, email) {
  return resendRequest(cfg, "POST", contactPath(email) + "/segments/" + encodeURIComponent(cfg.segment));
}

module.exports = {
  ADDRESSES, EMAIL_RE, DASHBOARD, CONFIRM_DAYS,
  config, reply, readRequest, notConfigured, logNotConfigured,
  line, block, esc, newRef, siteUrl, makeToken, readToken, readLink, page,
  render, letter, sendEmail, getContact, updateContact, addContact, addToSegment, logFailure
};
