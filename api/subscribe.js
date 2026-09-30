// POST /api/subscribe — "Subscribe for updates" on the illustrated journey page.
//
// Receives { email, page }. Two steps, in this order:
//
//   1. The address becomes a Resend contact (and joins ADDRESSES.segment when
//      that is set). That list is what the visitor asked to be on, and it is
//      where an update gets sent from — a Resend broadcast, which handles
//      unsubscribes itself. If this fails, the visitor is told it failed.
//   2. The team inbox is told someone subscribed. The visitor is on the list
//      whether or not this lands, so a failure here is logged, not reported.
//
// Nothing is sent to the subscriber. Emailing an address typed into a public
// form, before its owner has confirmed it, would let anyone make this project
// send mail to anyone — see docs/email-backend-notes.md on double opt-in.

const mail = require("./_mail.js");

module.exports = async function subscribe(req, res) {
  const body = mail.readRequest(req, res);
  if (!body) return;
  const cfg = mail.config();
  if (!cfg) return mail.notConfigured(res, "subscribe");

  const email = mail.line(body.email, 254);
  if (!mail.EMAIL_RE.test(email)) {
    return mail.reply(res, 400, { ok: false, error: "Please enter an email address we can reach you at." });
  }

  // Resend contacts are global and keyed on the address, so subscribing twice
  // updates the one contact rather than failing. A 409 is treated the same
  // way in case that ever changes: already on the list is still on the list.
  const contact = await mail.addContact(cfg, email);
  if (!contact.ok && contact.status !== 409) {
    mail.logFailure("subscribe", "add contact", contact);
    return mail.reply(res, 502, { ok: false, error: "Could not subscribe just now." });
  }

  const rows = [
    ["Email", email],
    ["Page", mail.line(body.page, 500) || "—"],
    ["List", cfg.segment ? `Resend contacts, segment ${cfg.segment}` : "Resend contacts"],
    ["Received", new Date().toISOString()]
  ];
  const note = await mail.sendEmail(cfg, {
    subject: "[LAUNCH] New subscriber for dashboard updates",
    ...mail.render("Someone subscribed to updates from the LAUNCH dashboard", "", rows),
    form: "subscribe"
  });
  if (!note.ok) mail.logFailure("subscribe", "notify team", note);

  console.log("[subscribe] contact saved" + (note.ok ? ", team notified" : ", team NOT notified"));
  return mail.reply(res, 200, { ok: true });
};
