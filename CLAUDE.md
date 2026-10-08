# Working in this repo

Start with [docs/developer-guide.md](docs/developer-guide.md) for the
architecture and the governance rules. This file covers only what is easy to
get wrong when working task by task.

## Documentation is part of the task, not a follow-up

Every task that changes a feature branch also updates that branch's
working-notes document in `docs/`, **in the same commit as the change it
describes**. A separate "update the docs" commit is a promise to forget.

DEV-13's own handover document was deliberately removed once the work landed,
so that branch has none; the rule above still governs any new feature branch,
which starts its own.

What goes in it, in order of how expensive it is to reconstruct later:

1. **Decisions, with the alternatives that were rejected and the numbers
   behind the choice.** This is the part that cannot be read back out of the
   code. "Chose patient-weighted averaging" is not a record; "unweighted let 53
   of 277 country values be decided by studies under 20 patients — Sudan read
   33.3% off 6 patients" is.
2. Deferred, descoped, or newly discovered work — including bugs found in
   passing and deliberately left alone.
3. Status: branch, commit count, push state, CI result, files touched.

If a task changes nothing a reader of that document would care about, say so
explicitly rather than skipping the update silently.

## Before committing

Run the verify block. Generated data files are regenerated and expected to come
back **byte-identical**; the validator is expected to report a **specific**
error/warning count, not merely to exit cleanly.

```bash
node scripts/normalize-treatment-policy.js    # regenerate; expect byte-identical
node scripts/validate-data.js                 # expect 0 errors, 1 warning
node scripts/validate-data.js data/products.synthetic.js   # expect 0 errors, 0 warnings
node scripts/make-preview.js                  # smoke test
node scripts/test-build-dataset.js            # RBM dashboard.json: expect 0 failed
node scripts/build-country-names.js --check   # /fr, /pt, /es country names: expect "covers all"
```

The 1 warning is `treatment policy:` (French Guiana lists a dashboard product
but is not drawn on the basemap). Anything else means something moved. (It
was 6 warnings, 3 + 2 + 1, until the WHO resistance overlay was removed on
1 Oct 2026; see docs/remove-resistance-notes.md and
docs/handoff-remove-study-layers.md.)

No browser test script is installed (puppeteer is not), and
`scripts/verify-map-clusters.js` went with the dots it tested.
[docs/handoff-remove-study-layers.md](docs/handoff-remove-study-layers.md) §6
describes a smoke test that drives headless Chrome over raw CDP.
Headless Chrome needs a software GL backend or MapLibre never finishes
initialising and the whole page looks broken — add
`--enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader` and drop
`--disable-gpu`. Even then the map canvas may stay blank headless; check the
map in a real browser.

Review diffs with `git diff --ignore-cr-at-eol`. Files on disk are CRLF and the
repo stores LF, so a raw `git diff` shows whole-file churn that is not real.

## Two failure modes that have already happened here

- **Check generated and edited files for NUL bytes before committing.** A NUL
  is a legal string character, so the page and the tests pass while git
  reclassifies the file as binary and the diff becomes unreviewable. `grep -P
  '\x00'` has given false negatives; count the bytes in Python instead.
- **When a test disagrees with the code, establish which one is wrong before
  changing either.** On this branch the test was wrong both times.
