// GET/POST /api/unsubscribe?t=… — the unsubscribe link in the welcome email,
// and the mail app's own "Unsubscribe" button (List-Unsubscribe-Post, RFC
// 8058), which POSTs here directly.
//
// GET shows a page with an "Unsubscribe" button: many mail systems open every
// link in an incoming email to scan it, and must not unsubscribe anyone by
// doing so. The POST marks the Resend contact unsubscribed — the same flag
// Resend's own broadcast unsubscribe link sets, so every later broadcast skips
// the address. The contact itself is kept, as Resend does: deleting it would
// lose the record that this address said no.

const mail = require("./_mail.js");

const BAD_LINK = {
  title: "This link doesn't work",
  paras: ["It may have been copied incompletely. Use the unsubscribe link in your most recent email from us."]
};
const FAILED = {
  title: "Sorry, that didn't work",
  paras: ["We could not unsubscribe you just now. Please try the link again in a few minutes."]
};

module.exports = async function unsubscribe(req, res) {
  const link = mail.readLink(req, res);
  if (!link) return;
  const cfg = mail.config();
  if (!cfg) {
    mail.logNotConfigured("unsubscribe");
    return mail.page(res, 503, FAILED);
  }

  const who = mail.readToken(cfg.secret, "unsubscribe", link.token);
  if (!who || !who.email) return mail.page(res, 400, BAD_LINK);
  const email = who.email;

  if (link.method === "GET") {
    return mail.page(res, 200, {
      title: "Unsubscribe from LAUNCH dashboard updates?",
      paras: [`${email} will stop getting emails when the dashboard's data is updated.`],
      form: { action: "/api/unsubscribe", token: link.token, label: "Unsubscribe" }
    });
  }

  // An address that is not a contact at all is already not getting emails, so
  // a 404 is still "unsubscribed" — the click must never look like it failed.
  const done = await mail.updateContact(cfg, email, { unsubscribed: true });
  if (!done.ok && done.status !== 404) {
    mail.logFailure("unsubscribe", "unsubscribe contact", done);
    return mail.page(res, 502, FAILED);
  }

  console.log("[unsubscribe] unsubscribed");
  return mail.page(res, 200, {
    title: "You're unsubscribed",
    paras: ["You won't get any more update emails from the LAUNCH dashboard.",
            "Changed your mind? You can subscribe again from the dashboard at any time."]
  });
};
