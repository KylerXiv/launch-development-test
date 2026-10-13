# Branch tidy-up, README and stale docs

*Jackson, 13 October 2026. Branch `docs/readme-and-branch-tidy`.*

## 1. Decisions

### Job time limits: tried, then dropped (owner's decision)

Only `pr-preview.yml` and intake's `outside` job have a `timeout-minutes`.
Every other job keeps GitHub's six-hour default, the default behind the
October billing block (developer guide §8b).

The first commit on this branch gave every job a limit, at least 5× its
longest run in the last 400 runs. The owner reverted that in the second
commit. Most recent runs were test runs, so their times are not a fair base
for limits. The workflows are back to exactly what is on `main`.

To revisit later, base the limits on a month of real runs. Then add
`timeout-minutes` per job, with a larger limit for `source-proposals`, which
waits up to 10 minutes for intake on each proposal it files. Until then,
developer guide §8b stands: the repo is public, so minutes are free, but a
hang can hold the shared `bot-push-main` queue for up to six hours.

### Branch protection: optional, and partial if used

Branch protection is a repository setting, not a file. Nothing in the repo
depends on it, so leaving it off breaks nothing. Its only effect is to guard
against mistakes.

**Requiring pull requests on `main` would break the pipelines.** These
workflows push straight to `main` with `GITHUB_TOKEN`:
- `publish.yml`;
- `translate.yml`;
- `sourcing.yml`;
- `proposal-intake.yml` (`data/proposals.js`);
- `proposal-decision.yml` (`decisions.js`).

If the owner turns protection on (Settings → Rules → Rulesets → New branch
ruleset, target `main`), the two safe settings are:

- **Restrict deletions**: stops `main` being deleted by mistake.
- **Block force pushes**: stops history on `main` being overwritten.

Neither affects the workflows. Leave "Require a pull request" off unless the
workflows get a bypass and a full approval chain is tested on a copy first.

### Old branches deleted (owner's request)

On 13 Oct, 64 remote branches fully merged into `main` were deleted from
GitHub, along with 21 local branches that were also fully merged. Every commit
on them is already in `main`, so nothing was lost. None had an open pull
request, and no workflow names any branch but `main`.

The tip of each deleted branch is below. To bring one back:
`git push origin <sha>:refs/heads/<name>`.

Remote (GitHub):

```
47a905b backup-pre-merge-47a905b
e450f69 data-editor
d3ba9db docs-rbm-push-83
1161ac9 docs/handbook-oct-2026
ee6b35b docs/handoff-oct-6
b1bad9b docs/handoff-oct-8
9f9ba22 docs/jackson-phone-fixes
5419cd9 docs/live-links
8885482 ema-watcher
ab17b6a email-brand
0b2621a email-feedback
20fdd97 email-logo-inline
ade17ad email-subscribe
27af5b8 feat/language-switcher
49d2d55 feat/public-data-layer
e1bbda6 feat/rbm-design
39ee08e feat/rbm-handover
0a9f593 feat/register-fetchers
e87bdc6 feat/report-issue-form
4b9a066 feat/resistance-map-site-dots
37af471 feat/sources-raw-data
2f478a5 feat/spanish
f69ecf6 feat/translation
151d9eb feat/yardstick
8f0ed37 filters-count-heading
68a8836 fix/data-driven-statements
5d0f68c fix/dataset-diff-lists
683b123 fix/disclaimer-unitaid
b04b0b4 fix/footer-text-width
4e1ce9a fix/intake-team-only
eed9c35 fix/last-updated-after-merge
2a9a0bf fix/narrow-panel-and-table
cc8a5ab fix/phone-expected-tag
9765845 fix/pipeline-audit
36be256 fix/post-merge-i18n
3d2d296 fix/preview-timeout
bc13fe7 fix/sep9-feedback-parallel
be5a90f fix/sources-toggle
cfadc78 fix/yardstick-history
a642e8d fix/yardstick-translated-since
910417f header-and-notes-wording
7834d43 merge-keith-development
607d27e merge-keith-development-2
797cca4 mobile-forms
bcf0a9f phone-header-buttons
dd4c230 port/rbm-keith-changes
c95980c pr-preview
6349197 rbm-embed-sizing
3abfa22 rbm-forms
2094f79 rbm-vercel-partner
365de2f redesigning-illustrative-journey
89c900b revert-test-proposal-24
5ce5087 source-proposals
4ba12a9 source-watchers
2c3dacd sources-alphabetical
7cc9b8d sources-registry
73fd233 subscribe-single-opt-in
48bd590 subscribe-status-and-team-look
b52b06e subscriber-details
0fae544 subscriber-updates
aebbc5a team-email-form
09e1c98 title-malaria-product-launch
0994a15 translation-workflow
628a487 welcome-wording
```

