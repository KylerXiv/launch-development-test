# Phone, iPhone Safari and tablet fixes for the pathway strip, and "Country Access"

*Jackson (Oakkar-Min), with Claude Code, 9–10 Oct 2026. Everything here is
merged and live: launch-development-test #86 and #87, launch-rbm-test #8 to
#11. The data repo did not change.*

**In one paragraph.** On phones the clock tag under the WHO pair ran out of
its column and past the Market Access card. Seven step names split inside a
word across the four languages. The owner also asked for "Country /
Population Access" to become "Country Access". Checking those live turned up
two older overflows: on phones the step panel's head ran off screen, and on
narrow tablets the medicines table cut off its last column. Then the owner's
iPhone showed the pathway cards cutting off their last step, which Chrome
never did. All six are fixed with CSS, apart from the rename, which is one
string that the translate bot translated. Every fix was measured before and
after in headless Chrome, and the iPhone one in Playwright's WebKit too.

---

## 1. What changed, and where

All the changes are in `illustrated-journey-dashboard.html`. The RBM pages
are built from it.

| # | Change | Commit | Merged in |
| --- | --- | --- | --- |
| 1 | The expected-time tag wraps on phones | `d5a9819` | dev #86 (Kyler, 9 Oct) |
| 2 | Step names break only between words on phones | `14a2c84` | dev #86 |
| 3 | "Country / Population Access" → "Country Access" | `cc8a5ab` | dev #86; bot `9f6aaaf` |
| 4 | The step panel's head wraps on phones | `892795f` | dev #87 (owner, 10 Oct) |
| 5 | The medicines table fits at 681–860px | `892795f` | dev #87 |
| 6 | Pathway cards stop cutting off the last step in Safari | `2a9a0bf` | dev #87; bot `f240d4e` (line numbers only) |

| launch-rbm-test | Built from | What it brought |
| --- | --- | --- |
| #8 `27c2d6a` | `14a2c84` (branch) | 1 and 2 |
| #9 `bd9f48e` | `9f6aaaf` (main) | 3, translated |
| #10 `a4cc989` | `2a9a0bf` (branch) | 4, 5 and 6 |
| #11 `1391f62` | `f240d4e` (main) | Nothing new: the same pages, so the manifest now names a main commit |

Notes kept elsewhere:
- Changes 1 to 3: [yardstick.md](yardstick.md), "Follow-up: expected-time
  tag on phones".
- Changes 4 to 6: [illustrated-journey-ui-notes.md §3.41](../illustrated-journey-ui-notes.md).

This file is the whole story in one place.

## 2. Decisions, and what was rejected

The owner chose each fix from an options page with real screenshots: 4
options for the tag, then 2 that worked for the step names. All numbers are
from headless Chrome at 390px unless noted.

**1. Tag.** The WHO pair's column is 66px wide inside its bracket (84px
minimum, less padding and borders). The tag could not shrink below 112px,
because a flex item does not go narrower than its longest word. So the tag
ran 18px past the column and 4px past the card in English, and 9px past the
column in French.

Chosen (option B): the tag may wrap, so "expected" drops under the clock and
the number. After the fix, the WHO tags sit 9px inside their column.

Rejected:
- (A) Also sizing columns to their words. It came later as change 2.
- (C) Hiding "expected" on phones. It changes markup that
  `i18n/reviewed-strings.json` matches, and readers lose the word.
- (D) A vertical list. It is a new layout, about 650px tall.

**2. Step names.** Seven words split, the same at 360px and 390px:

| Language | Split words |
| --- | --- |
| en | recommendation, Procurement |
| fr | Recommandation, Enregistrement |
| pt | Recomendação |
| es | Recomendación, Adquisiciones |

Chosen: names break only between words, and each column is at least as wide
as its longest word (`min-width: min-content`). After the fix: 0 splits. The
strip is the same width as before (742 / 785 / 735 / 744px) and the English
strip is 30px shorter.

Rejected, each measured:

