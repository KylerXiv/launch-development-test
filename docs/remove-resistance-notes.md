# Removing the WHO resistance overlay — working notes (feat/remove-resistance-layers)

*1 Oct 2026, Jackson (Oakkar-Min) with Claude Code. Branch
`feat/remove-resistance-layers`, cut from `main` at `3c747bc`.*

## Decision

The three study-result layers on the illustrated journey map are removed
fully: **treatment failure**, **delayed parasite clearance** and **molecular
markers of drug resistance**. Owner's call, 1 Oct, before the RBM handover:
the handed-over pages and the public `dashboard.json` should not carry them.

Options weighed: (a) remove the feature, its data files, scripts, rules and
translations (chosen); (b) hide it on the page and keep the data; (c) keep it
on the dashboard and only leave it out of `dashboard.json`. (a) was chosen
because a hidden feature still has to be validated, translated and
maintained, and nothing else on the page reads its data.

Done first, as its own branch, so `build-dataset.js` (the RBM public data
layer, next branch) never has to know the layers existed.

## What was removed

- **Page** (`illustrated-journey-dashboard.html`, 240 KB → 181 KB): the
  Study result / Marker / Species controls, the Site select in Location, the
  treatment-failure legend and rule, the study panel and chart, the site dots
  and clustering, the test hook `window.__DEV13_MAP__`, and their CSS.
- **Data**: `data/resistance.js`, `data/molecular-markers.js`,
  `sourcing/staging/resistance_tes.csv`, `sourcing/staging/resistance_mm.csv`.
- **Scripts**: `normalize-resistance.js`, `normalize-molecular-markers.js`,
  `verify-map-clusters.js` (it only tested the dot clustering) and
  `i18n-identifiers.js` (it only protected the two files' drug and marker
  names from translation).
- **Validator**: `checkStudyLayers` and `DATASETS` in `data-rules.js`. The
  "world-map.js could not be evaluated" error moved into
  `checkTreatmentPolicy`, which reads the same basemap.
- **Translation**: the two files are no longer in `content.en.json`'s values,
  `build-locale-pages.js`'s localised files, or `translate.yml`'s path filter.
  The locale self-check now only proves every file the page loads is there
  (its other checks guarded the removed lookups).
- **Build**: `build-public-site.sh` no longer copies the two files.

## What was kept, on purpose

- **The Location filter** (Region, Country): it narrows the access map and
  the MFT policy card, not only the dots. Only Site went.
- **The MFT policy switch** (`data/treatment-policy.js`): unchanged.
- **`who-threat-maps` in `data/sources.js`** (owner's call): it stays in the
  Sources footer. Its `plain` line still says "the study results behind the
  resistance layers on the map above", which is no longer true; rewording it
  is a data edit that goes through translation — left for the owner to decide.
- **`sourcing/raw/mtm/`**: raw snapshots are append-only, so the extracts stay.
- **`scripts/mtm-xlsx-to-csv.py`**: the WMR Annex 4B step still uses it.
- **CSS classes `res-t`, `res-rule`, `res-pick`**: the MFT legend and the
  Location selects use them; renaming them would touch the translated pages
  for no gain.
- **Entries in `i18n/translations.json`** for the removed strings: harmless
  (nothing looks them up) and kept, so the translations are there if the
  layers ever come back.

## Checks (1 Oct 2026)

- `validate-data.js`: 0 errors, **1 warning** (was 6; the 5 resistance and
  marker warnings went with the files). Synthetic: 0 / 0.
- `assemble-content.js`: 316 strings (data 181, markup 46, js 89); values are
  now `products.js` and `sources.js` only.
- `build-locale-pages.js` (strict): fr 356 translated, pt 363, 12 left in
  English each, the same 12 as before; self-check passes.
- `make-preview.js`, `build-public-site.sh`: pass; `public-site/data/` no
  longer has the two files.
- Both inline page scripts parse (`node --check`).
- Headless Chrome screenshot: page renders, no console errors. The map canvas
  stays blank headless **on `main` too** (MapLibre never fires `load` there),
  so the map itself was **not verified in a browser** — open the page locally
  before merging.
- SHACL (`check-shapes.py`) not run: `pyshacl` is not installed here; CI runs it.

## Not changed

Historical notes that describe the overlay as it was (`docs/jackson/DEV-31.md`,
`docs/illustrated-journey-ui-notes.md`, `docs/translation-notes.md`, the
reviewer-feedback files, `docs/source-registry-notes.md`) are records of
past work and were left as they are.

## Status

Local branch, not pushed. One commit.
