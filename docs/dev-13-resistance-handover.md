# DEV-13 — WHO resistance overlay: working notes

Handover written 5 Sep 2026, last updated 6 Sep 2026. Branch
`feat/resistance-map-site-dots` (**V2, in progress**), branched off
`feat/resistance-map-country-dots` (V1, frozen and pushed).

**V1 is frozen; V2 is what this branch is.** V1 drew one dot per country
because the map could not zoom. V2 follows WHO and draws **one dot per study
site** on a pan/zoom map. Both halves are built: the zoom (**D13**) and the
site layer with its clustering (**D14**, **D15**). Country dots are gone
entirely, and with them the country aggregation rule that made Kenya read 0%.

Read this first: §1 for where things stand, §1b for the two-version
plan, §6 for the decisions and why they were made (that's the part that's
expensive to reconstruct), §7 for what's left.

---

## 1. Status at a glance

| | |
|---|---|
| Branch | `feat/resistance-map-site-dots` (off `feat/resistance-map-country-dots` @ `f32384c`) |
| Version | **2 of 2** — site-level dots on a pan/zoom map (see §1b), **now MapLibre-rendered** (see §1c, D17–D21) |
| Commits | 24 — 16 inherited from V1, 3 pre-migration on this branch, 5 for the MapLibre migration, all `DEV-13:` prefixed |
| Working tree | clean |
| Pushed | V1 yes (6 Sep 2026); **V2 not yet** |
| V1 PR | **drafted, not yet opened** — see §7 |
| CI locally | data pipeline re-verified unchanged (0 errors, 3 warnings) after the migration — see §1c |
| Page affected | `illustrated-journey-dashboard.html` **only** |

The ticket says *"add all 3 types of data on our map"*. **One of the three is
built** (treatment failure). See §7 for the other two and why they differ
wildly in cost.

---

## 1c. The MapLibre migration (D17–D21) — a mid-branch reversal, not a new version

7–8 Sep 2026, landed as 5 commits (`70d3ec9`..`0686f67`). The same feature
this document otherwise describes (site dots, country-scoped clustering,
click-through panel) is unchanged in what it *shows*; what changed is the
*rendering/interaction substrate* it runs on, at the explicit, informed
request of the branch owner, who was shown the tradeoff first before any
code changed.

**D13 is superseded, not silently ignored.** D13 rejected any mapping-library
dependency ("the first runtime dependency on a page that has none"). That
reasoning was sound at the time and is recorded unchanged in §6 — it is
*superseded*, specifically and only for this page, by **D18**. Read D13
together with D18, not D13 alone, if you are deciding whether to add a
library anywhere else on the site: D13's argument still holds everywhere it
was made for. **D8** (the flat A–Z, 26-drug select) is untouched — a separate,
smaller product-card UI elsewhere on the dashboard shows only 4 tracked
drugs, and the two must not be conflated.

**What is unchanged:** every data/math decision in §6 — D5 (nothing
filtered), D6/D12 (patient-weighted pooled proportion, verified against WHO
methodology), D9 (dictionary encoding), D10 (the TA→TZA fix), D14 (no
country dots, every mark a site), D15's *clustering rule* (country-scoped,
radius-converging merge), D16 (tooltip/selection-ring grammar). Confirmed
post-migration: `data/resistance.js` regenerated with
`node scripts/normalize-resistance.js` and diffed with `--ignore-cr-at-eol`
— **zero content difference**; `validate-data.js` still reports exactly 0
errors, 3 warnings.

**What changed:** the renderer (D17–D21, in §6). New: `scripts/build-map-geo.js`
+ `data/world-map-geo.js` (a second, page-only 50m GeoJSON basemap), MapLibre
GL JS loaded from cdnjs, DOM-`Marker`-based site/cluster marks, a
keyboard-accessible country list standing in for canvas countries' lost
per-feature focusability. See D20 in particular for why D13/D15's *measured
collision numbers* (155/94/73/49/30 at 8x/12x/16x/20x/30x; 61→3 cross-border)
do not transfer to this renderer even though the *invariant* they were
proving still holds.

**Verified, via a scripted headless-browser pass at each commit, not just at
the end:** the map renders with no console errors beyond the page's own
harmless `favicon.ico` 404; product-tab switching repaints the choropleth
correctly; the resistance overlay produces coloured, clustered marks;
clicking a mark opens the panel with the correct D11 title grammar
(`"Forécariah, Kindia, Guinea · Artesunate-pyronaridine · P. falciparum — 1
study at 1 site, 2011"`); zooming in on the ASPY/falciparum selection went
from 13 marks to 24 as sites that were merged at world zoom separated;
panning works; the keyboard-accessible country list reveals correctly on
focus and stays in sync with the active product tab; **a live mid-session
light/dark theme switch was emulated and screenshotted before/after — the
map's background, country fill and NavigationControl icons all repainted in
place, no reload.**

**NOT yet done — flag this in review, do not let it slide:** the rigorous,
full D15-style re-measurement this migration's own D20 promises (same-country
overlap = 0 at a matched set of zoom levels, across **every** drug×species
cell, not just the one worked example above; the cross-border overlap count
at those zoom levels) has **not been run**. What's been verified is a smoke
test proving the mechanism works, not the exhaustive sweep D15 originally did
for the SVG renderer. This is real remaining work, tracked in §7, and the
honest state of this branch until it's done. Also not yet done: telling the
wider team — this was a mid-branch, out-of-ticket decision made explicitly
with the branch owner, but nobody else has seen it yet.

---

## 1b. The two versions

Both are the same data and the same normalizer; they differ only in what a dot
means and whether the map zooms.

| | **V1 — country dots** (this branch) | **V2 — site dots** (not started) |
|---|---|---|
| a dot is | one country | one study site, as WHO does |
| map | fixed 960×420 SVG, no zoom | pan/zoom |
| dot value | aggregated across sites (see D6, D12) | that site's own most recent study |
| detail | click → panel of every study | click → that site's history |
| status | **frozen — see D12** | **built** — zoom (D13), site dots and clustering (D14, D15) |

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

**V1 is now frozen** (6 Sep 2026). The colour rule was re-examined against WHO's
published methodology and left unchanged — see **D12**, which is the section to
read before continuing V2, because the WHO standard it establishes is what V2
is being built to.

**V2 has no country dots at all.** Decided 6 Sep 2026: every mark is a study
site, and sites too close to draw apart merge into a numbered cluster that
splits as you zoom (**D14**, **D15**). The world view stays readable — 80% of
site dots would otherwise overlap at 1x, which is the problem V1 was shaped
around — without any country aggregation rule surviving anywhere. **That closes
the Kenya problem rather than relocating it:** Kilifi and Siaya are now separate
dots showing their own results, so nothing has to choose between them.

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

