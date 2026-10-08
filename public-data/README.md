# LAUNCH dashboard data

**Live:** [v1/dashboard.json](https://codebyjackson.github.io/launch-data-test/v1/dashboard.json)
· [v1/schema.json](https://codebyjackson.github.io/launch-data-test/v1/schema.json)
· [CHANGELOG](CHANGELOG.md)
· used by the [RBM test pages](https://codebyjackson.github.io/launch-rbm-test/)

The published dataset behind the LAUNCH malaria-medicines dashboard on the
RBM Partnership to End Malaria's platform. One JSON file holds everything the
dashboard pages show, in English, French, Portuguese and Spanish. It is approved output
only: no code, no secrets, nothing unreviewed.

**This repository is written by a workflow.** Every commit that changes
`v1/dashboard.json` comes from the LAUNCH pipeline's "Publish to RBM data repo"
workflow and ends in `[publish-dataset]`. Do not edit the files under `v1/` by
hand; see "Corrections" below.

## Endpoint

```
https://codebyjackson.github.io/launch-data-test/v1/dashboard.json    current dataset
https://codebyjackson.github.io/launch-data-test/v1/archive/<time>.json  every earlier publish, unchanged
https://codebyjackson.github.io/launch-data-test/v1/schema.json        the contract (JSON Schema)
```

GitHub Pages serves these with open CORS (`Access-Control-Allow-Origin: *`),
so a page on any domain, inside an iframe or not, can fetch them in the
browser. A new publish is live about a minute after its commit (once GitHub's
"pages build and deployment" run is green). Browsers may keep a copy for up to
10 minutes (`Cache-Control: max-age=600`); fetch with `cache: "no-cache"`, as the
dashboard pages do, to always get the current file.

```js
const res = await fetch("https://codebyjackson.github.io/launch-data-test/v1/dashboard.json");
const ds = await res.json();
if (ds.schema_version !== 1) { /* show a maintenance notice, do not render */ }
const lang = "fr";                                   // the page's own language
const t = ds.data.stages[0];                         // every text is { en, fr, pt, es }
const stageName = t[lang] || t.en;                   // English if this file lacks the language
```

## The file

| Field | What it is |
| --- | --- |
| `schema_version` | `1`. Changes only on a breaking change (see below). |
| `generated_at` | When this file was built (UTC). |
| `approved_at`, `approved_by` | The approval it publishes (date and GitHub login), or the time and login of a manual publish. Show `approved_at` as "last updated". |
| `approval` | `trigger` (`approval` or `manual`), the proposal `issue` and `pr` for an approval, the `reason` for a manual publish. |
| `pipeline_commit`, `content_hash` | Exactly which pipeline commit and which English content it was built from. |
| `locales` | `["en", "fr", "pt", "es"]`: the languages every text carries. Files published before Spanish was added have `["en", "fr", "pt"]`. |
| `data_status` | `draft` = compiled from public sources, pending verification. Show a notice unless `live`. |
| `last_updated` | When the data itself last changed. |
| `source_coverage` | Every public source the data draws on, with its link. |
| `data` | The dataset: `stages`, `stageColumns`, `stageInfo`, `yardstick` (optional, expected years per stage), `glossary`, `changelog`, `products`, `treatmentPolicy`, `sources`. |

**Text.** Every text a reader sees is an object `{ "en": …, "fr": …, "pt": …, "es": … }`,
one key per language in `locales`. Where no translation exists yet, `fr`, `pt`
and `es` carry the English. Names, ids, dates, statuses and numbers stay plain
values. Read a text by key, falling back to `en`; do not check for a fixed set
of keys, since adding a language is not a breaking change (below).

**Country access.** `products[].detail.countries` carries `status` and `note`.
Unless `status` is `verified`, show the note as a warning with the map, as the
LAUNCH dashboard does.

**Map shapes are not in this file.** They ship with the dashboard pages and
join to the data on ISO 3166 alpha-3 codes (`iso3`).

## Change rules

- **Adding** a field is not a breaking change. Pages must ignore fields they
  do not know. Adding a language (a new key in every text, and in `locales`)
  counts as adding a field: Spanish was added this way.
- **Renaming, removing or retyping** a listed field is breaking: it gets a new
  `schema_version` and a new path (`v2/`), and `v1/` stays live until the RBM
  pages have moved to it.
- Every publish is a commit here and an entry in [CHANGELOG.md](CHANGELOG.md).

## Corrections

To undo a publish, the LAUNCH team reverts the change in the pipeline and
publishes again; the correction is a new commit here and nothing is deleted.
In an emergency the publish commit here can be reverted first; the pipeline
then refuses to publish again until the same change is reverted on its side.

## Sources and licence

See [ATTRIBUTION.md](ATTRIBUTION.md).
