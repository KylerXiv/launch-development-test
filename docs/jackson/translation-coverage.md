# Every visible text translated on /fr and /pt — what was fixed and how

*Jackson (Oakkar-Min), with Claude Code, 2 Oct 2026. Branch `fix/sources-toggle`
(local, not pushed), on `main` at `56ecf13`. This is the branch's working-notes
document for the translation work, per [CLAUDE.md](../../CLAUDE.md). The Sources
footer toggle on the same branch is recorded in
[illustrated-journey-ui-notes.md](../illustrated-journey-ui-notes.md) §3.33.*

**In one paragraph.** The French and Portuguese dashboards showed a lot of
English: about 230 country names, the feedback form and site menu, the step
panel, the new Detail rail (Overview, Countries, country pages), product
fields such as research lead and milestone dates, and short words such as
"Close", "None", "today". The build's "97% coverage" did not show it, because
it only counted strings the pipeline had collected, and most of these had
never been collected. The pipeline now collects every visible text on the
page and in the two shared widgets. It hands them to the existing Google
translation bot, and it renames countries from the standard CLDR list. Nothing
was translated by hand, and no existing translation was edited (owner's
decision: translation quality is left to the Google bot).

---

## 1. What was in English, and why

Found by a browser audit that loads the English, French and Portuguese pages,
clicks every control (358 on the English page: tabs, panels, country pages,
the feedback form, the language menu) and compares every visible text node
and `aria-label`, `title`, `placeholder` and `alt` attribute.

| Cause | Examples | Fix |
| --- | --- | --- |
| **A one-word literal is treated as code.** The collector's `isToken` filter rejects any literal that is a single word, and `isCssish` rejects any all-lower-case phrase, because both look like class names | "Overview", "Countries", "Close", "None", "today", "Delayed", "in progress", "not started" | the reviewed list (§3.1) |
| **Text around `${...}` holes inside markup** is never collected: the text-node pattern excludes `$ { }` | "Step ${n} of ${m}", "On pathway: ${…}", "${name} · medicine facts", "+${k} more in the Countries tab" | the reviewed list |
| **Text with `&`** is rejected as code | "Access &amp; supply commitments" | the reviewed list, `html: true` |
| **French translations with an apostrophe were dropped.** The builder refused any translation containing `'` (it could end a `'...'` literal) | "Lire l'avertissement", "Exigences d'adoption", "Cas d'usage cible", "Date d'obtention / de soumission" (24 strings) | `'` becomes `’` (§3.4) |
| **Country names** come from three data files that were copied unchanged | "Burkina Faso", "Democratic Republic of the Congo", "Dem. Rep. Congo — Aucune donnée" | CLDR table (§3.2) |
| **The shared widgets** `assets/report-issue.js` (Send feedback) and `assets/site-nav.js` (menu) were copied unchanged | "What is your feedback about?", "Your name — optional", "Illustrated journey", "coming soon" | the reviewed list, applied to the locale copies |
| **Product fields not on the allow-list** | research lead, geographies and timeline; milestone dates and "anticipated"; stage dates ("Ghana only (2022)", "Rolling"); procurement total, period and channel; the step panel's "Source" label | allow-list extended (§3.3) |
| **Dates formatted in English** by the page | "29 Sep 2025" in a French sentence; "Last updated 2 Oct 2026" | dates follow `<html lang>` (§3.5) |
| **MapLibre's own text** | "Use Ctrl + scroll to zoom the map", the zoom buttons' tooltips | passed through MapLibre's `locale` option |
| **Words split from their sentence** | "‹ Back to" + "countries"; "country survey is" + a key; "country"/"countries" + "by patient group" | rewritten as whole phrases (§3.5) |

## 2. How it works now

