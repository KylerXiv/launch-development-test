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

## 2. The RBM pages (`scripts/build-rbm-pages.js`)

What RBM embeds (iframe, one route per language). Built into `dist/rbm/`
(gitignored); the handover README that goes with them is `rbm/README.md`.

```
dist/rbm/en/index.html  fr/index.html  pt/index.html
dist/rbm/assets/                          icons, logos, report-issue.js
dist/rbm/data/world-map.js, world-map-geo.js   map shapes (static)
dist/rbm/README.md                        hosting, framing header, iframe snippets
```

**How.** It takes the English page and the French and Portuguese pages that
`build-locale-pages.js` writes (interface text already translated), and:

1. removes the `<script src>` tags for `products.js`, `sources.js` and
   `treatment-policy.js`; a loader fetches `dashboard.json`, picks the page's
   language from every `{ en, fr, pt }`, rebuilds the three globals the page has
   always read, and only then runs the page's own scripts (kept unchanged, as
   `<script type="text/x-launch-app">`). The page code is not edited, so the
   LAUNCH site and the RBM pages stay one page;
2. points relative paths one level up (`../assets/`, `../data/`);
3. removes the site menu (Pipeline and Story are not handed over; the owner
   does not need them yet, and the platform has its own navigation);
4. hides Subscribe for updates (its backend, `api/`, stays on the LAUNCH
   Vercel project).

Data URL: `https://codebyjackson.github.io/launch-data-test/v1/dashboard.json`
(`--data-url` overrides it, e.g. `../dashboard.json` for a local test).

**Decisions and why.**
- *Loader + deferred scripts, not editing the page:* the page reads
  `window.LAUNCH_DATA` synchronously in ~3,000 lines; making it async in place
  would fork it from the LAUNCH site. Deferring the scripts keeps one page.
- *The page filters sources on `public`*, a field `dashboard.json` drops
  (everything in it is public): the loader sets `public: true`, or the Sources
  footer would be empty. Found while building.
- *The page has no `</head>`*, so the Subscribe-hiding style travels with the
  loader; a first version put it before `</head>`, did nothing, and the button
  stayed visible — caught on the screenshot.
- *Failure states:* no dataset → "the data could not be loaded"; an unknown
  `schema_version` → "being updated"; nothing else drawn. The French and
  Portuguese of these two messages are **hand-written, not reviewed**.

**Checks (2 Oct 2026, headless Chrome against a local `dashboard.json`):**
all three pages render the four medicines, journeys, barriers and the draft
banner in their language; the Sources footer is filled; no console errors;
Subscribe and the menu are gone; with the dataset missing (fr) and with
`schema_version: 2` (en) the banner shows the right notice and no rows are
drawn. The map canvas stays blank headless, as on the LAUNCH site itself, so
the map was not seen in a browser. `test-build-rbm-pages.js`: 10 passed; it
and a build run in `validate.yml`.

Not tested yet: against the real published URL (needs the first publish), and
inside an iframe on another domain.

## Deferred

- Translating the 43 / 42 new strings: the translate bot, after the merge.
- Review of the two hand-written fr/pt error messages.
- Hosting the RBM pages and the `frame-ancestors` header (RBM's call).
- Subscribe for updates on RBM: needs a decision on where its backend lives.

## Status

Local branch, not pushed, two commits on top of `feat/public-data-layer`.

## 3. The publish summary listed shifted changelog lines (fixed 2 Oct)

The first automatic publish (approval of test proposal #35) worked, but its
"what changes" summary was 40 lines of `changelog[13].plain: … → …`: every
approval adds a line at the top of the changelog, and `dataset-diff.js`
compared lists by position, so every line below looked changed and the real
change (GanLum's WHO PQ stage) fell into "… and 13 more". Now: lists whose
items have an `id` (products, sources) are matched by id; a list that grew or
shrank (the changelog) reports only the entries added or removed; fixed-length
lists (a product's stages) still compare by position. On the real #35 publish
and its revert the summary is now 6 lines: the added (removed) changelog line
and the five fields of GanLum's stage 3. `test-dataset-diff.js`: 8 passed, run
in `validate.yml`.

## End-to-end test on GitHub (2 Oct 2026)

First publish (Publish now) → test proposal #35 approved → decision, history
(green after the `ref: main` fix), translate, **publish started by itself**
(`trigger: approval`, issue 35) → `TEST-0001` live in `dashboard.json` → revert
on `main` (also removing the test snapshot `history/products-2026-10-01.js`) →
Publish now → GanLum back to `idle`, `TEST-0001` gone. The data repo keeps all
three publishes and their archive copies.
