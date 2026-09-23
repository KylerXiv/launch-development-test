# Translation pipeline — current state, how it works, how to run it

**Last updated 23 September 2026 · Dev B (Jackson).**
Written so a fresh session, or another developer, can pick this up from this file alone.

---

## 0. Where this stands in one paragraph

The English page is the single source of truth and is **never modified**. French and
Portuguese are *generated copies*, produced at build time by swapping known English
strings for known translations. Three new scripts do the work, and one file —
`i18n/translations.json` — holds every translation. Both locale pages currently build,
load and run with **zero runtime errors** at **97% string coverage**. The engine is
**Google Cloud Translation v2**, chosen on measured accuracy in DEV-28.

**Not yet done:** the pages are not wired into the deploy, nothing is committed to git,
and the question of whether RBM ever gets translation access is parked by decision.

---

## 1. The pipeline, end to end

```
  SOURCE — hand-edited, and the build never writes to any of these
  ┌─────────────────────────────────────────────────────────────┐
  │  illustrated-journey-dashboard.html                           │
  │  data/products.js                                             │
  │  data/resistance.js                                           │
  │  data/molecular-markers.js                                    │
  └─────────────────────────────────────────────────────────────┘
                 │
                 │  (1)  node scripts/extract-strings.js --write
                 │       "what on this page is translatable, and where does it live?"
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  i18n/strings.en.json          the inventory — 423 strings    │
  └─────────────────────────────────────────────────────────────┘
                 │
                 │  (2)  node scripts/translate-strings.js --locale=fr
                 │       Google Cloud Translation v2, key read from the environment
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  i18n/translations.json        the translation memory         │
  │                                404 entries, en + fr + pt      │
  └─────────────────────────────────────────────────────────────┘
                 │
                 │  (3)  node scripts/build-locale-pages.js
                 │       copy the page, swap the strings, write the copy out
                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │  dist/locale/fr/…    dist/locale/pt/…                         │
  │  generated output — delete it any time, rebuild in seconds    │
  └─────────────────────────────────────────────────────────────┘
```

Each step reads the step before it. Nothing flows backwards. There is no state to
maintain and no lock file.

---

## 2. What each step actually does

### Step 1 — `scripts/extract-strings.js`  ·  the inventory

Walks the page and the three data files and produces a list of every string a reader
would see, in three buckets:

| Bucket | What it is | Count |
|---|---|---|
| `data` | text inside `data/*.js` that the page renders | 228 |
| `markup` | static HTML text nodes and `title` / `aria-label` / `alt` attributes | 80 |
| `js` | string literals inside the page's own JavaScript | 115 |
| | **total per language** | **423  ·  21,038 characters** |

It writes nothing unless you pass `--write`. It is read-only by design so you can run
it any time to see what changed.

**The `data` bucket is deliberately narrow.** From `resistance.js` and
`molecular-markers.js` it takes only `meta` prose and `dict.country` — the labels the
threat map actually renders. It does **not** touch the 1,633 study rows or the 2,869
survey rows, which are numbers and coded identifiers, and it does **not** touch
`dict.drug` or `dict.marker`, which are join keys. See §3, rule 1b.

### Step 2 — `scripts/translate-strings.js`  ·  the memory

Sends the inventory to Google and stores the results in `i18n/translations.json`.
One entry per unique English string:

```json
"3f2a9c81b7e4d605": {
  "en": "Country registration",
  "where": "markup line 812",
  "bucket": "markup",
  "fr": "Enregistrement du pays",
  "pt": "Registo de país"
}
```

The key is `sha256(english).slice(0, 16)` — a fingerprint of the English text.

`--dry-run` shows what it would cost and calls nothing.
`--locale=fr` or `--locale=pt` translates one language at a time.

### Step 3 — `scripts/build-locale-pages.js`  ·  the output

Reads the source page and data files, swaps the strings, and writes a complete
self-contained copy per locale. Three separate substitution passes, each precise:

- **data** — the JSON is parsed, values replaced at known field paths, re-serialised.
  Nothing is matched by text search.
- **markup** — whole HTML text nodes, replaced as whole nodes.
- **js literals** — replaced *including the surrounding quotes*, so a string literal can
  never be confused with an identifier that happens to read the same.

It also sets `<html lang="fr">` / `lang="pt-PT"` and copies `data/` and `assets/`
alongside the page so the output directory stands on its own.

`--check` reports coverage and writes nothing.

---

## 3. The rules that stop this corrupting the page

These matter more than the code. Each one is a separate, independent guarantee.

**1 · The deny-list — some things are never sent anywhere.**
Species binomials (`P. falciparum`), gene markers (`Pfkelch13`, `Pfcrt K76T`), trial
registry IDs, CSS selectors, and all provenance fields — `source`, `citation`, dates,
URLs. These are identifiers, not prose. Translating them would be wrong in any language,
and §8 of the contract requires provenance to survive unaltered.

**1b · Identifiers are not labels — the rule that cost two builds.**
`resistance.js` and `molecular-markers.js` are *pivoted* stores. A drug name is not
decoration in them; it is the key everything is looked up by, and it appears in three
places that all have to agree:

