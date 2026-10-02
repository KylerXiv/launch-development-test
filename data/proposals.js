// Changes that have been proposed and not yet decided — the queue.
//
// Nothing in this file is published. Each entry is one proposed change to
// data/products.js, carrying what it currently says, what it would say, and
// the evidence behind it. Written by .github/workflows/proposal-intake.yml
// when a proposal issue is filed; removed when it is approved or rejected.
//
// This is a SNAPSHOT taken at filing time on purpose: an approval applies
// what is recorded here, never the issue body as it reads later. An issue can
// be edited by anyone with write access; this cannot, except by the intake
// workflow re-running on an edit — which re-checks it from scratch.
//
// Same shape rule as every other data file here: comment header, then
// `window.LAUNCH_PROPOSALS = ` at a line start, then strict JSON.

window.LAUNCH_PROPOSALS =
{
  "meta": {
    "updated": "2026-10-02"
  },
  "proposals": [
    {
      "id": "p-43",
      "issue": 43,
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "stageName": "WHO PQ listing",
      "productName": "GanLum",
      "changes": [
        {
          "field": "status",
          "was": "idle",
          "now": "done"
        },
        {
          "field": "date",
          "was": "",
          "now": "15 Sep 2026"
        },
        {
          "field": "note",
          "was": "Not on the WHO PQ EOI list yet (24th malaria EOI, 27 Feb 2026, checked)",
          "now": "Prequalified by WHO on 15 Sep 2026 (WHO ref TEST-0001, Novartis Pharma AG)."
        }
      ],
      "evidence": {
        "src": "who-pq-fpp",
        "srcLabel": "WHO prequalification list",
        "asOf": "2026-09-21",
        "ref": "TEST-0001 — https://extranet.who.int/prequal/medicines/prequalified/finished-pharmaceutical-products"
      },
      "notes": "**Test data** — read from `test-data/regulatory/who-pq-ganlum-listed.csv`, not from the fetched list.\n\nFiled automatically by the source watcher (WHO PQ) from `test-data/regulatory/who-pq-ganlum-listed.csv`, fetched 2026-09-21.\n\n- TEST-0001 · Ganaplacide/Lumefantrine (TEST ROW — not real WHO data) · prequalified 2026-09-15 · Novartis Pharma AG\n\nThe sentence is a factual draft. If it should read differently, reject with `rejected:wrong-value` and file your own wording.\n\nNot changed: which stage the dashboard shows as current.",
      "origin": "watcher:github-actions[bot]",
      "state": "waiting",
      "fingerprint": "sha1:851aa6af792b30ec"
    }
  ]
}
