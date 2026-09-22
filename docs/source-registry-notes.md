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

## 5. Still to do

### Open questions that need an answer before the next step

| Question | What it affects |
| --- | --- |
| **WHO EML: cite the 2023 list as confirmed, or the current 2025 one?** | The dashboard currently links a superseded edition |
| **Uganda is `public: true` but we draw no data from it.** Keep it listed, or hide until ingested? | The footer claims everything on the page is traceable to a source below; listing one that contributes nothing overstates it |
| **Do `findings` / `relevance` go on the public page?** | Currently stored, not rendered |
| **Which repository is home?** | No fetcher added here will ever run in this one |

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
