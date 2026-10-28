# One data file per language: working notes

Branch `feat/data-per-language`, from `main` at `577489a` (28 Oct 2026).

RBM's site runs Next.js with next-intl, which loads one translation file per
language. The React version of the dashboard (launch-rbm-test
`feat/react-port`) reads the published data on RBM's server. Until now that
was `dashboard.json`, every text `{ en, fr, pt }`, and the React code picked
one language out of it. The owner chose (28 Oct) to give the data the same
shape as the interface text: one file per language.

This file is updated in the same commit as each change it describes.

## Decisions

1. **Three more files beside `dashboard.json`: `v1/dashboard.en.json`,
   `dashboard.fr.json`, `dashboard.pt.json`** (the owner's choice).
   `schema_version` stays 1: a language file is a different file, told apart
   by its name and its `locale` field, and adding files is not a breaking
   change to `dashboard.json`. Rejected: `v2/<lang>/dashboard.json` (a new
   version number for the new shape; recommended, not chosen) and
   `v1/<lang>/dashboard.json` (two shapes in one version folder).
2. **`dashboard.json` stays, unchanged,** until the React version replaces the
   static pages: those read a copy of it (`copy-rbm-pages.js --data-only`),
   and so does today's live RBM test site.
3. **A language file is the combined file with each text picked out**
   (`forLocale()` in `scripts/build-dataset.js`). A text is an object whose
   `en` is a string and whose keys are all in `locales`; it becomes its
   language's string, or the English when that is empty. `locales` becomes
   `locale`; the rest of the envelope is copied, so the four files of a build
   share `generated_at` and `content_hash`. This is the rule of the React
   version's `localize()` (launch-rbm-test `lib/dataset.ts`), on purpose: the
   React tests prove a language file gives the page what the combined file
   did. Rejected: picking by `TEXT_PATHS` (the same objects today, since
   `mergeText` makes exactly those, but a second rule that could drift from
   the reader's).
4. **`schema.lang.json` is worked out from `schema.json` at build time**
   (`langSchema()`): `$defs/text` becomes a string, `locales` becomes `locale`,
   everything else is copied in order. It is written beside the build output
   and published from there. Rejected: a second hand-written schema in
   `public-data/v1/`, which would drift the first time a field is added to
   `schema.json`. Every build validates the three files against it, as it
   validates `dashboard.json`.
5. **The archive keeps the combined file only.** It holds all three
   languages, so each language file can be rebuilt from it with `forLocale()`.
   Rejected: archiving all four, which roughly doubles the archive's growth
   (+370 KB per publish on 28 Oct) for nothing that cannot be rebuilt.
6. **First publish of the language files, with unchanged data.**
   `dataset-diff.js` compares `data` only, so a run with nothing new would say
   "Nothing to publish" and the language files would never appear. A step
   ("Are the language files published?") publishes anyway while any of the
   four is missing in the data repo, and adds a line naming them to that
   CHANGELOG entry. Once they exist it changes nothing.
7. **The drift check covers all five files** (`dashboard.json`, the three
   language files, `schema.lang.json`): a hand edit to a language file is the
   same problem as one to the combined file.
8. **The data repo's README and ATTRIBUTION are `public-data/README.md` and
   `public-data/ATTRIBUTION.md`**, kept identical by hand as before;
   launch-data-test `docs/language-files` carries the same text (ATTRIBUTION:
   the language files cite their sources as the combined file does).

Sizes, local build of 28 Oct (pretty-printed, as published):
`dashboard.json` 257 KB; `dashboard.en.json` 118 KB, `.fr.json` 128 KB,
`.pt.json` 125 KB; `schema.lang.json` 13 KB.

## Checked

- `node scripts/test-build-dataset.js`: 58 passed, 0 failed (31 before). New:
  the language schema keeps every field in order; for each language, the file
  matches `schema.lang.json`, says its language, holds no `{ en, fr, pt }`,
  and is the combined data and `source_coverage` in that language, walked
  side by side; the envelope is the same; French stage names are the /fr
  page's; an empty translation falls back to English; an object with other
  keys is left alone; the schema catches a text left as an object, a missing
  `locale` and an unpublished language.
- The publish steps, run for real with Git Bash against a scratch clone of
  launch-data-test (push removed): the first run published the four files and
  the schema in one commit, archived the combined file, and wrote the
  CHANGELOG line; a second run found nothing missing; a hand edit to
  `dashboard.fr.json` stopped the drift check.
- Verify block: `validate-data.js` 0 errors, 1 warning; synthetic valid;
  `make-preview.js` ok; `build-country-names.js --check` covers all 252.
  `normalize-treatment-policy.js` rewrote two files with LF line endings only
  (no change with `--ignore-cr-at-eol`); restored.

## Deferred

- Stop publishing `dashboard.json` when the static pages are retired, and
  archive the language files from then on.
- The data lives on a personal GitHub account (codebyjackson.github.io);
  RBM asked what happens if an account is closed. The owner will decide the
  long-term home later; the React code reads the address from one setting.

## Status

- 28 Oct 2026: local, not pushed. Files: `scripts/build-dataset.js`,
  `scripts/test-build-dataset.js`, `.github/workflows/publish-dataset.yml`,
  `public-data/README.md`, `public-data/ATTRIBUTION.md`,
  `docs/developer-guide.md`, this file.
- After merge, "Publish now" (with a reason) puts the files online; the React
  branch is checked against them then.
