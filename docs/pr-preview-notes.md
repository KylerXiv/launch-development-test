# Proposal PR previews — working notes

Branch: `pr-preview`, cut from `sources-registry` at `7cc9b8d` (the proposal
machinery is not on `main` yet, so this cannot start from there).
Started 28 September 2026.

## What this adds

A proposal now opens as a pull request the moment it is filed, and that pull
request gets a link to the **real public dashboard built from its own commit**,
deployed as a Vercel preview. The analyst reads the diff, opens the link, and
decides on the issue as before. Production changes only on merge.

| File | Change |
|---|---|
| `.github/workflows/pr-preview.yml` | **new.** Validates, runs the production build from the PR commit, deploys it as a Vercel preview, keeps one PR comment pointing at it |
| `scripts/proposal-pr.sh` | **new.** Builds `proposal/<n>` from main with the snapshot applied and opens (or reuses) its PR. Shared by intake and approval |
| `.github/workflows/proposal-intake.yml` | opens the PR and dispatches the preview; drops the `preview.html` artifact |
| `.github/workflows/proposal-decision.yml` | `approved` merges the existing PR after checking it; `rejected:*` also closes it |
| `.github/workflows/vercel-deploy.yml`, `publish.yml` | `workflow_dispatch` added so the bot's merge can start them |
| `scripts/proposal-lib.js` | `apply` takes an optional date |

## Decisions

**Vercel CLI from Actions, not Vercel's Git integration.** The Git integration
was tried here and silently skipped deployments pushed by anyone outside the
Vercel team — commit `99e3014` moved production to a deploy hook for exactly
that. Proposal commits are authored by `github-actions[bot]`, so native
previews would be skipped the same way, with no error. The test repository also
has no Vercel connection at all (0 deployments, 0 commit statuses, 0 check runs,
checked 28 Sep). A CLI deploy runs as the token's owner, so commit authorship
does not matter.

**`vercel build` in the runner, then `deploy --prebuilt`.** Only the built output
leaves GitHub; with a Git deploy Vercel reads the whole private repository.
Verified locally with Vercel CLI 60.1.3 and a placeholder project link:
`.vercel/output/static/` is byte-identical to `public-site/` (29 files) and
contains none of `proposals.js`, `decisions.js`, `sourcing/`, `docs/`,
`scripts/`, `editor.html`. The build step also needs **no token**, so the
credential is absent from the one step that runs the pull request's own scripts.
The build is `vercel.json`'s `buildCommand` — `build-public-site.sh`, unchanged —
so there is no second build to keep in step.

**The label stays the decision; the PR carries the evidence.** Owner's call on
28 Sep ("keep both"). That forces the PR to exist *before* the decision, so
intake opens it. Rejected: opening the PR on approval, as before — the preview
would arrive after the decision it was meant to inform.

**What merges must be what was reviewed.** Approval merges only if the PR
changes `data/products.js` and nothing else, and that file is byte-identical to
the snapshot applied to **main as it is now**. Otherwise it rebuilds the branch
and the preview, removes the label and asks again. Two alternatives rejected:

- *Merge the head as it stands.* A push to the branch after the preview, or a
  hand edit, would merge unreviewed.
- *Require the branch to sit on main's tip.* Every intake commits its snapshot
  to main, so filing any proposal would make every other open PR stale and
  bounce its approval. Comparing the data file ignores those commits and still
  catches a real data change on main.

The rebuild uses the date intake stamped (read back from the head's
`meta.lastUpdated`). Without it an approval made on any later day would never
match, because `apply` stamps today.

**The changelog now says "approved by review".** The changelog line is written
when the branch is built, before anyone has approved, and the approval check
compares byte for byte. Rejected: amending the line on merge — then what merges
differs from what was previewed. The approver's name moves to the merge commit
subject and the issue comment.

**Dispatch instead of a GitHub App token.** Pushes and PRs made with
`GITHUB_TOKEN` start no workflows, so intake and approval start `pr-preview.yml`
with `gh workflow run`, which `GITHUB_TOKEN` is allowed to do. No new credential.
A dispatched run uses the workflow as it is on `main`, not the PR's copy. Cost:
`validate.yml` still does not run on bot PRs. The preview job and the approval
both run `validate-data.js`, so no bad data reaches either. An App token is the
fuller fix and stays open.

**The bot's merge starts production itself.** A merge made with `GITHUB_TOKEN`
fires no push workflows, so after merging, approval dispatches
`vercel-deploy.yml` and `publish.yml`. The previous auto-merge design would have
landed approved data on `main` without either one running.

**Preview access is link-only.** Owner's call on 28 Sep: Deployment Protection
off on the preview project. Anyone with a URL can open it, and URLs are posted
only on PRs in the private repository. Rejected: Vercel Authentication, because
every analyst would need a paid Vercel seat, which `Handoff_Kyler.md` had
already turned down. Old previews stay reachable at their URLs. The comment
always points at the newest one, and a failed build replaces the link with a
warning.

**The staging dashboard is parked outside the repository.** Owner's call. The
four untracked files (`staging-pages.yml`, `build-staging.js`, `staging/`,
`staging-dashboard-notes.md`) were moved to
`~/Downloads/launch-development-parked/staging-dashboard/`. They were never
committed, so moving them rather than deleting them was the only undoable
option. Hashes checked before and after.

## Found in passing