```
   English source (read only)                 i18n/                         build-locale-pages.js
   ───────────────────────────                ─────                         ─────────────────────
   illustrated-journey-dashboard.html ──┐
   data/products.js, data/sources.js ───┼─► assemble-content.js ─► content.en.json ─► translate.yml (Google) ─► translations.json
   i18n/reviewed-strings.json ──────────┤      4 buckets:           (contentHash =        fills EMPTY entries only
     (exact snippets in the page,       │      data · markup ·       the approval unit)
      report-issue.js, site-nav.js)     │      js · reviewed
                                        │
   data/world-map-geo.js,               │
   data/world-map.js,                   └─► build-country-names.js ─► country-names.json (CLDR, never sent to Google)
   data/treatment-policy.js ────────────────────────────────────────────────┘

   build-locale-pages.js, per locale:
     1. reviewed snippets → page and the two widgets         (REVIEWED_KEY_OF, exact snippet only)
     2. static markup text nodes and attributes              (KEY_OF, every bucket)
     3. page-script literals and text nodes                  (PAGE_KEY_OF: markup + js buckets only)
     4. data files: products, sources (allow-listed paths)   (KEY_OF)
     5. countries renamed in treatment-policy, world-map, world-map-geo   (country-names.json)
     → dist/locale/{fr,pt}/   → build-public-site.sh (/fr, /pt on Vercel)
                              → build-rbm-pages.js (dist/rbm/{fr,pt}/)
                              → build-dataset.js  (dashboard.json, every text { en, fr, pt })
```

## 3. What changed, file by file

### 3.1 The reviewed list — `i18n/reviewed-strings.json` (new)

123 entries: 83 for the page, 30 for `assets/report-issue.js`, 10 for
`assets/site-nav.js` (114 distinct strings; some, like "Close", appear in
several places). Each entry is

```json
{ "file": "illustrated-journey-dashboard.html", "src": "\"gw-step\">Step ${stepNo(i)} of ${STAGE_COLUMNS.length}<", "en": "Step ${stepNo(i)} of ${STAGE_COLUMNS.length}" }
```

- `src` is an exact snippet of the file, with enough around the text that it
  can only be that place (`done: "Complete"`, not `"Complete"`).
- `en` is the text inside it that is translated. It must appear in `src`
  **exactly once as a whole word** (not touching a letter, digit, `_` or `.`):
  this is what stops `"yr"` in `${el2.yrs} yr${` from matching the code
  `el2.yrs`. The first version took the first occurrence and broke the French
  page with exactly that; the check now makes such an entry an error.
- `html: true` means `src` holds `en` HTML-escaped (`&amp;`).

`assemble-content.js` stops with an error if a `src` is no longer in its file,
or if `en` is not exactly once in its `src`. So a code change cannot leave an
entry stale without saying so. Fix the entry to the new code and re-run.

### 3.2 Country names — `scripts/build-country-names.js`, `i18n/country-names.json` (new)

- 252 English spellings, from the three files that name countries:
  `world-map-geo.js` (Natural Earth short forms such as "Dem. Rep. Congo", "S.
  Sudan"), `world-map.js`, and `treatment-policy.js` (WHO long forms such as
  "Democratic Republic of the Congo").
