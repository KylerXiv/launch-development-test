# DEV-13 — WHO resistance overlay: working notes

Handover written 5 Sep 2026. Branch `feat/resistance-map`, **not pushed yet**.

Read this first tomorrow: §1 for where things stand, §6 for the decisions and
why they were made (that's the part that's expensive to reconstruct), §7 for
what's left.

---

## 1. Status at a glance

| | |
|---|---|
| Branch | `feat/resistance-map` (off `main` @ `6e3e739`) |
| Commits | 6, all `DEV-13:` prefixed |
| Uncommitted | yes — a substantial v2 rewrite, see §4 |
| Pushed | **no** |
| CI locally | all green (0 errors, 3 warnings) |
| Page affected | `illustrated-journey-dashboard.html` **only** |

The ticket says *"add all 3 types of data on our map"*. **One of the three is
built** (treatment failure). See §7 for the other two and why they differ
wildly in cost.

---

## 2. What the feature is

The country access map on the illustrated dashboard now carries a second,
independent layer: WHO Malaria Threat Map drug-resistance results, drawn as
coloured dots on top of the existing access shading.

- **Fill = the product.** Which countries have registered / adopted / MFT'd it.
  Unchanged from before.
- **Dots = the parasite.** Treatment-failure rates from WHO therapeutic
  efficacy studies.

They are deliberately on different visual channels, with separate tooltips and
separate provenance lines. See decision **D2** — this is the single most
important thing not to accidentally undo.

Controls added under the product tabs: an **overlay** radio (Off / Treatment
failure), a **drug** select, and a **species** select. Clicking any dot opens a
panel below the map listing every study behind it.

---

## 3. Committed so far (6 commits)

```
e346a47  group the drug list, keep the empty state clear of the dots
12cdc7e  strip stray NUL bytes from the normalizer
d7c870f  document the resistance layer and its manual export step
566c262  resistance overlay on the illustrated journey map
82b678d  validate the resistance dataset
209eec0  ingest WHO Malaria Threat Map treatment-failure data
```

---

## 4. Uncommitted work (the v2 rewrite)

This is the big one — it removes all filtering and adds the drill-down. Roughly
2,000 lines changed, most of it the regenerated staging CSV.

```
 M data/products.js                    +1   changelog entry (rewritten for v2)
 M data/resistance.js                  regenerated — now 183 KB
 M docs/developer-guide.md             +28  §9 note rewritten
 M illustrated-journey-dashboard.html  +198 species select, weighted dots, panel
 M scripts/normalize-resistance.js     +137 no filters, weighted aggregation, dict encoding
 M scripts/validate-data.js            +62  rules for the new data shape
 M sourcing/README.md                  +1   row updated
 M sourcing/staging/resistance_tes.csv +1634 now every study, not just aggregates
```

**Commit it before doing anything else tomorrow** — §8 has the command.

---

## 5. Files and what each does

| file | role |
|---|---|
| `sourcing/raw/mtm/2026-09-05-tes.csv` | The WHO extract, verbatim. 1,642 rows. Committed so CI and teammates never touch Excel. |
| `scripts/normalize-resistance.js` | Reads that CSV → writes the two outputs below. Zero dependencies, no network. |
| `sourcing/staging/resistance_tes.csv` | Auditable intermediate: every study, one row each. |
| `data/resistance.js` | Committed data the page reads. `studies[]` (all 1,633, backs the panel) + `treatmentFailure` (274 aggregated country dots). |
| `illustrated-journey-dashboard.html` | The renderer. Search for `---- resistance overlay` to find the block. |
| `scripts/validate-data.js` | Resistance rules run only on the default invocation (not the synthetic run). |

### Current numbers

- **1,633 studies** shipped (1,642 raw minus 9 WHO publishes with a literal `NaN`)
- **26 drugs × 5 species → 274 country dots**
- `data/resistance.js` is **183 KB**

---

## 6. Decisions, and why

This is the context worth keeping. Each of these was a deliberate choice, most
of them reversing an earlier one after review.

**D1 — Illustrated dashboard only.** The overlay was first built into
`index.html`, then reverted. Reasons: the illustrated page has a much better
tooltip system (`showTipAtPoint` tracks the cursor; `.tlvl`/`.trow`/`.tprod`
card grammar), and it is deliberately excluded from both edition builders — so
there is **no `synthetic/` or `unitaid/` regeneration** in this PR at all.
`index.html`, `option-b.html` and `story.html` are untouched; they are the
three design options under client review and shouldn't diverge.

