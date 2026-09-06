# DEV-13 — WHO resistance overlay: working notes

Handover written 5 Sep 2026. Branch `feat/resistance-map-country-dots`,
**not pushed yet**.

**This is version 1 of two.** V1 draws one dot per country because this map has
no zoom. V2 will follow WHO and draw one dot per study site with a pan/zoom
map. V2 is not started and nothing here should be built toward it yet — see
§1b for the split and why it exists.

Read this first tomorrow: §1 for where things stand, §1b for the two-version
plan, §6 for the decisions and why they were made (that's the part that's
expensive to reconstruct), §7 for what's left.

---

## 1. Status at a glance

| | |
|---|---|
| Branch | `feat/resistance-map-country-dots` (off `main` @ `6e3e739`) |
| Version | **1 of 2** — country-level dots (see §1b) |
| Commits | 13, all `DEV-13:` prefixed |
| Working tree | clean |
| Pushed | **no** |
| CI locally | all green (0 errors, 3 warnings) |
| Page affected | `illustrated-journey-dashboard.html` **only** |

The ticket says *"add all 3 types of data on our map"*. **One of the three is
built** (treatment failure). See §7 for the other two and why they differ
wildly in cost.

---

## 1b. The two versions

Both are the same data and the same normalizer; they differ only in what a dot
means and whether the map zooms.

| | **V1 — country dots** (this branch) | **V2 — site dots** (not started) |
|---|---|---|
| a dot is | one country | one study site, as WHO does |
| map | fixed 960×420 SVG, no zoom | pan/zoom |
| dot value | aggregated across sites (see D6) | that site's own most recent study |
| detail | click → panel of every study | click → that site's history |
| status | complete, ready for review | **do not start yet** |

**Why V1 aggregates.** The basemap is fixed at 960×420 and **Myanmar occupies
26×54 pixels** — its 35 study sites need ~61px² each and the box offers 39px².
Plotting every study unfiltered would put **84% of dots on top of another one**
(worst spot: 73 overlapping studies in the Cambodian Mekong). Aggregation was
forced by the pixels, not chosen.

**Why V2 is worth doing.** Aggregating to a country forces a choice of *which*
studies represent it, and every such choice loses something. The clearest cost
is visible today: Kenya reads **0%** because its most recent year (2018) had one
44-patient study at Kilifi, while Siaya's 2016 study measured **11.5% on 104
patients**. Cambodia reads **0%** off 9 patients while ignoring 354. A site-level
map has no such problem — each site simply shows its own latest result, which is
exactly what WHO does and why their map needs no aggregation rule at all.

**V1 ships with that limitation known and documented.** It must be stated in the
PR description: the map understates countries whose most recent year happened to
be small, the panel shows the full history so nothing is hidden, and V2 is the
fix. Do not let a reviewer discover it themselves.

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

## 3. Committed so far (13 commits)

```
813eecf  country totals in the tooltip, drop the selection summary
bd2af05  flat alphabetical drug list
7ec4680  working notes for handover
7a526ba  document the unfiltered dataset and the aggregation rule
88f594b  validate the studies table and the new dot shape
fbc1b9c  species selector and click-through study panel
745025e  ship every study, aggregate dots by patient-weighted average
e346a47  group the drug list, keep the empty state clear of the dots
12cdc7e  strip stray NUL bytes from the normalizer
d7c870f  document the resistance layer and its manual export step
566c262  resistance overlay on the illustrated journey map
82b678d  validate the resistance dataset
209eec0  ingest WHO Malaria Threat Map treatment-failure data
```

---

## 4. What the 13 commits contain

Roughly in build order:

| commits | what |
|---|---|
| 1 | ingest: raw WHO extract, normalizer, `data/resistance.js`, staging CSV |
| 2 | validator rules for the resistance dataset |
| 3 | the overlay itself on the illustrated dashboard |
| 4 | docs: developer guide §9, `sourcing/README.md` manual export step |
| 5 | NUL-byte fix (see §9) |
| 6–9 | the unfiltered rewrite: all species, all study sizes, patient-weighted dots, dictionary encoding, species selector, click-through panel |
| 10–13 | drug list to flat A–Z, empty-state placement, count scopes, country totals in the tooltip |

