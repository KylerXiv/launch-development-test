# Does everything on the illustrated journey come through the pipelines? Audit and fixes

*Jackson (Oakkar-Min), with Claude Code, 12 Oct 2026. Branch `fix/pipeline-audit`,
from `main` at `ba38495`. Scope chosen by the owner: the illustrated journey
only (the page RBM gets), in all four languages, on the LAUNCH site and in
launch-rbm-test; three questions (facts typed into the page, text that skips the
translate bot, built pages edited by hand); report, and fix on a branch.*

**In one paragraph.** The three repos agree with each other and with a fresh
build from `main`, file for file, and no person has written a translation since
1 Oct. Every visible text on /fr, /pt and /es reaches the Google bot; the only
English left is English on purpose (names, citations, two abbreviations). The
audit found two facts typed into the page instead of read from the data, and
three places where text skipped the bot. The owner decided (12 Oct, §8) to
keep both facts as they are, and to fix the three translation gaps: the RBM
loader's error messages (hand-written in fr/pt/es, now the bot's), the CSV
column names, and the bot's own trigger, which did not start for four of the
files it reads.

Report page for the team (private until shared):
https://claude.ai/artifact/DWvEoXHLWzqYzfkC1riptx.

## At a glance

| Question | Result | Status |
| --- | --- | --- |
| Are the built pages what a build from `main` produces? | 127 of 127 files on the live sites match the repos, which match a fresh build | Pass: nobody edited a built page by hand |
| Does every text reach the translate bot? | 100% of collected strings, fr/pt/es; the browser sweep found no page text outside the pipeline | 3 gaps fixed (RBM error messages, CSV headings, the bot's trigger) |
| Are there facts typed into the page? | 2 found (the disclaimer, the yardstick note) | Kept at first; later on 12 Oct the owner asked for both to read from the data (§9) |

---

## How to undo or change it

- **Everything:** `git revert` the branch's merge commit on `main`, then
  rebuild launch-rbm-test from `main` as usual.
- **The RBM loader messages:** `MSG_EN` in `scripts/build-rbm-pages.js`. Change
  the English there and the matching `src` in `i18n/reviewed-strings.json`
  (`node scripts/assemble-content.js` says if they disagree).
- **CSV headings back to English on every page:** remove the 7 CSV entries
  (`product: "Product"` … `milestoneRow: "Milestone"`) from
  `i18n/reviewed-strings.json`. "Detail", "Next step" and "As of" are
  translated by the ordinary page pass and would need code to keep English.
- **The bot's trigger:** the `paths:` list in `.github/workflows/translate.yml`.
- **The disclaimer and yardstick note:** unchanged from `main`. Data-driven
  versions were built and reverted on the branch: the disclaimer in `da826ed`
  (reverted in `5e8fb2b`), the note in `da826ed` (reverted on 12 Oct, see §8).

## 1. What was checked, and the result

| Check | How | Result |
| --- | --- | --- |
| Data repo = a fresh build from `main` | `build-dataset.js`, compared field by field with `launch-data-test/v1/dashboard.json` | identical apart from the publish stamp (time, approver, commit, hash) |
| rbm-test = a fresh build from `main` | `build-rbm-pages.js`, every file's sha256 | 38 of 38 page and asset files identical; only the manifest's `built_from` and the kept README differ |
| Live sites = the repos | each file fetched and hashed | LAUNCH site 32/32 (page, data and widgets, 4 languages); rbm-test on Pages 47/47 and on Vercel 46/46; data repo 2/2 |
| Nobody translates by hand | every commit since 1 Oct that touched `i18n/translations.json` | 18 bot commits; the 4 by Oakkar-Min are the proposal-test reverts and wrote no translation |
| Every text reaches the bot | translation memory emptied in a scratch copy, every string filled with `[stub-xx]`, then a headless Chrome sweep that opens every row, view, panel, map tab, country page, region, form and menu | 100% of collected strings stubbed; of about 1,565 texts per language, 9 have no stub, all English on purpose (§3) |
| Facts typed into the page | read the whole page script and markup | 2 found (§2) |
| Verify block | CLAUDE.md | as expected (0 errors, 1 warning; tests pass) |

## 2. Facts typed into the page (kept, owner's decision)

| Where | What it says | Why it was flagged | Decision |
| --- | --- | --- | --- |
| Disclaimer, 2nd paragraph | "Country stages in this version are illustrative and have not been verified, except for the Nigeria and Tanzania registrations." | Written 2 Oct. Since 6 Oct both country lists are `status: "verified"`, with a source per country (Pyramax 13, DHA–PPQ 15) | Leave it |
| Yardstick note ("Time taken") | "Expected times: country registration follows a published timeline. The other steps use LAUNCH's working estimates, still to be agreed." | True today, but the data also records which step is published (`basis`), so a change there would leave the note behind | Keep the original wording |

## 3. Text that skipped the translate bot (fixed)

| Where | Before | Fix |
| --- | --- | --- |
| RBM loader messages (shown when dashboard.json cannot load or has a new schema) | fr/pt/es written by hand in `build-rbm-pages.js`, never reviewed (gap 2 of the 9 Oct audit) | Only the English is in the script, one sentence per key. Each sentence is a reviewed-strings entry, so the bot translates it, and the build takes the translation from the memory (`reviewedText()` in `build-locale-pages.js`). Bot only: until the bot has run, a sentence it has not translated shows in English |
| CSV download, /fr /pt /es | 3 column names translated, 7 in English, and the record types "Stage" and "Milestone" in English | Column names and record types are keyed constants (`CSV_COL`, `CSV_REC`), each with its own reviewed entry; all translated, to match the translated contents |
| `translate.yml` trigger | started only for the page, `products.js`, `sources.js`, `assemble-content.js` | also `i18n/reviewed-strings.json`, `assets/report-issue.js`, `assets/site-nav.js`, `scripts/build-rbm-pages.js`. Before, new text in the feedback form or site menu alone waited in English until some other change started the bot. The bot's own commit touches none of them, so it cannot start itself |

**English on purpose (unchanged):** product, INN and manufacturer names; cited
titles and `source` fields (including the procurement citation); the GanLum
acknowledgement; glossary abbreviations (AMA, GMP); country names spelled the
same; "TBC"; unconfirmed price notes (never translated, by design).

## 4. Files changed

| File | Change |
| --- | --- |
| `illustrated-journey-dashboard.html` | CSV `CSV_COL` / `CSV_REC` only (disclaimer and yardstick note as on `main`) |
| `i18n/reviewed-strings.json` | 13 entries: 9 CSV words, 4 loader sentences (156 in all) |
| `scripts/build-rbm-pages.js` | `MSG_EN` + `messages()`; translations read in `main()` after the locale build; `messages` exported |
| `scripts/build-locale-pages.js` | `reviewedText(loc, en)` exported |
| `scripts/test-build-rbm-pages.js` | the hand-written Spanish check replaced by: loader present, messages from the lookup and HTML-escaped, English with no lookup (33 pass) |
| `.github/workflows/translate.yml` | four paths added; comment corrected |

`i18n/content.en.json` is left to the translate bot, as usual; CI builds with
`--allow-stale` until it runs. The bot has 7 new strings per language to
translate: "Product", "Record", "Item", "Date" and three loader sentences (the
other CSV words and the first loader sentence were already in the memory).

## 5. Found, left alone

| Finding | Why left |
| --- | --- |
| The bot rejects 4 strings (es 3, fr 1) because Google drops the PQ/MFT mask, so they stay English (gap 1, 9 Oct) | Owner's decision (12 Oct): leave them to the bot, which retries them on every run |
| "Public-channel procurement (Global Fund)" in the Detail rail names the funder in the label | True for both medicines with figures; the data has no structured funder field to read it from |
| WHO regions (`WHO_REGION`, `REGION_NAME`) are a table in the page, not in the data | Fixed public WHO scheme, documented in the page; region names do reach the bot |
| Stage positions are written into the code (WHO emblem on stage 2, adoption needs on 5, country counts on 4 and 5, the access split at 4, the yardstick clock) | Structure, not facts; reordering stages in `products.js` would need code changes anyway |
| `sinceYearOf()` reads "Since / Depuis / Desde" out of translated text | Works for the four languages; a fifth language must add its word there |
| JSON-LD `SITE` points at kochrisdev.github.io/launch-transparency-dashboard | Not visible; search-engine metadata only |
| iframe-test.html (rbm-test) has hand-written fr/pt/es sidebar labels (gap 4, 9 Oct) | Test shell, not handed over |

## 6. Release

1. Push the branch, open the PR, merge (the owner asked Claude Code to merge).
2. The page changed, so the translate bot starts by itself and translates the
   7 new strings (fr/pt/es).
3. Data repo: nothing to publish (no data or data text changed; Publish now
   would say "No change").
4. Only after the bot's commit is on `main`: pull, then
   `node scripts/build-rbm-pages.js` and
   `node scripts/copy-rbm-pages.js --to ../launch-rbm-test`; commit on
   `update/main-<sha>` in launch-rbm-test, PR, merge. Only the 4 `index.html`
   files and the manifest should change. copy-rbm-pages refuses a build whose
   translations are behind.
5. Check: a CSV from /fr has French column names; in launch-rbm-test the
   loader's `var MSG` holds the bot's wording.

## 7. How it was tested (12 Oct 2026)

- Verify block: `validate-data.js` 0 errors, 1 warning; synthetic 0/0;
  `make-preview.js` ok; `test-build-dataset.js` 30/0; `build-country-names.js
  --check` covers all 252; `normalize-treatment-policy.js` identical apart from
  line endings.
- `test-build-rbm-pages.js` 33/0, `test-copy-rbm-pages.js` 20/0,
  `test-dataset-diff.js` 11/0; no NUL bytes.
- Stub run in a scratch worktree (memory emptied, every string stubbed): locale
  build 100% for fr/pt/es; the RBM loader's `MSG` carries `[stub-xx]` text in
  all three; a CSV downloaded on /fr and /es has every column name and record
  type stubbed.
- Headless Chrome (system Chrome through Playwright), English and the three stub
  languages, every panel opened: 0 script errors.
- After the two reverts: the page differs from `main` only in the CSV code;
  the tests above pass again (dataset test with `--allow-stale`), locale build
  self-check passed, RBM build ok.

**Not checked before the merge:** the real Google output for the new strings
(it runs after the merge); a real phone (no layout changed).

## 8. Decisions (owner, 12 Oct 2026)

| # | Question | Decision |
| --- | --- | --- |
| 1 | The disclaimer's Nigeria/Tanzania sentence, which the data contradicts | Leave it |
| 2 | RBM error messages: keep the fix? | Yes: the bot translates them after the merge; bot-only rule |
| 3 | CSV column names in fr/pt/es | Keep them translated |
| 4 | Yardstick note | Revert to the original wording |
| 5 | The 4 strings Google rejects (PQ/MFT) | Leave them; the bot keeps trying |

## Status

| | |
| --- | --- |
| Branch | `fix/pipeline-audit`: `da826ed` fixes, `5e8fb2b` disclaimer put back, `487dd21` notes, then the yardstick note put back and these notes |
| launch-rbm-test | rebuilt after the bot's commit (§6, step 4) |
| launch-data-test | no change |

## 9. Follow-up: both facts read from the data (12 Oct 2026, later)

The owner reversed §8 #1 and #4: no fact about the data should be typed into
the page. Branch `fix/data-driven-statements`, from `main` at `655c5db`.

| Where | Before | Now |
| --- | --- | --- |
| Disclaimer, 2nd paragraph | "Country stages in this version are illustrative and have not been verified, except for the Nigeria and Tanzania registrations." | `renderDisclaimer()` names the medicines from each `detail.countries.status`: "Country registrations have been verified for: ASPY, DHA–PPQ." and, only if any list is `illustrative` or `draft`, "Country stages have not been verified yet for: …". A medicine with no country list is not named. The legal sentences around it are unchanged |
| Yardstick note ("Time taken") | "Expected times: country registration follows a published timeline. The other steps use LAUNCH's working estimates, still to be agreed." | `yardNote()` lists the steps of each `basis`: "Expected times from a published timeline: Country registration." and "Expected times from LAUNCH's working estimates, still to be agreed: WHO recommendation, …". A line with no steps is left out |

Unlike `da826ed`, each fixed label is a whole literal with no names inside it,
so `assemble-content.js` collects all four for the bot; the names come from
the data (product names stay English, stage names are already translated).
Both fields reach RBM in `dashboard.json`, so the RBM pages follow too.

**Tested:** the CI steps in `validate.yml` pass (`--allow-stale` where CI uses
it). Headless Chrome on the English page and on an RBM build reading a fresh
`dashboard.json`: both sentences show as above; on /fr the stage names are
French and the four labels wait in English for the bot.

**Undo or change:** `git revert` the commit. The wording is the four literals in
`renderDisclaimer()` and `yardNote()` in `illustrated-journey-dashboard.html`.

**After the merge:** the bot translates the four labels and the split
disclaimer paragraph; then rebuild launch-rbm-test from `main` (no data
publish: `dashboard.json` does not change).
