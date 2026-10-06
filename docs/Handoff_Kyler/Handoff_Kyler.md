# Handoff — RBM staging dashboard

> **Read §0 first.** It is the state of the project on 6 October 2026. Everything
> after it is the history of September's work, kept for its decisions. Where the
> two disagree, §0 is current.

## 0. Current state — 6 October 2026

### Where things are

| | |
| --- | --- |
| Repository | `KylerXiv/launch-development-test`, this checkout's `origin`. **Public since 6 Oct 2026.** Work on `main`; every branch from 5–6 Oct is merged |
| Other remotes | `keith` is `Keith-paradox/launch-development`. Do not push to it, or to `kochrisdev/launch-transparency-dashboard` |
| Production | Vercel project `launch-development-test`: <https://launch-development-test.vercel.app/illustrated-journey-dashboard.html>, also under `/fr/` and `/pt/`. Every push to `main` deploys |
| Who can deploy | Vercel's Hobby plan refuses any commit whose Git author has no access to the Vercel project. Jackson (`codebyjackson`) has none, so his commits deploy only once a commit by Kyler sits on top, such as a merge commit. Check production after he pushes to `main` |
| GitHub Actions | Runs again, free, since the repo went public (first good runs 09:42 UTC, 6 Oct). From 3 to 6 Oct every job was refused for billing ([developer-guide.md](../developer-guide.md) §8b) |
| Repository secrets | `RESEND_API_KEY` (added 6 Oct), `GOOGLE_API_KEY`, `DATA_REPO_DEPLOY_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_DEPLOY_HOOK_URL`. Variable: `RBM_DATA_REPO` = `codebyjackson/launch-data-test` |
| Email | Sent through Resend from `updates@tamarind.tech` to the team inbox `kyler@oqtiva.ai`, both set in `api/_mail.js`. Vercel holds `RESEND_API_KEY` and `UNSUBSCRIBE_SECRET` for the forms; GitHub holds its own Resend key for the daily email |
| Collaborators | `KylerXiv` (owner) and `codebyjackson` (write) |

The verify block and its expected results are in [CLAUDE.md](../../CLAUDE.md).
The one at the top of the history below is out of date.

### What landed on 5–6 October

| PR | What it does | Notes |
| --- | --- | --- |
| #54 | Subscribers get one email a day, at 15:00 UTC, on days the changelog gains lines (`notify-subscribers.yml`). Manual run: `preview` (team inbox only) or `send` | [subscriber-updates-notes.md](../subscriber-updates-notes.md) |
| #55 | Source watchers for ClinicalTrials.gov (`propose-trials.js`), and for the NAFDAC and TMDA registers (`propose-registers.js`). Proposals can now add a country to the map, citing its register | [source-proposals-notes.md](../source-proposals-notes.md) |
| #56 | The preview workflow's deploy step stops after 5 minutes and the job after 10, so a blocked deploy cannot burn hours | [pr-preview-notes.md](../pr-preview-notes.md) |
| #57 | Disclaimer: "Unitaid does not accept legal responsibility…" instead of "We do not…" (Unitaid's request) | [illustrated-journey-ui-notes.md](../illustrated-journey-ui-notes.md) §3.35 |
| #58 | Developer guide brought up to date: Vercel hosting, every workflow, Actions minutes and billing (§8b) | [developer-guide.md](../developer-guide.md) |
| #59 | Proposal intake starts by itself only for issues from the owner, members or collaborators. On a public repo anyone else could otherwise make the bot commit to `main` and deploy a preview | [pr-preview-notes.md](../pr-preview-notes.md) |
| #60 | Jackson: verified country lists, where every entry cites `sources` and `checked`, and register fetchers for Rwanda, Zambia, Zimbabwe and Viet Nam | his commits |

**Checked working on 6 Oct, on GitHub and on the live site:**
- Every workflow run since the merges passed, including the new test steps in
  `validate.yml`.
- Two `preview` runs of the subscriber email reached the team inbox.
- The source watchers' first run, on real data: no proposals, as expected.
  FD-TACT's passed registry estimate was left for a person.
- The English, French and Portuguese pages load. Both form endpoints answer.

### What runs by itself next

