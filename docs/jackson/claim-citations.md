# Citations on individual claims — working notes

**What was asked.** The partners' feedback email of 15 Oct 2026 has a row
under *Sources & References*: "Expanded Sources Section — Populate the
expanded sources section with public references and attach citations
directly to individual claims rather than relying solely on a generic master
list." Category QST / Content; the reason given is dashboard credibility and
data traceability before the dashboard goes to stakeholders.

**Where it landed.** #117 (`52aa0ec`, merged as `7af481a`, 19 Oct 2026),
published to the data repo as `36f451f` ("Publish now", 19 Oct), and copied
by hand into launch-rbm-test (see Status).

## What was there before

- The Sources section at the foot of the page listed the 30 entries of
  `data/sources.js`: one master list, with no link from any claim to the
  entry behind it.
- 21 stages, about 25 milestones and the two procurement figures each had a
  free-text `source` ("MMV", "WHO PQ list (extract 22 Aug 2026)"). A stage
  panel printed it as plain text; a milestone's was in the CSV only, never
  on the page; none was a link.
- That free text is not a translated field, so the French, Portuguese and
  Spanish pages printed it in English.
- Two citations were not public references: ALAQ's SRA stage cited
  "DeTACT partnership statements" and DHA–PPQ's in-country delivery cited
  "LAUNCH assessment (draft)".

## Decisions

1. **Scope: the 46 claims that already named a source.** Every stage,
   milestone and procurement figure with a `source` now also carries
   `sources`, a list of ids in `data/sources.js` (45 claims; ALAQ's
   "SRA/WLA submission" milestone has no public source and stays uncited).
   *Rejected:* also citing the 41 descriptive bullets (access, adoption,
   research, use case, barrier). Each would need a source researched from
   scratch, and anything unverifiable would have had to be removed; the
   owner chose to do the claims that already cite something first.

2. **Shown as linked source names, in the place the "Source:" line already
   was.** A stage panel and a procurement card read "Source: <name> ↗ ·
   <name> ↗ · verified <date>"; a milestone shows "Source: <name> ↗" under
   its name in the table. The names are the entries' labels in the Sources
   list, so they are translated with that list; "Source:" itself was
   already translated in all three languages, so the change adds no new
   interface text. *Rejected:* numbered references ([1], [2]) that jump to
   the master list: two clicks to reach a source, and a new pattern for
   readers. *Rejected:* a Source column in the milestone table: wider than
   a phone, where the table already scrolls sideways.

3. **Ids, not text.** The link is drawn from the registry, so a reference
   that moves is fixed once in `data/sources.js`. The free-text `source` is
   kept as the detail (extract dates, register references) and as the
   fallback for a claim with no ids; the CSV still prints it.

4. **Every reference is public and was opened.** 14 references were added,
   each fetched and read on 19 Oct 2026, not just checked for a 200. Each
   has `findings` saying what it was checked for:

   | id | What it is |
   |---|---|
   | `mmv-ganlum-phase3` | MMV/Novartis release of GanLum's Phase III results, 12 Nov 2025 |
   | `ctgov-kaluma` | ClinicalTrials.gov record NCT05842954 (KALUMA) |
   | `who-pq-eoi-malaria-24` | WHO PQ 24th malaria EOI (dated 19 Nov 2025, updated 27 Feb 2026) |
   | `clinicaltrials-fd-tact` | ClinicalTrials.gov record NCT05951595 (FD-TACT, ALAQ Phase III) |
   | `cpt-alaq-dose-2025` | Clin Pharmacol Ther 117(5), 2025: ALAQ dose optimisation |
   | `who-pado-malaria-2025` | WHO PADO-malaria report (June 2025 meeting) |
   | `ghit-alaq-fdc` | GHIT Fund project G2022-205 (ALAQ Phase III) |
   | `mmv-pyramax` | MMV's Pyramax page |
   | `mmv-pyramax-pregnancy` | MMV news, 20 Aug 2025: Pyramax label updated for pregnancy |
   | `mmv-dhappq` | MMV's Eurartesim page |
   | `ema-pyramax` | EMA's Article 58 opinion on Pyramax, 16 Feb 2012 |
   | `ema-eurartesim` | EMA's EPAR for Eurartesim, authorised 27 Oct 2011 |
   | `who-guidelines-2010` | WHO Guidelines for the treatment of malaria, 2nd ed. (2010) |
   | `whopar-ma093` | WHO assessment report for Eurartesim (listing and requalification dates) |

   The Sources list grows from 30 to 44 entries; the new ones are
   documents, so they appear under "Key documents". A follow-up PR moved the
   14 entries into the file's A–Z order (whole blocks, nothing inside an
   entry changed) and regenerated the proposal form's Source dropdown
   (`docs/source-registry-notes.md` §6), so a proposal can cite them.