**D2 — The two layers stay separate.** The access data is still
`status: "illustrative"` for most countries ("not actual country status" in its
own note). The resistance data is published WHO results. Putting real dots on
illustrative fill and inviting the reader to read the overlap would manufacture
an insight out of placeholder data. So: separate tooltips, separate provenance
sentences, and **no copy anywhere that combines them**. There are tests
asserting this. When the country survey is verified, this becomes a copy edit
and the "deployed where it's already failing" argument switches on.

**D3 — No zoom, one dot per country.** WHO's map shows every study site;
ours can't. The basemap is a fixed 960×420 SVG and **Myanmar occupies 26×54
pixels** — its 35 study sites need ~61px² each and the box offers 39px².
Globally, plotting every study would put **84% of dots on top of another one**
(worst spot: 73 overlapping studies in the Cambodian Mekong). Zoom is the only
thing that fixes this and it's a separate feature.

**D4 — Drill-down instead of zoom.** Clicking a dot opens a sortable panel
below the map with every study behind it — site, region, year, patients,
failure %, linked source. Myanmar's is 30 rows for AL/falciparum. This is where
the site-level detail lives.

**D5 — Nothing is filtered.** Earlier versions restricted to *P. falciparum*
and dropped studies with fewer than 20 patients. Both removed. All five species
and all study sizes ship. The only rows dropped are those WHO publishes with no
usable value or no coordinates, and the normalizer prints the count.

**D6 — Dots are a patient-weighted average.** Most recent study year for that
country/drug/species, averaged across that year's sites weighted by patient
count, positioned at the weighted centroid. This was chosen *because* of D5:
with small studies included, a "worst value wins" rule let **53 of 277 dots**
be decided by studies of under 20 patients (worst: Sudan, 33.3% from **6
patients**, painting the darkest band). Worked example — Laos DHA–PPQ was
47.3% from a single n=19 study; it is now **32.35% across 3 sites and 68
patients**. All 274 dots were verified against an independent recomputation
from the raw CSV: **0 mismatches**.

**D7 — Species and drug are not independent.** Chloroquine has **zero**
falciparum studies (that resistance is decades old) — it's a vivax drug here.
So species options with no data for the selected drug are **disabled**, with
country counts shown. An empty map must never be readable as "no resistance
here" when it really means "nobody uses this drug for this parasite".

