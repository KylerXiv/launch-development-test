# Working notes — source registry

**Branch:** `sources-registry` (off `data-editor`) · **1 commit** · **not pushed** · CI not run
**Last worked:** 21 September 2026

This branch's working-notes document, per [CLAUDE.md](../CLAUDE.md). It covers
`data/sources.js` and the footer that is now drawn from it.
`data-editor` keeps its own
[handover document](Handoff_Kyler/Handoff_Kyler.md) and is untouched by this
work.

---

## 1. What this adds

`data/sources.js` — one entry per source the dashboard draws on, 22 of them,
in the same shape as every other data file here: comment header, then
`window.LAUNCH_SOURCES = ` at a line start, then strict JSON.

The Sources footer on `illustrated-journey-dashboard.html` is now rendered
from it. Two lists: the registers and feeds a figure comes from (15), then the
one-off documents behind a single medicine (7).

---

## 2. Decisions

### One registry, not a second list beside the first

Sources lived in two places that had no connection: 40 lines of hand-typed
`<li>` in the page footer, and the catalog in
[data-sourcing-plan.md](data-sourcing-plan.md) §3. Neither knew about the
`source:` strings inside `data/products.js`, of which there are **50**, written
freehand:

```
"Global Fund PQR (extract 23 Aug 2026)"
"Global Fund PQR Transaction Summary (extract 23 Aug 2026)"
"Global Fund PQR Transaction Summary, extract 23 Aug 2026 — Covers …"
"EMA register"
"EMA EU-M4all opinions table; MMV, 31 Jul 2025"
```

Three spellings of one source, two of another. Adding 14 more sources to a
hand-maintained footer would have made a third list to keep in step.

**The sourcing plan stays where it is.** It answers a different question — how
to fetch a source, how often, under what licence, what breaks — for whoever
writes the next fetcher. `sources.js` answers what the reader sees and clicks.
Merging them would make both worse.

| Rejected | Because |
| --- | --- |
| Leave the footer hand-written, add only new sources to a file | Two lists again, and the hand-written one is the one that goes stale |
| Put display metadata in the sourcing plan | It is a prose document for developers; the page cannot read it |
| Generate the footer at build time | There is no build step, deliberately — the page is loaded from the file system and hands over as a single file set |

### 22 entries from 10 + 14, not 24

Two of the confirmed URLs are alternate front doors onto sources already in
the footer, so they became `alsoSee` links rather than separate entries:

- `who.int/publications/i/item/guidelines-for-malaria` → the WHO malaria
  guidelines entry
- the antimalarial drug efficacy database → WHO Malaria Threat Maps. **It is
  the same TES data** that `normalize-resistance.js` already ingests; listing
  it separately would have implied a second, independent source.

### `label` alongside `title`

