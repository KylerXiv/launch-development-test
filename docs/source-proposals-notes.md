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
`history/products-2026-09-29.js`.

**Test snapshot removed, 29 Sep.** Leaving that snapshot in place was wrong.
The revert moves `lastUpdated` back to 8 Sep. The history graph treats the
newest snapshot as the current state and appends the live file only when that
is newer. So `launch-history.jsonld` recorded the test state as current: after
#6, GanLum WHO PQ "done from 29 Sep"; after the EMA test (#10 → #11) was
reverted in #13, SRA "done from 29 Sep, ongoing". Every version of the file
held only test data (`TEST-0001`, then `TEST-EMA-0001`), and 8 Sep is
identical to the live file. So the 29 Sep snapshot was removed and the graph
rebuilt, which now ends on the real state. This is the one deliberate exception
to append-only, for a file that never recorded anything real; it stays in git.

**For the next test run:** reject the test proposal, which leaves no trace in
the record. Or, if you approve it to watch production change, revert it *and*
remove that day's history snapshot.

## Deferred, and left alone

- **Other sources.** EMA (SRA approval) was added on 29 Sep, and
  ClinicalTrials.gov, NAFDAC and TMDA on 5 Oct, below. Rwanda's register is
  read by hand and Uganda's refuses automated requests, so neither has a
  watcher. The same pattern applies to any new source — one watcher per
  source — each with its own question of what the source states outright.
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

## Trial watcher, 5 Oct

Branch `source-watchers`, off `main` at `b91bac2`. `scripts/propose-trials.js`
is the ClinicalTrials.gov watcher. It runs in the same workflow, after every
fetch, beside the regulatory one.

**What it proposes: the date line of "R&D & clinical", and nothing else.**
Two cases, both stated outright by the registry:

| The registry says | The date line becomes |
| --- | --- |
| Primary completion happened (date marked `ACTUAL`) | "Phase III FD-TACT (NCT05951595) reached primary completion on 15 Sep 2026 (ClinicalTrials.gov)" |
| The estimate moved, to a date still ahead (`ESTIMATED`, trial under way) | "Phase III FD-TACT (NCT05951595): primary completion expected Jun 2027 (ClinicalTrials.gov estimate)" |

| Rejected | Because |
| --- | --- |
| Marking the stage done when the trial completes | Completing is not succeeding. GanLum's stage became done on the results announcement, not on the registry's completion date |
| Marking the stage delayed when an estimate slips | Whether a slip is a delay is judgement. The new estimate is proposed; the status is a person's call |
| Rewriting the sentence | It is curated: ALAQ's describes the formulation and the dose-optimization paper as well as the trial |
| Proposing from every staged trial | The search is broad. ALAQ's returns 58 trials, mostly artesunate-amodiaquine and artemether-lumefantrine trials from 2004 to 2015. Only the trial the stage is waiting on says anything about the stage |

**Which trials are followed.** Only for a medicine whose R&D stage is not done
(today only ALAQ), and only:
- any NCT number the stage cites in its own words; and
- the trial in `PIVOTAL` in the script, for a stage that cites none. Today
  that is ALAQ's FD-TACT, NCT05951595, which the stage names but does not
  number.

Rejected: matching a trial's acronym against the sentence. ALAQ's sentence
says "triple ACT", so any trial whose acronym is "ACT" would have matched.

**Left for a person, in the run summary:**
- **An estimate that has already passed** while the registry still says the
  trial is under way. That is the real case today: FD-TACT's estimated primary
  completion, 31 Jul 2026, has passed, and the record still says recruiting,
  last updated 18 Nov 2025. Proposing it would put a date already in the past
  on the dashboard as "expected".
- A trial terminated, withdrawn, suspended or of unknown status.
- Results posted.
- A followed trial missing from the staged list, which means the search no
  longer finds it.

