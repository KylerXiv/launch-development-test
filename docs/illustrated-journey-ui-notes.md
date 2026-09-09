# Illustrated journey UI — working notes

Companion to [dev-13-resistance-handover.md](dev-13-resistance-handover.md).
That document owns the resistance/access map; this one owns everything else on
`illustrated-journey-dashboard.html` — the draft-data warning, the feedback
widget's framing, the changelog panel, the stage-marker icon set including the
WHO emblem, the "Powered by" attribution, the sources footer and the subscribe
button.

Same shape as the DEV-13 document, same rule: §10 says which kind of change
touches which section, and the update belongs in the same commit as the change
it describes.

**This document was written late — after the work merged, not alongside it.**
That is a breach of the rule in [CLAUDE.md](../CLAUDE.md) and the reason the
rule exists: the reconstruction below came out of a session transcript, and the
rejected alternatives in §3 survived only because that transcript still
existed. Do not treat it as precedent.

---

## 1. Status at a glance

| | |
| --- | --- |
| Branch | `redesigning-illustrative-journey` — merged, now on `main` |
| Shipped in | PR #4 (merged 8 Sep 2026 11:26Z), PR #5 (merged 8 Sep 2026 18:29Z) |
| Commits | `5aa7c19` (PR #4), `ce765c8` (PR #5) |
| Push state | fully merged into `main`; nothing outstanding |
| Validator | `0 errors, 3 warnings` — all three are DEV-13's resistance provenance debt, unchanged by this work |
| CI | **never green.** Every run on `main` since Initial commit is `startup_failure` — see §4 |
| Scope | this page only. Four other editions were deliberately left alone — see §3.6 |

### Files this work owns

| File | What it is |
| --- | --- |
| `illustrated-journey-dashboard.html` | the page; all UI below lives here |
| `assets/journey-icons/icons-solid.js` | filled stage-marker glyphs, **this page only** |
| `assets/who-emblem.svg` | WHO emblem, mark only, permission-gated — see §3.1 |
| `assets/unitaid-mark.svg` | Unitaid bird, extracted from the official lockup |
| `assets/report-issue.js` | shared by nine pages; gained a `COPY` override seam |
| `data/products.js` | changelog entries gained an optional `plain` field |
| `docs/data-analyst-guide.md` | documents that `plain` field |

---

## 2. What the work was

A readability and presentation pass, driven by the brief that a visitor who is
not a malaria-access specialist should be able to read the page. In order of
how much they change what a reader sees:

1. Draft-data notice rewritten and recoloured amber — it read as another
   caption in accent blue.
2. The shared "Report an issue" widget runs as "Send feedback" here.
3. "Recent updates" became "What's changed recently", one plain-English
   sentence per entry.
4. Hover on a stage marker reduced to one line; the click panel keeps the full
   detail.
5. Stage markers redrawn as a filled set, with the WHO emblem on the
   guidelines gate.
6. "Powered by" + the Unitaid mark, top right.
7. Sources footer became a list of named links to each official register.
8. "Subscribe for more information" button — front end only.

---

## 3. Decisions, and why

### 3.1 The WHO emblem is used on permission the project holds, not a licence the repo can assume

WHO's [publishing policy](https://www.who.int/about/policies/publishing/logo)
says, verbatim: *"The use of the WHO emblem as an illustration (for instance,
in a magazine article about the Organization) is **not permitted**, because it
may be interpreted as indicating endorsement."* It also restricts the logo to
*"institutions that have an official collaborating status with WHO"* and
requires *"express written permission."*

A stage-marker icon is an illustrative use — the case the policy names. The
emblem is on the page because the project owner supplied the official asset and
holds the permission question; it is **not** something a future contributor may
assume transfers to another page, another edition, or another repo.

Relevant if that permission is ever tested: Unitaid is a WHO **hosted
partnership** — its secretariat derives legal personality from WHO and its
agreements clear through WHO's Office of the Legal Counsel — which is close to
the collaborating-status wording the policy uses.

