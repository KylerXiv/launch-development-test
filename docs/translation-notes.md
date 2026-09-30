# Translation in the proposal workflow — working notes

Branch: `translation-workflow`, cut from `main` at `b8c8d05` on 30 September
2026, with `feat/translation` (`f69ecf6`) merged in. `feat/translation` is
Keith's branch (`Keith-paradox/launch-development`, `ee1181e`) plus one commit
of ours, described below. The pipeline itself is described in
[docs/jackson/DEV-31.md](jackson/DEV-31.md); this file records bringing it into
the proposal workflow, so that the automated merge after approval also
translates.

**Not merged into `main`.** It merges when the owner says so.

## The design, agreed 30 Sep

**The `approved` label is the staging dashboard.** The owner's call. The
reviewer keeps doing what they do today — the issue, the pull request, the
preview, the label — and approving a proposal is approving the English content
it produces, identified by its `contentHash`. That answers CP-4 (where the
approval record lives): in `data/decisions.js`, which the approval job already
writes. Rejected: a separate staging page with its own Approve/Reject buttons —
a second place to approve, for the same decision.

**Translate after approval, before the merge — and English does not wait.**
The approval job translates only the new strings, builds the French and
Portuguese pages, and merges English, French and Portuguese as one commit. If
the engine fails, it merges the English anyway and the new strings show in
English on `/fr` and `/pt` until the translate bot fills them. The second half
is not new: [source-registry-notes.md](source-registry-notes.md) already
records "English does not wait for French", rejecting a release held until every
language is complete because "one untranslated sentence then blocks a
registration update, which is the worse failure". An earlier draft of this
design (nothing merges if the engine fails) was that rejected alternative, and
was corrected before anything was built. Rejected: translating at intake, so
the preview shows French — it sends unapproved text to the engine and pays for
proposals that are then rejected.

**Changes made by hand are translated by a bot after they reach `main`.** The
page, `resistance.js`, `molecular-markers.js` and `sources.js` never go through
a proposal (53, 3, 1 and 1 commits on `main` from 30 Aug to 30 Sep). Each
changes the English that `content.en.json` records. Rejected: the person who
made the change runs the pipeline and commits the result, with CI going red if
they forget. Four reasons:

- nothing could enforce it — branch protection is unavailable on this plan
  (GitHub answers 403, "Upgrade to GitHub Pro or make this repository public"),
  so a red check does not stop the push;
- the repo already works the other way: `publish.yml` rebuilds generated files
  after a push, and `UPDATING.md` tells analysts CI does it "for you";
- the Google key would have to sit on every editor's machine, against DEV-31 §8
  ("organisation secrets, never personal accounts");
- the approval rule's own reasons (not paying for rejected sentences, no French
  for an unapproved claim) do not apply to a push to `main`, which is already
  live in English.

## What `feat/translation` brought, and what we changed on it

| Where | Change |
|---|---|
| `docs/reviewer-feedback-parallel-gates-sep-2026.md` | restored — the branch had deleted it |
| `poc/` (8 files, 2,324 lines) | no longer tracked; added to `.gitignore` |
| `docs/translation-notes.md` | **new.** This file |
| `main`, separately | `b8c8d05` reverts proposal #15, the invented `TEST-0001` WHO listing |

## Decisions

**Pulled as a fast-forward.** Keith's branch was this repository's copy plus
four commits (`d163f6d`, `79f5f51`, `2598057`, `ee1181e` — DEV-31's
`assemble-content.js` and `content.en.json`), with nothing of ours on it to
reconcile.

**The reviewer-feedback doc is kept.** The branch deleted it in `bc13fe7`
("deleted", 11 Sep), which it inherited from `fix/sep9-feedback-parallel`, the
branch it was cut from. No reason is given and nothing in the translation work
depends on it being gone. A merge would have removed it silently: `main` has not
touched the file since `7e7b219`, so git sees no conflict. Restored from
`7e7b219`, which is byte-for-byte `main`'s copy. Rejected: taking the deletion.

