# The illustrated journey moves to index.html

*20 Oct 2026. Branch `feat/dashboard-at-index`, from `main` at `27e434e`.
This is the branch's working-notes document, per [CLAUDE.md](../CLAUDE.md).*

**In one paragraph.** The owner wanted the Launch v1.0 dashboard (the
illustrated journey after `bc1709d`, which hides "Delayed", "In progress" and
barrier text) to be the site's front page. They also wanted the version from
just before that change kept, but not linked. `index.html` is now the v1.0 page,
byte-identical to `illustrated-journey-dashboard.html` at `bc1709d`.
`illustrated-journey-dashboard.html` is back to its state at `174b68e`
(`bc1709d^`). Everything that pointed at the dashboard now points at
`index.html`: the site menu, links between pages, the fr/pt/es builds, the RBM
build, the translate bot, the email links and the PR preview. The page that
used to be `index.html`, the original "LAUNCH Transparency Dashboard" (design
option A, journey board), is gone, and so are the `unitaid/` and `synthetic/`
editions generated from it and its sibling pages.

---

## 1. Decisions

**Which "old version".** `bc1709d^` (`174b68e`), the page just before
Launch v1.0. The owner chose this over going back to before the 19 Oct partner
feedback or before the 15 Oct feedback. The only difference between the two
files today is that one commit: 99 lines of `illustrated-journey-dashboard.html`
by `git diff --stat`. `pipeline.html` keeps its own v1.0 switch
(`SHOW_BARRIERS`) from `bc1709d`. Only the dashboard was reverted.

**Everything moves, not just the links.** The alternative was to change only
the menu and page links. Then the fr/pt/es pages, the RBM pages and the
`dashboard.json` checks would still have been built from
`illustrated-journey-dashboard.html`, the *old* version, so the English page
and its translations would have drifted apart. The owner chose to move
everything.

**The old journey board and its editions are dropped, not renamed.**
Overwriting `index.html` removed design option A. Three choices were offered:
keep it under a new name, drop it and its editions, or rebuild the editions
from the new page. The owner chose to drop it. That took with it:

- `unitaid/` (brand edition of index, option-b, pipeline, story) and
  `scripts/build-unitaid-theme.js`
- `synthetic/` (fictional-data edition of index, option-b, pipeline, story,
  widget) and `scripts/build-synthetic-edition.js`
- the `/(unitaid|synthetic)/` filter in `assets/site-nav.js`, which hid the
  menu's illustrated-journey link inside those folders
- their lines in `scripts/build-public-site.sh`, and the deployed copy of
  `data/products.synthetic.js`, which only the synthetic edition loaded

`data/products.synthetic.js` itself stays. CI still validates it, and
`test-serializer.js` and the ontology build use it as test data.

