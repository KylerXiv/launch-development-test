# RBM public data layer — working notes (feat/public-data-layer)

*1 Oct 2026, Jackson (Oakkar-Min) with Claude Code. Branch
`feat/public-data-layer`, stacked on `feat/remove-resistance-layers`
(`caf0062`), itself cut from `main` at `3c747bc`. Merging this branch brings
both.*

## What it is

RBM will embed the dashboard pages (iframe, one page per language) and those
pages fetch **one file**, `v1/dashboard.json`, from a public data repo:
`codebyjackson/launch-data-test`, on the owner's own account, used as the test
repo before handover. Three repos: this private pipeline → the public data repo
→ the pages handed to RBM.

## Decisions (owner's, 1 Oct, with the alternatives turned down)

- **One file, all languages.** Every text is `{ en, fr, pt }`. Rejected: one
  file per language (more paths for RBM to manage, no size need: the whole file
  is 146 KB, 31 KB gzipped).
- **Not `translations.json`.** It holds sentences only (479 hash-keyed
  entries, no figures) and its keys point into today's page. `dashboard.json`
  is built from it and the data files.
- **No interface text in the file.** One page per language means the buttons
  and headings are written into each language's HTML by
  `build-locale-pages.js`, as for `/fr` and `/pt` today. Rejected: a `ui`
  block with keys (hash keys break when the English wording changes).
- **Map shapes ship with the pages,** not in the file (they would be 85% of it,
  ~520 KB gzipped, and never change with the data).
- **Built in the workflow, never committed here.** The public repo's history
  is the audit trail; a second copy here could drift.
- **Publishes by itself after every approval,** at the end of the existing
  chain (decision → `publish.yml` → `translate.yml` → `publish-dataset.yml`),
  once French and Portuguese are settled. Rejected: a manual-only publish
  (someone has to remember), every push to `main` (unreviewed changes and test
  data would reach RBM), and "only content whose hash an approval recorded"
  (on 1 Oct today's content matched none of the six recorded approvals, all
  reverted tests, so it would never publish).
- **"Publish now" for everything else:** Actions → "Publish to RBM data repo",
  with a required reason and a dry-run box. Anyone with write access.
- **Undo = revert on main, then Publish now.** Emergency: revert the publish
  commit in the data repo, then always revert `main`; the drift check refuses
  to publish over a hand change to `v1/dashboard.json`.
