# Interface text for the React dashboard — working notes

Branch `feat/rbm-messages`, cut from `origin/main` at `89b2011` on 27 Oct 2026.

RBM is rebuilding the dashboard as React components inside its Next.js app,
which loads interface text through its `i18n.ts`, one JSON file per language.
Data texts (products, sources, stages, glossary, country names) already arrive
translated inside the published `dashboard.json`. This branch adds the other
half: the **interface** text (buttons, labels, headings, messages, the feedback
form, the failure and "being updated" messages).

Decision D9, taken before this branch: the English lives in this repository as
`i18n/ui.en.json`, with named keys, so it stays under the existing
translate-and-approve pipeline. Wiring it into `assemble-content.js` (the
approval hash) is a later, separately reviewed step and is **not** done here.

## What is on the branch

| File | What |
|---|---|
| `i18n/ui.en.json` | **new.** 276 keys → English, nested by page area. A `_note` at the top says what it is. |
| `i18n/ui.page-forms.json` | **new.** For each of the 46 keys with `{placeholders}`, how `index.html` builds that text, so its existing translation can be found. |
| `scripts/build-rbm-messages.js` | **new.** Writes `dist/rbm-messages/{en,fr,pt}.json` (nested). `--check` writes nothing; `--allow-stale` ships a missing string in English. |
| `scripts/test-build-rbm-messages.js` | **new.** 46 checks (43 when `dist/rbm-messages/` is not built: three compare the built files with the sources). |
| `scripts/copy-rbm-messages.js` | **new** (28 Oct). Copies the three files into `launch-rbm-test/messages/` and leaves `messages/manifest.json` there; refuses to overwrite hand edits. Decision 8. |
| `scripts/test-copy-rbm-messages.js` | **new** (28 Oct). 35 checks, in a temporary folder. |
| `CLAUDE.md` | **changed** (28 Oct). Both message tests added to the verify block. |
| `docs/rbm-messages-notes.md` | **new.** This file. |

`dist/` is git-ignored, so the three output files are built, not committed.

### Conventions in `ui.en.json`

- **Keys** are camelCase segments, dot-separated, nested as JSON objects
  (`map.panel.backToCountries`). Top-level areas match the planned components:
  `header` 5, `banner` 3, `subscribe` 17, `pathway` 3, `stepPanel` 8, `board`
  13, `product` 49, `tooltip` 5, `map` 86 (its own 17, `regions` 7, `groups` 6,
  `tabs` 2, `filters` 10, `legend` 3, `finder` 7, `table` 3, `panel` 31),
  `download` 13, `feedback` 34, `disclaimer` 7, `about` 7, `sources` 5,
  `errors` 6, `common` 15.
- **A string a component needs lives in that component's area.** `common` holds
  only the small vocabulary several areas share: Close, "and", "Source:",
  `{n} year(s)`, the three status words, the two phase names, the access levels.
  Within `map`, strings several sub-areas use sit at `map.*` itself.
- **A key without placeholders holds the page's exact English**, word for word,
  punctuation included ("Key documents.", "Click for details ›"), so
  `key(English)` finds its translation. Do not reword one here: reword the page,
  and the key follows (see the drift check under Deferred).
- **`{name}` is an ICU-style placeholder**, named for what it holds
  (`{medicine}`, `{date}`, `{count}`), never `{0}`.
- **Keys whose names start with `_`** are notes for the reader and never reach
  the output files.

### Page areas (what each holds)

