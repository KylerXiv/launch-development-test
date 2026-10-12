# Does everything on the illustrated journey come through the pipelines? Audit and fixes

*Jackson (Oakkar-Min), with Claude Code, 12 Oct 2026. Branch `fix/pipeline-audit`
(local, not pushed), on `main` at `ba38495`. Scope chosen by the owner: the
illustrated journey only (the page RBM gets), in all four languages, on the
LAUNCH site and in launch-rbm-test; three questions (facts typed into the page,
text that skips the translate bot, built pages edited by hand); report, and fix
on a local branch.*

**In one paragraph.** The three repos agree with each other and with a fresh
build from `main`, file for file, and no person has written a translation since
1 Oct. Every visible text on /fr, /pt and /es reaches the Google bot; the only
English left is English on purpose (names, citations, two abbreviations). The
audit found two facts typed into the page instead of read from the data (one of
them wrong today: the disclaimer said country stages are unverified except
Nigeria and Tanzania, while both lists have been verified since 6 Oct), and
three places where text skipped the bot: the RBM loader's error messages
(hand-written in fr/pt/es), seven CSV column names, and the bot's own trigger,
which did not start for four of the files it reads. All five are fixed here.
Five smaller findings are left alone, with the reasons in §5.

---

## How to undo or change it

- **Everything:** do not merge the branch, or `git revert` its commit after the
  merge. Then rebuild launch-rbm-test from `main` as usual.
- **Only the disclaimer:** in `illustrated-journey-dashboard.html`, delete
  `<p id="disc-countries" hidden></p>` and the small function after `tracked`
  that fills it, and put back your own sentence in the paragraph above. The
  data-driven sentence names a medicine only when its
  `detail.countries.status` is not `"verified"`; today none is named.
- **The yardstick note's wording:** `yardNote` in the page. Which steps it names
  comes from `yardstick.expected[i].basis` in `data/products.js` (`"published"`
  or `"estimate"`).
- **The RBM loader messages:** `MSG_EN` in `scripts/build-rbm-pages.js`. Change
  the English there and the matching `src` in `i18n/reviewed-strings.json`
  (`node scripts/assemble-content.js` says if they disagree).
- **The bot's trigger:** the `paths:` list in `.github/workflows/translate.yml`.

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

## 2. Facts typed into the page

| Where | What it said | Why it is wrong | Fix |
| --- | --- | --- | --- |
| Disclaimer, 2nd paragraph | "Country stages in this version are illustrative and have not been verified, except for the Nigeria and Tanzania registrations." | Written on 2 Oct. Since 6 Oct both country lists are `status: "verified"`, with a source per country. Found on 7 Oct, not fixed then | The clause is removed. A new sentence, built from the data, names any medicine whose country data is not verified: "Country stages for X are illustrative and have not been verified." Hidden today |
| Yardstick note ("Time taken") | "country registration follows a published timeline. The other steps use LAUNCH's working estimates" | True today, but the data already says which step is published (`basis`); a change there would leave the note wrong | The note names the steps whose `basis` is `"published"`. It now reads "Expected times from a published timeline: Country registration." |

## 3. Text that skipped the translate bot

