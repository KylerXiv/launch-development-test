# RBM handover — working notes (feat/rbm-handover)

*2 Oct 2026, Jackson (Oakkar-Min) with Claude Code. Branch `feat/rbm-handover`,
stacked on `feat/public-data-layer` (PR #32, not merged yet). Two tasks, one
commit each: the translation gaps, then the RBM pages.*

## 1. Translation gaps (fields shown on the page, never translated)

Found while building `dashboard.json` (docs/public-data-layer-notes.md):
`assemble-content.js` (what gets translated) and `localiseProducts` in
`build-locale-pages.js` (what gets substituted) both missed fields the page
renders, so `/fr` and `/pt` showed them in English:

| Field | Shown as | Why it was missed |
| --- | --- | --- |
| `stageInfo[].what / who / stall` | the step explainer panel | added with Keith's merge, never added to either list |
| `products[].barrier` | "Main barrier" column | same |
| `products[].stages[].next` | "Next step" in a stage's detail | never listed |
| `detail.journey[].label` | journey gate labels | read from `p.journey`; the data has it under `detail` |
| `detail.volumeNote` | "No procurement yet" line | read from `p.volumeNote`; same |

`stageInfo[].source` stays English: it is provenance, as every other source
line is.

Effect: 42 more strings collected (361 in total, data bucket 181 → 223); 4
were already in the memory, so 43 (fr) / 42 (pt) are left to translate,
about 3,500 characters. They are **not** translated on this branch: there is
no engine key here and translations are not written by hand. `translate.yml`
translates them by itself after the merge (it watches
`scripts/assemble-content.js`). Until then they show in English, as they
always have; the build's coverage figure drops from 97% to 87% only because
they are now counted.

`dashboard.json` needed no change: `TEXT_PATHS` already listed all five, so
their type stays `{ en, fr, pt }`; fr/pt coverage there goes 70% → 72% now
(the 4 already in memory) and up again once the bot has run.

Checks: validator 0 errors / 1 warning; locale build strict, self-check
passes; `test-build-dataset.js` 28 passed.
