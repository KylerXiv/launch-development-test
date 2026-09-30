# Illustrated journey UI — working notes

This document owns the non-map furniture of
`illustrated-journey-dashboard.html` — the draft-data warning, the feedback
widget's framing, the changelog panel, the stage-marker icon set including the
WHO emblem, the "Powered by" attribution, the sources footer and the subscribe
button.

Same rule as [CLAUDE.md](../CLAUDE.md) states: §10 says which kind of change
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
| Branch | `redesigning-illustrative-journey` — everything through `b6c1b72` is merged; the fork rework (§3.13) is one further commit on the branch, this one |
| Shipped in | PR #4 (merged 8 Sep 2026 11:26Z), PR #5 (merged 8 Sep 2026 18:29Z). The fork rework is **not** shipped |
| Commits | `5aa7c19` (PR #4), `ce765c8` (PR #5), then `09c609f`, `dc50fc4`, `47a905b`, `b6c1b72` on the branch, plus this one |
| Push state | `origin/main` and `origin/redesigning-illustrative-journey` both contain `b6c1b72`; local `main` is 4 behind and stale. The fork rework is local only, unpushed |
| Validator | `0 errors, 5 warnings` — the documented 3 + 2 split (resistance, molecular markers), unchanged by this work. Both normalizers byte-identical; `products.synthetic.js` 0/0; `make-preview.js` clean |
| CI | **never green.** Every run on `main` since Initial commit is `startup_failure` — see §4 |
| Scope | this page only. For §3.13 that is not a choice: the elbow CSS existed nowhere else — `index.html`, `widget.html` and `preview.html` stack the pair with no fork at all. Four other editions were deliberately left alone — see §3.6 |

### Files this work owns

| File | What it is |
| --- | --- |
| `illustrated-journey-dashboard.html` | the page; all UI below lives here |
| `assets/journey-icons/icons-solid.js` | filled stage-marker glyphs, **this page only** |
| `assets/who-emblem.svg` | WHO emblem, mark only, permission-gated — see §3.1 |
| `assets/unitaid-logo.svg` | full Unitaid logo (bird + wordmark), copy of `unitaid/assets/unitaid-logo.svg`; replaced the bird-only `unitaid-mark.svg` (sheet row 11) |
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
6. "Powered by" + the full Unitaid logo, top right.
7. Sources footer became a list of named links to each official register.
8. "Subscribe for more information" button — front end only.
9. The summary strip became an explicit **portfolio** summary and dropped
   "bottleneck" for "access barrier" (client feedback, 10 Sep 2026 — §3.12).

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

**WHO Malaria Threat Maps** was added on 10 Sep 2026 — it backs both resistance
layers on the map yet was missing from the list, so two of the page's own
datasets were unattributed in the one place a reader goes to check them. URL
taken from `SOURCE_URL` in both normalizers (they agree) rather than retyped;
verified 200. Placed with the other two WHO entries so the three read as one
source family.

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

**Addendum, 10 Sep 2026 — the explanatory sentence below the caveat was cut,
by request.** The banner's `BANNERS.draft` string used to continue past the
bold lead line with "Everything on this page was gathered from public
sources... we never fill a gap with an estimate" — three sentences of *why*
the data is unverified and what `TBC` means. Removed outright rather than
trimmed; the bold line alone now is the whole banner. `.tbc` (the span class
that bolded "TBC" inside that prose) is unused after this but left defined —
nothing else references it, and it costs nothing to leave. The `.bl` line's
`margin-bottom: 3px` is likewise now inert (nothing follows it inside the
banner) rather than removed, since it does no harm and reverting this is a
one-line change if the explanation comes back.

---

### 3.12 "Access barrier", and why "barriers overcome" is absent rather than zero

Client feedback, 10 Sep 2026: use *access barriers* not *bottlenecks* "as the
overall endeavour is about accelerating access"; add a positive counterpart
("X access barriers overcome" / "Y current access barriers"); drop
"2 expected to market ≤ 3 yrs"; and treat the strip as a portfolio summary.

**The strip now reads:** `4 medicines tracked · 10 of 32 access gates cleared ·
2 current access barriers`.

**Two mislabels were found while implementing, and both are fixed.** Neither
was a rendering bug — the labels described something the code did not compute:

| Label | Actually computed | Now |
| --- | --- | --- |
| "active bottlenecks" | `products` with ≥1 `late` stage | `late` **stages** — the barriers themselves |
| "expected to market ≤ 3 yrs" | `products` with `class === "pipeline"` | removed |

The barrier count reads 2 either way today, but only because each affected
product happens to be blocked at exactly one gate (ASPY — National policy
adoption; DHA–PPQ — Procurement). It would have diverged the first time one
product was blocked at two. The second was the client's own objection —
`class === "pipeline"` is a portfolio *class*, not a market-entry forecast, so
the number never meant what the label claimed. Its calculation is gone;
`p.class` is still read for the row chip and the map empty state.

**"Access barriers overcome" is deliberately not shown.** It is a stronger
claim than "gates cleared": a gate that *was* `late` and has since been
cleared. The data cannot support it, and this was checked rather than assumed:

- A stage object carries only `status, note, date, next, nextDate, source,
  asOf` — its current state, with no memory of having been a barrier.
- Diffing all three `history/` snapshots (15, 23, 25 Aug 2026) against the live
  file finds **zero** `late` → cleared transitions.

So the honest value today is **0**, which would read as "nothing has been
achieved" — an artefact of the record, not of the programme, and the opposite
of the positive framing asked for. A TODO in the page states the two ways to
make it real: persist a per-stage marker (`wasDelayed` / `barrierClearedOn`)
when an analyst moves a stage off `late`, or have `scripts/make-brief.js` —
which already diffs stage status against `history/` — write those transitions
back into `data/products.js`.

**What is shown instead** is gates cleared (`done` stages) over every gate the
portfolio must clear: 10 of 32 (4 products × 8 gates). Real, positive,
aggregate, and it does not borrow the word "barrier" for something the legend
defines as `late`. The denominator is in the label so the figure cannot read as
a bare score. **This is a substitution, not the requested metric — worth
confirming with the client.**

**Timeline left alone, deliberately.** Forward-looking data exists
(`stage.next`, `stage.nextDate`) and is already surfaced in three places: the
hover peek, the gate panel's "Next step"/"Expected" rows, and the CSV export.
It is *not* plotted on the timeline axis and was not added, because the values
are `TBC`, `~2027` and `Q4 2026` — plotting `~2027` as a point asserts a
precision the data explicitly disclaims, and `stageYear()` only parses `done`
stages by design (§3.5: a target must never be drawn as elapsed time). With the
portfolio KPI gone, this information is no longer duplicated anywhere.

**Merged with `fix/sep9-feedback-parallel` (10 Sep 2026).** That branch answers
a *different* review — it renames stage 2 to "WHO recommendation" and stage 3
to "WHO PQ listing", groups the two WHO gates as parallel ("no fixed order"),
and parks the `emanators` placeholder to `docs/parked/emanators.json`. The two
efforts overlapped in exactly two lines: both sides reworded the same `flag`
sentences, theirs adding the qualifier *current*, mine replacing *bottleneck*
with *access barrier*. Resolved by taking both — "Adoption / Procurement is the
**current access barrier** — …" — which also matches the strip's "current
access barriers". `illustrated-journey-dashboard.html` auto-merged with no
conflict; `feed.xml` and the ontology exports were regenerated rather than
hand-merged, since they derive from `data/products.js`. Changelog arithmetic
after the merge: their 20 (main's 22 less the two parked emanators entries)
plus this branch's 1 = 21.

**The two `flag` sentences in `data/products.js` were reworded too**
("Adoption/Procurement is the **access barrier** — …"), with a changelog entry,
because they render on this dashboard as `.flagnote` and `.gp-why` and leaving
them would have left "bottleneck" visible on the page the client was reading.
Wording only — no status, date or figure touched. **Ripple worth knowing:**
that prose renders on 15 other pages, whose own chrome still says "bottleneck"
(see §4).

### 3.13 The parallel-gate fork is one SVG path per side, not four border corners

The report was *"I do not like that the fork look not connected"*, on a
screenshot of the WHO column. It was not a matter of taste. Two things were
measurably wrong, both readable straight off the CSS that drew it:

- **Every corner stepped 1.5px.** `.stage .bar` is `height: 3px` centred on the
  marker centreline, so it occupied centre −1.5 → +1.5. Each elbow was a
  9 × 28.5px box whose *top edge* sat on that same centreline with
  `border-top-width: 3px` — a stroke running centre → centre +1.5. Four elbows,
  four 1.5px steps; and because the lower branch used `border-bottom` the two
  branches stepped opposite ways, so the bracket was 1.5px fat on its inside
  edge and 1.5px thin on its outside.
- **Nothing overlapped where the line split.** The previous column's
  `.bar.post` ended at the group's left edge, x = 0. The spine was a
  `border-left` occupying x = 0 → 3. They shared exactly one edge, never
  overlapped, and nothing was drawn at the point itself. A butt joint at a T is
  what was being looked at.

Now each side is a single path emitted into a `.forkline` overlay by
`drawStageForks()` — arm, rounded corner (r = 10 on the stroke centreline),
spine, corner, arm — plus a 4.5px node where the neighbouring bar lands. A
whole path cannot be misaligned with itself, and the spine's centreline sits
*on* x = 0 rather than beside it, so the arriving bar overlaps it by half a
stroke. `overflow: visible` on the SVG is load-bearing for exactly that: half
of each stroke and most of each node is outside the viewBox by design.

**Chosen from four options, drawn first.** A comparison artifact (10 Sep 2026)
rendered the whole eight-gate stepper four ways at production scale, each with
its junction at 3×, before any code changed:

| | Option | What it reads as | Outcome |
| --- | --- | --- | --- |
| **A** | **node split** — the same bracket, one path per side, node on the junction | the shape already signed off, with the joins fixed | **chosen** |
| B | **switch** — two eased curves diverging from one point on the trunk | the only option where the split is *drawn* rather than implied | not chosen. Kept as the answer if the silhouette comes back — see below |
| C | **through-line** — unbroken trunk, both gates on one attachment point | strongest connection read available; states "no order" structurally, since both gates attach at the same point | rejected on cost: needs 40px between markers instead of 15 (**+24px on every product row**) and the caption cannot stay on the spine — below the column it drifts toward the lower gate, the exact asymmetry the pair exists to avoid |
| D | **parallel lane** — a tinted lane holding both gates, carrying the caption | most explicit that the pair is one *place* on the pathway | rejected: another filled surface inside a card inside a row, and the lane edge competes with the marker rings 8px from it |

**What A deliberately does not fix.** The silhouette. The bracket is still a
57 × ~106px rounded box open only at its two mid-edges, and the third finding
in the diagnosis — that the eye resolves that as an enclosure the line arrives
at, rather than a path dividing — is untouched. If "not connected" comes back
after this, that is what is left, and B is the answer to it.

**Rejected: a 16px caption band.** `--sg-note` stayed at 15. The idea was that
an even band puts both marker centrelines on a half pixel, so a 3px stroke
lands on whole-pixel boundaries. It does not work here: the group's own origin
is a fractional page position (flex columns divide `min-width: 700px` by seven)
and `--sg-lift` is applied as a two-decimal padding, so no arithmetic inside
the band can put a stroke on the device grid. **Snapping the measured
coordinates was rejected for a worse reason** — it would move the spine's
midpoint up to half a pixel off the centreline `--sg-lift` puts the
neighbouring bars on, reintroducing a jog at the one junction the change exists
to close. Both `alignStageForks()` and `drawStageForks()` therefore round
nothing.

**Two consequences worth knowing.** The bars inside the group are now invisible
layout spacers (`.stagegroup .stage .bar { visibility: hidden }`) — `flex: 1`
either side is still what centres the marker in its row, but painting them
would put a second stroke back where the overlay's arm already is, which is the
defect. And `--sg-mark`, `--sg-arm` and `--sg-r` are gone: the old comment
required `--sg-mark` to be kept equal to `.stage .smark`'s height or the elbows
would drift, and measuring off the markers removes that coupling entirely.

#### The legend strip's pair sat off every other icon's line, same session

First reported as *"the timeline is not in the middle and only pointing to WHO
Recommendation"* — the strip (`.pathway`) has arrows between columns rather
than connecting bars, and `.patharrow` carries one fixed `margin-top: 15px`,
tuned to a single gate's icon centre. Beside the stacked pair that offset
lands on the **top** icon, so both arrows pointed at WHO recommendation alone.

The first fix moved just the two arrows onto the pair's midpoint. The
follow-up — *"make the whole thing aligned"* — asked for the actual cause
instead: `.pathgroup` has `align-self: stretch` so its bracket spans the row's
full height (matching the fork below it), but stretch only sizes the box, it
does not centre the two-icon-plus-caption block inside that box. The block
sits low in it, so the pair itself was off the row's shared centreline — the
arrows had only been symptomatic.

`alignPathGroup()` now measures that gap directly: the pair's own two-icon
midpoint against one ordinary `.pathnode`'s pill centre, both read from the
strip's untransformed position (reset first, same trick `alignStageForks()`
uses for `--sg-lift`). The difference is published as `--pg-lift`, and
`.pathgroup` is shifted onto that line with `transform: translateY()` — a
transform and not a margin, because `.pathgroup` is stretch-sized: a negative
margin-top on a stretched flex item grows its used height by the margin's own
magnitude (the stretch formula solves for height from the line's cross size
*minus* the item's margins), which would have made the bracket taller than the
row instead of just moving it. A transform runs after layout and touches
neither the stretch calculation nor any sibling's size. `.pathway`'s
padding-top carries the same `--pg-lift` so the strip has room above the
shifted bracket — the same role `.track`'s padding-top plays for `--sg-lift`,
for the same reason (`overflow-x: auto` forces `overflow-y` to a used value of
`auto` too, so anything shifted above the padding box would be clipped rather
than simply invisible).

With the pair itself back on the shared line, the arrows needed no change —
their original fixed 15px was always tuned to that same line, and once the
pair sits on it too they land there automatically. The `pa-pair` marker and
`alignPathArrows()` from the first pass were removed rather than layered on.

Verified against the strip's real box model: single-icon centre at 36px from
the strip's own top, the pair's unlifted midpoint at 70.96px, `--pg-lift`
computed at 34.96px, and the pair's midpoint after the transform landing at
36.00px — exact. `alignStageForks()`, `drawStageForks()` and
`alignPathGroup()` are wrapped in `layoutJourney()` (renamed from
`layoutStageForks()`, since it now also lays out the legend strip) and always
run as one pass, on load, on resize and on `fonts.ready`.

The strip's bracket itself was left as CSS borders. It has the same silhouette
question as the stepper's, and none of the join defects — there is no arriving
bar to butt against, only an arrow that stops short of it.

---

### 3.14 Contrast and type size in the detail and gate panels (sheet rows 15 + 17, 30 Sep 2026)

Reviewer: the Detail section's light-grey background and grey text were hard to
read, and the medication sections' type was small and pale.

Measured rather than eyeballed: `--ink-3` (#7C8E99) was **3.15:1** on the panel's
`--surface-2` (#F4F7F8) and 3.39:1 on white; AA body text needs 4.5:1. Changed:

- `--ink-3` -> #566A77 (5.24:1 on surface-2) and `--ink-2` -> #3F5564 (7.24:1).
  Both moved, not just ink-3, because #4E6371 and a darkened ink-3 would have
  been near-identical and the three-step hierarchy would have collapsed. This is
  page-wide (41 uses of ink-3), which was the intent: the same pale grey was the
  problem everywhere, and fixing it only inside `.detail` left it low-contrast
  in the changelog, footer and timeline labels.
- Rejected: only recolouring `.detail`'s background to white. Cards inside it are
  already white, so the panel would lose its visible edge, and the text colour
  was the larger half of the problem.
- `.gatepanel` (the drill-down the sheet calls the Detail section) is now white
  with a `--ink-3` border instead of `--surface-2`/`--line`; body text moved from
  ink-2 to ink.
- Sizes: card body/list/kv 13.5 -> 15px, card sub 12.5 -> 14, table 13 -> 14.5,
  headings/labels and provenance 10.5-11.5 -> 12-12.5, gate note 13.5 -> 15.
- Not changed: timeline SVG text (9.5-11px, set in user units inside the SVG)
  picks up the darker colours but not larger sizes. Vertical spacing is sheet
  rows 18 + 20, a separate change.

### 3.15 The Unitaid badge is flat: no plate, shadow, border or hover (row 11 follow-up, 30 Sep 2026)

Requested by Keith after the full logo landed: the badge should blend into the
page. Removed the white plate, the two-layer shadow, the hover lift and the
transition. The earlier comment said the white plate was deliberate, to give the
logo's dark navy a fixed backdrop "independent of this page's theme tokens" -
that reasoning only matters if the page background can change. It is light-only
(`--ground` #FFFFFF, `color-scheme: light`), so the logo's navy already has the
backdrop it needs. **If a dark theme is ever added, this badge needs a plate
again.** Kept deliberately: the `:focus-visible` outline, since removing it would
make the link invisible to keyboard users; that is focus, not hover.

### 3.16 The header is three rows: identity, description, status + actions (30 Sep 2026)

Requested by Keith as part of the compact-layout work (sheet rows 18 + 20). The
old header was a brand column on the left and a `.meta` column on the right that
stacked the logo, the date and both buttons, leaving the middle empty.

- Row 1: title + Prototype pill (left), "Powered by" Unitaid logo (right).
- Row 2: description, full width.
- Row 3: "Last updated ... Draft" (left), Download CSV + Subscribe (right).
- Header is about 150px tall against about 210px before; the draft banner under
  it was slimmed (padding 12/16 -> 7/14, lead text 14 -> 13.5px, margins
  18/20 -> 14/18) and keeps its amber colour and "do not quote" wording.
- Description cap is `160ch`, chosen after 120ch looked short on a 1400px
  screen (two lines with a quarter of the row empty). The text is about 190
  characters, so it is one line from roughly 1330px and two lines below that. The
  cap exists so a 1900px+ screen does not get one 200-character line.
- Phone keeps the same order: title wraps at 20px with the logo (72px) top-right,
  pill drops under the title, "Powered by" text is hidden (too small to help),
  date on its own line, then the two buttons share a row at equal width.
  Rejected: stacking everything into one column, which was the first suggestion;
  Keith preferred the same structure on phones.
- Removed: the `.brand` and `.meta` wrappers and the 1180px rule that
  left-aligned them. The Subscribe dropdown used to flip to the left edge at 1180;
  the actions now stay right-aligned at every width above the phone breakpoint, so
  that flip went too. On phones the dropdown spans the button row as before.
- The ids (`#updated`, `#dl-csv`, `#sub-open`, `#subwrap`) are
  unchanged, so no script edits were needed.
- Follow-up, same day: the row now shows **only** "Last updated <date>". The
  ` · Draft - figures not yet verified` suffix (and the `live` / other-status
  variants of it) and its `#meta-note` span were removed at Keith's request. The
  caveat is not lost - it stays in the amber banner and the Prototype pill - but
  note the suffix was the only place the page said `live` data was "confirmed by
  manufacturers for public release"; if the dataset ever goes `live`, that line
  is gone and nothing replaces it. The other pages keep `#meta-note`.
- Follow-up, same day: at about 1800px the 160ch cap left "them." alone on a
  second line. Fixed with `text-wrap: balance` and a 120ch cap, and the
  "Illustrated journey view -" lead-in was dropped at Keith's request, so the copy
  now starts "Tracking new antimalarial medicines ...". Rejected: a bold
  accent-coloured lead-in (Keith chose to remove it), a tinted callout strip
  (about 20px taller and competes with the amber banner), and rewording the copy
  to fit one line (an editorial change, not asked for). `text-wrap: balance`
  is ignored by browsers older than Chrome 114 / Safari 17.5 / Firefox 121, which
  fall back to ordinary wrapping, so the orphan can still appear there.
  Balancing alone put the em dash at the start of line 2, so it is bound to the
  preceding word with a non-breaking space.
- Follow-up, same day: the buttons moved from their own third row to the right
  of the description, bottom-aligned with the "Last updated" line that now sits
  under the description. The header is two rows, not three (about 20-30px
  shorter again). Reason: the balanced description is only about 650px wide, so
  the right of that row was empty while the buttons cost a whole row. Rejected:
  buttons under the logo (brings back the tall right column), beside the logo
  (crowded), and moving Download CSV next to the data it exports (sensible, but
  relocates a control people already know; left as a possible later step).
  `.hd-text` has a 500px flex-basis: below about 860px of content width the
  buttons wrap under the text and right-align, instead of squeezing the
  description into four short lines. On phones the buttons sit under the date at
  equal width, as before; `margin-left:auto` is reset there because it cancels
  the stretch.
- Checked in headless Chrome at 1400, 820 and 390px; not checked with the
  Subscribe dropdown open, and not on a real phone.

### 3.17 Compact page, alphabetical medicines (sheet rows 18 + 20, 30 Sep 2026)

Complaint: too much scrolling, too much empty space. Measured in a 1400px
headless screenshot, the distance from the top of the page to the start of the
map section went from about **2,600px to about 1,980px** (roughly 600px, 24%).

What moved, and why each number:

- **Pathway strip** was about 290px tall, now about 190px. The cause was a
  centring script (`centerPathwayCard`) that set the top padding to
  `G + 2*lift`, where `lift` is how far the stacked WHO pair is raised to line
  its icons up with the other gates. A `transform` moves paint, not layout, so the
  bracket ended up with a gap of `G + lift` (about 50px) above *and* below it.
  Now padding-top is `G + lift` and the bracket gets `margin-bottom: -lift`, so
  both gaps are really `G`, which was also lowered from 14 to 8px. Rejected:
  drawing the WHO pair side by side to flatten the strip - that is the
  parallel-gates editorial question, deferred in the reviewer notes.
- **Medicine cards:** row padding 26 -> 8px, board gap 14 -> 10, timeline margin
  16 -> 6 and padding 13 -> 8, "View details" margin 9 -> 6, barrier-note top
  margin 10 -> 0. Legend strip and pathway margins 22 -> 10. Page padding
  28/56 -> 16/32, draft banner margins 14/18 -> 10/12, viz/updates/footer
  margins 22/30 -> 14/18.
- **Timeline SVG** height is now computed from the labels actually drawn
  (`nameLines * 13 + 5` below the tier's top) instead of a flat 40px per tier plus
  8, and `labelTop0` 76 -> 66. Checked that the three-line ASPY and DHA-PPQ labels
  still clear each other.
- **The timeline key** ("actual milestone" / "reached out of order") was repeated
  under all four timelines (about 30px each). It is now two more entries in the
  legend strip at the top, shown once.
- **Vertical scrollbars on every stage rail** (the small up/down arrows at the
  right of each card) came from `overflow-x:auto` forcing `overflow-y:auto`
  while the fork's labels overflow the box by a few px. `.trackbox` is now
  `overflow-y:hidden` with 4px of bottom padding so descenders are not clipped. A
  scrollbar inside each card was itself a source of the "too much scrolling"
  complaint.
- **Order:** `tracked` is sorted alphabetically by display name, case-insensitive
  (ALAQ, ASPY, DHA-PPQ, GanLum). Everything built from it follows: the board, the
  gate drill-down rows, the map's drug tabs and the CSV. Rejected: reordering
  `data/products.js` itself - other pages read it in file order, and only this
  page was asked to change. Side effect: the map's default product is the first
  alphabetical one that has a country survey, which may differ from before.

Left alone: the **map** keeps its 960:480 aspect ratio - that is the fitted
lon/lat window, and a shorter box would crop the world, so it is the largest
block still on the page. The two side rails beside it are capped at 480px. The
pathway strip's stacked WHO pair is still the tallest thing in that strip.
Checked at 1400px and 390px; not at tablet width, and the map could not be
rendered headless here so its spacing is unchecked.

### 3.18 The medicine cards became a journey table (30 Sep 2026)

Reviewer complaint was scrolling. Keith reviewed a published mock-up
(summary table + time-scaled journey + original rail) before any of this was
built, and chose the options recorded here.

Structure, per medicine:
- **Summary row** (A-Z): chevron, name + INN, a mini journey (one dot per gate,
  the WHO pair stacked), current stage, status, years on the pathway, and a
  "Main barrier" phrase. With all rows closed the table is about 300px, against
  about 1,600px for four full cards.
- **Level 1 (chevron):** the **time-scaled journey** by default. Dated gates
  hang from their real year on one axis that starts at the first milestone (no
  empty years), the current gate sits at today with a bar back to the year it
  has been waiting since, and gates with no year are listed on the right
  (reached but undated / ongoing / not started) instead of being given an
  invented date. A quiet text link, "Switch to pathway order", swaps in the
  **original rail**, unchanged (forks, bars, year labels), as Keith asked. The
  swap fades (the mock-up's "Fade" option); reduced-motion users get none.
- **Level 2 ("More detail"):** the cards and milestone table that "View details"
  showed, now inside level 1. The gate drill-down still opens under the marker
  row, from either view.
- All rows start closed. (The first row, ALAQ, started open until later the same
  day, when Keith asked for it closed: the table is then about 300px and nothing
  is chosen for the reader. `setL1()` is still the single place that opens a row.)

Decisions and what was rejected:
- **"Main barrier" is a new optional `barrier` field** in `data/products.js`
  (short phrase; documented in the data analyst guide), not a trimmed `flag`.
  Rejected: first clause of `flag` - "Adoption is the current access barrier"
  repeats the column title and says nothing. I drafted the two phrases
  (ASPY "National guideline inclusion is limited", DHA-PPQ "Only 0.9-4.5% of
  Global Fund spend, 2022-24"); **they are the data owner's to rewrite**. With no
  `barrier` but a `flag`, the row shows the flag clipped; with neither, "No
  barrier recorded". No changelog entry was added: it is a display field, not a
  change to a fact.
- **Pending-since year** comes from `detail.journey`, the same milestones the
  gate panel's "Pending since" line reads, so the two always agree (ASPY 2022,
  DHA-PPQ 2015). The mock-up had used 2008 for DHA-PPQ from the stage's "Since
  2008" text; the gate panel says 11 years from 2015, so 2015 is what ships. A
  product with no journey falls back to the latest year in the column before the
  current gate (GanLum: 2025); ALAQ has none and shows no bar.
- **Not-started gates are a row of dimmed icons**, not labelled chips: a product
  early on has up to seven, which made the right-hand panel the tallest thing in
  the row. Names are in each icon's title/aria-label and the strip above names
  every gate.
- **Kept:** the full pathway strip above the table (Keith chose it over a slim
  key). The legend lost "reached out of order": positions are now real years, so
  that state no longer exists in the default view (the rail still shows
  out-of-order gates by year label).
- **Removed:** the always-visible "Actual timeline" SVG and `fitTimelines()`,
  `stageTimeline()` and their helpers, and the `.prow`/`.pbtn`/`.peek` rules. The
  time view is plain percent-positioned HTML, so it needs no width measurement or
  re-render on resize.
- The pathway-order rail is measured to line its forks up, and a hidden rail has
  no size. `layoutJourney()` therefore re-runs whenever a row opens, when the
  view switches to the rail and on resize. Anything new that reveals a rail must
  call it.
- "Open in row" in the gate list now opens the row first and, when the time view
  has no marker for that gate (it only draws dated and current gates), switches
  to the rail, which draws all eight.
- Print: every row prints open in its time view, with the detail cards.

Not done / left alone: tablet width was not checked; the map is unchanged; the
stage markers in the time view keep hover tooltips and the drill-down but the
"Switch" link is the only route to gates that have no year, apart from "Open in
row". Real sliding of markers between the two views (mock-up option F's
animation) was not built; it is a fade.

### 3.19 The pathway strip explains itself (30 Sep 2026)

Keith wanted the strip to make the order obvious, to explain what happens at each
stage, and to drop the legend. Reviewed as a published mock-up first; every
suggested option was accepted.

- **Order:** steps are numbered 1 to 7 (`stepNo()`, the position of the stage's
  column), and the two parallel WHO gates share **3**, inside their bracket. A
  heading line says "Every medicine moves left to right. Step 3 is two separate
  WHO approvals, in either order." Numbering is justified because the steps are a
  real sequence; the shared 3 is what stops it implying an order between the WHO
  pair. The stage label size went from 11 to 12px.
- **Panel:** clicking a step opens one section under the strip (the old "every
  medicine at this gate" panel, extended) with two halves: *what happens here*
  (what, who decides, why it can stall, source) and *where each medicine is*
  (status, the note clamped to three lines, "Open in row"). With no `stageInfo` it
  falls back to the medicines half alone. Nothing is open on load; a hint line
  invites a click.
- **Wording lives in data, not HTML:** a top-level `stageInfo` array in
  `data/products.js`, one entry per stage, validated by `validate-data.js` (length
  must equal `stages`, all four strings non-empty) and documented in the data
  analyst guide. Drafted from `docs/domain-primer.md` section 2. **It is unreviewed
  wording and needs LAUNCH sign-off** - nothing on the page marks it as draft
  beyond the page-wide prototype banner. The "typical 3 to 6 years" for trials and
  the "about 90 working days" for collaborative registration are the primer's
  figures, not new claims.
- **Legend removed**, with the dated-milestone key. Status is written in words in
  the table, the panel and the row journey, and the dots differ in shape as well as
  colour. Safeguard added: each mini-journey dot has a `title` ("Regulatory
  approval (SRA): Complete"). The dots sit inside an element with `role="img"`, so
  the hover text helps sighted users; screen readers get the row's summary label,
  not per-dot names. `.strip`, `.legend` and `.tgap-key` CSS went with it.
- **"no fixed order" text removed** from both the top strip and each medicine's
  pathway rail (Keith, same day), since the heading line and the bracket already
  say it. The two note elements were emptied, not deleted: the rail's fork
  alignment (`alignStageForks`) measures the note band to place the spine, and the
  strip's `alignPathGroup` measures the pair, so both need the structure to stay.
  The strip's note became an 8px spacer. The group's `aria-label` still says the
  approvals have no defined order, so screen-reader users lose nothing. The
  mock-up for this change showed the text; that was before this request.
- Rejected: a separate explainer page or tooltip per step (the click panel already
  exists and is where the per-medicine answer lives), and putting the wording in
  `index.html`-style hard-coded prose (nothing would keep it in step with the data).
- Validator now reports 6 warnings, not the 5 in CLAUDE.md. The extra is
  `treatment policy: 1 country value(s) ... fall outside the drawn basemap (GUF)`,
  from PR #21 (MFT policy map), already on `development` before this change;
  confirmed by validating without these edits.
- Not checked: tablet width, real devices, print with a step panel open.

## 4. Newly discovered, deferred, or left alone

### Deferred with the fork rework (10 Sep 2026)

- **The row-band grid, and deleting `--sg-lift`.** The fork's *alignment* is
  still a runtime measurement even though its strokes are now drawn properly:
  `alignStageForks()` measures the caption band, publishes `--sg-lift`, the
  group pulls itself up by it and `.track` absorbs the same amount as padding.
  Restructuring `.track` as one grid with three rows — labels above, a fixed
  100px marker band, labels below — with every column placing its parts in the
  same rows would make the spine land on the neighbouring markers' centreline
  as a property of the layout, and `alignStageForks()`, `--sg-lift`, the resize
  listener and the `fonts.ready` hook would all go. Not done deliberately:
  option A was chosen partly *because* it is not a layout change, and this is
  one. It is the natural next step if the stepper is touched again.
- **A column of three or more gates would leave the middle one unattached.**
  `drawStageForks()` attaches the **first and last** `.smark` in the group and
  nothing between. `scripts/validate-data.js` permits a column of any size; no
  dataset has one. Flagged in the code at the function itself, not just here.
- **The strip's bracket and the stepper's fork still differ in kind.** One is
  `border-left`/`border-right` on `.pathgroup`, the other an SVG path. They
  agree on silhouette and now on where a connector meets the pair, but nothing
  keeps them in sync. Consolidating was not attempted; the strip has no
  connecting bars to reconcile.
- **Not verified in a browser.** `verify-map-clusters.js` needs puppeteer,
  which is not installed here (§5). All three fixes were instead checked by
  running the shipped functions against the real box models and rendering what
  they emit — see §3.13's figures. The fork's path data and `--pg-lift`'s
  arithmetic are correct by construction; what has *not* been seen is the
  stepper and the legend strip composited on the live page at 1×.

### Are access barriers scalable at portfolio level? (client question, 10 Sep 2026)

*"I do wonder if it would be best to provide this per product though, as it
gets a bit tricky to then figure out how this high level info links to specific
areas. This will be particularly difficult once there are more drugs."*

**Barriers are already per-product — in the data and in the UI.** This is not a
gap that needs building:

| Where | What it shows |
| --- | --- |
| `p.stages[i].status === "late"` | the barrier, on a named gate, for a named product |
| `p.flag` | one sentence explaining *why*, per product — the validator **requires** it whenever a product has a late stage (`validate-data.js`: "has a delayed stage but no top-level `flag` sentence") |
| product row | that gate's marker turns red with a `!` badge |
| `.flagnote` on the row | the `flag` sentence in full |
| gate panel (`.gp-why`) | the same sentence, against the gate |
| pathway strip | per-gate count ("1 delayed"), and its drill-down lists every affected medicine with a jump link |

**So the diagnosis is navigational, not structural.** The client can already
answer "which product, which gate, and why" — what they cannot do is get there
*from the summary number*. The strip's "2 current access barriers" is inert
text; the route to the two affected products is the pathway strip below it,
which is not visibly connected to it.

**Does it scale?** The arithmetic does — the figures are sums over
`tracked`, so they stay correct as products are added. The *reading* degrades:
at 4 products "2 current access barriers" is nearly self-explanatory, at 30 it
is a number with no way in. The pathway strip degrades more gracefully, because
it already partitions barriers by gate and its drill-down is per-product.

**Smallest change that would close it** (deliberately not built here — the
brief asked for investigation, not a product-level redesign):

1. Make the barrier figure a control, not text — clicking it opens the
   `gatewrap` drill-down filtered to gates with a `late` stage. The panel,
   its per-product rows and the "Open in row" jump links all already exist;
   this is a click handler and a filter, roughly the size of the existing
   `.pathnode` handler.
2. If a per-product barrier column is ever genuinely wanted, the honest home is
   the product row — which already has the red marker and the flag sentence —
   not a second portfolio KPI.

Nothing in the data model needs to change for either.

- **CI has never passed on `main`.** Every run since Initial commit is
  `startup_failure` with 0 jobs and no logs — a workflow-config or
  Actions-enablement problem, not a test failure. All four workflows show
  `active`. **Predates this work and is unrelated to it**, but it means no push
  to `main` has ever been checked by CI. Needs the Actions web UI to diagnose.
  Own ticket.
- **"bottleneck" still appears in 15 other pages' own chrome.** This task was
  scoped to `illustrated-journey-dashboard.html`, but the same summary strip
  (`stat-bottlenecks`, `stat-pipeline`, "active bottlenecks", "expected to
  market ≤ 3 yrs") is duplicated verbatim in `index.html`, `option-b.html` and
  the `unitaid/` and `synthetic/` editions, and the reworded `flag` prose now
  renders there too — so those pages currently pair "access barrier" data with
  "bottleneck" chrome. If the client wants the terminology change everywhere,
  it is the same three-line edit per page plus the KPI removal. Not done here
  under "do not change unrelated components".
- **`scripts/validate-data.js` error text** still says "explaining the
  bottleneck". Developer-facing only, never rendered. Left for the same reason.
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
| the summary strip's KPIs, or "access barrier" wording | §3.12 |
| the parallel-gate fork, or the legend strip's pair alignment | §3.13, plus §4 if the row-band grid or the strip's bracket moves |
| making barriers navigable or product-specific | §4's first subsection |
| anything found and not fixed | §4 |

If a task changes nothing a reader here would care about, say so in the commit
message rather than skipping this file silently.
