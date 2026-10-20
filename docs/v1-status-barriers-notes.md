# Launch v1.0: status words and barrier text hidden

*20 Oct 2026. Branch `feedback/v1-status-barriers`, from `main` at `2836bb6`,
rebased onto `c6cc536`. This is the branch's working-notes document, per
[CLAUDE.md](../CLAUDE.md).*

**In one paragraph.** The partner feedback sheet's "Launch Version 1.0
(Nov 10)" rows ask for the first public release to show where each medicine
is without calling any step delayed or in progress, and without
product-specific barrier text, "to generate stakeholder discussion without
controversial barrier framing". Row 1 (QST / UI): remove "delayed" and "in
progress" across the product pathways; status labels return in a later
phase. Row 2 (QST / Content): remove barrier and access-challenge copy from
product cards and modals; "Exclude ALAQ (content approved as-is); hold final
GanLum adjustments until next week's review." Row 3 (QST / UI): check the
pathway for symbols left without a label; the partners accept unlabelled
symbols for v1. Row 4 (RBM / Unitaid) is post-launch taxonomy work and
changes nothing here. The owner added that ALAQ stays as it is, because its
pathway has one stage so far. Everything is hidden by switches in the page's
script, not deleted, and no data changed.

Before/after screenshots of every view, and the two column options the owner
chose between: <https://claude.ai/artifact/PgiBpqzAR8DwWJ98NBSzJ5> (private
to the owner).

---

## 1. What a reader sees

| Where | Before (ASPY, DHA–PPQ) | After |
| --- | --- | --- |
| Medicines table, status line | "◆ Delayed ⓘ" | stage name and date only |
| Medicines table, last column | "Main barrier" with a phrase | column gone, for all four medicines |
| Timeline, current stage | "Delayed" under the stage | nothing; "since … · N years" stays |
| Timeline, side list | "Ongoing · no date", chips "· ongoing" / "· delayed" | "Not yet dated", plain chips |
| Under the timeline | red ▲ barrier sentence | nothing |
| Stage panel (a marker clicked) | "DELAYED" tag, red edge, red barrier box, "Pending since N years" | none of the four |
| Hover on a marker | "Delayed · Ghana 2022" | "Ghana 2022" |
| Step panel (strip at the top) | "1 delayed · 1 in progress · 2 not started" | no counts |
| Map, Detail rail | barrier sentence under the medicine facts | nothing |
| Pipeline | red "Active bottleneck" dot, ▲ line on hover, legend key | none |
| Screen readers | "… Delayed · Ghana 2022 …", "Stage 5 … 1 delayed" | date only, no count |
| Download CSV, Status column | Delayed / In progress | empty in 11 cells (ASPY 6, DHA–PPQ 5) |

ALAQ and GanLum read exactly as before, apart from the missing column.

---

## 2. Decisions

1. **Hidden by switches, not deleted.** `SHOW_PROGRESS`, `PROGRESS_KEPT` and
   `SHOW_BARRIERS` sit beside `LABEL` in
   `illustrated-journey-dashboard.html`; Pipeline has its own
   `SHOW_BARRIERS`. The same pattern as `YARD_COMPARE` (15 Oct). Row 1 says
   the labels come back "in a later phase", so turning them back on is one
   word each. *Rejected:* deleting the code. It would have to be rewritten,
   and nine of its strings are pinned in `i18n/reviewed-strings.json`, which
   stops the build when a pinned snippet disappears.

2. **The page changes; the data does not.** *Rejected:* emptying `flag` and
   `barrier` and moving `late` stages to `prog` in `data/products.js`. That
   moves `meta.lastUpdated`, takes a history snapshot, wants a changelog line
   (an email to every subscriber, and a "Recent updates" entry announcing the
   removal), and needs "Publish now" for RBM. It would also lose the content
   the partners mean to reintroduce. Cost of this choice: RBM's public
   `dashboard.json` still holds every status and barrier (§4).

