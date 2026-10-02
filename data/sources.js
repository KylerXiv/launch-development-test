// LAUNCH dashboard source registry.
// Everything after the assignment on the marker line below must be STRICT JSON
// (double quotes, no comments, no trailing commas) — run
// `node scripts/validate-data.js` after every edit; it refuses anything malformed.
//
// One entry per source the dashboard draws on. The Sources footer on
// illustrated-journey-dashboard.html is rendered from this file — do not
// hand-edit that list any more.
//
// Fields:
//   "id"          stable key; stage citations in data/products.js point at it
//   "title"       the source's own name, as its publisher writes it
//   "label"       the short name shown on the page (the formal title is too
//                 long for a two-column footer); falls back to "title"
//   "org"         who publishes it (not who funds or cites it)
//   "category"    what kind of source it is
//   "group"       "data"     — a register, database or feed a figure comes from
//                 "document" — a one-off paper, report or announcement
//   "url"         null where no public URL exists (see pmi, manufacturer)
//   "alsoSee"     related official links shown alongside the main one
//   "year"        publication year, or a description for living documents
//   "products"    ["all"] or specific product ids from data/products.js
//   "plain"       the one line shown on the public page — plain English
//   "collection"  how the data reaches us TODAY, not how it could:
//                 "automated" a fetcher runs on a schedule (scripts/fetch-*.js)
//                 "manual"    a person downloads or reads it
//                 "static"    a fixed document; nothing to re-check
//                 "blocked"   automation attempted and refused by the source
//                 "none"      no public feed exists at all
//   "public"      shown in the Sources footer
//   "findings"    internal — what it says, and what we know about using it
//   "relevance"   internal — why LAUNCH/Unitaid carries it. NOT published.
//   "checked"     date the URL and metadata were last verified (YYYY-MM-DD)
//
window.LAUNCH_SOURCES =
{
  "meta": {
    "lastUpdated": "2026-09-21",
    "note": "Verified against each publisher 21 September 2026. 'findings' and 'relevance' are internal and are not rendered on the public page."
  },
  "sources": [
    {
      "id": "who-guidelines",
      "label": "WHO malaria guidelines",
      "title": "WHO Guidelines for Malaria",
      "org": "World Health Organization",
      "category": "Policy / guidelines",
      "group": "data",
      "url": "https://www.who.int/teams/global-malaria-programme/guidelines-for-malaria",
      "alsoSee": [
        { "label": "WHO's publication record for it", "url": "https://www.who.int/publications/i/item/guidelines-for-malaria" }
      ],
      "year": "Living guideline — current version 13 August 2025",
      "products": ["all"],
      "plain": "Which medicines the World Health Organization recommends, and from when.",
      "collection": "manual",
      "public": true,
      "findings": "Living guideline, revised one to three times a year, so a fixed publication year goes stale silently. Current version confirmed 2026-09-21 via the MAGICapp API (guideline 10462): \"WHO guidelines for malaria - 13 August 2025\", last edited 2 September 2025. That API is free and needs no key, so a version watcher is buildable and is not yet built.",
      "relevance": "The gate every product passes at the WHO recommendation stage; DHA-PPQ is recommended first- and second-line for uncomplicated P. falciparum with long post-treatment prophylaxis.",
      "checked": "2026-09-21"
    },
    {
      "id": "who-pq-fpp",
      "label": "WHO prequalification list",
      "title": "WHO list of prequalified finished pharmaceutical products",
      "org": "WHO Prequalification Unit",
      "category": "Regulatory / quality",
      "group": "data",
      "url": "https://extranet.who.int/prequal/medicines/prequalified/finished-pharmaceutical-products",
      "alsoSee": [
        { "label": "Prevention tools are on a separate list", "url": "https://extranet.who.int/prequal/vector-control-products/prequalified-product-list" }
      ],
      "year": "Continuous",
      "products": ["all"],
      "plain": "The medicines WHO has checked for quality, safety and effectiveness.",
      "collection": "automated",
      "public": true,
      "findings": "Fetched monthly by scripts/fetch-regulatory.js. CSV headers drift between editions; suspensions and delistings are published as separate notices, so the pipeline snapshots and diffs rather than trusting the current file.",
      "relevance": "Quality-assured supply is a precondition for donor procurement.",
      "checked": "2026-09-21"
    },
    {
      "id": "who-threat-maps",
      "label": "WHO Malaria Threats Map",
      "title": "WHO Malaria Threats Map",
      "org": "WHO Global Malaria Programme",
      "category": "Surveillance database",
      "group": "data",
      "url": "https://apps.who.int/malaria/maps/threats/",
      "alsoSee": [
        { "label": "The same study results as a searchable database", "url": "https://www.who.int/teams/global-malaria-programme/case-management/drug-efficacy-and-resistance/antimalarial-drug-efficacy-database" }
      ],
      "year": "Continuous; major refresh around the World Malaria Report",
      "products": ["all"],
      "plain": "Where malaria is becoming harder to treat. Its drug-resistance study results are not reproduced on this page — open the map to explore them.",
      "collection": "manual",
      "public": true,
      "findings": "Until 1 Oct 2026 its therapeutic efficacy study (TES) and molecular-marker extracts fed the map's resistance layers (data/resistance.js, data/molecular-markers.js); those layers were removed and the page now links here instead. The antimalarial drug efficacy database under alsoSee is the same data with a different front door — it is not a second source. The ArcGIS service underneath both is documented as unstable; do not build automation on it.",
      "relevance": "Tracks PCR-corrected cure rates and molecular resistance markers, including plasmepsin 2/3 duplications; underpins treatment policy transitions.",
      "checked": "2026-09-21"
    },
    {
      "id": "ema",
      "label": "European Medicines Agency",
      "title": "European Medicines Agency medicine data",
      "org": "European Medicines Agency",
      "category": "Regulatory / quality",
      "group": "data",
      "url": "https://www.ema.europa.eu/en/medicines/download-medicine-data",
      "year": "Updated nightly",
      "products": ["all"],
      "plain": "European approval decisions, including its opinions on medicines meant for use outside Europe.",
      "collection": "automated",
      "public": true,
      "findings": "Fetched monthly by scripts/fetch-regulatory.js, which reads the EU-M4all (Article 58) opinions table. Column names were revamped in 2023 — pin them per snapshot.",
      "relevance": "The EU-M4all route is how several of these medicines obtained a stringent-authority opinion without a European market.",
      "checked": "2026-09-21"
    },
    {
      "id": "nafdac",
      "label": "Nigeria: NAFDAC Green Book",
      "title": "NAFDAC Green Book",
      "org": "National Agency for Food and Drug Administration and Control (Nigeria)",
      "category": "National register",
      "group": "data",
      "url": "https://greenbook.nafdac.gov.ng/",
      "year": "Continuous",
      "products": ["all"],
      "plain": "The national register of every medicine approved for sale in Nigeria.",
      "collection": "automated",
      "public": true,
      "findings": "Fetched monthly by scripts/fetch-nafdac.js. 48 portfolio registrations at first snapshot, 22 of them lapsed. Plain HTTP only — the host's HTTPS hangs after handshake.",
      "relevance": "Ground truth for the country access map's registered level in Nigeria, the largest malaria burden country.",
      "checked": "2026-09-21"
    },
    {
      "id": "tmda",
      "label": "Tanzania: TMDA register",
      "title": "TMDA register of medicines",
      "org": "Tanzania Medicines and Medical Devices Authority",
      "category": "National register",
      "group": "data",
      "url": "https://imis2.tmda.go.tz/portal/#/public/registered-medicines",
      "year": "Continuous",
      "products": ["all"],
      "plain": "The national register of every medicine approved for sale in Tanzania.",
      "collection": "automated",
      "public": true,
      "findings": "Fetched monthly by scripts/fetch-tmda.js. 12 portfolio registrations at first snapshot, all compliant.",
      "relevance": "Ground truth for the country access map's registered level in Tanzania.",
      "checked": "2026-09-21"
    },
    {
      "id": "rwanda-fda",
      "label": "Rwanda: Rwanda FDA register",
      "title": "Rwanda FDA register of registered pharmaceutical products",
      "org": "Rwanda Food and Drugs Authority",
      "category": "National register",
      "group": "data",
      "url": "https://rwandafda.gov.rw/register/monitoring_preview_register",
      "year": "Continuous",
      "products": ["dhappq", "pyramax"],
      "plain": "The national register of every medicine approved for sale in Rwanda.",
      "collection": "manual",
      "public": true,
      "findings": "2,482 products on one page (5.25 MB, ~200s to download; no pagination and no separate data endpoint). Columns include Reg. Date and Expiry Date; dates are DD/MM/YYYY, confirmed by rows such as 23/05/2026. Portfolio matches on 2026-09-21: DHA-PPQ x3 — DIARTEM IG ADULT 120/960mg (Bliss GVS, reg. 12 May 2025, exp. 11 May 2030), DHA/PPQ 40/320mg (Bliss GVS, 22 Feb 2024), DHA/PPQ 40/320mg (Ajanta Pharma, 8 Jul 2023); ASPY x2 — pyronaridine tetraphosphate/artesunate 60/20mg and 180/60mg, both Shin Poong, reg. 17 Aug 2024, exp. 16 Aug 2029. No ALAQ or GanLum, as expected. A fetcher is feasible and not yet built.",
      "relevance": "Confirms national market authorisation and commercial availability in East Africa, informing country-level procurement and deployment strategies.",
      "checked": "2026-09-21"
    },
    {
      "id": "uganda-nda",
      "label": "Uganda: National Drug Register",
      "title": "National Drug Register",
      "org": "National Drug Authority (Uganda)",
      "category": "National register",
      "group": "data",
      "url": "https://www.nda.or.ug/drug-register/",
      "year": "Published as dated editions",
      "products": ["all"],
      "plain": "The national register of every medicine approved for sale in Uganda.",
      "collection": "blocked",
      "public": true,
      "findings": "Returns HTTP 403 to non-browser clients, on both the register page and the site's underlying WordPress API (checked 2026-09-21). Automation is not possible today; a person must download it. Portfolio contents not yet extracted.",
      "relevance": "Authoritative national regulatory tracking for antimalarial marketing authorisations in a high-burden country.",
      "checked": "2026-09-21"
    },
    {
      "id": "global-fund-pqr",
      "label": "Global Fund price and quality reporting",
      "title": "Global Fund Price and Quality Reporting",
      "org": "The Global Fund",
      "category": "Financing / procurement",
      "group": "data",
      "url": "https://insights.theglobalfund.org/t/Public/views/PriceQualityReportingTransactionSummary/TransactionSummary",
      "year": "Continuous; reporting lags months to a year",
      "products": ["all"],
      "plain": "What was actually bought for countries — how many packs, at what price, in which year.",
      "collection": "manual",
      "public": true,
      "findings": "Tableau workbook; scripted export is confirmed blocked by the server's WAF, so the crosstab is downloaded by hand and run through scripts/normalize-pqr.js. Self-reported and lagging — treat recent quarters as incomplete.",
      "relevance": "The only transaction-level public record of price and volume actually paid.",
      "checked": "2026-09-21"
    },
    {
      "id": "clinicaltrials",
      "label": "ClinicalTrials.gov",
      "title": "ClinicalTrials.gov",
      "org": "US National Library of Medicine",
      "category": "Clinical evidence",
      "group": "data",
      "url": "https://clinicaltrials.gov/",
      "year": "Updated daily",
      "products": ["all"],
      "plain": "Trial records: how many people took part, when a trial finished, and what it found.",
      "collection": "automated",
      "public": true,
      "findings": "Fetched weekly by scripts/fetch-trials.js via API v2. Sponsor-entered statuses can be stale; slipped completion dates are an early bottleneck warning.",
      "relevance": "The primary trial feed for every product in the portfolio.",
      "checked": "2026-09-21"
    },
    {
      "id": "wwarn-iddo",
      "label": "WWARN / IDDO malaria data",
      "title": "WWARN / IDDO malaria data repository",
      "org": "WorldWide Antimalarial Resistance Network / Infectious Diseases Data Observatory",
      "category": "Surveillance database",
      "group": "data",
      "url": "https://www.iddo.org/wwarn/access-malaria-data",
      "year": "Continuous; lags the literature 6-12 months",
      "products": ["all"],
      "plain": "Pooled results from many separate studies of how well antimalarials still work.",
      "collection": "manual",
      "public": true,
      "findings": "Curated repository of standardised individual patient clinical and molecular data. Only published aggregates are usable to us: patient-level data sits behind IDDO's Data Access Committee under a data use agreement and cannot be redistributed. Literature-derived, so it overlaps who-threat-maps — neither is a superset of the other.",
      "relevance": "Informs resistance mitigation investment, dose optimisation and policy transitions through pooled efficacy evidence.",
      "checked": "2026-09-21"
    },
    {
      "id": "who-eml",
      "label": "WHO Essential Medicines List",
      "title": "WHO Model List of Essential Medicines, 23rd list",
      "org": "World Health Organization",
      "category": "Policy / guidelines",
      "group": "data",
      "url": "https://www.who.int/publications/i/item/WHO-MHP-HPS-EML-2023.02",
      "alsoSee": [
        { "label": "The current electronic list", "url": "https://list.essentialmeds.org/" }
      ],
      "year": "2023",
      "products": ["all"],
      "plain": "WHO's list of the medicines every health system should be able to supply.",
      "collection": "manual",
      "public": true,
      "findings": "This URL is the 23rd list (2023). A 2025 Model List has since been published and is what the electronic EML now serves, so citing the 2023 edition means citing a superseded list — confirm which edition should be carried. No public API; export by hand per release (biennial, next revision 2027). Licence is CC BY 3.0 IGO, with no non-commercial clause.",
      "relevance": "Listing supports drug rotation policies that delay resistance to dominant artemether-lumefantrine.",
      "checked": "2026-09-21"
    },
    {
      "id": "who-pq-comparators",
      "label": "WHO PQ comparator products",
      "title": "Recommended comparator products: antimalarial medicines",
      "org": "WHO Prequalification Unit",
      "category": "Regulatory / quality",
      "group": "document",
      "url": "https://extranet.who.int/prequal/key-resources/documents/recommended-comparator-products-antimalarial-medicines",
      "year": "2024",
      "products": ["all"],
      "plain": "The reference products a generic must be tested against before WHO will list it.",
      "collection": "static",
      "public": true,
      "findings": "Names the reference products used in antimalarial bioequivalence work. Not a list of prequalified formulations, and not product-specific to any one medicine in the portfolio.",
      "relevance": "Establishes the reference standard for generic bioequivalence studies, enabling generic market entry and competitive pricing.",
      "checked": "2026-09-21"
    },
    {
      "id": "who-pq-guidance",
      "label": "WHO prequalification guidance",
      "title": "WHO medicines prequalification guidance",
      "org": "WHO Prequalification Unit",
      "category": "Regulatory / quality",
      "group": "document",
      "url": "https://extranet.who.int/prequal/medicines/who-medicines-prequalification-guidance",
      "year": "Continuous",
      "products": ["all"],
      "plain": "WHO's rules for how a medicine gets prequalified.",
      "collection": "static",
      "public": true,
      "findings": "Process guidance, not data. In the source sheet this row carried the comparator list's title; the two are different documents and are separated here.",
      "relevance": "Sets out the quality benchmark manufacturers must meet to enter donor-funded supply chains.",
      "checked": "2026-09-21"
    },
    {
      "id": "whopar-ma140",
      "label": "WHO assessment report: DHA–PPQ (Guilin)",
      "title": "WHOPAR: dihydroartemisinin/piperaquine phosphate 80mg/640mg tablets (Guilin), MA140 Part 7",
      "org": "WHO Prequalification Unit",
      "category": "Regulatory / quality",
      "group": "document",
      "url": "https://extranet.who.int/prequal/sites/default/files/whopar_files/MA140Part7.pdf",
      "year": "2026",
      "products": ["dhappq"],
      "plain": "WHO's published assessment of one prequalified dihydroartemisinin-piperaquine product.",
      "collection": "static",
      "public": true,
      "findings": "Public assessment report, dated March 2026. Guilin Pharmaceutical submitted the dossier in 2017; MA140 was prequalified 2019-11-19 and already appears in our WHO PQ snapshots mapped to dhappq. WHOPAR URLs follow the pattern <ref>Part7.pdf, but not every reference has one — MA211 (prequalified Aug 2026) returns 404 — so links must be probed per product rather than assumed.",
      "relevance": "Evidence of the international quality benchmark behind DHA-PPQ procurement.",
      "checked": "2026-09-21"
    },
    {
      "id": "mmv-pipeline",
      "label": "MMV pipeline: ganaplacide–lumefantrine",
      "title": "MMV pipeline: ganaplacide + lumefantrine",
      "org": "Medicines for Malaria Venture",
      "category": "R&D pipeline",
      "group": "data",
      "url": "https://www.mmv.org/mmv-pipeline-antimalarial-drugs/ganaplacide-lumefantrine",
      "year": "Rolling",
      "products": ["ganlum"],
      "plain": "Where each medicine still in development has got to, from the non-profit that co-develops many of them.",
      "collection": "static",
      "public": true,
      "findings": "Next-generation combination targeting asexual blood stages and gametocytes for transmission blocking. Stage placements lag the MMV newsroom — check both. The sourcing plan records mmv.org as blocking robots; it served a normal request on 2026-09-21, so that may have changed.",
      "relevance": "Informs future procurement planning for programmes facing partner-drug resistance.",
      "checked": "2026-09-21"
    },
    {
      "id": "mesa-landscape",
      "label": "MESA malaria medicines landscape",
      "title": "Malaria medicines landscape",
      "org": "MESA (Malaria Eradication Scientific Alliance)",
      "category": "Market intelligence",
      "group": "document",
      "url": "https://mesamalaria.org/resource-hub/malaria-medicines-landscape/",
      "year": "2023",
      "products": ["all"],
      "plain": "An independent overview of which malaria medicines exist and who makes them.",
      "collection": "static",
      "public": true,
      "findings": "Published by MESA, not by Unitaid — the source sheet attributed this page to Unitaid and titled it as a Unitaid market-dynamics report. Corrected here, because the dashboard carries the Unitaid mark and must not appear to claim another organisation's work.",
      "relevance": "Context on manufacturing volume, supply diversification and affordability across artemether/lumefantrine and amodiaquine combinations.",
      "checked": "2026-09-21"
    },
    {
      "id": "novartis-kaluma",
      "label": "Novartis: GanLum Phase III results",
      "title": "Novartis Phase III trial of KLU156 (GanLum) meets primary endpoint",
      "org": "Novartis",
      "category": "Clinical trial results",
      "group": "document",
      "url": "https://www.novartis.com/news/media-releases/novartis-phase-iii-trial-next-generation-malaria-treatment-klu156-ganlum-meets-primary-endpoint-potential-combat-antimalarial-resistance",
      "year": "2025",
      "products": ["ganlum"],
      "plain": "The manufacturer's announcement of GanLum's Phase III results.",
      "collection": "static",
      "public": true,
      "findings": "Announced 12 November 2025: non-inferiority to Coartem, 97.4% PCR-corrected cure rate. This is the announcement already cited behind GanLum's R&D and regulatory stage notes; registry record is NCT05842954.",
      "relevance": "Pipeline non-ACT candidate against artemisinin partial resistance; once-daily three-day granule formulation needing no separate paediatric development.",
      "checked": "2026-09-21"
    },
    {
      "id": "plos-aspy-cem",
      "label": "PLOS Medicine: ASPY in routine use",
      "title": "Pyronaridine-artesunate real-world safety, tolerability and effectiveness in malaria patients in 5 African countries",
      "org": "PLOS Medicine",
      "category": "Observational study",
      "group": "document",
      "url": "https://journals.plos.org/plosmedicine/article?id=10.1371/journal.pmed.1003669",
      "year": "2021",
      "products": ["pyramax"],
      "plain": "A study of how pyronaridine-artesunate performed in ordinary clinical use across five African countries.",
      "collection": "static",
      "public": true,
      "findings": "Single-arm, open-label cohort event monitoring study. Published 15 June 2021 in PLOS Medicine vol. 18 — the source sheet recorded 2024 and named MMV as publisher; PLOS is the publisher and 2021 the year.",
      "relevance": "Real-world safety evidence supporting adoption by national malaria control programmes and country deployment criteria.",
      "checked": "2026-09-21"
    },
    {
      "id": "frontiers-ghana-tes",
      "label": "Frontiers: Ghana efficacy study, 2023",
      "title": "Therapeutic efficacy of dihydroartemisinin-piperaquine and artesunate-pyronaridine in uncomplicated P. falciparum malaria in Ghana, 2023",
      "org": "Frontiers in Public Health",
      "category": "Observational study",
      "group": "document",
      "url": "https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1715777/full",
      "year": "2026",
      "products": ["pyramax", "dhappq"],
      "plain": "A 2023 study in Ghana of how well two of these medicines still cure malaria there.",
      "collection": "static",
      "public": true,
      "findings": "Online 4 December 2025, issue date 5 January 2026. Reports that artesunate-pyronaridine is one of Ghana's first-line medicines since 2022, alongside AS-AQ and AL, with DHA-PPQ second-line. The WHO therapeutic efficacy extract behind data/resistance.js holds no Ghana rows after 2020, so this study is not represented on the resistance map; adding it would need a documented second input, since resistance.js must regenerate byte-identical from the WHO export.",
      "relevance": "Real-world clinical and policy adoption evidence for ASPY deployment and multi-first-line strategies.",
      "checked": "2026-09-21"
    },
    {
      "id": "pmi",
      "label": "US President's Malaria Initiative",
      "title": "US President's Malaria Initiative",
      "org": "US President's Malaria Initiative",
      "category": "Financing / procurement",
      "group": "data",
      "url": null,
      "year": "Frozen since early 2025",
      "products": ["all"],
      "plain": "Its public data portal closed in 2025, so US-funded purchases from that point on are a gap we cannot yet fill.",
      "collection": "none",
      "public": true,
      "findings": "pmi.gov is unreachable and the USAID data hub's DNS died after the 2025 dissolution. Order-level delivery data survives only in Wayback snapshots. This is the largest disclosed coverage gap in the dashboard.",
      "relevance": "Disclosing the gap is what keeps the procurement figures honest.",
      "checked": "2026-09-21"
    },
    {
      "id": "manufacturer",
      "label": "Manufacturer communications",
      "title": "Manufacturer communications",
      "org": "Product manufacturers",
      "category": "Manufacturer",
      "group": "data",
      "url": null,
      "year": "Ad hoc",
      "products": ["all"],
      "plain": "Company announcements, and figures a manufacturer has confirmed to us in writing. There is no public register for these.",
      "collection": "none",
      "public": true,
      "findings": "Pricing and volume figures appear only where the manufacturer has confirmed in writing that they may be shared — carried on the confirmedInWriting flag in data/products.js.",
      "relevance": "The only route to product-specific pricing, and the reason most price cells read TBC.",
      "checked": "2026-09-21"
    }
  ]
}
