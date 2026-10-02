# Language menu on the illustrated journey — working notes

Branch `feat/language-switcher`, 2 Oct 2026. Per [CLAUDE.md](../CLAUDE.md), this
document is updated in the same commit as any change it describes.

The illustrated journey page already had a language menu: English, Français,
Português, at the right of the site menu (`assets/site-nav.js`, from Keith's
merge). French and Portuguese said "coming soon", because `LANGS` in that file
marks them `live: false`, to be turned on "once those folders are deployed".
They have been deployed since the translation work (`/fr/` and `/pt/` on the
Vercel site return 200). This branch makes the two entries real links.

## 1. Decisions

### Switched on by the build, not in the menu's source

`scripts/build-public-site.sh` now prepends one line to every copy of
`site-nav.js` in its output: the English page's (`public-site/assets/`) and each
locale's own (`public-site/fr/assets/`, `public-site/pt/assets/`):

```js
window.LAUNCH_LOCALES_LIVE = window.LAUNCH_LOCALES_LIVE || { fr: true, pt: true };
```

This is the run-time setting the menu already documented and reads. The list
comes from the same `LOCALES` variable as the loop that copies the folders, so
a language that is built is switched on, and only then.

Rejected:

- **Flipping `live: true` in `LANGS`.** The `fr/` and `pt/` folders exist only
  in a build (`dist/locale/` → `public-site/`). Anywhere the repo is served
  as it is, a local `http.server` from the root or Keith's GitHub Pages if
  his repo ever takes this, both entries would link to a 404.
- **Checking each target at run time** (a HEAD request per language on every
  page view). It works on any host, but it adds two requests per visit, and the
  menu would change after load. The build already knows what it wrote.

### Nothing else changed in the menu

The link logic was already right: from English it links `fr/…` and `pt/…`; from
a locale it links `../…` and `../<other>/…`; the current language is marked.
It was only ever untested because the entries were off.

## 2. Verification

| Check | Result |
| --- | --- |
| `build-public-site.sh` | the three built `site-nav.js` copies start with the line above; the source file is unchanged; `node --check` passes on the built copy |
| Chrome, real time over CDP, built site (`public-site/` on a local server) | from each of English, French and Portuguese, both other entries are links; clicking each of the **6** lands on HTTP 200 with the right `<html lang>` (`en`, `fr`, `pt-PT`) and the button showing that language; the current one is ticked; no exceptions |
| Same, repo root served as it is (no build) | French and Portuguese still show "coming soon" |

## 3. Deferred, and found on the way (left alone)

- **The menu's own words stay English on `/fr` and `/pt`**: the view names
  ("Illustrated journey", "Pipeline", "Story"), "Views:" and the button's
  "Language:" label for screen readers. `site-nav.js` is not read by
  `assemble-content.js`, so none of it is translated. The language names are
  already in their own language.
- **From `/fr` or `/pt`, the Pipeline and Story links go to the English
  pages.** Those pages have no translations; `site-nav.js` sends them up a
  folder on purpose.
- **Switching does not keep the reader's place.** A reader at `#sources` lands
  at the top of the other language's page. Carrying `location.hash` across is
  a small change, if wanted.
- **No `hreflang` alternates in the pages' `<head>`**, so search engines are
  not told the three pages are translations of each other.
- **The RBM pages are unaffected.** `build-rbm-pages.js` removes the site menu
  and RBM's platform switches language with its own `/en`, `/fr`, `/pt` routes.

## 4. Status

| | |
| --- | --- |
| Branch | `feat/language-switcher`, from `main` at `56ecf13` |
| Files | `scripts/build-public-site.sh`, `assets/site-nav.js` (header comment only), this document |
| Commits | 1, pushed with its pull request; merged once the Vercel preview passed the same six-link check |
| Verify block | normalize byte-identical; validator 0 errors / 1 warning; synthetic 0 / 0; preview ok; dataset 28 passed; RBM pages 10 passed |
