# Merging Keith's `development` into this repo — working notes

Branch `merge-keith-development`, 1 Oct 2026. This brings everything on
`Keith-paradox/launch-development`'s `development` branch (at `8422f8e`, 30 Sep)
into this repository's `main`, so this repo's Vercel host shows it. This is the
branch's working-notes document, per [CLAUDE.md](../CLAUDE.md).

The two lines of work split at `ee1181e` (28 Sep, "DEV-31: assemble-content.js
and content.en.json"). Since then Keith's branch has **58 commits** this repo
did not have, and this repo has **77** Keith's branch does not. Those are the
proposal flow, translation and the French and Portuguese pages.

---

## 1. Decisions

### A merge commit, not a rebase or a squash

Keith's 58 commits arrive unchanged, with their ids and authorship, under one
merge commit.

| Rejected | Because |
| --- | --- |
| Rebase Keith's commits onto `main` | Rewrites all 58 into new ids. The two repositories would then share no history past 28 Sep, and every later sync would conflict as if from scratch |
| Squash into one commit | Loses who wrote what, and makes the next sync with Keith's branch a conflict on every line he touched |

### The three conflicts

Git conflicted on 3 blocks in 3 files. All six files both sides had touched
were checked, but only these three needed hands.

| File | Conflict | Resolution |
| --- | --- | --- |
| `scripts/build-public-site.sh` | Keith replaced `unitaid-mark.svg` with `unitaid-logo.svg` and added `site-nav.js`. `main` added the French and Portuguese build after the same line | Keith's asset line, then `main`'s locale block unchanged. No page still references `unitaid-mark.svg`, and the file is gone on Keith's side |
| `illustrated-journey-dashboard.html` | Each side added one `<script src="data/…">` at the same spot: `sources.js` (`main`, the Sources footer) and `treatment-policy.js` (Keith, the MFT policy switch) | Both, `main`'s first |
| `scripts/validate-data.js` | `main` had moved every rule into `scripts/data-rules.js` and cut this file down to a wrapper. Keith added two checks to the old, inline version | `main`'s wrapper, with Keith's two checks ported into `data-rules.js` (below) |

### Keith's validator checks, ported rather than pasted

Keith's two checks did not fit `main`'s validator as written. The
treatment-policy block was even merged *without* a conflict, into `main`'s
wrapper, where the names it uses (`err`, `warn`, `data`, `drawn`) do not
exist. It would have thrown on the first real run. So:

- **`stageInfo`** went into `checkData()`, next to `stageColumns`. It is a rule
  about the data file itself, so the browser editor now enforces it too, as
  `data-rules.js` intends.
- **The treatment-policy checks** became `checkTreatmentPolicy()`. It takes
  file *contents*, like `checkStudyLayers()`, so the rules stay free of I/O.
  `validate-data.js` reads the files and calls it on the real run only. Every
  message is Keith's, word for word. One small difference: if
  `world-map.js` will not evaluate, `checkStudyLayers()` already reports that
  as an error, so this check skips its undrawn-country warning rather than
  flag every country.

**Checked equivalent to Keith's original.** On the real data, both report
`0 errors, 6 warnings` with the same six messages. Four deliberate breaks were
then run through both validators: a blank `stageInfo` field, a missing
`stageInfo` entry, a policy product id not in `products.js`, and a bad WHO
region code. Each gave the identical error on both sides.

### Two fixes the merge needed beyond its conflicts

- **`data/treatment-policy.js` was not in the public build's copy list**, on
  Keith's branch too. On Vercel, the English page would request it, get a 404,
  and the "Show MFT policy" switch would have no data. The French and
  Portuguese copies worked only by accident: the locale builder copies every
  data file the page loads. Added to the list.
- **Keith's eight `stageInfo` lines were reformatted to house style.**
  `test-serializer.js` failed on them. Per CLAUDE.md, the first job was to
  establish which side was wrong. The file was the outlier: those lines were
  written `{"what": …}`, while every other one-line object in the file, and
  the serializer, use `{ "what": … }`. The serializer's output is
  JSON-identical to the file and differs on exactly those 8 lines. Left
  alone, the first save through the editor or a proposal would have
  rewritten them as noise in an unrelated diff. On Keith's branch the same
  test crashes before it reaches the comparison; not investigated.

---

## 2. What happens once this reaches `main`

- **`vercel-deploy.yml`** deploys production, which is the point.
- **`publish.yml`** runs, because `data/products.js` changed. It snapshots the
  file as `history/products-2026-09-30.js`. No snapshot for that date exists
  on `main`, so the append-only guard has nothing to refuse. It also rebuilds
  the feed and the linked-data export, and commits them as the bot.
- **`translate.yml`** runs, because the page and `products.js` changed. It
  translates Keith's new text into French and Portuguese and commits
  `i18n/`. Until it has, `/fr` and `/pt` show that text in English, as
  designed.

---

## 3. How it was verified

- **Verify block, as the merged CLAUDE.md now states it:** all three
  normalizers came back byte-identical, including Keith's new
  `normalize-treatment-policy.js`. The real data gave `0 errors, 6 warnings`,
  in the documented 3 + 2 + 1 split (the new one is French Guiana, a policy
  country the basemap does not draw). Synthetic gave 0/0, and
  `make-preview.js` was clean.
- `test-serializer.js` 0 failures (after the reformat above);
  `test-import.js` 127 passed.
- **`scripts/build-public-site.sh`**, the Vercel build command, succeeded,
  including the locale pages' own checks. `treatment-policy.js`,
  `site-nav.js`, `unitaid-logo.svg` and `sources.js` are present for `/`,
  `/fr` and `/pt`. Every inline script on the built dashboard, index,
  pipeline and story pages parses.
- **Headless Chrome on the built site:** the dashboard (en, fr, pt), index,
  pipeline and story pages each loaded with **0 JavaScript errors**. The only
  failed request on any of them was `favicon.ico`. On the dashboard, in all
  three languages, the Sources footer listed 15 entries and the treatment
  policy loaded.

---

## 4. Deferred, open, and found in passing

**Deferred**

- **`email-subscribe` and `email-feedback-wip` need bringing onto the new
  `main`.** Keith reworked the illustrated journey page and the feedback
  widget, the same files both branches change. `email-subscribe` is not part
  of this merge on purpose: its addresses are still empty, so its live
  Subscribe button would show an error to every visitor.
- **Keith's repository is not changed by this.** The two repos stay separate.
  Anyone who later merges this `main` back into Keith's `development` will hit
  the same `validate-data.js` conflict. Take this side, since Keith's checks
  are already ported here.

**Found in passing, left alone**

- **The four `synthetic/` dashboards never load the feedback widget.** They
  ask for `assets/report-issue.js`, a path relative to `synthetic/` that is
  never built, so it 404s. `build-synthetic-edition.js` rewrites the
  journey-icon path one level up, but not this one. This is not from the merge:
  it is the same on `main` and on Keith's branch. It matters for the Send
  feedback work, whose "13 pages" is effectively 9.
- No page has a favicon. Every page 404s on `favicon.ico`.

---

## 5. Status

| | |
| --- | --- |
| Branch | `merge-keith-development`, from `main` at `a42b8e0`, merging `keith/development` at `8422f8e` |
| Commits | 1 merge commit, carrying Keith's 58 |
| Push state | not pushed |
| CI | not run |
| Hand-edited in the merge | `scripts/build-public-site.sh`, `illustrated-journey-dashboard.html`, `scripts/validate-data.js`, `scripts/data-rules.js`, `data/products.js` (8 lines, whitespace only), this document |

---

# Second merge, 2 Oct 2026 (`merge-keith-development-2`)

This brings Keith's `development` from `8422f8e` (the first merge) to
`382b38e` into `main` at `a5ea2ee`. Keith's side has **5 commits** this repo
did not have: the removal of the WHO study-result layers with a rework of the
country access map (`c5efd76`, handoff in
[handoff-remove-study-layers.md](handoff-remove-study-layers.md)), reviewer
wording, the GanLum acknowledgement and a disclaimer (`f112c0e`), and the
sources dropdown. `main` has **129** commits Keith's side does not.

Both lines removed the same resistance overlay independently, Jackson's on
`main` (`caf0062`, [remove-resistance-notes.md](remove-resistance-notes.md))
and Keith's on his branch. That is where all **49 conflict hunks in 12 files**
came from.

## 6. Decisions (second merge)

### The page: Keith's version, plus `main`'s own additions

`illustrated-journey-dashboard.html` had 22 hunks. 20 take Keith's side. His
removal is a superset of Jackson's: the same deletion plus the filters,
legend, colour and Detail-rail redesign (handoff §9 to §11). Taking `main`'s
side would have dropped that redesign. Mixing hunk by hunk would have
interleaved two different deletions of the same code, with half-removed
functions as the likely result. The other two hunks keep `main`'s
`data/sources.js` script tag and `main`'s source list (next item).

Check: the merged page differs from Keith's page in **11 hunks (+94 / −72
lines)**, and all of them are `main`'s own work: Subscribe wired to `api/`,
and the sources footer drawn from the registry.

