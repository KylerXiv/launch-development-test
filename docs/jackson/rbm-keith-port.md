# Keith's RBM page changes, moved into this repo — and a guard against losing work again

*Jackson (Oakkar-Min), with Claude Code, 9 Oct 2026. Local branch
`port/rbm-keith-changes` (not pushed), on `main` at `88fc717`. In
launch-rbm-test: local branch `docs/built-pages-note`. Nothing is pushed.*

**In one paragraph.** On 8 Oct, Keith (Keith-paradox) made 12 commits straight
to the built pages in `codebyjackson/launch-rbm-test` (merged as #5, main
`453e40d`). He changed `en/`, `fr/` and `pt/` only. The pages there are built
from this repo, so the next rebuild would have replaced all of it without a
word, and Spanish (`es/`) never got it. His changes are now in
`illustrated-journey-dashboard.html`, so the LAUNCH site, /fr, /pt, /es and all
four RBM pages get them. The English RBM page built from this branch matches
Keith's page exactly, apart from one character (§3). His new text now reaches
the translate bot. A stub run leaves **0 strings in English** on /fr, /pt and
/es. A new copy script stops a rebuild that would wipe hand edits in
launch-rbm-test.

---

## 1. What was where (9 Oct, morning)

| Repo | State |
| --- | --- |
| launch-development-test `main` `88fc717` | Builds exactly what rbm-test had before Keith (`145065c`). |
| launch-rbm-test `main` `453e40d` | Keith's 12 commits on top. About 700 changed lines in each of en/fr/pt; es untouched. He wrote the fr/pt text by hand, with Claude Sonnet. |
| launch-data-test `main` `6793ce5` | In step with dev main: `dataset-diff` says "No change". Keith's work is page code, not data, so **nothing to publish**. |

