# Update emails to subscribers — working notes

**Branch:** `subscriber-updates` (off `main` at `b91bac2`) · **Last worked:** 5 October 2026

This branch's working-notes document, per [CLAUDE.md](../CLAUDE.md). It covers
the daily email that tells subscribers what changed on the dashboard:
`scripts/notify-subscribers.js`, its tests, and
`.github/workflows/notify-subscribers.yml`. Subscribing itself (double opt-in,
welcome email, unsubscribe) is in
[email-backend-notes.md](email-backend-notes.md) and is unchanged.

---

## 1. Switching it on

Nothing sends until steps 1 to 3 are done.

1. **In Resend, create an API key with Full access**, named e.g. "GitHub
   Actions: subscriber updates". A sending-only key cannot create a broadcast.
   Use a new key rather than the one on Vercel, so either can be revoked alone.
2. **Add it to the repository as a secret:**

   ```bash
   gh secret set RESEND_API_KEY --repo KylerXiv/launch-development-test
   # paste the re_… key when asked
   ```

3. **Merge the pull request.** Scheduled and manual runs only exist once the
   workflow is on `main`.
4. **Preview it.** Actions → "Email subscribers about updates" → Run workflow
   → `preview`. The team inbox (`ADDRESSES.to` in `api/_mail.js`) gets the
   email subscribers would get, marked `[Preview]`. With nothing new it uses
   the latest changelog line as a sample, and says so.
5. **Mark the starting point.** The first `send` run, scheduled at 15:00 UTC or
   started by hand, sends nothing and records where the next email starts.
   Every changelog line added after it reaches subscribers in the next day's
   email.
6. **To see a real one,** subscribe with your own address on the illustrated
   journey page before the next change is approved.

Order matters a little. If the pull request is merged before the secret is
set, every daily run fails, and GitHub emails the repository owner about it.
Nothing is lost, but nothing is sent, and lines approved before the first
successful run are never emailed.

---

## 2. Decisions

### What counts as a change: the changelog, not a data diff

The email lists the changelog lines in `data/products.js` added since the last
update email, using each line's public `plain` sentence. 22 of the 23 lines
have one. The other falls back to its internal `change` text.

| Rejected | Because |
| --- | --- |
| A diff of the dataset (`scripts/dataset-diff.js`) | It says which fields moved, not in words a subscriber reads. The changelog's `plain` line is already written for the public, reviewed with the change, and translated |
| Only lines about a medicine, not page-wide ones (`product: "All"`) | The changelog is the public record, and the page shows those lines too. One filter in `freshEntries` if they should go. **An assumption, not an instruction** |

The welcome email promises "new milestones, corrected figures and newly
verified country registrations". Page-wide wording changes go out as well,
which is broader than that promise.

### When: one round-up a day, at 15:00 UTC

| Option | Verdict |
| --- | --- |
| One email per change | Rejected. Each approved proposal adds one line, and the source watcher files several at once. On 23 Aug 2026 the changelog gained 9 lines in a day, and on 14 Aug 6. Per change, that is 9 emails in a day |
| **Daily, on days with new lines** | **Chosen.** At most one email a day, and nothing on a quiet day. 15:00 UTC is after a working day of approvals in Geneva |
| Weekly | Rejected. The welcome promises an email "when the data is updated", and a week is too long a lag for that |

Switching to per change is a trigger change in the workflow: add
`workflow_run` on "Snapshot history and rebuild feed". The script needs no
change.

### Where it runs: GitHub Actions, not a Vercel function

| Rejected | Because |
| --- | --- |
| A Vercel cron calling a function | Hobby crons run once a day with up to an hour's drift, and a failure shows only in Vercel's logs. It also adds a public endpoint that mails every subscriber |
| A Vercel function that the workflow calls with a shared secret | The same endpoint risk, and two new secrets (one each side) instead of one |

The cost of the chosen design is that the Resend key now lives in two
places, GitHub and Vercel. A separate key for each keeps them independently
revocable.

### "Since the last email": the commit of the last run that sent

Each run that could send is titled `Email subscribers (send)`. The workflow
asks GitHub for the newest such run that succeeded and compares the data now
with the data at that run's commit. A run that failed is not a success, so the
next one picks up its lines. Previews are titled `(preview)` and never move
the starting point.

| Rejected | Because |
| --- | --- |
| A ledger file committed to `main` | Every push to `main` redeploys production on Vercel, and this would make a third bot pushing to `main`, next to `publish.yml` and `translate.yml` |
| Resend's broadcast list as the ledger | A broadcast's name cannot say which lines it carried. It is used only as the double-send guard below |
| The changelog lines' own dates | A line can be dated before it is approved, and would then be missed |

The run checks out exactly the commit it is recorded against
(`github.sha`), not `main` as it is a minute later. Otherwise a line pushed
between the two would be counted as sent without being sent.

### Which lines are new

A line is new when it is not in the earlier version, matched on date,
medicine and `change` text, **and** it is dated no earlier than that version's
`lastUpdated`.

- The date floor stops a corrected old line from being re-sent: correcting
  its wording makes it look new to the first test.
- Matching on `change` rather than `plain` means a reworded public sentence,
  such as a translation fix, is not sent again.
- A proposal applied and then reverted between two runs sends nothing,
  because the line is gone by the time the email is built. On 2 Oct proposal
  #43 was applied and reverted the same day, and a dry run over that pair
  sends nothing.

