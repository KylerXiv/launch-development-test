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
    "updated": "2026-10-01"
  },
  "decisions": [
    {
      "issue": 10,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-09-29",
      "target": {
        "product": "ganlum",
        "stage": 1,
        "field": "several"
      },
      "proposed": [
        {
          "field": "status",
          "was": "prog",
          "now": "done"
        },
        {
          "field": "date",
          "was": "",
          "now": "18 Sep 2026"
        },
        {
          "field": "note",
          "was": "Regulatory submissions in preparation following Phase III success",
          "now": "EMA positive scientific opinion under EU-M4all (Article 58) on 18 Sep 2026 — GanLum [TEST ROW - not real EMA data] (TEST-EMA-0001)."
        },
        {
          "field": "next",
          "was": "Dossier submission (SRA pathway)",
          "now": ""
        },
        {
          "field": "nextDate",
          "was": "TBC",
          "now": ""
        }
      ],
      "fingerprint": "sha1:ae1ec5d6c4cb475c",
      "pr": 11,
      "commit": "59c116f89039b5468713462a1d24640d87501aa4"
    },
    {
      "issue": 15,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-09-29",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 16,
      "commit": "ec496358fbb4288e790197fc728fd9589e04d256"
    },
    {
      "issue": 17,
      "state": "rejected",
      "reason": "rejected:evidence-missing",
      "by": "KylerXiv",
      "on": "2026-09-29",
      "target": {
        "product": "ganlum",
        "stage": 1,
        "field": "several"
      },
      "proposed": [
        {
          "field": "status",
          "was": "prog",
          "now": "done"
        },
        {
          "field": "date",
          "was": "",
          "now": "18 Sep 2026"
        },
        {
          "field": "note",
          "was": "Regulatory submissions in preparation following Phase III success",
          "now": "EMA positive scientific opinion under EU-M4all (Article 58) on 18 Sep 2026 — GanLum [TEST ROW - not real EMA data] (TEST-EMA-0001)."
        },
        {
          "field": "next",
          "was": "Dossier submission (SRA pathway)",
          "now": ""
        },
        {
          "field": "nextDate",
          "was": "TBC",
          "now": ""
        }
      ],
      "fingerprint": "sha1:ae1ec5d6c4cb475c"
    },
    {
      "issue": 20,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-09-30",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 21,
      "commit": "3bca88d094c202fcb73b8ed848afdea7c526866d",
      "contentHash": "c137bf5e03f4b9d2a3f57b2e9a00987b4eae2c0b9b3a764320435928c1bbedab"
    },
    {
      "issue": 22,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-09-30",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 23,
      "commit": "9651146a641a5308f6ae154a352aad163f64d36e",
      "contentHash": "8866599a073485ea95cd43f4ebea4a8281d11f948a6330cd0295815e933f0ba8"
    },
    {
      "issue": 24,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-09-30",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 25,
      "commit": "e44c228441b94ec5f69a2bae68d4cc2b5ff3fd95",
      "contentHash": "9c111c0020846c419fc81409e6c7410490243c8b0b930c0fb5b02c3e32fc3d20"
    },
    {
      "issue": 28,
      "state": "approved",
      "by": "KylerXiv",
      "on": "2026-10-01",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 29,
      "commit": "a42df6addfff469fc1d77112e6efe2f631f17d6f",
      "contentHash": "69ff1b742f56a376d4ee63ecc26712a45bed47b8449ce4d5c4b7d2aba497bf81"
    },
    {
      "issue": 35,
      "state": "approved",
      "by": "codebyjackson",
      "on": "2026-10-01",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 36,
      "commit": "0ba9dc8444518463641a6960880c72a86a2682c8",
      "contentHash": "63a1eb4be765c85324b33462b09d7427f5b5f1d72683cb9334dd295d50634cbf"
    },
    {
      "issue": 38,
      "state": "approved",
      "by": "codebyjackson",
      "on": "2026-10-01",
      "target": {
        "product": "ganlum",
        "stage": 3,
        "field": "several"
      },
      "proposed": [
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
      "fingerprint": "sha1:851aa6af792b30ec",
      "pr": 39,
      "commit": "24acb2f13e7f90717a5d6cb72a954e5fe5951d61",
      "contentHash": "ec54209fc4dd20544f4d7e0ed85806cf9b6d2fb6337ce8f99905d2e8edfe52f0"
    }
  ]
}