**`poc/` leaves the branch.** `ed16f95` ("DEV-28: move engine comparison tooling
into gitignored poc/") meant it to stay local; `603b305` committed it the same
day, and `.gitignore` never listed it. It holds the engine-comparison script,
its French, Portuguese and French-surveillance outputs (HTML and JSON), and the
scoring sheet. Nothing outside `poc/` refers to it. It is the DEV-28 evidence,
so it stays recoverable: `git checkout 603b305 -- poc/`, or Keith's repository.
Rejected: keeping it — about 2,300 lines of engine output on `main`.

**`TEST-0001` reverted on `main` before anything is translated.** The second
end-to-end run (#15, `ec49635`) put the invented GanLum WHO listing back on
`main` after #4's revert. With it there, a merged tree's `content.en.json`
carried its sentence and the dry run queued it for Google.
`i18n/translations.json` cannot be regenerated identically, so a translated fake
would outlive the revert. Reverted in `b8c8d05` the same way as #4:
`data/products.js` is byte-for-byte `history/products-2026-09-08.js`, and
`publish.yml` accepted it, with nothing to commit. Rejected: leaving it and
skipping that one string, a skip every later translation run would have to
remember.

*Correction to `b8c8d05`'s message*, which says `history/products-2026-09-29.js`
"stays, as history is append-only". It does not exist: `b1b44a4` removed it on
29 Sep, and #15's `publish.yml` run failed at its commit step, so no snapshot was
written for it. No history file holds `TEST-0001`. `data/proposals.js` (3
mentions) and `data/decisions.js` (1) still do, as the record of the tests.

## Found in passing — to settle when the merge is scoped

From a trial merge of `ee1181e` into `main` at `b8c8d05`, in a scratch clone
(not pushed):

- **Git merges it without conflicts.** The verify block on an earlier trial
  merge (against `e0c3332`) was clean: normalizers byte-identical, validator
  0 errors / 5 warnings (3 + 2), synthetic 0 / 0, preview built, no NUL bytes.
- **`content.en.json` is out of date after the merge**, so
  `translate-strings.js` and `build-locale-pages.js` refuse to run until
  `assemble-content.js` is rerun. 3 strings are added and 21 removed: 405 in all
  (228 data, 61 markup, 116 js), against 423 on the branch. The dry run then
  sends 6 per locale, 568 characters — the 3 new strings and the 3 known
  `PQ'd`/`MFT` rejects.
- **The sources footer breaks on the French and Portuguese pages.** `main`'s
  `9c6be45` moved the footer's source list out of the page into
  `data/sources.js`, rendered at runtime; those are the 21 removed strings.
  `assemble-content.js` reads only `products.js`, `resistance.js` and
  `molecular-markers.js`, and `build-locale-pages.js` copies only those into
  `dist/locale/<locale>/data/`. The locale page's `data/sources.js` is therefore
  missing and it shows "Source list unavailable — data/sources.js did not load."
  Coverage reads 97% (fr 503 translated, 17 left in English), against the
  branch's 525 / 14; the self-check passes because it checks the resistance rows
  only. The translations are still in `translations.json`, keyed by unchanged
  English, so reading `sources.js` should need nothing new sent to Google.
- **The approval check does not allow `content.en.json` in a proposal PR.**
  `proposal-decision.yml` merges only a PR whose one changed file is
  `data/products.js`. Rebuilding the content file after the merge, in
  `publish.yml`, fits that workflow's pattern (a generated file, one bot commit),
  but its path filter is `data/products.js` alone, and `content.en.json` also
  depends on `illustrated-journey-dashboard.html`, `resistance.js` and
  `molecular-markers.js`.
- **CP-4 is still open.** `approvalGate()` in `translate-strings.js` only prints
  the hash.
- **The locale pages are not deployed.** `scripts/build-public-site.sh` copies a
  fixed list of files, and `dist/locale/` is not on it.
- **Two of the three `publish.yml` runs dispatched after an approval failed** on
  29 Sep: `59c116f` (#10) and `ec49635` (#15), the latter at "Commit snapshot,
  feed and linked-data export". The failed-step log came back empty, so the
  cause is not known; `59c116f`'s step was not checked.

## Status

- `feat/translation` on `KylerXiv/launch-development-test`: Keith's `ee1181e`
  plus this commit, pushed. It now differs from Keith's branch by this commit, so
  a later pull from Keith is a merge, not a fast-forward.
- `main`: `b8c8d05` pushed 30 Sep; validate, Vercel deploy and publish all
  succeeded.
- CI on `ee1181e`: "Validate dashboard data" succeeded.
- Verify block on this commit, 30 Sep: both normalizers byte-identical;
  `validate-data.js` 0 errors / 5 warnings (3 resistance + 2 molecular markers);
  synthetic 0 / 0; `make-preview.js` 154 KB. `assemble-content.js --check` up
  to date; `build-locale-pages.js` all checks passed, fr 525 / pt 530
  translated, 14 left in English each. No NUL bytes in any changed file.