**Rejected:** drawing an approximation. A hand-drawn near-copy of a protected
emblem is wrong in the details and still reads as the real thing, which is
worse than not using it.

### 3.2 The emblem is an `<img>`, outside the `currentColor` system

Every glyph in `icons.js` and `icons-solid.js` fills or strokes in
`currentColor`, which is how a delayed gate turns red and a cleared one green.
An official emblem may not be recoloured, so it cannot live in that mechanism.
It is a plain `<img>` with `#009EDB` set on the path.

Status is not lost: the marker's background tint and its corner badge (✓ / › /
!) both still carry it, and the icon set's own header comment already
establishes that colour is never the only signal.

**Known compromise:** `.stage.s-idle` drops the whole marker to 55% opacity, so
a not-started WHO gate shows a dimmed emblem. Uniform transparency is a state
treatment rather than a colour change, and it is what makes "not started"
legible — but if WHO guidance prohibits it, exempt the emblem and let the
dashed ring carry that state alone.

### 3.3 Only the guidelines gate carries the emblem; prequalification is a star-seal

The LAUNCH journey board gives WHO prequalification a **tick in a circle**.
That was built and rejected in place: every marker already carries a tick as
its "complete" status badge, and side by side the two read as one stutter — the
icon stops reading as a subject and starts reading as a second badge. The board
has no status badges, so it never hits this.

Also rejected, both on legibility at the 26px the markers give an icon:

| Candidate | Failed as |
| --- | --- |
| medal on a ribbon | a bullseye |
| scalloped rosette | a gear |
| microscope (for R&D, §3.4) | a gavel |

A star says "certified" without competing with the tick, and the ribbon tail
breaks the circle-inside-a-circle the round marker creates. It also restores
what the outline set was reaching for — its own comment described that gate as
*"a quality seal on a ribbon — a mark awarded, not a security shield."*

Semantically: prequalification is a certification awarded after assessment. A
tick would say "done", which is the badge's job, not the icon's.

### 3.4 Filled glyphs, subjects borrowed from the LAUNCH journey board

A filled emblem sitting among 1.7px outline glyphs read as two systems bolted
together; that was most of what made the row look unfinished. Filling the set
makes the emblem a peer.

Subjects map to the board step for step: flask (3–5 discovery/trials),
institution (8, submission to an SRA), stamp (12, country regulatory
approval), assembled people (13, national policy decision), cart (16), lorry
(17).

**Not adopted: the board's phase colours.** It codes the journey purple → navy
→ green by phase, but colour on this page already means gate status. Two colour
systems on one marker and neither survives. If the phase structure is wanted,
the honest place is three labelled bands over the pathway strip, with status
colour left alone on the markers.

### 3.5 The year-gap chips lost to `stageTimeline()`

Both this branch and `main` independently shipped a way to show years between
gates. This branch drew a chip on each connector (`gapChip`, `.stage .tgap`);
`main` replaced it with `stageTimeline()` — a real axis under each pathway with
a *today* marker, whose line dips back where a gate was reached out of order.

`main`'s version won in the merge (`3bfe178`) and the chips are gone. It is the
better presentation: it plots actual years rather than deltas, and it shows the
out-of-order case as a visible dip instead of a negative number needing a
tooltip. `stageYear()` and the year printed under each stage label are shared
by both and stayed.

The chips are recoverable from `ce765c8^`. They should not be restored
alongside the timeline — the two say the same thing twice on one row.

**Worth keeping from the chip work**, because the timeline inherits it: only
`done` stages count toward a gap. A stage in progress carries a *target* date
("Phase III targeted completion 2025–26"), and drawing a target as elapsed time
invents history. This is why GanLum and ALAQ show almost no timeline — the
honest picture for pre-launch products.

