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

**The old page stays deployed.** `illustrated-journey-dashboard.html` is
still copied into `public-site/`, so links in emails already sent and old
bookmarks still open a page rather than a 404. That page is now the
pre-v1.0 one, though, and shows "Delayed" and barrier text again to anyone
who arrives that way. If that is not wanted, add a Vercel redirect from
`/illustrated-journey-dashboard.html` to `/`. That leaves the file untouched
but makes it unreachable.

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

## 3. Status

- Branch `feat/dashboard-at-index`, not committed or pushed yet.
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
