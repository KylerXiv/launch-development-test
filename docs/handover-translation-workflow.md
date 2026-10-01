# Handover — translation in the proposal workflow

*Written 30 September 2026 by Kyler (with Claude Code), for the developer who
takes this over.*

**Repository:** [`KylerXiv/launch-development-test`](https://github.com/KylerXiv/launch-development-test)
(the test repository) · **Live site:** <https://launch-development-test.vercel.app>
· **State:** working end to end, tested three times on 30 Sep · **One test
proposal (#24) is still on `main` — revert it first (see §6).**

This document tells you what was built, how the workflows fit together, how to
test them, and what is left. The *reasons* behind each decision, with the
alternatives rejected and the numbers, are in
[translation-notes.md](translation-notes.md) — read that before changing the
design. How the translation pipeline works inside is in
[jackson/DEV-31.md](jackson/DEV-31.md).

---

## Start here

1. Read [CLAUDE.md](../CLAUDE.md) (the verify block, and two failure modes that
   have already happened) and [developer-guide.md](developer-guide.md).
2. ~~Revert test proposal #24~~ — done 1 Oct 2026 (§6, "Cleaning up").
3. Fix the history workflow (§7, item 1) — it fails after every approval.
4. Update the Status section of [translation-notes.md](translation-notes.md) in
   the same commit; it still says the branch is not merged.

---

## 1. What this work did, in one paragraph

The dashboard already had an automated route for data changes: a public source
or a person files a **proposal** issue, a bot opens a pull request with the
change and a preview of the public site, a reviewer labels the issue
`approved`, and a bot merges it. Keith's branch `feat/translation` (DEV-31, by
Jackson / Oakkar-Min) added a **translation pipeline** that produces French
and Portuguese copies of the illustrated journey dashboard, but it ran by hand
and was not connected to that route. This work connected them: **when a
proposal is approved, its new English is translated before the merge, and
English, French and Portuguese land on `main` in one commit.** Changes made by
hand (the page, the data files) are translated by a bot after they reach
`main`. `/fr/` and `/pt/` are now part of the public site.

---

## 2. How it flows

```
PROPOSAL PATH — automated merge after approval

 source watcher (after a fetch)      issue form (a person)
            └─────────────────┬─────────────────┘
                              ▼
┌─ Intake ───────────────────────────────────────────────────┐
│ check the rules · snapshot the proposal                    │
│ open PR proposal/<n> carrying:                             │
│   data/products.js                                         │
│   i18n/content.en.json, rebuilt from it                    │
└────────────────────────────────────────────────────────────┘
                              ▼
┌─ Preview (Vercel) ─────────────────────────────────────────┐
│ /en, /fr and /pt — new strings still in English            │
│ nothing is sent to Google                                  │
└────────────────────────────────────────────────────────────┘
                              ▼
                  reviewer labels `approved`
                   = the staging dashboard
          (`rejected:…` → closed, nothing published)
                              ▼
┌─ Approval job ─────────────────────────────────────────────┐
│ 1 PR still = snapshot on today's main                      │
│     main moved? rebuild PR + preview, ask again            │
│   only products.js (+ content.en.json) in the PR           │
│ 2 validator                                                │
│ 3 rebuild content on today's main, translate only the new  │
│   strings → Google (engine fails → merge anyway, gap shows │
│   in English)                                              │
│ 4 build /fr /pt, self-check                                │
│ 5 replace the PR branch with that one commit               │
│ 6 squash-merge: en + fr + pt, one commit                   │
│ 7 record the approval + contentHash in data/decisions.js   │
│ 8 start deploy + publish (publish starts the translate bot)│
└────────────────────────────────────────────────────────────┘
                              ▼
           production: /en /fr /pt go live together

HAND-MADE PATH — page, resistance, markers, sources, direct
                 edits to products.js

                    person pushes to main
                              │
          ┌───────────────────┴─────────┐
          ▼                             ▼
  deploy right away         ┌─ Translate bot ────────┐
  /en: live                 │ rebuild content.en.json│
  /fr /pt: new text in      │ translate new → Google │
    English for now         │ self-check /fr /pt     │
                            │ commit the 2 i18n files│
                            └───────────┬────────────┘
                                        ▼
                             deploy again: /fr /pt
                             gaps filled (minutes)
```

**Why the workflows start each other by hand.** Anything a workflow does with
`GITHUB_TOKEN` (opening an issue, pushing, merging) starts no other workflow.
So each bot step *dispatches* the next one explicitly. That is why you will see
`gh workflow run …` throughout.

**The shared lock.** Intake, the approval job, the history workflow, the source
fetch and the translate bot all use the concurrency group `bot-push-main`, so
only one of them pushes to `main` at a time. GitHub keeps **one running and one
pending** run per group: a third run queued while one is pending *cancels* the
pending one. Several design choices below exist only to avoid that.

---

## 3. The workflows

All in `.github/workflows/`. "New" and "changed" refer to this work.

| Name in the Actions tab | File | Starts on | Does |
|---|---|---|---|
| Scheduled source fetch | `sourcing.yml` | weekly Mon 06:00 UTC (trials), monthly 3rd 06:30 (Global Fund, WHO PQ/EMA, NAFDAC, TMDA), or by hand | Fetches public sources into `sourcing/`; opens watch issues. Never touches `data/`. |
| Propose changes from public sources | `source-proposals.yml` | after the fetch, or by hand with a choice of list | Files a proposal issue for each thing a source states outright (today: a WHO PQ listing), then starts intake for each, one at a time. |
| Proposal intake | `proposal-intake.yml` | a proposal issue opened or edited, or by hand with an issue number | Checks the form against the data rules, snapshots it into `data/proposals.js`, opens PR `proposal/<n>` (`scripts/proposal-pr.sh`), starts the preview, labels `waiting` or `needs-fixing`. **Changed:** the PR now also carries `i18n/content.en.json`. |
| Proposal preview | `pr-preview.yml` | a person's PR, or dispatched by the bots | Builds the public site from the PR and deploys a Vercel **preview**; comments the link. **Changed:** the comment links `/fr/` and `/pt/` too. |
| Proposal decision | `proposal-decision.yml` | any label added to an issue | `approved`: the checks, then **new** step *"Translate it, and build the commit that merges"* (`scripts/proposal-translate.sh`), the merge, the record. `rejected:<reason>`: records it with a fingerprint so it is not proposed again, closes. |
| Snapshot history and rebuild feed | `publish.yml` | a push to `main` changing `data/products.js`, or dispatched after an approval | Snapshot into `history/`, rebuild `feed.xml` and the ontology exports. **Changed:** after a dispatched run it starts the translate bot. **Has a bug — §7 item 1.** |
| **Translate new text** (new) | `translate.yml` | a push to `main` changing the page, `products.js`, `resistance.js`, `molecular-markers.js`, `sources.js`, `assemble-content.js` or `i18n-identifiers.js`; or by hand | Rebuilds `content.en.json`, translates only new strings, self-checks both pages, commits the two `i18n/` files, starts the deploy. Fails visibly if the engine failed, after committing what is ready. |
| Trigger Vercel deploy | `vercel-deploy.yml` | a push to `main`, or dispatched | Calls the Vercel deploy hook for production. |
| Validate dashboard data | `validate.yml` | every push and PR | Validator on both datasets, preview smoke test, SHACL shapes. **Changed:** also builds `/fr` and `/pt` and runs their self-check. |
| Monthly data review reminder | `reminder.yml` | 1st of the month, or by hand | Opens the manual milestone-scan checklist issue. |

### The scripts behind them

| Script | Role |
|---|---|
| `scripts/proposal-pr.sh` | Puts a proposal on `proposal/<n>` and opens its PR. **Changed:** also rebuilds and adds `i18n/content.en.json`. |
| `scripts/proposal-translate.sh` | **New.** Run by the approval job: on today's `main` with the snapshot applied, rebuilds the content, translates, self-checks, and force-pushes one commit to `proposal/<n>` *only over the commit the reviewer saw* (`--force-with-lease`). Prints the new SHA, the `contentHash`, and how many strings are still in English. |
| `scripts/record-decision.js` | Appends every decision to `data/decisions.js`. **Changed:** an approval records `contentHash` (and `reviewedContentHash` when `main`'s other files had moved). |
| `scripts/assemble-content.js` | DEV-31. Reads the page and data, writes `i18n/content.en.json` with a hash per string and one `contentHash`. `--check` says whether it is current. **Changed:** reads `data/sources.js` (the Sources footer). |
| `scripts/translate-strings.js` | DEV-31. Sends only untranslated strings to the engine and fills `i18n/translations.json`. **Changed:** refuses to run unless `APPROVED_CONTENT_HASH` equals the content's hash (the approval gate, CP-4); `TRANSLATE_ENGINE=stub` for tests. |
| `scripts/build-locale-pages.js` | DEV-31. Writes `dist/locale/fr` and `pt` by substitution, then self-checks. **Changed:** localises `sources.js`, copies whatever data files the page loads, fails if the page loads a missing file; `--allow-stale` for the public build. |
| `scripts/build-public-site.sh` | Vercel's build command. **Changed:** builds and ships `/fr/` and `/pt/`. |
| `scripts/i18n-hash.js` | DEV-31. The only hash function. **Frozen** — changing it re-keys every translation (DEV-31 §5). |

### The files that matter

| File | What it is | Edit by hand? |
|---|---|---|
| `i18n/content.en.json` | Every translatable English string and every figure, with `contentHash`. What an approval approves. | **Never** — regenerate with `node scripts/assemble-content.js` |
| `i18n/translations.json` | The translation memory: one entry per English string, with `fr` and `pt`. | **Yes, `fr`/`pt` values only** — a filled value is never overwritten, so corrections stick |
| `data/proposals.js` | Proposals waiting for review (snapshots taken at intake). | No — bot-written |
| `data/decisions.js` | Every decision, with fingerprints and (for approvals) `contentHash`. Append-only. | No — bot-written |
| `test-data/regulatory/who-pq-ganlum-listed.csv` | The test fixture: the real WHO list plus one invented GanLum listing, `TEST-0001`. | No |

---

## 4. Settings the workflows need

All under the repository's **Settings → Secrets and variables → Actions**.
They are per repository and do not copy over. On a personal-account
repository only the owner can set them.

| Kind | Name | On the test repo | Purpose |
|---|---|---|---|
| Secret | `GOOGLE_API_KEY` | **set** (30 Sep) | Google Cloud Translation v2. Restrict it to that API only, no website/IP restriction (GitHub's runners have neither), and set a budget alert — Google bills past 500,000 characters a month. Should belong to an organisation's Google project, not a person's (DEV-31 §8). |
| Variable | `TRANSLATE_ENGINE` | **not set** (= Google) | `stub` returns `[stub-fr] <English>` instead of calling Google — for testing with no key. A real engine later overwrites stub values by itself. |
| Secrets | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | set | PR previews. |
| Secret | `VERCEL_DEPLOY_HOOK_URL` | set | Production deploys. |

Also required, and already done on the test repo: **Settings → Actions →
General → "Allow GitHub Actions to create and approve pull requests"** on; the
labels created with `bash scripts/setup-labels.sh <owner/repo>`.

| Engine | Key | Result |
|---|---|---|
| `stub` | not needed | Marked fake translations |
| unset / `google` | set | Real French and Portuguese |
| unset / `google` | missing | English merges; new text stays English on `/fr` `/pt`; the translate bot's runs go red |

---

## 5. Where to look

| What | Where |
|---|---|
| English page | <https://launch-development-test.vercel.app/illustrated-journey-dashboard.html> |
| French page | <https://launch-development-test.vercel.app/fr/illustrated-journey-dashboard.html> |
| Portuguese page | <https://launch-development-test.vercel.app/pt/illustrated-journey-dashboard.html> |
| Each language's data | `…/fr/data/products.js`, `…/fr/data/sources.js`, same for `pt` |
| Workflow runs | Actions tab → pick the workflow on the left → the run → the job → its steps |
| Translation memory | [`i18n/translations.json`](https://github.com/KylerXiv/launch-development-test/blob/main/i18n/translations.json) |

There is **no language switch** on the page yet — type the `/fr/` or `/pt/`
address. **Preview links always show new text in English** (nothing is
translated before approval); check production, with a hard refresh, to see the
result of an approval. The Proposal decision workflow runs once per label
added, so look for the run whose `approve` job was not skipped.

The French and Portuguese pages are not committed anywhere: they are built on
every deploy. To build them locally from a clone:
`node scripts/build-locale-pages.js`, then open
`dist/locale/fr/illustrated-journey-dashboard.html`.

---

## 6. Testing the whole route end to end

This is exactly what was run three times on 30 September, each time
successfully.

1. **Start.** Actions → **Propose changes from public sources** → Run workflow
   → choose **`test-data/regulatory/who-pq-ganlum-listed.csv`**. (Not the EMA
   file: its content was rejected in #17, so the watcher will not file it
   again.)
   `gh workflow run source-proposals.yml --repo KylerXiv/launch-development-test --ref main -f staging=test-data/regulatory/who-pq-ganlum-listed.csv`
2. **Within ~3 minutes:** an issue "Proposal: GanLum · WHO PQ listing" labelled
   `waiting`, and its PR. The PR changes **exactly two files**
   (`data/products.js`, `i18n/content.en.json`); its preview shows the new
   sentence in English.
3. **Approve.** Add the label `approved` to the issue (any account: the bot
   filed it, so the self-approval rule does not bite).
4. **Pass if:** Proposal decision is green including *"Translate it, and build
   the commit that merges"*; the issue comment ends *"Its French and
   Portuguese are in the same commit."*; the commit "Apply proposal #n…" on
   `main` changes exactly `products.js`, `content.en.json` and
   `translations.json`; production `/fr/` shows *"Préqualifié par l'OMS le 15
   septembre 2026 (réf. OMS TEST-0001, Novartis Pharma AG)."* on GanLum's WHO PQ
   stage.
5. **Expect one red run:** Snapshot history and rebuild feed fails at its push
   — the known bug (§7 item 1). The translate bot started after it should say
   there is nothing new to commit.

**To test the engine-down path** without touching the key: before approving,
set the variable `TRANSLATE_ENGINE` to `off` (any value other than `google` or
`stub` makes the translation step fail). The merge still happens, the comment
says how many strings are still in English and that the engine failed, and
the translate bot goes red. Then delete the variable and run **Translate new
text** by hand: it fills the gap.

### Cleaning up after a test

The fixture's listing is invented and must not stay on `main`. Revert the
approval's one commit — that takes out the English and its translations
together:

```bash
git revert <sha of "Apply proposal #n, approved by …">
cmp data/products.js history/products-2026-09-08.js   # must be identical
# run the verify block from CLAUDE.md, then push
```

The `cmp` holds only while nothing else has changed `data/products.js` since
8 Sep. It stopped holding on 1 Oct, when Keith's `development` was merged
(`docs/merge-keith-development-notes.md`) — see "Done, 1 Oct" below for how
#24 was reverted after that.

(Or on GitHub: open the proposal's merged PR → **Revert** → merge the revert
PR.) After the push, Validate, Vercel deploy, Snapshot history and Translate
new text should all be green, with no bot commits.
`data/decisions.js` keeps the test's approval record, as it does for #4, #15,
#20 and #22 — leave it. Because of the history bug, no test snapshot has been
written; if the history workflow is fixed first, a test will write
`history/products-<date>.js` containing `TEST-0001`, which should then be
deleted and the graph rebuilt (`node scripts/build-history-graph.js`), as in
`b1b44a4`.

**Done, 1 Oct 2026: test proposal #24 is reverted** (branch
`revert-test-proposal-24`). It was still live until then, in all three
languages. Keith's merge had landed on top of it, so a plain `git revert
e44c228` no longer fitted, and it was taken out by hand:

- **`data/products.js`:** #24's GanLum stage and changelog line reversed.
  `meta.lastUpdated` stays `2026-09-30`, not `2026-09-08`, because Keith's
  `stageInfo` and barrier phrases, added on 30 Sep, are real data that day.
- **`history/products-2026-09-30.js`:** the first snapshot actually written
  with `TEST-0001` in it. The publish run after the Keith merge wrote it (that
  run had no race to lose). It was replaced with the corrected file, which
  `history-continues.js` accepts as "1 [entry] from earlier that day
  withdrawn". `feed.xml` and both `ontology/` exports were rebuilt from it, so
  the RSS feed no longer announces the listing.
- **`i18n/`:** the two strings #24 added to `translations.json` were removed,
  and `content.en.json` was rebuilt with `assemble-content.js`.
- **`data/proposals.js`:** test proposal #4's queue entry (`p-4`) was removed.
  It had sat there as "waiting" since 29 Sep, from before approvals removed
  their own entry.
- `data/decisions.js` keeps #24's approval record, as for the others.

---

## 7. What is left

In order of priority.

1. **The history workflow fails after every approval.** It failed after #10 and
   #15 (29 Sep) and #20, #22 and #24 (30 Sep) — the last four at its
   commit-and-push step; #10's failing step was not checked. Cause: the approval job starts
   `publish.yml`, then pushes its approval record to `main`. `publish.yml`
   waits its turn in the lock, but `actions/checkout` without a `ref` checks out
   the commit `main` was at *when it was started*, so its commit sits on a stale
   parent and the push is refused ("fetch first"). Effect: approved proposals
   get no `history/` snapshot, no `feed.xml` entry and no ontology rebuild.
   **Fix:** give its checkout `with: ref: main`, as `translate.yml` already
   does. Then record the fix, the three test runs and this diagnosis in
   [translation-notes.md](translation-notes.md)'s Status (still says "Not
   merged") in the same commit.
2. **Translation review by a French and Portuguese speaker.** Google's output is
   mostly right, but:
   - Portuguese turned the journal name *Frontiers* into "Fronteiras";
   - Portuguese "panorama dos medicamentos contra a malária no MESA" starts in
     lower case and reads MESA as a place;
   - protected terms get pushed to the front: "OMS PQ produits comparateurs",
     "Novartis: GanLum Résultats de la phase III", "MMV pipeline";
   - an older entry is plainly wrong: "WHO PQ held for tablets…" → "OMS PQ
     **interdit**…" ("forbidden");
   - the three DHA–PPQ strings the engine always rejected were **written by hand
     and not reviewed** (keys `067f9f108ad6bf6f`, `d8d25752df253a3f`,
     `368e55377d8c2ac7`).
   Correct them in `i18n/translations.json`. Consider adding "Frontiers" and
   "PLOS" to `PROTECT` in `scripts/translate-strings.js`.
3. **Some interface text is never picked up for translation** — "actual
   milestone", "Recorded", "today", "1 yr", and the timeline's "in progress".
   The extractor in `assemble-content.js` deliberately skips single words and
   text built inside the page's code, to avoid rewriting code. Improving it is
   extractor work (Jackson's area), separate from the workflow.
4. **`data/sources.js` is published with its internal fields.** Its own header
   says `findings` and `relevance` are internal and "NOT published"; the page
   never shows them, but the public build copies the file whole (and now the
   `/fr` and `/pt` copies too). Stripping them is the owner's call.
5. **Moving this to the home repository**, `Keith-paradox/launch-development`
   (named home on 22 Sep). Its `main` is far behind the test repo; its
   `feat/translation` is `ee1181e`, ours is that plus `f69ecf6`. Only Keith can
   add the secrets, the variable, the labels and the Actions setting there.
6. **Smaller, deferred** (details in translation-notes.md, "Deferred"): a string
   the engine rejects is queued again on every run until written by hand; every
   proposal has new text (its changelog line), so every approval uses the
   engine; every hand-made change adds a bot commit; `content.en.json` carries
   `sources.js` whole, so DEV-32's `build-dataset.js` must drop the internal
   fields; `pt-PT` vs `pt-BR` is still open; no language switcher.
7. **Harmless noise:** red or "action required" runs on `proposal/<n>` branches.
   GitHub creates them for the bot's pushes; they never need to run.

---

## 8. What was done, in order

The 29 Sep tests were run by Kyler, before the translation work; everything
from 30 Sep was worked out in the Claude Code session in §9.

| When | What | Commits / PRs |
|---|---|---|
| 29 Sep | End-to-end tests of the source-watcher route (proposals #4, #10, #15 approved, #17 rejected); #4 and #10 reverted, the test history snapshot removed | `e0a31b5`, `a2255dc`, `b1b44a4` |
| 30 Sep | Keith's `feat/translation` pulled into the test repo (fast-forward) | `d0f741e` → `ee1181e` |
| 30 Sep | Trial merge into `main` found: sources footer breaks on `/fr` `/pt`; merge silently deletes a reviewer doc; `poc/` committed by mistake; test data on `main` | — |
| 30 Sep | Test proposal #15 reverted before anything was translated | `b8c8d05` |
| 30 Sep | On `feat/translation`: reviewer doc kept, `poc/` untracked, notes started | `f69ecf6` |
| 30 Sep | Design agreed with the owner, from their two diagrams (target architecture; DEV-31 approval workflow) | recorded in translation-notes.md |
| 30 Sep | Branch `translation-workflow`: merge, Sources footer, hand-written strings, approval gate + stub, public `/fr` `/pt`, approval-time translation + translate bot | `97e8722` … `0994a15`, PR [#19](https://github.com/KylerXiv/launch-development-test/pull/19) |
| 30 Sep | Checked before merge: `actionlint` + `shellcheck` clean; local simulation 50/50; CI and the Vercel preview green; `/fr` `/pt` footers rendered in headless Chrome | — |
| 30 Sep | PR #19 merged; `GOOGLE_API_KEY` added; the translate bot translated the 30 waiting strings with Google | `2415307`, `6ed2b10` |
| 30 Sep | End-to-end test 1: #20 → merged in #21, then reverted | `3bca88d`, revert `c9e0e41` |
| 30 Sep | End-to-end test 2: #22 → merged in #23, then reverted | `9651146`, revert `a7e1c3e` |
| 30 Sep | End-to-end test 3: #24 → merged in #25 | `e44c228`, `f6e9f0b` |
| 1 Oct | Keith's `development` merged into `main`, on top of #24 | PR [#26](https://github.com/KylerXiv/launch-development-test/pull/26), `5b94d8c` |
| 1 Oct | #24 reverted by hand, with the 30 Sep snapshot, feed, linked data and test #4's stale queue entry | branch `revert-test-proposal-24` |

**The local simulation** ran the workflows' own `run:` blocks against a bare
git remote and a stub `gh` that squash-merged for real, covering: a normal
approval; `main` moving underneath; the engine failing; a smuggled file; a push
racing the merge; a hand-made change with no key; a merge that lands while
`gh` reports failure. It lived in the session's temporary folder, **not in the
repository**.

---

## 9. The chat this came from

The translation work above was worked out in a Claude Code session with Kyler
on 29–30 September 2026. The transcript has the questions, the decisions, and
every command run with its output.

- Session ID: `7876ce3b-e483-461d-9dc7-c3258bcf2a69`
- Transcript, on Kyler's machine:
  `~/.claude/projects/-Users-parad0x-Downloads-launch-development-test-main/7876ce3b-e483-461d-9dc7-c3258bcf2a69.jsonl`
- To reopen it there: `claude --resume 7876ce3b-e483-461d-9dc7-c3258bcf2a69`
  from `~/Downloads/launch-development-test-main`.

The Google key was added in GitHub's settings and never appeared in the chat.
The owner's two diagrams were shared as images in the chat and are not in the
repository.

**The conversation, condensed:**

1. *How to trigger the end-to-end workflow?* — the proposal route explained; the
   fixture found already applied on `main`.
2. *Pull Keith's `feat/translation` and combine it with the current workflow;
   the translation pipeline must work before merging.* — Pulled; a trial merge
   found the problems listed in §8. Owner's calls: don't merge yet; revert the
   test data first; keep the reviewer doc; drop `poc/`.
3. *The automated merge after approval must include the translation layer —
   doable, many conflicts?* (with the diagrams) — no git conflicts; a handful of
   design points. Owner's calls: **the `approved` label is the staging
   dashboard**; **translate after approval, before the merge** (option A).
4. *Hand-made changes?* — the bot translates them after they reach `main`
   (recommended, and chosen). Found while checking: a decision already on
   record that **English does not wait for French**, so option A was corrected —
   an engine failure merges the English with gaps instead of blocking.
5. *Go ahead* — built, simulated, pushed as draft PR #19.
6. *How to test end to end myself; what "without a Google key" means; where
   the key goes* — the runbook in §6 and the settings in §4. The owner merged
   #19 and added the key; the bot translated the waiting strings.
7. *The site still shows English* — that was the pre-approval preview;
   production had the French. Found: the history-workflow bug (§7 item 1).
8. *Revert it* (twice) — the test proposals #20 and #22 reverted.
