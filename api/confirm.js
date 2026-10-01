// GET/POST /api/confirm?t=… — the link in the "Please confirm your
// subscription" email.
//
// GET shows a page with a "Confirm subscription" button; only the POST from
// that button subscribes. Many mail systems open every link in an incoming
// email to scan it, and a GET that subscribed would be confirmed by the
// scanner before the person had read a word, which defeats double opt-in.
//
// On the POST, in this order:
//   1. The address becomes a subscribed Resend contact in ADDRESSES.segment:
//      created if new, re-subscribed if it had unsubscribed (clicking the
//      link proves the address is theirs). If this fails, the page says so,
//      and nothing else happens.
//   2. A welcome email, with an unsubscribe link, goes to the subscriber.
//   3. The team inbox is told.
// A failure in 2 or 3 is logged, not shown: the person is on the list.
// Someone already subscribed sees "already subscribed", and no email is sent.

const mail = require("./_mail.js");

const BAD_LINK = {
  title: "This link doesn't work",
  paras: ["It may have been copied incompletely. Subscribe again from the dashboard to get a new one."]
};
const EXPIRED = {
  title: "This link has expired",
  paras: [`Confirm links work for ${mail.CONFIRM_DAYS} days. Subscribe again from the dashboard to get a new one.`]
};
const FAILED = {
  title: "Sorry, that didn't work",
  paras: ["We could not confirm your subscription just now. Please try the link in your email again in a few minutes."]
};

module.exports = async function confirm(req, res) {
  const link = mail.readLink(req, res);
  if (!link) return;
  const cfg = mail.config();
  if (!cfg) {
    mail.logNotConfigured("confirm");
    return mail.page(res, 503, FAILED);
  }

  const who = mail.readToken(cfg.secret, "confirm", link.token);
  if (!who) return mail.page(res, 400, BAD_LINK);
  if (who.expired) return mail.page(res, 400, EXPIRED);
  const email = who.email;

  if (link.method === "GET") {
    return mail.page(res, 200, {
      title: "Confirm your subscription",
      paras: [`Send ${email} an email when the data on the LAUNCH Transparency Dashboard is updated?`,
              "Didn't ask for this? Close this page and nothing will happen."],
      form: { action: "/api/confirm", token: link.token, label: "Confirm subscription" }
    });
  }

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
    mail.logFailure("confirm", "look up contact", found);
    return mail.page(res, 502, FAILED);
  }

  if (state === "new") {
    const made = await mail.addContact(cfg, email);
    if (!made.ok) {
      mail.logFailure("confirm", "add contact", made);
      return mail.page(res, 502, FAILED);
    }
  } else if (state === "returning") {
    const back = await mail.updateContact(cfg, email, { unsubscribed: false });
    if (!back.ok) {
      mail.logFailure("confirm", "re-subscribe contact", back);
      return mail.page(res, 502, FAILED);
    }
  }

  // An existing contact may not be in the segment yet. A failure here is not
  // shown to the person, who is subscribed either way; the team's note says
  // so, because a contact outside the segment misses every broadcast.
  let segmentOk = true;
  if (cfg.segment && state !== "new") {
    const seg = await mail.addToSegment(cfg, email);
    segmentOk = seg.ok || seg.status === 409;
    if (!segmentOk) mail.logFailure("confirm", "add to segment", seg);
  }

  if (state === "already") {
    console.log("[confirm] already subscribed");
    return mail.page(res, 200, {
      title: "You're already subscribed",
      paras: ["Nothing has changed: we'll keep emailing you when the dashboard's data is updated. Every email has an unsubscribe link."]
    });
  }

  const site = mail.siteUrl(req);
  const unsubscribe = site && `${site}/api/unsubscribe?t=${mail.makeToken(cfg.secret, "unsubscribe", email)}`;

  // ---- 2. welcome ----------------------------------------------------------------
  if (site) {
    const welcome = await mail.sendEmail(cfg, {
      to: [email],
      subject: "You're subscribed to LAUNCH dashboard updates",
      ...mail.letter({
        heading: "You're subscribed",
        paras: [
          "Thanks for confirming. We'll email you when the data on the LAUNCH Transparency Dashboard is updated: new milestones, corrected figures and newly verified country registrations."
        ],
        button: { label: "Open the dashboard", href: site + mail.DASHBOARD },
        small: [{ text: "Don't want these emails?", link: unsubscribe, linkLabel: "Unsubscribe" }]
      }),
      // RFC 2369 + RFC 8058: the mail app's own "Unsubscribe" button, which
      // posts straight to the link with no page in between.
      headers: { "List-Unsubscribe": `<${unsubscribe}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      form: "subscribe-welcome"
    });
    if (!welcome.ok) mail.logFailure("confirm", "send welcome", welcome);
  }

  // ---- 3. tell the team ------------------------------------------------------------
  const rows = [
    ["Email", email],
    ["Confirmed", new Date().toISOString()],
    ["Returning", state === "returning" ? "yes — had unsubscribed before" : "no"],
    ["Segment", !cfg.segment ? "none set" : segmentOk ? cfg.segment : `NOT ADDED to ${cfg.segment} — add by hand in Resend`]
  ];
  const note = await mail.sendEmail(cfg, {
    subject: "[LAUNCH] New subscriber for dashboard updates",
    ...mail.render("Someone confirmed a subscription to updates from the LAUNCH dashboard", "", rows),
    form: "subscribe-team"
  });
  if (!note.ok) mail.logFailure("confirm", "notify team", note);

  console.log("[confirm] subscribed" + (state === "returning" ? " (returning)" : "") + (note.ok ? ", team notified" : ", team NOT notified"));
  return mail.page(res, 200, {
    title: "You're subscribed",
    paras: [`We'll email ${email} when the dashboard's data is updated. Every email has an unsubscribe link.`]
  });
};