Also inherited: the pathway is an order of gates, **not a chronology**. ASPY was
prequalified in 2012 but only got the strong guideline recommendation in 2022,
so that gap runs backwards; DHA–PPQ was in guidelines in 2010, a year before
EMA approval. Any future presentation must handle negative gaps as a fact about
sequence, never as a delay.

### 3.6 Page-local, not shared — twice

`assets/journey-icons/icons.js` is loaded by `index.html`, the Unitaid and
synthetic editions, and `preview.html`. None of them asked for solid glyphs or
the WHO emblem, and the emblem in particular carries the permission question in
§3.1. So `icons-solid.js` is a separate file loaded only by this page, falling
back to the shared outline set if it fails to load.

Same reasoning for the feedback widget, from the other direction:
`assets/report-issue.js` is shared by **nine** pages. Rather than fork it, it
grew a `COPY` block of every visible string, overridable per page by setting
`window.LAUNCH_FEEDBACK_COPY` before the script tag. This page uses it to run
the same widget as "Send feedback". Other pages are untouched and still say
"Report an issue".

### 3.7 The changelog gained `plain` rather than being rewritten

Changelog entries are written for the team and carry register codes, source
names and figures — `feed.xml` and the other editions publish them. Rewriting
them in plain English would have destroyed the record.

So `data/products.js` entries gained an optional `plain` field: the same change
retold for a general visitor. This page renders `plain || change`; everything
else still renders `change`, and `feed.xml` regenerates byte-identical.
Documented in `docs/data-analyst-guide.md`.

**The 20 `plain` strings are paraphrases and have not been reviewed by the data
team.** They are faithful to what each entry says, but they are the version a
visitor actually reads. Worth a pass.

### 3.8 Hover is one line; the click panel is the detail

The hover tooltip was showing the full note, Date, Next step, Expected and
Verified — essentially the click panel, rendered over the top of it. It now
shows the stage name, one line, and "Click for the full detail".

Two details the data forced:

- **Stage `date` is prose, not a date** — `"2015–2023; requal. 20 Jan 2025"`,
  `"Announced 12 Nov 2025; trial completed 25 Nov 2025"`. The peek takes the
  first clause only; the trailing clause is a second fact, which is what the
  panel is for. Showing them whole produced three-line tooltips.
- **`expected TBC` is noise.** An unknown date reads better as no date.

The marker's `aria-label` was reciting the full note and now matches the visible
peek. Both routes reach the same panel on click, so parity is right.

`data-note`, `data-next` and `data-asof` were dropped from the markers — the
old tooltip was their only reader (the panel builds from the data object), so
they were duplicating every note into the DOM 32 times.

### 3.9 The sources footer links real registers, and PMI is deliberately unlinked

The footer was a dot-separated run-on of unlinked fragments. Each source is now
a named link to its official register, with one plain sentence on what it is
used for. URLs were taken from the repo's own fetcher scripts and
`docs/data-sourcing-plan.md`, not from memory, and each was checked to resolve:
WHO guidelines, WHO PQ (+ the separate vector-control list), EMA, NAFDAC Green
Book, TMDA, Global Fund PQR, ClinicalTrials.gov — all 200.

`unitaid.org` and `endmalaria.org` return 403 to curl and headless Chrome. That
is Cloudflare bot protection, not a dead site; they could not be
machine-confirmed and are worth a manual click.

**PMI stays unlinked, with a note that its portal closed in 2025.**
`docs/data-sourcing-plan.md` records pmi.gov as unreachable post-USAID
dissolution, and it timed out when tested. Linking it would send readers to a
dead site; deleting it would quietly drop a source the page had been claiming.
Manufacturer communications is likewise unlinked — no public register exists.

Also corrected: "hosted on RBM dashboards" → "to be hosted by the RBM
Partnership to End Malaria". The present tense claimed a hosting arrangement
that has not happened.

### 3.10 Subscribe says what actually happens

The button exists; the backend does not. It was built this way on the explicit
understanding that the backend is not needed yet.

