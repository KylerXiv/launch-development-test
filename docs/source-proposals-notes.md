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

## First real run, 29 Sep

Run on the test repository with the fixture, after PR #3 merged:
1. The watcher filed #4.
2. Intake, started by dispatch, opened PR #5.
3. The preview was built.
4. The `approved` label, from the repository's only account, was verified and
   merged as `dc8cb36`.
5. `vercel-deploy` and `publish` ran.

Production then served GanLum as done, 15 Sep 2026, with the `TEST-0001`
sentence. Two things the simulation could not show:

- **Fixed — the issue stayed open.** GitHub did not act on "Closes #4": there
  was no connected or closed event on the timeline, apparently because
  `GITHUB_TOKEN` both opened and merged the PR. Approval now closes the issue
  itself after merging.
- **Left alone — two red runs on the bot's PR.** GitHub created `pull_request`
  runs of `validate.yml` and `pr-preview.yml` for PR #5, triggered by
  `github-actions[bot]`, with 0 jobs and 0 check runs. It marked them failed at
  05:08:48, when the merge deleted the branch. Nothing was validated or failed:
  the checks that count ran inside the approval and the dispatched preview.
  The workflow file cannot stop GitHub creating these.

The test data was then reverted (`git revert` of `dc8cb36`), not fixed forward.
The revert restores the file byte for byte as `history/products-2026-09-08.js`
holds it. A new edit dated the same day would have collided with
`history/products-2026-09-29.js`, which stays, because history is
append-only.

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
- ~~Intake does not consult `data/decisions.js` for proposals people file;
  approvals are not recorded there, nor removed from `data/proposals.js`.~~
  Fixed 29 Sep — see "Three gaps closed" below.

## Three gaps closed, 29 Sep

Branch `fix/pipeline-gaps`. These three would each have bitten on ordinary
use once the watcher was live.

**1. Two approvals on one day no longer break `publish.yml`.** Both carry the
same `meta.lastUpdated`, and history keeps one snapshot per date, so the second
hit the "never overwrite" guard: the dashboard updated but history, feed and
ontology did not. Now a later change the same day **replaces** that day's
snapshot, so it holds the day's final state — but only when
`scripts/history-continues.js` recognises it as a continuation. The rules:
- the new file adds at least one changelog entry;
- every new entry is dated that day;
- the snapshot's own entries are all still there, unchanged, beneath them.

An edit that forgot to bump the date adds no entry, or one dated later, so it
is still refused, as the guard intended. Tested on five cases: the continuation
is replaced; no bump, next-day entry and rewritten history are all refused.