New trials are not proposed at all. They are news, not a stage change, and the
weekly trial watch issue already lists them (GanLum's NCT07811908, 28 Sep).

**Repeats.** The same three stops as the regulatory watcher: an open proposal
for the same medicine and stage, a rejected fingerprint, and one more of its
own. If the date line already says exactly this, nothing is proposed. Without
that last check, every weekly run would re-propose an approved line against a
newer fetch date, because a newer source date counts as a change.

**Guard.** Per medicine: if its staged trials fell by more than a fifth since
the last fetch, nothing is proposed for it and the run fails at the end.

**The fetcher now records what the watcher needs.** `fetch-trials.js` writes
three more staging columns, at the end so no reader shifts: `acronym`,
`primaryCompletionType` and `completionType`. The last two say `ACTUAL` or
`ESTIMATED`. The raw snapshots always had them. `--restage` rebuilds the
staging file from the latest snapshot without the network. Rebuilt from the
28 Sep snapshot, the 15 old columns come back byte-identical to the committed
file (72,853 bytes both), so the committed staging was regenerated that way.
With a staging file from before this change, a `COMPLETED` trial is taken to
have an actual date and no estimate is proposed.

**The workflow now runs every watcher.**
- After a fetch, each watcher reads its own staged list, and its shrink guard
  compares that list with its previous committed version.
- A manual run takes "every source, as fetched" or one test file. A test file
  runs only its own source's watcher.
- A watcher that fails, or is blocked, no longer stops the others. Their
  proposals are filed, and the run fails at the end.
- The weekly trials fetch re-runs the regulatory watcher on an unchanged list.
  It proposes nothing new, because of the same repeat stops.

**Fixtures:** `test-data/trials/`. ALAQ's FD-TACT row is changed to "reached
primary completion" in one file and "estimate moved to Jun 2027" in the
other. Its acronym reads `FD-TACT-TEST`, so a proposal filed from them says
so in the line it would publish.

**Found in passing:**
- **The EMA fixture now proposes nothing.** Its proposal was rejected in an
  earlier test run, and the watcher skips a rejected fingerprint, test data
  included. To show the EMA route again, change the invented date in a copy.
  The trial fixtures will go the same way once a test proposal from them is
  rejected. The rule is right; the fixtures are single-use.
- **The local workflow simulation is gone.** It lived outside the repository
  and no longer exists. This change was tested with the script tests below
  and by running the workflow step's own shell script locally.
- **GitHub Actions is blocked by billing on the test repository** since at
  least 3 Oct. Nothing here has run on GitHub yet.

**Verification:**
- `scripts/test-source-watchers.js`: 42 checks, added to `validate.yml`. They
  cover reading one record, which trials are followed, the real list, both
  fixtures through intake's own library, approval making a re-run propose
  nothing, and the guards.
- **Mutation check: eight deliberate breaks, each caught.** They were: no
  past-estimate guard, stopped trials not refused, an estimate taken without
  its type, no "already says this" check, following done stages, no shrink
  guard, no `PIVOTAL` table, and no test-data marker.
- The workflow's "Work out what the sources now say" step, run locally from the
  YAML with its real shell script, for: every source (proposes nothing), a
  trial fixture (one ALAQ proposal), a regulatory fixture (one GanLum
  proposal), and an unknown file (fails). macOS's bash 3.2 has no `mapfile`,
  so the step does not use it.
- On the real list: nothing proposed, and FD-TACT's passed estimate left for a
  person, in those words.

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

## Register watchers, 5 Oct

Branch `source-watchers`, commit 2. `scripts/propose-registers.js` watches
Nigeria's NAFDAC Green Book and Tanzania's TMDA register, as a table of two
registers in one script. When a register lists a portfolio medicine as
currently registered, and the medicine's country map does not show that
country, it files a proposal.

### The design decision: how a proposal changes the country map

Registrations show on the map, which reads `detail.countries.list`, and in the
detail panel's "Registered" count, `detail.country.registered`. No proposal
could change either. On 29 Sep it was agreed to settle this in writing before
building a register watcher; this is that decision.

**Chosen: a watcher proposal may carry a "Country map" section.** One line per
country, `NGA: registered`, inside the several-field proposal only the bot can
file. One register event is one proposal, as with WHO PQ and EMA:
- the country is drawn on the map as `registered`;
- the "Registered" count rises to at least the number of countries drawn;
- if the medicine's "Country registration" stage has not started, it is
  marked in progress, with the first registration's date and a factual
  sentence.

| Rejected | Because |
| --- | --- |
| Opening the map to the issue form people use | It widens a form everyone uses, for a change only the registers make today. The map's other levels, guidelines and MFT, need policy evidence of a different kind. That is its own decision |
| Changing only the stage's sentence | The map is where registration shows. GanLum's map would stay empty while its sentence said "registered in Nigeria" |
| Writing the map straight from the staged register | It skips approval. Every change to the data goes through one person's approval |
| The count as a separate proposal | Approving one and not the other leaves "Registered: 0" beside a country on the map. Both GanLum and ALAQ show 0 today |

**What the change does, and does not:**
- **Only `registered` is proposed.** A register says a medicine is
  registered. Guidelines and MFT come from policy documents.
- **Only a country the map does not show.** A country already drawn, at any
  level, is left alone: Tanzania is MFT for DHA–PPQ.
- **A medicine with no map gets one, as a draft.** The validator requires a
  warning on any map that is not verified, so the map's note says only
  register-verified countries are shown.
- **The count is raised, never lowered, and a "TBC" is left alone.** ASPY's
  25 stays 25: it comes from MMV, and the map draws 16. The count is worked
  out when the proposal is applied, from the map as it then stands. Two
  proposals for one medicine can then be approved in either order, and the
  second still counts both countries. The snapshot's figure is what the
  reviewer was shown.
- **A proposal that only draws a country keeps the stage's citation.** It
  changes none of the stage's wording, so DHA–PPQ's "NAFDAC Greenbook + TMDA
  IMIS2 registers (extracts 23 Aug 2026)" would survive. The changelog line
  carries the register.
- **Only one proposal per medicine starts the stage**: the register with the
  earlier first registration. If both registers started it, approving the
  second would overwrite the first's sentence.
- **The title names the country**, "Proposal: GanLum · Country registration ·
  Nigeria". Two registers' proposals are then two open issues, not one
  blocking the other.
- **Fingerprints of every other proposal are unchanged.** Countries are added
  to the fingerprint only when a proposal has them. Checked before and after
  the change: the self-test's several-field proposal (`sha1:e732ca131d4ebf04`),
  a single-field one (`sha1:2ec5e7a29920c331`), and the recorded EMA rejection
  (`sha1:ae1ec5d6c4cb475c`), which the watcher still recognises.
- `record-decision.js` records the countries with the decision.

### What the watcher reads

| Register | Currently registered means | Reference | Date |
| --- | --- | --- | --- |
| NAFDAC | status `Active` | `nafdacNo` | `approvalDate` |
| TMDA | status starting `Registered` | `certificateNo` | `issueDate` |

A row the register calls current, but whose own expiry date has passed by the
day it was read, is not counted. It is left for a person.

**Left for a person, in the run summary:**
- a country the map shows as registered, where the register now lists nothing
  current. Lapsed registrations are a story: DHA–PPQ has 22 inactive rows in
  Nigeria beside its 25 active ones;
- registrations past their expiry date that the register still calls active.

**Guard.** Per register: if its rows for its country fell by more than a fifth
since the last fetch, nothing is proposed from it and the run fails at the
end. The other register still proposes.

**What it yields.** With the real registers, nothing. ASPY and DHA–PPQ are the
only portfolio medicines either register lists, and both countries are
already on their maps.

### Public wording of proposal changelog lines

Every approved proposal adds a public changelog line. The template
lower-cased the stage's name and put "the" before the source's label:

| Before | After |
| --- | --- |
| GanLum — who pq listing was updated from the WHO prequalification list. | GanLum — WHO PQ listing updated (source: WHO prequalification list). |
| ALAQ — r&d & clinical was updated from the ClinicalTrials.gov. | ALAQ — R&D & clinical updated (source: ClinicalTrials.gov). |
| — | GanLum — Nigeria added to the country map (source: Nigeria: NAFDAC Green Book). |

These lines now also reach subscribers by email. None of the 23 live
changelog lines used the template, so nothing already published changes.

### Not covered

- **A person's open proposal no longer blocks the watcher's** for the same
  medicine's Country registration stage, because the titles differ. If both
  change the stage, whichever is approved second is rebuilt on `main` first,
  and its preview shows the result, as for any proposal when `main` moves.
- **One register per country.** Rwanda's is read by hand; Uganda's refuses
  automated requests.

### Verification

- `scripts/test-source-watchers.js`: 61 checks, 19 of them for the registers.
  They cover the real registers, each fixture through intake's library, both
  fixtures together, approval making a re-run propose nothing, lapsed and
  expired registrations, the shrink guard with the other register still
  proposing, and a stage already under way.
- `proposal-lib.js selftest`: 56 checks, 20 of them new. They cover a
  country-only proposal, a first registration, refusals (a person, a bad line,
  a country already drawn), the new map and its warning, the count in either
  approval order, the title, the fingerprint and the changelog line.
- **Mutation check: thirteen deliberate breaks, each caught.** Six were in the
  watcher: no expiry check, a drawn country proposed, every register starting
  the stage, no shrink guard, inactive rows counted, and starting a stage
  already under way. Seven were in the library: people allowed several fields,
  the citation overwritten by a map-only proposal, no draft map, the count
  taken from the snapshot, countries left out of the fingerprint, no country in
  the title, and the map ignored by the "changes nothing" check.
- **End to end on the real data file.** The ALAQ trial proposal and both
  GanLum register proposals were applied with `proposal-lib.js apply`, as the
  approval does. Then the validator (0 errors, 1 warning),
  `assemble-content.js`, `build-dataset.js` and its 28 tests, the French and
  Portuguese pages, and the preview were run on the result. The data file was
  restored afterwards.
- The workflow step, run locally from the YAML, for: every source (three
  watchers, nothing proposed), each register fixture (one proposal each), and
  a trial fixture.

## Status, `source-watchers` (5 Oct)

- Branch `source-watchers`, off `main` at `b91bac2`, 2 commits: the trial
  watcher, then the register watchers with the country-map change.
- CI cannot run while GitHub Actions is blocked by billing. The checks CI
  would run passed locally, as listed in each section's verification.
- Files, commit 1: `scripts/propose-trials.js`,
  `scripts/test-source-watchers.js` and `test-data/trials/` (new);
  `scripts/fetch-trials.js`, `sourcing/staging/trials.csv` (restaged),
  `.github/workflows/source-proposals.yml`, `.github/workflows/validate.yml`,
  `sourcing/README.md`, this document.
- Files, commit 2: `scripts/propose-registers.js` and `test-data/registers/`
  (new); `scripts/proposal-lib.js`, `scripts/record-decision.js`,
  `scripts/test-source-watchers.js`, `.github/workflows/source-proposals.yml`,
  `sourcing/README.md`, this document.
