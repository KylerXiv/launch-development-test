# Working in this repo

Start with [docs/developer-guide.md](docs/developer-guide.md) for the
architecture and the governance rules. This file covers only what is easy to
get wrong when working task by task.

## Documentation is part of the task, not a follow-up

Every task that changes a feature branch also updates that branch's
working-notes document in `docs/`, **in the same commit as the change it
describes**. A separate "update the docs" commit is a promise to forget.

For DEV-13 that document is
[docs/dev-13-resistance-handover.md](docs/dev-13-resistance-handover.md); its
§10 lists which kind of change touches which section. A new feature branch
starts its own equivalent document and keeps the same shape.

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

Run the branch document's own verify block — for DEV-13, §8 "Verify before
committing". Generated data files are regenerated and expected to come back
byte-identical; the validator is expected to report a specific error/warning
count, not merely to exit cleanly.

Review diffs with `git diff --ignore-cr-at-eol`. Files on disk are CRLF and the
repo stores LF, so a raw `git diff` shows whole-file churn that is not real.

## Two failure modes that have already happened here

- **Check generated and edited files for NUL bytes before committing.** A NUL
  is a legal string character, so the page and the tests pass while git
  reclassifies the file as binary and the diff becomes unreviewable. `grep -P
  '\x00'` has given false negatives; count the bytes in Python instead.
- **When a test disagrees with the code, establish which one is wrong before
  changing either.** On this branch the test was wrong both times.
