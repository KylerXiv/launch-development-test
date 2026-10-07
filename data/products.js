// LAUNCH dashboard data file.
// Everything after the assignment on the marker line below must be STRICT JSON
// (double quotes, no comments, no trailing commas) — run
// `node scripts/validate-data.js` after every edit; it refuses anything malformed.
//
// Provenance fields used throughout:
//   "source"              where the figure comes from (public source, citable)
//   "asOf"                date the value was last verified (YYYY-MM-DD)
//   "confirmedInWriting"  manufacturer confirmed release of this figure in writing
//
// meta.dataStatus: "illustrative" | "draft" | "live"
//   draft = compiled from public sources, pending LAUNCH team verification
//           and manufacturer written confirmation. Unknown values are "TBC" —
//           never estimated.
  //
  // stageColumns: how the stages above are grouped into display columns.
  // Most columns hold one stage index; a column that lists more than one
  // (currently [2, 3] — WHO recommendation and WHO PQ listing) is a
  // *parallel* pair: two independent WHO approvals shown side by side in one
  // column, with no arrow or implied order between them. WHO runs these as
  // separate tracks and (per LAUNCH's 2026 review) wants them read that way;
  // drawing them strictly in sequence had been quietly endorsing the opposite.
  // Flattened in order, stageColumns must equal every index in "stages"
  // exactly once, ascending — scripts/validate-data.js enforces this.
  //
  // stageInfo: one plain-language explainer per stage, same order as "stages".
  // Shown in the panel that opens when a step on the pathway strip is clicked
  // (what happens there, who decides, why it can stall, where to check it).
  // Written from docs/domain-primer.md section 2; draft wording, needs LAUNCH
  // sign-off. Optional: without it the panel shows only where each medicine is.
  //
  // yardstick: how long each stage is expected to take, in years, same order
  // as "stages" (null = not measured), and "wholeYears" for the whole journey
  // to routine use. "basis" is "published" for a timeline someone publishes
  // (country registration) or "estimate" for LAUNCH's own working estimate,
  // still to be agreed. The page compares these with the stage dates: the
  // badge in the medicines table, the box at the top of an open row and the
  // "Time taken" table. Optional: without it none of the three is shown.
  // See docs/jackson/yardstick.md.
  //