- **A project-restricted Vercel token breaks `vercel pull` (28 Sep).** Before
  it reads the project, the CLI calls `GET /v2/user` and
  `GET /teams/<id>`. A token limited to one project returned 404 and 403 on
  those — while `GET /v9/projects/<id>` worked — so the step failed with
  "Could not retrieve Project Settings", which reads like a wrong ID. The IDs
  were right. A token with scope **All Projects** on the team fixed it. The
  local build test missed this because `vercel build` needs no token.

- **Fixed — intake corrupted the queue on its first run.** The snapshot step cut
  `data/proposals.js` at `indexOf("window.LAUNCH_PROPOSALS")`, and the file's own
  header comment quotes that text, so the real assignment was dropped. Every
  approval after that failed with `no-marker`. The rejection helper had the same
  code. Both now match at a line start, as `extractData` does. Found by the
  simulation below; the 22 Sep dry run applied by hand and never ran this step.
- **Fixed — label name executed as shell.** `${{ github.event.label.name }}` was
  interpolated into `run:` in the rejection commit and comment. It now arrives
  through `env`. A label reading `rejected:x$(touch …)` is tested and not
  executed.
- **Fixed — a false claim in the rejection comment.** It said the change "will
  not be proposed again by a fetcher", but nothing reads `data/decisions.js`. The
  comment now says only that the decision and its fingerprint are recorded.
- **Fixed — editing a closed proposal re-ran intake.** It would have reopened a
  PR for a rejected proposal. Intake now skips closed issues.
- **Two approvals on one day broke `publish.yml`.** Both get the same
  `lastUpdated`, and history is append-only, so the second run errored.
  *Fixed 29 Sep — see `docs/source-proposals-notes.md`, "Three gaps closed".*
- **Approvals were not recorded in `decisions.js` or removed from
  `proposals.js`.** *Fixed 29 Sep, same section.*
- **Edit, then approve.** Someone other than the author could edit the issue
  (which re-ran intake) and then approve it. *Fixed 29 Sep: intake now
  rebuilds on an edit only when the author made it — see
  `docs/source-proposals-notes.md`.*
- **By design — a person can still approve and merge the PR directly.** "Keep
  both", with no branch protection available on this plan. That path skips the
  self-approval check and the snapshot comparison.

## Setup this needs

Repository secrets: **`VERCEL_TOKEN`**, **`VERCEL_ORG_ID`**,
**`VERCEL_PROJECT_ID`** for previews; **`VERCEL_DEPLOY_HOOK_URL`** for
production, as today.

A deploy hook needs a Git-connected project, so the test project is imported
from the test repository. Its native deployments continue for pushes by the
account owner. Bot pushes are skipped by Vercel, which is why previews do not
rely on them. In the project: Deployment Protection off; add a deploy hook for
`main`.

GitHub, for the test repository:
- Actions enabled.
- "Allow GitHub Actions to create and approve pull requests" on.
- `bash scripts/setup-labels.sh KylerXiv/launch-development-test`.
- This branch on `main`.
- A second account with write access, to approve.

## Status

- Branch `pr-preview`, one commit on top of `sources-registry` (`7cc9b8d`),
  pushed to `origin` (`KylerXiv/launch-development-test`). Not on `main`. CI has
  not run: Actions is disabled on the test repository, so the push triggered
  nothing.
- Not in this commit: the uncommitted `.DS_Store` line in `.gitignore`, which
  belongs to the parked staging work.
- **Merged `main` in, 28 Sep.** PR #1 on the test repository conflicted with
  `main`, and GitHub runs no `pull_request` workflows on a conflicting PR — 0
  Actions runs were registered. The two green "Vercel" checks on it came from
  Vercel's Git integration, not from `pr-preview.yml`. `main` had three commits
  the branch lacked: the issue form committed separately (`93e2f19` against the
  branch's `6079702`), Keith's 10 Sep "disable button" (`7e7b219`), and the
  merge of PR #10. The only conflict was `propose-change.yml`, add/add. Kept the
  branch's copy: the three lines only `main` has are the old "What it should
  say" description, which the branch rewrote without dropping its status
  guidance. `illustrated-journey-dashboard.html` merged cleanly: 24 lines that
  make the Subscribe and Send buttons inert. All 3 inline scripts still parse.
- `actionlint` 1.7.12 with `shellcheck` 0.11.0: clean on every changed workflow.
  The one finding is a pre-existing style note in `sourcing.yml`.
- **Local simulation: 36/36.** It runs the workflows' own `run:` blocks, taken
  from the YAML, against a bare git remote and a stub `gh`. It covers: intake
  opening the PR; a hand edit caught and rebuilt; main moving underneath the PR;
  an approval on a later day; rejection with a hostile label; and the preview
  comment edited in place and replaced on failure. The harness is outside the
  repository.
- Not exercised, because there is no Vercel project or token yet: `vercel pull`
  and `vercel deploy`, the real preview URL, real GitHub trigger behaviour.
- Verify block, 28 Sep: both normalizers byte-identical;
  `validate-data.js` 0 errors / 5 warnings (3 resistance + 2 molecular markers);
  synthetic 0 / 0; `make-preview.js` 154 KB; `proposal-lib.js selftest` 20/20,
  `test-import.js` 127/127, `test-serializer.js` 0 failures. No NUL bytes in any
  changed file.