## 3. Committed so far

V2 (`feat/resistance-map-site-dots`):

```
(pending)  separate co-located sites; fix the click-through (D13, D16)
628aad3    one dot per study site, clustered by proximity (D14, D15)
fdbbf48    pan/zoom on the country access map (D13)
```

V1 (`feat/resistance-map-country-dots`), inherited:

```
f32384c  record the WHO methodology check; freeze V1
4bc972c  update the handover notes; add repo working conventions
6fcc756  frame this branch as V1 of two, country dots
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

## 4. What the commits contain

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
| 14 | branch renamed to `…-country-dots`, framed as V1 of two; this document |
| 15 | `CLAUDE.md` working conventions; handover corrections |
| 16 | WHO methodology check (D12); V1 frozen, V2 handed the standard |
| 17 | **V2 begins:** viewBox pan/zoom on the map (D13); no data change |
| 18 | one dot per study site, clustered by proximity (D14, D15); no data change |
| 19 | ZMAX 8 -> 16 so co-located sites separate; the pointer-capture bug that stopped the panel opening at zoom; hover title and selection ring (D13, D16) |

Net against `main` at V1's tip (`f32384c`), measured with
`git diff --ignore-cr-at-eol --stat origin/main...`: **11 files, 4,728
insertions**, no deletions outside files this branch created. (An earlier
draft of this section said 9 files / ~2,400 — it predated commits 14–16 and
did not count the two CSVs.)

## 5. Files and what each does

| file | role |
|---|---|
| `sourcing/raw/mtm/2026-09-05-tes.csv` | The WHO extract, verbatim. 1,642 rows. Committed so CI and teammates never touch Excel. |
| `scripts/normalize-resistance.js` | Reads that CSV → writes the two outputs below. Zero dependencies, no network. |
| `sourcing/staging/resistance_tes.csv` | Auditable intermediate: every study, one row each. |
| `data/resistance.js` | Committed data the page reads. `studies[]` (all 1,633) now backs the **dots as well as** the panel — V2 derives every site from it at render time. `treatmentFailure` (274 aggregated country values) is, as of V2, only the index behind the drug and species country counts; it positions and colours nothing. **Unchanged by V2 — byte-identical to V1.** |
| `illustrated-journey-dashboard.html` | The renderer. Search for `---- resistance overlay` for the layer (data/math, untouched), `---- site-level marks` for D14/D15 (`sitesFor`/`pooled`/`mark`/`clusterSites`), `---- MapLibre init` for D18/D19 (map construction, pan/zoom). The old `---- map pan / zoom` banner (D13's hand-rolled viewBox code) is gone — deleted, not archived, per D19. |
| `scripts/validate-data.js` | Resistance rules run only on the default invocation (not the synthetic run). Still checks resistance `iso3` values against `data/world-map.js` only (D17) — unaware of `data/world-map-geo.js` below. |
| `scripts/build-map-geo.js` | **New.** Sibling to `scripts/build-map.js`, same dev-only-deps/`NODE_PATH` convention. Emits GeoJSON (not SVG paths) at Natural Earth **50m** from the identical `NUM_TO_A3` country table — this page's basemap only (D17). |
| `data/world-map-geo.js` | **New**, generated output of the above. `window.LAUNCH_MAP_GEO = {type:"FeatureCollection", features:[{properties:{iso3,name}, geometry}]}`. 100 countries (6 more than `data/world-map.js`'s 94 — see D17 for the exact accounting). Not yet loaded by any page as of this commit. |

### Current numbers

- **1,633 studies** shipped (1,642 raw minus 9 WHO publishes with a literal `NaN`)
- **26 drugs × 5 species → 274 country dots**
- `data/resistance.js` is **183 KB**
- `data/world-map-geo.js` is **~620 KB** (50m detail costs more than `data/world-map.js`'s 110m; not minified beyond 3-decimal coordinate rounding — untested whether further simplification is worth it)

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

**D12 — Checked the colour rule against WHO's published standard; kept it.**
Re-opened on 6 Sep 2026 after the question "if two sites in the same year
disagree, which value should the colour show?". The answer turned out to be that
the existing rule is already right, and the finding is worth not re-deriving.

*WHO's decision quantity.* The current WHO guidelines for malaria (13 Aug 2025)
and the earlier treatment guidelines both state it identically:

> "An antimalarial medicine that is recommended in the national malaria
> treatment policy should be changed if the **total treatment failure
> proportion is ≥ 10%**"

Two things follow. It is a **proportion** — failures ÷ patients, pooled — not a
mean of site percentages and not a worst case. And 10% is a *policy trigger*,
which is why it is one of our band boundaries.

*The existing rule already computes it.* A patient-weighted mean of site
percentages is algebraically failures ÷ patients. Verified against the data
rather than assumed: across all 274 cells the dot's value differs from the
pooled proportion by at most **0.005 pp** — rounding only. So **within a year,
D6's aggregation is exactly WHO's quantity**. Do not "improve" it.

*Rejected — worst site wins.* Proposed and measured before the methodology was
checked: 23 of 267 dots would change band, 17 of them driven by a study of ≥20
patients. It was then withdrawn, because an extreme is not a proportion and WHO
publishes no such rule. Recorded here so it is not proposed a third time.

*Rejected — a per-dot evidence line in the tooltip* ("This dot: 44 of 927
patients (2018 only)"). Built, tested, screenshotted, then reverted: it only
speaks on hover, and the ask was for the **colour** to carry the meaning. The
measurement behind it is still worth having — 70 of 267 dots rest on under a
quarter of the patients ever studied there, 33 of those read 0%, and 20 are
countries where an earlier study measured ≥10%.

*WHO's reporting unit is the study, not the country.* WHO's own status reports
count studies against the threshold rather than consolidating a country into one
number — "treatment failure rates greater than 10% occurred in four of the 159
studies"; Cambodia "13 of the 27 studies conducted". The efficacy database is
study-level and country summaries are a derived product. **This is the strongest
argument for V2** and it comes from WHO, not from us.

### What V2 should be built to

The one part of V1 with no WHO rule behind it is the choice of *which year*.
WHO's Threats Map answers it per site — "the most recent data in a site" — and
that rule combined with the pooled proportion is the most faithful country-level
aggregation available. Measured on this dataset, for whoever picks up V2:

| | now | per-site latest, pooled |
|---|---|---|
| Thailand · DHA-PPQ | 0% | **27.44%** |
| Papua New Guinea · AL | 4.32% | **18.59%** |
| Vietnam · DHA-PPQ | 54.12% | **14.33%** |
| Uganda · AL | 12.51% | 6.29% |
| Kenya · AL | 0% | 3.71% |
| Cambodia · ASPY | 0% | 5.03% |

**97 of 267 dots change value (45 up, 52 down); 22 change colour band.** It
corrects in both directions, which the earlier "understates resistance" framing
did not anticipate. Its cost is that one dot then mixes years, so a single
"Study year" row becomes a range — acceptable for V2, where a dot is a site and
the question does not arise.

Scenario counts for the latest year, if any within-year rule is ever revisited:
139 dots have one study that year, 89 have several all ≥20 patients, 14 are
mixed with the worst being a large study, 11 are mixed with the worst being a
small one, 14 have only small studies, and **0** have a study with no sample
size — every one of the 1,633 studies carries a patient count.

*Sources for the above* (checked 6 Sep 2026):

- WHO guidelines for malaria, 13 Aug 2025 — <https://www.ncbi.nlm.nih.gov/books/NBK588130/>
- Guidelines for the treatment of malaria, efficacy monitoring chapter — <https://www.ncbi.nlm.nih.gov/books/NBK294423/>
- Antimalarial drug efficacy database (study-level, per-protocol, 28-day PCR-corrected) — <https://www.who.int/teams/global-malaria-programme/case-management/drug-efficacy-and-resistance/antimalarial-drug-efficacy-database>
- Malaria Threats Map — <https://www.who.int/teams/global-malaria-programme/surveillance/malaria-threats-map>
- Artemisinin resistance and ACT efficacy status report — <https://www.who.int/docs/default-source/documents/publications/gmp/who-cds-gmp-2018-26-eng.pdf>

The Threats Map page itself publishes no aggregation methodology; WHO directs
questions to gmp-maps@who.int. If V2 needs the exact per-site rule in writing,
that is the address to ask.

**Open — the legend attributes the bands to WHO and that is unverified.** The
10% boundary is confirmed as WHO's policy threshold. The <5 / 5–10 / 10–20 /
>20 split is **not** traced to a published WHO scheme. Either find the citation
or stop attributing it. Flag it in the PR if it ships unresolved.

**Provenance note:** every value and every citation URL comes from the uploaded
WHO `.xlsx`. `CITATION_URL` is WHO's own column 17. Verified: 0 of 267 URLs and
0 of 224 institutions appear in our data without being in the source file. The
only things authored here are D10 and the D6 maths.

**D13 — Zoom is a smaller viewBox, not a mapping library.** V2's first commit,
and deliberately data-neutral: it changes no value and no dot, so the
interaction can be reviewed on its own before the site layer lands.

The projection (`PX`/`PY`) is a linear equirectangular transform fitted to
lon −120..155 / lat −40..42, reproduced from `scripts/build-map.js`. Because it
is linear, zooming needs no reprojection — the viewBox alone does it, and the
page keeps its zero-dependency shape. `d3-zoom`/`d3-geo` was the alternative
and was not taken: it would be the first runtime dependency on a page that has
none, for behaviour that is ~150 lines here.

What the viewBox scales, and therefore what has to be counter-scaled:

| | fix | why |
|---|---|---|
| country borders, dot halos | `vector-effect: non-scaling-stroke` in CSS | at 8x a `.75`-unit border renders 6px wide and swallows the small countries it exists to separate |
| dot radius | `r = 4.4 / k`, set in `applyZoom()` **and** at creation in `drawResistance` | a dot must mean the same thing at every zoom. Setting it in both places is not redundant: a drug change redraws dots while zoomed |

Verified in a headless browser across 1x → 4.1x → 8x → reset: the dot's
measured screen radius holds at 9.95–10.08 px throughout, the viewBox clamps
inside the basemap at every pan, and a dot's click still opens its study panel.

*Interaction choices worth not re-litigating.* **Ctrl/⌘ + wheel, never a bare
wheel** — the map sits mid-page and swallowing the page's scroll to zoom it is
the most complained-about behaviour in embedded maps; the affordance line under
the map states it. **Drag pans only above 1x**, so `.mapwrap`'s own horizontal
scroll on narrow screens behaves exactly as it always has. A drag that ends
over a dot is swallowed by a **capture-phase** click listener, so panning never
opens a study panel by accident. Zoom buttons plus arrow-key panning give
keyboard parity; the level readout is `aria-live`.

**`ZMAX = 16`, and it is chosen off the data at a known cost.** Originally 8,
set by the basemap: past ~8x the 110m coastlines read as visible straight-line
facets (screenshotted at 12x to confirm). Raised to 16 on 6 Sep 2026 once the
site layer existed, because 8x left real sites permanently merged — **Pailin and
Tasanh are 28 km apart and need 11.6x**, so Cambodia's 18% Pailin result stayed
hidden behind a pooled 15.52% at every zoom the reader could reach. Faceted
coastlines are the accepted price.

Same-country pairs that collide at 1x, and how many are *still* merged at each
cap (2,007 colliding pairs in total, across all 45 drug×species cells):

| cap | still merged | separated |
|---|---|---|
| 8x | 155 | 92% |
| 12x | 94 | 95% |
| **16x** | **73** | **96%** |
| 20x | 49 | 98% |
| 30x | 30 | 99% |

16x clears Pailin/Tasanh with headroom and the returns past it are poor,
because **most of the residue is WHO recording one place twice at different
granularity** — "Zaire Province" and M'Banza-Kongo which is its capital,
"Kolkata" and "West Bengal", "Tamu" and "Kalay and Tamu", "All country
(Malaysia)" and "National surveillance" — and 3 pairs sit at identical
coordinates outright. No zoom separates those, and merging them is the right
answer rather than a limitation. Worth knowing before anyone reads the 4% as a
defect.

**Going further wants a 50m basemap, and that is not a local change.**
`data/world-map.js` is loaded by **12 pages** — `index.html`, `option-b.html`,
`story.html` and both editions — including the three design options under
client review, so it cannot be swapped in place (D1). It would need a second,
higher-detail basemap loaded by this page alone. That would also retire one of
the three standing validator warnings (7 country values the 110m map does not
draw) and could carry admin-1 province borders, which is what WHO's own map
shows. Costed and deferred: a new committed data file of a few hundred KB and a
second path through `build-map.js`.

**A bug that cost the whole click-through, recorded because the cause is not
obvious.** Pointer capture was taken on `pointerdown` so that a drag could not
be lost off the edge of the map. **`setPointerCapture` retargets the following
`click` to the capturing element**, so once the map was zoomed past 1x a dot's
own click listener never fired and the study panel would not open at all — while
at 1x, where the drag handler returns early, it worked perfectly. Capture is now
taken in `pointermove`, only once the pointer has travelled the 4 px that makes
it a pan rather than a click. Verified: the panel opens on a click at zoom, on a
click after a pan, and on a press-and-release that never moves.

*Also worth not rediscovering:* a synthetic `dispatchEvent(new MouseEvent(
"click"))` in a test **cannot see this bug** — it bypasses the pointer sequence
entirely and passed throughout. It needs a real pointer press, and the element
has to be scrolled into the viewport first: `getBoundingClientRect` on a mark
below the fold returns coordinates a synthetic mouse click lands outside of,
which looks exactly like a broken handler.

**D14 — RESOLVED: no country dots. Every mark is a study site.** Opened and
closed 6 Sep 2026. The question was what a zoomed-out country dot should mean
once site dots existed beneath it; the answer was that it should not exist.

Three options were on the table, all measured first:

| option | what it meant | why not |
|---|---|---|
| keep V1's rule at low zoom | most recent study year, pooled across that year's sites | Kenya and Cambodia still read 0%, and zooming in shows site dots that visibly disagree with the country dot above them |
| roll up the site dots at low zoom | each site's latest study, pooled by patients | correct, and it makes the two levels agree — but it keeps a country aggregation rule alive for no reason once clustering exists |
| **always site dots, clustered** | sites too close to draw apart merge into one numbered mark | **chosen.** No country rule survives anywhere, which is what D12 said WHO's own practice implies |

**The roll-up rule was not discarded — it became the CLUSTER rule.** A cluster
is the patient-weighted pool of its members' most recent studies, which is
exactly what the second option would have computed for a country. So a cluster
is the sum of the dots it is hiding, and no zoom level can contradict another.
Verified against an independent recomputation straight from `studies[]`: across
every mark at every zoom the divergence is at most **0.0049 pp** — rounding, the
same standard D12 held V1's 274 dots to.

**What this closes.** V1's known limitation, stated in its PR, was that a
country whose most recent year was small reads too low — Kenya 0% off 44
patients while Siaya measured 11.5% on 104. There is now no country value to be
wrong: Kilifi and Siaya are separate dots, each showing its own study. The
"which year" choice, the one part of V1 with no WHO rule behind it (D12), is
gone rather than improved.

**D15 — Clustering: within a country, in screen pixels, recomputed per zoom.**
The mechanism that makes "one dot per site" survive a world view.

*Why clustering rather than raw site dots.* At 1x, 300 of the 376
Artemether-lumefantrine sites sit within a dot's width of another. WHO can plot
raw sites because their map opens at a zoom the reader chooses; ours opens at
world scale, where the honest picture of 376 sites is an unreadable smear.

*Recomputed on zoom, never on pan.* What overlaps is a function of `k` alone, so
`applyZoom` rebuilds the marks when `k` changes and does nothing while dragging.

*A cluster never crosses a border.* Not cartography — the rest of the page: the
fill layer, D11's tooltip grammar and the study panel are all country-scoped,
and a mark spanning Kenya and Tanzania could be labelled in none of them.

**The cost of that rule, measured:** within a country nothing overlaps at any
zoom (verified: **0 same-country overlaps** at 1x, 2.6x, 6.6x and 16x — this is
the regression test to keep). Across a border marks still can, because they may
never merge — Myanmar/Thailand, DRC/Congo, Eritrea/Ethiopia. **61 overlapping
pairs at 1x, falling to 3 at 16x.**
Zoom is the answer, and marks are drawn biggest-first so the smaller of an
overlapping pair sits on top and stays hoverable; keyboard already reached both,
since every mark is focusable regardless of what is painted over it.

*Rejected — nudging colliding marks apart.* It would have cleared the last four
overlaps, but a dot whose position is adjusted is no longer at its study site,
and this map's whole claim is that the position is WHO's.

**A bug worth recording, because the same mistake is easy to repeat.** The first
implementation used one fixed merge distance calibrated on the site dot's
radius. Clusters are drawn much larger, so two adjacent clusters passed the
"far enough apart" test and still overlapped on screen — **71 overlapping pairs
at 1x, the worst by 12 px.** The fix is that the distance two marks need is the
sum of *their own* radii plus a gap, recomputed as a mark grows during a pass.
Same-country overlaps went to zero. Any future change to a mark's size has to go
through `radiusOf`, or this returns.

*Not a WHO rule, and the page says so.* WHO publishes no clustering methodology
because their map does not need one. The rule beside the legend states plainly
that the merging of nearby sites is ours and every value is WHO's, and the
provenance note repeats it. This is the only thing on the resistance layer
authored here besides D10 and the D6 maths.

**D16 — What a mark says on hover, and how the map marks the one you clicked.**
Settled 6 Sep 2026 against WHO's own site map as the reference.

*The hover title carries the whole place.* "Pailin, Pailin Province, Cambodia"
on one bold line, as WHO's threat map labels a dot, rather than the site name
alone with the place on a dimmer line below the numbers. WHO's own site names
are often a bare district or state ("Kayin State", "Jowhar", "Multiple sites")
and some repeat across countries, so the name by itself does not locate
anything. The site's record stays below the numbers, because it is the one
thing a single dot cannot say for itself: how many studies that site has, over
what span, and whether an earlier one read into a higher band.

*Rejected — title only, as WHO does.* Their hover carries almost nothing
because their reader has already chosen a zoom and a filter, and colour alone
conveys the value. Ours has to work at world scale on first sight.

*The selected mark gets an accent ring, not a recoloured stroke.* Two things
were wrong with the first attempt. `outline` on an SVG circle is drawn around
its **bounding box** in the browser's own weight, which against a 10 px dot
reads as a heavy black square ring several times its size — the same trap the
country paths already carry a comment about. Restroking the dot instead looked
right in light theme and **failed in dark**, because the dot's halo is
`--map-nodata` and dark theme holds the same value in `--ink`: selected and
unselected became indistinguishable. So the ring is a separate circle drawn
outside the dot in `--accent`, which is saturated in both themes and reads on
every fill this basemap uses. Keyboard focus takes the accent drop-shadow the
country paths use, for the same reason and from the same tokens.

*The ring is reapplied on every rebuild, not set once on the clicked circle.*
A zoom change rebuilds every mark, and a selected cluster may split — so each
new mark entirely inside the old selection is ringed, which means an exploded
cluster marks all its parts. Setting the class at click time only, as the first
version did, lost the ring on the next zoom while the panel stayed open.

*Opacity stays at 1.* Semi-transparent dots were considered — WHO's map uses
them, and they would soften the cross-border overlaps clustering cannot fix.
Rejected: two overlapping dots would blend into a third colour that reads as a
band neither of them is, and on a four-band scale whose 10% boundary is a
treatment-policy trigger (D12) that is a misreading with consequences.

### The MapLibre migration, first step

Raised by whoever picked this branch back up: a request to redesign this
map's UI using MapLibre GL JS is in tension with D13's rejection of any
mapping-library dependency. Flagged before any code changed; the branch
owner's explicit, informed answer was to override D13 for this page only.
The full reasoning for that reversal is D18, landing with the renderer change
itself. This decision — D17 — is the one piece that had to come first and
stand alone: the basemap the new renderer needs.

**D17 — A second, page-only 50m basemap; identical country table, not a
superset.** `data/world-map.js` (94 countries, Natural Earth 110m) cannot be
swapped — 12 pages load it, three of them the client's own design options
under review (D1). A second file was the only option, already costed in D13's
original writeup ("a new committed data file of a few hundred KB and a second
path through build-map.js").

Two things were decided together:

1. *Resolution:* 50m, not 110m. The branch owner chose this after being told
   the tradeoff (bigger file, no functional requirement forced it) — D13's
   own writeup had already flagged 50m as "the natural next step." Measured:
   `data/world-map-geo.js` is ~620 KB against `data/world-map.js`'s ~90 KB;
   `scripts/build-map-geo.js` reuses `world-atlas`'s bundled `countries-50m.json`,
   no new network dependency at build time.
2. *Country scope:* `scripts/build-map-geo.js` copies `build-map.js`'s
   `NUM_TO_A3` table **verbatim** — same 101 entries, not extended to cover
   WHO-side countries the 94-set misses (COM, SLB, VUT — flagged in earlier
   analysis as absent from the drawn set). Rejected alternative: add those
   three now, since a new file was being written anyway. Not done, because
   `data/world-map.js`/`LAUNCH_MAP` stays the single source of truth for
   "which countries count as drawn" everywhere else on this page (`sitesFor`'s
   filter, `drawnCount`, `curUndrawn`, the legend counts, and
   `validate-data.js`'s undrawn-country warning) — silently widening that set
   in the same PR that's supposed to be rendering-only would change a
   reviewer-visible number (`curUndrawn`) without saying so.

**What resolution alone changed, measured against the identical 101-entry
table:** at 110m, 94 of 101 render (7 fail — coastline geometry too small to
survive simplification; this is exactly `validate-data.js`'s "7 country
values" warning count, confirmed by cross-checking the two independently).
At 50m, **100 of 101 render** — six small island states (COM, CPV, MUS, SGP,
STP, SYC) that 110m couldn't draw now have real, if tiny, polygons. One entry
(GUF, French Guiana) renders at neither resolution — Natural Earth's
country-level admin-0 layer appears not to carry it as a feature distinct
from France at all, a data-source gap rather than a simplification artifact.

**The one honest side-effect, stated rather than left for a reviewer to
find:** the renderer landing in the next commit will make those 6
newly-geometry-having countries visually present on the choropleth (as plain
"no data" shapes, since none currently appear in `data/products.js`'s
coverage lists) and in a keyboard-accessible country list, but `sitesFor()`
still filters resistance sites against the **old** 94-country `LAUNCH_MAP`
set (by design, per the parity decision above). Concretely: if COM ever gets
a WHO study site for the selected drug/species, and COM ever appears in a
product's country list, the country shape would be visibly paintable while
the resistance dot behind it stays suppressed — a country visible but its own
known resistance data unplottable. Before this migration the same country was
invisible outright, which hid the same gap less confusingly but no more
correctly. Pointing `sitesFor`'s filter and `curUndrawn` at the new
100-country set instead is the natural fix, tracked in §7, not bundled here.

This file's geometry is not yet used by anything — `illustrated-journey-dashboard.html`
still renders the old SVG map as of this commit. The renderer change is next.

**D18 — Adopt MapLibre GL JS for this page; supersedes D13.** D13's reasoning
("the first runtime dependency on a page that has none... `d3-zoom`/`d3-geo`
was the alternative and was not taken") is not wrong — it correctly describes
the cost of exactly this kind of change, and every word of it still applies
to any *other* page on this site. It is overridden here, specifically, after
the branch owner was shown that cost in full: a new CDN dependency (MapLibre
GL JS + CSS, cdnjs, pinned to `5.24.0` with Subresource Integrity), the second
basemap file D17 just added, and re-deriving D13/D15/D16's already-verified
interaction guarantees on a new substrate — that work is the next commit(s).
Chosen over vendoring a local copy: this repo has no committed third-party JS
anywhere and no build step to manage one; CDN-with-SRI was judged the smaller
departure from "no local complexity" than adding the first one.
`docs/developer-guide.md` §9's "Self-contained by design: no tiles, no CDN"
line is updated in this same commit — it is no longer accurate for this one
page and must say so, not go stale.

This commit only loads the library (`<link>`/`<script>` tags, plus the
`data/world-map-geo.js` script tag) — the page still renders the old SVG map
unchanged. Nothing yet reads `window.maplibregl` or `window.LAUNCH_MAP_GEO`.

**D19 — Native MapLibre pan/zoom, choropleth fill and marks replace D13's
hand-rolled viewBox code outright; not ported, deleted.** The whole
`Z`/`applyZoom`/`zoomAt`/`toMap` block, including the pointer-capture
workaround (`setPointerCapture` on `pointerdown` breaking a dot's `click` at
zoom — D13's "bug that cost the whole click-through") is gone. That bug has
no MapLibre equivalent to carry forward: it was purely a consequence of
hand-rolling drag-vs-click disambiguation on top of raw pointer events, which
MapLibre's own marker/map click handling does not need. The `<path>`-per-
country bootstrap and `wrap.querySelectorAll("path")` styling loop are
likewise gone, replaced by a MapLibre `geojson` source (`LAUNCH_MAP_GEO`,
`promoteId:'iso3'`) with `fill`/`line` layers painted via `setFeatureState`.

Native replacements chosen for each hand-rolled piece:

| D13 built | replaced by |
|---|---|
| `Z.k` clamped to `[1, ZMAX]`, viewBox recomputed by hand | `map.minZoom`/`maxZoom` (`ZMAX` kept at 16 — D13's reasoning, coastline facet quality, is about basemap detail and still applies, now against a sharper 50m source) |
| viewBox clamped inside the basemap so panning never shows ocean past the edge | `maxBounds`, set to the same lon/lat window `build-map-geo.js` fits to |
| "Ctrl/Cmd+wheel only, never a bare wheel" hand-written listener | `cooperativeGestures: true` — MapLibre's built-in equivalent of the exact same rule |
| custom `#mz-in`/`#mz-out`/`#mz-reset` buttons | `maplibregl.NavigationControl` (zoom buttons only, `showCompass:false`) |
| custom arrow-key pan handler | **not** MapLibre's own default keyboard scheme — see below |
| a mark's radius counter-scaled by `1/Z.k` so it holds constant screen size | not needed: DOM `Marker` elements never inherit the map's zoom transform (D20) |

