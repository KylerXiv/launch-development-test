# Email backend for the forms — working notes

This document covers `api/`, the Vercel functions behind
`illustrated-journey-dashboard.html`'s forms. **Today that is Subscribe for
updates only.** Send feedback follows as its own change (§2.5). Per
[CLAUDE.md](../CLAUDE.md), this document is updated in the same commit as any
change it describes. What the visitor sees is covered in
[illustrated-journey-ui-notes.md](illustrated-journey-ui-notes.md) §3.10. The
scoping this builds on is in [Handoff_Kyler.md](Handoff_Kyler/Handoff_Kyler.md),
under "Newly scoped — the two buttons, and a backend for them" (23 Sep 2026).

The code was first written on 29 Sep for both forms and left uncommitted. On
1 Oct it was saved as-is on `email-feedback-wip` (`b39c3b0`, rebased onto
`main`), and this branch took the Subscribe half of it.

---

## 1. Switching it on

The function is inert until it has a key and a team inbox. Until then, the
form shows its failure message and the function log names what is missing.

1. **In Resend, verify the sending domain** (SPF and DKIM records in its DNS).
   Without it, Resend sends only from its shared test sender,
   `onboarding@resend.dev`, and delivers only to the account's own address.
   Any other recipient gets `403 validation_error: You can only send testing
   emails to your own email address`.
2. **Create an API key with Full access, not "Sending access".** Subscribe
   writes a contact, which a sending-only key cannot do. With a sending-only
   key, every subscribe fails with `401 restricted_api_key` in the log.
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
   only the sender has to be verified. `RESEND_API_KEY` is on the Vercel
   project for Production and Preview.

5. **On the Vercel project, under Settings → Environment Variables, add
   `RESEND_API_KEY`** (the `re_…` key) for Production, and for Preview if PR
   previews should work too (§4). Then redeploy: env var changes reach new
   deployments only.
6. **Test.** Subscribe on the page: the address appears under Resend →
   Contacts, in the segment, and a "New subscriber" note arrives at `to`.
   Then subscribe the **same address again** (§3, the one thing not yet
   known). From a terminal:

   ```bash
   curl -sS -X POST https://<host>/api/subscribe \
     -H 'Content-Type: application/json' \
     -d '{"email":"you@your-domain","page":"curl test"}'
   # → {"ok":true}
   ```

**Sending updates to subscribers** is a Resend broadcast to the segment. It is
written and sent from the Resend dashboard, not from this repo. Include
`{{{RESEND_UNSUBSCRIBE_URL}}}` in it. The page's copy does not promise an
unsubscribe link, but an update without one is the kind of mail that gets the
sending domain marked as spam.

---

## 2. Decisions, and why

### 2.1 A Vercel function calling Resend over plain `fetch`

As scoped on 23 Sep: `api/` at the repo root, deployed by Vercel independently
of `outputDirectory`. The page posts same-origin, including inside RBM's
iframe, so there is no CORS and nothing to negotiate with RBM. The path is
absolute (`/api/subscribe`), so the `/fr/` and `/pt/` copies of the page post
to the same function.

Checked on 1 Oct with `vercel build` from CLI **60.1.3**, the version
`pr-preview.yml` pins, on a copy of the repo with a placeholder project link.
It produced exactly one function, `api/subscribe`, with `_mail.js` bundled
into it and not exposed as a route. `.vercel/output/static/` was
byte-identical to `public-site/` (90 files), so the static site is unchanged.

| Rejected | Because |
| --- | --- |
| Resend's npm package | Needs a `package.json`, which the repo does not have on purpose (developer-guide §1). The whole integration is two POSTs |
| `mailto:`, a form-relay service, a separate mailing-list platform | Rejected on 23 Sep — see the handoff doc |

### 2.2 Subscribe means a Resend contact plus a note to the team

The handoff left this open (item 5). Three options were put on 1 Oct: email
the team only, a Resend contact plus a note to the team, or both plus a
confirmation email to the subscriber. **The second was chosen.** The address
becomes a global Resend contact, joins `ADDRESSES.segment` if set, and the team
inbox gets a note.

