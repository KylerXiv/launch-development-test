# Spanish — working notes

Branch `feat/spanish`, cut from `main` at `8748de7` on 8 October 2026 and
rebased onto `58cac0a` (#77–#81: title, Sources A–Z, Subscribe fields,
filters heading; no overlap) on 9 October. It adds
Spanish (`es`) as a third translated language for the illustrated journey,
the same way French and Portuguese work:

- the LAUNCH site gets `/es/illustrated-journey-dashboard.html`, and the
  language menu on every copy of the page lists **Español**;
- the RBM pages get `es/`, and the iframe test gets Español in its language
  switch;
- every text in `dashboard.json` becomes `{ en, fr, pt, es }`.

The work spans three repos. Each has a local branch; **nothing is pushed**:

| Repo | Branch | Commit |
|---|---|---|
| `KylerXiv/launch-development-test` | `feat/spanish` | this commit |
| `codebyjackson/launch-rbm-test` | `feat/spanish` | one commit on `cb6efcb` |
| `codebyjackson/launch-data-test` | `docs/spanish` | `71e6ee1` |

Pipeline and Story stay English-only, as for French and Portuguese.

## 1. What to do next, in this order

**The one rule: step 1 must go live before step 3.** The RBM pages live
today expect every text to have exactly three languages. Given a
`dashboard.json` that includes Spanish, the live `/fr` page shows
"[object Object]" 317 times (tested in Chrome, §5). The new pages read old
and new files alike, so put them up first.

1. **launch-rbm-test:** push `feat/spanish` and merge it (your repo).
   Check <https://codebyjackson.github.io/launch-rbm-test/iframe-test.html#es>:
   the sidebar and header are in Spanish and the page loads, still in English.
   That is expected at this point.
2. **launch-development-test:** push `feat/spanish` and open the PR; Kyler
   merges, as usual. The merge changes `illustrated-journey-dashboard.html`,
   so **the translate bot starts by itself**: it translates 589 strings
   (31,250 characters) into Spanish, commits `chore: translate new text [bot]`
   and redeploys Vercel. If it does not start, run Actions → "Translate new
   text" → Run workflow. Then check
   <https://launch-development-test.vercel.app/es/illustrated-journey-dashboard.html>,
   and that the menu on
   <https://launch-development-test.vercel.app/illustrated-journey-dashboard.html>
   lists Español.
   No `data/products.js` change here, so the history snapshot is not affected.
3. **Publish now**, after the bot's commit: Actions → "Publish to RBM data
   repo" → reason "Add Spanish". The run summary should say one line:
   ``language added: `es`, in all 501 texts (… translated; the rest carry the English until they are)``.
4. **Rebuild the RBM pages from `main`** so that the Spanish page's interface
   text is Spanish too. (Interface text is built into each page; the data
   comes from `dashboard.json`.) Same routine as the yardstick rebuild: on
   `main` in launch-development-test run `node scripts/build-rbm-pages.js`
   with the default flags, then copy `en/ fr/ pt/ es/ assets/` from `dist/rbm/`
   into launch-rbm-test, commit and push. Only the `es/` files should change.
   Then open `iframe-test.html#es` again: it should be Spanish all the way. Also
   check the two sidebar names, which are my guesses at Google's titles:
   "Panel de lanzamiento de productos contra la malaria" and "Viaje
   ilustrado". If the Spanish page's own title says something else, change
   `launch:` and `journey:` in the `es` block of `iframe-test.html` to match.
5. **launch-data-test:** push `docs/spanish` (README and ATTRIBUTION only).
   Any time after step 3. It touches nothing under `v1/`, so the drift check
   does not care.

After step 4, both pages you named work in Spanish: the LAUNCH page through
its language menu, and the iframe test through its language switch.

## 2. How to undo or change it

- **Undo it all before merging.** Delete the three branches:
  `git checkout main && git branch -D feat/spanish` (dev and rbm-test),
  `git checkout main && git branch -D docs/spanish` (data).
- **Undo it after merging.** `git revert <commit>` on `main`, then Publish now:
  `dashboard.json` goes back to en/fr/pt, and the new RBM pages read that
  too. Then rebuild the RBM pages from `main`, which removes `es/`, or leave
  `es/` up: with no Spanish in the data, it shows English. Revert
  `71e6ee1` in the data repo.
  **Keep the loader fix** (`isText` in `scripts/build-rbm-pages.js`) even if
  you remove Spanish. It is what makes adding any later language safe.
- **Hide Spanish from the LAUNCH menu but keep the code.** Remove `es` from
  `data-languages="en,fr,pt,es"` in `illustrated-journey-dashboard.html`.
  To also stop building `/es/`, remove `es` from `LOCALES` in
  `scripts/build-public-site.sh`.
- **Hide it on the RBM test.** Remove `"es"` from `LANGS` in
  `iframe-test.html`, and the Español line from `index.html`.
- **Spanish text that reads wrong.** By your rule, translations come only from
  the Google bot, and nobody corrects them by hand. They are in
  `i18n/translations.json` under `es`. If a correction is ever agreed, the
  memory never overwrites an `es` value that is already there.