**Rotation/pitch are explicitly locked off** (`dragRotate: false,
pitchWithRotate: false, touchPitch: false, keyboard: false`, with a hand-
written arrow-key-only pan listener replacing MapLibre's own keyboard scheme
entirely). Found during implementation, not anticipated going in: MapLibre's
default keyboard handler binds Shift+arrow to rotate and Shift+Up/Down to
pitch, and `dragRotate:false` does **not** also disable that — only
mouse-drag rotation. A north-up 2D choropleth that could be rotated by
Shift+arrow on a canvas the user didn't ask to rotate would be a real, silent
behaviour change, so the built-in scheme is off entirely and a 4-direction,
pan-only listener (`map.panBy`) stands in for it.

**D20 — Marks reposition to lon/lat; the clustering merge-distance test
moves to MapLibre's own screen pixels.** The crux of the whole migration,
and worth stating precisely because it is easy to get subtly wrong: D13's
`PX(lon)`/`PY(lat)` were a **linear equirectangular** projection fitted to
this basemap's fixed 960×420 canvas. MapLibre projects in **Web Mercator**,
which is not linear in latitude. Two consequences, both implemented:

1. `mark()` no longer computes `x`/`y` in pixel space at all — it outputs a
   plain patient-weighted **`{lon, lat}`** centroid (same weighting
   arithmetic as before; only the output coordinate space changed) and
   MapLibre projects it via the `Marker`'s `setLngLat`.