3. **ALAQ keeps "In progress"; GanLum is left as it is.** ALAQ: the owner,
   20 Oct ("the pathway only has one stage so please leave as it is"), and the
   sheet ("content approved as-is"). GanLum: the sheet holds its adjustments
   for the partners' review the week after. GanLum has no `prog` or `late`
   stage, so on the page nothing changes either way; its one `prog`
   milestone ("SRA dossier submission", label "In preparation") showed only
   in the CSV, where hiding it would have been the one GanLum change. Both
   are in `PROGRESS_KEPT`. *Rejected:* hiding for every medicine, against both
   instructions.

4. **The Main barrier column is removed for all four medicines (the owner's
   choice, option A).** Two options were shown on real screenshots.
   *Rejected (B):* keep the column, with ALAQ's and GanLum's "No publicly
   documented barrier identified" beside two empty cells, which reads as if
   something was taken out for ASPY and DHA–PPQ. Showing "No publicly
   documented barrier" for those two was never an option: it would be false.
   With the column gone the other tracks take the room; "Stringent Regulatory
   Approval (SRA)" fits on one line at 1440px. `.board.nobar .srow` repeats
   each of the five width rules with the last track removed.

5. **The step panel's counts go whole.** With "delayed" and "in progress"
   hidden, stage 5's counts would have read "2 not started": two of four
   medicines, under a label saying it is the status of all four. The table
   still lights the step's column, which shows where each medicine is. The
   empty holder is hidden by `.gw-sum:empty`, not by skipping it: wrapped in
   a `${…}` its aria-label ("Status of the ${tracked.length} medicines at
   this stage") left the translation collector's reach, and would have come
   back English for good once the switch is turned on.

6. **"Ongoing · no date" becomes "Not yet dated".** Both are neutral about
   pace; "Not yet dated" was already in the translation memory (key
   `49e54f5c4a2fdc6c`, no longer used anywhere), so French, Portuguese and
   Spanish show it translated at once. *Rejected:* a new heading ("Other
   stages · no date"). When this was built the translate bot had failed since
   13 Oct (Google "API Key not found"; it ran again later on 20 Oct, after
   #122 and #123), and the owner's rule of 2 Oct is that translations come
   from the bot, not by hand, so a new string would have stayed English on
   three pages. The Portuguese reads "Ainda não tem data." with a full stop.

7. **The marker labels keep their exact text.** The aria-label
   `${esc(STAGES[i])}. ${esc(peekLine(st.status, st.date, st.nextDate))}.
   Opens the full detail.` is translated as one string, code and all. Passing
   the medicine into `peekLine` changes that text and its key: every marker on
   `/fr`, `/pt` and `/es` would say "Opens the full detail" in English until
   the bot ran, and the bot would then send Google a string with code in both
   placeholders, the kind it has mangled before (#122 exists for that).
   Instead `stageMarkHtml` and the pathway-order rail each declare a
   local `peekLine = peekLineFor(p)`, which shadows the shared one. One label
   reads with a doubled stop: DHA–PPQ's In-country delivery (in progress, no
   date) is "In-country delivery. . Opens the full detail." Accepted; screen
   readers pause and move on.

8. **Removed as delay framing:** "Pending since N years" (shown in red) and
   the stage panel's red edge. **Kept:** the line "since WHO strong
   recommendation (2022) · 4 years" under the timeline's current stage, which
   labels the red bar and states a time with no verdict, and the Access
   column's "4 years so far" / "11 years so far" (agreed 19 Oct,
   [access-milestones-notes.md](access-milestones-notes.md)).

9. **Row 3: the symbols stay.** ✓ › ! and the dashed ring, their green, amber
   and red, the red diamond in the journey dots, the red timeline bar, and
   the milestone table's › and ! tags (their text is the data's own label,
   e.g. "7 countries, plus 4 with MFT plans"). Checked at 1440, 1100, 800 and
   390px: no empty boxes, no orphaned ⓘ buttons, no gaps.

10. **Stage notes are left as written (owner, 20 Oct).** Four phrases lean on
    challenge framing: ASPY In-country delivery "Routine delivery limited;
    concentrated in pilot and study settings", ASPY Procurement "modest
    overall", DHA–PPQ Procurement "have stayed small", DHA–PPQ Country
    registration "(registrations not being maintained, itself an underuse
    signal)". Rewording them is a data change, with the costs in decision 2
    and English text on three pages until the bot works.