5. **Wording follows the references.** Where a reference did not support
   the sentence, the sentence changed, not the citation (agreed with the
   owner, 19 Oct):
   - ALAQ: "partnership targets approval by ~2027" (SRA) and "PQ targeted
     by ~2027" are removed; both are TBC, and the milestones' "~2027" too.
     No public source gives that date or an SRA route; GHIT's project page
     names WHO recommendation and prequalification as the route.
   - ALAQ: "successor to the DeTACT programme" removed (no source says so).
   - GanLum: KALUMA ran at 33 sites (the registry; the release said 34).
   - The 24th malaria EOI reads "updated 27 Feb 2026" (the list itself is
     dated 19 Nov 2025).
   - ASPY: the pregnancy label "changed" on 31 Jul 2025 (was "announced";
     MMV's news is dated 20 Aug).
   - DHA–PPQ in-country delivery now reads "National policy and Global Fund
     procurement vary substantially between countries", cited to the WHO
     national drug policy table and Global Fund PQR. Nothing public measures
     "routine use", which the earlier sentence claimed.

   No status changed. The changelog says all of this to readers, and
   `lastUpdated` is 19 Oct 2026.

6. **The procurement figures cite Global Fund PQR only.** The research
   suggested PMI as well, but PMI has no public link here and the figures
   are Global Fund orders alone.

7. **Citations cannot go stale through the proposal flow.** An approved
   proposal already rewrites a stage's free-text `source`; `proposal-lib.js`
   now also sets the stage's `sources` to the proposal's own registry id
   (new selftest check). `validate-data.js` rejects any cited id that is not
   public in `data/sources.js`.

8. **No hand translations.** The new and reworded data text (9 claim
   texts, the changelog line, and the 14 references' names and
   descriptions) goes through the translate bot like everything else, and
   shows in English on /fr, /pt and /es until it runs. Hand translations
   were written and then removed at the owner's request.

9. **Layout.** Citations wrap inside their panel or table cell
   (`overflow-wrap: anywhere`). Checked at 360, 390, 744, 820 and 1280 px in
   en/fr/pt/es with every stage panel and every medicine's detail opened:
   no citation outside its panel or cell, no sideways scroll on the page, no
   errors.

## Deferred or found in passing

- The 41 descriptive bullets still have no citation (decision 1).
- `proposal-lib.js selftest` has one failure that is also on `main`
  before this change: "refuses a country already drawn at that level,
  citing the same source and date — accepted".
- `test-serializer.js` fails on a Windows checkout only (CRLF); the data
  file round-trips byte-identical with LF.
- From the research, not changed: ASPY's "strong recommendation 2022" is
  confirmed only from secondary records; Pyramax's PQ dates "2012–2016"
  cannot be checked against the public list (it gives no dates); DHA–PPQ's
  "reaffirmed 2015" (3rd edition guidelines) is not separately cited;
  "taste-masked" for ALAQ is supported by the PADO report and MMV, though a
  23 Aug changelog removed it as unverified.

## Status

| Step | Result |
|---|---|
| #117 merged | `7af481a`; checks passed; translate run failed at its Google step (as every run does until the key is replaced) |
| Data published | data repo `36f451f`, live: 44 sources, citations in `dashboard.json` |
| RBM test pages | hand copy from `main` after this note (launch-rbm-test PR) |

Files: `data/products.js`, `data/sources.js`,
`illustrated-journey-dashboard.html`, `scripts/validate-data.js`,
`scripts/proposal-lib.js`, `i18n/reviewed-strings.json`,
`i18n/content.en.json`.