2. `clusterSites()`'s merge test — "do these two marks need to combine" —
   moves from comparing static `PX`/`PY` deltas divided by the old `Z.k`, to
   comparing `map.project([lon,lat])` screen-pixel distances directly. No
   `/k` division is needed: `map.project()` already encodes the current
   zoom. Recomputed per pair, same as before, because absorbing a member
   grows the merged mark and the distance it needs grows with it.

**D13/D15's measured collision tables do not transfer, and must not be
assumed.** The numbers "155/94/73/49/30 still merged at 8x/12x/16x/20x/30x"
and "61→3 cross-border overlaps" were measured under the old equirectangular
projection at those specific zoom multipliers. Mercator's north–south
stretch means the *same* real-world distance in km projects to a *different*
number of screen pixels depending on latitude and MapLibre's zoom level is
not the same quantity as the old `Z.k`. **The invariant those numbers were
proving — zero same-country overlaps at every zoom a reader can reach — must
still hold, but the numbers proving it have to be re-measured against this
renderer, not copied over.** That re-measurement is flagged in §7 as
outstanding: what's been verified so far is a single worked example
(ASPY/falciparum: 13 marks at world zoom → 24 once zoomed onto the merged
Central-Africa cluster, matching the expected direction and rough
magnitude), not the exhaustive per-drug×species sweep D15 originally ran.