**Revised the same day: the rule was too strict.** On the test repository:
1. The WHO test approval made `history/products-2026-09-29.js`.
2. The revert (#6) removed its changelog entry.
3. The EMA test approval (#10 → #11) landed that same day.

The rule above demanded that the snapshot's entries all survive, so it refused
the revert as "no new changelog entry". `publish.yml` failed: production
deployed, but history, feed and ontology did not update. A day's snapshot is
that day's final state, so within the day anything the changelog records may
change. The rule is now:
- entries dated **before** the day are exactly as the snapshot has them;
- **no** entry is dated after the day;
- the day's own entries **differ** from the snapshot's.

Replayed on the real files, the old rule refuses with the live run's exact
error, and the new one accepts ("1 changelog entry added, 1 from earlier that
day withdrawn"). Six cases:
- accepted: a second approval, a same-day revert followed by another approval,
  a same-day entry corrected;
- refused: an edit with no bump, an entry dated the next day, a rewritten
  earlier-day entry.

Simulation: 79/79. Its seed now resets the data file to the 8 Sep snapshot and
empties the queue and the log, so test data landing on main no longer upsets
its starting assumptions.

Rejected alternatives:
- *Suffixed snapshots* (`products-D-2.js`). Both readers,
  `build-history-graph.js` and `make-brief.js`, match only
  `products-YYYY-MM-DD.js`, so the second snapshot would be ignored silently.
- *Allow replacing only on today's date.* An approval merges with the date its
  PR was built, which can be days earlier. That rule would have refused a
  delayed approval.

**2. Every decision is logged.** `scripts/record-decision.js` now does what the
rejection job did inline, for both jobs. It appends
`{issue, state, reason?, by, on, target, proposed, fingerprint, pr?, commit?}`
to `data/decisions.js` and removes the proposal from the queue. The approve job
runs it after the merge, on top of main as the merge left it, then pushes. It
holds `bot-push-main`, so the `publish.yml` it just started waits and snapshots
after this commit. If the merge landed but the logging failed, the issue says
"Merged, but not recorded" instead of the old "Not merged", which would then
have been false.

**3. People re-filing a rejected change are flagged, not refused.** Intake now
checks `data/decisions.js`. If a *rejected* decision has the same fingerprint,
the bot's comment opens with a warning naming the issue, reviewer, date and
reason. It is not refused, because the fingerprint compares the change, not the
evidence: the same value with genuinely new evidence is legitimate. The watcher,
which cannot judge evidence, still skips such a proposal outright. Both now use
the library's `readDecisions` and `rejectionsOf`.

**Also: a proposal that changes nothing is refused.** If the stage would come
out identical — value, source and date — merging it would only add a changelog
line claiming an update. Re-confirming a value against a newer source date
changes the citation, so that is still accepted. Both cases are covered by
`selftest`.

Verification:
- `proposal-lib.js selftest`: 32/32.
- Simulation: 64/64. New scenarios 8–10:
  - approvals logged with their PR, merge commit and fingerprint, rejections
    with their reason, and the queue emptied;
  - a re-filed rejected change is warned and still filed;
  - two same-day publishes both succeed, and a no-bump hand edit is still
    refused.
- One simulation check was wrong, not the code: it expected the merge to be the
  newest commit on main, and the approval log now follows it. Corrected to look
  at `main~1`.

## EMA watcher, 29 Sep

Branch `ema-watcher`. The adapter is now a table of watchers, one row per
source, in `scripts/propose-regulatory.js`. The workflow, the library and the
route are the same. The EMA row proposes **"Regulatory approval (SRA)" done**
when EMA gives a portfolio medicine a **positive** EU-M4all / Article 58
opinion.

**What the data allows.** The staged EMA table has 19 rows, all EU-M4all.
Statuses: 12 positive opinions (7 of them carrying a later outcome date), 6
withdrawn opinions, 1 withdrawn application. Only one matches the portfolio:
ASPY's `H-W-2319`, whose SRA stage already shows done. So, as with WHO PQ, the
real list yields nothing today. DHA–PPQ's SRA approval (Eurartesim) is an
ordinary EU marketing authorisation, not an EU-M4all opinion, so it is not in
this table at all.

**Decisions:**
- **Only positive opinions are proposed.** A withdrawn opinion or application
  says the medicine did *not* get there, and why is a story a person has to
  tell. The watch report already flags the change. The run summary now lists
  every portfolio row it left for a person, with the reason. Today that is
  ASPY's two undated WHO rows.
- **The date is the opinion date.** The "(outcome …)" in a status belongs to a
  later procedure on the same opinion, such as a variation. A first SRA
  milestone is the opinion itself.
- **When a stage becomes done, "what happens next" is cleared.** GanLum's SRA
  stage says next "Dossier submission (SRA pathway)", TBC. Approving done while
  keeping that would contradict itself, and every stage already done on the
  dashboard has both next-step fields empty. An empty form section reads as
  "not given", so the watcher writes `(clear)`. The library accepts that only in
  a several-field proposal, which only the bot can file. This applies to WHO
  PQ too: ALAQ's WHO PQ stage still says "PQ targeted by ~2027". GanLum's WHO
  PQ proposal is unchanged, since that stage has no next step; its fingerprint
  is still `sha1:851aa6af792b30ec`.
- **The shrink guard is per source.** A sharp drop in EMA rows blocks EMA only.
  WHO PQ proposals are still written and filed, and the run then fails at the
  end, so the blocked source is visible without holding the other one back.
  Rejected: failing before filing anything, which would let one broken export
  silence every source.

**Not covered.** This watcher only sees what EMA publishes in EU-M4all. An SRA
approval through another route — Swissmedic's MAGHP procedure, say — is not
fetched, so it still arrives through a person's proposal.

- **The fields are listed in reading order: status, date, sentence, next
  step.** That order is the public changelog line's. Found by the simulation:
  in form order the line opened with the full sentence, and "status set to
  done" came halfway along. The fingerprint sorts the changes, so no recorded
  fingerprint moved.

**Fixture:** `test-data/regulatory/ema-ganlum-opinion.csv` — the real list,
plus a positive GanLum opinion (`TEST-EMA-0001`) and a withdrawn ALAQ
application (`TEST-EMA-0002`), which must not be proposed.

**Verification:**
- `selftest`: 36/36, including four new checks on clearing a field.
- Simulation: 77/77. New scenarios 11 and 12:
  - the EMA fixture files one bot issue, and the PR sets SRA done, the opinion
    date and the sentence, and clears the next step;
  - the withdrawn ALAQ row is reported as left for a person;
  - one approval merges it, and it passes the validator;
  - with EMA blocked, WHO PQ still proposes ALAQ, clearing its "~2027" next
    step, and the run fails at the end.
- Two older checks were wrong, not the code. The shrink-block message moved to
  the summary, and "already shown as listed" became "…as done". Both were
  corrected to match.

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
