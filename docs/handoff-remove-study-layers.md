# Handoff — removal of the WHO study-result layers

*Written 1 October 2026 on branch `feat/remove-study-layers`, cut from
`development` at `8422f8e`. For anyone merging this work into another repo or
branch (the translation pipeline in particular), and for whoever maintains the
data layer afterwards.*

If you only read one section, read §5.

---

## 1. What changed, in one paragraph

The **Country access map** on `illustrated-journey-dashboard.html` used to offer a
"Study result" choice with three radio buttons: **Treatment failure**, **Delayed
parasite clearance** and **Molecular markers of drug resistance**. All three are
gone, with everything that existed only to serve them: the Species and Marker
pickers, the Site filter, the coloured dots and numbered clusters, the
click-through study list and its bar chart, the legend and the provenance note.
The data files behind them (`data/resistance.js`, `data/molecular-markers.js`),
their raw extracts and staging CSVs, their normalizers and their validator
checks were deleted. The page now says, under the map heading, that
drug-resistance results are not shown and links to the **WHO Malaria Threats
Map**. The Region/Country filter, the Drug tabs and the access-stage fill are
unchanged. The MFT switch and the legend were then redesigned on the same branch;
see §9.

## 2. Decisions, and what was rejected

1. **Remove the whole overlay, not just the three buttons.** Hiding the radios
   would have left most of the ~1,000 lines the page lost (JS, CSS and markup)
   plus 0.5 MB of data loading on every page view for a feature nobody can reach. Species, Marker,
   Site, the dots, the panel and the legend have no meaning without a study
   layer, so they went too. The page went from 4,108 to 3,093 lines.
2. **Keep Region and Country, drop Site.** Region and Country drive the access
   fill and the MFT policy borders, so they stay. The Site list was built from
   study sites (`baseSites`), so it cannot exist without them.
3. **The link sits in the legend bar under the map** (first placed under the
   map heading, then moved on request; also considered: replacing the Study
   result block in the left rail; the Sources footer alone). The Sources footer entry for WHO Malaria Threats Map was also
   reworded, because it said "the study results behind the resistance layers on
   the map above", which is no longer true. The link text is "WHO Malaria
   Threats Map"; the old footer said "Threat Maps". WHO's own page title is
   "Malaria Threats Map", which is what is used now.
4. **`content.en.json` is deliberately NOT regenerated.** See §5. This was a
   reversal of the first answer given: it was already stale on `development`
   (`--check`: 43 strings added or changed, 35 removed or changed) before this
   work, so regenerating would have folded the MFT and Send-feedback wording
   into one new `contentHash` and made the file look current while
   `treatment-policy.js` was still missing from it. After this branch the
   check reports 47 / 183.
5. **A new changelog entry, not an edit of the old one.** The 5 Sep 2026 entry
   that says the layers were added stays as history; a 1 Oct entry says they
   were removed. `meta.lastUpdated` was **not** bumped (still 8 Sep 2026).
6. **`i18n-identifiers.js` now returns an empty set** instead of being deleted.
   It derived the protected lookup keys from the two removed files. With no
   pivoted data left there are no keys to protect, but the module and its API
   are kept so that adding a file to `FILES` restores the protection.

## 3. What was removed

| Path | Size | Note |
| --- | --- | --- |
| `data/resistance.js` | 213 KB | `window.LAUNCH_RESISTANCE` — 1,633 efficacy studies; treatment failure + delayed clearance |
| `data/molecular-markers.js` | 284 KB | `window.LAUNCH_MOLECULAR_MARKERS` — 2,869 genotype surveys |
| `sourcing/staging/resistance_tes.csv`, `resistance_mm.csv` | 324 KB, 642 KB | generated staging copies |
| `sourcing/raw/mtm/` (5 files) | ~1.1 MB | WHO extracts of 5 and 9 Sep 2026, glossary and disclaimer sheets |
| `scripts/normalize-resistance.js`, `normalize-molecular-markers.js` | | the two normalizers |
| `scripts/verify-map-clusters.js` | | tested the dot clustering; needed puppeteer, which was never installed |

Everything remains in git history. To bring it back, `git show 8422f8e:<path>`.

**Deliberately kept** (easy to delete by mistake):