Marks are drawn as MapLibre DOM `Marker`s (a plain `<div>`, not an SVG
`<circle>` or a canvas symbol layer) — the accessibility and theming
consequences of that choice are D21's, landing with the country-list commit
next; this commit only carries the geometry/positioning change.

**D21 — A keyboard-accessible country list replaces per-`<path>`
focusability; DOM `Marker`s needed no equivalent fix.** Two different
accessibility questions, two different answers, because canvas rendering
breaks them differently:

*Marks* were never at risk: `MapLibre.Marker({element})` uses a real DOM node
you supply, not a canvas-drawn primitive. `.res-dot` divs (previous commit)
keep `tabindex="0"`, `role="button"`, and the exact same
`focus`/`blur`/`Enter`/`Space` wiring the old `<circle>` elements had — a
like-for-like port, not a new mechanism, with the further benefit of
removing the counter-scaling code entirely (a DOM element already holds
constant screen size at every zoom).

*Countries* had no such escape: the fill layer is a canvas paint operation
with no per-feature DOM node to tab through, and that is a real regression
against the old focusable `<path>` elements with no zero-cost fix. Solution,
landing in this commit: a visually-hidden-until-focused `<ul>` of one
`<button>` per country (standard clip-path pattern — hidden on the button
itself, not on the list container; an earlier draft hid the `<ul>` too,
which would have clipped a focused button trying to reveal itself, a bug
caught before shipping), built from the full 100-country `LAUNCH_MAP_GEO`
set so keyboard/screen-reader users reach everything sighted users can see
on the map, wired to the exact same tooltip content (`countryTip`) countries
have always shown on hover/focus. `selectMap()` updates each button's
level/label in place on a product-tab switch, mirroring exactly what it used
to do to each `<path>`'s class/dataset. The previous commit's dead
`wrap.querySelectorAll("path")` wiring (a no-op since no `<path>` elements
exist any more) is removed in this same commit, replaced by this list.