- **Latin American country names.** Spanish is general `es` (Google has one
  Spanish). To use `es-419` country names, change `es: "es"` in `LANGS` in
  `scripts/build-country-names.js` and run
  `node scripts/build-country-names.js`. The page text stays general Spanish.
- **Adding another language later.** Every place is listed in §4.

## 3. Decisions

**Fix the RBM loader; no `v2/`.** The data contract
(`public-data/README.md`) already says that adding a field is not a breaking
change and that pages must ignore fields they do not know. The loader broke
that rule: it accepted a text only if it had exactly the keys `en`, `fr` and
`pt`. It now reads the languages the file lists in `locales` and falls back
to English when the file lacks the page's language. Rejected: publishing
Spanish under `v2/`. Every page built for `v1/` would then show "This
dashboard is being updated", and we would maintain two datasets, all to add
one key per text.

**`dataset-diff.js` reports a new language as one line.** It used to
compare only `fr` and `pt`. The first Spanish publish would have looked like
"No change", and the publish step, which runs only when something changed,
would have **skipped it: Spanish would never have reached the data repo.**
Listing every text separately would be 501 lines (capped at 40 in the
summary), so a new or removed language is one line, with how many of its
texts are translated. A changelog line added in the same publish is still
reported once, not as every entry.

**Translations: only the Google bot, as you decided.** I added nothing to
`i18n/translations.json`. Until the bot runs after the merge, `/es` shows
the English text with Spanish dates ("8 oct 2026") and Spanish country names.
That gap lasts a few minutes, as for any new text on `/fr` and `/pt`.
Hand-written, as the French and Portuguese equivalents were, and **not
reviewed by a Spanish speaker**:
- the two RBM loader messages ("No se pudieron cargar los datos del panel…",
  "Este panel se está actualizando…"), in `MSG` in `scripts/build-rbm-pages.js`;
- every Spanish label in the iframe test's mock RBM shell. RBM has no Spanish
  site to copy them from: on 8 Oct, `dashboards.endmalaria.org/es` redirects
  to `/en/es`, which is a 404;
- the menu's "Español";
- the country names CLDR does not give in WHO form (`BY_CODE` / `BY_HAND` in
  `scripts/build-country-names.js`) and "(parte continental)".

**Country names from CLDR**, as for French and Portuguese: 252 names in
`i18n/country-names.json`. Node's CLDR is the same version (46.0) as the one
that made the file, so no French or Portuguese name changed (compared one by
one).

**General Spanish (`es`)**: Google's target, the `<html lang>`, and
`Intl` dates and country names. Not `es-419` (see §2 to switch the names).

**RBM has no `/es` route.** That was true on 22 Sep
(`docs/source-registry-notes.md`) and still is on 8 Oct. Spanish is ready
ahead of the platform: the RBM README shows the iframe for an `/es` route
"if the platform adds it".

**The data repo gets a normal commit, not a hand publish.** Its README and
ATTRIBUTION are kept by hand (the publish workflow writes only `v1/` and
`CHANGELOG.md`). Spanish data arrives with Publish now, as you chose. I did
not put a preview `dashboard.json` in the data repo, because pushing that
by mistake would bypass approval. To preview locally:
`node scripts/build-dataset.js` writes `dist/dataset/v1/dashboard.json`.

**"Since 2018" on `/es`.** The yardstick reads the procurement start year out
of "Since 2018", which is translated with the data. Portuguese says "Desde
2018", and Spanish almost certainly will too. The match now also accepts
"Desde el 2018", in case Google writes that.

## 4. What changed, and where a language is listed

This is also the checklist for adding another language: change every row
marked ●.