window.LAUNCH_DATA =
{
  "meta": {
    "lastUpdated": "2026-10-06",
    "dataStatus": "draft",
    "host": "RBM Partnership to End Malaria"
  },
  "stages": [
    "R&D & clinical",
    "Regulatory approval (SRA)",
    "WHO recommendation",
    "WHO PQ listing",
    "Country registration",
    "National policy adoption",
    "Procurement (public channels)",
    "In-country delivery"
  ],
  "stageColumns": [
    { "stages": [0] },
    { "stages": [1] },
    { "stages": [2, 3] },
    { "stages": [4] },
    { "stages": [5] },
    { "stages": [6] },
    { "stages": [7] }
  ],
  "stageInfo": [
    { "what": "Lab discovery, then three rounds of human trials: first for safety, then for the right dose, then large efficacy trials across several countries. The trials alone usually take 3 to 6 years.", "who": "The manufacturer, often with a product development partnership such as MMV.", "stall": "Recruiting enough patients, and running trial sites in several countries.", "source": "Trial registries and manufacturer announcements" },
    { "what": "A stringent regulator reviews the full evidence on quality, safety and effectiveness. For malaria medicines this is usually the European Medicines Agency (EMA) Article 58 procedure, which covers medicines meant for use outside Europe. Every later step builds on this opinion. Health-authority review status is generally not public, so this step changes only when a regulator or the manufacturer announces an outcome.", "who": "EMA, or another stringent regulator such as the US FDA.", "stall": "Preparing the full dossier, then waiting out the review.", "source": "EMA registers" },
    { "what": "A WHO expert group weighs the clinical evidence and decides whether the medicine goes into the WHO Guidelines for malaria. Most countries follow these guidelines when writing their own.", "who": "WHO Global Malaria Programme and its Guidelines Development Group.", "stall": "The group meets on its own calendar, so the timing is hard to predict.", "source": "WHO Guidelines for malaria" },
    { "what": "A separate WHO check of quality and manufacturing, including factory inspections. A place on the prequalified list is what lets UN agencies and the Global Fund buy the medicine. The product must first be invited through WHO's Expression of Interest (EOI) list.", "who": "WHO Prequalification Team.", "stall": "Waiting for an invitation round, then for inspections.", "source": "WHO prequalification list and EOI" },
    { "what": "Each country's own regulator licenses the medicine before it can be sold or used there, usually one country at a time. Regional routes, such as the African Medicines Agency and WHO's collaborative registration (about 90 working days), are meant to speed this up.", "who": "National medicines regulators.", "stall": "Going country by country, each with its own queue.", "source": "National medicines registers" },
    { "what": "The health ministry writes the medicine into the national treatment guidelines. These decide what health workers prescribe and what the public sector buys. A WHO recommendation does not automatically become national policy.", "who": "Ministries of health and national malaria programmes.", "stall": "National guideline committees meet rarely and follow their own schedules.", "source": "National treatment guidelines" },
    { "what": "Someone has to pay. Funders and governments run tenders, agree reference prices and forecast demand. A medicine can be recommended, registered and in the guidelines and still be barely bought. This step covers public channels only: the figures shown are Global Fund-financed procurement, and sales through private or other channels are not included.", "who": "The Global Fund, the US President's Malaria Initiative, UNICEF and national governments.", "stall": "Financing cycles. Global Fund grants, for example, run for three years.", "source": "Global Fund price and quality reporting, PMI" },
    { "what": "Getting the medicine from the port to the health facility, training health workers, and watching for side effects once it is in use.", "who": "Governments and implementing partners.", "stall": "Supply chain readiness and health-worker training.", "source": "Manufacturer and programme communications" }
  ],
  "yardstick": {
    "wholeYears": 8,
    "expected": [
      null,
      null,
      { "years": 2, "basis": "estimate" },
      { "years": 1.5, "basis": "estimate" },
      { "years": 2, "basis": "published" },
      { "years": 2, "basis": "estimate" },
      { "years": 2, "basis": "estimate" },
      { "years": 3, "basis": "estimate" }
    ]
  },
  "glossary": {
    "ACT": "Artemisinin-based combination therapy — the standard class of malaria treatments pairing an artemisinin derivative with a longer-acting partner drug.",
    "SRA": "Stringent Regulatory Authority — an advanced regulator (e.g. EMA, US FDA) whose review anchors WHO prequalification and country registrations.",
    "WLA": "WHO-Listed Authority — a regulator assessed by WHO as operating at an advanced level.",
    "Article 58": "EMA procedure giving a scientific opinion on high-priority medicines intended for markets outside the EU.",
    "GDG": "Guidelines Development Group — the WHO expert group that reviews evidence and formulates treatment recommendations.",
    "PQ": "WHO prequalification — the quality, safety and efficacy assessment whose outcome, a listing on the WHO prequalified-products list, makes a product eligible for procurement by UN agencies and major donors.",
    "MFT": "Multiple first-line therapies — deploying several first-line treatments in parallel to reduce drug pressure and slow resistance.",
    "EOI": "Expression of Interest — the WHO prequalification invitation list; a product must be on it before a PQ dossier can be assessed.",
    "AMA": "African Medicines Agency — continental body coordinating regulatory review across African Union member states.",
    "PMI": "U.S. President's Malaria Initiative — a major bilateral funder and procurer of malaria commodities.",
    "MMV": "Medicines for Malaria Venture — product development partnership behind several antimalarials.",
    "PQR": "Price & Quality Reporting — the Global Fund database of procurement transactions (volumes and prices).",
    "GMP": "Good Manufacturing Practice — quality standard verified by inspection of manufacturing sites."
  },
  "changelog": [
    { "date": "2026-10-06", "product": "All", "change": "Country access map: the illustrative country lists for ASPY and DHA–PPQ are replaced with verified ones. A country is shown only when a national medicines regulator's register, a WHO publication or a peer-reviewed paper supports its stage; every other country shows No data. ASPY: 13 countries (Nigeria, Rwanda, Burkina Faso and Kenya in MFT plans; Ghana, Viet Nam, DR Congo, Cameroon, Thailand, Republic of Korea and South Sudan in national guidelines; Tanzania and Zambia registered). DHA–PPQ: 15 countries (Nigeria, Rwanda, Burkina Faso and Kenya in MFT plans; Tanzania, Viet Nam, Thailand, Indonesia, Ghana, Angola, Cameroon, Gabon and Papua New Guinea in national guidelines; Zambia and Zimbabwe registered). Removed for lack of such a source: Cambodia, Côte d'Ivoire, Uganda, Mozambique, Senegal, Mali and Myanmar (ASPY); Cambodia, Mozambique, Senegal, Myanmar, Lao PDR, China and India (DHA–PPQ). Each entry now cites its sources and the date checked. New sources: the Zambia, Zimbabwe, Viet Nam and Rwanda registers (fetched monthly), the WHO national drug policy table, the WHO MFT implementation guide, and three peer-reviewed MFT papers (Rwanda, Burkina Faso, Kenya). The country access figures in each medicine's details now count the same lists, each stage including the later ones as the map does: ASPY 13 registered or further, 11 in national guidelines or further, 4 in MFT plans; DHA–PPQ 15, 13 and 4. ASPY's \"25+ countries\" registration claim, which came from MMV, is replaced by the five national registers that confirm it (Nigeria, Rwanda, Tanzania, Viet Nam, Zambia).", "plain": "The country access map now shows only countries we can back with an official or peer-reviewed source. Some countries moved stage, some were added, and those we could not confirm now show No data. New sources include four national medicine registers and WHO's guide to using several first-line treatments. The country counts in each medicine's details now match the map." },
    { "date": "2026-10-02", "product": "All", "change": "Illustrated journey dashboard, wording changes from reviewer feedback. Price: the per-medicine price card is removed (the price field stays in the data for the other pages). Procurement: the step is now \"Procurement (public channels)\" and says it covers Global Fund-financed procurement only. Regulatory approval: the step and the page footer say health-authority review status is generally not public. GanLum: manufacturer and research lead now read \"Novartis\", the line \"Co-developed with MMV under access-oriented partnership\" is removed, and the required acknowledgement (new `acknowledgement` field) is shown in the medicine's details. A disclaimer is added to the footer and linked from the draft banner.", "plain": "We changed some wording after reviewer feedback. The price card is gone, the procurement step is labelled as public channels only, and the page now says that health-authority review progress is usually not public. GanLum now credits Novartis as its developer, with the required acknowledgement of its funders, and the page has a disclaimer." },
    { "date": "2026-10-01", "product": "All", "change": "Illustrated journey dashboard: the three WHO study-result layers (treatment failure, delayed parasite clearance, molecular markers of drug resistance) were removed from the country access map, together with their data files and sourcing. Drug-resistance results are no longer reproduced here; the page links to the WHO Malaria Threats Map instead. The map's controls were also reorganised: access stages and MFT policy groups are now tickable filters in the left rail, replacing the MFT switch, and the legend under the map lists only what is ticked. The Detail panel is now an overview dashboard with a country finder, and every country on the map opens its own page for the selected medicine. The 5 Sep 2026 entry below records when the layers were added.", "plain": "We removed the drug-resistance results from the map. For that information, the page now points to the WHO Malaria Threats Map. The map's filters and legend have been tidied up, and you can now click any country to see its page." },
    { "date": "2026-09-10", "product": "All", "change": "Terminology: the two product `flag` sentences now say \"access barrier\" rather than \"bottleneck\", matching the illustrated journey dashboard's summary strip and legend. Client request — the programme is about accelerating access, so the blocking stage is named as a barrier to overcome rather than as a bottleneck. Wording only; no status, date or figure changed.", "plain": "We now call a blocked step an \"access barrier\" instead of a \"bottleneck\". Only the wording changed — no figures or dates were altered." },
    { "date": "2026-09-08", "product": "ASPY", "change": "First confirmed national guideline adoption recorded: Ghana introduced artesunate-pyronaridine as an alternate first-line ACT in 2022 (alongside AS-AQ and AL), per a peer-reviewed therapeutic-efficacy study (Ghana 2023 fieldwork, published 2026). National policy adoption stage remains 'late' — Ghana is the only confirmed country so far against WHO's 2022 strong recommendation. Procurement stage dates for ASPY (since 2018) and DHA–PPQ (since 2008) added — both years were already cited in the Global Fund PQR figures elsewhere in this file but had not been carried into the stage `date` field.", "plain": "We found a real example of a country acting on the World Health Organization's advice: Ghana added this medicine as a backup first-choice treatment in 2022. It's still the only country confirmed to have done so. We also recorded the years Global Fund purchasing began for both underused medicines (2018 and 2008)." },
    { "date": "2026-09-05", "product": "All", "change": "Illustrated journey dashboard: the country access map gained a WHO drug-resistance overlay. Treatment-failure results from the WHO Malaria Threat Maps (therapeutic efficacy studies, extract 5 Sep 2026) are drawn as dots over the access shading, with their own provenance line and their own tooltip. All five Plasmodium species and studies of every size are included, selectable by drug and species; pairings WHO has no data for are disabled rather than shown empty. Each dot is the most recent study year for that country, averaged across that year's sites and weighted by patient numbers — click a dot for every underlying study. The access layer remains illustrative, so the two readings are presented separately and not combined." },
    { "date": "2026-08-25", "product": "All", "change": "Version 2 merged: the collected-data updates reviewed in the /v2/ preview (Global Fund PQR volumes, WHO PQ listings, EMA dates, trial-registry records, Nigeria + Tanzania register verification, sourced fact corrections) are now the live draft dataset. The preview edition is retired.", "plain": "Everything we checked during the August review is now part of the main dataset. The separate preview version has been retired." },
    { "date": "2026-08-23", "product": "DHA–PPQ", "change": "Nigeria and Tanzania registrations verified against the national registers: TZA 10 presentations across four manufacturers (all compliant); NGA 47 presentations but only 26 Active — 22 lapsed, a registration-maintenance signal.", "plain": "We checked Nigeria's and Tanzania's official medicine registers. Tanzania lists 10 approved versions of this medicine, all up to date. Nigeria lists 47, but only 26 are still active — 22 have expired and would need renewing." },
    { "date": "2026-08-23", "product": "ASPY", "change": "Nigeria and Tanzania registrations verified against the national registers: TZA 2 (TMDA, 2022), NGA 1 (Greenbook granules, approved Feb 2024). The NGA/TZA registered-level map entries are now register-verified.", "plain": "We checked the official medicine registers: Tanzania approved this medicine in 2022, and Nigeria approved a version for children in February 2024. Both are now confirmed on the map." },
    { "date": "2026-08-23", "product": "DHA–PPQ", "change": "WHO guideline recommendation year corrected to 2010 (second-edition treatment guidelines; reaffirmed 2015) — previously shown as 2015.", "plain": "We corrected the year the World Health Organization first recommended this medicine. It was 2010, not 2015." },
    { "date": "2026-08-23", "product": "ALAQ", "change": "Co-formulated pivotal Phase III renamed to FD-TACT (successor to the DeTACT programme); unverified 'taste-masked' wording replaced with the sourced 'child-friendly dispersible'.", "plain": "We updated the name of the main trial and reworded how we describe the medicine, so both match what the published sources actually say." },
    { "date": "2026-08-23", "product": "GanLum", "change": "Use-case wording aligned with the sourced Novartis claim (first major innovation in malaria treatment since ACTs were introduced 25+ years ago).", "plain": "We reworded how we describe this medicine to match the manufacturer's own words: the first major change in malaria treatment in more than 25 years." },
    { "date": "2026-08-23", "product": "All", "change": "Version 2 preview: first collected-data updates from the public-source staging layer (Global Fund PQR extract 23 Aug 2026, WHO PQ lists, EMA EU-M4all table, ClinicalTrials.gov).", "plain": "First batch of updates drawn from public databases — Global Fund purchasing records, World Health Organization approval lists, European medicines records and clinical trial registries." },
    { "date": "2026-08-23", "product": "DHA–PPQ", "change": "Global Fund volumes filled from PQR: 11.5m packs / US$41.5m since 2008; 0.9–4.5% of Global Fund antimalarial spend 2022–24 with a sharp 2025 uptick (US$15.3m). Nine PQ'd presentations across Alfasigma, Guilin and Beijing Holley (2015–2023) recorded.", "plain": "Purchasing figures added: the Global Fund has bought 11.5 million packs (US$41.5m) since 2008, with a sharp rise in 2025. Nine versions of the medicine have passed World Health Organization quality checks." },
    { "date": "2026-08-23", "product": "ASPY", "change": "Global Fund volumes filled from PQR: 940k packs / US$14.5m since 2018, with US$11.6m of it in 2025 (Uganda, Burkina Faso). EMA opinion outcome date 5 Jun 2025 recorded from the EU-M4all table.", "plain": "Purchasing figures added: the Global Fund has bought 940,000 packs (US$14.5m) since 2018, most of it in 2025 for Uganda and Burkina Faso. The European medicines decision date is now recorded." },
    { "date": "2026-08-23", "product": "GanLum", "change": "KALUMA registry record (NCT05842954) added: trial completed 25 Nov 2025, 1,720 participants (registry actual).", "plain": "The main trial finished on 25 November 2025 with 1,720 participants — now confirmed from the public trial registry." },
    { "date": "2026-08-15", "product": "All", "change": "Added MMV-style pipeline poster view (pipeline.html) placing each product in its development phase.", "plain": "Added a poster view showing where each medicine sits in development." },
    { "date": "2026-08-15", "product": "All", "change": "Added country access map (illustrative until verified), cross-product pathway timing chart, embeddable product widget, RSS update feed and automatic data-history snapshots.", "plain": "Added a country map, a chart of how long each step takes, a shareable widget, an updates feed and automatic snapshots of the data." },
    { "date": "2026-08-14", "product": "ASPY", "change": "Renamed from Pyramax to ASPY (pyronaridine–artesunate); trade name retained in the subtitle.", "plain": "Renamed from Pyramax to ASPY. The brand name still appears underneath." },
    { "date": "2026-08-14", "product": "All", "change": "Added glossary tooltips, CSV download, print view and pathway timing (time between gates) for marketed products.", "plain": "Added plain-language definitions, a download button, a print view, and the time taken between steps." },
    { "date": "2026-08-14", "product": "GanLum", "change": "Phase III (KALUMA) marked complete — primary endpoint met, announced 12 Nov 2025; regulatory submission preparation now in progress.", "plain": "The main trial succeeded, announced on 12 November 2025. Work on the application for approval has now begun." },
    { "date": "2026-08-14", "product": "ASPY", "change": "EMA Article 58 date corrected to 2012; July 2025 pregnancy label update added to milestones.", "plain": "Corrected a European approval date to 2012, and added the July 2025 update to the medicine's label for use in pregnancy." },
    { "date": "2026-08-14", "product": "DHA–PPQ", "change": "Eurartesim WHO PQ requalification (Jan 2025) recorded; unknown counts set to TBC pending verification.", "plain": "Recorded that Eurartesim passed its World Health Organization quality re-check in January 2025. Figures we cannot yet confirm are shown as TBC." },
    { "date": "2026-08-14", "product": "All", "change": "Dashboard moved from illustrative placeholders to draft public-source data. Prices and volumes shown as TBC until confirmed.", "plain": "The dashboard moved from placeholder examples to real information gathered from public sources. Prices and volumes show as TBC until they are confirmed." }
  ],
  "products": [
    {
      "id": "ganlum",
      "name": "GanLum",
      "inn": "Ganaplacide–lumefantrine (KLU156)",
      "manufacturer": "Novartis",
      "acknowledgement": "Developed by Novartis with the scientific and financial support of MMV, and within the framework of the WANECAM2 consortium, funded by the European & Developing Countries Clinical Trials Partnership Programme supported by the European Union, with co-funding from the German Aerospace Center and the UK Department of Health and Social Care.",
      "class": "pipeline",
      "classLabel": "Pipeline · new chemical class",
      "phase": "regulatory",
      "currentStage": 1,
      "flag": null,
      "stages": [
        { "status": "done", "note": "Phase III (KALUMA, NCT05842954) met primary endpoint: 97.4% PCR-corrected cure rate; registry records 1,720 participants and trial completion 25 Nov 2025 (34 sites, 12 African countries)", "date": "Announced 12 Nov 2025; trial completed 25 Nov 2025", "next": "", "nextDate": "", "source": "Novartis / MMV press releases, 12 Nov 2025; ClinicalTrials.gov NCT05842954", "asOf": "2026-08-22" },
        { "status": "prog", "note": "Regulatory submissions in preparation following Phase III success", "date": "", "next": "Dossier submission (SRA pathway)", "nextDate": "TBC", "source": "Novartis announcement, Nov 2025", "asOf": "2026-08-14" },
        { "status": "idle", "note": "Not started", "date": "", "next": "GDG engagement expected alongside regulatory review", "nextDate": "" },
        { "status": "idle", "note": "Not on the WHO PQ EOI list yet (24th malaria EOI, 27 Feb 2026, checked)", "date": "", "next": "", "nextDate": "", "source": "WHO PQ EOI list (24th edition)", "asOf": "2026-08-22" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" }
      ],
      "detail": {
        "price": { "value": "TBC", "note": "Pricing not yet public — will be shown once confirmed by manufacturer", "source": "", "confirmedInWriting": false, "asOf": "2026-08-14" },
        "useCase": "Non-artemisinin combination — the first major innovation in malaria treatment since ACTs were introduced over 25 years ago (Novartis) — candidate for artemisinin partial-resistance settings and MFT strategies; kills resistant parasites and blocks transmission.",
        "access": [
          "Access and affordability provisions under discussion",
          "Once-daily, 3-day granule sachet — no separate paediatric development needed"
        ],
        "adoption": [
          "New chemical class — pharmacovigilance planning required",
          "Health-worker training on new regimen"
        ],
        "research": { "lead": "Novartis", "geographies": "12 African countries (KALUMA trial sites)", "timeline": "Phase III complete Nov 2025", "question": "Efficacy against resistant parasites and transmission blocking" },
        "country": { "registered": 0, "inGuidelines": 0, "inMft": 0, "forecastDemand": "—" },
        "volume": null,
        "volumeNote": "Pre-launch — no procurement yet",
        "milestones": [
          { "milestone": "Phase III (KALUMA)", "status": "done", "label": "Complete", "date": "12 Nov 2025 (trial completed 25 Nov 2025)", "next": "—", "anticipated": "—", "source": "Novartis / MMV press releases; ClinicalTrials.gov NCT05842954" },
          { "milestone": "SRA dossier submission", "status": "prog", "label": "In preparation", "date": "—", "next": "Submission", "anticipated": "TBC", "source": "Novartis announcement, Nov 2025" },
          { "milestone": "WHO GDG engagement", "status": "idle", "label": "Not started", "date": "—", "next": "Pre-submission dialogue", "anticipated": "TBC", "source": "" },
          { "milestone": "WHO PQ listing", "status": "idle", "label": "Not started", "date": "—", "next": "EOI listing (not on 24th malaria EOI, Feb 2026)", "anticipated": "TBC", "source": "WHO PQ EOI list (24th edition)" }
        ]
      }
    },
    {
      "id": "alaq",
      "name": "ALAQ",
      "inn": "Artemether–lumefantrine–amodiaquine (triple ACT)",
      "manufacturer": "Fosun Pharma · MORU / DeTACT partnership",
      "class": "pipeline",
      "classLabel": "Pipeline · triple ACT",
      "phase": "phase3",
      "currentStage": 0,
      "flag": null,
      "stages": [
        { "status": "prog", "note": "Co-formulated fixed-dose triple ACT in pivotal Phase III (FD-TACT, successor to the DeTACT programme; first patient Sep 2025); dose-optimization published 2025; child-friendly dispersible formulation", "date": "Phase III targeted completion 2025–26", "next": "Phase III results, then dossier preparation", "nextDate": "TBC", "source": "MORU / FD-TACT; Clin Pharmacol Ther 2025; WHO PADO malaria, Jun 2025", "asOf": "2026-08-23" },
        { "status": "idle", "note": "Not started", "date": "", "next": "SRA/WLA submission — partnership targets approval by ~2027", "nextDate": "~2027", "source": "DeTACT partnership statements" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not yet included in WHO PQ Expression of Interest list (24th malaria EOI, 27 Feb 2026, checked)", "date": "", "next": "PQ targeted by ~2027 per partnership", "nextDate": "~2027", "source": "WHO PADO malaria, Jun 2025; WHO PQ EOI list (24th edition)", "asOf": "2026-08-22" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" },
        { "status": "idle", "note": "Not started", "date": "", "next": "", "nextDate": "" }
      ],
      "detail": {
        "price": { "value": "TBC", "note": "Pricing not yet public — will be shown once confirmed by manufacturer", "source": "", "confirmedInWriting": false, "asOf": "2026-08-14" },
        "useCase": "Triple ACT to protect artemisinin partner drugs — MFT component and first-line option where artemisinin partial resistance is confirmed.",
        "access": [
          "Developed through MORU-led DeTACT partnership with Fosun Pharma",
          "Designed for affordability in endemic-country public sectors",
          "Child-friendly dispersible formulation"
        ],
        "adoption": [
          "Updated treatment guidelines and job aids",
          "Health-worker training (3-drug regimen)"
        ],
        "research": { "lead": "MORU / DeTACT consortium", "geographies": "Multi-site, Africa and Asia (DeTACT / FD-TACT trials)", "timeline": "Phase III → 2025–26", "question": "Safety, efficacy and adherence of co-formulated ALAQ at scale" },
        "country": { "registered": 0, "inGuidelines": 0, "inMft": 0, "forecastDemand": "—" },
        "volume": null,
        "volumeNote": "Pre-launch — no procurement yet",
        "milestones": [
          { "milestone": "Dose-optimization of co-formulation", "status": "done", "label": "Complete", "date": "Published 2025", "next": "—", "anticipated": "—", "source": "Clin Pharmacol Ther (2025)" },
          { "milestone": "Pivotal Phase III (FD-TACT)", "status": "prog", "label": "In progress", "date": "First patient Sep 2025", "next": "Results", "anticipated": "2026", "source": "MORU / FD-TACT" },
          { "milestone": "SRA/WLA submission", "status": "idle", "label": "Not started", "date": "—", "next": "Dossier preparation", "anticipated": "~2027", "source": "" },
          { "milestone": "WHO PQ listing", "status": "idle", "label": "Not started", "date": "—", "next": "EOI listing, then dossier", "anticipated": "~2027", "source": "WHO PADO malaria, Jun 2025" }
        ]
      }
    },
    {
      "id": "pyramax",
      "name": "ASPY",
      "inn": "Pyronaridine–artesunate (Pyramax)",
      "manufacturer": "Shin Poong Pharmaceutical · MMV",
      "class": "market",
      "classLabel": "Recommended · underutilized",
      "phase": "access",
      "currentStage": 5,
      "flag": "Adoption is the current access barrier — strongly recommended by WHO since 2022 and on the country access map in 13 countries with a reliable source, but national guideline inclusion remains limited",
      "barrier": "National guideline inclusion is limited",
      "stages": [
        { "status": "done", "note": "Development complete (Shin Poong / MMV co-development)", "date": "", "next": "", "nextDate": "", "source": "MMV", "asOf": "2026-08-14" },
        { "status": "done", "note": "EMA positive scientific opinion (Article 58/EU-M4all, 16 Feb 2012); label updated 2025 to include treatment of pregnant women (EMA outcome 5 Jun 2025; announced 31 Jul 2025)", "date": "2012 (label update 2025)", "next": "", "nextDate": "", "source": "EMA EU-M4all opinions table; MMV, 31 Jul 2025", "asOf": "2026-08-22" },
        { "status": "done", "note": "Strong recommendation in revised WHO Guidelines for malaria", "date": "2022", "next": "", "nextDate": "", "source": "WHO Guidelines for malaria; MMV", "asOf": "2026-08-14" },
        { "status": "done", "note": "WHO PQ list carries tablets and granules as EMA-Art.-58 alternative listings (refs H-W-2319-2/-3)", "date": "2012–2016", "next": "", "nextDate": "", "source": "WHO PQ list of prequalified medicines (extract 22 Aug 2026)", "asOf": "2026-08-22" },
        { "status": "prog", "note": "Confirmed in five national registers so far: Tanzania — 2 registrations (TMDA, issued 8 Mar 2022, Registered/Compliant); Nigeria — granules B4-9425 (NAFDAC Greenbook, approved 28 Feb 2024, Active); Rwanda — tablets and granules (Rwanda FDA, 17 Aug 2024, valid); Zambia — tablets ZAMRA-HM-25-239 (11 Jul 2025, Registered/Compliant); Viet Nam — 2 registrations (DAV, first 27 Dec 2013, valid)", "date": "Rolling", "next": "Verify remaining countries against national registers", "nextDate": "TBC", "source": "NAFDAC, TMDA, Rwanda FDA, ZAMRA and DAV registers", "asOf": "2026-10-05" },
        { "status": "late", "note": "National guideline inclusion lags WHO's 2022 strong recommendation — Ghana introduced artesunate-pyronaridine as an alternate first-line ACT in 2022 (its third, alongside AS-AQ and AL), but this remains the only confirmed national guideline adoption found; broader inclusion is the core adoption gap LAUNCH is tracking", "date": "Ghana only (2022)", "next": "Country guideline committee reviews", "nextDate": "TBC", "source": "Peer-reviewed therapeutic-efficacy study, Ghana 2023 (published 2026); LAUNCH assessment (draft)", "asOf": "2026-09-08" },
        { "status": "prog", "note": "Global Fund procurement 2018–2025: 940,111 packs / US$14.5m — modest overall, but US$11.6m of it landed in 2025 (led by Uganda and Burkina Faso), a sharp uptick consistent with early MFT rollouts", "date": "Since 2018", "next": "Verify 2025 surge holds in next quarterly PQR extract", "nextDate": "Q4 2026", "source": "Global Fund PQR Transaction Summary (extract 23 Aug 2026)", "asOf": "2026-08-23" },
        { "status": "idle", "note": "Routine delivery limited; concentrated in pilot and study settings", "date": "", "next": "", "nextDate": "" }
      ],
      "detail": {
        "price": { "value": "TBC", "note": "Global Fund reference pricing to be displayed once confirmed for release; PQR transaction prices vary by pack presentation", "source": "", "confirmedInWriting": false, "asOf": "2026-08-23" },
        "useCase": "First-line diversification / MFT component; paediatric granules available; label includes pregnant women (2025 update).",
        "access": [
          "WHO PQ held for tablets and paediatric granules",
          "Registration confirmed in five national registers so far: Nigeria, Rwanda, Tanzania, Viet Nam and Zambia",
          "Co-developed with MMV under access-oriented partnership"
        ],
        "adoption": [
          "Guideline inclusion and case-management training",
          "No cold chain or special administration needs"
        ],
        "research": { "lead": "MMV and partners", "geographies": "Ghana, Vietnam, Burkina Faso and others (efficacy studies)", "timeline": "Ongoing", "question": "MFT deployment models with pyronaridine–artesunate" },
        "country": { "registered": 13, "inGuidelines": 11, "inMft": 4, "forecastDemand": "TBC" },
        "countries": {
          "status": "verified",
          "note": "Every country listed is cited to a national medicines regulator's own register, a WHO publication or a peer-reviewed paper. Each entry's \"sources\" are ids in data/sources.js and \"checked\" is the date they were verified; \"mft\" says whether an MFT plan is a pilot, planned or national. Countries without such a source are left out and show No data. MMV's product map, meeting slides and news reports are not used. Rule agreed 5 Oct 2026; replaces the illustrative subset.",
          "list": [
            { "iso3": "NGA", "level": "mft", "mft": "planned", "sources": ["who-mft-guide", "nafdac", "who-wmr-annex-4b"], "checked": "2026-10-05", "note": "WHO MFT guide: planned pilot, 40% ASPY in the SMC states" },
            { "iso3": "RWA", "level": "mft", "mft": "national", "sources": ["bmjgh-rwanda-mft", "who-mft-guide", "rwanda-fda"], "checked": "2026-10-05", "note": "ASPY assigned to the western region" },
            { "iso3": "BFA", "level": "mft", "mft": "pilot", "sources": ["malariaj-burkina-mft", "who-wmr-annex-4b"], "checked": "2026-10-05", "note": "Kaya district pilot with ASPY, DHA-PPQ and AL; first-line in national policy" },
            { "iso3": "KEN", "level": "mft", "mft": "pilot", "sources": ["malariaj-kenya-mft"], "checked": "2026-10-05", "note": "Homa Bay pilot, June 2020 to June 2022" },
            { "iso3": "GHA", "level": "guidelines", "sources": ["frontiers-ghana-tes"], "checked": "2026-10-05", "note": "First-line since 2022, alongside AS-AQ and AL; not yet in the WHO 2024 policy table" },
            { "iso3": "VNM", "level": "guidelines", "sources": ["who-wmr-annex-4b", "dav"], "checked": "2026-10-05", "note": "Listed for unconfirmed (untested) P. falciparum" },
            { "iso3": "COD", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "CMR", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "THA", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "KOR", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05", "note": "WHO writes \"PY\"; read as pyronaridine-artesunate" },
            { "iso3": "SSD", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05", "note": "P. vivax treatment only" },
            { "iso3": "TZA", "level": "registered", "sources": ["tmda"], "checked": "2026-10-05" },
            { "iso3": "ZMB", "level": "registered", "sources": ["zamra"], "checked": "2026-10-05" }
          ]
        },
        "journey": [
          { "label": "EMA Article 58 positive opinion", "year": 2012 },
          { "label": "WHO PQ listing (tablets)", "year": 2012 },
          { "label": "Paediatric granules prequalified", "year": 2016 },
          { "label": "WHO strong recommendation", "year": 2022 },
          { "label": "Broad national guideline inclusion", "year": "TBC" }
        ],
        "volume": {
          "total": "940,111 packs · US$14.5m (2018–2025)",
          "period": "Global Fund PQR transactions, 2018–2025 (68 orders; US$11.6m in 2025 alone; top buyers Uganda, Burkina Faso, Ghana)",
          "split": [
            { "channel": "Global Fund (PQR-recorded)", "pct": 100 }
          ],
          "source": "Global Fund PQR Transaction Summary, extract 23 Aug 2026 — sourcing/staging/procurement_transactions.csv. Covers Global Fund-financed procurement only; US PMI data unavailable post-2025 (GHSC-PSM dataset offline). Recent quarters incomplete due to PQR reporting lag."
        },
        "milestones": [
          { "milestone": "SRA approval (EMA Art. 58)", "status": "done", "label": "Complete", "date": "16 Feb 2012", "next": "—", "anticipated": "—", "source": "EMA EU-M4all opinions table" },
          { "milestone": "WHO PQ listing", "status": "done", "label": "Complete", "date": "2012–2016", "next": "—", "anticipated": "—", "source": "WHO PQ list" },
          { "milestone": "WHO recommendation (strong)", "status": "done", "label": "Complete", "date": "2022", "next": "—", "anticipated": "—", "source": "WHO Guidelines for malaria" },
          { "milestone": "Label update — pregnancy", "status": "done", "label": "Complete", "date": "EMA outcome 5 Jun 2025", "next": "—", "anticipated": "—", "source": "EMA EU-M4all opinions table; MMV, 31 Jul 2025" },
          { "milestone": "Country registrations", "status": "prog", "label": "5 countries register-confirmed", "date": "Rolling (VNM 2013, TZA 2022, NGA 2024, RWA 2024, ZMB 2025)", "next": "Verify remaining countries against national registers", "anticipated": "TBC", "source": "NAFDAC, TMDA, Rwanda FDA, ZAMRA and DAV registers (5 Oct 2026)" },
          { "milestone": "National guideline inclusion", "status": "late", "label": "Ghana only — 1 country confirmed", "date": "Ghana, 2022", "next": "Committee reviews in other endemic countries", "anticipated": "TBC", "source": "Peer-reviewed therapeutic-efficacy study, Ghana 2023 (published 2026)" },
          { "milestone": "Procurement scale-up", "status": "prog", "label": "940k packs (GF, to 2025)", "date": "US$11.6m in 2025", "next": "Verify surge in next PQR extract", "anticipated": "Q4 2026", "source": "Global Fund PQR (extract 23 Aug 2026)" }
        ]
      }
    },
    {
      "id": "dhappq",
      "name": "DHA–PPQ",
      "inn": "Dihydroartemisinin–piperaquine",
      "manufacturer": "Alfasigma (Eurartesim) · Guilin · Beijing Holley (PQ'd suppliers)",
      "class": "market",
      "classLabel": "Recommended · underutilized",
      "phase": "access",
      "currentStage": 6,
      "flag": "Procurement is the current access barrier — 0.9–4.5% of Global Fund antimalarial spend 2022–24 despite a WHO recommendation dating to 2010, though 2025 orders surged (PQR, reporting still incomplete)",
      "barrier": "Only 0.9–4.5% of Global Fund spend, 2022–24",
      "stages": [
        { "status": "done", "note": "Development complete", "date": "", "next": "", "nextDate": "", "source": "MMV", "asOf": "2026-08-14" },
        { "status": "done", "note": "EMA approval (Eurartesim)", "date": "2011", "next": "", "nextDate": "", "source": "EMA register", "asOf": "2026-08-14" },
        { "status": "done", "note": "WHO-recommended ACT for uncomplicated malaria — added as the fifth recommended ACT in the 2010 second-edition treatment guidelines; reaffirmed 2015", "date": "2010 guidelines (2nd ed.)", "next": "", "nextDate": "", "source": "WHO Guidelines for the treatment of malaria, 2nd ed. (2010); WHO news, 10 Dec 2010", "asOf": "2026-08-23" },
        { "status": "done", "note": "Nine PQ'd presentations across three manufacturers — Alfasigma (2015, requal. Jan 2025), Guilin (2019–2020, incl. dispersible paediatric), Beijing Holley (2023) — real supply security", "date": "2015–2023; requal. 20 Jan 2025", "next": "", "nextDate": "", "source": "WHO PQ list of prequalified medicines (extract 22 Aug 2026)", "asOf": "2026-08-22" },
        { "status": "done", "note": "Registered widely; adopted as first-line in several Southeast Asian countries. Register-verified so far: Tanzania — 10 presentations across four manufacturers (Guilin D-ARTEPP incl. paediatric dispersible, KBN-Zhejiang Duo-Cotecxin, Ajanta Ridmal), all Registered/Compliant; Nigeria — 47 presentations, but only 26 Active (22 lapsed — registrations not being maintained, itself an underuse signal)", "date": "Rolling", "next": "Verify remaining countries against national registers", "nextDate": "TBC", "source": "MMV / WHO; NAFDAC Greenbook + TMDA IMIS2 registers (extracts 23 Aug 2026)", "asOf": "2026-08-23" },
        { "status": "prog", "note": "First-line in several SE Asian countries; consideration in African MFT strategies growing; verified country counts pending", "date": "", "next": "MFT strategy decisions", "nextDate": "TBC", "source": "LAUNCH assessment (draft)", "asOf": "2026-08-14" },
        { "status": "late", "note": "Global Fund procurement held at 0.9–4.5% of antimalarial spend 2022–24 (US$41.5m / 11.5m packs cumulative since 2008) — chronic underuse; 2025 shows a sharp uptick (US$15.3m, led by Uganda, Madagascar, Mozambique) that needs confirming as reporting completes", "date": "Since 2008", "next": "Verify 2025 surge holds in next quarterly PQR extract", "nextDate": "Q4 2026", "source": "Global Fund PQR Transaction Summary (extract 23 Aug 2026)", "asOf": "2026-08-23" },
        { "status": "prog", "note": "Routine use concentrated in Southeast Asia and chemoprevention niches", "date": "", "next": "", "nextDate": "", "source": "LAUNCH assessment (draft)", "asOf": "2026-08-14" }
      ],
      "detail": {
        "price": { "value": "TBC", "note": "Pooled procurement reference pricing to be displayed once confirmed for release; PQR median pack price ≈ US$1.70 across presentations (indicative only — pack sizes vary)", "source": "", "confirmedInWriting": false, "asOf": "2026-08-23" },
        "useCase": "MFT rotation partner; mass drug administration and chemoprevention niches; once-daily dosing.",
        "access": [
          "Nine PQ'd presentations across three manufacturers (Alfasigma, Guilin, Beijing Holley) — supply security via diversity",
          "No single-source dependency",
          "Established API supply chains"
        ],
        "adoption": [
          "ECG guidance for specific risk groups in some guidelines",
          "Otherwise standard ACT case-management training"
        ],
        "research": { "lead": "Multiple academic consortia", "geographies": "Ghana, Mozambique, SE Asia (efficacy and MFT studies)", "timeline": "Ongoing", "question": "MFT rotation sequencing and resistance impact" },
        "country": { "registered": 15, "inGuidelines": 13, "inMft": 4, "forecastDemand": "TBC" },
        "countries": {
          "status": "verified",
          "note": "Every country listed is cited to a national medicines regulator's own register, a WHO publication or a peer-reviewed paper. Each entry's \"sources\" are ids in data/sources.js and \"checked\" is the date they were verified; \"mft\" says whether an MFT plan is a pilot, planned or national. Countries without such a source are left out and show No data. MMV's product map, meeting slides and news reports are not used. Rule agreed 5 Oct 2026; replaces the illustrative subset.",
          "list": [
            { "iso3": "NGA", "level": "mft", "mft": "planned", "sources": ["who-mft-guide", "nafdac", "who-wmr-annex-4b"], "checked": "2026-10-05", "note": "WHO MFT guide: planned pilot, 40% DHA-PPQ in the SMC states" },
            { "iso3": "RWA", "level": "mft", "mft": "national", "sources": ["bmjgh-rwanda-mft", "who-mft-guide", "rwanda-fda"], "checked": "2026-10-05", "note": "DHA-PPQ assigned to the eastern and central regions" },
            { "iso3": "BFA", "level": "mft", "mft": "pilot", "sources": ["malariaj-burkina-mft", "who-wmr-annex-4b"], "checked": "2026-10-05", "note": "Kaya district pilot with ASPY, DHA-PPQ and AL; first-line in national policy" },
            { "iso3": "KEN", "level": "mft", "mft": "pilot", "sources": ["malariaj-kenya-mft"], "checked": "2026-10-05", "note": "Homa Bay pilot, June 2020 to June 2022" },
            { "iso3": "TZA", "level": "guidelines", "sources": ["tmda", "who-wmr-annex-4b"], "checked": "2026-10-05", "note": "Mainland policy; Zanzibar's own row does not list it" },
            { "iso3": "VNM", "level": "guidelines", "sources": ["who-wmr-annex-4b", "dav"], "checked": "2026-10-05" },
            { "iso3": "THA", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "IDN", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "GHA", "level": "guidelines", "sources": ["who-wmr-annex-4b", "frontiers-ghana-tes"], "checked": "2026-10-05", "note": "Listed for untested P. falciparum and P. vivax; second-line nationally" },
            { "iso3": "AGO", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "CMR", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "GAB", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05" },
            { "iso3": "PNG", "level": "guidelines", "sources": ["who-wmr-annex-4b"], "checked": "2026-10-05", "note": "Severe malaria only" },
            { "iso3": "ZMB", "level": "registered", "sources": ["zamra"], "checked": "2026-10-05" },
            { "iso3": "ZWE", "level": "registered", "sources": ["mcaz"], "checked": "2026-10-05" }
          ]
        },
        "journey": [
          { "label": "WHO recommendation", "year": 2010 },
          { "label": "EMA approval (Eurartesim)", "year": 2011 },
          { "label": "WHO PQ listing", "year": 2015 },
          { "label": "Broad procurement uptake", "year": "TBC" }
        ],
        "volume": {
          "total": "11,493,039 packs · US$41.5m (2008–2026)",
          "period": "Global Fund PQR transactions, 2008–2026 (234 orders; US$15.3m in 2025; top buyers Uganda, Madagascar, Mozambique)",
          "split": [
            { "channel": "Global Fund (PQR-recorded)", "pct": 100 }
          ],
          "source": "Global Fund PQR Transaction Summary, extract 23 Aug 2026 — sourcing/staging/procurement_transactions.csv. Covers Global Fund-financed procurement only; US PMI data unavailable post-2025 (GHSC-PSM dataset offline). Recent quarters incomplete due to PQR reporting lag."
        },
        "milestones": [
          { "milestone": "WHO recommendation", "status": "done", "label": "Complete", "date": "2010 (2nd ed.; reaffirmed 2015)", "next": "—", "anticipated": "—", "source": "WHO Guidelines for the treatment of malaria, 2nd ed. (2010)" },
          { "milestone": "SRA approval (EMA, Eurartesim)", "status": "done", "label": "Complete", "date": "2011", "next": "—", "anticipated": "—", "source": "EMA register" },
          { "milestone": "WHO PQ listing (Eurartesim)", "status": "done", "label": "Complete", "date": "9 Oct 2015", "next": "—", "anticipated": "—", "source": "WHO PQ list" },
          { "milestone": "WHO PQ requalification", "status": "done", "label": "Complete", "date": "20 Jan 2025", "next": "—", "anticipated": "—", "source": "WHO PQ list" },
          { "milestone": "Additional PQ'd suppliers", "status": "done", "label": "9 presentations · 3 makers", "date": "2015–2023", "next": "—", "anticipated": "—", "source": "WHO PQ list (extract 22 Aug 2026)" },
          { "milestone": "Register verification (NGA, TZA)", "status": "done", "label": "TZA 10 compliant · NGA 26/47 active", "date": "Extracts 23 Aug 2026", "next": "Further countries", "anticipated": "TBC", "source": "NAFDAC Greenbook; TMDA IMIS2" },
          { "milestone": "National guideline inclusion", "status": "prog", "label": "Counts TBC", "date": "—", "next": "MFT strategy decisions", "anticipated": "TBC", "source": "LAUNCH assessment (draft)" },
          { "milestone": "Procurement scale-up", "status": "late", "label": "US$41.5m since 2008", "date": "US$15.3m in 2025", "next": "Verify surge in next PQR extract", "anticipated": "Q4 2026", "source": "Global Fund PQR (extract 23 Aug 2026)" }
        ]
      }
    }
  ]
}