A button that does nothing on click reads as broken rather than unfinished, so
it opens a panel with an email field, validates the address, and then says:
*"Noted, but not sent: email alerts are not switched on yet. Nothing left your
browser."* A standing note says the same before anyone types.

The one thing this page cannot do is claim "you are subscribed" with no list to
join. One seam, `subscribeEmail()`, mirrors the pattern `report-issue.js`
already uses; addresses are held in `window.LAUNCH_SUBSCRIBERS` in memory only.

### 3.11 The draft warning is amber, and leads with the caveat

It was `--accent-soft` blue — the same treatment as every other note on the
page, for the most important sentence on it. Now amber with a heavy left rule,
and the caveat comes before any detail: *"⚠ Draft figures — not yet verified.
Please do not quote them."*

The same wording was carried into the header meta (`Draft — figures not yet
verified`, replacing `· draft data`) and the map overlay
(`DRAFT, NOT YET VERIFIED —`), so the page says one thing in three places
rather than three things.

---

## 4. Newly discovered, deferred, or left alone

- **CI has never passed on `main`.** Every run since Initial commit is
  `startup_failure` with 0 jobs and no logs — a workflow-config or
  Actions-enablement problem, not a test failure. All four workflows show
  `active`. **Predates this work and is unrelated to it**, but it means no push
  to `main` has ever been checked by CI. Needs the Actions web UI to diagnose.
  Own ticket.
- **The 20 `plain` changelog strings need a data-team read** — §3.7.
- **Two cosmetic issues on `main`'s timeline**, seen while reviewing and not
  touched because they are DEV-13's: the legend swatch reading *"Gate's real
  year — see the timeline below each pathway"* is a green dot with no year on
  it and does not visually match anything in the timeline; and every stage
  marker now carries a small `▾` caret that reads as a dropdown rather than
  "click to expand".
- **Phase bands over the pathway strip** — the part of the LAUNCH board not
  adopted (§3.4). Offered, not built.
- **Per-stage source links in the click panel** — raised as the
  permission-free way to strengthen the WHO gates before the emblem was
  supplied. Still a reasonable improvement.
- **The Unitaid mark's white plate** is a design decision, not brand guidance:
  the mark's dark navy wing disappears against the dark theme's near-black
  ground. If Unitaid supplies guidance that contradicts it, the plate is one
  CSS rule.

---

## 5. Environment gotchas hit here

- **`.xlsx` cannot be read on this machine** — no `openpyxl`, no `pandas`, no
  `in2csv`/`xlsx2csv`/`ssconvert`. This is the real reason
  `sourcing/README.md` calls the CSV export "the reproducible input", and it
  applies to the molecular-markers files when they arrive.
- **Headless Chrome is the only renderer available** and it enforces a ~500px
  minimum viewport, so a 420px screenshot is clipped output, not page overflow.
  Worth knowing before chasing a phantom responsive bug.
- **`sips --cropOffset` is measured from the image centre**, not the top-left.
- Icons must be judged rendered, at 22–29px, not read as path data. Three of
  the six glyphs in this set were redrawn only after being looked at.

---

## 6. Keeping this document current

| A change to… | Updates… |
| --- | --- |
| the WHO emblem, its placement or its permission basis | §3.1, §3.2, §1 files table |
| any stage-marker glyph | §3.3 / §3.4, plus the rejected-candidate table |
| the year/timeline presentation | §3.5 |
| the feedback widget's copy seam | §3.6 |
| changelog `plain` fields | §3.7 and `docs/data-analyst-guide.md` |
| the hover peek or the click panel | §3.8 |
| the sources footer or any source URL | §3.9 |
| wiring a subscribe backend | §3.10 — replace the seam, note the provider |
| the draft/dataStatus banner | §3.11 |
| anything found and not fixed | §4 |

If a task changes nothing a reader here would care about, say so in the commit
message rather than skipping this file silently.
