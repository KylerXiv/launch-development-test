# RBM page releases: the RBM pages update themselves

*Jackson, 13 October 2026. Branch `feat/rbm-releases` here, `feat/launch-update` in `codebyjackson/launch-rbm-test`.*

## 1. What changed, and why

Until now the RBM pages reached `launch-rbm-test` by hand:
1. after a page change, wait for the translate bot's commit;
2. `node scripts/build-rbm-pages.js`;
3. `node scripts/copy-rbm-pages.js --to ../launch-rbm-test`;
4. commit on `update/main-<sha>`, then open a PR and merge it.

It worked, but it was easy to forget, and the RBM copy then drifts behind the
LAUNCH site without anyone noticing.

Now:

```
this repo                                         launch-rbm-test
─────────                                         ───────────────
page change merged → translate bot
→ release-rbm-pages.yml: build, compare       ──▶  launch-update.yml (daily, 07:20 UTC)
  with the last release; publish rbm-vN             new rbm-v* release? check it, copy it,
  only if the pages changed                         commit to main, record the version,
                                                    release; the push starts Pages' build
                                                    · a failed check → an issue, nothing changed
```

**Data never needs a release.** The pages read `dashboard.json` when they load.

## 2. Decisions

- **Releases, pulled by the RBM side, rather than this repo pushing there.**
  - No credential crosses between the two repositories. The release workflow
    has `contents: write` on this repo only. The robot uses its own
    `GITHUB_TOKEN` and reads this public repo's releases.
  - The same design works after `launch-rbm-test` moves to RBM, who will not
    want another organisation holding write access to their site.
  - Rejected: a push from here with a second deploy key; a PR opened from here
    with a token RBM would have to issue.
