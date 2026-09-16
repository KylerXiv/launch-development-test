# Handoff — data editor (branch `data-editor`)

Working notes for the browser-based data editor. This is the branch's own
document, per [CLAUDE.md](../CLAUDE.md); `redesigning-illustrative-journey`
keeps [illustrated-journey-ui-notes.md](illustrated-journey-ui-notes.md).

Two reference documents sit alongside this one:
[editor-build-spec.pdf](editor-build-spec.pdf) (the technical spec) and
[editor-setup-requirements.pdf](editor-setup-requirements.pdf) (accounts,
plan, and the phased setup).

---

## 1. Decisions

### A static page in this repo, not a Next.js or Python app

The dashboard hands over to RBM as a single artefact. A Next.js admin app or
the existing `streamlit-app/` editor both need a server process, which means a
second deployment, a second account, and a second thing for RBM to own — the
split we are trying to avoid.

Checked RBM's own site while deciding. `dashboards.endmalaria.org` runs
**Next.js on AWS Elastic Beanstalk** (eu-west-1), behind nginx, in en/fr/pt.
So matching their framework buys nothing: it is their app, on their
infrastructure, and we cannot deploy into it. Their site already embeds
outside dashboards in iframes — the **WHO Malaria Threats Map** is on it today,
the same WHO source `data/resistance.js` is drawn from. That is the route in,
and it needs no framework match.

Rejected, and why:

| Option | Rejected because |
|---|---|
| Next.js admin app | Needs a running server; breaks the single-artefact handover; cannot deploy into RBM's app anyway |
| Keep the Streamlit editor | Works, but needs a Python host. Stays as the internal analyst workbench, not the handover artefact |
| Edit on GitHub directly | Free, but the analyst edits code-shaped text. One stray comma breaks it |
| Google Sheet + importer | Familiar, but accepts anything — no source, no date rules. The dashboard's value is that every figure is traceable |

### The rules split in two, not one function

`checkData(data)` is pure and runs in the browser. `checkStudyLayers(sources)`
takes already-read file *contents* and is called only by the CLI.

This is forced by what the rules actually do, not by preference. **All 5
warnings come from the WHO layer checks**, which read three other files
(`world-map.js`, `resistance.js`, `molecular-markers.js`) and evaluate them.
The browser has none of those and never will — the editor must not touch those
files at all. Splitting on that line keeps both halves pure and keeps the
editor's half genuinely runnable in a page.

Confirmed empirically: browser-side `checkData` on the real data returns
**0 errors, 0 warnings**, while the CLI returns **0 errors, 5 warnings**. The
difference is exactly the WHO layers, as expected.

### The serializer inlines flat scalar arrays; the Python original does not

The round-trip test failed first time on `stageColumns` rows: the file has
`{ "stages": [2, 3] }` on one line, the port expanded it to four lines.

Per CLAUDE.md, established which was wrong before changing either. Ran the
Python serializer against the same file:

```
Python serializer round-trips byte-identical: False
  line 44  file  : '    { "stages": [0] },'
           python: '    {'
  line count: 345 -> 374
```

So the port was faithful and **both disagreed with the file**. The file is the
source of truth, so the JS rule was extended: an object also prints on one line
when its values are scalars *or flat arrays of scalars*. Arrays outside an
inlined object keep their existing multi-line form, so the top-level `stages`
array is untouched.

### Normalised one escaped em-dash in `data/products.js`

After the fix, one difference remained: a single `—` in a changelog
`plain` field, against **87 raw em-dashes** elsewhere in the same file. Both
parse to the identical string, so no serializer can preserve the distinction —
whichever form it emits, one of them changes.

Normalised the outlier to the raw character. Semantically a no-op for every
consumer (validator, page, ontology exports all `JSON.parse` it). Checked
first that `history/products-2026-09-08.js` does not exist, so `publish.yml`'s
append-only guard cannot trip on it. Without this, the editor's first real save
would have produced the same one-character diff anyway.

---

## 2. Found in passing, deliberately left alone

**`streamlit-app/launch_data.py` reformats `stageColumns` on save.** Same root
cause as above: its `_fmt()` does not treat a flat scalar array as inline-able,
so the first save through the Streamlit editor rewrites `data/products.js` from
345 to 374 lines — a whole-file diff for a one-field edit.

Not fixed here. It is a live bug in a tool that is still in use, but fixing it
belongs with the Streamlit app rather than inside the editor branch, and the
one-line change (`_SCALARS` check → allow `list` of scalars) should be made
with its own round-trip test. **Worth doing before anyone edits data through
Streamlit again.**

