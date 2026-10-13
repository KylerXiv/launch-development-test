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
    "updated": "2026-10-13"
  },
  "proposals": [
    {
      "id": "p-97",
      "issue": 97,
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "next"
      },
      "stageName": "WHO PQ listing",
      "productName": "GanLum",
      "was": "",
      "now": "TEST – manual walkthrough, will be rejected. Nothing here is real data.",
      "evidence": {
        "src": "who-pq-fpp",
        "srcLabel": "WHO prequalification list",
        "asOf": "2026-10-13",
        "ref": "https://extranet.who.int/prequal/medicines/prequalified/finished-pharmaceutical-products"
      },
      "notes": "End-to-end test of the data proposal chain (intake → PR → preview → decision). It will be rejected with rejected:not-a-change, so nothing is published.",
      "origin": "analyst:codebyjackson",
      "state": "waiting",
      "fingerprint": "sha1:94db846f89fa68d7"
    }
  ]
}
