# The RBM pages wear Unitaid's brand

*19 October 2026. Branch `feedback/unitaid-brand-rbm`.*

## 1. What was asked

Feedback sheet, "Oct 15 Feedback Emails", row "Brand & Visual Identity /
Unitaid Brand Integration", requested by Unitaid's Comms team:

> Incorporate key elements from Unitaid's brand guidelines (official
> typography, brand colors, and visual hierarchy) rather than maintaining RBM
> branding throughout, ensuring clear recognition as a Unitaid product.

The owner's instruction (19 Oct): put Unitaid's design on the pages RBM hosts
(the copy in `codebyjackson/launch-rbm-test`), and keep the text and layout
exactly as they are.

Until now the RBM pages wore RBM's own look on purpose (`scripts/rbm-skin.js`,
from the RBM Dashboard Design Guidelines v1.0, 7 Oct 2026). This replaces that
look. The LAUNCH site keeps its own look.

## 2. Decisions

- **The skin changes, not the page.**
  - `scripts/rbm-skin.js` keeps its job: a stylesheet laid over the page at
    build time that redefines the colour tokens and restyles a few components.
    Its content is now Unitaid's brand.
  - So text and layout cannot move. `illustrated-journey-dashboard.html` is
    untouched, and so is every change other branches make to it.
  - The file keeps its name. It is still the RBM pages' skin, and
    `release-rbm-pages.yml` watches it by name.
  - Rejected: editing the built pages in `launch-rbm-test` by hand. The next
    copy would refuse to run, and the change would never reach a rebuild.
- **Source: brandpad.io/unitaid** (Colour, Typography, Logo; read 19 Oct 2026).
  These are the same values `scripts/build-unitaid-theme.js` has used since
  August:
  - primary: Navy `#212E92`, Blue `#0066FF`, Red `#CC0033`, white;
  - supporting: Grey `#E6EAEE`, Green `#00C77D`, Sky Blue `#75D8F7`, Orange
    `#FF451A` and others;
  - official tints at 60%, 30% and 15%; Black for body text only;
  - Source Sans 3 is the web font: Bold for headlines, Light for body.
- **Where each colour goes.**
  - Navy is the ink: text, headings, tooltips, step badges. It reaches 11.2:1
    on white and 9.3:1 on the grey heads.
  - Blue is every action and active state.
  - Red marks Delayed.
  - The canvas is Unitaid Grey at its official 60% tint (`#F0F2F5`). White cards
    stand off it at 1.12:1, the same as the RBM look (1.12) and the LAUNCH site
    (1.13).
  - Table and panel heads are Unitaid Grey with navy-grey labels.
  - Lines are navy at 15%; the dashed "expected" pills are navy at 60%.
- **Unitaid Blue is never text on a tint.**
  - `#0066FF` reaches 4.83:1 on white and falls under 4.5:1 on every tint we
    use: 4.31 on the canvas, 4.33 on the light blue, 4.00 on the grey heads.
  - So `--surface-2` is `#F7F8FA`, the darkest grey that keeps blue links at
    4.5:1 or above (4.55). `#F5F6F8` gave 4.47.
  - Download CSV, blue text sitting on the canvas, gets a white fill.
  - "More detail" in an expanded row sits on the light blue, so its text is
    navy. A browser audit found it at 4.33:1.
  - Hovers that would put blue text on a tint use navy text instead.
  - Rejected: a darker, unofficial blue for text. Navy is a primary colour and
    passes everywhere.
- **Done, In progress, Delayed keep their traffic-light meaning.**
  - Delayed is Unitaid Red, at 5.8:1 on white.
  - Done is Unitaid Green's hue darkened to `#00804F`. Unitaid Green itself
    gives the white tick on the dot 2.2:1; `#00804F` gives 5.0:1. The RBM look
    gave 3.77:1.
  - In progress keeps the LAUNCH site's amber (`#B87500`). Rejected: Unitaid
    Orange. Next to Unitaid Red, in the same row of dots, it reads as a second
    red, and the brand advises against Blue with Orange. Unitaid has no amber.
    The white arrow on it is 3.76:1: the LAUNCH site's own value, better than
    the RBM look's 3.19, still under 4.5. Left as on the LAUNCH site.