| Option | What happened |
| --- | --- |
| A wider WHO column only (124px) | The split moved to Procurement, développement, regulamentar and Investigación |
| 11px names with a slimmer bracket | Still split in en, fr and es |
| Shorter WHO names | Same as the wider column, plus a data and schema change |
| Stacking the two cards | Clean at 390px, but at 360px "In-country" split and the French card overflowed by 10px |
| A vertical list | Works, but about 655px tall against 330–360px |

**3. Rename.** This is the owner's wording, with the same casing as "Market
Access". The existing lower-case "Country access" (the map) is a different
string, so it was not reused. `i18n/` was left to the bot. It translated the
new string as fr "Accès au pays", pt "Acesso ao país" and es "Acceso al
país".

**4. Step panel.** The head was one row that never wrapped: icon, title,
chips, Close. On /fr, steps 1, 2, 3 and 5 pushed the page to 393, 417, 446 and
427px on a 390px phone, with Close up to 56px off screen. In English, step 3
did (418px).

Fixed below 640px: icon, title and Close share the first row, and the chips
get their own row under the title.

**5. Medicines table.** From 681px to 1040px the five columns had fixed
minimums. With the gaps they add up to about 714px, more than the board has
until about 800px. So the board's hidden overflow cut off the main barrier:

| Width | Cut off |
| --- | --- |
| 700px | 60px |
| 720px | 40px |
| 740px | 20px |
| 761px | 32px |
| 780px | 14px |

Fixed at 681–860px: the text columns may shrink (`minmax(0, …)`), weighted
1.2 / 1.1 / 1, and the gaps are 12px. The first try kept the old weights
(1.4 / 1 / 1). At 681px it let "Adopción de políticas nacionales" run 8px
past its column.

Rejected:
- Moving the stacked phone layout up to about 800px: tablets would lose the
  table.
- A sideways-scrolling board: it hides the barrier.

**6. Safari.** See §3.

## 3. The iPhone finding

After #86 and rbm-test #9 went live, the owner's iPhone still showed the end
of each card cut off, on both sites: "WHO recommendatio(n)" and its bracket,
and "In-country delivery" with its tag. Chrome never showed it, at any
width. Playwright's WebKit with an iPhone 13 profile does:

| Page | Card 1 | Card 2 |
| --- | --- | --- |
| LAUNCH en | 16px cut | 20px cut |
| LAUNCH fr | 0 | 23px cut |
| RBM en | 18px cut | 25px cut |
| RBM fr | 0 | 29px cut |

