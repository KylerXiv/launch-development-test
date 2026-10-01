# Email backend for the forms — working notes

This document covers `api/`, the Vercel functions behind
`illustrated-journey-dashboard.html`'s two forms: **Subscribe for updates**
(`subscribe.js`, `confirm.js`, `unsubscribe.js`) and, since 2 Oct, **Send
feedback** (`feedback.js`), with shared code in `_mail.js`. Per
[CLAUDE.md](../CLAUDE.md), this document is updated in the same commit as any
change it describes. What the visitor sees is covered in
[illustrated-journey-ui-notes.md](illustrated-journey-ui-notes.md) §3.10
(Subscribe) and §3.27 (Send feedback). The scoping this builds on is in
[Handoff_Kyler.md](Handoff_Kyler/Handoff_Kyler.md), under "Newly scoped — the
two buttons, and a backend for them" (23 Sep 2026).

The code was first written on 29 Sep for both forms and left uncommitted. On
1 Oct it was saved as-is on `email-feedback-wip` (`b39c3b0`), and
`email-subscribe` (PR #30, merged 1 Oct) took the Subscribe half of it.
Subscribe became double opt-in the same day (§2.3). On 2 Oct
`email-feedback` took the feedback half, fitted to the widget as Keith had
reworked it on 30 Sep (§2.12).

---

## 1. Switching it on

The functions are inert until they have both secrets and a team inbox. Until
then, the form shows its failure message, and the function log names what is
missing.

1. **In Resend, verify the sending domain** (SPF and DKIM records in its DNS).
   Without it, Resend sends only from its shared test sender,
   `onboarding@resend.dev`, and delivers only to the account's own address.
   Any other recipient gets `403 validation_error: You can only send testing
   emails to your own email address`. Double opt-in emails the visitor, so
   nothing works for real visitors until this is done.
2. **Create an API key with Full access, not "Sending access".** Confirming
   writes a contact, which a sending-only key cannot do. With a sending-only
   key, the confirm page fails with `401 restricted_api_key` in the log.
3. **Create a segment** (Resend → Audience → Segments), e.g. "LAUNCH dashboard
   updates". A broadcast has to name a segment, so this is what an update is
   later sent to.
4. **Fill in `ADDRESSES` at the top of `api/_mail.js`:**

   | Field | Required | Value |
   | --- | --- | --- |
   | `to` | yes | the team inbox, as a list. A shared mailbox, not a person |
   | `from` | no | e.g. `LAUNCH dashboard <updates@your-domain>`, on the domain verified in step 1. Empty means the test sender |
   | `segment` | no | the segment ID from step 3. Empty means plain contacts, which no broadcast can target on its own |

   **Set on 1 Oct 2026:** `from` is `LAUNCH dashboard <updates@tamarind.tech>`
   (`tamarind.tech` is verified in Resend), `to` is `kyler@oqtiva.ai` (first
   set to `kyler@tamarind.tech`, changed the same day), and `segment` is
   "LAUNCH dashboard updates". The inbox need not be on the sender's domain:
   only the sender has to be verified.

5. **On the Vercel project, under Settings → Environment Variables, add two
   variables** for Production, and for Preview if PR previews should work
   too (§4):

   | Variable | Value |
   | --- | --- |
   | `RESEND_API_KEY` | the `re_…` key from step 2 |
   | `UNSUBSCRIBE_SECRET` | 32 or more random characters, e.g. the output of `openssl rand -hex 32`. It encrypts the links in emails (§2.5). Changing it breaks every confirm and unsubscribe link already sent |

   Then redeploy: env var changes reach new deployments only.
   `RESEND_API_KEY` was set on 1 Oct, for Production and Preview.
6. **Test, on the page:**
   1. Subscribe. The page says "Almost there — we've emailed you a link", and
      a "Please confirm your subscription" email arrives.
   2. Click its button. A page asks you to confirm. Nothing is saved yet.
   3. Press **Confirm subscription**. The page says "You're subscribed", the
      contact appears in the segment, a welcome email arrives with an
      unsubscribe link, and a "New subscriber" note arrives at `to`.
   4. Use the welcome's unsubscribe link, then subscribe and confirm again.
      The contact should come back as subscribed.

   From a terminal, without saving anything:

   ```bash
   curl -sS -X POST https://<host>/api/subscribe \
     -H 'Content-Type: application/json' -d '{"email":"nope"}'
   # → 400 "Please enter an email address…" means it is deployed and configured;
   #   503 "Not configured." means a secret or the inbox is missing
   ```

7. **Send feedback needs nothing more.** It uses the same key, secret and
   `ADDRESSES.to`, and it never writes a contact or emails the visitor.
   Test on the illustrated journey page:
   1. Send feedback, with an email address filled in. The dialog says
      "Thanks — your feedback has been sent." and shows a
      `LAUNCH-XXXXXXXX` reference.
   2. An email `[LAUNCH feedback] … (LAUNCH-XXXXXXXX)` arrives at `to`,
      with the same reference, the message, the page and the data version.
   3. Reply to it. The reply is addressed to the address typed in the form.
   4. Another page (Pipeline, say) still shows Send blocked and the red
      "Mock only" note.

   From a terminal, without sending anything:

   ```bash
   curl -sS -X POST https://<host>/api/feedback \
     -H 'Content-Type: application/json' -d '{"message":"short"}'
   # → 400 "Please describe the issue…" means it is deployed and configured;
   #   503 "Not configured." means a secret or the inbox is missing
   ```
8. **Before real visitors, add the rate-limit rule** (§2.9). Vercel → the
   project (not the team) → **Firewall** in its sidebar → **Configure**, top
   right → **+ New Rule**:
   - name it, e.g. "Form endpoints";
   - **If** Request Path *starts with* `/api/`, and Method is `POST` (every
     condition must hold);
   - **Then** *Rate Limit*: Fixed Window, Time Window **10 minutes**,
     Request Limit **5**, counted by **IP**, action Default (429);
   - **Save Rule**, then **Review Changes** → **Publish**. Nothing applies
     until it is published. No redeploy is needed.

   A Hobby project gets exactly one rate-limit rule, with a window of 10 s
   to 10 min (Vercel's docs, read 2 Oct). Both forms already show their
   failure message on a 429.

**Sending updates to subscribers** is a Resend broadcast to the segment. It is
written and sent from the Resend dashboard, not from this repo. Include
`{{{RESEND_UNSUBSCRIBE_URL}}}` in it. That link sets the same `unsubscribed`
flag as this repo's own unsubscribe page, and the page and the welcome email
both promise every email has one.

---

## 2. Decisions, and why

### 2.1 Vercel functions calling Resend over plain `fetch`

As scoped on 23 Sep: `api/` at the repo root, deployed by Vercel independently
of `outputDirectory`. The page posts same-origin, including inside RBM's
iframe, so there is no CORS and nothing to negotiate with RBM. The path is
absolute (`/api/subscribe`), so the `/fr/` and `/pt/` copies of the page post
to the same function.

Checked on 1 Oct with `vercel build` from CLI **60.1.3**, the version
`pr-preview.yml` pins, on a copy of the repo with a placeholder project link.
It produced exactly three functions: `api/confirm`, `api/subscribe` and
`api/unsubscribe`. `_mail.js` was bundled into each and not exposed as a
route. The static output (96 files) contains nothing from `api/`.

| Rejected | Because |
| --- | --- |
| Resend's npm package | Needs a `package.json`, which the repo does not have on purpose (developer-guide §1). The whole integration is a handful of requests |
| `mailto:`, a form-relay service, a separate mailing-list platform | Rejected on 23 Sep — see the handoff doc |
| Resend Automations for the welcome email | Its unsubscribe placeholder would come for free, but the email's wording would live in Resend's dashboard, out of review, and its trigger API was not documented clearly enough to build on (1 Oct) |

### 2.2 Subscribe means a Resend contact plus a note to the team

The handoff left this open (item 5). Three options were put on 1 Oct: email
the team only, a Resend contact plus a note to the team, or both plus a
confirmation email to the subscriber. The second was chosen first. The
address becomes a global Resend contact, joins `ADDRESSES.segment` if set, and
the team inbox gets a note. Since §2.3, all of that happens only on
confirmation.

Notify-us alone was rejected. It leaves the list as a pile of emails in one
inbox, with no unsubscribe handling, and the first update would be a
hand-built BCC. A Resend broadcast handles unsubscribes itself.

This revisits the 23 Sep rejection of "a managed mailing-list platform". That
rejection was about a second vendor and a second account for someone to own.
Resend contacts live in the same account as the sender. Of that rejection's
concerns, double opt-in is now answered (§2.3). Someone committed to actually
sending the updates is still needed.

Resend renamed Audiences to **Segments** before this was built. Contacts are
global, and `POST /broadcasts` requires a `segment_id`, so the segment is what
makes "send an update to the subscribers" one action.

### 2.3 Double opt-in: confirm first, then a welcome with an unsubscribe link

**Revised on 1 Oct.** The first build that day was single opt-in, with nothing
ever sent to the subscriber. The owner then asked for subscribers to be told
they had subscribed, with a way to unsubscribe. Two ways were put:

| Option | |
| --- | --- |
| A welcome email straight away, with an unsubscribe link | **Rejected.** Anyone could type someone else's address and make this project's domain email them, and every such email is a likely spam complaint against `tamarind.tech` |
| **Confirm first** — chosen | The address gets one "Please confirm" email. Nothing is stored, and nothing more is sent, unless its owner clicks |

How it runs:

1. **`POST /api/subscribe`** emails a confirm link and **saves nothing**. Its
   answer is the same whether or not the address is already subscribed, so
   the form cannot be used to find out who is on the list. There is no store
   of unconfirmed addresses to hold, protect or clean up.
2. **`/api/confirm`** saves the address as a subscribed contact in the
   segment. The returning case is handled: someone who had unsubscribed and
   confirms again is re-subscribed, because clicking proves the address is
   theirs. (Under single opt-in, that had to be refused, and it was listed
   as a known gap.) Then a welcome email goes to them, and the team note to
   `to`. Someone already subscribed gets "already subscribed", no email, and
   an **Unsubscribe** button on that page.

   **That button was added after the owner's first real test on the
   preview.** Their address was already a contact, saved by an earlier
   preview of the single opt-in version, so confirming correctly sent
   nothing. But it also left them with no way off the list: they had never
   had a welcome email, so they had no unsubscribe link. Anyone who has lost
   their welcome email is in the same position. Offering the button on this
   page is safe, because clicking the emailed link has just proved the
   address is theirs.
3. **`/api/unsubscribe`** sets the contact's `unsubscribed` flag. That is the
   flag Resend's own broadcast unsubscribe link sets, so later broadcasts skip
   the address either way. The contact is kept, as Resend keeps it: deleting
   it would lose the record that this address said no. An address that is
   not a contact at all still gets "You're unsubscribed": the click must never
   look like it failed.

The welcome carries `List-Unsubscribe` and `List-Unsubscribe-Post:
List-Unsubscribe=One-Click` (RFC 2369, RFC 8058), so the mail app's own
Unsubscribe button works too. That button POSTs straight to the link, with no
page and no Origin.

The team is not told about unsubscribes: the status is in Resend, and a note
per unsubscribe would be noise.

### 2.4 The link pages ask before they act

Opening a confirm or unsubscribe link (GET) shows a page with a button. Only
the button's POST changes anything. Many mail systems open every link in an
incoming email to scan it. A GET that subscribed would be confirmed by the
scanner before the person had read a word, which defeats double opt-in. A GET
that unsubscribed would unsubscribe people at random. The one-click POST from
mail apps (§2.3) is the exception, and is a POST by design.

**Found by the browser run, not by the unit tests:** the button's POST arrived
with `Origin: null`, and the same-origin check refused it. The pages send
`Referrer-Policy: no-referrer`, so the token in the URL is never passed on.
With that policy, a browser sends a null Origin even to its own site. The link
endpoints now accept `Origin: null`. The encrypted token is what authorises
the POST, and the check still refuses a request that names any other site.
`/api/subscribe` still refuses `Origin: null`, since the dashboard's own
`fetch` never sends one. Tests now cover both.

### 2.5 Links are encrypted, not merely signed

A confirm or unsubscribe link carries the address inside an AES-256-GCM token.
The key is derived (HKDF) from `UNSUBSCRIBE_SECRET`, and the token is bound to
its purpose: a confirm link cannot unsubscribe, and the reverse. Confirm links
expire after 7 days; unsubscribe links never expire, because they sit in
emails people keep.

| Rejected | Because |
| --- | --- |
| A signed token (HMAC) | Stops forgery, but the address stays readable in the URL, and URLs land in Vercel's request logs, which must never carry an address (§2.10) |
| `RESEND_API_KEY` as the key, to save one env var | Offered on 1 Oct and declined: replacing the Resend key would then break every link already sent |
| Storing tokens server-side | No database, and none wanted (developer-guide §1) |

Links are built from the host the request arrived on, so a preview's emails
point at that preview. A host header that is not a plain host name is
refused: nothing is mailed out with it. No link in any email is built from
anything the visitor typed. The `page` field the form sends is not used.

### 2.6 Addresses in code, the secrets in env vars

Chosen on 1 Oct. `from`, `to` and `segment` are set in `ADDRESSES` at the top
of `api/_mail.js`. Only `RESEND_API_KEY` and `UNSUBSCRIBE_SECRET` are on the
Vercel project.

The rejected alternative was the 29 Sep design, which had the addresses as env
vars too (`MAIL_TO`, `MAIL_FROM`, `RESEND_SEGMENT_ID`). None of the three
addresses is secret. In the repo, a change to them goes through a pull request
and is recorded in git, and anyone reading the code can see where submissions
go.

The costs:

- Changing the inbox now takes a commit and a deploy, not a dashboard edit.
- Preview and production share one set of addresses. A test on a PR preview
  lands in the real team inbox and the real segment (§4).

### 2.7 Five checks on the addresses as committed

`to` must be non-empty and valid, `from` must be in `Name <address>` form, and
`segment` must be shaped like a Resend id. A typo there would otherwise first
show as a failed send in production. A sender with its closing `>` deleted was
tried, and was caught.

### 2.8 One button at a time

The 29 Sep work switched both forms on at once. It was split on 1 Oct, and
this change is Subscribe alone:

- **It proves the path first.** Subscribe is one page and one field. It
  proves the key, the domain and the Resend account end to end, with the
  smallest thing that can break.
- **Send feedback is the harder merge.** It changes the shared widget,
  `assets/report-issue.js`, which 13 pages load, four of them `synthetic/`
  (fabricated data). Keith's `development` branch reworked that same widget on
  30 Sep (`3b121d0`, "Make Send feedback the shared widget's default"). A trial
  merge of the 29 Sep work onto `keith/development` gave **7 conflict blocks in
  4 files**, and the feedback half was the hard part.

Keith's `development` has since been merged into `main` (PR #26, 1 Oct;
[merge-keith-development-notes.md](merge-keith-development-notes.md)). This
branch was rebased onto that `main` (at `3c747bc`). The Subscribe code applied
cleanly to Keith's reworked page. One conflict, in `docs/developer-guide.md`'s
repo map, was resolved by keeping `main`'s wording for
`assets/report-issue.js` and adding the `api/` row beneath it.

The feedback half was kept whole on `email-feedback-wip`: its function, its
29 tests, the two `_mail.js` helpers only it uses (`block`, `newRef`), and
its doc sections (the opt-in `LAUNCH_FEEDBACK_ENDPOINT`, server-made
references). Until 2 Oct, Send feedback stayed as `main` had it: a mock, with
Send blocked and the red flag in its dialog.

**The split held.** On 2 Oct `email-feedback` brought the feedback half
across from `b39c3b0`, onto `main` at `2d3d8cb`. The function, the two
helpers and the tests ported nearly unchanged. Its switch did not: Keith's
rework already had one, so the 29 Sep switch was dropped in its favour
(§2.12).

### 2.9 Abuse guards, and what was left out

- **Same-origin only** on `/api/subscribe` and `/api/feedback`. A request
  whose `Origin` does not match its own host (`Host` or `x-forwarded-host`) gets a 403. A request with
  no `Origin` is allowed through: that is curl or a server, which could forge
  the header anyway. This guard is against other *websites* using the
  endpoint. The link endpoints apply the same check to POSTs, plus the null
  Origin of §2.4.
- **JSON only** on both (415 otherwise). Besides being all the forms
  send, it forces a CORS preflight on any cross-origin browser request.
  The function never answers one (OPTIONS gets a 405 with no CORS headers).
- **The browser's validation, repeated on the server.** The same email regex
  and a 254-character cap, and for feedback the same 10-to-2000-character
  message. CR/LF cannot reach a header, every value in every email and page
  is HTML-escaped, and nothing a visitor typed ever becomes a link.
- **Feedback mails only the team.** The address typed in the form goes into
  Reply-To and nowhere else. So, unlike Subscribe, the form cannot be used to
  mail a stranger. It can only fill the team inbox and spend the daily Resend
  allowance (§4).
- **The link pages** are `no-store`, `noindex`, sent with no Referer, and have
  a CSP that allows no script, no framing and posting only to themselves.
- **One confirm email per submission, to whatever address is typed.** That
  is inherent in double opt-in. It is far less than a welcome-straight-away
  design sends, but a script could still use the form to send someone
  repeated "Please confirm" emails. Rate limiting is the answer (§4).
- **No honeypot.** The form is rendered by script, with no `action`, so the
  form-scraping bots a honeypot catches never see it. A scripted POST skips a
  honeypot anyway.
- **No rate limiting in the function.** Serverless instances share no memory,
  so an in-function counter limits nothing reliably. The place for it is a
  Vercel Firewall rate-limit rule on POSTs to `/api/*`. That is a dashboard
  setting, not repo code (§1 step 8).
- **The rule's numbers: 5 POSTs per IP per 10 minutes.** A real subscriber
  makes 2 (subscribe, then confirm), and someone sending feedback makes 1
  per report, so 5 leaves room for a retry or a shared office connection.
  10 minutes is the longest window Vercel offers. Even at 1 per 10 minutes,
  one IP could still make 144 requests a day, above Resend's 100 emails a
  day. So the rule slows a script and stops a runaway loop, but it cannot
  protect the daily allowance on its own. The rule also counts the mail
  app's one-click unsubscribe, which arrives from the mail provider's
  servers. At this list's size that is not expected to hit the limit. If it
  did, the 429 would leave the address subscribed, but Resend's own
  broadcast unsubscribe link would still work.

### 2.10 Logs never carry the address

Function logs are kept under whatever retention the Vercel project has (the
handoff flagged this). Successes log `[subscribe] confirmation sent`,
`[confirm] subscribed, team notified`, `[unsubscribe] unsubscribed` and
`[feedback] sent LAUNCH-…` (the reference only), and nothing else. A failure
logs the HTTP status plus Resend's error name and message. A test runs eight
cases (success and failure for each function) and fails if any log names the
address, or for feedback the message. Request logs carry the link URLs, which
is why the tokens are encrypted (§2.5).

### 2.11 Translation: nothing to do in `i18n/`

`i18n/` is deliberately untouched. `translate.yml` runs after a change to this
page reaches `main`, and translates only the new strings: the "Almost there"
message and the longer privacy line. Until then, `/fr` and `/pt` show them in
English, as the translation design intends ("English does not wait for
French"). **The emails and the confirm and unsubscribe pages are English
only** (§4).

Send feedback adds nothing to translate either. Its strings live in
`assets/report-issue.js`, which the locale build copies unchanged, so the
widget has always been English on `/fr` and `/pt`. That includes its new
"sent" wording, and the team's email is English too.

### 2.12 Send feedback: one switch, on one page

**Which pages send.** The owner decided on 2 Oct: the illustrated journey
only. `assets/report-issue.js` is loaded by 13 pages:

| Pages | Send feedback |
| --- | --- |
| The illustrated journey, and its `/fr/` and `/pt/` editions, built from it and served from the same Vercel project | **sends** |
| `index`, `option-b`, `pipeline` and `story`, and the same four under `unitaid/` | mock, as before: Send blocked, red note |
| The four under `synthetic/` (fabricated data) | no widget at all: a broken path, found in passing (§4) |
| RBM's copies of the illustrated journey (`dist/rbm/`) | mock: switched off by the build (below) |

**One switch: `connected`.** Keith's 30 Sep rework (`3b121d0`) gave the
widget a `connected` key, which until now only unblocked Send. The 29 Sep
code had its own switch, `window.LAUNCH_FEEDBACK_ENDPOINT`. Keeping both was
rejected. Two switches make four states, and two of them are wrong:

- `connected` without an endpoint is a working Send button, with a "sent"
  screen, over nothing sent;
- an endpoint without `connected` is a form that could post, but whose
  button is blocked.

So `connected: true` now does both. The endpoint is fixed in the widget as
`/api/feedback`, the only one there is. The path is absolute, so `/fr/` and
`/pt/` reach it.

**The wording follows the switch.** A connected widget defaults its note,
done title and done message to wording that says the message was sent. Every
other page keeps the mock wording as its default. The 29 Sep code put the
"sent" wording in the page's own overrides instead. That was rejected,
because a second page switched on later would show "Mock only" above a
working Send button, and "this isn't sent anywhere" after sending. A page's
overrides still win. The note now names the browser as well as the page and
the data version. The payload has always carried `userAgent`, but the 29 Sep
note left it out.

**RBM's copies are switched off explicitly.** `build-rbm-pages.js` rewrites
`connected: true` to `connected: false`, and its test checks for that. RBM
hosts those files without `api/`, so a connected copy would fail every report
against an `/api/feedback` that is not there. Two alternatives were rejected:

- **Relying on script order.** In RBM's copies, the page's inline scripts
  wait for `dashboard.json`, and `report-issue.js` runs before that. So today
  the widget there never sees the page's settings at all, and stays a mock by
  accident (§4). Fixing that ordering would silently switch posting on.
- **Letting RBM's copies post across origins to the LAUNCH project.** That
  means answering CORS preflights and relaxing the same-origin guard (§2.9),
  which is what stops other sites using the endpoint as a relay. It needs
  RBM's origin and a decision, not a default.

**Same configuration as Subscribe.** `feedback.js` uses the same `config()`,
so it answers 503 without `UNSUBSCRIBE_SECRET`, although it encrypts
nothing. A separate configuration per function was rejected. One switch-on
list (§1) covers all four functions, and both secrets are already set, for
Production and Preview.

**The server makes the reference**, as on 29 Sep: `LAUNCH-` plus 8 hex
characters from `crypto.randomBytes` (2^32 values). It is returned to the
dialog and put in the subject line of the team's copy, so a reference someone
quotes can be found by search. The browser-made reference it replaces was 4
characters from the clock plus 2 random ones.

**The team reads fixed labels.** `feedback.js` maps the four type values to
four labels of its own, whatever a page calls them. The subject is
`[LAUNCH feedback] <label> — <medicine> (<reference>)`. Replying goes to the
visitor, through Reply-To. If no address was given, the email says it cannot
be answered.

---

## 3. How it was verified

**2 Oct 2026, Send feedback**

- **`node scripts/test-mail-api.js`: 153 checks, all passing.** That is the
  111 below plus 42 new ones for feedback, covering:
  - the request guard and configuration;
  - the team's email: recipient, sender, Reply-To, subject with the same
    reference, page and data version;
  - validation and its limits, unknown types, escaping, and CR/LF typed
    into a field;
  - Resend refusing or timing out;
  - the logging rule.
- **Mutation check: eight deliberate breaks to `feedback.js`, each caught.**
  They were:
  - Reply-To dropped;
  - the 10-character minimum removed;
  - the message logged;
  - the reference left out of the subject;
  - CR/LF let into the subject;
  - a failed send reported as sent;
  - the request guard skipped;
  - the 2000-character cap removed.

  Seven each failed a named check; one crashed the run.
- **`node scripts/test-build-rbm-pages.js`: 11 passed**, one of them new: RBM's
  copies are not connected. The real build was also checked: `connected:
  false` in all three `dist/rbm/` pages, and `true` in `dist/locale/fr/`.
- **Browser:** headless Chrome on the repo, with the real `api/feedback.js`
  behind a local server and Resend stubbed. **29 checks, all passing, and no
  JavaScript errors.**
  - On the illustrated journey, Send is live and the note is the privacy
    line. A too-short message posts nothing.
  - A report shows "Thanks — your feedback has been sent." with the same
    reference as the email's subject. The email goes to the team, with
    Reply-To the visitor, and carries the page and data version.
  - When Resend fails, the dialog shows its failure alert and keeps the
    message, and the retry goes through. An unconfigured server shows the
    same alert.
  - The `/fr/` edition sends too.
  - `index`, `pipeline`, `story`, `unitaid/index`, `unitaid/pipeline`, and
    RBM's `en` and `fr` copies: Send blocked, red note, and pressing Send
    posts nothing.
- **`vercel build` was not rerun**: the CLI is not installed on this
  machine. The PR preview's build is the check that `api/feedback` is now a
  fourth function.
- **Verify block from CLAUDE.md:** `normalize-treatment-policy.js`
  byte-identical; `0 errors, 1 warning`; synthetic 0/0; `make-preview.js`
  clean; `test-build-dataset.js` 28 passed. No NUL bytes in any touched
  file.

Not yet seen with real Resend. That is the owner's test on the preview (§1
step 7).

**1 Oct 2026, Subscribe**

- **`node scripts/test-mail-api.js`: 111 checks, all passing.** `fetch` is
  stubbed, so no key or network is needed. They cover:
  - the request guard and configuration (both secrets, a short secret);
  - the addresses as committed (§2.7);
  - the links: round trip, unreadable address, expiry at 7 days, unsubscribe
    links still good at 400 days, wrong purpose, wrong key, one flipped bit,
    junk;
  - subscribe: one email, nothing saved, preview hosts, bad hosts;
  - the confirm page and its button: new, returning and already-subscribed
    addresses (and the latter's Unsubscribe button), a segment failure, an
    unknown-4xx lookup, a sending-only key, and each later step failing;
  - unsubscribe, including the mail app's one-click POST and a year-old link;
  - the whole journey through all three functions;
  - the logging rule.
- **Mutation check: twelve deliberate breaks, each caught.** They were:
  - GET subscribing;
  - a cross-site POST allowed;
  - the token's purpose ignored;
  - no expiry;
  - no `List-Unsubscribe` header;
  - the address logged;
  - subscribe saving before confirmation;
  - the page not escaping the address;
  - an unsubscribe 404 shown as failure;
  - the address left readable in the link;
  - a welcome for the already-subscribed;
  - no re-subscribe for the returning.

  Eight each failed named checks; four crashed the run.
- **Browser, the whole journey:** headless Chrome on the built dashboard, with
  the three real functions behind a local server that parses bodies as Vercel
  does, and Resend stubbed. **16 checks, all passing, and no JavaScript
  errors.** It went: subscribe ("Almost there", one email, nothing saved) →
  the emailed link (a page; nobody subscribed yet) → the button ("You're
  subscribed", the welcome with one-click headers, the note to
  `kyler@oqtiva.ai`) → the welcome's unsubscribe link (a page; nothing changed
  yet) → its button ("You're unsubscribed") → subscribe and confirm again
  (subscribed again) → once more ("already subscribed", nothing sent, and its
  Unsubscribe button works). Its first run is how the null-Origin bug of §2.4
  was found. It replaces the 19-check run of the single opt-in version.
- **`vercel build`:** see §2.1.
- **Verify block from CLAUDE.md:** all three normalizers byte-identical;
  `0 errors, 6 warnings` in the documented 3 + 2 + 1 split; synthetic 0/0;
  `make-preview.js` clean. Also `test-serializer.js` 0 failures and
  `test-import.js` 127 passed. No NUL bytes in any touched file.

**With the real key, on the preview (the owner's test, 1 Oct):** the
"Please confirm" email arrived from `updates@tamarind.tech`, and its link and
button worked. The lookup found the address already a contact (above), so the
create, welcome and segment paths are still to be seen with real Resend. The
calls follow Resend's API reference as read on 1 Oct. Three behaviours are not
documented there, and the rest of the preview test settles them:

- **Looking up an address that is not a contact.** It is taken to be a 4xx.
  Any 4xx other than 401, 403 or 429 is read as "no such contact", and a
  create is tried. If that guess were wrong, the create would fail loudly.
- **Adding a contact to a segment it is already in.** 2xx or 409 count as
  fine. Anything else is logged, and the team note says to add the contact by
  hand, but the person still sees success.
- **Custom `List-Unsubscribe` headers on `POST /emails`.** The `headers`
  parameter is documented; whether Resend passes these two through untouched
  is not.

---

## 4. Deferred, open, and found in passing

**Before real visitors**

- **The team inbox is one person's address** (`kyler@oqtiva.ai`), chosen
  for testing and kept for feedback on 2 Oct. Feedback lands there too, and
  replies to the public go out from it. The handoff asks for a shared
  mailbox, because these outlive whoever is on the project. Changing it is
  one line in `ADDRESSES`.
- **The rate-limit rule is not set yet** (§1 step 8, §2.9).
- **The sender is on `tamarind.tech`**, the developer's domain, not Unitaid's.
  The handoff expects a Unitaid sending domain (item 2). Changing it means
  verifying that domain in Resend, then changing one line. The emails now go
  to visitors, so this matters more than it did.

**Deferred on purpose**

- **Send feedback on the other pages.** The owner chose the illustrated
  journey only (§2.12). Switching another page on is one key,
  `connected: true`, in its `LAUNCH_FEEDBACK_COPY`. The fabricated-data
  pages should stay off.
- **Send feedback in RBM's copies** (§2.12). This needs cross-origin posting
  to the LAUNCH project, or RBM's own intake.
- **The emails and link pages in French and Portuguese.** A visitor on `/fr`
  gets English emails. The page they came from is known, but the email text
  would need a reviewed translation, not the engine's.

**Still open**

- **PR previews and the secrets.** `pr-preview.yml` builds the functions into
  every preview. With both secrets set for Preview, a confirmed subscribe on a
  preview saves a real contact into the real segment and mails the real inbox
  (§2.6). So does a feedback report sent from a preview. Without them, the preview's form shows the failure message. For
  testing this change they go on Preview. Whether they stay there after merge
  is an open choice.
- **Silent failure.** If the account lapses or the domain falls out of DKIM
  verification, the send can still return 200 while the mail is dropped. A
  weekly canary that alerts when its test submission does not arrive is still
  the fix, and still not built.
- **Resend's free plan limits** were recorded on 29 Sep as 100 emails a day,
  3,000 a month and 1,000 contacts, and not rechecked. Each confirmed
  subscription is now three emails (confirm, welcome, team note) plus one
  contact. An unconfirmed attempt is one email, and so is each feedback
  report. Both forms share the allowance, so a spam run on either one blocks
  both for the rest of the day. The rate-limit rule cannot prevent that on
  its own (§2.9).
- **Who receives submissions.** The privacy line says "the LAUNCH team" and
  deliberately names no organisation. Handoff item 6, the data controller, is
  still Unitaid's to answer. It is more pressing now that the project emails
  members of the public.
- **`frame-ancestors`, and panel positioning inside a tall iframe** (handoff).
  The Subscribe panel floats against the iframe's viewport, and the feedback
  dialog is centred in it. Test against RBM's staging frame. In RBM's own
  copies, Send feedback is a mock (§2.12), so this matters only if the LAUNCH
  site itself is framed.

**Found in passing, left alone**

- **`.DS_Store` is untracked in three places** (`/`, `data/`, `sourcing/`).
  The one-line `.gitignore` fix sits on `email-feedback-wip`, and was never
  part of this work.
- **`synthetic/`'s four pages have no Send feedback widget at all.** They load
  `assets/report-issue.js` relative to `synthetic/`, and neither the repo nor
  the public build has a `synthetic/assets/`. So the script 404s, there is no
  pill, and the footer's "Report an issue" link does nothing. `unitaid/`
  uses `../assets/` and works. This predates the change and was left alone.
  Those pages are not to send, and whether to fix the path or drop the
  widget from fabricated data is a separate decision.
- **RBM's copies never see the page's widget settings.** The inline script
  that sets `LAUNCH_FEEDBACK_COPY` waits for `dashboard.json`, but the widget
  has already run by then. So the dialog there shows the default wording,
  and sends `page.view` as null. This was left alone. Since §2.12 switches
  `connected` off explicitly, fixing it is now safe.
- **Developer-guide §8 still says the site is served from GitHub Pages.**
  Production is on Vercel. Not corrected here; it needs someone who knows the
  current hosting arrangement to rewrite it.

---

## 5. Status

| | |
| --- | --- |
| Branch | `email-feedback`, from `main` at `2d3d8cb` (2 Oct) |
| Commits | 1: Send feedback on the illustrated journey |
| Pull request | against `main`, opened with this commit; not merged |
| CI | runs on that pull request |
| New files | `api/feedback.js` |
| Changed | `api/_mail.js` (`block`, `newRef`), `assets/report-issue.js` (the seam, connected wording), `illustrated-journey-dashboard.html` (`connected: true`, comments), `scripts/build-rbm-pages.js` and its test, `scripts/test-mail-api.js`, `rbm/README.md`, this document, `docs/developer-guide.md`, `docs/illustrated-journey-ui-notes.md`, `docs/Handoff_Kyler/Handoff_Kyler.md` |
| Waiting on | the owner's test on the preview (§1 step 7), then merge; the rate-limit rule (§1 step 8) |
| Before this | `email-subscribe`, PR #30, 5 commits, merged 1 Oct. `email-feedback-wip` (`b39c3b0`) has now been used in full, and can be deleted |