- `scripts/mtm-xlsx-to-csv.py` — despite the name it is the generic xlsx→csv
  converter that `normalize-treatment-policy.js` documents for the WHO annex
  behind the MFT switch.
- `sourcing/raw/wmr/` and `data/treatment-policy.js` — the MFT switch.
- `data/world-map-geo.js` and `scripts/build-map-geo.js` — the MapLibre basemap,
  still used by the access map.

## 4. What else was edited

| File | Change |
| --- | --- |
| `illustrated-journey-dashboard.html` | markup, CSS and JS for the layers removed; 2 `<script src>` tags removed; link + footer wording added. The old code was one contiguous block (`---- resistance overlay` to just before `---- MFT policy switch`); the Location filter (Region/Country, `applyLocationFilter`, `bboxOfFeatures`) and `prettyDate` were kept and re-homed |
| MFT code in the same page | detached from the study panel: `mftFollowPanel`, `mftPanelIso` and the `with-studies` class removed; `selectMap` now calls `mftRender()` directly |
| `scripts/validate-data.js` | the `DATASETS` loop (~140 lines) removed; the MFT policy checks and the world-map load they depend on kept |
| `scripts/assemble-content.js`, `build-locale-pages.js`, `i18n-identifiers.js` | no longer read the removed files. `build-locale-pages.js` lost `localiseSurveillance()`; its post-build self-check, which resolved drug/marker keys, was replaced by one that proves each locale keeps the same product ids and stage count as English |
| `scripts/build-public-site.sh` | stopped copying the two removed files |
| `scripts/normalize-treatment-policy.js` | one comment that pointed at `normalize-resistance.js` |
| `data/products.js` | one changelog entry (1 Oct 2026) |
| `CLAUDE.md` | verify block: two normalizer lines removed; validator now **0 errors, 1 warning** (was 6 = 3 + 2 + 1) |
| `docs/developer-guide.md`, `sourcing/README.md` | resistance sections replaced by short pointers here |

**Not touched, on purpose:** `i18n/content.en.json`, `i18n/translations.json`,
`docs/jackson/*`, `poc/*` (translation-engine experiments), `feed.xml`,
`ontology/launch-data.jsonld`, `history/*`, `powerbi/*`, `streamlit-app/*`,
`unitaid/`, `synthetic/` and the other dashboard pages. None of them had the
overlay; the Streamlit and Power BI kits never read the removed files. Prose
in `docs/domain-primer.md`, `project-explainer.md`, `explainer.html` and
`story.html` that mentions resistance is about the disease, not the layers.

## 5. What a merging repo / branch must do

1. **Do not auto-merge `i18n/content.en.json`.** It is out of date on both
   sides for unrelated reasons. After merging, finish Jackson's T5 (add
   `data/treatment-policy.js` to `assemble-content.js`; see
   `docs/jackson/MFT-policy-map.md` §9), then run
   `node scripts/assemble-content.js` **once**, so the new `contentHash` covers
   MFT, Send-feedback wording and this removal together. The analyst re-approves
   that one hash.
2. **Expect `translations.json` to hold orphans.** Its entries for the removed
   panel, legend and meta strings no longer match anything. Under Rules 2 and 3
   in `docs/jackson/DEV-31.md` that is harmless (a string is substituted only if
   it is in `content.en.json`), and the memory cannot be regenerated
   identically, so leave them.
3. **Check the species names.** `i18n-identifiers.js` used to protect `P.
   falciparum`, `P. vivax` and the drug and marker names from translation.
   It no longer does, so the display labels in the MFT chips ("P. vivax" etc.)
   become translatable the next time `content.en.json` is assembled. That is a
   content call for the translators, not an accident.
4. **If the other repo carries a copy of these files** — `dist/locale/*/data/`,
   a `v1/dashboard.json` dataset (DEV-32), or a copy of
   `LAUNCH_RESISTANCE` / `LAUNCH_MOLECULAR_MARKERS` anywhere — drop them. In
   DEV-32's `build-dataset.js`, do not include the two removed globals.
5. **Delete any code that reads `window.__DEV13_MAP__`.** It was a test-only hook
   exposing `getMap()`, `getMarks()` and `setDrugSpecies()`; it no longer exists.
