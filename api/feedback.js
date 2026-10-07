// POST /api/feedback — "Send feedback" on the illustrated journey page.
//
// Receives the payload assets/report-issue.js builds (its header documents the
// shape), re-checks what the widget already checked in the browser, and emails
// it to the team inbox through Resend. Answers { ok: true, ref } — the widget
// shows that reference to the visitor, and the same reference is in the
// subject line of the team's copy, so the two can be matched when quoted.
//
// Only a page that sets LAUNCH_FEEDBACK_COPY.connected posts here, and only
// the illustrated journey page does. Every other page's widget sends nothing.

const mail = require("./_mail.js");

// The widget's own four values. A page may relabel them for visitors, but the
// value is what arrives here, so the team always reads the same four labels
// whichever page a report came from.
const TYPES = {
  correction: "A data point looks wrong",
  source: "A source is missing, broken or out of date",
  suggestion: "Suggestion or feature request",
  other: "Something else"
};

module.exports = async function feedback(req, res) {
  const body = mail.readRequest(req, res);
  if (!body) return;
  const cfg = mail.config();
  if (!cfg) return mail.notConfigured(res, "feedback");

  // Same limits the widget enforces: a message of 10 to 2000 characters, and
  // an optional address that must look like one.
  const message = mail.block(body.message, 2000);
  if (message.length < 10) {
    return mail.reply(res, 400, { ok: false, error: "Please describe the issue — at least 10 characters." });
  }
  const email = mail.line(body.email, 254);
  if (email && !mail.EMAIL_RE.test(email)) {
    return mail.reply(res, 400, { ok: false, error: "That email address does not look right." });
  }

  const type = Object.prototype.hasOwnProperty.call(TYPES, body.type) ? body.type : "other";
  const product = mail.line(body.productName, 120) || "General — the dashboard as a whole";
  const name = mail.line(body.name, 200);
  const org = mail.line(body.organisation, 200);
  const page = body.page && typeof body.page === "object" ? body.page : {};
  const data = body.data && typeof body.data === "object" ? body.data : {};
  const version = [mail.line(data.lastUpdated, 40), mail.line(data.dataStatus, 40)].filter(Boolean);
  const ref = mail.newRef();

  // Laid out as a form (mail.render). The page address is the visitor's own
  // report of where they were, so it is shown as text, never as a link.
  const MUTED = { tone: "muted" };
  const rows = [
    ["Reference", ref],
    ["About", TYPES[type]],
    ["Medicine", product],
    ["Name", name || "Not given", name ? null : MUTED],
    ["Email address", email || "Not given, so this cannot be answered", email ? null : { tone: "warn" }],
    ["Organisation", org || "Not given", org ? null : MUTED],
    ["Page", mail.line(page.url, 500) || "Not recorded"],
    // Which data the visitor was looking at — a correction is only checkable
    // against the version it was made on.
    ["Data version", version.length ? version.join(" · ") : "Not recorded"],
    ["Received", mail.when()],
    ["Browser", mail.line(body.userAgent, 300) || "Not recorded", MUTED]
  ];

  const sent = await mail.sendEmail(cfg, {
    subject: `[LAUNCH feedback] ${TYPES[type]} — ${product} (${ref})`,
    ...mail.render("New feedback", message, rows, {
      intro: `${TYPES[type]} · ${product}`,
      footer: email
        ? `Reference ${ref}. Reply to this email to answer them: the reply goes to ${email}.`
        : `Reference ${ref}. They left no email address, so this cannot be answered.`
    }),
    // Reply in the inbox goes straight to the visitor when they left an address.
    replyTo: email || null,
    form: "feedback"
  });
  if (!sent.ok) {
    mail.logFailure("feedback", "send " + ref, sent);
    return mail.reply(res, 502, { ok: false, error: "Could not send just now." });
  }

  console.log(`[feedback] sent ${ref}`);   // the reference only — never the contents
  return mail.reply(res, 200, { ok: true, ref });
};