Net against `main`: 9 files, ~2,400 insertions, no deletions outside files this
branch created.

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

**D11 — One scope per place, following WHO's own layout.** Counts were appearing
at three different scopes in one tooltip, which is why Cambodia showed "2 sites"
against a panel listing 8, and Kenya showed a bare "Kilifi" against a panel
listing 5. Both numbers were always right; nothing said which scope it covered.
143 of 274 dots rest on a single site, and 58 of those countries have more sites
in their history — so this was the common case, not an edge case.

WHO's threat map keeps three scopes in three places and never mixes them: the
rule sits under the legend, a summary box counts the whole selection ("there are
N studies found with the specified criteria" plus LAST DATA UPDATE), and the dot
hover carries only that dot. Adopted the same split:

| block | scope | content |
|---|---|---|
| tooltip, rows | this dot | value, year, patients |
| tooltip, line 1 | the dot's source | "Latest study: Kilifi" when one study produced it, "2 sites in 2020" when several did |
| tooltip, line 2 | this country | "Kenya: 8 studies at 5 sites, 2010–2018" — always prefixed with the country name so it cannot be read as the dot's basis |
| `res-rule` | the method | `meta.rule`, beside the legend it explains |
| panel title | this country | "8 studies at 5 sites, 2010–2018" — same wording as the tooltip's line 2, so hover and click agree |
| `res-note` | provenance | source, both dates, the aggregation caveat, undrawn countries |

A selection-wide summary block ("588 studies at 376 sites across 57 countries")
was built and then removed: the useful question turned out to be "how much is
known about *this country*", not about the whole drug. Its dates moved into the
provenance note.

We cannot go as minimal as WHO on hover — their dot is a *site*, so colour alone
conveys the value, whereas ours is a country aggregate and the number has to be
readable. The two dates were previously buried mid-paragraph and are different
things: when WHO last refreshed the data (2025-11-19) and when we pulled our
extract (2026-09-05).

**This is presentation only.** It makes the latest-year weakness visible; it does
not fix it. Kenya still reads 0%. See the open question at the top of §7.

**Provenance note:** every value and every citation URL comes from the uploaded
WHO `.xlsx`. `CITATION_URL` is WHO's own column 17. Verified: 0 of 267 URLs and
0 of 224 institutions appear in our data without being in the source file. The
only things authored here are D10 and the D6 maths.

---

## 7. What's left

### Not in this branch — that is V2

The "most recent year" weakness described in §1b is **deliberate scope**, not an
open defect. Do not fix it here: changing the aggregation would move 95 of 274
dots and 22 colour bands, which is a review in its own right, and V2 removes the
need for aggregation altogether.

Kept here because it is the measured case for V2, and the numbers are tedious to
rederive:

| | dot uses | ignores | dot reads |
|---|---|---|---|
| Cambodia · ASPY | 9 patients (2020) | 354 patients, incl. Pailin 18% (2014) | 0% |
| Kenya · AL | 44 patients (2018) | 883 patients, incl. Siaya 11.5% (2016) | 0% |

If V2 slips and a stopgap is wanted for V1, the cheapest honest option is WHO's
per-site rule applied at country level: take each site's most recent study, then
patient-weight the sites. Measured — Cambodia 0% → **5.03%**, Kenya 0% → **3.71%**,
and 95 of 274 dots change. It is a middle step, not a substitute for V2.

### Then
1. **Rename and push** (§8). Everything is committed already.
2. **Open the PR.** Three things belong in the description:
   - This is **V1 of two** and it ships with a known limitation: the map
     understates countries whose most recent study year was small (Kenya 0%,
     Cambodia 0% — see §1b). The panel shows the full history so nothing is
     hidden, and V2 removes the need for aggregation. Say it up front.
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

### Rename and push

```powershell
git branch -m feat/resistance-map-country-dots
git push -u origin feat/resistance-map-country-dots
```

Everything is committed; there is nothing to stage. Expect a bot commit adding
`history/products-2026-09-05.js` and a rebuilt `feed.xml` shortly after the
push — that is `publish.yml` reacting to the changelog line in
`data/products.js`, not a failure.

When V2 starts, branch it from this one rather than from `main`, so it inherits
the normalizer and data file unchanged:

```powershell
git switch -c feat/resistance-map-site-dots
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
