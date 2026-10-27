# RBM pages read a data file beside them; Spanish removed — notes

27 October 2026. Branch `feat/rbm-data-file-no-spanish`.

## What changed

**The data flow to RBM.** Until now each RBM page fetched
`https://codebyjackson.github.io/launch-data-test/v1/dashboard.json` every
time it opened. Now RBM hosts a copy of that file beside the pages, as
`data/dashboard.json`, and the pages read `../data/dashboard.json`. When the
data changes, the LAUNCH team sends RBM the new file (RBM Hosting Guide, 26 Oct
2026, §5). The three repositories:

| Repository | Role now |
|---|---|
| `KylerXiv/launch-development-test` | Unchanged: builds `dashboard.json` and publishes it (`publish-dataset.yml`). Builds the RBM pages. |
| `codebyjackson/launch-data-test` | Unchanged: the record of every publish (`v1/dashboard.json`, `v1/archive/`, `CHANGELOG.md`). Its address stays public, but the pages no longer fetch it. |
| `codebyjackson/launch-rbm-test` | The pages **and** `data/dashboard.json`, a copy of the latest published file. Stands in for RBM's own host. |

**Spanish.** RBM's platform does not support it, so it is gone from
everything that runs: the `/es` pages (the LAUNCH site redirects `/es` and
`/es/…` to the English page), the RBM `es/` folder, the translate bot and the
approval step, `es` in every text of `dashboard.json`, the Spanish
translation memory (796 values) and country names (252). Dated notes that
describe what was done with Spanish, and the frozen pre-v1.0 page
`illustrated-journey-dashboard.html`, keep their history. What Spanish
touched: [spanish.md](spanish.md) §4.

## After each publish

1. Publish now (or the approval chain) writes the data repo, as before. The
   run summary now ends with the next step.
2. Pull `launch-data-test` (the checkout next to this repository).
3. `node scripts/copy-rbm-pages.js --to ../launch-rbm-test --data-only`. It
   copies `v1/dashboard.json` into `launch-rbm-test/data/`, updates that one
   line of `build-manifest.json`, and prints the branch and commit to make.
4. Commit, push and merge in `launch-rbm-test`.
5. Send RBM the same file.

It refuses a file that is not the published one: its last commit is not the
publish workflow's (`[publish-dataset]`), it has uncommitted changes, or the
checkout is behind GitHub. It also refuses a file whose `schema_version` the
pages there do not read (a format change sends new pages and data together),
a target whose pages still fetch the old address, and hand edits in the
target (as a full copy does; `--force` overrides only that).

## Code

- `scripts/rbm-manifest.js`: languages `en, fr, pt`; `data/` is a built
  folder; `publishedDataset()` reads and checks the published file. `drift()`
  also looks in folders an older manifest lists, so the first copy after this
  change removes `es/` instead of reporting it as deleted by hand.
- `scripts/build-rbm-pages.js`: the loader reads `../data/dashboard.json`;
  the build copies the published file into `dist/rbm/data/` (`--dataset
  <file>` for another, `--dataset none` for none) and records it in the
  manifest (`dataset`, `dataset_problems`, `schema`). A build without the
  published file is not copyable.
- `scripts/copy-rbm-pages.js`: `--data-only`; a full copy also removes files
  the last copy wrote outside today's folders.
- The schema.org `contentUrl` in the page still names the data repo's address:
  it is a public download link, not something the pages fetch.

## Checks (27 Oct 2026)

| Check | Result |
|---|---|
| CLAUDE.md verify block | 0 errors / 1 warning; synthetic 0/0; preview; build-dataset 30 passed; country names cover all 252 |
| `test-build-rbm-pages.js` | 36 passed |
| `test-copy-rbm-pages.js` | 34 passed (`--data-only`, `es/` removal) |
| `test-dataset-diff.js` | 12 passed (a removed language is one line, still a change) |
| `assemble-content.js --check` | content hash unchanged: no new text to translate |
| `build-rbm-pages.js` | 35 files, `data/dashboard.json` = data repo `7454e7c` |
| Chrome, built pages on a local server | en/fr/pt draw in full from `/data/dashboard.json`; no request to GitHub or the data repo; with the file missing, each shows "could not be loaded" in its language |
| Chrome, with the Hosting Guide's content security policy | no violation |
| `build-public-site.sh` | no `es/`; the menu is `{ fr: true, pt: true }` |

`node scripts/proposal-lib.js selftest` fails one check ("refuses a country
already drawn at that level…") on `main` as well; not touched here.
