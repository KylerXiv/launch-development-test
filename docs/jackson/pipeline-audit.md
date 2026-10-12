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
audit found two facts typed into the page instead of read from the data, and
three places where text skipped the bot: the RBM loader's error messages
(hand-written in fr/pt/es), seven CSV column names, and the bot's own trigger,
which did not start for four of the files it reads. Four are fixed here. The
fifth, the disclaimer, which says country stages are unverified except Nigeria
and Tanzania while both lists have been verified since 6 Oct, was fixed and
then put back as it was at the owner's request (12 Oct): its wording is the
owner's decision (§2). The smaller findings left alone are in §5, and the
decisions still open are in §8.

Report page for the team (private until shared):
https://claude.ai/artifact/DWvEoXHLWzqYzfkC1riptx. It says the same as this
file.

## At a glance

| Question | Result | Status |
| --- | --- | --- |
| Are the built pages what a build from `main` produces? | 127 of 127 files on the live sites match the repos, which match a fresh build | Pass: nobody edited a built page by hand |
| Does every text reach the translate bot? | 100% of collected strings, fr/pt/es; the browser sweep found no page text outside the pipeline | 3 gaps fixed (RBM error messages, CSV headings, the bot's trigger) |
| Are there facts typed into the page? | 2 found | 1 fixed (yardstick note); the disclaimer is waiting for a decision (§8) |

---

## How to undo or change it

- **Everything:** do not merge the branch, or `git revert` its commits after
  the merge. Then rebuild launch-rbm-test from `main` as usual.
- **The disclaimer is unchanged** on this branch (the fix was reverted on
  12 Oct). The reverted version is in commit `da826ed` if you want it back:
  it replaced the Nigeria/Tanzania clause with a sentence built from
  `detail.countries.status`.
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
| Disclaimer, 2nd paragraph | "Country stages in this version are illustrative and have not been verified, except for the Nigeria and Tanzania registrations." | Written on 2 Oct. Since 6 Oct both country lists are `status: "verified"`, with a source per country. Found on 7 Oct, not fixed then | **Not changed (owner's decision, 12 Oct).** A data-driven version was built (`da826ed`) and reverted; the wording of the disclaimer is for the owner to decide |
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
| `illustrated-journey-dashboard.html` | `yardNote` from `basis`; CSV `CSV_COL` / `CSV_REC` (the disclaimer is as on `main`) |
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
   translates the 10 new strings (fr/pt/es).
2. Data repo: nothing to publish (no data or data text changed; Publish now
   would say "No change").
3. Pull `main`, then `node scripts/build-rbm-pages.js` and
   `node scripts/copy-rbm-pages.js --to ../launch-rbm-test`; commit on
   `update/main-<sha>` in launch-rbm-test, PR, merge. Only the 4 `index.html`
   files and the manifest should change. Do not rebuild before the bot's
   commit: copy-rbm-pages refuses a build whose translations are behind.
4. Check: a CSV from /fr has French column names; in launch-rbm-test the loader's
   `var MSG` holds the bot's wording.

## 7. How it was tested (12 Oct 2026)

- Verify block: `validate-data.js` 0 errors, 1 warning; synthetic 0/0;
  `make-preview.js` ok; `test-build-dataset.js` 30/0; `build-country-names.js
  --check` covers all 252; `normalize-treatment-policy.js` identical apart from
  line endings.
- `test-build-rbm-pages.js` 33/0, `test-copy-rbm-pages.js` 20/0,
  `test-dataset-diff.js` 11/0; `assemble-content.js --check` current with the
  regenerated content file; no NUL bytes.
- Stub run in a scratch worktree (memory emptied, every string stubbed), before
  the disclaimer revert: locale build 100% for fr/pt/es (684 strings); the RBM
  loader's `MSG` carries `[stub-xx]` text in all three.
- Headless Chrome (system Chrome through Playwright), English and the three stub
  languages, every panel opened: 0 script errors. English differs from `main`
  only in the disclaimer and the yardstick note (the disclaimer change was
  reverted afterwards). CSV downloaded in en/fr/es:
  every column name and record type stubbed in fr/es.
- Forced case (built copies only): DHA–PPQ's country status set to
  "illustrative" and stage 6 to "published". The note names both steps, in
  English and French.
- After the disclaimer revert: the disclaimer matches `main` exactly;
  `test-build-rbm-pages.js` 33/0, `test-build-dataset.js --allow-stale` 30/0,
  `validate-data.js` 0 errors 1 warning, locale build self-check passed.

**Not checked:** the real Google output for the new strings (it runs after the
merge); a real phone (no layout changed).

## 8. Decisions for the owner

| # | Decision | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | **The disclaimer's wording.** It says country stages are unverified "except for the Nigeria and Tanzania registrations", but the data marks both country lists verified, with a source per country (Pyramax 13 countries, DHA–PPQ 15). The page contradicts itself in all four languages and on RBM | Leave it; delete that clause; use the data-driven sentence from `da826ed`; write new wording | If it is Unitaid's legal text, check with whoever owns it first |
| 2 | **The RBM error messages.** On 9 Oct the owner chose not to fix this gap; this branch fixes it. The hand-written fr/pt/es wording is replaced by the bot's, as the "bot only" rule asks, but three sentences show in English until the bot runs after the merge | Keep the fix; drop it (revert the `build-rbm-pages.js`, test and reviewed-strings parts) | Keep |
| 3 | **CSV column names in fr/pt/es.** The branch translates them all, to match the CSV's contents, which were already translated. A script that reads the CSV by column name would then see different names per language | Keep them translated; make every heading English | Keep translated |
| 4 | **The yardstick note's English.** "Expected times: country registration follows a published timeline." becomes "Expected times from a published timeline: Country registration." | Accept; reword (`yardNote` in the page) | Accept, or reword as you prefer |
| 5 | **The 4 strings Google rejects** (PQ/MFT, es 3, fr 1). Left alone on 9 Oct and here | Leave; try the fix, proved in CI with the real Google key | Owner's call |

After these: push the branch for Kyler to merge, then follow §6.

## Status

| | |
| --- | --- |
| Branch | `fix/pipeline-audit` (local, not pushed): `da826ed` the fixes, `5e8fb2b` disclaimer put back, then this notes update |
| launch-rbm-test, launch-data-test | no change until the rebuild in §6 |
| Open | the five decisions in §8 |