- French and Portuguese (pt-PT, the /pt page's variety) are the Unicode CLDR
  names, from Node's own ICU (`Intl.DisplayNames`, CLDR 46.0), looked up by ISO
  code through an ISO3→ISO2 table in the script.
- **Keyed by the English spelling, not by ISO3,** because the map gives
  Ashmore and Cartier Islands Australia's code (AUS), and short and long forms
  of one country both occur. Both forms get the same CLDR name.
- Overrides (`BY_CODE`): CLDR's standard name is its colloquial form for a few
  codes. They follow the forms the WHO documents the dashboard cites use:
  "République démocratique du Congo" / "República Democrática do Congo" (CLDR:
  Congo-Kinshasa), "Congo" (CLDR: Congo-Brazzaville), "Hong Kong", "Macao" /
  "Macau" (CLDR: "R.A.S. chinoise de Hong Kong"), "Myanmar" / "Mianmar" (CLDR:
  "Myanmar (Birmanie)"), Portuguese "Costa do Marfim" (CLDR: "Côte d’Ivoire
  (Costa do Marfim)").
- By hand (`BY_HAND`): "Ashmore and Cartier Is." (no CLDR code).
- Qualifier: "United Republic of Tanzania (mainland)" →
  "Tanzanie (partie continentale)" / "Tanzânia (parte continental)".
- `node scripts/build-country-names.js --check` fails if any name in the data
  is missing, so a new country cannot stay English unnoticed. The locale build
  also lists any name it could not rename (today: none; 409 renamings per
  locale across the three files).

### 3.3 `scripts/assemble-content.js`

- Fourth bucket `reviewed`, read from the list above and checked against the
  files (§3.1). Exports `reviewed()`, `escHtml()` and `placeIn()` for the
  builder, so both read the list the same way.
- Data allow-list extended. The same paths are added in `localiseProducts`
  (`build-locale-pages.js`) and in `TEXT_PATHS` (`build-dataset.js`):
  - `stageInfo[].source` — the step panel's "Source" box. It is a label for a
    kind of source ("National medicines registers"), not a citation.
  - `products[].stages[].date`, `.nextDate`. A value that is exactly **"TBC"**
    is left alone: `peekLine()` drops an expected date that reads TBC, and a
    translated one would show.
  - `detail.milestones[].date`, `.anticipated`.
  - `detail.research.lead`, `.geographies`, `.timeline`.
  - `detail.volume.total`, `.period`, `.split[].channel`.
- Text count: 382 → 548 (data 225 → 272, js 105 → 110, reviewed 0 → 114).

### 3.4 `scripts/build-locale-pages.js`

- **Three lookups instead of one** (`KEY_OF`, `PAGE_KEY_OF`,
  `REVIEWED_KEY_OF`). The page-script passes (literals and text nodes in the
  page's JavaScript) now match only strings collected from the page itself
  (markup and js buckets). Before, they matched any collected string, from any
  bucket. With single words now collected, that would translate code: `year
  === "TBC"` would become `year === "À confirmer"`, and the timeline would
  silently draw wrong. Checked against the old rule: exactly one page literal
  was translated through a data-only string ("Complete" in `LABEL`), and the
  reviewed list now covers it, so nothing was lost.
- **`scriptSafe()`** guards every translation that goes into script: `'`
  becomes `’` (the typographic apostrophe, which is also correct French). It
  refuses a translation that changes a `${...}` placeholder, or adds `"`, a
  backtick or `\` outside one. Until now any `'` was refused outright, which
  is why 24 French strings stayed English.
- `applyReviewed()` runs first on the page and on the locale copies of
  `assets/report-issue.js` and `assets/site-nav.js`.
- Countries renamed in the locale copies of `treatment-policy.js`,
  `world-map.js` and `world-map-geo.js` (all three now parsed and re-written
  like `products.js`). The summary prints how many.
- Text with no letters ("—", "2026", "Q4 2026") is no longer counted as "left
  in English".
- New exports: `localiseTreatmentPolicy`, `localiseAsset` (used by the dataset
  and RBM builds).

### 3.5 The page and the feedback widget (English output unchanged)

`illustrated-journey-dashboard.html`:

- `PAGE_LANG` / `DATE_LANG`: dates use the page's `<html lang>`. English keeps
  `en-GB` and the old `MON` table, so English dates are byte-identical. French
  reads "2 oct. 2026", Portuguese "2/10/2026"-style per CLDR.
- MapLibre `locale` option with MapLibre's own English defaults (zoom in/out,
  the three cooperative-gesture hints), so the build can translate them.
- Three phrases rewritten whole: `"‹ Back to countries"` / `"‹ Back to
  overview"` (was "‹ Back to " + a word), `"country survey is illustrative"`
  (was "country survey is " + the status key), `"country by patient group"` /
  `"countries by patient group"` (was a word + "by patient group").

`assets/report-issue.js`: `—` and `…` written as the characters,
and the thank-you message joined into one literal (it was three, concatenated),
so the reviewed snippets match the source text. Same output on every page.

### 3.6 `dashboard.json` — `scripts/build-dataset.js`, `public-data/v1/schema.json`

- The new product paths are text (`{ en, fr, pt }`).
- `treatmentPolicy.countries.*.name` is text now, with CLDR names. The RBM
  loader's `pick()` already resolves `{ en, fr, pt }` anywhere in the data, so
  the RBM pages needed no loader change.
- Schema: descriptions updated (`stageInfo[].source`, `treatmentPolicy`). No
  field changed type in a way the v1 contract forbids: the schema did not type
  those fields, and the file still validates (`schema v1: valid`).

### 3.7 RBM pages — `scripts/build-rbm-pages.js`, `rbm/README.md`, test

The map files (country names) and the feedback widget (wording) now differ by
language. Each language folder therefore gets its own copy:
`dist/rbm/{en,fr,pt}/data/world-map.js`, `world-map-geo.js`,
`assets/report-issue.js` (`PER_LANGUAGE`). Icons and logos stay shared in
`dist/rbm/assets/`. The test checks the new paths (11 pass).
**`codebyjackson/launch-rbm-test` needs a rebuild and push** to get this,
since the page files changed (data updates still never need one).

## 4. Decisions, and what was rejected

| Decision | Rejected | Why |
| --- | --- | --- |
| An explicit reviewed list of exact snippets | Loosening the collector's filters | The filters exist because a false positive rewrites code: the history in `assemble-content.js` records a shipped break ("fin is not defined"). Single words and lower-case phrases are exactly what code looks like |
| | Refactoring every UI string in the page into a `UI.*` dictionary | Cleanest long term, but rewrites about 80 lines of Keith's page code and guarantees conflicts with his branch; the list keeps the page as it is |
| Country names from CLDR, keyed by English spelling | Sending names to Google | Names are reference data with one standard form, and an engine translates each spelling separately, so "Dem. Rep. Congo" and "Democratic Republic of the Congo" could come back as two different names; CLDR is the list browsers and operating systems use, and gives one name per code |
| | Keying by ISO3 | AUS is used for two features; short and long forms both occur |
| Translations by the Google bot, nobody edits them (owner, 2 Oct) | Writing them by hand now; fixing existing errors | Owner's call. A French review found real errors in existing entries (e.g. "Achats (voies publiques)" = public *roads*; "OMS PQ interdit" = *banned*). They were **not** applied; the list is kept outside the repo and can be revisited |
| Citations stay English, the words around them are translated (owner) | Translate citations too / keep the whole line English | A reader must be able to match a citation to the English document; "Source", "verified", "country survey is illustrative" are page words |
| GanLum acknowledgement stays English, its heading is translated (owner) | Machine-translating it | Partner's legal wording (merge notes, 2nd merge §6) |
| `stageInfo[].source` translated | Keeping it English as provenance | It is a description of a kind of source ("National treatment guidelines"), shown under a "Source" heading, not a citation; the products' own `source` fields stay English |
| "TBC" never translated | Translating it | `peekLine()` tests for exactly "TBC"; journey `year` compares to "TBC" in code |
| Page-script passes use page strings only | Keeping one lookup for everything | See §3.4: with single words collected, data strings would rewrite code |

## 5. What still shows English on /fr and /pt, on purpose

- Brand, product and organisation names; INN names ("Pyronaridine–artesunate
  (Pyramax)"); manufacturer lines ("Fosun Pharma · MORU / DeTACT partnership",
  "Alfasigma (Eurartesim) · Guilin · Beijing Holley"). These are identity
  fields, not on the allow-list.
- Cited document titles and every product `source` field, including the
  procurement line "Source: Global Fund PQR Transaction Summary, extract …
  Covers Global Fund-financed procurement only; …". The coverage caveat is part
  of the citation field. Splitting it into its own field is a data change for a
  proposal, not done here.
- The GanLum acknowledgement.
- "P. falciparum", "P. vivax" and other species names (the translator's deny-list).
- Language names in the language menu (English, Français, Português).
- Country names spelled the same in French or Portuguese (Ghana, Kenya, Mali…).
- **Until `translate.yml` runs after merge:** the 153 new strings (fr; similar
  for pt). The locale build reports 74% coverage until then.

## 6. How to keep it complete

- **New UI text in the page's script** that is a single word, all lower case,
  or sits around `${...}`: add a `reviewed-strings.json` entry. `node
  scripts/assemble-content.js` tells you if the snippet is wrong.
- **New text in `report-issue.js` or `site-nav.js`**: the same; those files are
  only translated through the list.
- **A new country in the data**: `node scripts/build-country-names.js`
  (`--check` fails until you do).
- **Proving coverage before merge**: back up `i18n/translations.json`, run
  `TRANSLATE_ENGINE=stub APPROVED_CONTENT_HASH=<contentHash> node
  scripts/translate-strings.js --locale=fr` (and `pt`), build, and look for
  English on the page; every gap shows as English next to "[stub-fr] …" text.
  **Restore the backup afterwards**; stub values must never be committed.

## 7. Verification (2 Oct 2026)

| Check | Result |
| --- | --- |
| `normalize-treatment-policy.js` | byte-identical |
| `validate-data.js` | 0 errors, 1 warning (GUF) |
| `validate-data.js data/products.synthetic.js` | 0 errors, 0 warnings |
| `make-preview.js` | ok |
| `test-build-dataset.js` | 28 passed, 0 failed |
| `test-dataset-diff.js` | 8 passed, 0 failed |
| `test-build-rbm-pages.js` | 11 passed, 0 failed (one new) |
| `test-import.js` | 127 passed |
| `assemble-content.js --check`, `build-country-names.js --check` | up to date; all 252 names covered |
| `build-locale-pages.js` self-check | passed; fr and pt 459 translated today (was 435), 409 country renamings each |
| `build-public-site.sh` (the Vercel build) | exit 0 |
| `build-dataset.js` | schema v1 valid |
| `node --check` on every `scripts/` and `assets/` file; every inline script of `/fr`, `/pt` and the RBM fr/pt pages | parse |
| **Stub run** (every missing string filled with "[stub-…]", then the browser audit) | 100% coverage reported; what the audit still flags is only §5 |
| **English page**, browser audit before and after (358 controls clicked) | the same 1,077 visible texts, none added or lost; 0 script errors |
| `/fr` and `/pt`, same audit with the real memory | 0 script errors |
| Code translated by old entries ("trait=" for `stroke=`, "ansText") | none reaches the built pages; no translation in the memory changes a placeholder |
| `i18n/translations.json` | identical to `main` (stub values removed, 0 left) |

**Not checked:** a real phone; a screen reader; the RBM pages in a browser
(built and syntax-checked only); the Google bot's output (it runs after merge).
`test-serializer.js` still reports its 2 failures, as on `main` without this
change (not in the verify block; not investigated).

## 8. After merge

1. `translate.yml` runs (the page changed). It translates the 153 new strings
   for fr and pt, empty entries only, and commits `i18n/`.
2. Vercel redeploys `/fr` and `/pt` (Kyler's redeploy if the commit is not his).
3. **Publish now** for `dashboard.json`: the new fields and the CLDR country
   names reach RBM only with a publish. It is still blocked by the drift check
   (data repo commit `86b6402`, a hand revert;
   [merge-keith-development-notes.md](../merge-keith-development-notes.md) §9).
4. Rebuild and push `codebyjackson/launch-rbm-test` (§3.7).

## 9. Found in passing, left alone

- **Existing translation errors** (owner: leave them to Google). One review
  found 136 French entries with clear errors, among them both stage names
  "Achats (voies publiques)" and "Enregistrement du pays", and an access line
  that reads "banned". Not applied.
- Clicking some countries outside the treatment-policy file shows the ISO3
  code ("ARE", "AND") as the name in one card. `mftName()` falls back to the
  code. It is the same on the English page.
- `docs/translation-notes.md` and `docs/jackson/DEV-31.md` describe three
  buckets. This document supersedes that part.

## 9a. After the merge into main (PR #52, 2 Oct 2026)

PR #52 was merged with main's #48 to #50 through GitHub's conflict editor. The result
matched the intended resolution. Two gaps were fixed afterwards, on `fix/post-merge-i18n`:

- `shortDate()`, new in #50, formatted dates as `en-GB` on every page; it now uses
  `DATE_LANG`, like the page's other date helpers.
- "Please reload the page to try again." (new error banner in #50) follows a `</b>`
  inside a literal, so the text-node pattern cannot see it; it is now a reviewed entry.

"Drug" (also new) is a schema.org `@type` in the page's JSON-LD and stays English.

After the bot's run (`dac539f`) the locale build reports 621 translated strings for French and 622 for Portuguese (100% coverage). The one new string from this follow-up waits for the next bot run.

## 9b. Translated code broke /fr and /pt (found 2 Oct 2026, after the bot's first full run)

The bot's run after PR #52 translated four strings that are code, because the js
collector took them for prose (they have spaces and punctuation):

| Literal | Used for | What it became | Effect |
| --- | --- | --- | --- |
| `"button, a, .gloss"` | `e.target.closest(…)` in the row click handler | fr `bouton, a, .gloss`; pt `botão, um, . brilho` | **fr:** a click on the chevron opened the row and the same click, bubbling to the row, closed it again, so rows never opened. **pt:** invalid selector, script error on every row click |
| `"(min-width: 721px)"` | `matchMedia` for the Sources toggle | fr `(largeur minimale : 721 px)` | Sources started closed on laptops |
| `"(prefers-reduced-motion: reduce)"` | `matchMedia` | fr `(préfère-mouvement-réduit : réduire)` | reduced-motion preference ignored |
| `"grid-column: 4 / -1"` | an inline style | fr `colonne de la grille : 4 / -1` | style dropped |

**Fix:** `assemble-content.js` no longer collects a media query, a CSS selector list, an
attribute selector or a style declaration (`isCode2`). Exactly 11 js strings dropped out, all
code; nothing else changed. The builder only substitutes collected strings, so those literals
now stay as written, whatever the translation memory holds. Their old translations stay in
`translations.json` as harmless orphans (owner: the memory is left alone).
*7 Oct 2026:* `isMediaQuery` also covers `pointer`, `hover` and `orientation` queries, when
the forms started asking `matchMedia("(pointer: coarse)")` (illustrated-journey-ui-notes.md §3.36).

**Checked** with a real mouse click in headless Chrome (an `element.click()` from script does
not reproduce it: the browser blocks the second, nested click): before the fix the French
row stayed closed and Portuguese threw; after it, the row opens and Sources starts open at
1280 px in all three languages, with no script errors.

## 10. Status

| | |
| --- | --- |
| Branch | `fix/sources-toggle` (local), 4 Sources-footer commits + this work |
| New files | `i18n/reviewed-strings.json`, `i18n/country-names.json`, `scripts/build-country-names.js`, this document |
| Changed | `illustrated-journey-dashboard.html`, `assets/report-issue.js`, `scripts/assemble-content.js`, `scripts/build-locale-pages.js`, `scripts/build-dataset.js`, `scripts/build-rbm-pages.js`, `scripts/test-build-rbm-pages.js`, `public-data/v1/schema.json`, `rbm/README.md`, `CLAUDE.md` (verify block), `i18n/content.en.json` (regenerated) |
| Push state | not pushed |
| CI | not run |
