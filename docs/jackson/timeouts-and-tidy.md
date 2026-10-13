# Workflow time limits, branch protection and tidy-up

*Jackson, 13 October 2026. Branch `fix/timeouts-and-tidy`.*

## 1. Decisions

### Every job gets a time limit

Before this branch, only `pr-preview.yml` and intake's `outside` job had a
`timeout-minutes`. Every other job kept GitHub's six-hour default. That default
is what turned five hung preview runs into about 1,810 minutes on 1–2 Oct and
blocked every job from 3 Oct (developer guide §8b). The repo is public now, so
minutes are free. A hang would still hold the shared `bot-push-main` queue for
six hours, stalling translations and publishes behind it.

The limits come from the last 400 runs (`gh run list`, successful runs only).
No job's longest run passed 2.1 minutes:

| Job | Limit (min) | Longest recent run | Why this limit |
| --- | --- | --- | --- |
| validate | 15 | 0.9 | Installs pyshacl from PyPI, which can be slow |
| snapshot (publish) | 10 | 1.0 | |
| translate | 20 | 1.0 | A large text change means many Google calls |
| deploy-hook | 5 | 0.8 | One `curl` |
| publish (dataset) | 10 | 0.7 | |
| notify | 10 | 0.3 | |
| remind | 5 | no run in the window | Opens one issue |
| fetch (sourcing) | 30 | 0.2 (weekly) | The monthly run reads every register; no monthly run in the window |
| propose (source-proposals) | 60 | 2.1 | Waits up to 10 minutes for intake **per proposal**, one at a time |
| check (intake) | 10 | 1.6 | |
| approve (decision) | 20 | 1.2 | Translates inside the approval |
| reject (decision) | 10 | — | |

Rejected alternative: one limit for every job (15 minutes). Simpler, but it
would cut `propose` off after two slow intakes, and could stop a monthly fetch
part-way.

If honest work ever hits a limit, raise that one limit. Don't remove it.

### Branch protection: settings only, and less than first planned

Branch protection is a repository setting, not a file, so this branch can't
change it. Turning it on is for the repo owner.

**Requiring pull requests on `main` would break the pipelines.** These
workflows push straight to `main` with `GITHUB_TOKEN`:
- `publish.yml` (history, feed, ontology);
- `translate.yml` (`i18n/`);
- `sourcing.yml` (`sourcing/`);
- `proposal-intake.yml` (`data/proposals.js`);
- `proposal-decision.yml` (`decisions.js`).

Recommended now, on `main` (Settings → Rules → Rulesets → New branch ruleset,
target `main`):

- **Restrict deletions**: on.
- **Block force pushes**: on.
- **Require a pull request before merging**: **off**. Only turn it on after
  adding a bypass for the workflows and testing a full approval chain on a copy
  of the repo.

The approval process already protects data changes: the proposer can't
approve, and the decision workflow checks the PR. What it can't stop is a
person with write access pushing to `main` directly. That stays a matter of
trust and the commit history until the bypass is tested.

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

- **`docs/developer-guide.md`:**
  - §1 says Vercel instead of GitHub Pages.
  - §8b lists the new limits instead of "every other workflow still has the
    six-hour default".
- **`docs/jackson/DEV-31.md`:** a dated note at the top. `i18n-identifiers.js`
  was deleted on 1 Oct (`caf0062`), and `DEEPL_API_KEY` is not used. The rest
  of the document is left as written, as a record.

## 2. Deferred, and found in passing

- **Old-host links outside the README: left alone** (owner's decision,
  13 Oct). Power BI (`powerbi/queries.m`) and Streamlit still read the old
  address. Neither is part of the site or the pipelines.
- **Stale branches, for the owner to delete.** Nothing has been deleted.
  - **64 remote branches are fully merged into `main`** and safe to delete. Run
    `git branch -r --merged origin/main` to list them; the list on 13 Oct runs
    from `backup-pre-merge-47a905b` to `welcome-wording`.
  - **3 remote branches are not merged:**
    - `backup-fork-tweaks-9558c0b` (10 Sep, 3 commits ahead);
    - `backup-logo-updated-f4ccc55` (8 Sep, 1 commit ahead);
    - `ui/page-ground` (2 Oct, 1 commit ahead).
    Their owners should say whether to keep them.
  - To delete the merged ones once agreed:

    ```bash
    git fetch --prune origin
    git branch -r --merged origin/main | grep -v 'origin/main\|HEAD' \
      | sed 's/^ *origin\///' | xargs -n 10 git push origin --delete
    ```
- **No CONTRIBUTING file.** CLAUDE.md and the developer guide cover the same
  ground.

## 3. Status

| | |
| --- | --- |
| Branch | `fix/timeouts-and-tidy`, 1 commit on `main` `fb02107`, not pushed |
| Files | 11 workflows (`timeout-minutes`), `README.md`, `docs/developer-guide.md`, `docs/jackson/DEV-31.md`, this file |
| Verify block | validator 0 errors, 1 warning; synthetic 0/0; `make-preview.js` ok; `test-build-dataset.js` 30 passed, 0 failed; country names cover all 252; normalizer identical apart from line endings |
| Other checks | all 12 workflows parse as YAML with the expected limits; no NUL bytes |
| Not checked | a real run of each workflow with its new limit. Each limit is at least 5× the longest recent run, so a normal run cannot reach it |
| After merge | turn on the two ruleset settings in §1; delete the merged branches |