Notify-us alone was rejected. It leaves the list as a pile of emails in one
inbox, with no unsubscribe handling, and the first update would be a
hand-built BCC. A Resend broadcast handles unsubscribes itself.

This revisits the 23 Sep rejection of "a managed mailing-list platform". That
rejection was about a second vendor and a second account for someone to own.
Resend contacts live in the same account as the sender. Two of that
rejection's concerns still stand: double opt-in (§2.3), and someone committed
to actually sending the updates.

Resend renamed Audiences to **Segments** before this was built. Contacts are
global, and `POST /broadcasts` requires a `segment_id`, so the segment is what
makes "send an update to the subscribers" one action.

The contact is saved first, and the visitor is told "on the list" only once
that has succeeded. If the team note then fails, the visitor still sees
success, since they are on the list; the failure is logged. The reverse is
refused: a note about a subscriber who was not saved would be a false record.

### 2.3 Single opt-in, and nothing is ever sent to the subscriber

No confirmation or welcome email is sent. The third option in §2.2 was
declined for this reason: sending to any address typed into a public form
would let anyone make this project email anyone.

The cost: someone can subscribe an address that is not theirs, and its owner
gets the next update, with an unsubscribe link. Double opt-in is the fix and
is deferred (§4).

### 2.4 Addresses in code, the key in an env var

Chosen on 1 Oct. `from`, `to` and `segment` are set in `ADDRESSES` at the top
of `api/_mail.js`, and only `RESEND_API_KEY` is on the Vercel project.

The rejected alternative was the 29 Sep design, which had all four as env vars
(`MAIL_TO`, `MAIL_FROM`, `RESEND_SEGMENT_ID` beside the key). None of the
three addresses is secret, so in the repo a change to them goes through a pull
request and is recorded in git, and anyone reading the code can see where
submissions go.

The costs:

- Changing the inbox now takes a commit and a deploy, not a dashboard edit.
- Preview and production share one set of addresses. A test on a PR preview
  lands in the real team inbox and the real segment (§4).

### 2.5 One button at a time

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
  4 files**, and the feedback half was the hard part. Onto this repo's `main`
  it gave one, in `.gitignore`.

Keith's `development` has since been merged into `main` (PR #26, 1 Oct;
[merge-keith-development-notes.md](merge-keith-development-notes.md)). This
branch was rebased onto that `main` (at `3c747bc`). The Subscribe code
applied cleanly to Keith's reworked page. One conflict, in
`docs/developer-guide.md`'s repo map, was resolved by keeping `main`'s wording
for `assets/report-issue.js` and adding the `api/` row beneath it.

The feedback half is kept whole on `email-feedback-wip`: its function, its 29
tests, the two `_mail.js` helpers only it uses (`block`, `newRef`), and its
doc sections (the opt-in `LAUNCH_FEEDBACK_ENDPOINT`, server-made references). On this branch, Send feedback is exactly as `main` has
it: a mock, with Send blocked and the red flag in its dialog.

### 2.6 Abuse guards, and what was left out

- **Same-origin only.** A request whose `Origin` does not match its own host
  (`Host` or `x-forwarded-host`) gets a 403. A request with no `Origin` is
  allowed through: that is curl or a server, which could forge the header
  anyway. This guard is against other *websites* using the endpoint.
- **JSON only** (415 otherwise). Besides being all the form sends, it forces
  a CORS preflight on any cross-origin browser request. The function never
  answers one (OPTIONS gets a 405 with no CORS headers).
- **The browser's validation, repeated on the server.** The same email regex
  and a 254-character cap. CR/LF cannot reach a header, and every value in the
  team's note is HTML-escaped and never made a link.
- **No honeypot.** The form is rendered by script, with no `action`, so the
  form-scraping bots a honeypot catches never see it. A scripted POST skips a
  honeypot anyway.
