// POST /api/subscribe — "Subscribe for updates" on the illustrated journey page.
//
// Receives { email, page }. Single opt-in, the owner's decision on 6 Oct 2026
// (docs/email-backend-notes.md §2.3): the address joins the list at once, and
// the welcome email's unsubscribe link is the way off it. In this order:
//   1. The address becomes a subscribed Resend contact in ADDRESSES.segment:
//      created if new, re-subscribed if it had unsubscribed. If this fails,
//      the form says so, and nothing else happens.
//   2. A welcome email, with an unsubscribe link, goes to the subscriber.
//   3. The team inbox is told.
// A failure in 2 or 3 is logged, not shown: the person is on the list.
//
// Someone already subscribed gets the same answer and no email, so the form
// cannot be used to find out who is on the list, or to send a subscriber the
// welcome over and over.

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
  // Checked before anything is saved: the welcome's links are built from it.
  const site = mail.siteUrl(req);
  if (!site) return mail.reply(res, 400, { ok: false, error: "Malformed request." });
  const failed = () => mail.reply(res, 502, { ok: false, error: "Could not subscribe you just now." });

  // ---- 1. on the list ---------------------------------------------------------
  // Look the address up first. The API reference does not say what a lookup of
  // an unknown address returns, so any 4xx other than an auth or rate-limit
  // answer is taken as "no such contact" and a create is tried — which then
  // fails loudly if that guess was wrong.
  const found = await mail.getContact(cfg, email);
  let state;
  if (found.ok) {
    state = found.data && found.data.unsubscribed ? "returning" : "already";
  } else if (found.status >= 400 && found.status < 500 && ![401, 403, 429].includes(found.status)) {
    state = "new";
  } else {
    mail.logFailure("subscribe", "look up contact", found);
    return failed();
  }

  if (state === "new") {
    const made = await mail.addContact(cfg, email);
    if (!made.ok) {
      mail.logFailure("subscribe", "add contact", made);
      return failed();
    }
  } else if (state === "returning") {
    const back = await mail.updateContact(cfg, email, { unsubscribed: false });
    if (!back.ok) {
      mail.logFailure("subscribe", "re-subscribe contact", back);
      return failed();
    }
  }

  // An existing contact may not be in the segment yet. A failure here is not
  // shown to the person, who is subscribed either way; the team's note says
  // so, because a contact outside the segment misses every broadcast.
  let segmentOk = true;
  if (cfg.segment && state !== "new") {
    const seg = await mail.addToSegment(cfg, email);
    segmentOk = seg.ok || seg.status === 409;
    if (!segmentOk) mail.logFailure("subscribe", "add to segment", seg);
  }

  if (state === "already") {
    console.log("[subscribe] already subscribed");
    return mail.reply(res, 200, { ok: true });
  }

  const unsubscribe = `${site}/api/unsubscribe?t=${mail.makeToken(cfg.secret, "unsubscribe", email)}`;
  // Back to the page they subscribed on: RBM's copy for a partner (its address
  // from PARTNERS, never from the request), this site's page otherwise.
  const partner = mail.partnerOf(req);
  const home = partner ? partner.dashboard : site + mail.DASHBOARD;

  // ---- 2. welcome ----------------------------------------------------------------
  // Anyone can type any address into the form, so the welcome says how to get
  // off the list in the same breath as saying you are on it.
  const welcome = await mail.sendEmail(cfg, {
    to: [email],
    subject: "You're subscribed to LAUNCH dashboard updates",
    ...mail.letter({
      heading: "You're subscribed",
      paras: [
        // The opening sentence is the owner's wording (8 Oct 2026).
        "You're now subscribed to the LAUNCH Transparency Dashboard. We'll email you when its data is updated: new milestones, corrected figures and newly verified country registrations."
      ],
      button: { label: "Open the dashboard", href: home },
      small: [{ text: "Didn't sign up, or don't want these emails?", link: unsubscribe, linkLabel: "Unsubscribe" }]
    }),
    // RFC 2369 + RFC 8058: the mail app's own "Unsubscribe" button, which
    // posts straight to the link with no page in between.
    headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    form: "subscribe-welcome"
  });
  if (!welcome.ok) mail.logFailure("subscribe", "send welcome", welcome);

  // ---- 3. tell the team ------------------------------------------------------------
  // Laid out as a form (mail.render): plain labels, a readable time, the list's
  // name rather than its id, and what (if anything) the team has to do.
  const where = partner ? (partner.name || partner.dashboard) : "LAUNCH dashboard";
  const rows = [
    ["Email address", email],
    ["Signed up", mail.when()],
    ["Signed up on", where, { href: home }],
    ["Subscriber", state === "returning" ? "Returning: had unsubscribed before" : "New"],
    !cfg.segment ? ["Mailing list", "None set: saved as a plain contact", { tone: "muted" }]
      : segmentOk ? ["Mailing list", mail.SEGMENT_NAME]
      : ["Mailing list", `Not added. Add them to "${mail.SEGMENT_NAME}" by hand in Resend (segment ${cfg.segment}).`, { tone: "warn" }]
  ];
  const note = await mail.sendEmail(cfg, {
    subject: "[LAUNCH] New subscriber for dashboard updates",
    ...mail.render("New subscriber", "", rows, {
      intro: segmentOk
        ? "Someone subscribed to updates from the LAUNCH dashboard. Nothing to do: they are on the mailing list, and every update email carries their unsubscribe link."
        : "Someone subscribed to updates from the LAUNCH dashboard. One thing to do: add them to the mailing list by hand (below).",
      footer: "Sent automatically when someone subscribes on the dashboard. Their address is used only for the update emails."
    }),
    form: "subscribe-team"
  });
  if (!note.ok) mail.logFailure("subscribe", "notify team", note);

  console.log("[subscribe] subscribed" + (state === "returning" ? " (returning)" : "") + (note.ok ? ", team notified" : ", team NOT notified"));
  return mail.reply(res, 200, { ok: true });
};