**D8 — Drug list: one flat A–Z list with country counts.** 26 drugs, plain
alphabetical, every entry formatted identically. Two earlier versions were
tried and rejected: a curated four-drug list with a "show all" checkbox (an
unnecessary control), then two optgroups ("Tracked products" / "Other
antimalarials") sorted by coverage. Alphabetical won for predictability.

The **counts stay** and matter more under this ordering than the last one: of
the 26 drugs, **17 cover fewer than five countries and 11 cover exactly one**.
Coverage sorting used to sink those to the bottom; A–Z scatters them through
the list, so the count is now the only warning that an entry will paint a
single dot. Counts are *drawn* countries, not raw rows — artemether-lumefantrine
reads 58, and the note under the map explains any that the basemap omits.

Tracked products get **no marker** in the label. Which drug belongs to the
selected product is carried by `PRODUCT_DRUG` and the auto-bind, plus the
product tabs above the map and the note below it.

**D9 — Dictionary encoding.** `studies[]` is stored as rows against `fields[]`
with the repetitive columns (`country`, `drug`, `species`, `source`,
`citation`) held as indices into `dict[]`. `source` alone was 112 KB for 224
distinct strings. This halved the file: **373 KB → 183 KB**. Matters because
the file is regenerated whole on every WHO extract.

**D10 — The `TA` → Tanzania correction.** 38 rows in the extract carry `TA` as
both country name and ISO2, which is not a country code. The sites (Tabora,
Bagamoyo, Kilombero, Igombe) and coordinates are unambiguously Tanzania. Mapped
rather than dropped, because **TZA is one of only two register-verified
countries** in `data/products.js` — losing it would leave a verified country
looking like it had no data. This is the one place we override the source; the
reasoning is a comment on `A2_TO_A3`.

**Provenance note:** every value and every citation URL comes from the uploaded
WHO `.xlsx`. `CITATION_URL` is WHO's own column 17. Verified: 0 of 267 URLs and
0 of 224 institutions appear in our data without being in the source file. The
only things authored here are D10 and the D6 maths.

---

## 7. What's left

### Immediately
1. **Commit the v2 work** (§8) and push.
2. **Open the PR.** Two things belong in the description:
   - The `data/products.js` changelog line trips `publish.yml`'s path filter, so
     a bot commit adding `history/products-2026-09-05.js` and a rebuilt
     `feed.xml` will land on the branch after pushing. Expected, not a failure.
   - The validator reports **3 warnings, 0 errors** by design — 7 country values
     WHO covers that the 110m basemap doesn't draw, 730 studies with no citation
     URL, 1 study with no site name in WHO's own data. Provenance debt, flagged
     deliberately in the repo's existing warn-don't-block style.
3. **Talk to the team about ticket scope.** DEV-13 says all three study-result
   types; one is built. Either re-scope the ticket to this and raise DEV-13b/c,
   or agree it lands as partial.

### The other two study types
- **Delayed parasite clearance — cheap.** *Same CSV you already have*, different
  column (`POSITIVE_DAY_3 (days)`). 159 country×drug cells across 15 drugs. The
  renderer and validator are already layer-agnostic (`drawResistance` reads
  `RES[layer]`, the validator loops every non-meta key), so it needs the
  normalizer to emit a second metric plus one extra radio button. Roughly an
  hour. WHO uses the **same four bands**, so legend and colours are reused.
- **Molecular markers — expensive.** The two MM CSVs are **not in the repo**
  (deliberately — Phase 1 didn't use them; the source `.xlsx` is in the 5 Sep
  chat). Beyond the files it needs real decisions: the metric must be *derived*
  as `100 − WT%` (the file stores genotype proportions against a wild-type
  baseline), 295 studies have no WT row and need a rule, and WHO distinguishes
  **validated** from **candidate** Pfkelch13 markers — treating all 511
  genotypes as "resistant" would overstate it. Own ticket.

### Smaller / optional
- Panel number alignment — Patients and Failure are right-aligned and can read
  as detached from their headers. Cosmetic.
- **Separate, unrelated bug found along the way:** the synthetic edition's
  `assets/report-issue.js` resolves to `synthetic/assets/` and 404s. DEV-04
  added the script; `build-synthetic-edition.js` only rewrites
  `assets/journey-icons/`. The unitaid builder handles it correctly. A one-line
  fix, but it belongs in its own ticket — it was reverted out of this branch to
  keep the PR focused.

---

## 8. Commands

### Commit the v2 work

```powershell
git add scripts/normalize-resistance.js data/resistance.js sourcing/staging/resistance_tes.csv
git commit -m "DEV-13: ship every study, aggregate dots by patient-weighted average

Removes the P. falciparum and n>=20 filters - all five species and all study
sizes now ship (1,633 studies). Each country dot is the most recent study year
averaged across that year's sites and weighted by patient count, so a small
study can no longer decide a country's colour. data/resistance.js now also
carries every study for the click-through panel, dictionary-encoded to halve
the file (373 KB -> 183 KB)."

git add illustrated-journey-dashboard.html
git commit -m "DEV-13: species selector and click-through study panel

Adds a species select with impossible drug/species pairings disabled, and a
sortable panel below the map listing every study behind a country dot."

git add scripts/validate-data.js
git commit -m "DEV-13: validate the studies table and the new dot shape"

git add docs/developer-guide.md sourcing/README.md data/products.js
git commit -m "DEV-13: document the unfiltered dataset and the aggregation rule"
```

Then add this file:

```powershell
git add docs/dev-13-resistance-handover.md
git commit -m "DEV-13: working notes for handover"
git push -u origin feat/resistance-map
```

### Verify before committing

```powershell
node scripts/normalize-resistance.js          # regenerate; output should be identical
node scripts/validate-data.js                 # expect 0 errors, 3 warnings
node scripts/validate-data.js data/products.synthetic.js   # expect 0/0
node scripts/make-preview.js                  # smoke test
python -m http.server 8000                    # then open illustrated-journey-dashboard.html
```

---

## 9. Environment gotchas

**Line endings.** Files on disk are CRLF; the repo stores LF. `core.autocrlf`
is set to `input` locally, so `git status` is clean and commits normalise
correctly — but **raw `git diff` shows whole-file churn**. Always review with:

```powershell
git diff --ignore-cr-at-eol --stat
```

**Stale `.git/index.lock`.** If git refuses with *"Another git process seems to
be running"* and nothing is actually running, delete it:

```powershell
Remove-Item .git\index.lock
```

**`preview.html`** is gitignored — `make-preview.js` writes it as a smoke test,
it is not a deliverable.

**Touching `data/products.js`** triggers `publish.yml`. Only the changelog entry
does this here, and the bot commit that follows is expected behaviour.
