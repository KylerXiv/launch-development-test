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
8. "Subscribe for more information" button — front end only until 1 Oct
   2026, now connected (§3.10).
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
the same widget as "Send feedback". (Other pages said "Report an issue" until 30
Sep 2026; see 3.26, where "Send feedback" became the widget's default.)

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

**Superseded 1 Oct 2026: Subscribe is connected.** `subscribeEmail()` now
posts to `api/subscribe.js`, which saves the address as a Resend contact and
tells the team inbox. The principle above held, and decided the wording:
*"Thank you — you are on the list."* shows only after the server confirms the
contact was saved. Any failure, including an unconfigured server, shows
*"Sorry — we could not add you just now…"* and leaves the address in the field
for a retry. The button shows *Sending…* while in flight. Its 10 Sep click
block is removed, and the red "Mock only" `.sub-note` is now a muted privacy
line. `LAUNCH_SUBSCRIBERS` is gone. Send feedback is unchanged: still a mock,
Send still blocked, red flag still in its dialog. Why a Resend contact and not
a notify-us email: [email-backend-notes.md](email-backend-notes.md) §2.

**Revised the same day: double opt-in.** Submitting now saves nothing. It
emails a confirm link, so the success line had to stop saying "on the list"
for the same reason as above: *"Almost there — we've emailed you a link.
Click it to confirm your subscription."* The privacy line gained *"Every
email has an unsubscribe link."* The confirm and unsubscribe pages are not
part of this page; they are served by `api/confirm.js` and
`api/unsubscribe.js`, and described in
[email-backend-notes.md](email-backend-notes.md) §2.3–2.5.

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
- ~~"Open in row" from the gate list~~ was removed on 30 Sep 2026 (see 3.20); the
  `setL1`/`showView` fallback it needed is still used by the chevron and the Switch
  link.
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
- **Heading, order note and hint removed** (Keith, same day): "How a medicine
  reaches patients", "Every medicine moves left to right. Step 3 is two separate
  WHO approvals, in either order." and "Select a step to see what happens there..."
  are gone, along with their CSS and the two script lines that toggled the hint
  (leaving those would have thrown on every click). What that costs: the page no
  longer says in words that the strip is clickable or that step 3 is two parallel
  approvals. The numbered badges, the chevron on each icon, the bracket and the
  strip's `aria-label` still carry it, but a first-time reader gets no sentence
  telling them to click. If readers do not open the steps, restore the hint line
  first; it was the cheapest of the three.
- Rejected: a separate explainer page or tooltip per step (the click panel already
  exists and is where the per-medicine answer lives), and putting the wording in
  `index.html`-style hard-coded prose (nothing would keep it in step with the data).
- Validator now reports 6 warnings, not the 5 in CLAUDE.md. The extra is
  `treatment policy: 1 country value(s) ... fall outside the drawn basemap (GUF)`,
  from PR #21 (MFT policy map), already on `development` before this change;
  confirmed by validating without these edits.
- Not checked: tablet width, real devices, print with a step panel open.

### 3.20 The step panel: explanation band + a card per medicine (30 Sep 2026)

> **Superseded the same day by 3.21:** the per-medicine cards and "Read more" were
> removed. What survives from this section is the explanation band, the status
> count pills and the removal of "Open in row".

Keith asked to drop "Open in row" and redesign the panel. Reviewed as a published
mock-up (two layouts, three options for the button); the suggested options were
built.

- **Layout A:** an explanation band across the top ("What happens here", then
  Who decides / Why it can stall / Source as three columns), then one card per
  medicine side by side (auto-fit, 230px minimum, A-Z). Rejected, layout B: keep
  the two-column split with an expanding list. Its text column stopped at 70ch and
  left an empty strip, and four medicines could not be compared at a glance.
- **"Open in row" removed, replaced by in-place expansion.** Each card clips the
  note to three lines and, when there is more, offers "Read more", which reveals
  Recorded, Next step, Expected, Pending since (same `stalledSince()` rule as the
  per-medicine gate panel) and the source. Nothing to navigate to: the jump only
  ever existed to read what the clip hid. "Read more" appears only when the note
  is over 120 characters or there is any extra fact, so a "Not started" card has
  none. Rejected: keeping a "Show in table" link inside the expanded card (kept
  only as a mock-up option; nobody asked for it).
- **Header summary:** status counts as pills ("1 delayed, 1 in progress, 2 not
  started"), most urgent first, replacing "N of 4 medicines delayed at this step".
  It says how many medicines are where, not only whether any is late.
- A delayed medicine's card is tinted red (`--crit-soft`); no accent bar on the
  card.
- The toggle works by showing/hiding markup already in the card (no re-render),
  so focus stays on the button. Print opens every card fully.
- Removed: `.gw-list`, `.gw-jump`, `.gw-grid`, `.gw-sec` and the `[data-jump]`
  click branch.
- Not checked: tablet width, real devices. Verified in headless Chrome at desktop
  width: step 5 opens, ASPY's card expands, no script errors.

### 3.21 The step panel explains; the summary table shows where (30 Sep 2026)

Keith spotted that the per-medicine cards repeated the summary table's content.
Checked: for a medicine's current stage they said the same thing, and the
per-stage detail is already one click away (expand the row, click the marker).
The panel was also about 500px tall, most of the scrolling this work set out to
cut. Reviewed as a mock-up first; built as suggested.

- **Panel:** explanation only (what happens, who decides, why it can stall,
  source) plus the status-count pills. About 200px.
- **Highlight:** opening a step lights that step's column in every summary row
  (`highlightStep()`): a ring on the dot and a tinted band. Each journey column is
  now a `.jcell` that stretches to the row height (negative block margin cancels
  the row padding), so the lit cells read as one continuous column. Step 3 lights
  both WHO dots, which share a column. The header's Journey cell shows the step
  numbers 1-7 above the dots in the same cells, so the number on the strip lines
  up with its column. Closing the panel clears it.
- **Rings removed, band only** (Keith): the 4px ring on each lit dot made the two
  stacked WHO dots touch and read as an "8". Options offered were a 4px gap plus a
  thin ring on the pair only; Keith chose the plainest, the tinted band alone. The
  dots keep their status colours, so a lit cell reads as "this step, this status".
- **Header step numbers removed** (Keith, after seeing them live): the small 1-7
  above the dots are gone and the header cell is just "Journey" again. The lit
  column and ring still tie the table to the strip; the numbers on the strip itself
  stay. `miniNumbers()` and the `.nums` rules went with them.
- **What was lost, knowingly:** reading all four medicines' notes for one step side
  by side. To compare, open the rows and click the stage marker. The status-count
  pills are the only cross-section left. A middle option (list only the delayed or
  in-progress medicines, one line each) was offered and not chosen.
- **Removed:** `.gw-cards`, `.gw-card`, `.gw-more`, `.gw-tg` and the Read more click
  branch. The old `.mp` WHO-pair bracket in the dots is kept inside each cell.
- Checked in headless Chrome: step 5 and step 3 light 5 cells each (header plus
  four rows), switching moves the highlight, no script errors. Not checked: tablet
  width, real devices. On phones the journey sits on its own line and the
  highlight is a short band per row, not a continuous column.

### 3.22 Marker rings take their status colour (30 Sep 2026)

Keith saw that a selected marker got a teal ring whatever its status (an amber
"in progress" marker ended up with a teal ring outside its own amber border), and
that complete markers had no ring at all. Suggested first, then built.

- **One colour per status, set once:** `.stage.s-done/-prog/-late/-idle` define
  `--ring` (green / amber / red / grey) and `--ring-soft` (its tint). The border,
  the selected ring and the current-stage glow all read them, so no second colour
  can appear on a marker.
- **Selected:** a 3px ring in `--ring` with a 2px white gap, so it cannot clash with
  the marker's own border. Declared for `.stage.cur` too, because the current-stage
  glow (same specificity, later in the file) used to override it.
- **Every marker has a ring:** complete markers gained a solid 2px green border
  (prog and late already had theirs); not-started markers keep a dashed ring, now
  1.5px in `--idle` (was 1px in `--line`) at 65% opacity (was 55%), since dashed
  reads as "not yet" and a solid ring would say otherwise.
- **Current-stage glow** is the status tint, not teal.
- Applies to the pathway-order rail and the time view, which share the markers. The
  top pathway strip has no status, so it is unchanged.
- Trade-off: complete markers are heavier, so a fully complete row reads busier;
  the green check badge was already there.
- Checked in headless Chrome: selecting an in-progress and a delayed marker gives
  amber and red rings. Not checked: tablet width, real devices, keyboard-focus
  outline against the new rings.

### 3.23 The journey panel: view switch, More detail bar, shared view (30 Sep 2026)

Keith asked for the "Switch to pathway order" link to become a button group and
for the panel to be reformatted. Reviewed as a mock-up with a selector per
choice; these are the choices made.

- **View switch:** a two-button group, "Actual timeline | Pathway order", timeline
  first and selected on load, top right of the panel where the link was. It is a
  pair of `aria-pressed` buttons. Cost, stated up front: with the link the
  pathway-order rail was clearly secondary (Keith's earlier wish); as buttons both
  views carry equal weight. The timeline is still what a row opens on.
- **"More detail" is a full-width bar** along the foot of the panel instead of an
  outlined button in a footer row: a bigger target, and the dashed footer row is
  gone. The panel loses its bottom padding so the bar sits on the edge
  (`overflow:hidden` keeps it inside the rounded corners); the detail cards open
  **below** the bar. The mock-up had opened them above it, which reads oddly; the
  dashboard does not.
- **Reversed the same day: the view is per row again** (Keith chose "Per row" in
  the mock-up's option 7; the first build shared it across rows by mistake, from a
  screenshot that showed the other option selected). Each row keeps its own view
  and opening a row never changes another. The next bullet describes the shared
  version that was built and then removed.
- **One view for every row:** choosing Pathway order on one medicine switches all
  rows, including closed ones, so a row opened later is already on it. The rails of
  closed rows have no size, so `setL1()` re-runs `layoutJourney()` on opening (it
  already did). Switching still closes any open stage panel.
- **Left as they were, deliberately** (Keith kept "today" in the mock-up for both):
  undated gates stay in the side panel, and a medicine with under two dated gates
  (ALAQ) still gets the full axis, about 120px of mostly empty line. The compact
  alternatives (a strip under the chart; a summary in place of the axis) were
  offered and not chosen; ALAQ is the case to revisit if the panel still feels
  empty.
- **Provenance line under the milestone table removed** (Keith, after seeing the
  draft wording live): the "Draft - not yet verified. These figures come from
  public sources..." note. The same `.src` element also carried the wording for
  `illustrative` and `live` data ("Each figure reflects its cited public source;
  manufacturer-specific details are shown only where release was confirmed in
  writing"), so those went too. The draft banner at the top of the page and the
  "About the data" footer still say the same things; if the dataset goes `live`,
  that per-figure sentence is no longer shown next to the figures.
- Removed: the `.swv` link and the `.l1f` footer row. Print hides the switch and the
  bar.
- Checked in headless Chrome: the group switches every row, the bar opens the
  detail below it, no script errors. Not checked: tablet width, real devices,
  keyboard focus on the bar (outline drawn inside because the panel clips).

### 3.24 A site menu and a guide to the views (sheet rows 26 + 27, 30 Sep 2026)

> **Changed the same day by 3.25:** the menu now lists three views, the blurb and
> "What are these views?" guide were removed, and the bar moved into a shared file
> used by the illustrated journey, Pipeline and Story.

Row 26 asked for a global menu linking the dashboard's views so nobody has to edit
a URL to move between them; row 27 for on-page guidance on the available views.
Reviewed as a published mock-up (six choices, each selectable); these are Keith's
picks.

- **What was actually missing:** the other pages (`index`, `option-b`, `pipeline`,
  `story`) already carry a small row of in-text links to each other and to this
  page. This page had none going out, so it was the dead end the row describes.
  Building the menu here closes that without touching the other four.
- **Menu:** a top bar above everything, "LAUNCH" then six links, the current one
  underlined and marked `aria-current="page"`: Illustrated journey, Journey board
  (`index.html`), Comparison (`option-b.html`), Pipeline, Story, About the data
  (`explainer.html`). Short names. It **scrolls away** with the page (the
  mock-up's "stays in view" was not chosen; it would cost about 44px of screen all
  the time). `widget.html` is left out: it is an embeddable tracker for other sites,
  not a view to browse.
- **Guidance (row 27):** a one-line blurb on this view plus a "What are these
  views?" button that opens a panel describing all six, each a link, with "You are
  here" on the current one. Closed on load.
- **Phone (640px and below):** the links collapse into a "Views: Illustrated
  journey" button that opens a list with a one-line description each; Escape closes
  it. The blurb and guide stay.
- **Wording is my draft** (from `docs/project-explainer.md` section on the views)
  and needs LAUNCH sign-off, like the step explainers in 3.19. The blurb and panel
  text is English only: the translation pipeline leaves untranslated text as English,
  so locale builds will show it untranslated until strings are added.
- **Cost:** about 44px for the bar plus about 40px for the blurb row above the
  header, against the compact-layout work in 3.17. The guide panel is closed on
  load, so it adds nothing further unless opened.
- **Not done, on purpose:** the same menu on `index`, `option-b`, `pipeline`,
  `story` and `explainer` (Keith scoped this work to the illustrated dashboard).
  They keep their in-text link rows, which name the views differently ("Comparison
  matrix (B)", "Data story"); worth aligning if the menu is rolled out. The menu
  is inline on this page; if other pages adopt it, move it to a shared file so the
  page list lives in one place. Not added to the `unitaid/` or `synthetic/`
  editions, which do not build this page.
- Public build needs nothing new: every link target is already copied by
  `build-public-site.sh`.
- Checked in headless Chrome: desktop bar and open guide, and the phone Views menu
  inside a 390px frame, no script errors. Not checked: tablet width, real devices,
  keyboard order through the bar.

### 3.25 One menu on three pages, in one theme (sheet rows 26 + 27, 30 Sep 2026)

Keith narrowed the menu to Illustrated journey, Pipeline and Story, asked for the
bar on all three, for Pipeline and Story to take this page's colours and theme, for
the Unitaid badge on both, for the blurb and guide to go everywhere, and for the old
link rows to be replaced so the pages are consistent.

- **Shared bar:** `assets/site-nav.js` holds the list of views and builds the bar;
  each page loads it with `<script src="assets/site-nav.js" data-current="...">`.
  One place to edit; `build-public-site.sh` copies it. The bar reads each page's own
  tokens with this page's values as fallbacks, and pages align it to their content
  column with `--nav-pad` and `--nav-max`. It hides in print. A phone (640px and
  below) gets the "Views" button. If a copy lands in `/unitaid/` or `/synthetic/` it
  drops the Illustrated journey entry, because those editions do not build that page.
- **Gotcha, fixed:** Pipeline and Story have no `<body>` tag, so a script placed
  before any content is parked in `<head>` and the bar was inserted where it could
  not show. The three pages now have an explicit `<body>`, and the script falls back
  to the top of the body if it is ever in the head. Any new page using the bar
  should do the same.
- **Removed:** the blurb and "What are these views?" panel (and their CSS and script)
  from the illustrated page; the in-text link rows on Pipeline ("Journey board (A) ·
  Comparison matrix (B) · ...") and Story's header links.
- **Same colours and theme:** Pipeline and Story now use this page's tokens: white
  ground, `--surface-2` #F4F7F8, the darker greys (`--ink-2` #3F5564, `--ink-3`
  #566A77, `--line` #DCE3E7), teal #0F5A72. Story's map ramp moved to this page's
  (registered teal, guidelines blue, MFT purple). Story is **light only** now: its
  dark theme (the OS setting and `data-theme`) was removed, since this page is light
  only by design. Each page keeps its own layout and type scale: Story stays a
  scroll-driven narrative at 16px, Pipeline a poster. Rejected: rebuilding both in
  this page's header-and-cards look (much bigger, not asked for once Keith chose
  "tokens only").
- **Unitaid badge:** the same flat "Powered by" logo as here, top right of each
  header. On Story it sits opposite the Prototype pill (the old "LAUNCH" text mark
  went; the bar carries it). The `/unitaid/` edition keeps its own logo bar.
- **Story's closing buttons** now link only to the Illustrated journey and Pipeline
  (they pointed at Journey board and Comparison matrix, which are no longer in the
  menu).
- **No links to pages outside the three (Keith, same day):** the Journey board is
  "replaced and overstepped" by this page, so Pipeline no longer sends people there.
  Clicking a Pipeline card now opens `illustrated-journey-dashboard.html#<product
  id>`, and this page opens that medicine's row and scrolls to it on load and on
  `hashchange` (`openFromHash()`); a hash that is not a product id, such as
  `#report-issue`, is ignored. Pipeline's legend now says "see the illustrated
  journey", and its footer copy was reworded: "Spotted an error?" is gone (the
  floating Report an issue button covers it), "open the full profile on the journey
  board" became "open that medicine in the illustrated journey", and the Format line
  was shortened. No other link to `index.html`, `option-b.html` or `explainer.html`
  remains in this page, Pipeline, Story or `site-nav.js`. **Not done, needs a
  decision:** `index.html`, `option-b.html` and the rest are still deployed and
  reachable by URL (and `/` still serves the Journey board); making `/` land on this
  page would be a redirect in `vercel.json`, which changes what the public URL serves.
  The comment in `assets/report-issue.js` still cites `index.html#report-issue` as an
  example share link; it works on any page that loads the script.
- **Full width, like this page (Keith, same day):** Pipeline and Story dropped their
  fixed 1180px column (and Story's 780/732px hero, banner and closing panel) and now
  fill the screen with this page's side padding. Each defines `--pad:
  clamp(24px, 4vw, 64px)` (14px on a phone) and uses it for the header, content and
  footer; the menu bar reads the same value through `--nav-pad`, so the bar's left
  edge lines up with the content at every width. The old `--nav-max` cap is no longer
  set by any page. Story's hero is now left-aligned at the page edge instead of
  centred in a 780px column (the heading and intro keep their 58ch line length), and
  the closing panel's text is capped at 70ch so it stays readable. Checked at 1900px
  and 390px; the scroll section's sticky stage and cards still lay out. Not checked:
  the interactive map steps in Story, or widths between 860px and 1400px.
- **Left alone, worth a decision:** clicking a product card on Pipeline still goes
  to `index.html#id` (the Journey board), and Pipeline's footer says "open the full
  profile on the journey board". Both point outside the three-view menu. The
  `unitaid/` and `synthetic/` copies of Pipeline and Story are committed generated
  files and were not regenerated; regenerate them from the root pages in a separate
  step (the bar will then appear there without the illustrated link). Menu text is
  English only (script-built, so the translation pipeline does not see it).
- Checked in headless Chrome: desktop bar, current page marked and badge on all three
  pages; Story further down the page (map-section cards, colours); Pipeline and Story
  at 390px with the Views button. Not checked: tablet width, Story's interactive map
  states, real devices, keyboard order.

### 3.26 One "Send feedback" button on every page, with each page's own wording (30 Sep 2026)

Keith wanted every report button to match this page's "Send feedback", but with
text that fits the page it is on.

- **The widget's default is now "Send feedback"** (`assets/report-issue.js`): same
  pill, dialog title, type labels ("Something on the page looks wrong" ...), red
  "Mock only - Send feedback isn't connected yet." note, and a **disabled Send
  button** until a backend is connected. Before, this page supplied all of that
  itself (a page-local copy block, a red-note style and a script that blocked the
  click); that block is now just its own `view` id and example text. The behaviour
  here is unchanged.
- **Each page fits it to itself** by setting `window.LAUNCH_FEEDBACK_COPY` before the
  script tag. Pipeline: "Something in the pipeline look wrong...", the first type
  reads "A product is in the wrong phase, or something else looks wrong", and its
  example is about a product in the wrong phase. Story: "Something in the story look
  wrong...", "A number, date or claim in the story looks wrong", and an example about a
  waiting time. The example messages are invented illustrations, like the existing
  Tanzania one.
- **Page context in the payload:** the payload already carried page url, path and
  title, plus the data's `lastUpdated` and `dataStatus`; it now also carries
  `page.view` (`illustrated`, `pipeline`, `story`) so a report says which view it came
  from. Set `connected: true` in the same object once the seam posts for real.
- **Story's footer "Spotted an error?" line removed**, as Pipeline's was, since the
  pill covers it.
- **Reach, which you should know about:** the default lives in the shared file, so
  every page that loads it now says "Send feedback" with Send disabled, including the
  Journey board, Comparison matrix, widget-adjacent editions and the `unitaid/` and
  `synthetic/` copies (they load the same file). Those pages previously simulated a
  successful send. They have no `view` and use the generic example text. If those
  pages are retired, this stops mattering.
- Checked in headless Chrome: the dialog opens on all three pages with the right
  pill, intro, type, example and red note, Send disabled, no script errors. Not
  checked: the other pages that load the widget, real devices, keyboard handling of
  the disabled button.

### 3.27 The sources list is a closed dropdown, and the closing line is gone (2 Oct 2026)

Branch `feat/sources-dropdown`, from `development` at `d23706b`.

*(Updated by §3.30: Sources is now open on desktop and closed on phones, and sits after the
disclaimer.)* The footer's source list (ten entries, two columns) was the longest thing on the
page after the map. It became a `<details id="sources">` below the "About the data"
paragraph, **closed by default**, in the same box and summary style as the
Definitions band. The summary reads "Sources" with a count badge, set from the
list so it cannot drift when a source is added.

- **"About the data" stays visible.** It carries the caveat that only publicly
  available information is shown and that pricing appears only where the
  manufacturer confirmed it in writing. That is the one thing not to hide behind a
  click. *Rejected:* collapsing both blocks (shorter page, hidden caveat); a
  one-line list of source names in the closed bar (shows provenance without a
  click, but a longer bar and one more place to update).
- **The intro sentence moved inside the dropdown** ("Everything on this page is
  traceable to one of the public sources below…"), because "below" no longer
  works while it is closed.
- **It opens for print** (`beforeprint` opens it with the other panels) and when
  the page is opened at `#sources`, which also scrolls to it.
- **Removed on request:** the closing line "A LAUNCH initiative of Unitaid
  partners, to be hosted by the RBM Partnership to End Malaria", with its two links.
  The Unitaid logo and "Powered by" attribution in the header are unchanged.
- Styled with its own `.srcs` rules, not the `.updates` class: `.updates li` is a
  flex row with a dashed divider and would have broken the two-column source list.
- Checked in headless Chrome: closed on load, count 10 of 10, "About the data"
  visible, opens on click, `beforeprint` and `#sources` both open it, no script
  errors. Not checked: a real print preview, phone widths.
- Anyone who copies the page into another repo needs the `#sources` block, the
  `.srcs`, `.srcn` and `.srcs-intro` rules, and the small script after the
  `beforeprint` listener. The translation pipeline sees no new strings except the
  word "Sources" and the count.

### 3.28 A language button in the nav bar, switched on per language (2 Oct 2026)

Same branch as §3.27 (`feat/sources-dropdown`).

The top bar on the illustrated journey page gets a **language button** at its
right-hand end: a globe, the current language, a caret, and a menu of English,
Français and Português. It lives in `assets/site-nav.js`, the shared nav script,
and is **opt-in**: it appears only on a page whose script tag carries
`data-languages="en,fr,pt"`. Pipeline and Story do not, because only the
illustrated journey page has a translation pipeline (DEV-31).

- **Links, not scripts.** English is the page itself; French and Portuguese are
  `fr/` and `pt/` folders beside it, which is where `scripts/build-locale-pages.js`
  writes them (`dist/locale/fr`, `dist/locale/pt`). From inside a translated copy
  the English link goes up a folder, and the Pipeline and Story links go up too,
  since only the translated page itself exists there. The current language is read
  from `<html lang>`, which the builder sets (`fr`, `pt-PT`).
- **Not live yet, so the menu says so.** `fr` and `pt` are `live: false` in the
  `LANGS` table at the top of the script, and show greyed as "coming soon" rather
  than linking to a 404, because the translated copies are not deployed and the
  English snapshot behind them is stale (see `docs/handoff-remove-study-layers.md`
  §5.1). To switch a language on, set its `live` to `true` in that table, or set
  `window.LAUNCH_LOCALES_LIVE = { fr: true, pt: true }` before the script, once the
  folders are deployed.
- **Rejected:** a runtime switcher that swaps text in the browser (it breaks Rule 1
  of the pipeline, build-time substitution, and would translate lookup keys);
  showing the button on all three pages with "English only" notes on two (promises
  something those pages cannot do); a mock that only remembers the choice (nothing
  to wire up later).
- **Phones:** the language button stays beside the "Views" button; below 480 px it
  shows the code (EN) and the Views label drops its "Views:" prefix so the bar stays
  on one line.
- Checked in headless Chrome: default menu (English current, French and Portuguese
  "coming soon"); both switched on (links `fr/…` and `pt/…`); a simulated French
  copy (English `../…`, Portuguese `../pt/…`, Pipeline and Story `../…`); closes on
  Escape and outside click; no button on Pipeline; no sideways scroll at 390 px; no
  script errors. **Not checked:** real translated pages (none are built or
  deployed), screen-reader announcement of the menu.
- Deploy note: `scripts/build-public-site.sh` copies `site-nav.js` but does not yet
  copy `dist/locale/` into the site, and has never copied `treatment-policy.js`
  either. Both are needed before the button can be switched on.

### 3.29 Reviewer feedback: disclaimer, GanLum acknowledgement, price, procurement, regulatory status (2 Oct 2026)

Same branch as §3.27 and §3.28 (`feat/sources-dropdown`). The options were chosen on an
options page; the choices and what they cost are recorded here.

**Disclaimer.** Full three-paragraph text in the footer (`#disclaimer`), linked from
the amber draft banner ("Read the disclaimer"). It is an adaptation of the Medicines
Patent Pool's MedsPaL disclaimer, which the project was given as an example: the MPP
text is about patents and was **not** copied. The wording is **draft, written by us**
and has not been signed off by anyone; do not treat it as approved. It names the
Nigeria and Tanzania registrations as the only verified country stages, so it must be
reworded when the country survey is verified. *Rejected:* a closed dropdown (easiest
to argue nobody read it), a pop-up window (most to build), a one-sentence version
(covers too little).

**GanLum acknowledgement.** New optional product field `acknowledgement` in
`data/products.js` (validator: non-empty string when present; documented in the analyst
guide §4). The text is the reviewer's, word for word. It shows as an Acknowledgement
card in the medicine's expanded details only. A footer Acknowledgements section was built
and then removed on request (2 Oct 2026), so the text appears once, next to the medicine. The funder's name in it, "European
& Developing Countries Clinical Trials Partnership Programme", is as written in the
reviewer's note and **has not been confirmed with MMV**.
The reviewer said MMV is not responsible for access, so for GanLum only: manufacturer is
now "Novartis" (was "Novartis · MMV"), research lead "Novartis" (was "Novartis / MMV"), and
the line "Co-developed with MMV under access-oriented partnership" is removed. Source
citations that name MMV press releases are unchanged: they are sources, not roles.
**ASPY still reads "Shin Poong Pharmaceutical · MMV", "MMV and partners" and carries the
same "Co-developed with MMV…" line.** The feedback named GanLum only, so it was left
alone; it likely needs the same decision. The synthetic dataset is not mirrored (the
field is optional).

**Price (Novartis comment).** The "Indicative price per treatment" card is removed from
the medicine details on this page, with nothing in its place. "Including pricing" is dropped
from the footer. The `price` field stays in the data and is still shown on `index.html`,
`option-b.html` and `pipeline.html` and used by Power BI and Streamlit; removing it
everywhere is a separate schema change, not made. A one-line note saying price is not
shown (and why) was offered and not chosen. *Rejected:* keeping the card.

**Procurement (highlighted comment).** The step is renamed "Procurement (public channels)"
in `data.stages`, so it changes on every page that reads that file. Its explainer, the
footer and the volume card heading ("Treatments procured through public channels") and
the facts label ("Public-channel procurement (Global Fund)") now say the figures are
Global Fund-financed procurement only. The phrase "public channels" is the reviewer's;
whether they would prefer "public-sector" or "donor-funded" has not been asked.

**Regulatory status.** The Regulatory approval step's explainer and the footer say
health-authority review status is generally not public, so the step changes only when a
regulator or the manufacturer announces an outcome. **Not changed:** GanLum's regulatory
step still reads "In progress" (sourced to a Novartis announcement); whether it should
say something else is an open question.

**Changelog.** One entry (2 Oct 2026) in `data/products.js`. Merging to `main` fires
`publish.yml` (history snapshot, feed, ontology).

Checked in headless Chrome: banner link `#disclaimer`, three disclaimer paragraphs, no
"pricing" in the footer, the acknowledgement in GanLum's details only, the renamed step in the
pathway strip and table (fits on one line), GanLum's details with no price card and no
"Co-developed with MMV" or "Novartis / MMV", ASPY unchanged, no script errors.
Validator 0 errors, 1 warning; synthetic 0 and 0. The other pages (`index`, `option-b`, `pipeline`, `story`, the widget) load with
no script errors after the stage rename; `index`, `option-b` and the widget show the new
name. **Not checked:** the Power BI and Streamlit views, a real print preview.

### 3.30 The footer is reworked so nothing is overlooked (2 Oct 2026)

Same branch as §3.27 to §3.29 (`feat/sources-dropdown`). The choices were made on an
options page and pasted back as text; they supersede the "closed by default" Sources
dropdown of §3.27 on wide screens.

- **Disclaimer first**, then About the data, then Sources.
- **Disclaimer as a tinted panel with an accent edge** and an info icon, in the page's own
  blue (`--accent-soft`, `--accent`), 14 px. The Medicines Patent Pool page the project
  was shown uses a full-width tinted band; that was offered and not chosen (a large block on
  a data page). *Also not chosen:* an amber panel matching the draft banner, plain text, a
  two-column footer, tabs (only one part visible at a time).
- **Small section headings with a rule** for About the data and Sources (the disclaimer's own
  heading is inside its panel).
- **Footer text is 14 px** throughout (was 12.5 px), in `--ink-2`.
- **Sources: open on desktop, a closed dropdown on phones** (breakpoint 720 px, the same one
  the two-column list already used). The `<details>` element is kept: the script holds it open
  on wide screens and hides its summary, so the section heading is the label; on a phone the
  summary reads "Show the sources" with a count. `#sources` and printing still open it.
- **The disclaimer glows briefly on arrival** from the draft banner's "Read the disclaimer"
  link or from a `#disclaimer` URL (about 1.6 s; a static outline instead when the reader
  prefers reduced motion). The link works again when the hash is already `#disclaimer`.
- Checked in headless Chrome at desktop and 390 px: order disclaimer, About, Sources; sources
  open at desktop with the summary hidden, closed at 390 px and opening on tap; glow on click,
  cleared after, and again on a second click; no sideways scroll; no script errors. **Not
  checked:** a real print preview, a screen reader.

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
| the sources footer or any source URL | §3.9, §3.27 |
| the subscribe backend (`api/`) | §3.10 here for what the visitor sees; decisions in [email-backend-notes.md](email-backend-notes.md) |
| the draft/dataStatus banner | §3.11 |
| the summary strip's KPIs, or "access barrier" wording | §3.12 |
| the parallel-gate fork, or the legend strip's pair alignment | §3.13, plus §4 if the row-band grid or the strip's bracket moves |
| making barriers navigable or product-specific | §4's first subsection |
| anything found and not fixed | §4 |

If a task changes nothing a reader here would care about, say so in the commit
message rather than skipping this file silently.