- **Auto-apply, with an issue on failure (owner's choice).**
  - The review already happened here, where the page change was merged.
  - `LAUNCH_UPDATE_MODE=pr` in `launch-rbm-test` switches the robot to opening
    a PR instead. It is there for RBM after handover.
- **Daily, not hourly (owner's choice).** "Run workflow" on the robot applies
  a release at once.
- **A release only when the pages change.** `rbm-release.js` compares the new
  build's file fingerprints with the last release's `build-manifest.json`.
  - On 13 Oct, a build of `main` (`d3256ae`) matched the pages live in
    `launch-rbm-test` (built from `6894405`) file for file.
  - So `rbm-v1` changes no page there. Its first application records the
    version and moves the manifest's `built_from` line, nothing else.
- **No release before the translate bot has caught up.**
  - The workflow checks `assemble-content.js --check` first. If the English is
    newer than the translations, it makes no release and does not fail.
  - The bot's own run starts it again (`workflow_run`), so new text never
    reaches RBM in English.
- **The robot runs the same checks as the hand copy, from the same code.**
  - `copy-rbm-pages.js` used to need `build-rbm-pages.js` for the manifest
    helpers. Those helpers moved, unchanged, to `scripts/rbm-manifest.js`,
    which needs nothing but Node.
  - Each release ships `copy-rbm-pages.js` and `rbm-manifest.js`.
  - The robot refuses, exactly as the hand copy does, when:
    - a page there was edited by hand;
    - a file does not match the manifest;
    - the release is a test build, built from uncommitted files, or built
      before the translations caught up.
  - Checked: a build after the move is identical to one before it. On a
    throwaway clone of `launch-rbm-test`, the shipped pair applied `rbm-v1`
    with only the manifest line changing, and refused a hand-edited
    `en/index.html`, naming the commit.
- **What starts a release.**
  - The translate bot's run, which covers the page, the feedback form, the
    site nav, the data text and `build-rbm-pages.js`.
  - A push touching what the bot does not watch: `rbm-skin.js`,
    `rbm-manifest.js`, `build-locale-pages.js`, `assets/`, the map files,
    `translations.json` (hand corrections) and `country-names.json`.
  - Running it by hand.
  - Starting it too often is harmless: an unchanged build makes no release.
- **The Vercel copy of the test repo is retired** (owner's decision, 13 Oct).
  `https://launch-rbm-test.vercel.app` is out of `PARTNERS` in `api/_mail.js`
  and out of `rbm/README.md`. GitHub Pages is its only host.
  - The office network blocks `codebyjackson.github.io`, so the live test pages
    are checked from another network or locally.

## 3. Deferred, and found in passing

- **Hand copying still works** (`copy-rbm-pages.js --to`) as a fallback. The
  next release replaces whatever it copied, and the robot sees no drift as
  long as the copy came from a clean build.
- **No timeout on the new workflows**, the same as the others here (owner's
  decision on 13 Oct to set limits from a month of real runs).
- **GitHub Pages builds on the robot's push by itself** (found on `rbm-v1`).
  The robot first also asked for a build (`POST /pages/builds`). That started
  a second build, which cancelled the first and left "errored" entries in the
  Pages build list, though the robot's commit deployed. The request and
  `pages: write` were dropped (launch-rbm-test #15).
- **The office network** blocks `codebyjackson.github.io`, so the first live
  check of the pages after an update is made from another network.

## 4. Status

| | |
| --- | --- |
| This repo | Merged as #93 (`390fbe0`): `release-rbm-pages.yml`, `rbm-release.js` and its test (17 checks, in `validate.yml`), `rbm-manifest.js` (moved helpers), `PARTNERS` without the Vercel copy, `rbm/README.md` "How updates arrive", developer guide §8 |
| launch-rbm-test | Merged as #14 (`launch-update.yml`, README "Live version" line and "How updates arrive", no Vercel host) and #15 (no extra Pages build request). Repo website link set to GitHub Pages |
| Tests | `test-rbm-release` 17/0, `test-copy-rbm-pages` 20/0, `test-build-rbm-pages` 33/0, `test-mail-api` 194/0, `test-source-watchers` 61/0, `test-dataset-diff` 11/0, `test-notify-subscribers` 67/0; verify block 0 errors and 1 warning, synthetic 0/0, dataset 30/0, country names 252, normalizer identical |

## 5. The first live run, 13 Oct 2026

1. **The merge of #93 published `rbm-v1` by itself.** It was started by the push
   trigger, because `scripts/rbm-manifest.js` changed, and holds 38 files.
   The run that followed the translate bot found the pages unchanged and made
   no second release ("the pages are the same as rbm-v1").
2. **The robot applied `rbm-v1`** (run by hand, on `main`). Commit `db7e4e4`
   by `github-actions[bot]` touched only `build-manifest.json` (its
   `built_from` line), `launch-release.json` (new) and the README's "Live
   version" line. It also made release `rbm-v1` in launch-rbm-test. GitHub
   Pages deployed `db7e4e4`.
3. **Run again, the robot did nothing:** "Up to date: rbm-v1 is live", no
   commit.
4. **Refusal.** On a throwaway branch, `en/index.html` was edited by hand and
   `launch-release.json` set to an older tag. The robot (a dry run, off
   `main`) refused at "Check it, and copy it in", named the file and the
   commit, changed nothing, and opened issue #16. The issue was then closed
   and the branch deleted.

Not yet seen live: a release with real page changes. The first page change
merged here goes through the whole chain.

## 6. Handover to RBM (13 Oct 2026)

**Decided:** RBM shows the `/en` `/fr` `/pt` (and later `/es`) pages in iframes
on its own website. `iframe-test.html`, `rbm-shell/` and the test start page
`index.html` are not handed over. The pages keep reading the data from the
public data repository.

**Decided later the same day:** RBM receives **a copy of the files only**
(`en/ fr/ pt/ es/ assets/`), not the repository. The release workflow and the
robot are for the development stage: they keep the test copy up to date and
do not run at RBM, and `launch-update.yml` will be removed from
`launch-rbm-test` before handover. How page changes reach RBM after handover
is not decided yet, so the documents do not describe it.

**To do before RBM goes live:**
- Add RBM's website address to `PARTNERS` in `api/_mail.js` (not known yet).
- The forms still post to this project's Vercel production address. That
  address goes with this project's hosting when it moves, and the pages must
  then be rebuilt.