### The footer: Keith's layout, `main`'s registry

Keith's footer (disclaimer, About the data, Sources dropdown) is kept. His
hand-written list of 10 sources is replaced by `main`'s `#srclist` and
`#srcdocs`, rendered from `data/sources.js` by `renderSources()`. The registry
is also what the stage citations and the analyst's editor read, so a hand
copy is the one that would go stale. The dropdown count now reads **22**, not
10. The registry includes the Rwanda and Uganda registers, WWARN, the Essential
Medicines List, and the key documents behind single medicines. Keith's count
code reads the rendered list, so it needed no change. The closing line "A LAUNCH
initiative of Unitaid partners…" stays removed, as Keith's UI notes record it
was removed on request.

`data/sources.js` → `who-threat-maps`: `label`/`title` are now "WHO Malaria
Threats Map", WHO's own page title. `plain` no longer says "the study results
behind the resistance layers on the map above", which is untrue on both lines
of work; it now uses Keith's sentence. `findings` says the layers were removed.
The `id` is unchanged, because it is a key.

### The raw WHO extracts stay

Keith deleted `sourcing/raw/mtm/` (5 files, about 10,100 lines). `main` keeps
them, because `sourcing/README.md` treats raw snapshots as append-only and
Jackson's removal kept them on purpose. They are the record of what the
removed layers showed. Rejected: Keith's deletion, which would leave no trace
of the data behind a feature that was public for a month. The README keeps
`main`'s paragraph.