Keith's commits, oldest first: `8a05854` expected time under each step and the
two access groups · `8009069` RBM colours, full width · `0e09313` strip as two
white cards · `3fc7ee5` loader takes more than three languages (main's own
loader already did; the merge kept main's) · `829fe8e` country recommended use
on the map, filters and legends as tables · `8537663` · `b40a8ab` · `e931183`
card look under the map, updates panel removed · `c59beef` Find a country
follows the filters, as a table · `ccaa371` stage and status in one column,
Delayed explains itself · `0b1445e` · `ca902e1`.

## 2. What changed on the branch

| Commit | What |
| --- | --- |
| `ec54451` | Keith's English change applied to the page (all 55 parts applied cleanly). `i18n/reviewed-strings.json`: 8 entries follow changed code, 8 for removed code are gone, 16 new for text the collector cannot find by pattern (single words such as "Group", "Variance", "Country"; lower-case phrases such as "so far", "from expected"; text around `${…}` such as "routine use by ${due}"). Without these, `assemble-content.js` stops ("no longer matches the code") and the bot cannot run. |
| `c8fa76d` | Two gaps the stub run found: (1) the step buttons' screen-reader label ("Step 3, …. Shows what happens here…") was translated on main, and Keith's inline edit cut it apart, so it would have gone back to English. The collector also picked up a code fragment, `` `} aria-label= ``, which the bot would have "translated" and broken. Same output now. (2) "n/a" → "—" (§3). |
| `b2b34f5` | The guard (§5): `build-manifest.json`, `scripts/copy-rbm-pages.js`, its test in `validate.yml`, `rbm/README.md`. The build also leaves out `assets/email/` (the emails' logo), which rbm-test never had. |
| (this commit) | These notes; Kyler's handoff steps and `RBM-public-data-layer.md` now say to use the copy script. |

## 3. Where the result differs from Keith's pages

- **"—" instead of "n/a"** in the Time taken table, for a step with no dates.
  The collector skips text without two letters in a row, so "n/a" would have
  stayed English on every page. "—" is what the page showed before 8 Oct.
- **French and Portuguese wording comes from the Google bot**, not from Keith's
  hand-written text (your rule: only the bot translates; your answer 9 Oct).
  Example: Keith wrote "Accès au marché"; the bot will choose its own.
- **Spanish gets all of it.** It had none of Keith's changes.

## 4. What the LAUNCH site now does differently (your choice: shared page)

Keith's version is now the LAUNCH site's too, so it reverses some earlier
choices there:

- **Sources starts closed** on every screen, like Definitions (you chose "open
  on desktop" on 2 Oct). Its count badge is gone.
- **MFT policy → "Country recommended use"**, with two groups (P. falciparum,
  P. vivax) instead of four. Countries that list a medicine only for untested
  P. falciparum, severe malaria or pregnancy no longer get a border. Both
  groups are ticked when the page opens (before: first-line only).
- **Yardstick:** a difference is a signed "+N years" in RBM blue, not red
  "N yrs late". Open row: Expected / Actual / Variance. "yr" is "year"
  everywhere.
- The hidden "Recent dashboard updates" panel and its code are gone
  (`DATA.changelog` is still built and published).
- Expected time under each step icon; the strip is two cards.

Checked in a headless browser: the LAUNCH page (data from `data/*.js`) loads
with no script errors and shows the two cards, "Before the clock", 4 medicine
rows and "94 of 94" countries.

## 5. The guard

`node scripts/build-rbm-pages.js` writes `dist/rbm/build-manifest.json`: the
sha256 of every file in `en/ fr/ pt/ es/ assets/` (line endings aside), the
commit, and three flags: `clean`, `translations_current`, `test_build`.

`node scripts/copy-rbm-pages.js --to ../launch-rbm-test` copies the build and
leaves the manifest there. Next time, it compares the target's files with that
manifest first. It **stops and changes nothing** when:

| Case | What to do |
| --- | --- |
| a page there changed, went or was added since the last copy (it lists each file and the commit that changed it) | move the change into this repo, merge, rebuild, then `--force` |
| no manifest there yet (today) | check, then `--first-copy` (once) |
| uncommitted changes there | commit or stash |
| test build (`--data-url`, `--api-url`), built from uncommitted files, or before the translate bot caught up | rebuild; no switch for these |

It replaces only `en/ fr/ pt/ es/ assets/` and the manifest. It does not commit;
it prints the commands. Tested by `scripts/test-copy-rbm-pages.js` (20
checks, throwaway git repo, in `validate.yml`). On the real rbm-test today it
refuses, correctly: this branch is not merged and the bot has not run.

## 6. Next steps, in this order

0. **Tell Kyler and Keith now:** no RBM rebuild or copy until step 2 is merged
   (Kyler's handoff says to rebuild "right after the merge, unprompted": a
   rebuild from today's main wipes Keith's work), and no more edits in
   launch-rbm-test pages.
1. **launch-rbm-test:** push `docs/built-pages-note` (README only) and merge.
   Safe any time.
2. **launch-development-test:** push `port/rbm-keith-changes`, open a PR; Kyler
   merges (Vercel blocks deploys of your commits on his project).
3. The translate bot starts by itself on the page change and commits fr, pt
   and es (about 40 new strings). Wait for its commit on `main`.
4. Look at the LAUNCH site in French and Spanish:
   `launch-development-test.vercel.app/fr/illustrated-journey-dashboard.html`
   (and `/es/…`). The new labels should be in French/Spanish.
5. **Rebuild RBM from main:** `git pull`, then
   `node scripts/build-rbm-pages.js` (default flags), then
   `node scripts/copy-rbm-pages.js --to ../launch-rbm-test --first-copy`.
   Expected: the four `index.html` change and `build-manifest.json` is added;
   nothing else. Commit on a branch, push, merge. Then check
   `iframe-test.html#es` and `#fr`.
6. **launch-data-test:** nothing. (`dataset-diff` should still say "No change".)

## 7. Undo or change

- **Undo all of it:** don't push the branch (or revert its merge). Then
  launch-rbm-test keeps Keith's hand-edited pages, but the next rebuild
  replaces them again, and es stays without them.
- **Keep Keith's work on RBM only, not the LAUNCH site:** that needs an
  RBM-only switch in the page. Not built (you chose the shared page).
- **Sources open on desktop again** (your 2 Oct choice): the removed lines are
  in `ec54451` (search `matchMedia("(min-width: 721px)")` in its diff). Put them
  back, with the `srcn` count if wanted.
- **"n/a" back instead of "—":** one line in `yardTable` (`c8fa76d`). It will
  show "n/a" in every language.
- **The guard in the way:** `--force` replaces hand edits; `--first-copy` skips
  the check once when there is no manifest. To drop the guard, delete
  `scripts/copy-rbm-pages.js` and its test line in `validate.yml`. The manifest
  is harmless on its own.
- **A reviewed-strings entry breaks after a page edit:** `node
  scripts/assemble-content.js --check` names it. Fix its `src` to the new code
  (docs/jackson/translation-coverage.md §6).

## 8. Checks (9 Oct 2026)

| Check | Result |
| --- | --- |
| English RBM page from `ec54451` vs rbm-test `453e40d` `en/index.html` | identical (line endings aside); from `c8fa76d` the source differs only in the "—" line, the step label's code (built in two variables first, same output) and their comments |
| Build file list vs rbm-test | same 38 files; only the 4 `index.html` differ |
| Stub translation run (`TRANSLATE_ENGINE=stub`, scratch copy, never committed) | fr 673 / pt 672 / es 672 translated, **0 left in English**; every new string seen as `[stub-xx] …` in the built pages |
| Stub-translated fr, pt, es RBM pages in headless Chrome, live `dashboard.json` | no script errors, no "[object Object]", 4 rows |
| LAUNCH page in headless Chrome | no script errors |
| `validate-data.js` (real, synthetic) | 0 errors, 1 warning (GUF, as before) |
| `test-build-rbm-pages.js` | 31 passed |
| `test-copy-rbm-pages.js` | 20 passed |
| `test-build-dataset.js --allow-stale` / `test-dataset-diff.js` | 30 / 11 passed |
| `test-source-watchers.js` / `test-notify-subscribers.js` | 61 / 67 passed |
| `build-locale-pages.js --allow-stale`, `make-preview.js` | ok |