*Rejected — a roving-tabindex simulation over the canvas itself.* Considered
and set aside: more code, and worse screen-reader semantics than a plain
list a screen reader already knows how to announce and count.

**Verified:** the list renders 100 buttons; focusing one reveals it (163×32px,
un-clipped); switching product tabs updates a given country's level/label
correctly (confirmed for Ghana under the ASPY tab: "In MFT plans").

**Theme-aware repaint.** No JS theme toggle exists on this page today (only
`prefers-color-scheme`, plus a `[data-theme]` CSS block kept for consistency
with other pages/tooling but never set here). `repaintTheme()` re-reads the
4 hex tokens the map paints from and calls `setPaintProperty` on the
background and country-line/fill layers only — band colours aren't
theme-varying and marker DOM elements resolve CSS live, so nothing else needs
a JS-driven refresh. Bound to `matchMedia('(prefers-color-scheme: dark)')`'s
`change` event, plus a defensive `MutationObserver` on `<html data-theme>`
(cheap insurance — this file already has one hard-won dark-theme
color-collision bug on record, D16, from exactly this kind of "we didn't
check the other theme" mistake). **Verified live**, not just wired: emulated
a mid-session `prefers-color-scheme` flip in a headless browser and
screenshotted before/after — the map's own background, country fill and
NavigationControl icon colours all changed in place, no reload.

---

## 7. What's left

**Read this section together with §1c.** Everything below describes what V2
*does*; the renderer it originally shipped on (viewBox/SVG, described here)
has since been replaced by MapLibre (§1c, D17–D21) without changing any of
the behaviour this section documents. Where the two sections disagree on a
mechanism (e.g. "capped at 8x by the 110m basemap" below vs. `ZMAX=16` against
a 50m basemap per D17), §1c is current.

### V2 — what is built

Done, in two commits (SVG-rendered at the time; see §1c for the current
MapLibre renderer, which reproduces every point below):

1. **Pan/zoom** (D13) — viewBox only, capped at 8x by the 110m basemap.
2. **One dot per study site** (D14) — derived in the browser from `studies[]`,
   each site coloured by its own most recent study.
3. **Proximity clustering** (D15) — nearby sites merge into a numbered mark,
   recomputed per zoom, never crossing a border.
4. **The panel narrows with the dot** — a site dot opens that site's history, a
   cluster opens its members'. D4 put every study behind a country in the
   panel; what you click is now what you get.

**`data/resistance.js` is untouched by V2** — byte-identical to V1, no
regeneration, nothing in the data for a reviewer to re-check. The whole site
layer is derived at render time from `studies[]`, which already shipped all
1,633 studies to back V1's panel.

### V2 — still open

- **`treatmentFailure` is now only an index.** It still backs the drug and
  species country counts, but nothing positions or colours from it. Either
  document it as a count index or have the normalizer stop emitting the
  aggregate — it is 274 values that no longer appear on the page.
- **The legend band attribution** (below) applies unchanged; V2 reuses the same
  four bands.
- ~~A higher-detail basemap for this page only~~ — **done** (D17):
  `data/world-map-geo.js`, 50m, this page only.
- **Cross-border overlap, and same-country overlap generally, need
  re-measuring against the MapLibre/Mercator renderer.** D15's old numbers (3
  cross-border pairs at max zoom; 0 same-country overlaps at 1x/2.6x/6.6x/8x)
  were measured under the SVG renderer's equirectangular projection and do
  not transfer (D20). Only a single worked example has been re-checked since
  the migration (ASPY/falciparum, 13→24 marks across one zoom step). A full
  sweep — every drug×species cell, a matched set of zoom levels — has not
  been run. This is the single most important open item from the migration:
  it is what D15's original work actually *proved*, and proving it again is
  what makes the port trustworthy rather than merely working in the cases
  someone happened to click.
