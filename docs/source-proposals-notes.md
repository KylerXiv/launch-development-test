# Source watcher — working notes

Branch: `source-proposals`, cut from `main` at `f4f1da7` (after PR #1, the PR
previews, merged). Started 29 September 2026.

## What this adds

Public-source data now reaches the dashboard without anyone re-typing it —
still only through an approved proposal. After every scheduled fetch, the
**source watcher** reads the staged WHO Prequalification list and, for each
portfolio medicine WHO lists but the dashboard does not yet show as listed,
files a proposal issue. From there it is the existing route: intake, a pull
request, a preview of the public site, one person's approval, production.

| File | Change |
|---|---|
| `scripts/propose-regulatory.js` | **new.** Staged WHO PQ rows → proposal bodies in the issue form's layout, each checked with the library and rules intake uses |
| `.github/workflows/source-proposals.yml` | **new.** After every fetch (and by hand): run the watcher, file each proposal, start intake for it, one at a time |
| `scripts/proposal-lib.js` | one proposal may change several fields — the watcher only |
| `.github/workflows/proposal-intake.yml` | can be started for an issue number; rebuilds on an edit only when the author made it |
| `.github/workflows/proposal-decision.yml` | acts only on issues labelled `proposal`; records several-field rejections |
| `scripts/fetch-regulatory.js` | exports its CSV parser, so the watcher reads staging exactly as it was written |
| `test-data/regulatory/` | **new.** The real 31 Aug list plus one invented GanLum listing (`TEST-0001`) |

## Decisions

**The watcher files issues; it does not build PRs.** It writes each proposal in
the issue form's own layout and runs it through the same `buildProposal` and
`checkApplied` intake will, so a broken one is never filed. Rejected: calling
`proposal-pr.sh` straight from the fetch — a second route into the record that
skips intake's check, comment and snapshot.

**One source event, one proposal: status, date and sentence together.** Owner's
call, 29 Sep. Approving the status alone would leave a sentence contradicting
it — GanLum's WHO PQ note reads "Not on the WHO PQ EOI list yet (24th malaria
EOI, 27 Feb 2026, checked)". The sentence is a factual draft: the date, the
WHO references and the applicants, nothing else. People still file one field
per proposal: `buildProposal` accepts several fields only from
`github-actions[bot]`. A single-field fingerprint is unchanged, so recorded
decisions still match (checked against the old recipe: `sha1:3c7f8b9efe0830f4`
both ways).

**One approval is enough for a watcher proposal.** Owner's call, 29 Sep. The
self-approval check compares the approver with the issue's author, which is the
bot, so any one person can approve — including the repository's only account.

**Intake is started by dispatch, one issue at a time.** Issues filed with
`GITHUB_TOKEN` start no workflows, so the watcher starts intake itself. Intake
shares the `bot-push-main` concurrency group, which holds one running and one
pending run: a second queued run cancels the first. So the watcher waits for
intake to label each issue `waiting` or `needs-fixing` before starting the
next. Rejected: a personal access token or GitHub App so the issue event fires
by itself — a new credential, for the same result.

**Its own workflow, after the fetch, not a step inside it.** `sourcing.yml` holds
`bot-push-main` for its whole run, so intake runs queued from inside it would
wait behind it and cancel each other. A `workflow_run` trigger starts once the
fetch has finished. It also keeps `sourcing.yml`'s rule — fetchers never touch
`data/products.js` — true to the letter.

**It works from what the list says now, not from what changed since last
month.** A missed or failed run cannot lose a listing. Repeats are stopped
three ways: the stage is already done; an open proposal for the same medicine
and stage exists, whoever filed it; or the exact content was rejected before
(the fingerprint in `data/decisions.js`). New evidence — a different date or
reference — is a different fingerprint, so it is proposed again.

**Guards.** It proposes nothing if the WHO list lost more than a fifth of its
rows since the previous fetch (98 now), since that is an export whose columns
changed, not withdrawals. It skips rows without an ISO date: ASPY's two EMA
Art. 58 listings have none. It reads only current listings, so a delisting
cannot become a proposal.

**Edits rebuild a proposal only when its author makes them.** Before, anyone
with write access could rewrite someone else's proposal (which re-ran intake)
and then approve it — the edit-then-approve hole found in the 28 Sep audit.
For a watcher proposal nobody but the bot is the author, so no reviewer can
reword what they are about to approve. To rebuild a PR by hand, start intake
for the issue from the Actions tab.

**What it yields.** With the real list, nothing: GanLum and ALAQ are not
prequalified, and ASPY and DHA–PPQ already show as listed. Hence the fixture.

## Deferred, and left alone

- **Other sources.** NAFDAC and TMDA (country registration), EMA (SRA approval),
  ClinicalTrials.gov. The same pattern applies — one watcher per source — each
  with its own question of what the source states outright.
- **A further presentation of a medicine already listed** — DHA–PPQ's "Nine
  PQ'd presentations" count, say — is not proposed. Recounting is mechanical,
  but the sentence is not. It stays in the watch report.
- **`currentStage`, `next` and `nextDate` are not changed** by a watcher
  proposal. The proposal says so; the preview shows the result.
- **A person's intake started mid-batch can still cancel a pending watcher
  intake**, through the same concurrency group. The watcher then warns after 10
  minutes; starting intake for that issue by hand recovers it.
- **Intake does not consult `data/decisions.js`** for proposals people file.
  Only the watcher does. Pre-existing gaps, still open: approvals are not
  recorded there, and approved proposals are not removed from
  `data/proposals.js`.

## Setup

None new. The watcher uses `GITHUB_TOKEN`, and the labels and Vercel secrets
from the previews.

## Status

- Branch `source-proposals`, one commit on top of `main` (`f4f1da7`).
- `actionlint` 1.7.12 + `shellcheck` 0.11.0: clean on every changed workflow.
- `proposal-lib.js selftest`: 29/29, including nine new several-field checks.
- **Local simulation: 53/53.** It runs the workflows' own `run:` blocks against
  a bare git remote and a stub `gh`. Scenario 7 covers:
  - the real list proposes nothing, and a list that shrank sharply is refused;
  - the fixture files exactly one bot-authored issue, and a second run files
    nothing;
  - intake, started by dispatch, opens a PR that sets status, date and sentence
    and changes only the data file;
  - a rejected fingerprint is not proposed again;
  - one person's approval merges it, and the result passes the validator;
  - afterwards the watcher has nothing left to propose.
- Not exercised: the `workflow_run` trigger itself, the job-level `if` on edits,
  and real GitHub timings. Those need the test repository.
- Verify block, 29 Sep: both normalizers byte-identical; `validate-data.js`
  0 errors / 5 warnings (3 resistance + 2 molecular markers); synthetic 0 / 0;
  `make-preview.js` 154 KB; `test-import.js` 127/127; `test-serializer.js`
  0 failures. No NUL bytes.
