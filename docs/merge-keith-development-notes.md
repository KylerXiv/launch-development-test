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