### Scripts: `main`'s versions, two of Keith's checks ported

`validate-data.js`, `assemble-content.js`, `build-locale-pages.js`,
`build-public-site.sh` and `normalize-treatment-policy.js` take `main`'s side.
Each already does what Keith's does, and more. For example, `main`'s public
build copies `treatment-policy.js` and `sources.js`; Keith's handoff §7 lists
the missing `treatment-policy.js` as a known gap on his side.
`i18n-identifiers.js` stays deleted: Keith kept it as an empty module, but
`main` had removed it and every caller.

Two pieces of Keith's are new and worth keeping, so they were ported, not
pasted:

- The `acknowledgement` rule (optional, a non-empty string when present) goes
  into `scripts/data-rules.js`, so the data editor enforces it too.
- The locale self-check now also proves that `/fr` and `/pt` keep English's
  product ids, in order, and its stage count. A translated lookup key fails
  silently. This sits beside `main`'s check that every loaded file exists.

### `data/products.js`

`main`'s formatting, with Keith's content. Two `stageInfo` sentences
(regulatory review status is not public; procurement covers public channels
only) and his two changelog entries (2 Oct wording, 1 Oct layer removal) are
added. `main` had no changelog entry for its removal, so Keith's 1 Oct entry
covers it. His other edits merged cleanly: the stage "Procurement (public
channels)"; GanLum's manufacturer and research lead "Novartis"; the MMV
co-development line removed; the new `acknowledgement`.

### The acknowledgement is not machine-translated