```js
RES.treatmentFailure["Artesunate-pyronaridine"]["P. falciparum"]   // 1. pivot key
dict.drug.indexOf("Artesunate-pyronaridine")                       // 2. row lookup
const PRODUCT_DRUG = { pyramax: "Artesunate-pyronaridine", ... };  // 3. page constant
```

The build never translates an object key, so translating that string **anywhere else**
breaks the match. It happened twice on 23 September — first through `dict.drug`, then
through `PRODUCT_DRUG` — and both times the result was identical: every study row skipped,
**the threat map drawing nothing, no error, no console message**, and a page that looked
completely healthy. The second time the only visible tell was an empty Species dropdown.

The fix is `scripts/i18n-identifiers.js`, which **derives** the protected set from the data
files rather than listing it by hand — every pivot key, every `dict.drug` / `dict.marker` /
`dict.species` value, and every `meta.markerDrug` key. 35 strings today, and a drug WHO adds
next quarter is protected the day it lands, with nobody remembering to do anything. All
three scripts consult it: the extractor never inventories them, the translator never sends
them, the builder never substitutes them in any pass.

`dict.country` stays translated and is safe: the location filter matches on `iso3`, and the
country dropdown is built from `data/world-map.js`.

**And the build now proves it.** After writing the pages, `build-locale-pages.js` re-reads
its own output, resolves the page's lookup constants against the generated data, and
compares the drawn row and site counts against the English. Any mismatch prints the failing
check and **exits non-zero**. `node scripts/build-locale-pages.js --verify` re-runs the
check against existing output.

```
    fr
       ✓ FALLBACK_SPECIES "P. falciparum" resolves in dict.species
       ✓ PRODUCT_DRUG "Artesunate-pyronaridine" resolves in the pivot and dict.drug
       ✓ "Artesunate-pyronaridine" draws 39 rows / 34 sites  (English: 39 / 34)
       ✓ "Dihydroartemisinin-piperaquine" draws 228 rows / 165 sites  (English: 228 / 165)
```

The general rule: **a string that is compared, indexed or looked up is an identifier, not a
label, however much it reads like prose.** Before adding a field to the allow-list, search
the page for it appearing on the right-hand side of a comparison.

**2 · Placeholder rejection — a broken page is worse than an English one.**
About ten strings are template literals carrying `${...}` holes. Each hole is masked with
a rare token before translation and restored after. If a token does not survive the round
trip the translation is **thrown away** and the English is kept. Three strings currently
fail this check every run; they stay in English, which is the correct outcome.

The same masking protects project vocabulary — `LAUNCH`, `PQ`, `SRA`, `MFT`, `ACT`,
`GanLum`, `Novartis`, `Unitaid`. Without it Google produced `LAUNCH` → `LANCEMENT` and
`PQ` → `questions periodiques` on the first real build. `WHO` is deliberately *not*
protected, so it correctly becomes `OMS`.

**3 · The memory is the allow-list.**
Substitution only ever replaces a string that is already in `translations.json`. Anything
not in the memory was never sent for translation, has no entry, and is therefore skipped.
This is why the pattern matching in step 3 cannot over-reach: a pattern that matches
something it shouldn't simply finds no entry and moves on.

**4 · Content-addressed keys, empty-locale-only writes.**
The key is a fingerprint of the English. Edit the English and the fingerprint changes, so
nothing matches, so it re-translates by itself on the next run — nobody has to keep a list
of what went stale. And a locale that already holds text is never overwritten, whether the
engine wrote it or a person did.

---

## 4. Every file added or changed

### Added — new, not previously in the repo

| Path | What it is |
|---|---|
| `scripts/extract-strings.js` | Step 1. Builds the string inventory. Read-only unless `--write`. |
| `scripts/translate-strings.js` | Step 2. Calls Google, fills the memory. |
| `scripts/build-locale-pages.js` | Step 3. Writes the locale pages, then self-checks them. |
| `scripts/i18n-identifiers.js` | The protected-identifier set, derived from the data. Used by all three scripts. Run it on its own to print the list. |
| `i18n/strings.en.json` | Generated inventory. Regenerate any time. |
| `i18n/translations.json` | **The translation memory. This is the file that matters.** 404 entries. |
| `dist/locale/fr/` | Generated French page + its `data/` and `assets/`. |
| `dist/locale/pt/` | Generated Portuguese page + its `data/` and `assets/`. |
| `docs/TRANSLATION-PIPELINE.md` | This file. |

### Changed — existing repo files

**None.** No source file was edited. `git status` shows only untracked additions:

```
?? dist/
?? i18n/
?? scripts/build-locale-pages.js
?? scripts/extract-strings.js
?? scripts/i18n-identifiers.js
?? scripts/translate-strings.js
```

That is the point of the design: the whole feature is reversible by deleting `dist/`.

### Decision tooling, gitignored, not product code

| Path | What it is |
|---|---|
| `poc/compare-translations.js` | The DEV-28 harness that compared Google and DeepL. |
| `poc/scoring-sheet.md` | The DEV-28 rubric and the recorded decision. |

