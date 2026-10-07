# Yardstick — working notes

Branch `feat/yardstick`, cut from `main` at `285afaa` on 7 October 2026 and
rebased onto `bc7fee7` (#68, team emails; no overlap) on 8 October. It
compares how long each stage of a medicine's pathway is expected to take with
how long it has taken, in plain words: **expected**, **took**, **years late**.

## How to undo or change it

Everything is in one commit on `feat/yardstick`, so each of these is safe:

- **Undo all of it.** Before it is merged, delete the branch
  (`git checkout main && git branch -D feat/yardstick`). After it is merged,
  `git revert <commit>` on `main`; nothing else depends on it.
- **Hide it without touching the code.** Delete the `"yardstick"` block from
  `data/products.js`. The badge, the box and the "Time taken" button all
  disappear, and the page is as before. Put the block back to show it again.
- **Change an expected time.** Edit `yardstick.expected` (one entry per stage,
  same order as `stages`) or `wholeYears` in `data/products.js`, then run
  `node scripts/validate-data.js`. No code change. Set an entry to `null` to
  stop measuring that stage. Mark it `"basis": "published"` once LAUNCH agrees
  it, and update the footnote text in the page (search for "Expected times:").
- **Change the wording.** Every visible phrase is in
  `illustrated-journey-dashboard.html`, in the block that starts
  `// ---- yardstick`. If you change one of the phrases listed in
  `i18n/reviewed-strings.json`, change its `src` there too, or
  `scripts/assemble-content.js` stops with "no longer matches the code".
- **Drop one piece and keep the rest.** Each is one line in the row template:
  the badge is `${yardBadge(p)}`, the box `${yardBox(p)}`, and the tab is the
  `data-v="taken"` button plus the `data-v="taken"` view.

## What I did

| File | Change |
|---|---|
| `illustrated-journey-dashboard.html` | the yardstick functions (`yardstick`, `yardResult`, `yardBadge`, `yardBox`, `yardTable`), their styles, the badge under "On pathway", the box at the top of an open row, and the "Time taken" button and view |
| `data/products.js` | the `yardstick` block (expected years per stage) and a header comment for it |
| `scripts/data-rules.js` | checks for the block (validator) |
| `scripts/build-dataset.js` | copies the block into `dashboard.json` |
| `scripts/build-rbm-pages.js` | the RBM loader passes it to the page |
| `public-data/v1/schema.json`, `public-data/README.md` | describe the new optional field |
| `i18n/reviewed-strings.json` | 9 entries so the new text gets translated |
| `docs/jackson/yardstick.md` | this file |

## What the reader sees

- **Medicines table.** Under "On pathway", a badge for the whole journey:
  "6 yrs late" (ASPY), "8 yrs late" (DHA–PPQ), "Not approved yet" (GanLum,
  ALAQ). Hidden below 1040px, like the column it sits in.
- **Top of an open row.** A box: the headline ("6 yrs late"), "Expected in
  routine use by 2020, 8 years after its first milestone in 2012. Still not in
  routine use in 2026.", the biggest delay, and a small start / expected /
  today line. Only for an approved medicine.
- **"Time taken"**, a third button beside Actual timeline and Pathway order: a
  table of Step, Expected, Actual, Result, with the whole journey as the last
  row and a footnote on where the expected times come from. Below 560px it
  shows Step and Result only.

Nothing is drawn when the data has no `yardstick` block, so the RBM pages show
none of it until the public dashboard.json carries the block.

## Decisions

**Options 5 and 2 of six.** The owner saw six layouts drawn in the real RBM
page (artifact "Yardstick in the Dashboard", 7 Oct) after rejecting a first
round as too hard to read — bars with diamonds for published standards, rings
for targets, hatching for running stages and "×" multiples. Chosen: the
headline (5) plus the table (2). Rejected: labels under Pathway order (1), one
bar per step (3), expected-vs-actual cards (4), and the yardstick drawn into
the Actual timeline (6).

**Both sites, not the RBM build only.** Owner's call. It lives in
`illustrated-journey-dashboard.html`, so the LAUNCH site, `/fr`, `/pt` and the
RBM pages all get it. Rejected: an RBM-only addition like `rbm-skin.js` — the
yardstick is content, not a look.

**Expected times are data, labelled as estimates.** `data/products.js` →
`yardstick`: one entry per stage (`null` = not measured) with `years` and
`basis` (`published` or `estimate`), and `wholeYears`. Values: WHO
recommendation 2, WHO PQ 1.5, country registration 2 (published), policy
adoption 2, procurement 2, delivery 3, whole journey 8. Only country
registration has a published basis; the footnote says the others are LAUNCH's
working estimates, still to be agreed. Rejected: holding the feature back
until the numbers are agreed, and showing only the steps with a published
timeline (which would leave just one step and no headline).

**The regulatory approval step is not measured.** Its published turnaround
(about 210 active days) is known, but no dossier submission date is public, so
there is nothing to measure against. `expected[1]` is `null`.

**The clock starts where "On pathway" starts.** Owner's call: the first dated
milestone (`firstYear`), so the badge and "On pathway" always agree. For ASPY
both start in 2012. For DHA–PPQ the WHO recommendation (2010) came before EMA
approval (2011): the clock starts in 2010, 16 years, 8 years late. Rejected:
starting at approval, which gave DHA–PPQ 15 years and 7 years late beside an
"On pathway" of 16. The comparison starts only once regulatory approval has a
year; before that the medicine reads "Not approved yet" rather than being
measured from R&D.

**A range counts from its first year.** Owner's call, matching the page's
existing rule (`stageYear`). ASPY's WHO PQ is "2012–2016", so it took 0 years
and reads "On time". Rejected: the last year (2016), which reads "2.5 yrs late"
and would need the timeline changed to agree.

**Each stage's own start.** Recommendation, PQ and registration start with the
pathway. Policy adoption starts at the WHO recommendation. Procurement and
delivery start at a "Since YYYY" date where there is one (ASPY procurement
2018). The current stage starts where the timeline's "since" line says
(`sinceFor`, so DHA–PPQ procurement is since 2015, as the timeline shows). No
stage starts before the pathway does. A stage with no usable year says so
("Done, no date recorded", "Ongoing, no start date") instead of being given
one.

## Figures on 7 Oct 2026 (data as of 2026-10-06)

| | ASPY | DHA–PPQ |
|---|---|---|
| WHO recommendation | 10 yrs, 8 late | 0 yrs, on time |
| WHO PQ listing | 0 yrs, on time | 5 yrs, 3.5 late |
| Country registration | 14 so far, 12 late | done, no date |
| National policy adoption | 4 so far, 2 late | 16 so far, 14 late |
| Procurement | 8 so far, 6 late | 11 so far, 9 late |
| In-country delivery | not started | ongoing, no start date |
| Whole journey | 14 so far, 6 late | 16 so far, 8 late |

## Translation

The page's new text reaches `/fr` and `/pt` through the usual route: the
translate bot rebuilds `i18n/content.en.json` after the merge and translates
what is new (20 strings). Until then they show in English (`/fr` reads "6 ans
late"). `content.en.json` is not in this commit, as for other hand-made page
changes; CI builds with `--allow-stale`.

Nine entries were added to `i18n/reviewed-strings.json` for text the pattern
collector cannot find safely: "late", "so far", the four table headings, the
"start" and "expected" marks, and the routine-use sentence (one unit, with its
`${...}` holes). Two traps found while doing it, both avoided in the code:

- a multi-line template made the collector offer `left:${x(due)}%` for
  translation, and a translated style breaks the page. Positions are built in
  one-line templates, which the collector skips as markup;
- passing `"<em>start</em>"` as an argument left `") + mark(due, "` between two
  tags, which the second pass took for a text node. The marks are now one
  template.

## Data path

`data/products.js` → `scripts/data-rules.js` checks the block (one entry per
stage, years above 0 and at most 50, basis one of the two) →
`scripts/build-dataset.js` copies it into `dashboard.json` when present →
`public-data/v1/schema.json` describes it (optional) → `build-rbm-pages.js`'s
loader passes it to the page. `serialize-products.js` writes the file
byte-for-byte as committed.

## Found in passing, left alone

- **Status lights and the yardstick can disagree.** DHA–PPQ's policy adoption
  is "In progress" (amber), but against 2 expected years it reads "14 yrs late
  · still going". The light says whether the stage is moving; the yardstick
  says how long it has taken. Not reconciled here.
- **The disclaimer is out of date** (line ~1333): it still says country stages
  are illustrative and unverified except Nigeria and Tanzania, which no longer
  matches the 6 Oct verified lists.
- The "On pathway" column, and so the badge, is hidden below 1040px. The box
  in the open row carries the same headline there.

## Follow-up: history snapshot failed after the merge (8 Oct)

PR #69 merged as `52114d4`. The translate bot ran by itself (`ce094d2`), and
validate and the Vercel deploy passed, but **Snapshot history and rebuild feed**
(`publish.yml`) failed: `history/products-2026-10-06.js already exists with
different content`. My mistake: `data/products.js` changed (the `yardstick`
block) without moving `meta.lastUpdated` on, and history keeps one snapshot per
date, append-only. Because that step failed, the feed, the linked-data export
and the history graph were not rebuilt for this change either.

Fixed on branch `fix/yardstick-history`: `meta.lastUpdated` 2026-10-06 →
2026-10-08, and a changelog entry for 2026-10-08 describing the yardstick (its
`plain` line is new text for the translate bot). On the next push the snapshot
step writes a new `history/products-2026-10-08.js` instead of refusing. Checked
locally: validator 0 / 1, serializer byte-identical, `make-feed.js`,
`build-ontology.js` and `build-history-graph.js` all run (outputs left to the
workflow to commit). Rejected: a changelog entry dated 2026-10-06 so the old
snapshot could be replaced — the change was not made that day.

**For next time:** any change to `data/products.js` needs `meta.lastUpdated`
set to the day it lands and a changelog entry for that day.

## Status

Local branch `feat/yardstick`, one commit, not pushed. Notes moved to `docs/jackson/` at the owner's request, so they can revert or fix it themselves. Verify block: both
treatment-policy outputs byte-identical (line endings only), validator 0 errors
/ 1 warning (GUF), synthetic 0 / 0, `make-preview.js` 168 KB,
`test-build-dataset.js` 28 / 0, country names cover all 252,
`test-build-rbm-pages.js` 25 / 0, `build-locale-pages.js` all checks passed
(fr 99%, pt 99%); rerun after the rebase, plus `test-mail-api.js` 171 / 0. Checked in headless Edge at 1280px and 400px: the page, `/fr`,
and an RBM build reading a local dashboard.json; no sideways scroll at 400px.