**`.DS_Store` files are untracked and not ignored** — `.DS_Store` and
`data/.DS_Store` show in `git status`. One line in `.gitignore` would settle
it. Left alone as out of scope.

---

## 3. Status

**Branch:** `data-editor`, off `redesigning-illustrative-journey`.
**Pushed:** no. **CI:** not yet run — verified locally.

### Done

- [x] **Item 1 — shared rules module.** `scripts/data-rules.js`:
      `extractData`, `checkData`, `checkStudyLayers`, loadable from Node and
      the browser. `scripts/validate-data.js` reduced to a CLI wrapper
      (406 → 66 lines), behaviour unchanged.
- [x] **Item 2 — house-style serializer.** `scripts/serialize-products.js`,
      ported from `streamlit-app/launch_data.py`, plus
      `scripts/test-serializer.js` which round-trips both datasets.

### Verify block — all passing

```
node scripts/normalize-resistance.js          byte-identical
node scripts/normalize-molecular-markers.js   byte-identical
node scripts/validate-data.js                 0 errors, 5 warnings  (3 resistance + 2 molecular markers)
node scripts/validate-data.js data/products.synthetic.js   0 errors, 0 warnings
node scripts/make-preview.js                  Wrote preview.html (154 KB)
node scripts/test-serializer.js               0 failures (both files byte-identical)
```

NUL bytes: 0 in every touched file, counted in Python. Line endings: LF.

### Files touched

| File | Change |
|---|---|
| `scripts/data-rules.js` | **new** — the rules, as pure functions |
| `scripts/serialize-products.js` | **new** — house-style writer |
| `scripts/test-serializer.js` | **new** — round-trip test |
| `scripts/validate-data.js` | rewritten as a thin CLI wrapper |
| `data/products.js` | one escaped em-dash normalised (see §1) |
| `docs/editor-build-spec.pdf` | **new** — build spec |
| `docs/editor-setup-requirements.pdf` | **new** — accounts, plan, setup phases |

---

## 4. Still to do

### Next up — item 3, the editor page

`editor.html`, as a plain page with no build step. The functional spec already
exists: `streamlit-app/edit_tab.py` (402 lines) has worked out every field,
grid and save gate. Rebuild the packaging, not the thinking.

Suggested first slice, to get something reviewable early: load the data, render
it read-only, run `checkData` live, show findings. No saving. The form layout
is where taste decisions start, so it is worth looking at before building it
all.

### Then

| # | Item | Notes |
|---|---|---|
| 4 | In-page preview | `illustrated-journey-dashboard.html` in an iframe from a blob URL, draft data substituted. Not a per-branch deploy — that would couple us to a host, and hosting is RBM's decision |
| 5 | GitHub integration | Read, branch, commit, open a draft. **Target a scratch branch and do not wire publish** until branch protection exists |
| 6 | Sign-in | Pasted fine-grained token for now. See the open question below |
| 7 | Repo configuration | Needs GitHub Pro — see below |
| 8 | Analyst guide | Extend `docs/data-analyst-guide.md`. Same commit as the code it describes |

### Blocked on GitHub Pro — $4/month

Branch protection is **not available on the current plan**. GitHub says so
directly:

```
Upgrade to GitHub Pro or make this repository public to enable this feature.
```

This matters more than it looks. Token permissions are repository-wide — there
is no way to scope a token to "can write files but not to `main`". Branch
protection is therefore the *only* thing enforcing "the editor can only
propose". Until it exists, that property is a convention our code follows, not
something GitHub prevents.

So: **item 5 can be built, but the publish button must not be wired until Pro
is on and `main` requires the `validate` check.**

Also note the repo is owned by `Keith-paradox`, and the account in use here
(`KylerXiv`) has push but **not admin**. Plan changes, branch rules and the
eventual transfer all have to be done from the owner account.

### Open questions for RBM

None block items 3–5.

| Question | What it affects |
|---|---|
| Can their staff have GitHub accounts? | If not: work-email sign-in with a shared machine account — weaker attribution, more to build |
| Will their site embed our page, or copy the files? | Whether publishing stays automatic after handover |
| Who owns the repo and hosting afterwards? | Where the GitHub App and hosting get created — cheaper to get right first time |
| Is endmalaria.org in-house or contractor-run? | Who we are actually handing over to |

### One thing to verify at Phase 2

`publish.yml` is path-filtered on `data/products.js` and its append-only guard
fails the run if `meta.lastUpdated` was not bumped. The editor always bumps it,
but confirm the whole loop end to end when the change arrives **by merge**
rather than by direct push — that path has not been exercised.