- **The illustrative country lists go out as they are,** with their `status`
  and `note`, so RBM's pages show the same warning. No machine-translation flag
  in the file (owner's call); ATTRIBUTION.md says it once.
- **The test repo is the target** (no separate test-of-the-test repo).

## What was built

- `scripts/build-dataset.js` — the build. Reuses `build-locale-pages.js`'s
  localisation (now exported), so the French and Portuguese are exactly those
  of `/fr` and `/pt`. `TEXT_PATHS` fixes which fields are text, so a field never
  changes type when its first translation lands; the build fails if a
  translated field is missing from it. Leaves out placeholders, non-public
  sources, sources' `findings`/`relevance`, proposals, decisions, the synthetic
  data and map shapes.
- `public-data/v1/schema.json` — the contract, and the check the build runs
  (same file, so they cannot drift). `public-data/` also holds the starter
  `README.md`, `CHANGELOG.md`, `ATTRIBUTION.md` and `.nojekyll`.
- `scripts/test-build-dataset.js` — 28 checks; run by `validate.yml` on every
  push and PR with a dry build (`--allow-stale`), so a change that would break
  RBM's file fails CI before anyone approves it.
- `scripts/dataset-diff.js` — what a publish changes for readers: the run
  summary and the CHANGELOG entry.
- `.github/workflows/publish-dataset.yml` — the publish (own concurrency
  group; checks out `main`; drift check; skips when the data is unchanged;
  timestamped archive copy; commit subject ends in `[publish-dataset]`).
- `publish.yml` — checkout `ref: main` (the history-workflow bug, handover §7
  item 1) and passes `after_approval=true` to the translate bot.
- `translate.yml` — `after_approval` input; when set, starts the publish after
  everything passed, also when there was nothing to translate.

## Checks (1 Oct 2026)

- `build-dataset.js`: valid against the schema; 4 products, 22 public
  sources, 298 text fields, fr 210 / pt 212 translated (70%), the rest
  English. `test-build-dataset.js`: 28 passed.
- Local simulation of `publish-dataset.yml`, running its own `run:` blocks
  from the YAML against a local bare repo seeded with `public-data/`: all 7
  scenarios pass — no reason refused; first publish; unchanged data makes no
  commit; stale `content.en.json` stops the build; dry run makes no commit;
  approval publish names proposal #28 and @KylerXiv; a hand revert in the data
  repo trips the drift check. The two `actions/checkout` steps and the `gh`
  dispatches in `publish.yml`/`translate.yml` could not run locally.
- Verify block: validator 0 errors / 1 warning; synthetic 0 / 0; preview OK.

## Setup on GitHub (owner)

1. **Create the public repo** `codebyjackson/launch-data-test`: public, empty (no
   README). Push the starter files once:
   ```bash
   cp -r public-data ../launch-data-test && cd ../launch-data-test
   git init -b main && git add -A && git commit -m "Starter files"
   git remote add origin https://github.com/codebyjackson/launch-data-test.git
   git push -u origin main
   ```
2. **Turn on Pages:** that repo → Settings → Pages → Deploy from a branch →
   `main`, `/ (root)`.
3. **Make a deploy key** (anywhere, then delete the two files):
   `ssh-keygen -t ed25519 -C "launch publish" -f launch-data-deploy -N ""`
   - `launch-data-deploy.pub` → `launch-data-test` → Settings → Deploy keys →
     Add, **Allow write access**.
   - `launch-data-deploy` (the private half, whole file) → the **pipeline** repo
     → Settings → Secrets and variables → Actions → secret
     `DATA_REPO_DEPLOY_KEY`. On a personal repo only its owner (Kyler) can add
     secrets, unless you are an admin there.
4. **Set the target:** pipeline repo → same page → Variables →
   `RBM_DATA_REPO` = `codebyjackson/launch-data-test`.
5. Push and merge this branch; then Actions → "Publish to RBM data repo" →
   Run workflow → reason "First publish", **dry run** ticked; then again
   without. Check `https://codebyjackson.github.io/launch-data-test/v1/dashboard.json`.

## Deferred

- **The RBM pages themselves:** a page per language that fetches
  `dashboard.json` instead of loading `data/*.js`, plus the map shapes; iframe
  hosting and a `frame-ancestors` header for `dashboards.endmalaria.org`.
- **Pipeline and story pages** have no French or Portuguese yet.
- **Translation gaps found while building:** `stageInfo`, `barrier`,
  `stages[].next`, `detail.journey[].label` and `detail.volumeNote` are shown
  on the page but never collected for translation (`assemble-content.js`), and
  `localiseProducts` reads `journey`/`volumeNote` at the product's top level
  where the data has them under `detail`. They publish in English in fr/pt
  until fixed; their type will not change when they are.
- **Licence of the dataset:** WHO-derived parts are CC BY-NC-SA 3.0 IGO
  (ShareAlike, NonCommercial); ATTRIBUTION.md marks it "to be decided".
- **The who-threat-maps `plain` line** still mentions the removed layers
  (owner: nothing to do now).

## Status

Local branch, not pushed. Two commits (the resistance removal and this one),
then a merge of `origin/main` at `0e792ec` (Kyler's email subscribe, PR #30,
and a translate-bot commit), 1 Oct 2026.

The merge conflicted only in `i18n/content.en.json`, a generated file: it was
regenerated with `assemble-content.js` from the merged sources (319 strings;
the 3 new ones are subscribe text, already translated on main), not resolved
by picking a side. Re-run on the merged tree: validator 0 errors / 1 warning;
synthetic 0 / 0; locale build strict, fr 359 / pt 366 translated, 12 left in
English each, self-check passes; `test-build-dataset.js` 28 passed;
`test-mail-api.js` 111 passed; the publish simulation 7/7; public build OK;
headless page renders with no console errors (map canvas blank headless, as
on main).

Kyler's `api/` functions (email subscribe) are not part of the data and do not
go into `dashboard.json`; they stay on Vercel and will not come with the pages
when RBM iframes them — a handover question, not handled here.