**The old page stays deployed, behind a redirect (follow-up, 21 Oct 2026).**
`illustrated-journey-dashboard.html` is still copied into `public-site/`. But
the file is the pre-v1.0 page. Anyone arriving at its address from an email
already sent or an old bookmark would have seen "Delayed" and barrier text
again, which v1.0 (#124) hid at the partners' request. `vercel.json` now
redirects that address to `/`.

The French, Portuguese and Spanish pages had the same problem in another
form. This branch builds them as `/fr/index.html` and so on, and no longer
builds `/fr/illustrated-journey-dashboard.html`. That address answered 200 on
the live site on 21 Oct 2026, so without a redirect it would have become a
404. A second rule sends `/:lang(fr|pt|es)/illustrated-journey-dashboard.html`
to `/:lang/`.

- **Temporary (307), not permanent (308).** Browsers cache a permanent
  redirect with no expiry. If the owner wants the old address back while the
  site is still in testing, people who had already followed a 308 would keep
  being sent to `/`. Make the redirects permanent at go-live.
- **The file is not deleted from the build.** Removing it would have the
  same effect for visitors. But the redirect is two lines to undo, and keeps
  Keith's choice to leave the file in place.
- Vercel applies `redirects` before it looks for a file, so the redirect wins
  even though the file is still deployed. Checked on this follow-up's preview.

**Email link is `/`, not `/index.html`.** `api/_mail.js` `DASHBOARD` was
`/illustrated-journey-dashboard.html` and is now `/`, the cleaner public
address for the same file. `scripts/test-mail-api.js` checks for
`href="https://<host>/"`. The report fixture's `page.url` is `/index.html`,
a real address a reporter could submit from, so the "page it came from" check
stays specific.

**No translation approvals voided.** The `file` field in
`i18n/reviewed-strings.json` (110 entries) was renamed to `index.html`, and
`i18n/content.en.json` was regenerated: only the `where` fields changed. The
`contentHash` is unchanged at `e9fa14d1…`, because `where` is excluded from
it by design (`assemble-content.js`, `contentHashOf`).

**Expected time under each stage: hidden on `index.html` (owner, 20 Oct
2026).** The pathway strip's "N years expected" tags (2, 1.5, 2, 2, 2, 3),
kept on 15 Oct (`01b213a`), are gone from every stage. The words also go from
each stage button's screen-reader label (", expected 2 years"). A new switch,
`SHOW_STAGE_EXPECTED = false`, sits beside `YARD_COMPARE`. This follows the
v1.0 pattern: hidden, not deleted. The other route was to remove the
`yardstick` block from `data/products.js`. It was rejected for three reasons:
`illustrated-journey-dashboard.html` (kept unchanged) reads the same file and
would lose its tags too, a data edit moves `lastUpdated` and emails
subscribers, and turning the tags back on would then mean restoring data.
The translated strings ("expected") are untouched, so the fr/pt/es pages
follow and `contentHash` is unchanged. Checked headless (Chrome, file URL):
9 stage buttons, 0 tags rendered, 0 labels with "expected".

**Grey line under each medicine's current stage: hidden (owner, 20 Oct
2026).** In the medicines table's "Current stage · Status" cell, the grey
third line (the first clause of the current stage's `date`, e.g. "Phase III
targeted completion 2025–26", "Ghana 2022", "Since 2008", "Regulatory
submission in preparation") is gone for all four medicines. The new switch is
`SHOW_STAGE_NOTE = false`, beside `SHOW_BARRIERS`. Two options were put to
the owner: remove only the grey line, or remove the status word too and leave
the stage name alone. The owner chose the grey line only, so ALAQ's "In
progress" and the "Not started" words stay as v1.0 set them. The date itself
is not lost: it still shows in the journey's hover line (`peekLine`), the
stage panel's "Recorded" row and the CSV. No data or translated strings
changed (`contentHash` unchanged). Checked headless: 4 stage cells, each with
its stage name and status word only.

**Status gets its own column again; a dash where it is hidden (owner, 20 Oct
2026).** The medicines table's "Current stage · Status" cell (one cell since
8 Oct) is now two columns: "Current stage" (the stage name) and "Status" (the
status word, or "—"). ASPY and DHA–PPQ have their "Delayed" hidden by v1.0's
`SHOW_PROGRESS`, so they show the dash. ALAQ ("In progress") and GanLum ("Not
started") show their word. Four options went to the owner. The recommended
one was "4 of 8 stages complete", a plain count with no judgement in it. The
others were the count on every row, and status word plus count. The owner
chose the dash. Two more were rejected before the question was asked:
- **"Next step":** DHA–PPQ's reads "Verify 2025 surge holds in next quarterly
  PQR extract", an analyst note.
- **"Ongoing" or "Under way":** "In progress" in other words, which is what
  the partners asked to drop.

The dash is `aria-hidden`, so a screen reader reads nothing where no status
is shown, rather than "em dash".

Layout. Each `.srow` is its own grid, so the status track is a fixed width:
112px, or 104px at 681–860px. Both grid sets, the live `.nobar` and the one
used when `SHOW_BARRIERS` is true, gained the track at every breakpoint. The
stage track's minimum went down by 10–20px to make room. On phones (≤680px)
the stage cell is hidden, as its name already was, and the status or dash
sits where it did before, beside the medicine name. Status words now wrap
inside the column: French "Pas encore commencé" is wider than 104–112px, and
unwrapped it ran into the Access column at 1100px and past the board's edge
at 700px. Checked in headless Chrome:
- English at 1440, 1100 and 1000px
- French at 1100 and 700px
- English and French at 390px, in an iframe (headless Chrome on Windows
  will not make a window that narrow)
- with `SHOW_BARRIERS` flipped in a throwaway copy, at 1440, 1100 and 1000px

Translation. Both headers were already translated: "Current stage" (Stade
actuel, Estágio atual, Etapa actual) and "Status" (Statut, Estatuto, Estado).
"Status" only reaches the new header through a new
`i18n/reviewed-strings.json` entry, `<span class="c-stat">Status</span>`.
Without it, fr, pt and es showed "Status" in English. No new strings need
translating. One string went: "Current stage · Status". `content.en.json` was
regenerated, so `contentHash` moved from `e9fa14d1…` to `da61980a…`, the same
change the translate bot would make. The French headers now say "Stade
actuel" where the combined header said "Étape actuelle". That is the
existing translation of "Current stage", not a new one.

**No red: a delayed step is drawn as in progress (owner, 20 Oct 2026).**
v1.0 hid the word "Delayed" but kept its symbols. The red diamond in the
Journey column, the red ring and "!" on the timeline, and the red bars,
chips, pills and panel edges all still said "delayed" without the word. Now
ASPY's National policy adoption and DHA–PPQ's Procurement, the only two
`late` stages (no milestone is `late`), look in progress everywhere: an
amber ring and ›.
- **How.** A new switch, `SHOW_LATE = false`, beside the other v1.0 switches.
  It turns every `late` stage and milestone into `prog` in the page's own copy
  of the data before anything is drawn.
- **Why at load.** About eight places draw from the status (CSS classes
  `md.late`, `s-late`, `dot.late`, `m-late`, the `.tsa` run, point and now
  marker, `gatepanel.late`, `gp-pill.late`, `pill.late`). Changing each one was
  rejected: one missed means one red mark left. One switch catches them all.
- **What stays.** `data/products.js` and `dashboard.json` keep `late`, so
  turning the switch back on restores the red.
- **Consequences.** The CSV is unchanged: the status column was already empty
  for ASPY and DHA–PPQ under `SHOW_PROGRESS`. With `SHOW_PROGRESS` back on and
  `SHOW_LATE` still off, the two would read "In progress"; turn both on
  together.
- **Checked** headless: 0 `late` classes and 0 "!" markers in the rendered
  page, 45 in-progress ones. Screenshot of the table with ASPY's timeline open:
  amber only. Translation is unchanged (100%); the pipeline page already shows
  no red (its `SHOW_BARRIERS`).

**Timeline blocks no longer overlap or get cut off (owner, 20 Oct 2026).**
On the Actual timeline, stages less than 21% apart on the axis stack in
tiers. The tiers used a fixed gap (`TH = 104`px), and the box reserved a fixed
126px for the last block. Both were estimates for English, and two timelines
broke them in all four languages:
- **ASPY:** the SRA block (icon, three label lines, "2012") is 110px, so its
  year ran under the WHO PQ listing icon stacked below it.
- **GanLum:** the current-stage block, with "Not started" and the "since R&D
  and Clinical (2025) · 1 year" line, is 165px in English and 201px in
  French. Its last lines were cut off under "More detail"; in French the
  whole "since" line was hidden.

Fix: `fitTimeline()` measures the blocks once a timeline is visible. Each
tier goes under the tallest block of the tier above, with a 10px gap, and the
box grows to hold the last one, never shrinking below the old estimate.
- **When it runs.** Rows start closed, so a `ResizeObserver` runs it on a
  timeline's first non-zero width and again if the width changes. That covers
  opening a row, switching back to Actual timeline, and resizing. Its own
  height change does not change its width, so it cannot loop.
- **Late fonts.** `document.fonts.ready` refits open timelines, for a web font
  that arrives late (RBM's skin).
- **Rejected: a bigger fixed `TH`.** Any fixed number is a guess at the
  longest translation, and it adds empty space to every stacked timeline.

Checked with every timeline open in en, fr, pt and es: no overlapping blocks
and nothing past its box. The test harness measured the first page it loaded
before the observer had run, whichever page that was; the same page loaded
second was correct. Screenshots of the real pages loaded directly: ASPY en
and es, GanLum en and fr. No translated text changed.

## 2. Deferred, or left alone on purpose

- `data/sources.js` line 7 and `data/products.synthetic.js` lines 11-12 still
  name the old page or the synthetic edition in comments. They were left
  alone because an edit under `data/` can start the publish and
  subscriber-email flow (see `bc1709d`'s message). Fix them with the next
  real data change.
- `i18n/translations.json` still says `illustrated-journey-dashboard.html` in
  102 `where` fields. That is the bot's memory, and the field is a location,
  not content. The bot rewrites it as strings are translated again.
- `docs/developer-guide.md` §4, "Rendering pipeline", describes the old
  journey board. It is flagged as out of date, not rewritten. §10 (design
  options) and `explainer.html` still treat option B as one side of an A/B
  choice whose A is gone.
- `scripts/build-map-geo.js` line 7 and the dated notes in `docs/` name
  `illustrated-journey-dashboard.html` as history. They are left as written.
- `option-b.html` linked to both "Journey board (A)" and "Illustrated
  journey". Both would now open `index.html`, so it has one link.
- `scripts/test-serializer.js` fails 2 checks on CRLF line endings
  (`"host"` line). It fails the same way on a clean `main` (checked in a
  worktree at `27e434e`) and is not in CI. Not touched.

## 3. The three repositories after this branch (checked 20 Oct 2026)

Checked against the data-flow note "Three repositories, one direction"
(20 Oct 2026): workspace → `launch-data-test` → `launch-rbm-test`.

- **launch-data-test (the public data file): nothing to do.**
  - `v1/dashboard.json` holds data only, no page labels. Nothing in that repo
    names a page, so the move to `index.html` does not reach it.
  - A build from this branch gives a `data` block identical to the published
    one (4 products, 44 sources, 32 changelog entries, same translation
    coverage).
  - Only the envelope's `content_hash` differs, because it hashes the page's
    English text too. `dataset-diff.js` compares `data` alone, so a publish
    reports "Nothing to publish". The published hash catches up at the next
    real data approval.
  - `publish-dataset.yml` runs without `--allow-stale`, so it would stop on a
    stale `content.en.json`. This branch commits it current.
- **launch-rbm-test (RBM's pages): needs the by-hand design copy.**
  - Its `main` was built from `27e434e`, today's `main`, so it has v1.0 but
    none of this branch's three table and pathway changes.
  - The pages check only `schema_version` (1) of `dashboard.json`, so no
    data-side change is needed.
  - The copy is `build-rbm-pages.js` then `copy-rbm-pages.js --to
    ../launch-rbm-test`. It refuses a build that is uncommitted, a test build,
    or one made before the translate bot caught up.
  - Its README named `illustrated-journey-dashboard.html` as the source page;
    corrected there.
  - The local checkout was on `feat/expected-time-access-groups`, merged as
    PR #5 on 8 Oct and 52 commits behind `main`. That branch's hand edits
    introduced the expected-time tags, the merged stage/status cell and the
    step note; this branch now changes all three at the source.
- **Translation: complete.**
  - `build-locale-pages.js` in strict mode, as the bot runs it: fr 760, pt
    759, es 759 strings translated, 0 left in English, 100%.
  - The bot runs on the merge (`index.html` and `i18n/reviewed-strings.json`
    are in its path filter). It should find nothing new to translate, because
    `content.en.json` is committed current here.

## 4. Status

- **Follow-up, 21 Oct 2026:** branch `fix/old-dashboard-redirects` on top of
  `fba200d` adds the two redirects (`vercel.json`) and this file's redirect
  paragraph. It is meant to merge straight after #125.
- Branch `feat/dashboard-at-index`, four commits (move to `index.html`,
  expected time, grey line, Status column), pushed for a PR into `main`.
- Verify block: treatment policy byte-identical. Validator: 0 errors, 1
  warning (GUF). Synthetic: 0/0. `make-preview` OK.
  `test-build-dataset` 30/0. Country names cover all 252.
- Also run: `build-locale-pages --allow-stale`, all checks passed and the
  output is `dist/locale/{fr,pt,es}/index.html`. `test-build-rbm-pages`
  34/0, `test-copy-rbm-pages` 20/0, `build-rbm-pages --allow-stale` OK.
  `test-mail-api` 194/0, `test-notify-subscribers` 67/0,
  `test-source-watchers` 66/0. `assemble-content --check` is current.
- `bash scripts/build-public-site.sh`: index, fr/pt/es `index.html`,
  explainer, option-b, pipeline, widget and the kept
  `illustrated-journey-dashboard.html`. No `unitaid/` or `synthetic/`. The
  menu's language switch is live and links `index.html`.
- No NUL bytes in any changed file, counted in Python.
- Not checked in a browser. `index.html` is byte-identical to the dashboard
  already on `main`, and the menu's only change is the link target. Still,
  open `/` and `/fr/` once on the PR preview.
- Files: `index.html`, `illustrated-journey-dashboard.html`,
  `assets/site-nav.js`, `option-b.html`, `pipeline.html`, `story.html`,
  `editor.html`, `explainer.html`, `api/_mail.js`,
  `scripts/{assemble-content,build-locale-pages,build-rbm-pages,test-build-rbm-pages,test-mail-api,copy-rbm-pages,normalize-treatment-policy,rbm-skin}.js`,
  `scripts/build-public-site.sh`, `.github/workflows/{translate,pr-preview}.yml`,
  `i18n/{reviewed-strings,content.en}.json`, `README.md`,
  `docs/developer-guide.md`, this file. Deleted: `unitaid/`, `synthetic/`,
  `scripts/build-unitaid-theme.js`, `scripts/build-synthetic-edition.js`.