---

## 5. Current numbers

```
inventory                423 strings          21,038 chars per language
protected identifiers     35 excluded         drug, marker and species names
deny-listed               10 skipped          gene markers, selectors, provenance
unique strings in memory 404
rejected (placeholders)    3 per locale       English kept, correctly

build coverage
  fr    525 substitutions ·  14 left in English  ·  97%
  pt    530 substitutions ·  14 left in English  ·  97%

self-check              PASS · both locales resolve the same rows as English
```

The substitution count is higher than the string count because one string can appear in
several places on the page — each occurrence is one substitution.

The 26 identifier translations that had accumulated in the memory before the rule existed
were pruned on 23 September (430 → 404). The extractor no longer produces them, so they
do not come back.

---

## 6. How to run it

PowerShell, from the repo root.

```powershell
cd C:\Users\OakkarMin\Desktop\Unitaid\launch-development

# key for this window only — never commit it, never put it in a file
$env:GOOGLE_API_KEY = "AIza...your key..."

# 1 · see what is translatable (writes nothing)
node scripts/extract-strings.js

# 2 · see what it would cost (calls nothing)
node scripts/translate-strings.js --dry-run

# 3 · translate, one language at a time
node scripts/translate-strings.js --locale=fr
node scripts/translate-strings.js --locale=pt

# 4 · check coverage without writing
node scripts/build-locale-pages.js --check

# 5 · build the pages
node scripts/build-locale-pages.js
```

Steps 3 and 4 are safe to repeat. A second run of step 3 reports
`nothing to do — every string already has this locale` and makes no API calls.

**The key.** It travels in the URL query string, so restrict it to the Cloud Translation
API only in the Google console, and set a budget alert — Google bills past the 500,000
characters/month allowance rather than stopping.

---

## 7. How to view the pages in a browser

Serve the `dist/locale` folder and open the two URLs.

```powershell
cd C:\Users\OakkarMin\Desktop\Unitaid\launch-development\dist\locale
python -m http.server 8080
```

Then open:

- French — <http://localhost:8080/fr/illustrated-journey-dashboard.html>
- Portuguese — <http://localhost:8080/pt/illustrated-journey-dashboard.html>

`Ctrl+C` in the terminal stops the server.

To compare against the English original, open a **second** terminal and serve the repo
root on a different port:

```powershell
cd C:\Users\OakkarMin\Desktop\Unitaid\launch-development
python -m http.server 8081
```

- English — <http://localhost:8081/illustrated-journey-dashboard.html>

Double-clicking the HTML file also works — the page loads everything through `<script src>`
and makes no `fetch` calls — but a local server matches how it will actually be served, so
prefer it.

**What to check on the threat map**, since this is where both silent failures were: pick a
product, turn on *Treatment failure*, and confirm dots appear and the Species dropdown is
populated. The build's own self-check now catches this before you get that far — an empty
map with no error means a lookup key has been translated again, and the build would have
said so.

---

## 8. Deliberately not done

| | Why |
|---|---|
| Not wired into `scripts/build-public-site.sh` or `vercel.json` | The pages exist but do not deploy. `/fr/` and `/pt/` will 404 on Vercel until this is added. **Next step.** |
| Nothing committed | Decide first whether `i18n/` is committed (it should be — it holds work that cannot be recovered) and whether `dist/` is gitignored (it should be — it is generated). |
| Translation corrections | Parked by decision. Known-wrong strings are listed in §9 and left as they are. |
| RBM translation access | Parked by decision. Whether RBM ever writes `fr.json` / `pt.json` is an open question, not a blocker for this work. |
| Country names on the map | The 94 country names in `data/world-map.js` are not in the pipeline, so the map tooltips and the country filter stay English. |

---

## 9. Known translation defects, left in place

Recorded so nobody rediscovers them and thinks something is broken.

| English | Locale | Output | Should be |
|---|---|---|---|
| Pipeline | pt | `Gasoduto` | *gas* pipeline — wrong sense entirely |
| Study year | fr / pt | `année d'études` / `Ano letivo` | academic year — wrong sense |
| All sites | pt | `Todos os sites` | websites — wrong sense |
| Draft | fr | `Projet` | project — wrong sense |
| no fixed order | fr / pt | untranslated | inside a JS literal the extractor did not pick up |
| drug and marker names | fr / pt | untranslated, by design | join keys — see §3, rule 1b |

The first four are the same class of fault: a single English word with more than one
meaning and no sentence around it to disambiguate. Both engines made this kind of mistake
in the DEV-28 comparison, which is why the fault is recorded as belonging to the English
source text rather than to Google.

---

## 10. Open questions for RBM

Unchanged from the backlog, none of them blocking:

- The exact Portuguese locale code RBM expects (`pt`, `pt-PT` or `pt-BR`).
  We currently emit `pt-PT`.
- Whether machine translation of already-approved English falls under §1 of the
  architecture document.
- Whether RBM produce their own `fr.json` / `pt.json` — inferred from §9, not confirmed.
