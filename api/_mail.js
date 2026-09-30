// Shared code for the Vercel functions behind the illustrated journey page's
// forms — today api/subscribe.js ("Subscribe for updates"); api/feedback.js
// ("Send feedback") joins it next. The leading underscore keeps Vercel from
// deploying this file as a route of its own.
//
// Resend is called with plain fetch, not its npm package: the repo has no
// package.json on purpose (docs/developer-guide.md §1), and two POSTs do not
// justify starting one.
//
// The one secret is RESEND_API_KEY, set on the Vercel project and never in the
// repo. Full access, not "Sending access" — subscribe writes a contact, which a
// sending-only key may not do. The addresses below are not secret, so they
// live here, where a change to them is reviewed like any other.
//
// See docs/email-backend-notes.md for why it is built this way.

const RESEND = "https://api.resend.com";

// Where the mail goes. `to` is required: until it is filled in, the functions
// answer 503 and the log says what is missing.
const ADDRESSES = {
  // Sender, on a domain verified in Resend. Left empty, Resend's shared test
  // sender is used, which only delivers to the Resend account's own address.
  from: "",
  // The team inbox, as a list. A shared mailbox, not a person.
  to: [],
  // Resend segment that subscribers join, so a broadcast can go to exactly
  // them. Optional: without it they are plain contacts.
  segment: ""
};
const DEFAULT_FROM = "LAUNCH dashboard <onboarding@resend.dev>";

// The same test both forms already run in the browser, so an address the page
// accepts is never refused here.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function config() {
  const key = (process.env.RESEND_API_KEY || "").trim();
  const to = ADDRESSES.to.map(s => s.trim()).filter(Boolean);
  if (!key || !to.length) return null;
  return {
    key,
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

// Returns the parsed JSON body, or sends the error response and returns null.
function readRequest(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    reply(res, 405, { ok: false, error: "Use POST." });
    return null;
  }

  // Same-origin only. The page posts from its own origin even inside RBM's
  // iframe, so any other Origin is a different site trying to use this as a
  // mail relay. A request with no Origin is curl or a server, which could
  // forge the header anyway — this guards browsers, not scripts.
  const origin = req.headers.origin;
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch (e) { /* malformed → refused below */ }
    const own = [req.headers["x-forwarded-host"], req.headers.host].filter(Boolean);
    if (!host || !own.includes(host)) {
      reply(res, 403, { ok: false, error: "Cross-origin requests are not accepted." });
      return null;
    }
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
  // Loud in the logs, because from the outside this looks like any failure.
  console.error(`[${form}] not configured: needs RESEND_API_KEY on the Vercel project and ADDRESSES.to in api/_mail.js.`);
  reply(res, 503, { ok: false, error: "Not configured." });
}

// One line of visitor text: control characters (CR/LF included) become
// spaces, so nothing typed can break a subject line.
function line(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

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

async function resendPost(cfg, path, body) {
  let res;
  try {
    res = await fetch(RESEND + path, {
      method: "POST",
      headers: { Authorization: "Bearer " + cfg.key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000)
    });
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

function sendEmail(cfg, { subject, text, html, replyTo, form }) {
  const body = { from: cfg.from, to: cfg.to, subject, text, html, tags: [{ name: "form", value: form }] };
  if (replyTo) body.reply_to = replyTo;
  return resendPost(cfg, "/emails", body);
}

function addContact(cfg, email) {
  const body = { email };
  if (cfg.segment) body.segments = [{ id: cfg.segment }];
  return resendPost(cfg, "/contacts", body);
}

module.exports = {
  ADDRESSES, EMAIL_RE, config, reply, readRequest, notConfigured,
  line, esc, render, sendEmail, addContact, logFailure
};