`header` title, "Powered by", the logo's alt text, the description, "Last
updated". `banner` the design-mockup banner (synthetic data only). `subscribe`
the Subscribe panel and its messages. `pathway` the seven-stage strip's
screen-reader labels. `stepPanel` the panel a pathway stage opens. `board` the
medicines table: headings, the Access definition, the access figures. `product`
an opened row: journey views, timeline, the stage panel a marker opens, More
detail, the cards, procurement, the milestones table. `tooltip` the floating
tooltip's own words. `map` the country access map and its rails. `download` the
CSV button, columns and record types. `feedback` the Send feedback widget.
`disclaimer`, `about` (About LAUNCH, About the data, and the Definitions
panel's title), `sources` the footer. `errors` data and sources failures,
including the RBM loader's four messages (`build-rbm-pages.js` `MSG_EN`).

## Decisions

**1. What counts as interface text: what a visitor of the v1.0 page can see.**
I read every line of `index.html`'s markup and script and the parts of
`assets/report-issue.js` the page shows, then checked the result against the
pipeline's own collection: of the 317 `markup`, `js` and `reviewed` strings in
`content.en.json`, 266 are used and 51 are left out on purpose, each for one of
these reasons:

- **32 render only when a v1.0 switch is turned back on.** `YARD_COMPARE` and
  `SHOW_STAGE_EXPECTED` (the yardstick: 23 strings, "Time taken", "Variance",
  "Expected in routine use by …"), `SHOW_LATE` (4: "Delayed", "delayed" and
  the definition, twice), `SHOW_BARRIERS` (2: "Main barrier", "No publicly
  documented barrier identified"), `SHOW_PROGRESS` (3: the step panel's status
  chips). With `SHOW_LATE` off no stage can be "late", so "Delayed" cannot
  appear on any data. Their translations are in the memory; if a switch comes
  back, add the keys then.
- 8 are the site menu (`assets/site-nav.js`), which RBM's pages already drop.
- 3 are console messages for developers; 2 are the schema.org JSON-LD.
- 2 are the widget's default intro and example text, which this page
  overrides (the overrides are in `feedback`).
- 2 are code the collector took for text (`stroke="…"`, `style="background:…"`).
  Harmless: their translations contain a `"`, so `scriptSafe()` never
  substitutes them (checked: 0 occurrences in `dist/locale/{fr,pt}`).
- 2 are other memory forms of text already covered: the filter hint's
  `No national treatment policy lists ${n} yet.` (same English as `map.noPolicy`)
  and the whole `${esc(k)}: ${pg.length ? "lists " : …}` line, whose translation
  the engine returned unchanged; `map.panel.partLists` uses its two words.

Rejected: keeping the switch-gated text too. That adds 32 strings nobody sees,
which the partners asked to hide, and the React port would have to carry
switches it may never need.

Kept although they depend on data rather than on a switch: the design-mockup
banner (shows only for `illustrative` data, i.e. the synthetic dataset), "No
country-level data yet for …" (no current product triggers it), "Pending
since", and the feedback widget's not-connected wording
(`feedback.notConnected`, shown when the RBM pages are built with
`--api-url none`). Each is a real state of its component.

**2. Keys are named by role, not deduplicated by English.** 276 keys hold 260
distinct strings; 14 strings are shared by 30 keys ("Status" in the medicines
table, the milestones table and the CSV; "Send feedback" as pill, title and
button). Rejected: one key per distinct English. It would couple unrelated
components, and the same word can need different translations by role ("Stage"
is a CSV record type in `download.records.stage` and a column in
`map.table.stage`). Rejected: English as the key, which is the memory's own
scheme. Every rewording would rename a key in RBM's components.

**3. Placeholders: the page's form is kept beside the key, and the existing
translation is converted.** Translations are filed under `key(English as the
page writes it)`. The page writes `Stage ${stepNo(i)} of ${STAGE_COLUMNS.length}`
or `"Last updated " + date`, never `{n}`, so `key("Stage {n} of {total}")` finds
nothing. `i18n/ui.page-forms.json` records the page form of each of the 46
placeholder keys, in one of two shapes:

- `page` + `holes` (24 keys): one memory string with `${...}` holes, each
  mapped to its `{name}`, or to `""` for a hole that is always empty on this
  page. `pathway.stageButtonLabel` maps `${exp}` and the cut-off `${n ?` to `""`
  because `SHOW_STAGE_EXPECTED` is off and no stage can be "late".
- `parts` (22 keys): text the page joins with `+`. A string is copied as it is
  into every language (placeholders, spaces, punctuation); `{ "t": … }` is a
  memory fragment, translated. `drop` removes a leading separator the page
  strips itself (`"· expected"` → `expected {date}`).

The builder rebuilds each key's English from its form by the same rule it
applies to translations, and fails if the two differ. So the forms file cannot
silently describe some other text. A translation counts as converted only if
every hole is in it exactly as often as in the English, no `${` is left, and its
`{placeholders}` equal the English's.

**Result: 46 of 46 page forms found; 45 converted in French and 45 in
Portuguese.** The 46th, `tooltip.dataStatus`, joins the word "data", which the
memory has never held.

For a `parts` key, the converted string puts the translated fragment where
English puts it. That is exactly what `/fr` and `/pt` show today, since the page
concatenates the same way, so the conversion assumes nothing new. Unlike the
page, the converted string is now one message a translator can reorder.

Rejected:
- **re-filing the translations under the new `{name}` English** in
  `translations.json`. That is 46 hand edits to the memory the approval
  pipeline owns, and it belongs to the wiring step (Deferred, 1);
- **sending the 46 `{name}` strings to the engine.** That pays again for text
  already translated and loses the memory's existing forms;
- **leaving composed text as separate fragments with no placeholder** (the
  component concatenates). That bakes English word order into React code,
  which placeholders exist to avoid.

Three sentences stay split exactly as the page splits them around markup:
`map.legend.resistanceNote` + `resistanceLink`, `subscribe.organisation` +
`optional`, `sources.keyDocumentsTitle` + `keyDocumentsIntro`. One rich-text
message (`… see the <link>WHO Malaria Threats Map</link>.`) would be new
English with no translation.

**4. Plurals are two keys, not ICU plural syntax.** `common.yearsOne` /
`yearsOther` and `map.panel.donutLabelOne` / `Other` and `donutUnitOne` /
`Other` mirror the page's `n === 1 ? … : …`. The memory holds the two words
separately, the page uses the English rule (French counts 0 as singular), and
the placeholder check would need an ICU parser for `{n, plural, …}`. Left for
the reshape to RBM's structure (Deferred, 3).

**5. A string with no translation fails the build, unless `--allow-stale`.**
That is what was asked. Note that it is *not* what `build-locale-pages.js`
does. There a missing translation always stays English silently, and its
`--allow-stale` is about a stale `content.en.json`. Here a missing or
unconvertible string is listed by key and reason, and with `--allow-stale` the
English is written and reported. A stub value (`TRANSLATE_ENGINE=stub`) counts
as missing. A broken `ui.en.json` or forms file (a placeholder key with no
form, a form that does not rebuild its English, a key that is not camelCase)
always fails, flag or not. These are code errors, not translation gaps.

**6. Translations are copied exactly as the memory holds them.** French has 52
values with a straight apostrophe. The build fails on the one apostrophe use an
ICU reader misreads (next to a brace, as in `l'{stage}`, or doubled); there are
none. Rejected: turning `'` into `’` as `build-locale-pages.js` does inside
JavaScript literals. JSON does not need it, and it would make these files
differ from the memory.

**7. Languages come from `scripts/rbm-manifest.js` `LOCALES`** (`en, fr, pt`),
the same list the RBM pages use, not a second copy. A leftover `es.json` in
`dist/rbm-messages/` is removed on each build. The memory carries no `es`
values (PR #127).

**8. The copy into `launch-rbm-test` is its own script, with a manifest in the
target, and it adopts a hand copy only if it is identical** (28 Oct 2026).
`scripts/copy-rbm-messages.js` copies `dist/rbm-messages/{en,fr,pt}.json` into
`<target>/messages/` (default `../launch-rbm-test`, `--to` to change it,
`--from` for a build kept elsewhere) and writes `messages/manifest.json`: the
sha256 of each file, `built_from` (this repository's commit), `clean`,
`allow_stale` and `untranslated` (the keys per language still in English).
The next copy compares the files there with it. The parts, each with what was
rejected:

- **A separate script, not a `--messages` step in `copy-rbm-pages.js`** (the
  two options Deferred 2 offered). The two copies go to different places: the
  pages to the static branch's root, the messages to the React port
  (`feat/react-port`). `copy-rbm-pages.js` also requires a clean target tree
  and `build-rbm-pages.js`'s manifest, and neither fits here. It reuses
  `fingerprint()` and `LOCALES` from `rbm-manifest.js`, so the hashes and the
  language list are the pages' own.
- **The build stays as it is; the copier rebuilds in memory.**
  `build-rbm-messages.js` writes no record of `--allow-stale` or of what is
  missing, so the copier runs `build()` on the current sources and compares
  the result with the files in `dist/`. If they are equal, the untranslated
  keys are known exactly, and `allow_stale` is true when any language has
  some, because the build writes English for a missing string only with
  `--allow-stale`. With nothing missing the flag changes nothing, so it is
  recorded `false`. Rejected: a build manifest written by
  `build-rbm-messages.js` (as `build-rbm-pages.js` does). It would change a
  reviewed script, and on its own it would not prove `dist/` is still what
  the sources build.
- **A `dist/` that is not what the current sources build is refused**, with
  no switch ("rebuild"). Otherwise the manifest would name a commit and a list
  of untranslated keys that do not describe the files. Rejected: recording
  `allow_stale: "unknown"`. A rebuild takes 0.2 s (`--check --allow-stale`,
  timed 28 Oct).
- **No manifest in the target (the files were copied there by hand on 27 Oct):
  each file already there must be identical to the one this copy writes**,
  line endings aside. A file that differs stops the copy, named, unless
  `--force`; a file that is not there is simply written. With no record of
  the last copy, identity is the only proof that nothing is lost. On
  28 Oct the three files in `launch-rbm-test/messages/` had the same sha256 as
  `dist/rbm-messages/` (built from `280ad5d`), so the first real copy writes
  `manifest.json` alone. Rejected: a `--first-copy` flag as in
  `copy-rbm-pages.js`. It accepts whatever is there without comparing, and the
  comparison is possible here. Rejected: always refusing without a manifest.
  That would demand `--force` for files proven identical.
- **What counts as a hand edit:** a file the last manifest lists that now has
  another hash or was deleted, a language file the manifest does not list that
  differs from the build, and an unreadable `manifest.json`. `--force`
  overrides these, and only these, and lists what it replaces on stderr. It
  never overrides a wrong target or a missing, inconsistent or stale `dist/`.
  Rejected: letting an edit that already equals the new build through
  silently. The rule asked for is "differs from the recorded hash", and
  `--force` covers that rare case.
- **The target marker is `package.json` named `launch-dashboard-rbm`.** The
  static-pages branch (`main`) of `launch-rbm-test` has no `package.json`
  (checked 28 Oct), so a copy there is refused, which is right: only the
  React port reads `messages/`.
- **No clean-tree requirement on the target**, unlike `copy-rbm-pages.js`.
  The React port is under active development there, and the copy touches only
  `messages/`. An uncommitted edit to a message file is still caught by its
  hash (tested). Rejected: requiring `git status` to be empty, which would
  block the copy on any unrelated work in progress.
- **Uncommitted build inputs are recorded and warned about, not refused.**
  If `i18n/ui.en.json`, `ui.page-forms.json`, `translations.json` or the build
  scripts have uncommitted changes, the manifest says `"clean": false` and
  lists them, and the copy prints a warning. That lets someone try a wording
  change in the React app before committing it. Rejected (for now): refusing,
  as `copy-rbm-pages.js` does for a build from uncommitted files. If copies
  should only ever be of committed builds, flip this to a refusal.
- **No timestamp in the manifest**, so an unchanged re-copy is byte-identical
  and `git status` stays empty. An unchanged file is not rewritten.
- `--check` runs every check and lists, per file, `new`, `unchanged` or
  `replaced`, and which manifest fields would change. It exits 1 where the copy
  would stop. An unknown argument is refused, so a mistyped `--chek` cannot run
  a real copy. Git calls in the target use `--no-optional-locks`, so even
  `git status` does not rewrite the index of a checkout someone is working in.
- A language file the last copy wrote that the build no longer has is
  removed (the `es/` lesson from the pages, 27 Oct). Everything else in
  `messages/`, including `README.md`, is left alone. Because the manifest's
  file names become paths the copy may remove, a manifest naming anything but
  a plain `xx.json` (say `../package.json`) is treated as not written by this
  script, a hand edit. Without that check, `--force` deleted the test repo's
  `package.json` (tested by removing it).
- `manifest.json` sits beside the language files. RBM's app imports each
  language by name (`lib/messages.ts`: `import en from "@/messages/en.json"`),
  so it is not read as a language. A loader that globbed `messages/*.json`
  would read it.

## Coverage, 27 Oct 2026

| | found | missing |
|---|---|---|
| fr | 269 of 276 (97%) | 7 |
| pt | 269 of 276 (97%) | 7 |

The same 7 in both, and all 7 are English that `content.en.json` has never
collected, so the translate bot has never seen them: "Presentation",
"Transactions", "Packs", "not estimated" (the procurement-by-presentation table,
shown for Pyramax and DHA–PPQ), "country" / "countries" (the donut's centre
label) and "data" (in `tooltip.dataStatus`). `node scripts/build-rbm-messages.js`
therefore fails today, and `--allow-stale` builds with those 7 in English.

## Found in passing, left alone

- **Those 7 strings are English on `/fr` and `/pt` today**, and the locale
  build cannot tell. `build-locale-pages.js` reports "fr: 761 translated · 0
  left in English · 100% coverage" while `dist/locale/fr/index.html` has
  `Presentation</th>` and `>Packs<`. It counts only strings that were
  collected. They are single or lower-case words, which the `js` patterns
  reject, and none is in `i18n/reviewed-strings.json`. Fix: add them there.
  That changes `content.en.json` and its hash, so it is its own change.
- **The map's keyboard-list tooltip prints a raw data key**: `ASPY · verified
  data`. `mapStatus` is `detail.countries.status` ("verified"), shown as it is
  on every page, followed by an uncollected " data".
- **Translation quality, for a French or Portuguese reviewer.** The conversion
  is faithful, so these are in the output exactly as they are on `/fr` and `/pt`:
  - single words translated with no context: "Stage" → fr "Scène" (a theatre
    stage; `stepPanel.label` reads "Scène 3: …", also the CSV record type),
    "Lead" → fr "Plomb" (the metal), "Close" → pt "Perto" ("near"),
    "Record" → fr "Enregistrer" and "Use" → fr "Utiliser" (verbs),
    "Complete" → pt "Concluir" (verb), "Recorded" → pt "Gravado" (audio).
    Known before: MÉDECINE / VOYAGE / ACCÉDER.
  - sentences: `map.noPolicy` fr "Aucune liste de politique nationale de
    traitement {medicine} pour le moment." (wrong meaning);
    `stepPanel.statusSummaryLabel` fr/pt put the number after the noun;
    `map.panel.stageMixTitle` fr "Mix d'accès à la scène", pt "Mistura de palco
    de acesso"; `map.panel.stageMixCount` fr lost "of" ("{total} pays ont…",
    shown after the big number); `map.panel.moreInCountriesTab` fr "Plus
    d'informations"; `map.noCountryData` fr "Aucune donnée au niveau national
    pour le moment. {medicine}." (the fragment was translated as a whole
    sentence); `map.preLaunch` fr starts "{medicine} En phase…";
    `product.stagePanel.surveyStatus` pt lost "is".
  - Brazilian rather than European Portuguese in places ("planejado",
    "Enviando…"), although the pages declare `pt-PT`.
- **`prettyDate()` in `index.html` is dead code** (defined, never called), with
  its own English month names.
- **`launch-rbm-test/messages/README.md` names four of the seven untranslated
  keys wrongly** (seen 28 Oct, `feat/react-port`). It lists
  `download.presentation`, `download.transactions`, `download.packs` and
  `download.notEstimated`; the build's keys are
  `product.procurement.presentation`, `…transactions`, `…packs` and
  `…notEstimated`. The other three are right. Its "Current copy" paragraph
  also repeats what `manifest.json` now records, and goes stale with the next
  copy. Suggested fix there: point that paragraph at `manifest.json`. Not
  changed from here: another agent works in that repository.
- **`i18n/translations.json` holds 1,013 entries; `content.en.json` uses 663.**
  The rest belong to removed features (the resistance overlay, the old
  "Step …" wording). Harmless, since lookups are exact, but the memory is never
  pruned.

## Deferred

1. **Wire `ui.en.json` into `assemble-content.js`** as a fifth bucket (`ui`),
   so it enters the approval hash and the translate bot translates new keys.
   Separately reviewed, by decision D9. To settle then:
   - the 46 placeholder strings become new memory entries under their `{name}`
     English. Seed them from this converter's output so the engine is not
     called and billed for them, and so the conversion step can then go;
   - the engine's placeholder protection (`translate-strings.js` protects
     `${...}`) must protect `{name}` too;
   - **no check yet that `ui.en.json` still matches the page.** Reword a
     button in `index.html` and its key keeps the old English. A drift check:
     every plain key's English and every page form must be in
     `content.en.json` (today all are, except the 7 above).
2. ~~Copy the files into `launch-rbm-test`.~~ Done 28 Oct:
   `scripts/copy-rbm-messages.js` (decision 8). Not yet run for real: the
   first copy writes `messages/manifest.json` alone (`--check`, Status).
3. **Reshape to RBM's own JSON structure once they send it.** That includes the
   interpolation syntax: next-intl reads ICU `{name}`, i18next's default is
   `{{name}}`. It also covers ICU plurals (decision 4) and whether their reader
   needs French's 52 straight apostrophes escaped.
4. Translate the 7 missing strings, through `reviewed-strings.json` (Found in
   passing, first item), not by hand in the output.
5. The translation-quality list above, for a French and a Portuguese reviewer.
6. `test-build-rbm-messages.js` and `test-copy-rbm-messages.js` are not in CI
   (they are in the `CLAUDE.md` verify block). `.github/` was out of scope for
   this branch; add them to `validate.yml` with the wiring.
7. `docs/developer-guide.md` does not mention these files yet, nor
   `copy-rbm-messages.js`.

## Status

- Branch `feat/rbm-messages` in the worktree
  `../launch-development-rbm-messages`, from `origin/main` `89b2011`: the
  message build (`280ad5d`), the copy step (`18f6a6d`), and the handoff's new
  §0 for the React port (28 Oct). **Pushed 28 Oct 2026, not merged, no PR**:
  the owner keeps working on the branch until it is stable. The push runs
  `validate.yml` (it runs on every push).
- `node scripts/test-build-rbm-messages.js`: 46 passed, 0 failed.
- `node scripts/test-copy-rbm-messages.js`: 35 passed, 0 failed. Each
  refusal was also broken on purpose in a scratch copy of the scripts (force
  always on, no stale-build check, a missing manifest always adopted,
  `--check` writing, no key-set check, no file-name check on the manifest);
  each break made named checks fail.
- `node scripts/copy-rbm-messages.js --check` against the real
  `../launch-rbm-test` (`feat/react-port`), 28 Oct: exit 0, "built from
  launch-development-test 280ad5d; still English: fr 7, pt 7", `en.json`,
  `fr.json`, `pt.json` unchanged, `manifest.json` new. Its `messages/`, its
  `git status` and its `.git/index` time were the same before and after. A
  real copy into a scratch replica of that folder wrote `manifest.json` alone,
  with the same three sha256 values; a second copy changed nothing.
- Verify block, 28 Oct 2026, with the copy step: the same results as on
  27 Oct below (normalize byte-identical; 0 errors, 1 warning `treatment
  policy:` GUF; synthetic 0 / 0; `preview.html` 393 KB; `test-build-dataset.js`
  30 passed, 0 failed; covers all 252), plus the two message tests above.
- `node scripts/build-rbm-messages.js`: fails as designed, listing the 7
  missing strings per language. `--allow-stale` writes the three files.
- Verify block, 27 Oct 2026: `normalize-treatment-policy.js` regenerated
  byte-identical (no change in `git status`); `validate-data.js` 0 errors,
  1 warning (`treatment policy:`, GUF); synthetic 0 / 0; `make-preview.js` wrote
  `preview.html` (393 KB); `test-build-dataset.js` 30 passed, 0 failed;
  `build-country-names.js --check` covers all 252. Also
  `assemble-content.js --check` up to date (contentHash `da61980a827c`) and
  `test-build-rbm-pages.js` 36 passed, 0 failed.
- No NUL bytes in any new file (counted in Python). 28 Oct: none in the two
  new scripts, `CLAUDE.md` or this file. All four are LF, as the rest of this
  worktree is (`git ls-files --eol`: `i/lf w/lf`).