| When | What |
| --- | --- |
| Daily, 15:00 UTC | Subscriber email. The first run, 6 Oct, sends nothing and only marks the starting point |
| Mondays, 06:00 UTC | Trials fetch, then the source watchers |
| 1st of the month | Data review reminder issue |
| 3rd of the month, 06:30 UTC | Global Fund, regulatory and the six national registers, then the source watchers |

**October's monthly fetch never ran**: it was refused for billing on 3 Oct.
Start "Scheduled source fetch" by hand, or wait for 3 November. A fetch can
open watch issues and file proposals, which are public now.

### Still open

**Waiting on Unitaid:**
1. Whether pricing data is included. They are checking.
2. Permission to show the Unitaid mark and the WHO emblem, including on RBM's
   embedded copy.
3. Who the data controller is for the subscribe and feedback emails.
4. A shared Unitaid inbox, and a Unitaid sending domain, to replace the test
   addresses in `api/_mail.js`.
5. Which Essential Medicines List to cite: the 2023 list the page links, or
   the 2025 one.
6. Whether Uganda's register stays listed under Sources while it feeds no data.

**Unitaid's feedback of 5 Oct.** Kyler chose to act only on the disclaimer
(#57). Do not start the others unprompted:
- **Coartem Baby:** Unitaid will not include it. It is not in the data.
- **Pricing:** waiting on item 1 above.
- **"Status" and "On pathway":** for that week's meeting. Facts, if it comes
  back:
  - "Delayed" is stage status `late`: an analyst marked that step as the
    access barrier. It is measured against no date, and the page does not
    define it.
  - "On pathway" is the years since the first dated milestone, with no end.
  - The reviewer suggests ending "market access" at WHO prequalification plus
    recommendation, which gives 2022 for ASPY and 2015 for DHA–PPQ; GanLum
    and ALAQ have not reached it.

**Waiting on Kyler's go-ahead: four corrections to `data/sources.js`,** found
on 5 Oct by checking the sheet of "new public sources". All seven sheet rows
were already in the registry.
- WHO malaria guidelines: version 10.0, 10 Sep 2026, not 13 Aug 2025. The
  guideline's MAGICapp record id changes with each version; the stable key is
  the short code `LwRMXj`.
- WHO comparator list: the 30 June 2026 edition, which names the comparators
  for ASPY and DHA–PPQ.
- "MESA malaria medicines landscape": the file is Unitaid's own 2015 report,
  which MESA only hosts.
- Essential Medicines List edition: decided by Unitaid's item 5.

**Not built:**
- A confirmation email to people who send feedback. The suggested design is a
  fixed text that never repeats their message, sent only when they gave an
  address, with the reference number.
- Watchers for #60's four new registers: one row each in `REGISTERS`, in
  `propose-registers.js`.
- A WHO guideline version watcher, and a comparator-list watcher.

**Housekeeping:**
- **Branch protection is now available,** because the repo is public, and not
  switched on. §5's "Blocked on GitHub Pro" no longer applies to this
  repository.
- **Jackson needs a Vercel seat,** or his commits keep needing one by Kyler on
  top before they deploy.
- **Test fixtures work once.** A rejected test proposal is never proposed
  again; the EMA fixture is already used up. See each `test-data/*/README.md`.
- **Responsive testing** on devices and browsers is with Kyler, 6 Oct.

---

## History (September 2026)


**Branch:** `data-editor` · **13 commits** · **not pushed** · CI not yet run
**Last worked:** 17 September 2026
**Working tree:** clean apart from two untracked `.DS_Store` files

This is the branch's own working-notes document, per
[CLAUDE.md](../../CLAUDE.md). `redesigning-illustrative-journey` keeps
[illustrated-journey-ui-notes.md](../illustrated-journey-ui-notes.md).

Two reference documents sit alongside:
[editor-build-spec.pdf](../editor-build-spec.pdf) (the technical spec) and
[editor-setup-requirements.pdf](../editor-setup-requirements.pdf) (accounts,
plan, setup phases).

> **Ownership model corrected (23 September 2026).** This document was written
> assuming RBM ends up owning the repo, the editor and the hosting. Its title
> says so, §2 says the dashboard "hands over to RBM as a single artefact", and
> four rows of §5's open questions rest on it. **That is wrong.** Unitaid holds
> the data and everything that produces it — repo, editor, validator, hosting,
> the Vercel project and its billing. RBM only displays the finished dashboard,
> as its own page on `dashboards.endmalaria.org`. Read every "hands over to
> RBM" below as "hands over to Unitaid, who publish to RBM". This note exists
> only on `sources-registry`; `data-editor` is unchanged.

---

## Start here

> *17 September 2026, `data-editor`. Out of date: `normalize-resistance.js` and
> `normalize-molecular-markers.js` were removed on 1 Oct, and the validator
> now expects 1 warning. Use the verify block in CLAUDE.md.*

```bash
git checkout data-editor
python3 -m http.server 8001 --bind 127.0.0.1
open http://localhost:8001/editor.html
```

`--bind 127.0.0.1` is not optional — see §3.

Everything should pass:

```bash
node scripts/normalize-resistance.js          # byte-identical
node scripts/normalize-molecular-markers.js   # byte-identical
node scripts/validate-data.js                 # 0 errors, 5 warnings (3 + 2)
node scripts/validate-data.js data/products.synthetic.js   # 0 errors, 0 warnings
node scripts/test-serializer.js               # 0 failures
node scripts/test-import.js                   # 127 passed
node scripts/make-preview.js                  # smoke test
node scripts/report-import-fixtures.js        # expected-behaviour table
```

~~**The next piece of work is item 5: GitHub read and write.**~~ **Superseded on
`sources-registry`, 23 September 2026** — items 5 and 6 are replaced by the
GitHub-native proposal flow. See §5.

---

## 1. What exists

> **Superseded on this branch (22 September 2026).** The team has decided the
> staging dashboard must *not* be a manual data-entry tool: it becomes the
> surface where proposed changes are approved or rejected, and collection
> produces proposals rather than edits. What this section describes is still
> what the code does today, and the save gate, preview and import machinery all
> carry over — but the editing forms do not. See
> [source-registry-notes.md §4a](../source-registry-notes.md) for the new flow,
> where new data lands, and the open question of who authors the judgement
> sentences. This note exists only on `sources-registry`; `data-editor` is
> unchanged.

A browser page, `editor.html`, where an analyst updates the dashboard's data
through forms. Plain HTML, no build step, no dependencies — the same as every
other page here, so it hands over to RBM inside the same file set as the
dashboard it feeds.

| Piece | Where |
|---|---|
| The rules, as pure functions | `scripts/data-rules.js` |
| House-style file writer | `scripts/serialize-products.js` |
| Round-trip test | `scripts/test-serializer.js` |
| Import parsing, mapping, planning | `scripts/import-lib.js` |
| Import tests (127) | `scripts/test-import.js` |
| Import fixtures + generator + report | `test-data/import/`, `scripts/make-import-fixtures.js`, `scripts/report-import-fixtures.js` |
| The page itself | `editor.html` |

The loop an analyst runs: **edit → checked live → preview on the real page →
write a changelog line → save**. Saving currently downloads `products.js`;
committing it to a branch is item 5.

Also in: adding and deleting medicines, importing spreadsheets, a progress
ring and step track per medicine, plain-English copy throughout, and a dark
visual identity.

---

## 2. Decisions

### A static page in this repo, not a Next.js or Python app

The dashboard hands over to RBM as a single artefact. A Next.js admin app or
the existing `streamlit-app/` editor both need a server process — a second
deployment, a second account, a second thing for RBM to own.

Checked RBM's own site while deciding. `dashboards.endmalaria.org` runs
**Next.js on AWS Elastic Beanstalk** (eu-west-1) behind nginx, in en/fr/pt. So
matching their framework buys nothing: it is their app, on their
infrastructure, and we cannot deploy into it. Their site already embeds outside
dashboards in iframes — the **WHO Malaria Threats Map** is on it today, the
same WHO source `data/resistance.js` is drawn from. That is the route in.

| Rejected | Because |
|---|---|
| Next.js admin app | Needs a running server; breaks the single-artefact handover; cannot deploy into RBM's app anyway |
| Keep the Streamlit editor | Works, but needs a Python host. Stays as the internal analyst workbench, not the handover artefact |
| Edit on GitHub directly | Free, but the analyst edits code-shaped text; one stray comma breaks it |
| Google Sheet + importer | Familiar, but accepts anything — no source, no date rules |

### The rules split in two, not one function

`checkData(data)` is pure and runs in a browser. `checkStudyLayers(sources)`
takes already-read file *contents* and is called only by the CLI.

Forced by what the rules do, not preference. **All 5 warnings come from the WHO
layer checks**, which read three other files the editor must never touch.
Confirmed empirically: browser-side `checkData` returns 0/0 on the real data
while the CLI returns 0 errors / 5 warnings. The difference is exactly those
layers.

### The serializer inlines flat scalar arrays; the Python original does not

The round-trip test failed first time on `stageColumns`. Per CLAUDE.md,
established which side was wrong before changing either — ran the Python
serializer against the same file:

```
Python serializer round-trips byte-identical: False
  line 44  file  : '    { "stages": [0] },'
           python: '    {'
  line count: 345 -> 374
```

So the port was faithful and **both disagreed with the file**. The file wins:
an object also prints on one line when its values are scalars *or flat arrays
of scalars*.

### One `finished()` builder for save and preview

Produces what publishing would write: draft + pending changelog entry +
`lastUpdated` set to today. Save serializes it; preview renders it. Two
separate builders could diverge, and a preview that does not match the save is
worse than no preview.

### Import proposes, never writes

Files become a **plan** — creates, updates, skips — with every change shown as
`was → now`. The analyst ticks what to accept, it lands in the draft, and the
draft still passes the save gate. Matching is by id, then name, then INN, so
re-importing updates rather than duplicating.

Guessing is worse than refusing: `test-data/import/14-nothing-useful.csv` is a
page of meeting minutes and must produce nothing. Ambiguous dates are reported,
never chosen — `03/04/2026` is the 3rd of April or the 4th of March and the
value cannot say which.

### Import is not for `sourcing/staging/`

Those files are **evidence**: one row per disbursement, purchase order,
registration, trial or study, fetched automatically. `data/products.js` is one
row per **medicine**, with a cited sentence per step. The analyst reads the
first and writes the second, and that judgement cannot be imported.

Running the real staging files through the importer proved two guards were
needed — see §3.

### Plain English, with the technical wording kept underneath

Check messages come from `scripts/data-rules.js`, which CI also runs, so they
are unchanged. The editor translates them on the way to the screen and keeps
the original in each row's `title`:

```
products[1] (alaq) stage "WHO PQ listing": a delayed stage must carry a
substantive reason in "note"
    ->  ALAQ → WHO PQ listing
        Marked Delayed, so it needs a note explaining why
```

Anything matching no pattern is shown exactly as written, so a rule added later
is worded technically rather than hidden.

### Its own dark identity, but the dashboard's colour meanings

Deep navy, indigo for interaction, cyan and magenta from a supplied reference.
**Status colours still mean what they mean on the public board** — Complete
cyan, In progress amber, Delayed magenta — so nobody relearns a colour language
moving between the two pages, and interaction never borrows a status colour.

### A progress ring per medicine, not a percentage

One arc per step, coloured by that step's status. A percentage hides the thing
worth seeing: not how far along a medicine is, but *where it is stuck*. ASPY
reads 4/8 with four cyan arcs, two amber, one magenta, one grey.

---

## 3. Found in passing

### Left alone deliberately

**`streamlit-app/launch_data.py` reformats `stageColumns` on save.** Same root
cause as the serializer decision above: its `_fmt()` does not treat a flat
scalar array as inline-able, so the first save through the Streamlit editor
rewrites `data/products.js` from 345 to 374 lines — a whole-file diff for a
one-field edit. Fixing it belongs with the Streamlit app and wants its own
round-trip test. **Worth doing before anyone edits data through Streamlit
again.**

**A stale `http.server` was serving this repo to the whole network.** Found
while starting a local server: a `python -m http.server 8000` started on 9 Sep,
still running seven days later, bound to `*:8000` — every interface, which is
`http.server`'s default and its worst footgun. Every run instruction now says
`--bind 127.0.0.1` and uses port 8001, since two unrelated `uvicorn` processes
from another project hold 8000 on loopback.

**`.DS_Store` files are untracked and not ignored.** One line in `.gitignore`
would settle it.

### Fixed along the way

- **The editor could fail silently on startup.** A runtime error inside
  `start()` was caught by the data fetch's `.catch()`, which wrote "could not
  read data/products.js" into a panel `start()` had already hidden. The page
  loaded, showed its chrome, rendered nothing, and reported nothing. Render
  failures are now caught separately and `boot()` un-hides its own panel.
- **File reads were being stranded.** The picker was cleared synchronously
  while its reads were still in flight, releasing the handles so they never
  settled — and an uncaught promise hid it. Same lesson twice.
- **The sticky bar was see-through.** A `background:` shorthand set the
  gradient, then a `background-image:` longhand two lines later replaced it
  with the dot texture alone, leaving no opaque layer.
- **Change labels reused the `.f` class**, which is the form-field rule
  (`display:flex; flex-direction:column`), stacking every label above its
  value.
- **Delimiter sniffing was fooled by quoted text.**
  `sourcing/staging/nafdac_registrations.csv` has semicolons inside quoted drug
  descriptions, which split every line into a tidy two columns and beat commas
  on consistency, so a data row was read as the header. The sniffer now parses
  quote-aware and weights column count: consistency alone rewards the wrong
  answer.
- **Transaction-shaped files would have created hundreds of duplicates.**
  `procurement_transactions.csv` is 12,151 rows with 69 distinct medicine
  names. The importer now recognises that shape and refuses with a red notice
  naming the ratio.

### Tests that were themselves wrong

Four times on this branch a test disagreed with the code and **the test was
wrong** — the manufacturer value, the Excel epoch anchor, and two others.
Each was checked against the data or a canonical reference before anything was
changed. CLAUDE.md warns about this for a reason.

---

## 4. Status

**Files added:** `editor.html`, `scripts/data-rules.js`,
`scripts/serialize-products.js`, `scripts/test-serializer.js`,
`scripts/import-lib.js`, `scripts/test-import.js`,
`scripts/make-import-fixtures.js`, `scripts/report-import-fixtures.js`,
`test-data/import/` (20 files), two PDFs in `docs/`.

**Files changed:** `scripts/validate-data.js` (406 → 66 lines, now a thin CLI
wrapper), `scripts/build-public-site.sh` (comment only — says why
`editor.html` is deliberately absent from the copy allowlist, which is the only
thing keeping the editor off the public site), `data/products.js` (one escaped
em-dash normalised to raw, against 87 raw ones elsewhere; semantically
identical).

**Verify block:** all passing, as of 17 September 2026.

---

## 5. Still to do

### Next — item 5, GitHub read and write

The loop works except for where the file goes. Saving downloads `products.js`
and the analyst moves it into `data/` by hand. Item 5 replaces that with four
operations against GitHub: read the current file, create a branch, commit the
serialized file, open a pull request. All using the signed-in user's own token,
so GitHub's permissions are the authorisation model and the page holds no
credential of its own.

**Stop at opening the draft.** Do not wire the publish button until branch
protection exists. Point the editor at a scratch branch while building.

### Then

| # | Item | Notes |
|---|---|---|
| 6 | Sign-in | Pasted fine-grained token, scoped to this repo, contents + pull requests only, 90-day expiry, `sessionStorage`. A GitHub App for one-click comes later and only changes the part that *obtains* the token |
| 7 | Branch protection, editor/approver split | **Needs GitHub Pro** — see below |
| 8 | Analyst guide | Extend `docs/data-analyst-guide.md`, same commit as the code it describes |

> **Items 5 and 6 are superseded on `sources-registry` (23 September 2026).**
> The proposal flow built there does all four GitHub operations in a workflow
> under `secrets.GITHUB_TOKEN`, and GitHub's own sign-in puts the name on the
> change — so there is no token to paste, no `sessionStorage`, and no page of
> ours to sign into. **Item 7 survives unchanged and carries more weight, not
> less.** Item 8 stands. This note exists only on `sources-registry`;
> `data-editor` is unchanged.

### Blocked on GitHub Pro — $4/month

> *No longer blocked on `KylerXiv/launch-development-test`: it is public since
> 6 Oct 2026, and public repositories get branch protection free. Not switched
> on yet. The account list below is Keith's repository's, not this one's.*

Branch protection is not available on the current plan. GitHub says so
directly:

```
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

Confirmed by API: `main` is `protected: false`, `enforcement_level: "off"`.

This matters more than it looks. Token permissions are repository-wide — there
is no way to scope a token to "can write files but not to `main`". Branch
protection is therefore the *only* thing enforcing "the editor can only
propose". Until it exists, that property is a convention our code follows, not
something GitHub prevents. Required status checks are also off, so a pull
request showing errors can still be merged.

**Four accounts have push access** (`codebyjackson`, `Keith-paradox`,
`KylerXiv`, `keith-paythonic`), so the "only one careful person" assumption
stopped holding long before RBM enters the picture. Buy it now, not at
handover.

Two things to get right when switching it on:

1. Only `Keith-paradox` can — it is the sole admin. Not `KylerXiv`.
2. Tick **"do not allow bypassing the above settings"**, or the owner account
   walks through the rule. Then test it: push directly to `main` and confirm
   GitHub refuses.

Cost: **$4/month flat now** (personal Pro, does not scale with collaborators);
**GitHub Team at ~$4/person** once RBM owns it in an organisation.

### Not built, from item 3's scope

Nothing outstanding. Add / delete / placeholder medicines all landed.

### Open questions — none block items 5 and 6

**Four of these were answered on 23 September 2026**, by the ownership
correction at the top of this document and by confirming how RBM will carry
the page.

| Question | Answer |
|---|---|
| Will their site embed our page, or copy the files? | **Embed.** `dashboards.endmalaria.org` runs Next.js on AWS Elastic Beanstalk and already iframes outside dashboards — the WHO Malaria Threats Map is on it today. The page keeps being served from Unitaid's origin, so nothing is copied and nothing drifts |
| Who owns the repo and hosting afterwards? | **Unitaid.** Not RBM — see the correction at the top |
| Who pays the ~$12/month after handover? | **Unitaid**, along with the Vercel project and any email provider account |
| Can RBM staff have GitHub accounts? | **Moot.** RBM never edits data, so they never need one |

| Still open | What it affects | Ask |
|---|---|---|
| Is endmalaria.org in-house or contractor-run? | Who we negotiate the iframe and its `frame-ancestors` entry with | RBM |
| Permission for the Unitaid mark and the WHO emblem | Currently carried on an unconfirmed assumption that explicitly does not transfer to another page or repo. **Embedding puts both marks on an RBM-branded page**, which is a new surface the assumption was never tested against | Unitaid |
| The site runs en/fr/pt; the dashboard is English only | Whether it gets listed under the French and Portuguese trees, where visitors would land on an English page | RBM |

### Newly scoped — the two buttons, and a backend for them

Asked on 23 September 2026: make **Subscribe for updates** and **Send
feedback** actually work, with submissions arriving by email to the team.
Nothing is built yet; this records the decisions taken and what blocks the
build.

> **Subscribe built 1 Oct 2026** on `email-subscribe`, as scoped below:
> `api/subscribe.js` on Vercel, sending through Resend. Item 5 was answered: a
> Resend contact list plus a note to the team, made double opt-in the same
> day: a confirm email first, then a welcome email with an unsubscribe link.
> Item 4 stands for the secrets alone (`RESEND_API_KEY`,
> `UNSUBSCRIBE_SECRET`); the addresses are set in `api/_mail.js`.
>
> **Send feedback built 2 Oct 2026** on `email-feedback`: `api/feedback.js`
> emails the team inbox, Reply-To the visitor. The 13-page question below was
> answered by the owner: **the illustrated journey only** (with its `/fr/`
> and `/pt/` editions). Every other page stays a mock, and so do RBM's copies,
> which are hosted without `api/`. All of it is in
> [email-backend-notes.md](../email-backend-notes.md) (§2.12 for feedback).

**Both buttons already have exactly one seam each**, left deliberately by the
work that built them: `subscribeEmail()` at
[illustrated-journey-dashboard.html:3511](../../illustrated-journey-dashboard.html)
and `submitIssueReport()` at
[assets/report-issue.js:46](../../assets/report-issue.js), the latter also
swappable at runtime via `window.LAUNCH_REPORT_ISSUE.submit`. The panels,
validation, pending/success/failure states and the reference number all already
work around them. Nothing else has to change.

**Decision: serverless functions on Unitaid's own Vercel deployment.** Vercel
serves an `/api/` directory at the repo root independently of
`outputDirectory`, so this is two files and no config change. Because the page
is served from Unitaid's origin *inside* RBM's iframe, the form posts
same-origin — no CORS, no cross-origin CSP to negotiate with RBM.

| Rejected | Because |
|---|---|
| `mailto:` links | No delivery guarantee, publishes the address to scrapers, and the visitor's mail client may not exist |
| A third-party form service | Another account for someone to own and let lapse, and submissions leave the project's control |
| A managed mailing-list platform | Double opt-in, stored subscribers, unsubscribe handling and someone committed to actually sending updates. That is a product with an owner, not a button |

**The feedback widget is loaded by 13 pages**, not one — including `unitaid/`
and `synthetic/`, the fabricated-data edition. Wiring the seam turns all 13 on
at once. The payload carries `page.url` and `data.dataStatus`, so synthetic
submissions can be tagged or dropped, but somebody has to decide which.

#### Found while scoping, and not yet handled

- **`vercel.json` has no `headers` block**, so the page will frame for anyone.
  It needs a `Content-Security-Policy: frame-ancestors` allowing self and
  `https://dashboards.endmalaria.org` only — otherwise the dashboard, carrying
  the WHO emblem and the Unitaid mark, can be embedded anywhere.
- **Modal positioning inside a tall iframe is the real risk.** The feedback
  widget is a `<dialog>` and the subscribe panel floats; both position against
  the *iframe's* viewport, not the visitor's. If RBM sizes the frame to full
  content height, a visitor clicking "Send feedback" halfway down gets a dialog
  centred somewhere off-screen and sees nothing happen. Needs a `postMessage`
  handshake with the parent page — around 30 lines, but it requires RBM's
  cooperation, so it belongs in the embed conversation and not after it. **Test
  against their staging frame before launch: this works perfectly standalone
  and breaks only once embedded.**
- **Silent failure.** If the provider account lapses or the sending domain
  falls out of DKIM verification, the API call can still return 200 while the
  mail is dropped — the form says "sent", the reference appears, nothing
  arrives, for months. A weekly canary submission that alerts when it does not
  land is the cheap fix.
- **Vercel function logs will carry the payloads in transit**, including names,
  emails, organisations and user agents. Log retention on the Unitaid project
  is a privacy setting to choose deliberately, not inherit.

#### Blocked on — all Unitaid's, none technical

> *6 Oct 2026: items 3 and 4 are done for testing, on a Resend account with
> `tamarind.tech` as the verified sending domain. Item 5 was settled as a real,
> double opt-in list, built 1 Oct. Items 1, 2 and 6 are still Unitaid's; see
> §0.*

1. A destination inbox. A shared mailbox, not a person: these outlive whoever
   is on the project.
2. A Unitaid sending domain with DNS access, for DKIM and SPF. **Start this
   first** — it is the only item sitting in someone else's queue.
3. An email provider account and API key, in Unitaid's name. Resend's free tier
   is far above this volume.
4. The key set as an environment variable on the Unitaid Vercel project, never
   in the repo.
5. **What "Subscribe" means.** Either *notify us* — the address is emailed
   over, the list is kept by hand, nothing to unsubscribe from — or a real
   mailing list, which is the rejected option above. The current copy
   deliberately refuses to claim the second: *"Noted, but not sent… Nothing
   left your browser."* Whichever ships, the confirmation stays honest about
   it.
6. A privacy line naming which organisation receives submissions. RBM hosts,
   Unitaid receives, and Unitaid is a WHO hosted partnership — "who is the data
   controller" is not a question to answer casually.

### Checked against GitHub's API, 23 September 2026 — Pages cannot host a private page

Asked this session: can the staging dashboard live on GitHub Pages, restricted
to whoever has access to the private repo? **No — and it is a permanent no, not
one waiting on Unitaid's plan tier.**

| Repo | Owner type | Private | Pages | Rendered site |
|---|---|---|---|---|
| `Keith-paradox/launch-development` | **User** | yes | off | — |
| `kochrisdev/launch-transparency-dashboard` | **User** | no | on, `built` | **`public: true`** |

1. **Access-controlled Pages needs an organisation on GitHub Enterprise Cloud.**
   Both repos are owned by personal accounts, so switching Pages on for the
   private repo publishes a *public* site. The repository's privacy does not
   carry to the rendered page — which is the trap, because from the inside it
   looks private.
2. **Enterprise Cloud would only solve half of it.** Pages is a static host and
   cannot write. Private Pages buys a *viewer*, never an editor; making it edit
   means putting a credential back in the browser, which is the layer the team
   decided not to own. That is why this is closed rather than parked.

**The viewer already exists**, so nothing is lost: `proposal-intake.yml` builds
`preview.html` with the proposed change applied and uploads it as a workflow
artifact, readable by people with repository access and nobody else. No host, no
cost, no account tier.

> **Superseded 28 Sep:** the viewer is now a link-only Vercel preview of the
> whole public site, built from the proposal's pull request —
> `docs/pr-preview-notes.md`.

| Rejected | Because |
|---|---|
| Pages on the private repo | The site is public regardless of the repo. Personal account, no Enterprise Cloud |
| Pages + Enterprise Cloud | Read-only, so it cannot be the editor — and it gates the design on a plan tier nobody here controls |
| Vercel Deployment Protection | Works, but access becomes Vercel team membership: a second access list and a second vendor at handover. `vercel.json` also builds the *public* site, so it would need its own config |
| Cloudflare Access | **Kept as the fallback** — free to 50 users, and the viewer needs no GitHub account, so it survives a "no" from RBM IT |

### Handover facts established 23 September 2026

- **Git history is clean.** All 91 commits scanned for token-shaped strings
  (`ghp_`, `github_pat_`, `gho_`, `ghs_`) — none found. Nothing to scrub before
  the repository changes hands.
- **One repository secret exists:** `VERCEL_DEPLOY_HOOK_URL`, used by
  `vercel-deploy.yml`. **Verify it after any transfer rather than assuming it
  survives.** An unset secret fails the same way as the dropped-email problem
  above: the run goes green, the deploy never happens, and nobody is told.
- **Copy or original has to be decided in writing.** Unitaid receives the source;
  RBM receives only the component. If Unitaid gets a fork while a pipeline still
  runs anywhere else, two pipelines can publish to the same data address. Only
  one may ever hold the publish credential.
- **`.DS_Store` is still untracked and still not in `.gitignore`** — now in
  three places (`/`, `data/`, `sourcing/`), alongside an untracked
  `test-data/proposal/`. Settle both before the repo goes to two organisations.

### Unresolved, and only your team can answer

**`https://kochrisdev.github.io/launch-transparency-dashboard/` is live** —
HTTP 200 today. `README.md`, `powerbi/queries.m` and
`streamlit-app/README.md` all point at it. Is it an old copy serving stale
data under a URL people may be citing, or the real public deployment with this
repo as a working copy?

**Checked 23 September 2026:** that repository is **public**, its Pages site is
`built` with `public: true`, and its owner type is **User** — a personal
account. That does not settle old-copy-versus-real-deployment, which still needs
a person to answer. It does settle two things around it: the address depends on
an individual's account, and everything in that repo is world-readable today,
including any raw snapshot or watch report it holds. `source-registry-notes.md`
§4d records the decision to retire it and leave the address alive with a notice,
since it may be cited in documents nobody here can edit.

This blocks nothing in the build, but it blocks handover planning: the project
cannot be handed over with its documentation pointing at an account the
receiving organisation does not control.

### One thing to verify at Phase 2

`publish.yml` is path-filtered on `data/products.js` and its append-only guard
fails the run if `meta.lastUpdated` was not bumped. The editor always bumps it,
but confirm the whole loop end to end when the change arrives **by merge**
rather than by direct push — that path has never been exercised.