Local:

```
9f9ba22 docs/jackson-phone-fixes
56ecf13 docs/live-links
49d2d55 feat/public-data-layer
e1bbda6 feat/rbm-design
39ee08e feat/rbm-handover
0a9f593 feat/register-fetchers
caf0062 feat/remove-resistance-layers
37af471 feat/sources-raw-data
2f478a5 feat/spanish
151d9eb feat/yardstick
68a8836 fix/data-driven-statements
5d0f68c fix/dataset-diff-lists
2a9a0bf fix/narrow-panel-and-table
cc8a5ab fix/phone-expected-tag
9765845 fix/pipeline-audit
b91bac2 fix/post-merge-i18n
4424936 fix/sources-toggle
cfadc78 fix/yardstick-history
a642e8d fix/yardstick-translated-since
dd4c230 port/rbm-keith-changes
13714ea revert/proposal-43
```

**Kept, because they hold work that is not in `main`.** Their owners decide:

| Branch | Where | Last commit | Not in `main` |
| --- | --- | --- | --- |
| `backup-fork-tweaks-9558c0b` | GitHub | 10 Sep, Kyler | 3 commits: square parallel-gate connectors and frame |
| `backup-logo-updated-f4ccc55` | GitHub | 8 Sep, Kyler | 1 commit: "Logo Updated" |
| `ui/page-ground` | GitHub | 2 Oct, Kyler | 1 commit: footer text fills its boxes |
| `feat/registration-sources` | local only | 1 Oct | 2 commits: registration fetchers and MFT notes, the fetchers themselves are already in `main` (`fetch-zamra.js`, `fetch-mcaz.js`, `fetch-dav.js`), so this is probably an earlier draft |

### README brought up to date

The README described the old GitHub Pages site and the design review. It now:
- names the illustrated journey on Vercel as the production page, with its
  four languages;
- names the two receiving repositories;
- describes Vercel hosting and the RBM iframe arrangement.

Its links now point at the Vercel site. Every page they name is in
`build-public-site.sh`, so all of them are deployed. The rest of the README is
unchanged.

### Stale docs

- **`docs/developer-guide.md` §1:** says Vercel instead of GitHub Pages.
- **`docs/jackson/DEV-31.md`:** a dated note at the top. `i18n-identifiers.js`
  was deleted on 1 Oct (`caf0062`), and `DEEPL_API_KEY` is not used. The rest
  of the document is left as written, as a record.

## 2. Deferred, and found in passing

- **Old-address links outside the README: left alone** (owner's decision,
  13 Oct). Power BI and Streamlit still read the project's earlier address.
  Neither is part of the site or the pipelines, so both are treated as not
  maintained.
- **Stale branches in the other two repos:** `launch-rbm-test` has several
  merged `update/main-*` and `fix/*` branches, and `launch-data-test` has
  `docs/spanish`. Not touched.
- **No CONTRIBUTING file.** CLAUDE.md and the developer guide cover the same
  ground.

## 3. Status

| | |
| --- | --- |
| Branch | `docs/readme-and-branch-tidy`, 2 commits on `main` `fb02107` (limits added, then reverted), not pushed |
| Net change against `main` | `README.md`, `docs/developer-guide.md` (§1), `docs/jackson/DEV-31.md`, this file. No workflow changes |
| Verify block | validator 0 errors, 1 warning; synthetic 0/0; `make-preview.js` ok; `test-build-dataset.js` 30 passed, 0 failed; country names cover all 252; normalizer identical apart from line endings |
| GitHub | 64 merged branches deleted 13 Oct; 3 unmerged kept |