- **Typography: Source Sans 3 at Regular (400), not Light.**
  - The brand says Light for body copy. This page's body text is 11–15px labels
    and table cells, where Light is too thin to read on screen.
  - Headings use the brand's Bold (700), in navy.
  - The font loads as one variable file (weights 400–800), so the page's 650
    and 750 weights render as written.
- **Kept as they were.**
  - The country access map and its legend: LAUNCH's colours, as in the RBM
    look. The brand has no ramp for a map of stages, and the same map then reads
    the same on every copy.
  - The journey icons: WHO's blue, which the page ties to the WHO emblem that
    cannot be recoloured.
  - Corners and shadows: as in the RBM look. The brand says nothing about them,
    and keeping them means nothing moves.
  - The "recommended use" orange and brown: data colours.
- **"Treatments procured" bar:** Navy, Blue, Blue 60%, Sky Blue. These are full
  colours or 60% tints only; the brand advises against lighter tints for data.

## 3. Checked (19 Oct 2026, on a local build of `783f6d9` plus this branch)

- **Before this change**, a build of `main` was identical, file for file, to
  `launch-rbm-test` (built from `63d8955`). So the skin is the only change those
  pages will see.
- **Contrast audit in Chrome.** Every visible text node was checked against its
  painted background: on first view, with three medicine rows expanded, and
  with Subscribe open.
  - Unitaid build: one kind of text under 4.5:1, the amber In-progress arrow
    (above).
  - RBM build: two kinds, the green tick (3.77:1, 6 dots) and the amber arrow
    (3.19:1).
- **No sideways overflow** in en/fr/pt/es at 360, 390, 768 and 1280px. Pages are
  slightly shorter, because Source Sans 3 is narrower than Roboto.
- **The map draws the same colours** in both builds.
- **Inside the iframe mock** (`iframe-test.html`): screenshots before and after,
  same layout.
- **Not checked:** a real iPhone or Safari; RBM's real platform.

## 4. Deferred, and found in passing

- **The "Powered by" logo is the version with the tagline, at 112px wide.**
  - The brand says that at 180px wide or less, the version without the tagline
    should be used.
  - The repo has no such file; it would need the asset from brandpad.
  - Left as it is: it changes the page, and the LAUNCH site shows the same logo.
- **The mock's hero.** The screenshot that came with the feedback shows a Unitaid
  banner (logo and title on Unitaid Blue) above the embedded page.
  `iframe-test.html` in `launch-rbm-test` still shows RBM's photo hero.
  - That banner belongs to whoever hosts the page (RBM's platform), not to these
    pages.
  - The mock is not changed here. Whether the mock should show it is the
    owner's call.
- **The French page shows "R&D and Clinical" and "Stringent Regulatory Approval
  (SRA)" in English.** These are stage names from `dashboard.json`, unrelated to
  the look. The translate key has been dead since 13 Oct (see the feedback-sheet
  notes).

## 5. Status

- Branch `feedback/unitaid-brand-rbm`, from `main` at `783f6d9`.
- Files: `scripts/rbm-skin.js`, `scripts/test-build-rbm-pages.js` (34/0; the
  checks for RBM Blue, Roboto/Poppins and the RBM bar colours became checks for
  the Unitaid equivalents, plus one that nothing of the RBM look is left),
  `scripts/build-rbm-pages.js` (comments), `rbm/README.md` (the look
  paragraph), this file.
- After the merge: rebuild with `build-rbm-pages.js`, copy with
  `copy-rbm-pages.js --to <launch-rbm-test checkout>`, and copy the README's
  look paragraph into `launch-rbm-test`'s README by hand.
