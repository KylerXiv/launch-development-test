# Reviewer feedback, September 2026 — working notes

External review of the illustrated journey dashboard. Six observations; the five
below are landed. The two structural ones (parallel WHO gates, and how the
out-of-order ASPY dates are surfaced) are **not** done — they are blocked on a
decision, recorded at the end.

## Decisions

### 1. Stage 2 is "WHO recommendation", stage 3 is "WHO PQ listing"

The reviewer's argument is that both old labels named a *process* while the
dashboard exists to show *barriers*. What blocks a product is not having a
recommendation and not being on the PQ list; the WHO Guidelines for malaria is
merely where the recommendation gets published, and prequalification is merely
the assessment that produces the listing. Renamed to the outcome in both.

Deliberately **not** renamed, because they name the real institution, process
or document rather than the gate:

- `SRA` and `EOI` glossary entries ("anchors WHO prequalification", "the WHO
  prequalification invitation list").
- The `PQ` glossary entry, which now reads "WHO prequalification — the quality,
  safety and efficacy assessment whose outcome, a listing on the WHO
  prequalified-products list, …". The term being defined is still the process;
  the definition now points at the outcome.
- Every `source:` string ("WHO PQ list", "WHO Guidelines for malaria").
- The "Sources." footer line on index/option-b/unitaid/synthetic ("WHO
  Guidelines & Prequalification updates") — these are the feeds we watch.
- `scripts/fetch-regulatory.js`, `scripts/build-ontology.js` org registry
  ("WHO Prequalification", the institution), `docs/domain-primer.md` §187.
- The map legend **"In national guidelines"**, which is country-level adoption
  (stage 5) and has nothing to do with stage 2. Renaming it would have been the
  easy mistake here.

`journey[]` and `milestones[]` labels were renamed alongside the stage array,
since they are the same gates under a different view. Milestone
"WHO guideline strong recommendation" → "WHO recommendation (strong)".

Icon **ids** are unchanged (`03-who-guidelines`, `04-who-prequalification`), so
the generated asset filenames still carry the old names. Ids are positional and
internal — nothing outside `assets/journey-icons/` references them, and the
generated SVGs are not part of the public build. Renaming them buys nothing and
orphans two files.

### 2. "current bottleneck", applied to both products

The reviewer asked for it on ASPY ("clearly there were other bottlenecks before
now, otherwise it would not have taken as long as it did"). Applied to DHA–PPQ
as well, and to both synthetic-edition flags: the reasoning is not
ASPY-specific, and two flags side by side with different constructions reads as
an oversight. Trivial to revert to ASPY-only if the reviewer meant it narrowly.

### 3. Spatial emanators removed, not deleted

Rejected alternative: gate the render behind a `hidden` flag. Six pages filter
`p.placeholder` independently (index, option-b, pipeline, the dashboard, and
the unitaid/ + synthetic/ copies of each), so a render-time flag meant six
edits and six chances to miss one. Removing the product object from
`data/products.js` removes it from all six at once and needs no JS change.

The research is not lost: the full product object and both changelog entries are
parked verbatim in `docs/parked/emanators.json`, with re-add instructions.
`docs/` is excluded from the public build, so it stays private.

Also removed: the "Spatial emanators" card in `explainer.html`, and its
known-unknowns bullet — replaced with a bullet recording *why* prevention tools
are out of scope, which is the more useful thing for a reader to know.

Left in place deliberately:

- The `p.placeholder` machinery in all six pages and in `validate-data.js`. No
  product uses it now; it is the mechanism a future prevention tab needs.
- `PRODUCT_ORGS.emanators` in `scripts/build-ontology.js`. It is a keyed lookup
  *from* the product list, so a key with no product is inert — and it is one
  less thing to reconstruct on re-add.
- `ontology/index.html`'s "(e.g. spatial emanators)", which is an example of a
  *type*, not a tracked row, on a page that is not published.

### 4. "What's changed recently" → "Recent dashboard updates"

The reviewer read it as developments on the drugs. Renamed, along with the
feedback-form confirmation text that quotes the old heading back at the user.

`index.html` says "Recent updates", which does not carry the same false
promise — left alone.

### 5. One bug found in passing, and fixed

`explainer.html`'s DHA-PPQ card said "WHO-recommended 2015". The dataset says
2010 — the changelog entry of 2026-08-23 records that correction ("WHO guideline
recommendation year corrected to 2010 ... previously shown as 2015"), but the
explainer page was never updated with it. A public page contradicting the
dataset is worse than either version alone, so it is fixed to 2010 rather than
left for a later pass.

Worth a check elsewhere: the explainer's prose carries hand-written dates that
do not come from `data/products.js`, so nothing keeps them in step. This is the
second-order cost of that design and it will happen again.

## Deferred, and why

**The two WHO gates side by side rather than in sequence.** Not attempted. It is
a structural change, not a relabel: `validate-data.js` enforces exactly one
`stages[]` entry per stage name, and the sequence with its `→` arrows is baked
into the pathway strip, the per-product stage rail, the actual-timeline SVG
(including the logic that dips the connector back for out-of-order gates), the
gate detail panels and the generated ontology's positional stage concepts. The
reviewer also asked for Meg and Lisa's agreement first, since drawing them in
parallel is an editorial claim about how the system *should* work, not a layout
preference.

**The ASPY "typo" in the dates.** There is no typo. EMA Article 58 opinion 2012,
PQ listing 2012–2016, WHO strong recommendation 2022 — all three are correct and
sourced. It reads as an error because the fixed pathway order draws the PQ gate
*after* the recommendation gate, so the years run backwards on screen. ASPY
cleared these two gates in the opposite order to the one the board draws, which
is itself evidence for the reviewer's parallel-gates argument.

The dashboard already detects this: the timeline SVG dips the connector and
carries a `<title>` reading "these gates were not cleared in pathway order".
That is hover-only, so nobody sees it. The fix is to surface that state visibly
on the stage rail too — but it is the same decision as the parallel gates, so it
waits with it rather than getting a separate treatment that then has to be
undone.

## Status

- Branch: `feat/resistance-map-site-dots`. Uncommitted at time of writing.
- Files touched: `data/products.js`, `data/products.synthetic.js`,
  `assets/journey-icons/icons.js`, `icons-solid.js` (+ 3 regenerated SVGs),
  `explainer.html`, `illustrated-journey-dashboard.html`, `ontology/index.html`,
  `docs/{user-guide,domain-primer,project-explainer,data-model}.md`, and new
  `docs/parked/emanators.json`.
- Verify block: `validate-data.js` 0 errors / 5 warnings (3 resistance +
  2 molecular markers, unchanged); synthetic 0/0; both normalizers byte-identical;
  `build-journey-icons.js` rewrote 8 SVGs, only 03 and 04 changed in content;
  `make-preview.js` and `build-public-site.sh` both clean. No NUL bytes.
- Not run: `verify-map-clusters.js` (needs puppeteer, not installed).