| Where | Before | Fix |
| --- | --- | --- |
| RBM loader messages (shown when dashboard.json cannot load or has a new schema) | fr/pt/es written by hand in `build-rbm-pages.js`, never reviewed (gap 2 of the 9 Oct audit) | Only the English is in the script, one sentence per key. Each sentence is a reviewed-strings entry, so the bot translates it, and the build takes the translation from the memory (`reviewedText()` in `build-locale-pages.js`). The first sentence is already translated (it is also the page's own error banner); the other three stay English until the bot runs |
| CSV download, /fr /pt /es | 3 column names translated, 7 in English, and the record types "Stage" and "Milestone" in English | Column names and record types are keyed constants (`CSV_COL`, `CSV_REC`), each with its own reviewed entry |
| `translate.yml` trigger | started only for the page, `products.js`, `sources.js`, `assemble-content.js` | also `i18n/reviewed-strings.json`, `assets/report-issue.js`, `assets/site-nav.js`, `scripts/build-rbm-pages.js`. Before, new text in the feedback form or site menu alone waited in English until some other change started the bot. The bot's own commit touches neither, so it cannot start itself |

**English on purpose (unchanged):** product, INN and manufacturer names; cited
titles and `source` fields (including the procurement citation); the GanLum
acknowledgement; glossary abbreviations (AMA, GMP); country names spelled the
same; "TBC"; unconfirmed price notes (never translated, by design).

## 4. Files changed

| File | Change |
| --- | --- |
| `illustrated-journey-dashboard.html` | disclaimer clause removed, `#disc-countries` added and filled from the data; `yardNote` from `basis`; CSV `CSV_COL` / `CSV_REC` |
| `i18n/reviewed-strings.json` | 13 entries: 9 CSV words, 4 loader sentences (156 in all) |
| `scripts/build-rbm-pages.js` | `MSG_EN` + `messages()`; translations read in `main()` after the locale build; `messages` exported |
| `scripts/build-locale-pages.js` | `reviewedText(loc, en)` exported |
| `scripts/test-build-rbm-pages.js` | the hand-written Spanish check replaced by: loader present, messages from the lookup and HTML-escaped, English with no lookup (33 pass) |
| `.github/workflows/translate.yml` | four paths added; comment corrected |

`i18n/content.en.json` is left to the translate bot, as usual; CI builds with
`--allow-stale` until it runs.

## 5. Found, left alone

| Finding | Why left |
| --- | --- |
| The bot rejects 4 strings (es 3, fr 1) because Google drops the PQ/MFT mask, so they stay English (gap 1, 9 Oct) | The fix (send as HTML with `translate="no"` spans) can only be proved with the real Google key in CI |
| "Public-channel procurement (Global Fund)" in the Detail rail names the funder in the label | True for both medicines with figures; the data has no structured funder field to read it from |
| WHO regions (`WHO_REGION`, `REGION_NAME`) are a table in the page, not in the data | Fixed public WHO scheme, documented in the page; region names do reach the bot |
| Stage positions are written into the code (WHO emblem on stage 2, adoption needs on 5, country counts on 4 and 5, the access split at 4, the yardstick clock) | Structure, not facts; reordering stages in `products.js` would need code changes anyway |
| `sinceYearOf()` reads "Since / Depuis / Desde" out of translated text | Works for the four languages; a fifth language must add its word there |
| JSON-LD `SITE` points at kochrisdev.github.io/launch-transparency-dashboard | Not visible; search-engine metadata only |
| iframe-test.html (rbm-test) has hand-written fr/pt/es sidebar labels (gap 4, 9 Oct) | Test shell, not handed over |

## 6. After the merge

1. Kyler merges. The page changed, so the translate bot starts by itself and
   translates the 12 new strings (fr/pt/es).
2. Data repo: nothing to publish (no data or data text changed; Publish now
   would say "No change").
3. Pull `main`, then `node scripts/build-rbm-pages.js` and
   `node scripts/copy-rbm-pages.js --to ../launch-rbm-test`; commit on
   `update/main-<sha>` in launch-rbm-test, PR, merge. Only the 4 `index.html`
   files and the manifest should change. Do not rebuild before the bot's
   commit: copy-rbm-pages refuses a build whose translations are behind.
4. Check: the disclaimer has no Nigeria/Tanzania sentence in any language; a
   CSV from /fr has French column names; in launch-rbm-test the loader's
   `var MSG` holds the bot's wording.

## 7. How it was tested (12 Oct 2026)

- Verify block: `validate-data.js` 0 errors, 1 warning; synthetic 0/0;
  `make-preview.js` ok; `test-build-dataset.js` 30/0; `build-country-names.js
  --check` covers all 252; `normalize-treatment-policy.js` identical apart from
  line endings.
- `test-build-rbm-pages.js` 33/0, `test-copy-rbm-pages.js` 20/0,
  `test-dataset-diff.js` 11/0; `assemble-content.js --check` current with the
  regenerated content file; no NUL bytes.
- Stub run in a scratch worktree (memory emptied, every string stubbed):
  locale build 100% for fr/pt/es (684 strings); the RBM loader's `MSG` carries
  `[stub-xx]` text in all three.
- Headless Chrome (system Chrome through Playwright), English and the three stub
  languages, every panel opened: 0 script errors. English differs from `main`
  only in the disclaimer and the yardstick note. CSV downloaded in en/fr/es:
  every column name and record type stubbed in fr/es.
- Forced case (built copies only): DHA–PPQ's country status set to
  "illustrative" and stage 6 to "published". The disclaimer then reads
  "Country stages for DHA–PPQ are illustrative and have not been verified." and
  the note names both steps, in English and French.

**Not checked:** the real Google output for the new strings (it runs after the
merge); a real phone (no layout changed).

## Status

| | |
| --- | --- |
| Branch | `fix/pipeline-audit` (local, not pushed) |
| launch-rbm-test, launch-data-test | no change until the rebuild in §6 |