6. **Update the verify block you run before committing**: the validator's
   expected count is now 0 errors, **1** warning (`treatment policy`: GUF), and
   the two removed normalizers are no longer run.
7. **After merge to `main`, `publish.yml` fires** (it watches `data/products.js`):
   it adds a `history/` snapshot and rebuilds `feed.xml`, `ontology/launch-data.jsonld`
   and `ontology/launch-history.jsonld`. That is expected, not a surprise.
8. Jackson's docs `DEV-31.md` and `MFT-policy-map.md` still describe the
   removed layers (for example "35 protected identifiers"; "three data files").
   They were left alone because they are his; the figures in them are now historic.

## 6. Verification (1 Oct 2026, on the branch)

| Check | Result |
| --- | --- |
| `normalize-treatment-policy.js` | regenerates byte-identical (differs only by CR/LF on disk) |
| `validate-data.js` | **0 errors, 1 warning** (`treatment policy`: GUF not drawn) |
| `validate-data.js data/products.synthetic.js` | 0 errors, 0 warnings |
| `make-preview.js` | wrote `preview.html` |
| Inline `<script>` blocks of the dashboard | both parse (`new Function`) |
| `node --check` on the five edited scripts | all pass |
| NUL bytes in the edited page | 0; CRLF on disk, LF in the repo, as before |
| `assemble-content.js --check` | **fails, by design** (§5.1): 47 added or changed, 183 removed or changed |
| Headless Chrome, page over `http://127.0.0.1`, swiftshader flags | map canvas loads; 4 Drug tabs; legend counts 8 / 4 / 4 / 78; none of `res-controls`, `res-species`, `res-marker`, `loc-site`, `res-panel`, the radios or any `.res-dot` exists; Region 7 options, Country 235; link present in the legend bar and in the footer. **0 console errors** (only a `/favicon.ico` 404 from the test server) |
| MFT in the same browser run (before the §9 redesign; §9 has its own check) | DHA–PPQ on: 11 countries, 9 tested; 3 legend chips; AFRO filter → 7 countries (matches `MFT-policy-map.md` §8); Nigeria card shows access stage Registered, policy group Tested P. falciparum; switch off hides panel and legend; GanLum and ALAQ still show the pre-launch empty state |

**Not run:** `build-locale-pages.js` and `translate-strings.js`, which refuse to
run on a stale `content.en.json` (§5.1), so the rewritten self-check in
`build-locale-pages.js` is syntax-checked but not executed. It reads only
`data/products.js`, so it is low risk, but run it after §5.1.

## 7. Deferred, and found on the way (left alone)

- **MapLibre is now hard to justify.** The page's own comment said the library
  was an exception to the no-runtime-dependency rule because the per-site dots
  could not be built on the old SVG renderer. The dots are gone. The library
  still gives pan/zoom and the sharper 50m basemap, but a future decision could
  go back to the self-contained `world-map.js` renderer the other pages use. A
  comment in the page records this. Not changed here: it is a rendering swap and
  separate from the data removal.
- **`scripts/build-public-site.sh` has never copied `data/treatment-policy.js`.**
  The page degrades quietly (the MFT section stays hidden), so the public build
  silently lacks the MFT switch. Pre-existing; not fixed here.
