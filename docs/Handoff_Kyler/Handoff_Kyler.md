# Handoff — RBM staging dashboard

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

---

## Start here

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

**The next piece of work is item 5: GitHub read and write.** See §5.

---

## 1. What exists

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

### Blocked on GitHub Pro — $4/month

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

| Question | What it affects | Ask |
|---|---|---|
| Can RBM staff have GitHub accounts? | If not: work-email sign-in with a shared machine account — weaker attribution, more to build | RBM IT |
| Will their site embed our page, or copy the files? | Whether publishing stays automatic after handover | RBM web team |
| Who owns the repo and hosting afterwards? | Where the GitHub App and hosting get created | RBM |
| Is endmalaria.org in-house or contractor-run? | Who we are handing over to | RBM |
| Permission for the Unitaid mark and the WHO emblem | Currently carried on an unconfirmed assumption that explicitly does not transfer to another page or repo | Unitaid |
| Who pays the ~$12/month after handover? | A small recurring cost that lapses when the person who set it up moves on | Unitaid / RBM |

### Unresolved, and only your team can answer

**`https://kochrisdev.github.io/launch-transparency-dashboard/` is live** —
HTTP 200 today. `README.md`, `powerbi/queries.m` and
`streamlit-app/README.md` all point at it. Is it an old copy serving stale
data under a URL people may be citing, or the real public deployment with this
repo as a working copy?

This blocks nothing in the build, but it blocks handover planning: RBM cannot
be handed a project whose documentation points at an account they do not
control.

### One thing to verify at Phase 2

`publish.yml` is path-filtered on `data/products.js` and its append-only guard
fails the run if `meta.lastUpdated` was not bumped. The editor always bumps it,
but confirm the whole loop end to end when the change arrives **by merge**
rather than by direct push — that path has never been exercised.