### Never twice

Resend broadcasts take no idempotency key. Idempotency keys work only on
`POST /emails` and `POST /emails/batch`, and are kept for 24 hours. So the
broadcast is named after the lines it carries, `LAUNCH update <date>
<12-hex digest>`. Before creating one, the script lists recent broadcasts:

- one with that name already sent: nothing is sent again;
- one with that name still a draft, from a run that failed between creating
  and sending it: that draft is sent, not a copy.

The send is the workflow's last step, so a run that sent ends as a success
and becomes the next run's starting point.

### The first run sends nothing

With no earlier send run there is nothing to compare with. Sending the whole
changelog instead would mail every subscriber all 23 lines back to August.

### A missing key fails the next run, not the first busy one

`preview` and `send` refuse to run without `RESEND_API_KEY`, even on a day
with nothing to send. Otherwise a missing secret would go unnoticed until the
first real change. `dry-run`, the default from a terminal, needs no key.

### What the email looks like

- The same `letter()` layout as the welcome email, from `api/_mail.js`, so
  both read as one sender's mail.
- Each line is led by its medicine's name, because most `plain` lines say
  "this medicine" (ASPY's 8 Sep line: "We found a real example of a country
  acting on…"). Page-wide lines, and proposal lines that already start with
  the name ("GanLum — …"), are left as they are.
- The subject names the medicines: `LAUNCH dashboard updated: GanLum, ASPY`.
- At most 20 lines, then "… and N more changes, listed on the dashboard".
- The unsubscribe link is Resend's `{{{RESEND_UNSUBSCRIBE_URL}}}`, filled in
  per recipient in both the HTML and the text. It sets the same flag as this
  repo's own unsubscribe page, and Resend skips unsubscribed contacts.
- English only, as for the other emails: a visitor on `/fr` gets English
  email ([email-backend-notes.md](email-backend-notes.md) §4).

### Cost

Resend's free plan limits marketing email (broadcasts) by contacts, 1,000,
not by emails sent. So the daily email does not draw on the 100-a-day
allowance the forms share (pricing page, read 5 Oct 2026).

---

## 3. How it was verified

- **`scripts/test-notify-subscribers.js`: 66 checks**, with Resend stubbed out
  (no network, no key). They cover which lines are new, the email's wording
  and escaping, the broadcast's name, and every send path: new broadcast,
  already sent, resumed draft, refused broadcast, a key that cannot list,
  missing key, nothing new, first run, preview, dry run, and the command line.
  Added to `validate.yml`.
- **Mutation check: ten deliberate breaks, each caught.** They were: no date
  floor, matching on `plain`, no already-sent check, `send: false`, preview
  sent as a broadcast, first run sending everything, no medicine name, the
  real unsubscribe link in a preview, no 20-line cap, and a missing key not
  refused.
- **Dry runs on real history.** Since `8422f8e` (before the 1 Oct change),
  the email lists the 1 and 2 Oct lines, "between 1 and 2 October 2026". Over
  proposal #43's apply commit it lists one GanLum line. With no earlier
  version it sends nothing.
- **The workflow's run lookup** was run against this repository's real runs.
  It returns the newest matching run's commit, and nothing when none matches.
- `scripts/test-mail-api.js` still passes (153) after `resendRequest` was
  exported from `api/_mail.js`.

**Not verified:** a real broadcast. There is no Resend key here, so creating
and sending one has run only against the stub, which was built from Resend's
API reference (read 5 Oct 2026). Step 4 of §1 tests the email itself, and the
first real send tests the broadcast.

---

## 4. Deferred, open, and found in passing

**Open**

- **Page-wide lines go to subscribers** (§2). Owner to confirm, or filter out
  `product: "All"`.
- **`SITE` in the script is the test deployment**,
  `https://launch-development-test.vercel.app`. It has to change with the move
  to the real domain, along with the sender and team inbox listed in
  [email-backend-notes.md](email-backend-notes.md) §4.
- **Resend's unsubscribe page carries Resend's look** unless it is branded in
  Resend's team settings.

**Found in passing, left alone**

- **Proposal lines lower-case the stage name.** `scripts/proposal-lib.js`
  writes `stageName.toLowerCase()` into `plain`, so a WHO PQ proposal reads
  "GanLum — who pq listing was updated from the WHO prequalification list."
  That shows in the page's changelog and now in these emails. The fix changes
  public text and its translations, so it is its own change.
- **`feed.xml` links to the old site.** `scripts/make-feed.js` still sets
  `SITE` to `kochrisdev.github.io/launch-transparency-dashboard/`.
- **`scripts/test-mail-api.js` is not run in CI.** It passes, but nothing
  runs it on a pull request.

---

## 5. Status

| | |
| --- | --- |
| Branch | `subscriber-updates`, from `main` at `b91bac2` (5 Oct) |
| Commits | 1 |
| Pull request | opened against `main` with this commit; CI runs on it |
| New files | `scripts/notify-subscribers.js`, `scripts/test-notify-subscribers.js`, `.github/workflows/notify-subscribers.yml`, this document |
| Changed | `api/_mail.js` (exports `resendRequest`), `.github/workflows/validate.yml` (runs the new tests), `docs/email-backend-notes.md` (§1 now points here), `docs/developer-guide.md` (workflow table) |
| Waiting on | the `RESEND_API_KEY` repository secret, then merge (§1) |