- **`build-locale-pages.js` also does not copy `treatment-policy.js`** into
  `dist/locale/*/data/` (Jackson's T6).
- **The Detail panel** (right rail) is empty with the MFT switch off, as it was
  before. With the study list gone it has nothing else to show; a short hint
  there would help.
- **`meta.lastUpdated` still says 8 Sep 2026**, so the header's "Last updated"
  does not reflect this change. Bump it if the date should move.
- **`docs/data-sourcing-plan.md` Category G** still proposes a resistance
  overlay as "the single most compelling new visual". It is a plan, so it was
  left; it now describes something that was built and then withdrawn.
- **`poc/*`** (French/Portuguese engine comparisons) quote strings from the removed
  layers. They are dated experiments and were left.
- **A smoke test is not committed.** The check in §6 used a throwaway script that
  starts a static server on `127.0.0.1`, launches Chrome with
  `--remote-debugging-port` and `--enable-unsafe-swiftshader --use-gl=angle
  --use-angle=swiftshader`, and drives the page over raw CDP with Node 24's
  built-in `WebSocket` (puppeteer is not installed). Worth turning into a
  `scripts/` file if map regressions keep needing a browser.

## 8. Status

| | |
| --- | --- |
| Branch | `feat/remove-study-layers`, from `development` @ `8422f8e` |
| Commits | none yet; the work is in the working tree (12 files staged as deletions, the rest unstaged) |
| Push state | not pushed |
| CI | not run (this repo's CI has been `startup_failure` throughout; see `docs/illustrated-journey-ui-notes.md` §4) |
| Net size | roughly −17,000 lines (ignoring line endings), almost all of it whole-file deletions: the two data files and the two staging CSVs |

## 9. Legend and filters redesign (same branch, 1 Oct 2026)

With the study layers gone, the map's controls were reorganised. The design was
chosen from an interactive options page, not decided in code.

**What it is now**

- **Left rail** is Drug, then **Filters**, then Location. Filters holds two
  checklists: **Access stage** (Registered, In national guidelines, In MFT plans,
  No data) and **MFT policy** (a parent "Show MFT policy" checkbox over the four
  patient groups). Each row has a count.
- **The MFT switch is gone.** MFT policy is on whenever a policy group is ticked
  and off when none is. The parent checkbox ticks or clears every group the
  selected medicine has and shows a half-ticked state.
- **Unticking an access stage** fades that stage's countries to 15% and removes
  their MFT borders. Unticking a policy group removes its borders.
- **A badge and Reset** sit on the Filters heading. The badge counts unticked
  stages plus ticked policy groups. Reset ticks every stage and unticks every
  policy group (so MFT ends up *off*, not back at the opening state).
- **The legend under the map** keeps both keys and now lists only what is ticked.
  The MFT keys are no longer pills: both legends use the same
  swatch + label + count style (square for a fill, line for a border), each
  with a bold lead label ("Access stage", "MFT policy · ASPY").
- **The Detail panel** (donut and country list) shows only ticked groups, its key
  still lists all four with unticked ones dimmed, and with nothing ticked it
  says "Tick an MFT policy group on the left to see it here."
- **The page opens with the first-line group ticked**, so the MFT borders are
  visible on load.

**Decisions and rejected alternatives**

1. *Chosen:* legend stays under the map **and** the left rail gets checkable
   filters. *Rejected:* moving the whole legend into the left rail (layout B);
   filters plus a legend drawn on top of the map (C); no legend at all (D). They
   were shown side by side; B and D were rejected because the key under the map
   was wanted, C because the overlay hides map area.
2. *Chosen:* a checklist replaces the switch. A switch plus a checklist would
   have given two ways to turn the same thing off.
3. *Chosen, suggested options all accepted:* parent checkbox, legend follows what
   is ticked, active-filter badge with Reset, Detail list follows the filters,
   counts beside each checkbox. WHO link in the legend bar.
4. *Departure from the MFT handoff:* `docs/jackson/MFT-policy-map.md` §4.8
   decided "Behind a switch, off by default", so the page was "exactly the old
   page" until the switch was turned on. That is no longer true: the first-line
   group is ticked on open. It was a deliberate choice here, not an accident.

**Merging implications**

- `mft-switch`, `mft-track` and `mft-chip` (CSS and markup) no longer exist. If the
  other repo styles or tests them, drop that. Their replacements are `.flt-*`
  (Filters) and `.lg-t` / `.key` (legend).
- New visible strings, all unseen by the translation pipeline: "Filters", "Reset",
  "Access stage", "Show MFT policy" (now a checkbox label), "Tick a policy group to
  draw its borders on the map. Nothing ticked means MFT policy is off.", "Off.
  Tick a policy group on the left to draw its borders.", "Not in any national
  policy on this map." and "Tick an MFT policy group on the left to see it here."
  They join the list in §5.1 that `assemble-content.js` has to pick up.
- The access-stage legend keys now carry `data-lvl` and are hidden with the
  `hidden` attribute; the left rail is 250 px wide (was 220 px) so the group
  labels fit on one line.

**Verified** in headless Chrome (same setup as §6), 0 console errors: ASPY opens
with 1 filter active and 6 first-line countries; ticking Untested only draws 7;
the parent box shows the half-ticked state and ticks all available groups;
unticking "In national guidelines" removes that key from the legend; Reset
clears the badge; DHA–PPQ under AFRO gives 6 first-line countries; GanLum has
all four group rows disabled and says no policy lists it.

**Known rough edge.** The left rail is taller than before, and its height is
tied to the map column, so on a typical laptop screen Location sits below a
scroll inside the rail.

## 10. Colours and border patterns (same branch, 2 Oct 2026)

Colour now belongs to the **data** and not to the medicine. Before, the MFT
border took the selected medicine's colour (orange for ASPY, green for DHA–PPQ,
pink for GanLum, brown for ALAQ), and the three smaller policy groups shared
one dashed line.

**MFT policy groups: one colour and one line pattern each, the same for every
medicine.** On the map, in the filter list, in the legend and in the Detail panel
(donut, key squares, country dots, card):

| Group | Colour | Pattern | Contrast vs the white halo |
| --- | --- | --- | --- |
| Tested *P. falciparum* (first-line) | `#D55E00` vermilion | solid | 3.9 : 1 |
| Untested only | `#A8457E` pink-purple | dashed | 5.5 : 1 |
| *P. vivax* only | `#7A4B00` brown | dotted | 7.4 : 1 |
| Severe or pregnancy only | `#10272F` ink | dash-dot | 15.5 : 1 |

Tokens: `--mfg-tested`, `--mfg-untested`, `--mfg-vivax`, `--mfg-severe`. The old
`--mft-ganlum/-alaq/-pyramax/-dhappq` are gone, and so are the tinted shades
(`mftShade`) the Detail panel used to derive from them.

**Access-stage fills changed too**, to a light-to-dark ramp so the stages differ
in lightness and not only in hue: Registered `#6FC1CF`, In national guidelines
`#2A7FA8`, In MFT plans `#1B2A5E` (was teal `#00929F`, blue `#3A559C`, purple
`#5C245F`). Tokens `--map1`..`--map3`; everything that draws a stage swatch
reads them, so the legend, tooltips and the gate panel followed automatically.

**Numbers behind the choice** (CIE Lab distance, ΔE, after simulating protan,
deutan and tritan vision with the same matrices the options page used; below
about 15 two colours are hard to tell apart):

- The first palette tried, the Okabe–Ito set, had *P. vivax* in orange `#E69F00`:
  only 2.3 : 1 against the white halo, and ΔE 11 from the vermilion first-line
  colour under tritan vision (13 under deutan). Darkening it to `#A67C00` fixed the
  halo contrast but left ΔE 8 from vermilion under protan vision.
- Rejected for *P. vivax*: blue `#0072B2` (separable, but reads as a map fill),
  olive `#6B6B00` (ΔE 22 under tritan). Brown `#7A4B00` keeps every pair of
  group colours at ΔE 27 or more under all three simulations.
- Old fills: teal vs blue only ΔE 14 under protan. New fills: at least 19 under
  all three. The pale Registered fill is 2.1 : 1 against white no-data countries,
  which the country outlines make up for, but it is the weakest pairing.
- Patterns do not depend on colour at all, so the four groups stay separable even
  where the colours are close.

**Rejected:** one fixed ink border for all groups (the groups then differ only by
pattern, which gave up colour as a second cue); per-medicine tints of one colour
(too faint on white, and colour was the only cue); keeping the three-hue fills
(teal, blue and purple are close in lightness).

**How the map draws it:** `mft-halo` (white) under four group layers,
`mft-g-tested|untested|vivax|severe`. Dotted and dash-dot use round line caps
with near-zero dashes, and wider gaps because round caps eat half a line-width
off each gap. Layer ids `mft-solid` and `mft-dash` no longer exist.

**Merging implications:** drop any use of `mft-solid`, `mft-dash`, `--mft-*` or
`mftColor()`. The rule line under the legend changed wording (it now says each
smaller group has its own colour and line pattern), which is one more string for
the translation pipeline in §5.1. Verified in headless Chrome with all groups
ticked for ASPY (first-line, untested, vivax) and DHA–PPQ (first-line, severe):
the four borders render distinctly, 0 console errors.

## 11. Detail panel as a dashboard, and country pages (same branch, 2 Oct 2026)

The right-hand Detail rail was a donut and a list of countries. It is now a small
dashboard for the **selected medicine**, with a country page that anyone can open.
The design was chosen from an options page built on the real country shapes and
this dashboard's real data.

**What it is now**

- **Two tabs.** *Overview* and *Countries* (with a count badge).
- **Overview:** a banner ("Select any country on the map, or from the Countries
  tab, to open its page"), a *medicine facts* card (current stage and Global Fund
  procurement, taken from the medicine's own data), an *access stage mix* card
  (a stacked bar over the 94 drawn countries) and the *MFT policy groups* card
  (the existing donut, for the ticked groups).
- **Countries tab:** a search box and every country in the current Location filter,
  each row with its access-stage pill, its MFT border sample if it has one, and a
  visible **View ›**.
- **Country page** (map click, list row, previous/next arrows, keyboard list, or the
  Location filter): the country's name and region, then **only the selected
  medicine** — its stage on a three-step track (Registered, In guidelines, In MFT
  plans), its WHO policy group and the "Listed for" chips, a Tanzania-style parts
  note where one exists — then the country's position among its WHO region's
  countries and clickable chips for other countries at the same stage. Switching
  the Drug tab while a page is open keeps the country and swaps the medicine.
  GanLum and ALAQ say they are pre-launch.
- **Everything is clickable, not just coloured countries.** Every drawn country
  shows a pointer, and its hover label ends with "Click for details ›", whether or
  not MFT policy is ticked. The country whose page is open gets a white-haloed ink
  outline on the map. The hidden keyboard country list opens pages on Enter.

**Chosen from the options page:** instruction banner, country finder, hover label,
previous/next arrows, same-stage chips, medicine facts, access stage mix, MFT
policy donut, and position within region. **Not chosen:** medicines side by side,
breakdown by region, the policy-vs-access grid, medicines listed per country, and
the data-status badge on the country page. Layout was the side-column tabs version.

**Why not the others:** a wide band under the map was not picked, so the right
column stays. Region and policy-gap charts were left out; the policy-vs-access
numbers (3 of 8 ASPY policy countries and 5 of 12 DHA–PPQ ones have no access
status here) are an easy follow-up if wanted.

**What the data cannot support, so it is not shown:** trends over time (no
per-country dates), procurement volume or price by country (only medicine totals
exist; the facts card is labelled as medicine-level), registration numbers,
presentations or expiry dates by country, and forecast demand (marked TBC). The
country stages themselves are still `illustrative` except Nigeria's and
Tanzania's registrations (checked against the national registers); the page-wide
draft banner is the only caveat shown, because the per-country badge was not
chosen.

**Merging implications**

- Removed from the page: the grouped country list in the Detail, the `mft-row`,
  `mft-back` and `mft-kv` styles, `mftPanel()`, and the rule that clicking a
  country only worked while MFT policy was ticked. `mftSel` (the selected country)
  now works with MFT policy off.
- New map layers `sel-halo` and `sel-line` (the selected-country outline), new
  `.det-*` styles, and `renderDetail()`, `detOverview()`, `detCountries()`,
  `detCountry()`, `selectCountry()` and `paintSelection()` in the page script.
- New visible strings for the translation pipeline in §5.1: "Overview", "Countries",
  the banner sentence, "medicine facts", "Current stage", "Global Fund
  procurement", "Access stage mix", "MFT policy groups", "Find a country", "Type a
  country name…", "View ›", "Back to overview / countries", "Click for details ›",
  "Registered / In guidelines / In MFT plans" (track labels), "Listed for"
  (existing), "among N … countries", "Other countries at the same stage" and the
  pre-launch sentences.
- Country pages are built from `LAUNCH_MAP`, `LAUNCH_TREATMENT_POLICY` and the
  products' `detail.countries` only. No new data file, no schema change.

**Verified** in headless Chrome, 0 console errors: Overview and Countries tabs
render (94 country rows; "nig" finds Niger and Nigeria; the Location filter
SEARO narrows the list to 10); Nigeria opens from the list with ASPY only, then
DHA–PPQ only, then the GanLum pre-launch message; previous/next step
Nigeria → Oman → Pakistan → Oman; a same-stage chip opens Cameroon; Back returns
to the Countries tab; and a real mouse hover and click on the map canvas shows
"Libya, No data … Click for details ›" with a pointer cursor and opens Libya's
page.