11. **Pipeline is included; the generated editions are not.** Pipeline is in
    the site menu and showed the barrier on hover. `unitaid/pipeline.html` and
    `synthetic/pipeline.html` were not rebuilt: their builders are behind the
    sources, and a rebuild changed about 350 lines across five files (Story
    pages, `synthetic/index.html`'s site address), almost none of it this
    change. Neither edition is in the menu or in RBM's copy.

---

## 3. Found in passing

- **Fixed: "Access" headed the barrier column at 681–1040px.** The rule that
  hides the Access cells there (`.srow .c-path`) lost to the header's own,
  more specific `.srow.hd .c-path { display: flex }`, so the header kept
  "ACCESS ⓘ" over the fifth track (the barrier column) and pushed "MAIN
  BARRIER" onto a second line. Live on `main` today. One selector added.
- **Left: on ASPY's timeline the WHO PQ marker covers "2012" under SRA.**
  Same on `main`; not from this change.
- **Left: `unitaid/` and `synthetic/` editions are behind their sources**
  (decision 11).
- **Left: [user-guide.md](user-guide.md) describes the old journey board**
  (the retired GitHub Pages address, the status legend and the red flag
  sentence). It was out of date before this change.
- **Known gap: RBM's `dashboard.json` is public and still carries `late`,
  `flag` and `barrier`.** The pages no longer show them; anyone reading the
  file can.

---

## 4. Not changed

- `data/products.js`, so `meta.lastUpdated` stays 2026-10-19: no snapshot,
  no changelog line, no subscriber email, no "Publish now".
- The "Recommended · underutilized" chip and Pipeline's "Marketed,
  underutilized": LAUNCH's own category for these two medicines, not a
  barrier statement.
- "Why it can stall" in the step panels: it describes the step in general.
- The root page (design option A), option B, the widget, Story: not in the
  menu or in RBM's copy.

---

## 5. Turning it back on

Set `SHOW_PROGRESS` or `SHOW_BARRIERS` to `true` in
`illustrated-journey-dashboard.html` (and `SHOW_BARRIERS` in `pipeline.html`).
Remove ALAQ and GanLum from `PROGRESS_KEPT` once they are no longer special.
Then rebuild RBM's copy. Nothing else depends on them.

---

## 6. Status

- Branch `feedback/v1-status-barriers`, one commit, rebased onto `c6cc536`
  (main after #122 and #123, which brought the translate bot back). With
  that memory the French, Portuguese and Spanish pages build at 100%
  coverage, this change included.
- Files: `illustrated-journey-dashboard.html`, `pipeline.html`,
  `i18n/reviewed-strings.json` (one entry, "Not yet dated"),
  `docs/data-analyst-guide.md` (a note under §2), this file.
- Checked locally: validator 0 errors, 1 warning (French Guiana, as
  expected); synthetic 0/0; `make-preview.js`; `build-country-names.js
  --check`; French, Portuguese and Spanish pages build and pass their
  self-check, with the new heading translated; CI's dataset steps
  (`build-dataset.js`, `test-build-dataset.js` 30 passed,
  `test-dataset-diff.js` 11 passed, all `--allow-stale` as in CI); RBM pages
  (`test-build-rbm-pages.js` 34, `test-copy-rbm-pages.js` 20,
  `build-rbm-pages.js`); `test-source-watchers.js` 66;
  `test-notify-subscribers.js` 67. No page errors in Chrome.
- `i18n/content.en.json` is one string behind ("Not yet dated") until the
  translate bot runs after the merge, as for every page change.
- After the merge: rebuild RBM's pages and copy them to `launch-rbm-test`
  (page change only; the data is unchanged, so no "Publish now").