- **`scripts/validate-data.js` still checks undrawn countries against
  `data/world-map.js` only** (94, not the new 100 — D17). Its "7 undrawn"
  warning is accurate for what `sitesFor` actually draws (still gated on the
  94-set by design) but doesn't reflect that geometry now exists for 6 more
  of them. Leave as-is unless `sitesFor`'s filter itself moves to the
  100-country set — the two should change together, not separately.
- **Talk to the team about the MapLibre migration itself, separately from the
  V1 PR conversation already flagged below.** The ticket asked for "all 3
  study types on our map," not a rendering-engine change — the migration was
  a mid-branch, out-of-ticket decision made explicitly with the branch owner
  (§1c) but the wider team hasn't seen it yet. Not yet raised, by the branch
  owner's own choice (iterating solo a bit longer first).

### V1 is frozen

Decided 6 Sep 2026: V1 ships as it stands. The colour rule was re-examined
against WHO's published methodology and confirmed correct for within-year
aggregation (**D12**) — so there is nothing to fix here, not merely nothing
worth fixing.

### The "most recent year" weakness — V1's known limitation, closed in V2

Deliberate scope in V1, not an open defect there: changing the aggregation
moves 97 of 267 dots and 22 colour bands, which is a review in its own right.

It is **gone in V2**, not improved: with no country dot there is no country
value to be wrong (**D14**). Kept here because it is the case V1's PR must
still state, and the numbers are tedious to rederive:

| | dot uses | ignores | dot reads |
|---|---|---|---|
| Cambodia · ASPY | 9 patients (2020) | 354 patients, incl. Pailin 18% (2014) | 0% |
| Kenya · AL | 44 patients (2018) | 883 patients, incl. Siaya 11.5% (2016) | 0% |

In V1 this was a stopgap worth avoiding. In V2 the same arithmetic survives as
the **cluster** rule (D14): a cluster is its members' most recent studies pooled
by patient count. Applied to a whole country it gives Cambodia **5.03%** and
Kenya **3.71%** — but it is only ever applied to marks the reader can zoom
apart, so the country number is never the last word.

**Verified on screen, not just in the arithmetic.** At maximum zoom, Cambodia ·
ASPY · falciparum draws **8 marks for its 8 sites**, and Pailin stands alone
reading its own **18%** with its 2014 study and source link in the panel. This
took raising `ZMAX` to 16 (D13): at 8x, Pailin and Tasanh — 28 km apart — stayed
merged at a pooled 15.52%, so the finding the table above exists to preserve was
still not reachable by a reader.

### Then
1. **Open V1's PR.** A full description is drafted and covers all three points
   below; it was handed over in the 6 Sep session rather than committed,
   because it is a PR body and not a repo artefact. There is **no `gh` CLI on
   this machine**, so it is opened by hand at
   <https://github.com/Keith-paradox/launch-development/compare/main...feat/resistance-map-country-dots?expand=1>.
   Note that V2 is branched off V1, so the two are stacked — review feedback on
   V1 lands underneath this branch. Three things belong in the description:
   - This is **V1 of two** and it ships with a known limitation: the map
     understates countries whose most recent study year was small (Kenya 0%,
     Cambodia 0% — see §1b). The panel shows the full history so nothing is
     hidden, and V2 removes the need for aggregation. Say it up front.
   - **On merge**, the `data/products.js` changelog line trips `publish.yml`, so
     a bot commit adding `history/products-2026-09-05.js` plus a rebuilt
     `feed.xml` and the two ontology exports will land on `main`. Expected, not
     a failure. It does **not** fire on this branch — `publish.yml` is scoped
     to `branches: [main]`.
   - The validator reports **3 warnings, 0 errors** by design — 7 country values
     WHO covers that the 110m basemap doesn't draw, 730 studies with no citation
     URL, 1 study with no site name in WHO's own data. Provenance debt, flagged
     deliberately in the repo's existing warn-don't-block style.
2. **Talk to the team about ticket scope.** DEV-13 says all three study-result
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

### Rename and push — done 6 Sep 2026

```powershell
git branch -m feat/resistance-map-country-dots
git push -u origin feat/resistance-map-country-dots
```

Kept for the record. Nothing was staged; everything was already committed.

No bot commit follows a push to this branch: `publish.yml` is scoped to
`branches: [main]`, so it only runs when the PR merges. See §9.

### V2 branched — done 6 Sep 2026

Branched off V1 rather than `main`, so it inherits the normalizer and data file
unchanged:

```powershell
git switch -c feat/resistance-map-site-dots
```

Not yet pushed. `publish.yml` does not fire on it either (§9).

### Verify before committing

