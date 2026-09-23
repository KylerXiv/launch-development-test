// Every proposal that was decided, and what was decided — append-only.
//
// A rejection has to be remembered, or the same suggestion arrives again next
// month until people stop reading the queue. `fingerprint` is a hash of what
// was proposed (which product, which stage, which field, what value), so the
// same change arriving from a fetcher later can be recognised and filtered
// out without anyone having to remember it.
//
// Written by .github/workflows/proposal-decision.yml. Never read to render a
// figure — this is the record of who decided what, not data.

window.LAUNCH_DECISIONS =
{
  "meta": {
    "updated": "2026-09-22"
  },
  "decisions": []
}
