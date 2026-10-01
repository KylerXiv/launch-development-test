// POST /api/subscribe — "Subscribe for updates" on the illustrated journey page.
//
// Receives { email, page }. Saves nothing: it emails the address a link to
// confirm, and the address joins the list only once its owner has clicked it
// (api/confirm.js). That is double opt-in — chosen on 1 Oct 2026 so that
// nobody can put someone else's address on the list, and this project's
// domain is not the one sending updates to people who never asked.
//
// The answer is the same whether or not the address is already subscribed,
// so the form cannot be used to find out who is on the list.

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
  const site = mail.siteUrl(req);
  if (!site) return mail.reply(res, 400, { ok: false, error: "Malformed request." });

  const link = `${site}/api/confirm?t=${mail.makeToken(cfg.secret, "confirm", email)}`;
  const sent = await mail.sendEmail(cfg, {
    to: [email],
    subject: "Confirm your subscription to LAUNCH dashboard updates",
    ...mail.letter({
      heading: "Please confirm your subscription",
      paras: [
        "Someone, hopefully you, asked to get an email when the data on the LAUNCH Transparency Dashboard is updated: new milestones, corrected figures and newly verified country registrations.",
        "To start getting these emails, confirm below."
      ],
      button: { label: "Confirm my subscription", href: link },
      small: [
        { text: `The link works for ${mail.CONFIRM_DAYS} days.` },
        { text: "If this wasn't you, ignore this email. You won't be subscribed, and you won't hear from us again." }
      ]
    }),
    form: "subscribe-confirm"
  });
  if (!sent.ok) {
    mail.logFailure("subscribe", "send confirmation", sent);
    return mail.reply(res, 502, { ok: false, error: "Could not send the confirmation email just now." });
  }

  console.log("[subscribe] confirmation sent");
  return mail.reply(res, 200, { ok: true, pending: true });
};