The footer's names are short ("Nigeria: NAFDAC Green Book"); the registry
needs the formal one ("NAFDAC Green Book", org "National Agency for Food and
Drug Administration and Control"). Both are carried; `label` falls back to
`title`.

Checked rather than assumed: the renderer was run against the real registry
with a DOM stub and diffed against the previous hand-written markup. **8 of the
10 original entries come out byte-for-byte identical.** The two that differ are
exactly the two that gained an `alsoSee` link above — no public wording changed
by accident.

### Errors only in the validator, no warnings

`checkSources` in [scripts/data-rules.js](../scripts/data-rules.js) returns
errors and never warnings. Every rule it enforces is a broken link, a missing
credit or an orphaned citation — a warning would be read as "the data is
fine". It also keeps the documented verify-block contract intact: still
**0 errors, 5 warnings** (3 resistance + 2 molecular markers), unchanged.

Negative-tested rather than assumed: six deliberate breaks (duplicate id, bad
URL, missing `plain`, unknown `group`, misspelled product id, wrong date
format) produce exactly six errors, one each.

`extractData` gained an optional `global` argument so one extractor serves both
files; every existing caller is unchanged.

### `findings` and `relevance` are stored but not published

The confirmed source list carried a *Key Findings* and a *Strategic Relevance
(Unitaid)* column. Both are in the file; neither is rendered. Strategic
relevance in particular is internal framing, and the public footer's job is to
let a reader check a figure, not to explain why Unitaid cares. **Assumption,
not an instruction — reversible in one line of the renderer.**

### Corrections applied to the confirmed list

Four cells were wrong against the sources themselves:

| Entry | Supplied | Actual |
| --- | --- | --- |
| `mesa-landscape` | Publisher **Unitaid**, titled as a Unitaid market-dynamics report | Published by **MESA**. The page carries the Unitaid mark; crediting another organisation's work to Unitaid on it is the error with the highest cost |
| `plos-aspy-cem` | MMV, 2024 | **PLOS Medicine, 15 June 2021**, vol. 18 |
| `who-pq-guidance` | Carried the comparator list's title | Separate document, given its own |
| `who-eml` | 2022 | URL is the **23rd list, 2023** — and a 2025 list supersedes it |

One that was right and was left alone: the Frontiers Ghana paper really is
**2026** (online 4 Dec 2025, issue date 5 Jan 2026).

---

## 3. Found in passing

### Verified facts worth not re-deriving

- **Rwanda FDA register is fetchable.** 2,482 products on one page, 5.25 MB,
  ~200 s, no pagination and no separate data endpoint. Columns include Reg.
  Date and Expiry Date; format is DD/MM/YYYY, provable from rows like
  `23/05/2026`. Portfolio matches on 21 Sep 2026: **DHA-PPQ ×3** (DIARTEM IG
  ADULT 120/960 mg, Bliss GVS, reg. 12 May 2025; two 40/320 mg, Bliss GVS and
  Ajanta), **ASPY ×2** (Shin Poong's own 60/20 mg and 180/60 mg, reg. 17 Aug
  2024). None for ALAQ or GanLum, as expected.
- **The WHO guideline version has a working free API.** `GET
  api.magicapp.org/api/v1/guidelines/10462` returns
  `"WHO guidelines for malaria - 13 August 2025"`, last edited 2 Sep 2025. The
  smallest useful fetcher on the list, and it watches the most consequential
  event this dashboard tracks. Not built.
- **WHOPAR URLs follow `<ref>Part7.pdf` but not every reference has one.**
  MA140 → 200; MA211, prequalified Aug 2026, → 404. Links must be probed per
  product, not assumed.
- **Uganda NDA cannot be automated.** HTTP 403 to non-browser clients on both
  the register page and the site's WordPress API.

### Discovered, and it blocks more than this branch

**Every GitHub Actions run in `Keith-paradox/launch-development` has been
`startup_failure` since 10 September 2026** — all workflows, all events.
`Scheduled source fetch` has *zero* runs here, and `Validate dashboard data`
does not run on pull requests either, so nothing is gating merges.

The cron everyone assumed was running is running in a **different repository**:
`kochrisdev/launch-transparency-dashboard`, public, 6 successful runs, bot
commits landing, and **5 open watch issues nobody has read** — including a new
GanLum trial (NCT07811908, recruiting) picked up on 14 September.

That settles the `kochrisdev` question the `data-editor` handover left open: it
is not a stale copy serving old data, it is where the automation actually
lives. Two repositories are diverging — the work in one, the pipeline in the
other.

The repo is private on a personal account; a whole-repo startup failure across
every workflow usually means Actions minutes or a spending limit rather than
anything in the YAML. Only the owner can see the billing page.

### Left alone deliberately

`.DS_Store` files are still untracked and not ignored — pre-existing, one line
in `.gitignore` settles it, out of scope here.

---

## 4. Status

**Files added:** `data/sources.js`, this document.

**Files changed:** `illustrated-journey-dashboard.html` (footer markup → two
empty lists plus `renderSources()`; `data/sources.js` script tag),
`scripts/data-rules.js` (`extractData` takes a global name; `checkSources`
added), `scripts/validate-data.js` (runs `checkSources` on the default
invocation), `scripts/build-public-site.sh` (copies `data/sources.js` — without
this the live site ships a page whose footer renders empty, which is exactly
the bug `data/molecular-markers.js` hit once already).

**Verify block, 21 September 2026 — all passing:**

```
normalize-resistance.js          byte-identical
normalize-molecular-markers.js   byte-identical
validate-data.js                 0 errors, 5 warnings
validate-data.js (synthetic)     0 errors, 0 warnings
test-serializer.js               0 failures
test-import.js                   127 passed
make-preview.js                  wrote preview.html (154 KB)
```

CI has not run and cannot — see §3.

---

## 4a. Direction change — the editor becomes a review gate (22 Sep 2026)

Decided with the team engineer, after the source registry landed. **The staging
dashboard is no longer a manual data-entry tool.** It becomes the surface where
proposed changes are approved or rejected. Nothing typed freehand; nothing
published without a person agreeing to it.

Flow diagrams (deliberately non-technical, for RBM and the wider team):
<https://claude.ai/artifact/6TDdHARL6EdrKgLU5ANqD7>. The four-language
architecture behind them: <https://claude.ai/artifact/5eyw5Tk4gSd59oFfp2MD1F>.

### Where new data lands

Today a fetcher ends at `sourcing/staging/*.csv` plus a watch report and a
GitHub issue. That is **evidence**, not a proposal — one row per registration
or disbursement, while `data/products.js` is one row per medicine with a cited
sentence per step. The new flow needs a layer between them that does not exist
yet:

| Piece | What it holds | Status |
| --- | --- | --- |
| **Waiting room** | One proposal per change: product, field, current value, proposed value, evidence link, source, date seen | **Not built** |
| **Review desk** | The rebuilt staging dashboard: current vs proposed side by side, approve / reject | Rebuild of `editor.html` |
| **Decision record** | Who approved or rejected what, when, and why | **Not built** |

Shape to follow: another `data/*.js` file setting a `window.LAUNCH_*` global,
validated by `scripts/validate-data.js` like everything else. No server, no
build step — the constraint that produced the static editor in the first place
has not changed.

**The pattern already exists and should be generalised, not reinvented.** The
import feature on `data-editor` already turns a messy file into a *plan* of
creates / updates / skips, shows every change as `was → now`, and lets the
analyst tick what to accept. That is the review desk, restricted to one input.

### The gap this creates — and it is the important one

A rejection must be remembered, or the same proposal returns monthly until
people stop reading the queue. That is straightforward.

The hard one: **if analysts can only approve or reject, something must author
the sentence.** Roughly a third of the dashboard is mechanical — registration
status, trial dates, PQ listings, procurement volumes — and those proposals
compose themselves from the evidence. The rest are judgements assembled from
several sources, of exactly the kind CLAUDE.md's own example describes, and a
register cannot propose one. A reviewer cannot approve a proposal nobody wrote.

So the flow needs a named author for the judgement layer — a curator drafting
proposals, or a drafting assistant whose output is always a proposal and never
a publication. **Settle this before building the desk:** it decides whether the
desk handles ten proposals a month or two.

### Translation engine — recommendation, not yet decided

Content is ~21,000 characters; three more languages is ~63,000. Cost is not a
factor at that size, so choose on terminology control and determinism:

**DeepL with a fixed glossary.** The glossary pins the official WHO wording
once and carries the do-not-translate list (INNs, product names, registry
numbers, source names); it is strongest on fr/pt/es; and it answers identically
on a re-run, so a reviewed sentence stays reviewed. Its free tier covers this
volume roughly eight times over. If the fourth language is Arabic, prefer
Google Cloud Translation — wider coverage, and Arabic also brings an RTL layout
job unrelated to the string plumbing.

Before any engine runs, lift ~60 terms from **WHO's and RBM's own published
French and Portuguese**. Both already publish in these languages; matching
their vocabulary is something no engine gets right unprompted, and RBM is the
future host.

## 4b. Publication architecture (22 Sep 2026)

Proposed by the team engineer, reviewed here. **The handover artefact becomes a
published dataset, not a rendered page**, with RBM's own Next.js platform as
one consumer of it. Two repositories:

| Repo | Holds | Visibility |
| --- | --- | --- |
| Pipeline | fetchers, proposals, decisions, the review dashboard, all code | **private**, institution-owned |
| Published data | the approved dataset only — versioned, four languages, no code, no secrets, no proposals | public |

This is right, and it fixes a live problem: the cron currently runs in
`kochrisdev/launch-transparency-dashboard`, which is **public**, so every raw
snapshot and watch report is already world-readable. Under the new split,
unapproved data cannot be public by construction rather than by care.

It is also less novel than it looks — `powerbi/queries.m` line 17 already
fetches `data/products.js` over HTTPS as a data source. The data layer
formalises something that exists informally, and serves Power BI, Streamlit,
RBM and our own pages from one approved set of figures.

### Corrections made to the proposal

1. **Localisation cannot move to RBM.** Their platform localises its own
   chrome; it cannot translate our ~2,758 words of analyst-written clinical
   sentences. Publishing English only would put French navigation around
   English claims. **The published dataset must carry all four languages**, so
   the overlay and its second review stay upstream of publication, on our side.
2. **Prefer server-side fetch to browser fetch.** The proposal had every
   visitor's browser call the data host from RBM's domain — a third-party
   request needing privacy review at a UN-adjacent organisation, and a hard
   dependency (host unreachable in a country ⇒ broken tab). Next.js can fetch
   server-side and serve from RBM's own origin: same freshness, no third-party
   call, degrades to the last good copy.
3. **Keep publishing our own rendered page.** Same data, second consumer. It
   already exists, Unitaid gets a page it controls (`unitaid/` edition), and
   the project is not hostage to RBM's roadmap.
4. **The address must be institution-owned.** Once a production site depends on
   a fixed URL, that account owns the dashboard's availability. `README.md` and
   `powerbi/queries.m` both point at a personal account today.
5. **Versioning scheme before the first consumer** — `/v1/latest/` plus dated
   snapshots. Once production fetches it the shape can never break. Fold in
   `history/` and `feed.xml`; the "as of" playback is an asset.

### GitHub Pages is not an access-controlled host

The proposal put the *internal* staging dashboard on GitHub Pages "restricted
to repo collaborators". **That does not exist outside GitHub Enterprise Cloud,
and it is an organisation feature** (checked against GitHub's docs, 22 Sep
2026). This repo is a private repo on a **personal** account: enabling Pages
publishes a *public* site at any tier they would realistically buy.

Verified state: `Keith-paradox/launch-development` has Pages off;
`kochrisdev/launch-transparency-dashboard` has Pages on with `public=true`, and
`editor.html` 404s there because `build-public-site.sh` excludes it — that
protection is working.

Host the review dashboard **locally** (what we do today; zero exposure, zero
cost) or behind **Cloudflare Access** (free to 50 users) when analysts sit
outside the dev team.

### Sign-in: two doors, and tokens do not go away

- **Front door** — who may *open* the page and read unapproved data. Answered
  by running locally, or by an access gate.
- **Write door** — who may *commit and open the PR*, and whose name is on it.
  Answered by the reviewer's own GitHub token, per item 6.

An access gate cannot do the second job: the review dashboard has no server, so
it cannot hold a credential. And the token cannot do the first. Keeping item
6's plan is right, and worth keeping for three properties: the page holds no
secret of its own; every approval is attributable to a real account; and
`editor.html` loads **zero external resources** (verified), so a token in
`sessionStorage` is reachable only by first-party code.

Two caveats. Without **branch protection** a `contents: write` token can push
straight to `main` and skip the PR, so "the editor can only propose" stays a
convention — item 7, still blocked on GitHub Pro. And if **RBM staff cannot
have GitHub accounts** (already an open question for RBM IT), sign-in moves to
work email with a machine account, which needs a server and weakens
attribution: the one answer that replaces this design rather than adjusting it.

### Fork still open — embedded, or built in

The earlier decision recorded in
[data-sourcing-plan.md](data-sourcing-plan.md) was that we cannot deploy into
RBM's app, and that their site **already embeds outside dashboards in iframes**
— the WHO Malaria Threats Map is on it today — "that is the route in." The new
proposal reverses this: a React component living in RBM's repository, rendered
as a platform tab.

Better experience, but it is a rewrite of a 3,689-line vanilla page with
MapLibre, and **once the code lives in their repository we cannot ship a UI fix
without their release cycle** — data would flow automatically while a button
fix waits on someone else. It also needs RBM to agree to accept and maintain
our code, which is a larger ask than hosting an iframe. Their decision to make,
and the data layer serves both routes, so it does not block.

Diagrams for all of the above, in deliberately plain language for RBM and the
wider team: <https://claude.ai/artifact/6TDdHARL6EdrKgLU5ANqD7>

## 4c. The whole route, drawn with the file names on it (22 Sep 2026)

Companion to the plain-language diagrams in §4a — same flow, but every box
carries the file it actually is, for whoever builds it:
<https://claude.ai/artifact/7dchTLL1nEg79kpgMtnr5B>.

### The desk cannot edit — approve or reject, nothing else

**Decided with the team engineer, 22 September 2026, and it supersedes the
three-button flow drawn in §4a.** The review desk offers exactly two outcomes.
A reviewer cannot retype a value, fix a date or soften a sentence. Amend, which
§4a's diagram carried, is gone.

**Enforced as a file boundary, not a role check.** Two pages, not one:

| Page | Holds | Writes to |
| --- | --- | --- |
| `propose.html` | today's `editor.html` forms, unchanged rules | `data/proposals.js` on the `proposals` branch |
| `review.html` | current beside proposed, evidence one click away, two buttons | `data/decisions.js`, and a PR applying the proposal to `data/products.js` |

`review.html` ships without any form code, so it *cannot* write a value no
proposal contains — a bug in it cannot invent one either. An "edit mode behind a
role flag" on one page was rejected for exactly that reason: the wall then
exists only in JavaScript, and it ships to every reviewer.

So there are **two ways a value changes** — a fetcher proposes, a person
proposes — and one gate that can only say yes or no.

| Rejected | Because |
| --- | --- |
| Reviewer amends, then approves (the §4a flow) | Puts a text field on the gate: a value nobody authored can reach the record, and the desk needs write access to every field. One page then holds both jobs and the separation lasts only as long as everyone remembers it |
| One page, edit mode behind a role check | The form code still ships to every reviewer; the wall becomes a flag. Two files cost nothing and cannot be toggled by accident |
| Edit `data/products.js` directly (GitHub web, or an editor) | Skips the gate entirely, captures no evidence, and puts code-shaped text in front of a non-developer |
| A shared spreadsheet plus an importer | Accepts anything — no source, no date rules. `scripts/import-lib.js` stays as an *input* that generates proposals, not as the gate |
| Keep the Streamlit editor as the write path | Needs a Python host; a second deployment for RBM to own. Stays the internal workbench |

**What it costs, recorded honestly.** A proposal that is right except for a typo
now takes a round trip. Worse, a fetcher-authored one has no author to send it
back to — a person must write the corrected version through `propose.html`.
Expect it on roughly one proposal in ten. This also makes §4a's open question
*sharper, not softer*: with no rescue at the desk, the judgement-sentence author
has to be named before anything else is built.

**What it buys.** Every figure on the record was authored by someone with the
evidence in front of them, rather than typed by someone clearing a queue at 5pm;
and "who wrote this sentence" stays answerable, because only one role ever
writes.

`scripts/build-public-site.sh` copies a **named list**, so both new pages are
excluded from the public site by default — verified, it names every file it
copies. Never add them, same as `editor.html` today.

### Option raised 22 Sep: build no page at all, and let GitHub be both surfaces

Asked after the two-page split was drawn: *if we do not use HTML to edit, where
can we manually edit?* Every job the two pages were going to do, GitHub already
does — typed form (issue forms), queue (issue list), `was → now` (the diff),
approve (the review), reject with a reason (close with a label), sign-in, and
permissions on a private repo.

**This is less of a departure than it looks.** `sourcing.yml` already opens an
issue when a watch report changes "so an analyst reviews it", and its header
comment already states that the fetchers never touch `data/products.js` and that
the analyst plus the validator remain the only gate. The issue queue exists; it
has no form on the front and no button on the back.

| The job | A page we build | GitHub, with no page |
| --- | --- | --- |
| Writing a proposal | `propose.html` | an issue form, or a six-field `proposals/*.yml` edited in the web editor |
| The queue | `data/proposals.js` | the issue or PR list, labelled |
| Checking it | `data-rules.js` in the browser, as they type | the same file in a workflow; errors return as a comment |
| Reviewing | `review.html` | the pull-request diff |
| Seeing the real page first | `make-preview.js` | a Vercel branch build — `vercel.json` already runs `scripts/build-public-site.sh` |
| Who may open it | a front door to build (local, or Cloudflare Access) | GitHub's permissions on a private repo |
| Whose name is on it | a token in `sessionStorage` (item 6) | the account they signed in with |
| What we maintain | two pages and a token flow | a form definition and two workflows |

It deletes item 6 (sign-in), the front-door hosting question, and the finding
that GitHub Pages cannot be access-controlled outside Enterprise Cloud.

**Two prerequisites, both already open questions here.**

1. **Everyone who proposes or reviews needs a GitHub account.** §4b already
   lists this as a question for RBM IT; this choice makes it load-bearing. If
   the answer is no, the only surviving surface is a hosted form with its own
   login — which is what `streamlit-app/` already is, and the server the static
   design was avoiding comes back.
2. **Actions must work.** Removing the browser page moves every check
   server-side; there is no rules engine running as someone types. With runs
   `startup_failure` since 10 September, this design would today accept anything
   and check nothing.

**Checked, not assumed — self-approval.** GitHub blocks approving your own pull
request *only if you opened it*. If a bot opens every PR from an issue, the
person who filed the issue can approve their own proposal. Two fixes, both
stronger than a rule in a page we wrote: the proposer opens the PR themselves
(the web editor does this when they edit a proposal file), or a required status
check compares the approving reviewer against the issue author and fails on a
match.

**Recommendation: GitHub-native, starting with the proposal file rather than the
issue form.** The file route needs no parser and no bot — the web editor creates
the branch and the PR in the proposer's name, CI validates, someone else
approves. If six flat fields prove too code-shaped for analysts, the issue form
is a friendlier front door onto the same pipeline and changes nothing
downstream.

Consequence for §4c's branch-protection note: **if the pull request is the
review desk, required review becomes the right setting after all**, because the
PR *is* the second pair of eyes rather than a third. The argument against it
holds only for the two-page design, where a human has already approved at the
desk before the PR exists.

Other surfaces considered, and why they lose: a CSV in Excel converted by a
workflow (`scripts/import-lib.js` already parses it, 127 tests — right for bulk,
but Excel mangles dates and encodings, and `normalize-pqr.js` already carries
those scars); `node scripts/propose.js` (zero hosting, full validation, but a
terminal is not an analyst surface).

### Decided: the issue form is the surface, and there is no page of ours

Settled after the two-page split was drawn. The binding constraint is **no
second site to build, host, secure and hand over** — not "analysts must never
see GitHub", which was the earlier phrasing. Between a web app of ours and a
form GitHub renders for free, the form wins.

**The surface:** `.github/ISSUE_TEMPLATE/propose-change.yml` — dropdowns for
medicine and field, required boxes for the new wording, the source and the date.
No YAML, no diff, no code-shaped text. It is `propose.html` without building or
hosting anything.

**The gate:** a label on that issue — `approved`, or `rejected:‹reason›` from the
fixed list. A label cannot carry a value, so the no-edit rule holds more
strongly here than on a page of ours: there is nothing to type into.

Everything downstream is unchanged — workflow applies it, opens the PR, checks
run, auto-merge on green.

**The hole this opens, and it must be closed in the same commit.** An issue body
is editable by anyone with write access, so a reviewer could rewrite the
proposal and then label it approved — the amend path through a side door. **The
workflow snapshots the proposal into `data/proposals.js` the moment the issue is
filed, and approval applies that snapshot, never the body as it currently
reads.** Later edits to the issue are ignored, and a mismatch is worth flagging
on the issue itself.

What this deletes from the plan: `propose.html`, `review.html`, item 6's token
flow, the front-door question, and the need to keep two more pages out of
`build-public-site.sh`. `editor.html`'s exclusion from that named list still
stands and still matters.

**Two settings that decide whether the form is a gate or a suggestion.**

1. **`blank_issues_enabled: false`** in `.github/ISSUE_TEMPLATE/config.yml`.
   Without it the plain title-and-description screen stays available to
   everyone, and "one way in" is gone — anyone can file free text and call it a
   proposal. An issue form does not replace the blank issue, it sits beside it
   until this is set.
2. **The source dropdown is a second copy of `data/sources.js`.** Issue-form
   options are static YAML and cannot be read from the registry at render time.
   **That is precisely the trap §2 of this document was written to close** — one
   registry, not a second list beside it. Generate the template's options from
   `data/sources.js` in a workflow and fail CI when they drift; do not
   hand-maintain 22 entries in two files. The same applies to the medicine and
   stage dropdowns, though those change far less often (4 products, 8 stages).

The page route stays recorded as the alternative — it is the one that wins if
analysts turn out to need the rendered page beside the proposed wording to judge
a judgement sentence, which is the one thing GitHub cannot show.

### Built 22 Sep: the proposal form itself

`.github/ISSUE_TEMPLATE/propose-change.yml` and
`.github/ISSUE_TEMPLATE/config.yml` are in the tree. Once committed and pushed,
`…/issues/new?template=propose-change.yml` renders the form instead of the blank
issue box — no other change is needed to make the address work.

Fields, chosen against the real record shape (`products[].stages[]` carries
`status`, `note`, `date`, `next`, `nextDate`, `source`, `asOf`): medicine, stage,
which field changes, the proposed wording, source, source date, an optional
link, optional reviewer notes, and two required tick-boxes ("I read the source
myself"; "this is one change"). The status wording in the form mirrors
`STATUSES = ["done","prog","late","idle"]` from `scripts/data-rules.js`, and the
field description repeats that rule's requirement that a delayed stage carry a
substantive reason — so the analyst meets the validator's rules while filling
the form, not after failing it.

`config.yml` sets `blank_issues_enabled: false`. It affects the web chooser
only; `sourcing.yml` opens its watch issues through `gh issue create`, which is
unaffected. **Consequence to accept or fix:** there is now no template for a
non-proposal issue (a dashboard bug, a question). Add a second template rather
than turning blank issues back on.

**Not machine-validated.** No YAML parser is installed here (no pyyaml on any
interpreter, no node_modules), so the file was checked by hand: no tabs, every
option string containing `&`, `:` or brackets quoted, every body item a valid
type with `attributes`. GitHub validates issue forms on push and shows an error
banner on the Issues tab if the syntax is wrong — that is the real check, and it
has not run yet.

Verify block after adding the two files: `validate-data.js` **0 errors, 5
warnings**; synthetic **0 errors, 0 warnings**. Unchanged, as expected — no data
file was touched.

### Built 22 Sep: the whole proposal flow

Files added, all on `sources-registry`:

| File | Does |
| --- | --- |
| `.github/ISSUE_TEMPLATE/propose-change.yml` | the form (already on `main`) |
| `.github/ISSUE_TEMPLATE/config.yml` | blank issues off (already on `main`) |
| `scripts/proposal-lib.js` | parse the filed form → proposal → apply it → house-style write. Also a CLI and a 20-check self-test |
| `.github/workflows/proposal-intake.yml` | on issue filed/edited: check, comment, rename, snapshot to `data/proposals.js`, label |
| `.github/workflows/proposal-decision.yml` | on label: `approved` → apply, PR, auto-merge · `rejected:*` → record + close |
| `data/proposals.js`, `data/decisions.js` | the queue and the decision log |
| `scripts/setup-labels.sh` | creates the nine labels the flow needs |
| `test-data/proposal/sample-issue.md` | the fixture, taken from the real issue #11 body |

**`main` has none of the machinery, and that is the blocker.** Workflows fire
from the default branch, but `main` carries no `scripts/data-rules.js`, no
`serialize-products.js` and no `data/sources.js` — they exist only here.
`sources-registry` is 18 commits ahead of `main`. **Nothing built above can run
until that lands**, and merging it is not free: a push to `main` fires
`vercel-deploy.yml`, so it publishes the new dashboard and the sources footer at
the same time.

### The reviewer sees the rendered page, without a page being built

> **Superseded 28 Sep** by a Vercel preview of the whole public site, built
> from the proposal's pull request — see `docs/pr-preview-notes.md`. The
> `preview.html` artifact described below is no longer produced.

Asked 22 Sep: could approval happen on `preview.html` rather than on GitHub?
**Approving *on* it: no.** A static page cannot write anything without holding a
credential, which means building it, hosting it, gating it and storing a token —
the whole pile the GitHub-native route deleted, reintroduced so a button can sit
somewhere nicer.

**Looking at it before approving: yes, and it costs nothing.** `intake` now
applies the proposal to its checkout, runs `scripts/make-preview.js`, restores
`data/products.js`, and uploads the result as a workflow artifact linked from
its comment. `preview.html` is a single self-contained file, so this needs no
host: GitHub serves it to people with repository access and to nobody else.

**This closes the one real weakness of the no-page route** — that a reviewer
judging a written sentence could not see it in context. The preview is the
window; GitHub stays the switch.

Verified by running exactly what the workflow runs: the built `preview.html`
contains the proposed wording, and `data/products.js` is byte-clean afterwards.
The commit step adds `data/proposals.js` by name, so a modified products file
cannot ride along — do not change that to `git add -A`.

### Decisions inside the build

**An approval applies the snapshot, never the issue body.** Intake commits the
parsed proposal to `data/proposals.js`; `proposal-decision.yml` reads from
there. This is what closes the hole recorded above — an issue body is editable
by anyone with write access, so applying the live body would hand the reviewer
an amend path through the back door.

**The citation travels with the value.** Applying a proposal overwrites the
stage's `source` and `asOf` with the proposal's own. Deliberate: a figure cites
where its *current* wording came from. It is lossy when the old wording carried
several sources, which is why the reviewer sees the swap in the comment before
approving.

**Self-approval is refused in the workflow, not by GitHub.** GitHub's native
block does not apply because the PR is opened by a workflow, not by the author.
`proposal-decision.yml` compares `sender.login` against `issue.user.login`,
comments, removes the label and exits non-zero.

**A shortened replacement is flagged, not refused.** Found while dry-running the
real fixture: the proposal replaced ASPY's country-registration note wholesale,
silently dropping the verified Tanzania and Nigeria registrations. The form now
says in terms that the field REPLACES the sentence, and `shortfall()` raises a
warning block in the bot's comment when a `note` loses a third or more of its
length. Not an error — sometimes a sentence really is being cut down.

**Found by the self-test, and the code was right:** `serializeProducts(data,
sourceText)` already calls `fileHeader` internally, so prepending
`fileHeader()` as well wrote the assignment line twice and the file no longer
parsed. Per CLAUDE.md, established which side was wrong before changing either
— the caller was.

### Dry run, 22 September

Ran the whole chain by hand, without GitHub: form → proposal (`p-11`,
`pyramax/4/note`, `src: rwanda-fda`) → apply → `validate-data.js`. Result:
**0 errors, 5 warnings**, and a **3-insertion, 2-deletion** diff with house
style untouched. `data/products.js` was reverted afterwards; nothing from the
dry run is committed.

**Verify block, 22 September — all passing:**

```
normalize-resistance.js          byte-identical
normalize-molecular-markers.js   byte-identical
validate-data.js                 0 errors, 5 warnings
validate-data.js (synthetic)     0 errors, 0 warnings
test-serializer.js               0 failures
test-import.js                   127 passed
proposal-lib.js selftest         20 passed
make-preview.js                  wrote preview.html (154 KB)
```

### Still not built

Fetchers still emit prose, not proposals — the six scripts in §4c are unchanged.
The provenance check (every changed value traces to an approved proposal) is not
written. Auto-merge degrades to "the PR waits for a human" until branch
protection and repository auto-merge are switched on, and the workflow says so
in its own comment rather than failing.

### One surface, and one enforced way in

Clarified 22 Sep: **nobody edits the data on a second website, and there is one
source.** The issue form and the web-editor file were candidates for the *same
slot* as `propose.html`, not additional doors — they are closed. `propose.html`
is the only surface a person types into.

**But choosing a surface is not the same as having only one, because the other
doors cannot be deleted.** GitHub's file editor exists whether we use it or not;
a token that can write can write. So the rule gets enforced the way everything
else here does — by making the other routes fail:

> **A required check: every changed value in `data/products.js` must trace back
> to an approved proposal.** The workflow diffs the file against the base,
> resolves each changed path against `data/proposals.js` / `data/decisions.js`,
> and fails on anything with no approval behind it.

A hand-edit has no proposal behind it, so it never merges — whoever made it,
whether person or workflow, whichever screen they used. **This retires the last
thing in the design that was holding by convention**, and it is strictly
stronger than the approver≠proposer check, which it subsumes for anything
arriving outside the desk.

**"Single source" covers two anxieties; both are answered.** One surface, above;
and one file — nothing else in the design is a second copy of the data:

| File | What it is | Second source? |
| --- | --- | --- |
| `data/products.js` | the record | **the only one** |
| `data/proposals.js` | changes nobody has decided on | no — pending diffs with evidence; emptied as each is decided |
| `data/decisions.js` | what was approved or rejected, and why | no — an append-only log, never read for a figure |
| `data/i18n/products.fr.js` | translations | no — derived, keyed to the English and hash-checked against it, which is what stops it becoming a second version of the truth |
| `history/`, the published dataset | snapshots, the public copy | no — generated output, one-way, never read back in |

### One human gate — the approval *is* the merge

Raised immediately after the option above, and it is the right catch: if a
person approves at the desk and *then* a person approves the pull request, the
second one is reading a JSON diff to answer a question about whether a medicine
is registered in Rwanda. **A second human who cannot evaluate the claim adds
delay and no safety** — the only thing they can check is that the file parses,
which `validate-data.js` does better and in two seconds.

**Decision: the merge is a consequence, not a decision.** The desk commits,
opens the pull request on the approver's account, the checks run, and it
auto-merges on green. The PR still exists — audit trail, one-click revert, and
the reason a bad change meets CI before it meets `main` — but it lives about
thirty seconds and nobody watches it.

**The distinction that resolves the tension:** GitHub is the *road*, not the
*office*. Every change travels through a commit, a PR, checks and a merge,
because that is what makes the record trustworthy a year later. None of it
requires an analyst to work there. Having an account is not the same as having
to visit: one sign-in puts a real name on every approval made from our page.

Two consequences:

- **The two-person rule moves into a status check.** A workflow compares the
  approving account against the proposal's `origin` and fails when they match.
  Machine-enforced, and it fires without anyone opening a PR. This replaces the
  convention recorded above.
- **Required review is conditional, and the rule is symmetrical:** turn it on
  exactly when the pull request *is* the review desk. With a desk of ours plus
  auto-merge it would block every merge forever; with the GitHub-native route it
  is the gate itself. Getting it backwards leaves the gate either blocking
  everything or protecting nothing.

**New state to build for: approved but not landed.** If the checks go red after
an approval, the change never reaches the record and yesterday's version stays
live. The desk has to show that — a silently failed approval is worse than a
rejection, because everyone believes it went through.

**Which surface wins, restated.** The page earns its place only for what GitHub
cannot show: current wording beside proposed, the evidence open, and the
rendered page. That matters for the judgement sentences and barely at all for
the mechanical third. So the page is the answer *because the analysts are not
going to work in GitHub* — not because GitHub is insufficient. The GitHub-native
route above stays as the fallback that still works if the page never gets built.

### Two buttons, five reasons — the reason list does the routing

Two outcomes would be too few without it. Reject takes a reason from a fixed
list, and the reason decides what happens next:

- *wrong value*, *evidence missing or weak* → back to its author, who
  re-proposes. The proposal is not closed.
- *not a real change*, *already known*, *superseded* → closed, with a
  fingerprint of (target path + proposed value) written to `data/decisions.js`.
  The next fetch filters against it.

That fingerprint is the "a rejection must be remembered" gap named in §4a.
Without it the same rows return monthly until people stop reading the queue.

### Branch protection — what it is actually load-bearing for

It is the only thing that makes the rest of this design *enforced* rather than
*chosen*. Three jobs, and nothing else can do any of them:

1. **It forces the PR route.** The desk's token needs `contents: write`, and
   token permissions are repository-wide — there is no way to scope one to
   "write files but not `main`". Without protection the desk can push straight
   past its own gate.
2. **It makes the checks binding.** "Merges on green" means nothing unless red
   blocks the merge.
3. **It makes the approver ≠ proposer check real.** A required check blocks; an
   unrequired one is a log entry.

Settings: require a pull request before merging with **0 required approvals**
(auto-merge depends on that — required *review* only in the GitHub-native
variant, per the conditional rule above), required status checks =
`validate-data.js` + the approver≠proposer workflow, block force pushes and
deletion, no bypass for people including the owner. Still GitHub Pro, $4/month,
and only `Keith-paradox` can enable it.

**Found while answering this, and it will bite on day one.** Two workflows push
directly to `main` today — `publish.yml` (`git push`, line 64: history
snapshots, `feed.xml`, ontology rebuilds) and `sourcing.yml` (outputs under
`sourcing/`). They share a concurrency group named `bot-push-main` precisely
because both do. **"Require a pull request before merging" breaks both on their
next run.** Handle it deliberately: a bypass entry for the Actions app only —
bots, never people — or move those outputs off `main`. A bypass list is exactly
where a design like this springs a quiet leak, so it is worth writing down which
entry is in it and why.

### The queue lives on its own branch

`proposals` — unprotected, nothing deploys from it, bots and analysts both
commit to it. A proposal publishes nothing, so making it pass a PR would be
friction for no gain. Only an **approval** opens a PR, and only against `main`,
which is the branch the record and the protection live on.

### The proposal carries Phase 2's citation format

`evidence` is `{ "src": "rwanda-fda", "asOf": "2026-09-21" }`, `src` resolving
against `data/sources.js` — deliberately the shape §5's Phase 2 needs. Requiring
it at authoring time retires the 50 freehand `source:` strings as a side effect
of normal work rather than as a separate 1.5-day job.

Approve-or-reject makes it load-bearing rather than merely tidy: **a reviewer
who cannot edit needs the evidence in front of them, or they are not reviewing,
they are guessing.**

### Which files carry translatable text — measured, 22 Sep

`data/products.js` is not the only one, and two of the others cannot hold a
translation at all.

| File | What needs translating | Size |
| --- | --- | --- |
| `data/products.js` | stage notes, next steps, access/adoption sentences, milestones, changelog, glossary definitions | **219 strings, ~15,500 chars** — four fifths of the job |
| `data/sources.js` | the `plain` one-liner per source, which is what the footer renders. `title`/`org` are proper names; `findings`/`relevance` are stored but not rendered (§2), so nothing to do unless they get published | 23 strings, ~1,900 chars |
| `data/resistance.js` | the metric labels and the aggregation rule printed beside the map | 7 strings, ~560 chars |
| `data/molecular-markers.js` | the same, plus the `derivation` note | 6 strings, ~825 chars |
| `data/world-map.js` | **nothing** — its 94 country names should come from `Intl.DisplayNames`. Same for the 220 and 143 place names in the two WHO files: countries from `Intl`, study sites left as proper nouns | — |
| the pages themselves | headings, buttons, legend, banner, glossary UI, `aria-label`s — **in no data file**, it is markup | unmeasured until extracted |

**This settles the overlay argument on structural grounds, not preference.**
`resistance.js`, `molecular-markers.js` and `world-map.js` are generated, and
the first two must regenerate **byte-identical** per the verify block in
CLAUDE.md. A translated field inside them would be deleted by the next
regeneration, or would fail the check. An overlay is the only structure the repo
permits.

Total ≈ **18,800 characters** of real prose across four files — close enough to
the earlier ~21,000 estimate that the free-tier arithmetic is unchanged. The
page furniture is extra and currently not extractable.

### The fetchers must emit proposals, not prose

Shown by watch issue #5 (trial watch, 14 Sep): the body reads
`NCT07246525 (dhappq) — primary completion: 2029-08-31 → 2029-09-30`. That is a
sentence. Nothing can apply it, no approval attaches to it, and closing the
issue moves no data — today a person reads it and hand-edits the record, which
is the step being removed.

Each collector needs the same addition, written once and shared rather than six
times: `fetch-trials.js`, `fetch-regulatory.js`, `fetch-nafdac.js`,
`fetch-tmda.js`, `fetch-globalfund.js`, `normalize-pqr.js`. All six can propose
mechanically — dates, statuses, registrations, volumes.

**The third bullet of that same issue is the counter-example worth keeping.**
*"NEW NCT07811908 (ganlum) — Platform Study… RECRUITING"* is not a field change:
somebody has to decide whether the trial belongs on the dashboard and write the
sentence describing it. The authoring gap, in one screenshot.

### Translation: an overlay keyed to the English, carrying its hash

English stays the only authored language. Translations live in
`data/i18n/products.fr.js` etc. — same `window.LAUNCH_*` + strict JSON shape as
every other data file — keyed by data path (`pyramax.journey.registration.note`),
**each entry storing a hash of the English it was made from**.

That hash is the accuracy mechanism: when the English changes the hash stops
matching, the entry is stale by construction, the page falls back to English
*visibly marked*, and the string re-enters the queue. Nobody has to remember to
re-translate. A stale translation that looks correct is the failure worth
engineering against; an obviously missing one is not.

**A bad translation is fixed in the glossary, not at the desk.** A bilingual
reviewer who could retype the French would fix the sentence in front of them and
the same wrong term would return next month. Because they cannot, the correction
goes into the glossary, the string is re-drafted, and every future occurrence is
right too — the constraint pushes the fix to the place that makes it stick. For
a genuine one-off, the reviewer authors a translation proposal through
`propose.html` like any other change.

Two consequences worth recording:

- **Translate after English approval, never before.** Otherwise we pay to
  translate sentences that get rejected, and a reviewer could approve French of
  a claim nobody has approved in English.
- **English does not wait for French.** Publish on merge, with marked gaps on
  the other pages for a day or two. Rejected: holding the release until all
  languages are complete — one untranslated sentence then blocks a registration
  update, which is the worse failure.

### Correction: RBM's platform serves three languages, not four

Checked rather than assumed, 22 September 2026:

```
dashboards.endmalaria.org/en  200
dashboards.endmalaria.org/fr  200
dashboards.endmalaria.org/pt  200
dashboards.endmalaria.org/es  404
dashboards.endmalaria.org/ar  404
```

The Spanish buttons on their front pop-up are downloads of the Gap Analysis
**tool file**, not a site locale. **This corrects "four languages" as used
throughout §4a and §4b**, including correction 1 and the cost estimate: the
published dataset needs **en/fr/pt** to cover every page RBM actually has.
Spanish stays worth shipping for Unitaid and Latin America, but it would be a
language we publish ahead of the host platform, with no page there to land on —
a decision to take deliberately, not to inherit from a screenshot.

Volume drops with it: ~21,000 characters × 2 extra languages ≈ **42,000**, not
63,000. DeepL's free tier covers that about twelve times over. The engine
recommendation in §4a is unchanged.

### Build order

**Ask RBM IT about GitHub accounts before anything else** — one email, and it
decides whether steps below are two workflows or two pages.

Then `validate.yml` running on pull requests and branch protection —
steps 5 and 6 of the drawing both claim a check that does not currently
execute, and $4/month is what separates the gate from a convention. Then
`data/proposals.js` + `checkProposals`; then splitting `editor.html` into
`propose.html` and `review.html`; then the desk itself, generalised out of
`scripts/import-lib.js` rather than rewritten — it already renders
creates/updates/skips as `was → now` with tick-to-accept, which is the desk with
one input; then `data/decisions.js` with the reason list and the fingerprint
filter; then item 5's pull-request plumbing; then the glossary and the overlay;
then the public data repository and `/v1/`.

**Files touched by this task:** this document only. No code changed, and the
verify block was not re-run — nothing it checks moved.

## 4d. Handover plan (22 Sep 2026)

Plan, sequenced with owners: <https://claude.ai/artifact/2hhT7Q5f9PYgUnKXZp7BdQ>.
The screen-by-screen walkthrough for non-technical readers:
<https://claude.ai/artifact/2C8NRSUZ2wdqXF7FesRoFv>.

### The repository question is closed

**`Keith-paradox/launch-development` is home.** Decided by the owner, 22 Sep.
Its automation does not run yet and will be fixed; `kochrisdev` is retired.

Two things that must happen before that retirement, or work is lost:

1. **The unread watch reports there are real findings** — including the GanLum
   trial NCT07811908, recruiting, picked up 14 Sep. They should enter the new
   flow as proposals, not be deleted with the repo.
2. **The scheduled fetchers have only ever run there.** They have never run once
   here. Moving them is not a copy — it is the first time they will execute in
   this repository, and that should be treated as new work.

`README.md`, `powerbi/queries.m` and `streamlit-app/README.md` all point at the
old public address. Leave that address alive with a notice rather than deleting
it: it may be cited in documents nobody here can edit.

### Definition of done, and it is not a document

Handover is finished when **RBM staff file a proposal, approve it and see it
published, with nobody from this team touching a keyboard — twice, on two days,
with two different pairs of people.** The failure this catches is the system that
works only while its author is in the room.

### Sequence

| Phase | What | Owner |
| --- | --- | --- |
| 0 | Unblock Actions; buy Pro; branch protection with an Actions-only bypass | Repo owner |
| 1 | One repository: rescue the unread findings, move the fetchers, repoint the URLs, switch the proposal flow on | Dev |
| 2 | **Transfer to an institution-owned org, early** — plus hosting, domain and an institutional card | RBM / Unitaid |
| 3 | Publish the versioned dataset; RBM fetches it server-side; keep publishing our own page from the same data | Dev |
| 4 | Three languages (en/fr/pt), glossary first, overlay with staleness | Dev |
| 5 | Two unassisted rehearsals; name who reads the queue; failure runbook; settle the emblem permissions | RBM + Dev |

**Phase 2 is deliberately early.** The instinct is to transfer ownership as the
final act; that is backwards. Transferring now means months of operating under
the final ownership — finding the secret that lived in the wrong account, the
notification nobody receives — while the people who can fix it are still here.

### The three that decide whether it survives

Off personal accounts; a named person reading the queue monthly; and a rehearsal
where nobody helps. Everything else is recoverable by a competent developer
reading the code. An account nobody can log into is not, and a queue nobody
reads produces a dashboard that is stale while still looking authoritative —
which is worse than one that is visibly broken, because people keep citing it.

## 5. Still to do

### Open questions that need an answer before the next step

| Question | What it affects |
| --- | --- |
| **WHO EML: cite the 2023 list as confirmed, or the current 2025 one?** | The dashboard currently links a superseded edition |
| **Uganda is `public: true` but we draw no data from it.** Keep it listed, or hide until ingested? | The footer claims everything on the page is traceable to a source below; listing one that contributes nothing overstates it |
| **Do `findings` / `relevance` go on the public page?** | Currently stored, not rendered |
| ~~**Which repository is home?**~~ | **Answered 22 Sep: this one.** `Keith-paradox/launch-development`. Its automation is broken and will be fixed; `kochrisdev` is retired once its unread findings are brought across — see §4d |

### Phase 2 — the 50 citations

Point each `source:` string in `data/products.js` at a registry id
(`{ "src": "gf-pqr", "asOf": "2026-08-23" }`), and add a validator rule that
fails when a citation names an id that does not exist. That is what makes every
figure on the page clickable back to where it came from. Roughly 1.5 days, and
it is the reason the registry exists — the footer is only the visible half.

### Fetchers this registry makes room for

| # | Item | Size | Note |
| --- | --- | --- | --- |
| 1 | WHO guideline version watcher | ~1 day | One API call, compare, open an issue. Smallest and highest value |
| 2 | Rwanda FDA fetcher | ~2–3 days | Verified feasible; would turn RWA from an illustrative guess into a verified entry on ASPY's map, and add Rwanda to DHA-PPQ's, which does not carry it at all today |
| 3 | WHOPAR link discovery | ~½ day | Fold into `fetch-regulatory.js` |
| — | Uganda | — | Blocked; manual download or nothing |

None of these run until Actions works in whichever repository is home.

### Not planned

The Frontiers Ghana 2023 study is not on the resistance map. The WHO extract
behind `data/resistance.js` holds no Ghana rows after 2020, so the study fills
a real gap — but that file must regenerate byte-identical from the WHO export,
so adding it needs a documented second input or a separate literature layer.
Decide before promising it.

---

## 6. Alphabetical order (8 Oct 2026)

**Branch:** `sources-alphabetical` (off `main` at `43da963`) · **1 commit** ·
pushed to `origin` with a pull request · CI had not run when this was written.
**Files:** `data/sources.js`, `illustrated-journey-dashboard.html`,
`.github/ISSUE_TEMPLATE/propose-change.yml`, this document.

Every list of sources is now A–Z: the registry file, both lists in the page's
Sources footer (in English, French and Portuguese, and on RBM's copies), and
the Source dropdown on the proposal form.

### Sorted in two places, the file and the page

The 30 entries in `data/sources.js` were moved, block by block and untouched,
into A–Z order. Checked: the same 30 entries, the same 569 lines and the same
`meta`; only the order and the trailing commas moved. The page then sorts each
footer list again, by the name it shows, in the page's own language
(`PAGE_LANG`).

| Rejected | Because |
| --- | --- |
| Sort the file only | `/fr` and `/pt` show translated names. With the English order alone, **23 of 30** entries on `/fr` and **25 of 30** on `/pt` would sit out of place ("Agence européenne des médicaments" is EMA; "directives de l'OMS…" is the WHO guidelines). RBM's copies also render from the published `dashboard.json`, which keeps the old order until it is next published |
| Sort on the page only | The proposal form and `dashboard.json` read the file's order, and the file is what a person edits. A sorted file also makes a missing or duplicate entry easy to spot |
| One merged A–Z list | The footer's two lists (registers and feeds, then key documents) answer different questions; each is sorted on its own |

### The sort key

The name the reader sees: `label`, or `title` where there is no label, compared
with `localeCompare(…, { sensitivity: "base", numeric: true })`.

- **Not by `id`.** Readers never see ids (`pmi` is "US President's Malaria
  Initiative").
- **Not by code point** (plain `sort()`). That is case-sensitive: in English
  "WHO Malaria Threats Map" lands before "WHO malaria guidelines". On `/fr`,
  "directives de l'OMS sur le paludisme" (lower-case d) would drop to the very
  end of the list.

A consequence, accepted because A–Z was the request: the national registers
no longer sit together. Each is filed under its country ("Nigeria: …",
"Zambia: …"), and the WHO entries cluster under W.

### The proposal form's dropdown is regenerated, not just reordered

It was a hand-made copy of 22 sources, and it had drifted:

- **8 sources** added to the registry since 22 Sep were never added to it:
  BMJ Global Health (Rwanda MFT), the two Malaria Journal MFT papers, the WHO
  MFT guide, the WHO national drug policy table, and the DAV, ZAMRA and MCAZ
  registers.
- **"WHO Malaria Threat Maps" could never be cited.** Intake matches the
  chosen label against the registry's `label` or `title`, lower-cased
  (`proposal-lib.js` `norm`), and the registry says "WHO Malaria Threats Map".
  A proposal citing it was refused with "is not in data/sources.js".

It now lists all 30 public sources, A–Z, with "Not in this list" kept last.
Checked: every option resolves to a registry id the way intake does it, the
YAML parses, and the options are unique. `proposal-lib.js selftest`: 58 passed,
0 failed.

To regenerate it after a source is added (run from the repository root):

```bash
node -e '
const fs=require("fs"); global.window={}; require("./data/sources.js");
const c=new Intl.Collator("en",{sensitivity:"base",numeric:true});
const n=window.LAUNCH_SOURCES.sources.filter(s=>s.public).map(s=>s.label||s.title).sort(c.compare);
const F=".github/ISSUE_TEMPLATE/propose-change.yml", y=fs.readFileSync(F,"utf8");
const re=/(      label: Source\n[\s\S]*?      options:\n)((?:        - "[^"\n]*"\n)+)/;
const last=y.match(re)[2].trim().split("\n").pop().trim();
fs.writeFileSync(F,y.replace(re,(_,a)=>a+n.map(x=>"        - \""+x+"\"\n").join("")+"        "+last+"\n"));'
```

### Verified

- Verify block: treatment policy byte-identical; validator 0 errors,
  1 warning (the French Guiana one); synthetic 0 / 0; preview built;
  `test-build-dataset.js` 28 passed, 0 failed; country names cover all 252.
- The page's own `renderSources()` was run against the built English, French
  and Portuguese `data/sources.js`. All six lists (19 registers and feeds, 11
  documents, per language) come out A–Z in that language. Fed the **old** file
  order, the new page code still produces A–Z, so RBM's copies sort before
  their data is republished.
- Headless Chrome, English page: the same 19 + 11 order, and the count badge
  still reads 30. The French and Portuguese pages were not loaded in a
  browser; the check above covers them.
- `i18n/content.en.json`: the same 591 strings before and after, none new and
  none gone. Only 66 position notes (`sources.sources[i]`) moved. It was not
  committed: `translate.yml` regenerates it on `main`, as it does after every
  change, and finds nothing new to translate.

### Left alone, found in passing

- **No drift check for the form exists.** Its header says the list is
  "checked for drift in CI"; nothing does that, which is how it lost 8
  sources. `proposal-lib.js selftest` is the natural home, but it does not run
  in CI either.
- **Several source names are poorly translated.** On `/fr`: "directives de
  l'OMS…" (lower case), "Tanzanie : TMDA inscription" (should be *registre*),
  "Journal du paludisme" for one Malaria Journal paper but not the other. On
  `/pt`: "Tanzânia: TMDA registar" (a verb), "Fronteiras" for the publisher
  Frontiers, "panorama dos medicamentos…" (lower case). Journal and publisher
  names should stay as published. Fixing these is a hand correction in
  `i18n/translations.json`.
- **3 strings have no French or Portuguese** (Ghana/Mozambique/SE Asia
  studies, "P. vivax", the map border legend). They predate this change.

### After merge

1. Wait for `translate.yml` to commit `i18n/content.en.json`.
2. Rebuild the RBM pages (`node scripts/build-rbm-pages.js`) and push them to
   `codebyjackson/launch-rbm-test`: their footer code changed.