- **No rate limiting in the function.** Serverless instances share no memory,
  so an in-function counter limits nothing reliably. If spam arrives, the
  place for it is a Vercel Firewall rate-limit rule on `/api/*`. That is a
  dashboard setting, not repo code (§4).

### 2.7 Logs never carry the address

Function logs are kept under whatever retention the Vercel project has (the
handoff flagged this). A subscription logs `[subscribe] contact saved, team
notified` and nothing else. A failure logs HTTP status plus Resend's error
name and message. Two tests fail if the address ever appears in a log, on
success or on failure.

### 2.8 Translation: nothing to do in `i18n/`

`main` gained French and Portuguese pages on 30 Sep. `i18n/` is deliberately
untouched here. `translate.yml` runs after a change to this page reaches
`main`, rebuilds `i18n/content.en.json` and translates only the new strings.
Until it has run, `/fr` and `/pt` show the new Subscribe text in English, as
the translation design intends ("English does not wait for French"). Checked:
`build-locale-pages.js --allow-stale`, which is what CI and the public build
run, passes all its checks.

---

## 3. How it was verified (1 Oct 2026)

- **`node scripts/test-mail-api.js`: 44 checks, all passing.** `fetch` is
  stubbed, so no key or network is needed. It covers the request guard,
  configuration from `ADDRESSES`, Subscribe's happy and failure paths, and the
  logging rule. That is 68 on `email-feedback-wip`, less the 29 that exercise
  `api/feedback.js`, plus 5 added on 1 Oct that check the addresses *as
  committed*: `to` non-empty and valid, `from` in `Name <address>` form,
  `segment` shaped like a Resend id. A sender with its closing `>` deleted was
  tried, and was caught.
- **Mutation check: six deliberate breaks, each caught.** They were: ignoring
  `ADDRESSES.to`, ignoring `ADDRESSES.from`, ignoring `ADDRESSES.segment`,
  removing the origin check, logging the address, and notifying the team
  before saving the contact. The first five each failed a named check; the
  sixth crashed the run.
- **The built pages** (`scripts/build-public-site.sh`, the Vercel build
  command): the English, `fr/` and `pt/` copies each post to `/api/subscribe`.
  None still carries Subscribe's "Mock only" line or its click block, and all
  three inline scripts parse in each. Send feedback's click block is still
  present, as intended.