It is legal wording a partner asked for. `assemble-content.js` does not
collect it, so `/fr`, `/pt` and `dashboard.json` carry it in English, as a
plain string. Rejected: machine translation of a funder credit, where a wrong
word is a contract problem. If French and Portuguese are wanted, a person
should translate it.

### `content.en.json` regenerated once

Run once after resolving, as Keith's handoff §5.1 asks: **42 strings added or
changed, 22 removed or changed**. French and Portuguese are left to
`translate.yml` on `main`, since there is no engine key here. Locale build
before the bot: fr 398 translated, 30 in English (93%); pt 404 translated, 30
in English (93%).

## 7. Verification (second merge)

| Check | Result |
| --- | --- |
| `normalize-treatment-policy.js` | byte-identical |
| `validate-data.js` | 0 errors, 1 warning (GUF) |
| `validate-data.js data/products.synthetic.js` | 0 errors, 0 warnings |
| `make-preview.js` | ok |
| `test-build-dataset.js` | 28 passed, 0 failed |
| `test-dataset-diff.js` | 8 passed, 0 failed |
| `test-build-rbm-pages.js` | 10 passed, 0 failed |
| `build-locale-pages.js` self-check | files present; product ids `ganlum, alaq, pyramax, dhappq` and 8 stages, fr and pt |
| `node --check`, every `scripts/`, `api/`, `assets/` file | pass |
| Chrome, real time over CDP, merged page | 4 access-stage and 5 MFT filters; legend 8 / 4 / 4 / 78 (Keith's own figures); Detail overview; 235 countries, 7 regions; 22 sources; **0 console errors**. Keith's page under the same probe: identical apart from 10 sources |
| Same, RBM pages built from it (`/en/`, `/fr/`, local `dashboard.json`) | same counts; 0 console errors |

`--virtual-time-budget` alone is not enough here. Under it MapLibre never
finishes, and Keith's page looks just as broken as the merged one. The real-time
probe is what tells them apart.

## 8. After it reaches `main`

- `publish.yml` (`data/products.js` changed): history snapshot, feed, ontology.
- `translate.yml`: French and Portuguese for the new strings, then a redeploy.
- Vercel deploys the merge commit (authored by Kyler, so it is not blocked).
- **RBM's `dashboard.json` does not change by itself.** This is not an
  approval, so it needs **Publish now**, which is blocked at the moment (next
  item).

## 9. Found in passing, left alone (second merge)

- **Publishing to the data repo is stuck at the drift check.** The last commit
  that touched `v1/dashboard.json` in `codebyjackson/launch-data-test` is
  `86b6402`, "Revert proposal #43 test publish". It is a hand revert, without
  the `[publish-dataset]` marker. The published data does equal a build of
  `main` (checked), but the check compares only the commit subject. So
  "make main match, then publish again", as the workflow's own message
  advises, does not clear it. Every publish will stop there until it is
  resolved, either by a content-aware check or by Jackson deciding how to
  record the hand revert. That hand revert also deleted the archive copy
  `v1/archive/2026-10-02T08-10-47Z.json`, against "every version is kept". It
  was test data.
- **Keith's new Detail-rail text** ("Overview", "Countries", the banner…)
  showed in English on the locally built `/fr` page. Check after the
  translation bot runs whether `assemble-content.js` collects it.
- Keith's handoff §7 items still stand: MapLibre's justification is gone, and
  `docs/data-sourcing-plan.md` Category G still proposes the overlay.

## 10. Status (second merge)

| | |
| --- | --- |
| Branch | `merge-keith-development-2`, from `main` at `a5ea2ee`, merging `keith/development` at `382b38e` |
| Commits | 1 merge commit, carrying Keith's 5 |
| Hand-edited in the merge | `illustrated-journey-dashboard.html` (footer), `data/products.js`, `data/sources.js`, `scripts/data-rules.js`, `scripts/build-locale-pages.js`, `scripts/assemble-content.js` (one comment), `CLAUDE.md`, `docs/developer-guide.md`, `docs/illustrated-journey-ui-notes.md`, this document |
| Regenerated | `i18n/content.en.json` |