```powershell
node scripts/normalize-resistance.js          # regenerate; output should be identical
node scripts/validate-data.js                 # expect 0 errors, 3 warnings
node scripts/validate-data.js data/products.synthetic.js   # expect 0/0
node scripts/make-preview.js                  # smoke test
```

**There is no Python on this machine** — `python -m http.server` (the command
this section used to suggest) fails with "Python was not found" (a Windows
Store alias stub, not a real absence-of-error). Use a one-line Node static
server instead, e.g. serve the repo root with any tiny `http.createServer`
script that maps `/` to `illustrated-journey-dashboard.html` — there's nothing
in `package.json` for this today, worth adding a real dev script if this
comes up again rather than re-improvising it.

**Neither the MapLibre migration nor V2 before it change any data**, so all
three commands above still pass untouched — a diff in `data/resistance.js`
means something is wrong, not something new. Confirmed post-migration: ran
`normalize-resistance.js` and diffed with `--ignore-cr-at-eol` — zero content
difference; `validate-data.js` still reports exactly 0 errors, 3 warnings.

What needs checking is in the renderer, and none of it is covered by the
validator. The table below is D15's **original** SVG-era invariant list,
checked headlessly at 1x/2.6x/4.1x/6.6x/8x under the old equirectangular
projection — **kept here as the spec of what "correct" means**, not as a
claim that these exact numbers still hold. See §1c/D20 for what's actually
been re-checked since the MapLibre migration (a single worked example) versus
what still needs the same exhaustive treatment D15 originally gave it:

| invariant | expected (original, SVG/equirectangular) | status under MapLibre |
|---|---|---|
| sites represented across all marks | constant (363 for AL/falciparum) | unaffected — `sitesFor()` untouched; not re-run but no code path changed |
| same-country overlapping pairs | **0 at every zoom** — the D15 regression test | **not re-run at full sweep** — one worked example only (§1c). Treat as open until it is |
| cross-border overlapping pairs | 61 at 1x falling to 4 at 8x | **numbers do not transfer** (D20, different projection) — not yet re-measured under Mercator |
| a mark's value vs an independent pool from `studies[]` | within 0.005 pp | unaffected — only `mark()`'s coordinate output changed, not its `v`/`n` arithmetic |
| a site dot's measured screen radius | constant, ~10 px at every zoom | **simplifies to true by construction** — DOM `Marker` elements are never counter-scaled (D20); confirmed visually via screenshot at multiple zooms, not measured in px |
| overlay off, then zoom | no dots return | confirmed — same `curSites = null` gate, now checked before the `zoomend` handler calls `drawMarks()` |
| a real pointer click on a dot, at zoom, opens the panel | see D13's capture bug | **D13's specific bug no longer applies** (no `setPointerCapture` workaround exists to break — D19); confirmed via a scripted headless click (Puppeteer `ElementHandle.click()`, a real CDP input event, not `dispatchEvent`) that the panel opens with the correct D11 title. **Not yet tested:** a drag that starts elsewhere and ends on top of a marker — flagged in D20/§1c as a new, minor interaction difference (a marker can't *start* a drag, only be dragged *across*) |
| the selection ring after a zoom change | still on the mark, panel still open | mechanism unchanged (`selKeys`/`applySelection`); not re-tested through an actual zoom-triggered rebuild since the migration |
| Cambodia at max zoom, ASPY/falciparum | 8 marks for 8 sites, Pailin standalone at 18% | **not yet re-run** — the one worked example checked was a different cell (see §1c) |

New checks with no pre-migration precedent, and their status:

| new invariant | status |
|---|---|
| map never rotates/tilts under any gesture (mouse or keyboard) | `dragRotate`/`pitchWithRotate`/`touchPitch`/`keyboard` all disabled at construction (D19) — not separately fuzz-tested, but the handlers that would cause rotation are off, not merely unbound |
| `cooperativeGestures` blocks a bare wheel scroll | not explicitly tested; the option is MapLibre's own, standard behaviour |
| light/dark theme switch mid-session repaints the country layer | **verified live** — emulated a mid-session `prefers-color-scheme` flip in a headless browser and screenshotted before/after; background, country fill and the NavigationControl icons all repainted in place |
| keyboard-accessible country list stays in sync with `byIso` after every `selectMap()` call | confirmed for one product tab (button text/level updates on focus) — not checked across every tab |
| keyboard focus reveals a country-list button without being clipped by an ancestor | confirmed — a bug where the list container itself clipped a focused button was caught and fixed before this was written down |

---

## 9. Environment gotchas

**Line endings.** Files on disk are CRLF; the repo stores LF. `core.autocrlf`
is set to `input` locally, so `git status` is clean and commits normalise
correctly — but **raw `git diff` shows whole-file churn**. Always review with:

(Checked 6 Sep 2026: `illustrated-journey-dashboard.html` is in fact pure LF on
disk — 0 CRLF pairs — so the churn does not affect the one file V2 edits most.
Verify per file rather than assuming; the flag below is harmless either way.)

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

**Touching `data/products.js`** triggers `publish.yml` — but **only on `main`**
(`on: push: branches: [main], paths: ["data/products.js"]`). Feature-branch
pushes never fire it, so there is nothing to watch for until merge. On merge it
validates, appends `history/products-<meta.lastUpdated>.js`, rebuilds `feed.xml`
and the two ontology exports, and pushes one `[bot]` commit to `main`.

The snapshot is **append-only**: if `history/products-2026-09-05.js` already
exists with different content, the job fails on purpose and tells you to bump
`meta.lastUpdated` first. That is the one way this workflow can legitimately go
red. Only the changelog entry touches `data/products.js` on this branch.

---

## 10. Keeping this document current

This file is the only written record of why the branch looks the way it does.
It stops being useful the moment it disagrees with the repo, so it is updated
as part of each task — not afterwards, and not at the end of the branch.

**After every task that changes anything in the branch, before committing:**

| Changed | Update |
|---|---|
| behaviour a reviewer would see | §2, and §6 if a *decision* was made rather than a detail chosen |
| a rejected alternative, or a number that was expensive to measure | §6 — record the measurement, not just the verdict |
| files added or removed | §5 |
| commits | §1 count, §3 list, §4 grouping |
| branch name, push state, CI result | §1 table |
| something deferred, descoped, or newly found | §7 |
| a command or environment trap worth not rediscovering | §8 / §9 |

Two rules that matter more than the table:

- **The doc edit goes in the same commit as the change it describes.** A
  separate "update docs" commit is a promise to forget.
- **Record what was rejected and why, with the numbers.** §6 is the expensive
  part to reconstruct; the code can always be read back, the reasoning cannot.

If a task changes nothing a reader of this file would care about, say so
explicitly rather than silently skipping the update.