| File | Change |
|---|---|
| ● `scripts/build-locale-pages.js` | `LOCALES` + `HTML_LANG`: builds `dist/locale/es/` |
| ● `scripts/translate-strings.js` | `TARGET.es` (Google `es`); usage line and default list follow `TARGET` |
| ● `scripts/build-country-names.js` | `LANGS.es`, Spanish in `BY_HAND`, `BY_CODE`, `QUALIFIERS`; `--check` requires every language |
| `i18n/country-names.json` | regenerated: `es` for all 252 names, fr/pt unchanged |
| ● `scripts/build-rbm-pages.js` | `LOCALES`; Spanish loader messages; **the loader reads any set of languages** (`LOCS` from `ds.locales`) |
| ● `scripts/build-public-site.sh` | `LOCALES="fr pt es"`: copies `/es/`, switches Español on in the menu |
| ● `scripts/proposal-translate.sh` | translates approved proposals into Spanish too; outputs `left_es` |
| ● `.github/workflows/translate.yml` | the bot's loop: `fr pt es` |
| ● `.github/workflows/proposal-decision.yml` | `LEFT_ES` and the approval comment |
| `.github/workflows/pr-preview.yml` | the preview comment links `/es` |
| `.github/workflows/validate.yml`, `publish-dataset.yml` | wording only |
| ● `assets/site-nav.js` | Español in `LANGS` (off until the build switches it on) |
| ● `illustrated-journey-dashboard.html` | `data-languages="en,fr,pt,es"`; "Desde el" in the yardstick's year match; comments |
| ● `public-data/v1/schema.json` | `es` in `locales` and in every text; how to read a text |
| `public-data/README.md`, `ATTRIBUTION.md` | Spanish; adding a language is not breaking (copied to the data repo) |
| `scripts/build-dataset.js` | comments only (its languages come from `build-locale-pages.js`) |
| `scripts/dataset-diff.js` | compares every language; a new or removed language is one line |
| `assets/report-issue.js` | comments only |
| `scripts/test-build-dataset.js` | Spanish texts, stage names and country names match `/es` (28 → 30 checks) |
| `scripts/test-dataset-diff.js` | a new language is one line, with a changelog line on top; an `(es)` change is labelled (8 → 11) |
| `scripts/test-build-rbm-pages.js` | runs the loader on 3- and 4-language files; the Spanish page (25 → 31) |
| `rbm/README.md` | the four pages; the `/es` iframe |
| `CLAUDE.md`, `docs/developer-guide.md`, `docs/data-model.md` | Spanish in the lists |
| `docs/translation-notes.md`, `docs/handover-translation-workflow.md`, `docs/language-switcher-notes.md`, `docs/rbm-handover-notes.md` | a note at the top: what they say of French and Portuguese now holds for Spanish |

In launch-rbm-test: `es/` (new), the loader change in `en/ fr/ pt/`,
`iframe-test.html` (Español and its labels), `index.html` and `README.md`.
In launch-data-test: `README.md` and `ATTRIBUTION.md`.

## 5. Checks

The verify block (CLAUDE.md), on this branch:

| Check | Result |
|---|---|
| `normalize-treatment-policy.js` | byte-identical (line endings only) |
| `validate-data.js` | 0 errors, 1 warning (as before) |
| `validate-data.js data/products.synthetic.js` | 0 errors, 0 warnings |
| `make-preview.js` | wrote preview.html |
| `test-build-dataset.js` | 30 passed, 0 failed |
| `build-country-names.js --check` | covers all 252 country names |
| `test-dataset-diff.js` | 11 passed, 0 failed |
| `test-build-rbm-pages.js` | 31 passed, 0 failed |
| `build-locale-pages.js` | fr 675/1 and pt 676/0 as before; **es 0 translated, 533 in English** (the bot's job); self-check passes for all three |
| `content.en.json` | still current: the English content hash did not change, so no extra translation is triggered for fr/pt |
| `build-public-site.sh` | writes `public-site/es/`; every copy of the menu starts with `{ fr: true, pt: true, es: true }` |
| `translate-strings.js --dry-run` | es: 589 strings, 31,250 characters to translate |

The whole route with stand-in Spanish (`TRANSLATE_ENGINE=stub`, which writes
"[stub-es] …" and sends nothing anywhere; `i18n/translations.json` was put back
afterwards, with no stub values left):

| Check | Result |
|---|---|
| locale build | es 670 translated, 0 in English: the same reach as pt |
| `build-dataset.js` | schema valid, 501 text fields, `locales` en/fr/pt/es |
| `dataset-diff.js` against the live `dashboard.json` | exactly one line: "language added: `es`, in all 501 texts" (nothing else is pending) |
| Chrome, new RBM `/es` page on that file | renders in full: Spanish text, "8 oct 2026", "Guinea Ecuatorial" |
| Chrome, new RBM `/fr` page on that file | renders in full, in French |
| Chrome, **the RBM `/fr` page live today** on that file | **"[object Object]" 317 times**: the reason for the order in §1 |

Chrome, the launch-rbm-test branch against the **live** dataset (no Spanish
in it yet): `iframe-test.html#es` has the shell in Spanish and loads `es/`;
`es/` renders the whole page (775 elements, the same as `en/`) with English
text, Spanish dates and Spanish country names; `fr/` is unchanged.

## 6. Found in passing, left alone

- French has 2 strings (271 characters) waiting for the bot on `main`
  already. The bot's run after this merge will translate them too.
- The site menu's own words ("Views", "Illustrated journey", …) stay English
  on `/es`, as on `/fr` and `/pt` (docs/language-switcher-notes.md §3).
- The header of `scripts/build-rbm-pages.js` says "four things change" and
  lists five. Not mine; left.
- Phone-width overflow on the right, known on `/pt` since 7 Oct, will
  probably show on `/es` too (Spanish runs long). Not fixed.

## 7. Status

- launch-development-test `feat/spanish`: one commit on `58cac0a`, not pushed.
- launch-rbm-test `feat/spanish`: one commit on `cb6efcb` (9 Oct), not pushed.
  Built from this branch with the default flags (live data URL, live forms
  API). It also brings #81's filter heading to the RBM pages.
- launch-data-test `docs/spanish`: `71e6ee1` on `dcb7e8e`, not pushed.