- **`vercel build`:** see §2.1.
- **Verify block from CLAUDE.md:** all three normalizers byte-identical;
  `0 errors, 6 warnings` in the documented 3 + 2 + 1 split (the third group
  arrived with Keith's merge); synthetic 0/0; `make-preview.js` clean. Also
  `test-serializer.js` 0 failures and `test-import.js` 127 passed. No NUL
  bytes in any touched file.
- **Browser, end to end, 1 Oct, after the rebase:** headless Chrome ran the
  built English and French pages against the real `api/subscribe.js`, with
  Resend stubbed. The 29 Sep run no longer counted, because Keith's merge had
  reworked the page. **19 checks, all passing, and no JavaScript errors.** It
  checked:
  - a malformed address is refused before anything is sent;
  - a valid one shows success only after the server answers ("Thank you —
    you are on the list.", and in French "Merci — vous êtes sur la liste.");
  - the contact is saved into the configured segment before the note goes to
    `kyler@oqtiva.ai` from the `tamarind.tech` sender;
  - the field clears and the button comes back;
  - there is no "Mock only" line;
  - when Resend fails, the failure message shows, the address stays for a
    retry, and the team is not told about a subscriber who was not saved.

**Not exercised: a real Resend key.** Nothing has sent a real email yet. The
calls are written against Resend's API reference as read on 1 Oct. **One
behaviour is not known:** the reference does not say what a second
`POST /contacts` for an address that already exists returns. The code treats a
2xx or a 409 as "on the list". Anything else shows the visitor the failure
message, which would be wrong for a repeat subscriber. §1 step 6 tests it.

---

## 4. Deferred, open, and found in passing

**Before real visitors**

- **The team inbox is one person's address** (`kyler@oqtiva.ai`), chosen
  for testing. The handoff asks for a shared mailbox, because these outlive
  whoever is on the project. Changing it is one line in `ADDRESSES`.
- **The sender is on `tamarind.tech`**, the developer's domain, not Unitaid's.
  The handoff expects a Unitaid sending domain (item 2). Changing it means
  verifying that domain in Resend, then changing one line.

**Deferred on purpose**

- **Send feedback** (§2.5): next, from `email-feedback-wip`, reconciled with
  whatever this branch settles first.
- **Double opt-in** (§2.3). Needs a signing secret and a
  `GET /api/confirm?t=…` that saves the contact only once the link is clicked.
- **A re-subscribe after unsubscribing does nothing.** The contact is created
  without `unsubscribed: false`, on purpose: sending it would let anyone
  re-subscribe an address whose owner opted out. Someone who opted out and
  comes back sees "on the list" but stays unsubscribed. Rare; double opt-in
  fixes it properly.
- **Rate limiting** (§2.6): a Vercel Firewall rule, if and when spam appears.

**Still open**

- **PR previews and the key.** `pr-preview.yml` builds the function into every
  preview. With `RESEND_API_KEY` set for Preview, a subscribe on a preview
  saves a real contact into the real segment and mails the real inbox (§2.4).
  Without it, the preview's form shows the failure message. For testing this
  change the key goes on Preview. Whether it stays there after merge is an
  open choice.
- **Silent failure.** If the account lapses or the domain falls out of DKIM
  verification, the send can still return 200 while the mail is dropped. A
  weekly canary that alerts when its test submission does not arrive is still
  the fix, and still not built.
- **Resend's free plan limits** were recorded on 29 Sep as 100 emails a day,
  3,000 a month and 1,000 contacts, and not rechecked. Each subscribe is one
  email plus one contact. That is far above expected volume, but a spam run
  would hit the daily cap.
- **Who receives submissions.** The privacy line says "the LAUNCH team" and
  deliberately names no organisation. Handoff item 6, the data controller, is
  still Unitaid's to answer.
- **`frame-ancestors`, and panel positioning inside a tall iframe** (handoff).
  The Subscribe panel floats against the iframe's viewport. Test against
  RBM's staging frame.

**Found in passing, left alone**

- **This repo and Keith's have diverged.** `Keith-paradox/launch-development`'s
  `main` has nothing this repo lacks, but its `development` branch has 67
  commits since 10 Sep that this repo does not have. Those include a reworked
  illustrated journey page. Whoever brings this change to Keith's repo meets
  the conflicts counted in §2.5. Settling which repo is canonical is not this
  change's to do.
- **`.DS_Store` is untracked in three places** (`/`, `data/`, `sourcing/`).
  The one-line `.gitignore` fix sits on `email-feedback-wip`, and was never
  part of this work.
- **Developer-guide §8 still says the site is served from GitHub Pages.**
  Production is on Vercel. Not corrected here; it needs someone who knows the
  current hosting arrangement to rewrite it.

---

## 5. Status

| | |
| --- | --- |
| Branch | `email-subscribe`, rebased onto `main` at `3c747bc` on 1 Oct (first cut from `a42b8e0`) |
| Commits | 2: the Subscribe change, then the addresses filled in |
| Push state | pushed with this commit (force-with-lease, because of the rebase), with a pull request against `main` |
| CI | runs on that pull request |
| New files | `api/_mail.js`, `api/subscribe.js`, `scripts/test-mail-api.js`, this document |
| Changed | `illustrated-journey-dashboard.html` (Subscribe only), `scripts/build-public-site.sh` (comment only), `docs/developer-guide.md`, `docs/illustrated-journey-ui-notes.md`, `docs/Handoff_Kyler/Handoff_Kyler.md` |
| Kept aside | `email-feedback-wip` — the whole 29 Sep work, both forms, rebased onto `main` |