**Cause.** A card has `min-width: min-content`. To size it, WebKit adds up
its steps' min-content widths and leaves out their 72px flex-basis, which
came from change 2. A step with short words ("R&D & clinical", "Country
registration") is laid out at 72px but counted narrower. The card comes out
too narrow, and its `overflow: hidden` cuts off the end.

**Fix.** The step label is at least 72px wide (`min-width: 72px`,
border-box). A step's min-content is then never below its basis, so both
engines agree.

After the fix:
- WebKit: nothing cut off, LAUNCH and RBM, en/fr/pt/es.
- Chrome: unchanged, with the same strip widths.

**For next time.** When a phone report doesn't reproduce in Chrome, check it
in WebKit before saying it's fixed.

## 4. How it was tested

**Chrome.** Chrome was driven over its DevTools protocol, with phone
emulation at 360px and 390px. Headless Chrome on its own will not go below
500px.

The scripts measured:
- every tag and label against its column and card;
- every word against the space its label has (split words);
- 25 open states per page: the page as loaded, each of the 8 step panels,
  each medicine row in each of its 3 views, and More detail. Each state was
  checked for anything past the screen, or cut off by a box with hidden
  overflow;
- the medicines table, swept from 641px to 1200px.

**WebKit.** The Playwright driver is already on this PC at
`%LOCALAPPDATA%/ms-playwright-go/1.50.1/package` (playwright-core 1.50.1, with
its own `node.exe`). No browser comes with it. Install one with:

```bash
PLAYWRIGHT_BROWSERS_PATH=<some folder> node <that>/package/cli.js install webkit
```

Then `require(<that>/package).webkit` with `devices["iPhone 13"]`.

The same API drives the installed Chrome:

```js
chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" })
```

**This network blocks GitHub Pages.** The office network's security policy
blocks `codebyjackson.github.io` and shows a "Web Page Blocked" page. Since
10 Oct this applies to Playwright, headless Chrome and `curl` alike, so the
RBM pages could not load their `dashboard.json` there. The workaround is to
serve those requests from the local repos with `page.route`:
- launch-rbm-test at a git ref, or its working tree;
- launch-data-test's `v1/dashboard.json`.

To see what Pages is actually serving, ask GitHub:

```bash
gh api repos/codebyjackson/launch-rbm-test/pages/builds/latest
```

The Vercel hosts are not blocked.

**A WebKit quirk.** Playwright's iPhone profile reports `innerWidth` as 325
while the page is laid out at about 391px. Compare against the layout width,
not `innerWidth`.

## 5. How it was released

1. The dev branch goes up as a PR. Kyler or the owner merges it.
2. If the change has new text, the translate bot commits by itself.
3. Pull main. Run `node scripts/build-rbm-pages.js`, then
   `node scripts/copy-rbm-pages.js --to ../launch-rbm-test`.
4. Commit in launch-rbm-test on a branch, open a PR and merge it.
5. Check the live pages.

**The copy step is not optional.** On 9 Oct the owner ran step 3's build but
not the copy, so RBM kept the old group name until the copy and commit were
done (rbm-test #9).

**The guard decides when RBM can go early.** `copy-rbm-pages.js` refuses a
build made from uncommitted files, or one whose translations are behind.
- A CSS-only change (fixes 1, 2, 4, 5 and 6) builds cleanly from its branch
  commit. So RBM got those before the dev merge (#8, #10).
- The rename had to wait for the bot (#9).

**Never rebuild RBM from an older main** once RBM is ahead of it, or the
rebuild wipes those fixes. After #87 merged, a rebuild from main produced
byte-identical pages (#11).

## 6. Undo

The data repo has nothing to undo.

To undo the page changes:
1. Revert the merge commit on dev main (#86 `0d80a7c`, #87 `b8ff431`).
2. Let the bot run, if the rename was reverted.
3. Rebuild and copy RBM as in §5.

To undo one change only, delete its CSS block. Each has a dated comment:
- the tag, the step names and the Safari line: around lines 182 and
  1362–1385;
- the step panel: after `.gw-sum`;
- the table: after the 680px block.

## 7. Found in passing, left alone

- The French tag reads "2 années attendu" (it should agree: "attendues"), and
  "1.5" keeps the decimal point on /fr. Translations come from the bot only.
- Both pathway cards keep a band of empty space above their icons. That is
  the WHO pair's lift (`--pg-lift`), applied to every card. It is not a bug,
  but it is visible on phones.
- Git Bash's `sed -i` rewrites a CRLF file as LF. Use Python for in-place
  edits here.

## 8. Checks (10 Oct 2026, after #87 and rbm-test #11)

- Kyler's site serves all six changes in en/fr/pt/es.
- RBM: GitHub Pages built `1391f62`, and the Vercel copy serves it.
- WebKit, iPhone 13, on Kyler's live site:
  - en/fr/pt/es: nothing cut off on either card;
  - all 8 step panels inside the screen;
  - the table is not cut off (also on iPad Mini).
- Chrome (last run before the merge, on the same code):
  - en/fr/pt/es at 360px and 390px: 0 split words, all 25 states clean;
  - the table from 641px to 1200px: nothing cut off.
- Verify block on the final branch: validator 0 errors / 1 warning;
  synthetic 0 / 0; dataset 30 / 0; RBM pages 31 / 0; country names cover all
  252; treatment policy byte-identical.
- The owner checked both sites on desktop and on the iPhone: all good.
