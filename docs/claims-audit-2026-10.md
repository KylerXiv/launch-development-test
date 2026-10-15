# Product-card claims audit: GanLum, ALAQ, ASPY, DHA–PPQ

Prepared 15 October 2026 for the LAUNCH team and the reviewer who asked for it (partner feedback, "Oct 15 Feedback Emails", row 51).

**Status: for review. Nothing here has been applied to the page, with one exception.** The one exception, in PR #111 (`docs/illustrated-journey-ui-notes.md` §3.44): GanLum's use case no longer says "Novartis positions it… for MFT strategies". Novartis's 12 Nov 2025 release mentions no MFT, which was rechecked on 15 Oct 2026. The MFT framing is now attributed to LAUNCH. Every other "Proposed wording" below waits for a decision. Each claim is either reworded as proposed, or labelled with its category on the page, or both. That second choice is open.

Method: one research pass, 15 Oct 2026, reading primary sources (trial registries, journals, EMA, WHO PQ, company and MMV releases). "Verified" means that source was opened that day. "Carried" means the figure comes from this repo's own extracts and was not re-fetched.

**How to read this**

- **Categories.** These follow the reviewer's definitions:
  - *Manufacturer claim*: a statement by the company or developer that no one has independently verified.
  - *Published result*: a peer-reviewed or registry-reported trial result, with its endpoint.
  - *Intended positioning*: a plan for how the product will be used, not a fact.
  - *Regulatory conclusion*: a decision by EMA, WHO or a national regulator, such as an opinion, a PQ listing, a recommendation or a registration.
  - *LAUNCH assessment*: our own judgement. Some rows carry this extra label so the page does not present our view as someone else's.
- **Verification labels.**
  - *Verified*: I opened the primary source on 15 Oct 2026.
  - *Carried*: the figure comes from the repo's own extracts (PQR, national registers, WMR annex). It is consistent with them, but I did not check it again against the publisher.
- **Not a claim — keep** marks operational items that assert nothing checkable.

---

## 1. Priority 1: what GanLum trials actually measured

**Resistance ("kills resistant parasites").** No published trial endpoint supports this wording for the GanLum combination.

- **KALUMA (NCT05842954).** Resistance was not a registered endpoint. The registry lists no kelch13 or resistance outcome, and no results are posted (last update 27 Jan 2026).
  - Novartis and MMV said only that "additional analysis indicated the treatment was highly effective against mutant malaria parasites associated with partial drug resistance" (12 Nov 2025). They gave no numbers.
  - On 15 Jan 2026 Novartis's malaria programme head described the analysis as parasite clearance. GanLum "cleared those parasites with a very similar time course to parasites that don't have the mutation", while the artemether–lumefantrine (AL) arm showed "a delay in the clearance of the parasites carrying the mutation".
  - That is a company description of an unpublished subgroup analysis. It is not a cure-rate result in resistant infections.
- **The only peer-reviewed clinical data** is a 2016 Phase II of ganaplacide *alone*, not the combination (NEJM). It was run at 5 centres in Thailand and Viet Nam with 43 adults.
  - 14 of 31 *P. falciparum* infections carried non-synonymous K13 mutations, 10 of them C580Y.
  - "Parasite clearance times and rates were similar in infections with and those without these molecular markers."
  - The cohort was small, used monotherapy and was in Asia.
- **Laboratory data** (peer-reviewed, in vitro):
  - Ganaplacide activity was not impaired by pfk13, pfcrt, pfmdr1, pfmdr2, pfdhps or pfdhfr mutations, alone or with lumefantrine (JAC 2024).
  - It was potent against 6 artemisinin-resistant Thai and Cambodian isolates (K13 C580Y, G449A, R539T), with mean asexual IC50 5.6 nM (AAC 2022).
  - Of 750 Ugandan isolates, 31 had IC50 above 100 nM, against a median of 13.8 nM (AAC 2024).
- **The endpoint that could support a resistance statement:** KALUMA PCR-corrected ACPR (cure) and parasite clearance time, stratified by kelch13 genotype, once published. It is not public yet.

**Transmission ("blocks transmission").** No clinical trial of GanLum has measured transmission.

- Transmission is measured by whether mosquitoes fed on treated patients become infected (membrane-feeding assays). It is not measured by gametocyte counts.
- **KALUMA's registered transmission-related outcomes are gametocyte measures only:**
  - "Gametocyte Clearance Time" (up to Day 3)
  - "Gametocytemia" (baseline to Day 43)
  - "Gametocyte carriage over time" in the extension phase
- **No results are posted.**
  - Novartis said the drug "was also found to have a rapid response against mature gametocytes" (12 Nov 2025).
  - Its programme head said it "cleared gametocytes in the majority of patients within 72 hours" (15 Jan 2026).
  - Novartis's own headline says "*potential* to … block transmission".
- **Transmission blocking has been shown only in the laboratory:**
  - in vitro and in animal models (AAC 2014)
  - in vitro against artemisinin-resistant isolates (AAC 2022)
  - in a Standard Membrane Feeding Assay (MMV pipeline page)
- **The endpoint that could support a transmission statement:** published KALUMA gametocyte-clearance results, comparing GanLum with AL. That would justify "clears gametocytes faster than AL". "Blocks transmission" would need a mosquito-feeding study, and none is registered.

**The proposed rewrite** ("Non-artemisinin combination in late-stage development. Novartis positions it for settings with artemisinin partial resistance and for MFT strategies.") is mostly accurate, with one error.

- **Correct:** "Non-artemisinin combination" and "late-stage development". Phase III is complete and the product is not approved.
- **Close enough:** "Novartis positions it for settings with artemisinin partial resistance". Novartis's own words are "potential to combat antimalarial resistance" and "highly effective against mutant malaria parasites associated with partial drug resistance".
- **Wrong:** "and for MFT strategies". The words MFT and multiple first-line therapies appear in neither the Novartis nor the MMV release, nor on MMV's pipeline page. MMV's stated vision is "Uncomplicated malaria treatment and AMDR [antimalarial drug resistance] management". MFT positioning is LAUNCH's framing and should be attributed to LAUNCH. Wording is proposed in §2.

---

## 2. GanLum: ganaplacide–lumefantrine (KLU156), Novartis with MMV

| Medicine | Field | Current text | Category | Evidence | Source | Proposed wording | Action |
|---|---|---|---|---|---|---|---|
| GanLum | useCase (part 1) | "Non-artemisinin combination — the first major innovation in malaria treatment since ACTs were introduced over 25 years ago (Novartis)" | Manufacturer claim | Novartis's wording is conditional: "*If approved*, GanLum would represent first major innovation in malaria treatment since 1999" and "*If authorized by regulators*, GanLum would represent the first major innovation…". The card drops the condition. MMV's version says "first novel-acting…". Verified. | [Novartis press release, 12 Nov 2025](https://www.novartis.com/news/media-releases/novartis-phase-iii-trial-next-generation-malaria-treatment-klu156-ganlum-meets-primary-endpoint-potential-combat-antimalarial-resistance); [MMV press release, 12 Nov 2025](https://www.mmv.org/newsroom/news-resources-search/phase-3-trial-next-generation-malaria-treatment-ganaplacide-lumefantrine) | "Non-artemisinin combination: ganaplacide, a new chemical class, with lumefantrine. Phase III complete; not yet approved." | Reword (remove the "first major innovation" phrase) |
| GanLum | useCase (part 2) | "candidate for artemisinin partial-resistance settings and MFT strategies" | Intended positioning (Novartis on resistance; LAUNCH on MFT) | Novartis: "potential to combat antimalarial resistance". MFT appears in no Novartis or MMV material checked. Verified. | Novartis press release, 12 Nov 2025 (above); [MMV pipeline page, accessed 15 Oct 2026](https://www.mmv.org/mmv-pipeline-antimalarial-drugs/ganaplacide-lumefantrine) | "Novartis presents it as a response to antimalarial drug resistance. LAUNCH tracks it as a candidate for areas with artemisinin partial resistance and for multiple first-line therapy (MFT)." | Reword |
| GanLum | useCase (part 3) | "kills resistant parasites and blocks transmission" | Manufacturer claim, overstated | See §1. No published endpoint on resistant infections for the combination, and no clinical transmission endpoint. Company-reported, unpublished: similar parasite clearance in mutant and non-mutant infections, and faster gametocyte clearance than AL. Verified. | [ClinicalTrials.gov NCT05842954, last update 27 Jan 2026](https://clinicaltrials.gov/study/NCT05842954); [Malaria No More interview with Novartis, 15 Jan 2026](https://www.malarianomore.org/story/malaria-know-more-new-malaria-treatment-shows-promise-against-growing-drug-resistance); [White et al., NEJM 2016](https://www.nejm.org/doi/full/10.1056/NEJMoa1602250) | If anything is kept: "Novartis reports, from unpublished Phase III analyses, that it cleared parasites carrying artemisinin partial-resistance mutations as fast as other parasites, and cleared gametocytes (the stage that infects mosquitoes) faster than AL. Effect on transmission has not been measured in patients." | Remove (or replace with the labelled sentence) |
| GanLum | stage note (existing fact) | "met primary endpoint: 97.4% PCR-corrected cure rate; registry records 1,720 participants; trial completion 25 Nov 2025; 34 sites, 12 African countries" | Published result (registry) + manufacturer report | **Primary endpoint:** PCR-corrected ACPR at Day 29, non-inferiority vs Coartem (margin 5%). Results were 97.4% vs 94.0% (estimand), and 99.2% vs 96.7% (post hoc per-protocol). Uncorrected Day 29: 85.3% vs 82.1%. **Registry:** enrolment 1,720 (actual); completion 25 Nov 2025; 12 countries; 33 locations listed today. **Press release:** 1,688 in the intro and 1,668 in "About the study"; 34 sites. **Peer review:** results not posted to the registry or published (none found). Verified. | NCT05842954 (above); Novartis press release, 12 Nov 2025 (above) | "Met its primary endpoint in KALUMA: 97.4% PCR-corrected cure at Day 29 vs 94.0% for artemether–lumefantrine (Coartem), in adults and children ≥10 kg. Company-reported; not yet peer-reviewed. Registry: 1,720 participants, 12 African countries, completed 25 Nov 2025." | Keep, add comparator and "not yet peer-reviewed" |
| GanLum | access | "Access and affordability provisions under discussion" | Manufacturer claim (secondary report) | No price or access plan in the Novartis release. Health Policy Watch quotes MMV: supply "on a 'largely not-for-profit' basis in low- and middle-income countries… in accordance with agreements signed with Novartis". This is a secondary source; no primary MMV or Novartis text was found. Verified (secondary). | [Health Policy Watch, 12 Nov 2025](https://healthpolicy-watch.news/new-malaria-drug-candidate-exceeds-cure-rate-for-standard-acts-in-phase-3-trial/) | "Price not public. MMV has said it will be supplied on a 'largely not-for-profit' basis in low- and middle-income countries (reported Nov 2025)." | Reword |
| GanLum | access | "Once-daily, 3-day granule sachet" | Published result (registry regimen) + manufacturer description | **Registry:** KLU156 "once daily (QD) for 3 days under fed conditions (light meal)", adults and children ≥10 kg; 400/480 mg for ≥35 kg, weight-band fractions below that. **Novartis:** "given as a sachet of granules once a day for three days". **Children below 10 kg:** not in KALUMA. The paediatric Phase II (KALUMI) used tablets plus a lumefantrine powder sachet. **Final presentation:** not yet approved. Verified. | NCT05842954 (above); Novartis press release (above); [ClinicalTrials.gov NCT04546633 (KALUMI), results posted 7 May 2026](https://clinicaltrials.gov/study/NCT04546633) | "In Phase III: granules in a sachet, once daily for 3 days with a light meal, for adults and children ≥10 kg. Final product presentation subject to approval." | Keep (minor reword) |
| GanLum | adoption | "New chemical class — pharmacovigilance planning required" | Published fact + LAUNCH assessment | Ganaplacide is an imidazolopiperazine, "a new class of antimalarial agents" (NEJM 2016). KALUMA's extension phase is studying repeated treatment for up to 2 years. No GanLum risk-management plan is public. Verified. | NEJM 2016 (above); NCT05842954 (above) | "New chemical class (imidazolopiperazine). Safety monitoring after approval will need planning (LAUNCH assessment)." | Keep (minor reword) |
| GanLum | adoption | "Health-worker training on new regimen" | Not a claim | Training point: KALUMA dosed once daily with a light meal; AL is twice daily. | NCT05842954 (above) | — | Not a claim — keep |
| GanLum | research question | "Efficacy against resistant parasites and transmission blocking" | Research question (implies both are established) | See §1. Also relevant: Phase IIb in Africa and Asia. Adults: 400/960 mg ×3 days, PCR-corrected Day-29 ACPR 98% (42/43). Children 2 to <12 y: 95% (38/40) vs AL 96% (21/22) (Lancet Infect Dis 2023). KALUMI, children 6 months to <12 y: 99.0% (95% CI 94.4–100) vs AL 99.0% (94.5–100) (registry results). Verified. | [Ogutu et al., Lancet Infect Dis 2023](https://pubmed.ncbi.nlm.nih.gov/37327809/); NCT04546633 (above) | "Does it cure infections carrying artemisinin partial-resistance (kelch13) mutations as well as other infections? (KALUMA subgroup not yet published.) Does faster gametocyte clearance reduce infection of mosquitoes? (Not yet measured.)" | Reword |

---

## 3. ALAQ: artemether–lumefantrine–amodiaquine, Fosun Pharma with MORU

**Background.** The trials below tested AL plus amodiaquine given as **separate products**. Fosun's fixed-dose tablet is in its first pivotal trial, FD-TACT, which has no results yet.

| Medicine | Field | Current text | Category | Evidence | Source | Proposed wording | Action |
|---|---|---|---|---|---|---|---|
| ALAQ | useCase | "Triple ACT to protect artemisinin partner drugs — MFT component and first-line option where artemisinin partial resistance is confirmed." | Intended positioning | **Not approved, not WHO-recommended.** WHO (May 2025): "Next-generation therapies may include triple ACT combinations." **TRACII** (8 countries): AL+AQ 42-day PCR-corrected efficacy 98% (281/286) vs AL 97% (279/289), p=0.30. **Cambodia/Viet Nam trial:** in kelch13-mutant infections, 96% (89/93) vs 90% (73/81), HR for recrudescence 0.44 (0.14–1.40), p=0.17, not significant. **The protection claim** rests on modelling (Nat Commun 2023), not on a trial endpoint. Verified. | [van der Pluijm et al., Lancet 2020](https://pubmed.ncbi.nlm.nih.gov/32171078/); [Peto et al., Lancet Infect Dis 2022](https://pubmed.ncbi.nlm.nih.gov/35276064/); [Nguyen et al., Nat Commun 2023](https://pubmed.ncbi.nlm.nih.gov/37516752/); [WHO news, 20 May 2025](https://www.who.int/news/item/20-05-2025-african-health-leaders-and-global-partners-unite-to-confront-rising-threat-of-antimalarial-drug-resistance) | "Investigational fixed-dose triple ACT; not yet approved or WHO-recommended. Developers aim to delay resistance to artemisinin and its partner drugs. Use within MFT or where artemisinin partial resistance is confirmed is a plan, not policy. In earlier trials, AL plus amodiaquine as separate tablets cured 98% vs 97% for AL (42 days, 8 countries)." | Reword |
| ALAQ | access | "Developed through MORU-led DeTACT partnership with Fosun Pharma" | Manufacturer/developer claim | **GHIT project G2022-205** (US$5,043,253) partners: Fosun ("will develop, manufacture, and commercialize ALAQ-FDC"), MORU ("coordinate the clinical trial"), MMV (regulatory support) and Marubeni (project management). **FD-TACT** sponsor: University of Oxford. This partnership is FD-TACT, not DeTACT; DeTACT was a separate MORU trial programme. Verified. | [GHIT Fund project page, accessed 15 Oct 2026](https://www.ghitfund.org/investment/portfoliodetail/detail/215/en); [ClinicalTrials.gov NCT05951595, last update 18 Nov 2025](https://clinicaltrials.gov/study/NCT05951595) | "Fixed-dose combination developed and made by Fosun Pharma. Pivotal trial (FD-TACT) run by MORU/University of Oxford with MMV and Marubeni, funded by the GHIT Fund." | Reword |
| ALAQ | access | "Designed for affordability in endemic-country public sectors" | Manufacturer claim | GHIT: "FOSUN PHARMA commits to make ALAQ-FDC accessible and affordable for malaria-endemic countries." No price published. "Public sectors" is not in any source found. Verified. | GHIT Fund (above) | "Fosun Pharma has committed to make it 'accessible and affordable for malaria-endemic countries'. No price published." | Reword |
| ALAQ | access | "Child-friendly dispersible formulation" | Published (registry description of investigational product) | FD-TACT: "Each paediatric (dispersible) tablet will contain 20 mg artemether, 120 mg lumefantrine, 40 mg amodiaquine". Dose ratio 20:120:40 fixed across 5 weight bands (Clin Pharmacol Ther 2025). "Child-friendly" (taste and acceptability) has not been reported. Verified. | NCT05951595 (above); [Tarning et al., Clin Pharmacol Ther 2025](https://pubmed.ncbi.nlm.nih.gov/39943797/) | "Paediatric dispersible tablet (20/120/40 mg) being tested in FD-TACT." | Reword (drop "child-friendly") |
| ALAQ | adoption | "Updated treatment guidelines and job aids" | Not a claim | Depends on a WHO recommendation that does not exist yet. | — | — | Not a claim — keep |
| ALAQ | adoption | "Health-worker training (3-drug regimen)" | Not a claim | **Dosing:** in FD-TACT, ALAQ is 6 doses over 3 days (0, 8, 24, 36, 48, 60 h), the same schedule as AL. **Trial safety signals:** QTc +8.8 ms vs +0.9 ms at 52 h (TRACII); vomiting 8% vs 2% and bradycardia 61% vs 38% (Peto 2022). Verified. | NCT05951595; Lancet 2020; Lancet Infect Dis 2022 (above) | "Training on a new co-formulated product (same 6-dose, 3-day schedule as AL)." | Not a claim — keep (optional reword) |
| ALAQ | research question | "Safety, efficacy and adherence of co-formulated ALAQ at scale" | Research question (overstates what FD-TACT measures) | **FD-TACT design:** open-label, non-inferiority vs AL and ASAQ, n=1,680 planned (840 ALAQ); age ≥6 months and ≥5 kg. **Primary endpoint:** 28-day PCR-corrected ACPR. **Adherence:** treatment is directly observed during a 3-day admission, so adherence and use at scale are not measured. **Dates:** started 11 Sep 2025; estimated primary completion 31 Jul 2026. **Sites:** registry lists Rwanda only; GHIT names Rwanda, Uganda, Angola, Nigeria and Thailand. Verified. | NCT05951595; GHIT Fund (above) | "Is fixed-dose ALAQ as effective as AL and ASAQ (28-day cure, FD-TACT), and safe? Adherence outside supervised treatment and use at scale are not yet studied." | Reword |

---

## 4. ASPY: pyronaridine–artesunate (Pyramax), Shin Poong with MMV

| Medicine | Field | Current text | Category | Evidence | Source | Proposed wording | Action |
|---|---|---|---|---|---|---|---|
| ASPY | useCase (part 1) | "First-line diversification / MFT component" | Intended positioning | **MFT use:** in country MFT plans (Rwanda national rotation; Burkina Faso and Kenya pilots; Nigeria planned). Carried. **WHO:** ACT option since 2022 (strong). Verified. | [WHO MFT implementation guide](https://www.who.int/publications/i/item/9789240103603) (carried); [WHO guidelines for malaria v10.0, 10 Sep 2026](https://www.who.int/publications/i/item/guidelines-for-malaria) | "Option for diversifying first-line treatment; used in MFT in Rwanda and in pilots in Burkina Faso and Kenya." | Keep (minor reword) |
| ASPY | useCase (part 2) | "paediatric granules available" | Regulatory conclusion | EMA CHMP opinion of 19 Nov 2015 extended Pyramax to "granules for oral suspension… for use in children and infants weighing 5 kg to under 20 kg". The granules are on the WHO PQ list. Verified. | [EMA CHMP summary of opinion, 19 Nov 2015](https://www.ema.europa.eu/en/documents/outside-eu-smop/chmp-post-authorisation-summary-positive-opinion-pyramax_en.pdf) | "Granules for children 5 to <20 kg (EMA opinion, Nov 2015)." | Keep |
| ASPY | useCase (part 3) | "label includes pregnant women (2025 update)" | Regulatory conclusion, overstated | **Change:** variation II/0036 (CHMP opinion 5 Jun 2025; product information updated 6 Aug 2025) revised SmPC sections 4.4 and 4.6. **Before (Feb 2024 label):** artemisinins "cannot be recommended" in the 1st trimester and "should only be used in the second and third trimesters… when other treatments are considered unsuitable". **Now (tablets):** "not recommended during the first trimester… where other suitable and effective antimalarials are available"; in the 2nd and 3rd trimesters, Pyramax "should be considered if the expected benefit to the mother outweighs the risk to the foetus". The label cites 52 first-trimester and 839 second/third-trimester exposures with "no increase in adverse pregnancy outcomes or teratogenic effects". **Granules:** pregnancy "not applicable". **WHO:** not recommended in the 1st trimester. Verified. | [EMA procedural steps after opinion (II/0036)](https://www.ema.europa.eu/en/documents/outside-eu-steps-after/pyramax-procedural-steps-taken-scientific-information-after-opinion_en.pdf); [EMA product information, updated 6 Aug 2025](https://www.ema.europa.eu/en/documents/outside-eu-product-information/pyramax-product-information_en.pdf); [archived product information, Feb 2024](http://web.archive.org/web/20240218045447id_/https://www.ema.europa.eu/en/documents/outside-eu-product-information/pyramax-product-information_en.pdf) | "2025 EMA label update: tablets may be used in the 2nd and 3rd trimesters when the benefit outweighs the risk; not recommended in the 1st trimester when alternatives exist." | Reword |
| ASPY | access | "WHO PQ held for tablets and paediatric granules" | Regulatory conclusion | Both are on the WHO list of prequalified medicines (H-W-2319-2 tablets, H-W-2319-3 granules) as "Alternative Listing", basis "EMA Article 58". The WHO page shows no listing date, status "Prequalified", storage ≤30°C and 24-month shelf life. Verified. | [WHO PQ product page H-W-2319-3](https://extranet.who.int/prequal/medicines/ema-art-58-h-w-2319-3); repo WHO PQ extract, 31 Aug 2026 (carried) | "On the WHO list of prequalified medicines (tablets and granules), through the EMA Article 58 route." | Keep (minor reword) |
| ASPY | access | "Registration confirmed in five national registers so far: Nigeria, Rwanda, Tanzania, Viet Nam and Zambia" | Regulatory conclusion (national registration) | LAUNCH register checks of 5 Oct 2026. Carried, not re-tested. Caveat on Tanzania: certificates TZ 17 H 0055/0056 are dated 8 Mar 2022–7 Mar 2027. The "17" suggests a 2017 first registration, so 2022 may be a renewal (an inference, not verified). | Repo extracts of the [TMDA](https://imis2.tmda.go.tz/#/public/registered-medicines), [NAFDAC](https://greenbook.nafdac.gov.ng/), [Rwanda FDA](https://monitoring.rwandafda.gov.rw/register/hmdr/), [ZAMRA](https://app.zamra.co.zm:42882/portal/#/public/registered-medicines) and [DAV](https://dichvucong.dav.gov.vn/congbothuoc/index) registers (carried) | Unchanged | Keep (check Tanzania's first-registration year) |
| ASPY | access | "Co-developed with MMV under access-oriented partnership" | Manufacturer/PDP claim | MMV: "co-developed by Shin Poong Pharm. Co., Ltd and MMV". "Access-oriented" is not found in any source. Verified. | [MMV news, 20 Aug 2025](https://www.mmv.org/newsroom/news-resources-search/pyramax-r-label-update-now-includes-information-treatment-pregnant) | "Co-developed by Shin Poong and MMV." | Reword |
| ASPY | adoption | "Guideline inclusion and case-management training" | Not a claim | — | — | — | Not a claim — keep |
| ASPY | adoption | "No cold chain or special administration needs" | Regulatory conclusion (label) | **Storage:** "Do not store above 30°C". **Dosing:** "once a day for three days with or without food". **But:** contraindicated "in patients with signs of hepatic impairment or known significant liver function test abnormalities". WHO: "ASPY should be avoided by individuals with known liver disease" and "Pharmacovigilance should be strengthened". Verified. | EMA product information (above); WHO guidelines v10.0 (above) | "No cold chain (store below 30°C). Once daily for 3 days, with or without food. Not for people with liver disease." | Reword |
| ASPY | research question | "MFT deployment models with pyronaridine–artesunate" | Research question | — | — | — | Not a claim — keep |
| ASPY | barrier | "Adoption is the current access barrier — strongly recommended by WHO since 2022 and on the country access map in 13 countries with a reliable source, but national guideline inclusion remains limited" | LAUNCH assessment + regulatory conclusion | **WHO:** "Artesunate-pyronaridine (2022)… is recommended as an ACT option", strong. Verified. **Country count:** the 13-country map is carried. **National policy:** WMR 2025 Annex 4B lists AS-PY in 8 national policies (BFA, CMR, COD, NGA, THA, KOR, VNM; SSD for *P. vivax* only). Carried. MMV claims inclusion in "11 national treatment guidelines". Verified (as MMV's claim). **Conflict:** the card's own milestone "Ghana only — 1 country confirmed" contradicts these counts. | WHO guidelines v10.0 (above); [WMR 2025 annexes](https://www.who.int/publications/m/item/annexes-world-malaria-report-2025) (carried); [MMV pipeline: ASPY granules](https://www.mmv.org/mmv-pipeline-antimalarial-drugs/pyronaridine-artesunate-granules) | Keep the barrier text, labelled as LAUNCH's assessment. Fix the "Ghana only" milestone and stage note to match the 6 Oct 2026 country list. | Keep (fix inconsistency elsewhere) |

---

## 5. DHA–PPQ: dihydroartemisinin–piperaquine (Eurartesim and generics)

| Medicine | Field | Current text | Category | Evidence | Source | Proposed wording | Action |
|---|---|---|---|---|---|---|---|
| DHA–PPQ | useCase (part 1) | "MFT rotation partner" | Intended positioning | **MFT use:** in country MFT plans (Rwanda; Burkina Faso and Kenya pilots; Nigeria planned). Carried. **Resistance caveat:** piperaquine resistance in the Mekong. In TRACII, 42-day efficacy of DHA–PPQ was 48% (67/141) in Cambodia, Thailand and Viet Nam. Verified. | WHO MFT guide (carried); Lancet 2020 (above) | "Used in MFT in Rwanda and in pilots in Burkina Faso and Kenya." | Keep (minor reword) |
| DHA–PPQ | useCase (part 2) | "mass drug administration and chemoprevention niches" | Intended positioning (partly in conflict with WHO advice and the EU label) | **MDA and chemoprevention:** WHO recommends MDA, PMC and PDMC without naming a drug. DHA–PPQ was used in 8 of 13 *P. falciparum* MDA studies WHO reviewed, and in 1 of 3 PDMC trials. For PDMC, WHO says "an alternative medicine is preferred" to the first-line drug. **First-line conflict:** WHO good-practice statement: "Drugs used as first line treatment should not be used in IPTp, PMC, SMC, IPTsc or MDA." This conflicts with positioning it as an MFT first-line partner. **IPTp:** WHO (2026) advises against DHA–PPQ IPTp in HIV-positive pregnant women. **EU label:** "No more than two courses… within a 12 month period", and not within 2 months of each other. Verified. | WHO guidelines v10.0 (above); [EMA Eurartesim product information](https://www.ema.europa.eu/en/documents/product-information/eurartesim-epar-product-information_en.pdf) | "Studied for mass drug administration and post-discharge chemoprevention. WHO advises not using a country's first-line treatment for chemoprevention or MDA, and the EU label allows at most two courses in 12 months." | Reword |
| DHA–PPQ | useCase (part 3) | "once-daily dosing" | Regulatory conclusion | EU label: "three doses taken at the same time each day". WHO: "once a day for 3 days". Verified. | EMA Eurartesim product information; WHO guidelines v10.0 (above) | "Once daily for 3 days." | Keep |
| DHA–PPQ | access | "Nine PQ'd presentations across three manufacturers (Alfasigma, Guilin, Beijing Holley) — supply security via diversity" | Regulatory conclusion + LAUNCH assessment | **Count:** 9 confirmed. Alfasigma MA093 and MA094 (listed 9 Oct 2015). Guilin MA131, MA139, MA140, MA141, MA151, MA157 (2019–2020; 3 dispersible). Beijing Holley MA177 (10 Oct 2023; made by KBN-Zhejiang). **Requalification:** MA093 met requirements on 20 Jan 2025 and MA094 on **8 Jan 2025**. **"Supply security via diversity":** undercut by the API finding in the next row. Verified. | [WHO PQ MA093](https://extranet.who.int/prequal/medicines/ma093) … [MA177](https://extranet.who.int/prequal/medicines/ma177) (9 pages); [WHOPAR MA093 part 7](https://extranet.who.int/prequal/sites/default/files/whopar_files/MA093%20part7v3.pdf); [WHOPAR MA094 part 7](https://extranet.who.int/prequal/sites/default/files/whopar_files/ma094-part7v3.pdf) | "Nine WHO-prequalified presentations from three companies: Alfasigma (2), Guilin (6, including 3 dispersible) and Beijing Holley (1)." | Reword |
| DHA–PPQ | access | "No single-source dependency" | LAUNCH assessment, contradicted | WHO PQ pages list **Mangalam Drugs and Organics (Vapi, India) as the only dihydroartemisinin API site for 8 of the 9 presentations** (all Alfasigma and Guilin). It is also the only piperaquine API site for Alfasigma. Only Holley's MA177 lists a second DHA source (CR San Jiu) and a separate piperaquine source (Zhuhai Rundu). Verified. | WHO PQ product pages MA093–MA177 (above) | Remove, or: "Three prequalified finished-product makers, but WHO records list one API site as the only dihydroartemisinin source for 8 of the 9 presentations." | Remove / reword |
| DHA–PPQ | access | "Established API supply chains" | Unsourced claim | No source found. The API concentration above points the other way. | — | — | Remove |
| DHA–PPQ | adoption | "ECG guidance for specific risk groups in some guidelines" | Regulatory conclusion, scope inaccurate | **EU label:** contraindicated with "known congenital prolongation of the QTc-interval or any clinical condition known to prolong the QTc interval", a family history of sudden death or of congenital QTc prolongation, QT-prolonging drugs, or electrolyte disturbances. "An ECG should be obtained as early as possible during treatment… and ECG monitoring should be applied in patients who may have a higher risk", and consider an ECG in all patients before the last dose and 4–6 h after it. **WHO:** "It is not necessary to perform an electrocardiogram before prescribing… but this ACT should not be used in patients with congenital QT prolongation or who have a clinical condition or are on medications that prolong the QT interval." Verified. | EMA Eurartesim product information; WHO guidelines v10.0 (above) | "Prolongs the QT interval. Not for people with QT prolongation or on QT-prolonging medicines (WHO; EU label). The EU label advises an ECG during treatment; WHO says one is not needed before prescribing." | Reword |
| DHA–PPQ | adoption | "Otherwise standard ACT case-management training" | Not a claim, but incomplete | **EU label:** take "with water and without food", with no food for 3 h before and after each dose. **WHO:** avoid high-fat meals; "normal meals do not alter the absorption". Training should cover food timing and the QT contraindications. Verified. | EMA Eurartesim product information; WHO guidelines v10.0 (above) | "Standard ACT training, plus food timing and the QT contraindications." | Reword |
| DHA–PPQ | research question | "MFT rotation sequencing and resistance impact" | Research question | — | — | — | Not a claim — keep |
| DHA–PPQ | barrier | "Procurement is the current access barrier — 0.9–4.5% of Global Fund antimalarial spend 2022–24 despite a WHO recommendation dating to 2010, though 2025 orders surged (PQR, reporting still incomplete)" | LAUNCH assessment of public data + regulatory conclusion | **PQR shares:** recomputed from the repo PQR extract (23 Aug 2026), by order date, as a share of "Anti-malaria medicine" spend: 2022 4.4%, 2023 0.9%, 2024 4.5%. 2025: US$15.3m, which is 20.4% of an incomplete year. Carried (reproduced). **WHO date:** the guideline text says the GDG "recommended dihydroartemisinin + piperaquine for use in 2009" and re-evaluated it in 2013. That fits a 2010 publication. Verified. | [Global Fund PQR transaction summary](https://insights.theglobalfund.org/t/Public/views/PriceQualityReportingTransactionSummary/TransactionSummary) (carried); WHO guidelines v10.0 (above) | Unchanged; label as "LAUNCH analysis of Global Fund PQR data". | Keep |
| DHA–PPQ | existing fact | "EMA approval (Eurartesim) 2011" | Regulatory conclusion | "Date of first authorisation: 27 October 2011". Verified. | EMA Eurartesim product information (above) | — | Keep |

---

## 6. Summary lists

**Recommend removing**

1. GanLum: "kills resistant parasites and blocks transmission". No published endpoint for the combination in resistant infections, and transmission has never been measured in patients.
2. GanLum: "the first major innovation in malaria treatment since ACTs were introduced over 25 years ago (Novartis)". It is marketing language, and it drops Novartis's own "if approved".
3. DHA–PPQ: "No single-source dependency". WHO PQ API records contradict it.
4. DHA–PPQ: "Established API supply chains". No source found.
5. Unsourced adjectives: "access-oriented" (ASPY), "child-friendly" and "public sectors" (ALAQ), and "supply security via diversity" (DHA–PPQ).

**Could not verify**

- **KALUMA kelch13 subgroup results:** no numbers published (company statements only, Nov 2025 and Jan 2026).
- **KALUMA gametocyte results:** registered outcomes, but no results posted.
- **No KALUMA peer-reviewed paper** was found as of 15 Oct 2026.
- **GanLum access terms:** "largely not-for-profit" appears only in a secondary report of MMV's statement.
- **GanLum filing status:**
  - MMV's pipeline page lists "Regulatory review" with next milestone "Seek regulatory approvals".
  - On 15 Jan 2026 Novartis said it was still "preparing the regulatory submissions".
  - No filing announcement was found.
- **DeTACT-Africa (NCT03923725):** completed 15 Mar 2024. No registry results and no peer-reviewed results were found.
- **PYRAPREG results:** only MMV's summary exists ("highly effective with comparable safety"). No peer-reviewed paper was found.
- **WHO PQ listing years for ASPY** (2012 tablets, 2016 granules): the WHO PQ pages show no listing date. The EMA opinion dates (16 Feb 2012 and 19 Nov 2015) are verified.
- **ALAQ "approval / PQ by ~2027" target:** not checked in this pass. No partnership statement was found.
- **ASPY Tanzania first-registration year** (2017 or 2022): see the ASPY table.

**Existing statements found to be inaccurate**

1. **GanLum useCase:** attributes "first major innovation…" to Novartis without Novartis's condition, "if approved".
2. **GanLum draft rewrite:** "Novartis positions it… for MFT strategies". Novartis and MMV materials do not mention MFT.
3. **GanLum stage note:** "34 sites" comes from the press release; the registry now lists 33 locations. The release itself gives two participant counts (1,688 and 1,668); the registry gives 1,720. This is minor; keep the registry figure and cite it.
4. **ASPY useCase:** "label includes pregnant women (2025 update)" overstates the change (see the ASPY table).
5. **ASPY milestone source "MMV, 31 Jul 2025" and "announced 31 Jul 2025":**
   - MMV's news item is dated **20 Aug 2025**.
   - 31 Jul 2025 is the date MMV gives for EMA's label change.
   - EMA records the CHMP opinion on **5 Jun 2025** and the product-information update on **6 Aug 2025**.
6. **ASPY "Ghana only — 1 country confirmed":** this milestone and stage note contradict the card's own 6 Oct 2026 country data (11 countries at guidelines-or-further) and WMR 2025 Annex 4B.
7. **DHA–PPQ "ECG guidance for specific risk groups in some guidelines":** the EU label advises an ECG during treatment for all patients, not only risk groups. WHO says an ECG is not needed before prescribing.
8. **DHA–PPQ "No single-source dependency":** contradicted at API level (Mangalam is the only DHA API source for 8 of 9 presentations).
9. **DHA–PPQ "requal. 20 Jan 2025":** true for MA093 only. MA094 met requirements on 8 Jan 2025.
10. **ALAQ "Developed through MORU-led DeTACT partnership with Fosun Pharma":** the Fosun partnership is FD-TACT (GHIT-funded, with MMV and Marubeni), not DeTACT.
11. **DHA–PPQ useCase:** pairs "MFT rotation partner" with "MDA and chemoprevention niches". WHO advises against using a first-line drug for chemoprevention or MDA. This is not false as a description of past use, but the card should not present both as compatible.

---

## 7. Sources used (all accessed 15 Oct 2026 unless stated)

**GanLum**
- ClinicalTrials.gov, NCT05842954 (KALUMA), last update posted 27 Jan 2026: https://clinicaltrials.gov/study/NCT05842954 (API: https://clinicaltrials.gov/api/v2/studies/NCT05842954)
- ClinicalTrials.gov, NCT04546633 (KALUMI), results posted 7 May 2026: https://clinicaltrials.gov/study/NCT04546633
- ClinicalTrials.gov, NCT03167242 (Phase IIb), results posted 10 Feb 2022: https://clinicaltrials.gov/study/NCT03167242
- ClinicalTrials.gov, NCT01753323 (KAF156 monotherapy Phase II): https://clinicaltrials.gov/study/NCT01753323
- ClinicalTrials.gov search of all ganaplacide/KAF156/KLU156 trials (no transmission-endpoint trial found): https://clinicaltrials.gov/api/v2/studies?query.term=ganaplacide+OR+KAF156+OR+KLU156
- Novartis press release, 12 Nov 2025: https://www.novartis.com/news/media-releases/novartis-phase-iii-trial-next-generation-malaria-treatment-klu156-ganlum-meets-primary-endpoint-potential-combat-antimalarial-resistance
- MMV press release, 12 Nov 2025: https://www.mmv.org/newsroom/news-resources-search/phase-3-trial-next-generation-malaria-treatment-ganaplacide-lumefantrine
- MMV pipeline page, ganaplacide-lumefantrine: https://www.mmv.org/mmv-pipeline-antimalarial-drugs/ganaplacide-lumefantrine
- EDCTP news, 13 Nov 2025: https://www.edctp.org/news/kaluma-trial-confirms-safety-and-efficacy-of-next-generation-malaria-therapy/
- EDCTP, ASTMH 2025 summary (undated page): https://www.edctp.org/?p=6898
- WANECAM, symposium of 13 Nov 2025: https://wanecam.org/?p=2598
- Malaria No More, interview with Caroline Boulton (Novartis), 15 Jan 2026: https://www.malarianomore.org/story/malaria-know-more-new-malaria-treatment-shows-promise-against-growing-drug-resistance
- Health Policy Watch, 12 Nov 2025 (secondary): https://healthpolicy-watch.news/new-malaria-drug-candidate-exceeds-cure-rate-for-standard-acts-in-phase-3-trial/
- BioPharma Dive, 12 Nov 2025 (secondary; checked, no subgroup data): https://www.biopharmadive.com/news/novartis-malaria-GanLum-ganaplacide-study-results/805258/
- White NJ et al., NEJM 2016;375:1152-60: https://www.nejm.org/doi/full/10.1056/NEJMoa1602250 (full text: https://pmc.ncbi.nlm.nih.gov/articles/PMC5142602/)
- Ogutu B et al., Lancet Infect Dis 2023;23:1051-61: https://pubmed.ncbi.nlm.nih.gov/37327809/
- Kuhen KL et al., Antimicrob Agents Chemother 2014;58:5060-7: https://pubmed.ncbi.nlm.nih.gov/24913172/
- Yipsirimetee A et al., Antimicrob Agents Chemother 2022;66:e0148121: https://pubmed.ncbi.nlm.nih.gov/34978886/
- Manaranche J et al., J Antimicrob Chemother 2024;79:2877-86: https://pubmed.ncbi.nlm.nih.gov/39206510/
- Kreutzfeld O et al., Antimicrob Agents Chemother 2024;68:e0046624: https://pubmed.ncbi.nlm.nih.gov/39136468/

**ALAQ**
- ClinicalTrials.gov, NCT05951595 (FD-TACT), last update posted 18 Nov 2025: https://clinicaltrials.gov/study/NCT05951595
- ClinicalTrials.gov, NCT03923725 (DeTACT-Africa), completed 15 Mar 2024, no results posted: https://clinicaltrials.gov/study/NCT03923725
- GHIT Fund, project G2022-205: https://www.ghitfund.org/investment/portfoliodetail/detail/215/en
- van der Pluijm RW et al., Lancet 2020;395:1345-60 (TRACII): https://pubmed.ncbi.nlm.nih.gov/32171078/
- Peto TJ et al., Lancet Infect Dis 2022;22:867-78: https://pubmed.ncbi.nlm.nih.gov/35276064/
- Tarning J et al., Clin Pharmacol Ther 2025;117:1248-53: https://pubmed.ncbi.nlm.nih.gov/39943797/
- Ding J et al., Br J Clin Pharmacol 2026;92:589-605 (no clinically relevant AL–AQ interaction; context only): https://pubmed.ncbi.nlm.nih.gov/41052792/
- Mahamar A et al., Lancet Microbe 2025;6:100966 (ALAQ transmission trial, mosquito feeding; context): https://pubmed.ncbi.nlm.nih.gov/39701119/
- Nguyen TD et al., Nat Commun 2023;14:4568 (modelling): https://pubmed.ncbi.nlm.nih.gov/37516752/
- WHO news, 20 May 2025: https://www.who.int/news/item/20-05-2025-african-health-leaders-and-global-partners-unite-to-confront-rising-threat-of-antimalarial-drug-resistance

**ASPY**
- EMA, Pyramax EU-M4all page: https://www.ema.europa.eu/en/opinion-medicine-use-outside-EU/human/pyramax
- EMA, Pyramax product information (updated 6 Aug 2025): https://www.ema.europa.eu/en/documents/outside-eu-product-information/pyramax-product-information_en.pdf
- EMA, Pyramax procedural steps after opinion (II/0036, 5 Jun 2025): https://www.ema.europa.eu/en/documents/outside-eu-steps-after/pyramax-procedural-steps-taken-scientific-information-after-opinion_en.pdf
- EMA, CHMP summary of opinion, 19 Nov 2015: https://www.ema.europa.eu/en/documents/outside-eu-smop/chmp-post-authorisation-summary-positive-opinion-pyramax_en.pdf
- Internet Archive copy of Pyramax product information, 18 Feb 2024: http://web.archive.org/web/20240218045447id_/https://www.ema.europa.eu/en/documents/outside-eu-product-information/pyramax-product-information_en.pdf
- MMV news, 20 Aug 2025: https://www.mmv.org/newsroom/news-resources-search/pyramax-r-label-update-now-includes-information-treatment-pregnant
- MMV pipeline page, pyronaridine-artesunate granules: https://www.mmv.org/mmv-pipeline-antimalarial-drugs/pyronaridine-artesunate-granules
- WHO PQ product page, EMA Art 58 H-W-2319-3: https://extranet.who.int/prequal/medicines/ema-art-58-h-w-2319-3
- WHO, World Malaria Report 2025 annexes (Annex 4B; repo extract, carried): https://www.who.int/publications/m/item/annexes-world-malaria-report-2025
- WHO MFT implementation guide (carried): https://www.who.int/publications/i/item/9789240103603
- National registers (repo extracts, carried):
  - TMDA: https://imis2.tmda.go.tz/#/public/registered-medicines
  - NAFDAC: https://greenbook.nafdac.gov.ng/
  - Rwanda FDA: https://monitoring.rwandafda.gov.rw/register/hmdr/
  - ZAMRA: https://app.zamra.co.zm:42882/portal/#/public/registered-medicines
  - DAV: https://dichvucong.dav.gov.vn/congbothuoc/index

**DHA–PPQ and cross-cutting**
- WHO guidelines for malaria, v10.0, 10 Sep 2026: https://www.who.int/publications/i/item/guidelines-for-malaria
  - read via the MAGICapp API: https://api.magicapp.org/api/v1/guidelines?limit=5000
  - guideline JSON: https://s3.amazonaws.com/files.magicapp.org/guideline/ecb12237-3e0c-4614-9c41-c9da9a3c2c4c/guideline_10475-10_0.json
- EMA, Eurartesim product information: https://www.ema.europa.eu/en/documents/product-information/eurartesim-epar-product-information_en.pdf
- WHO PQ product pages, one per presentation:
  - https://extranet.who.int/prequal/medicines/ma093
  - https://extranet.who.int/prequal/medicines/ma094
  - https://extranet.who.int/prequal/medicines/ma131
  - https://extranet.who.int/prequal/medicines/ma139
  - https://extranet.who.int/prequal/medicines/ma140
  - https://extranet.who.int/prequal/medicines/ma141
  - https://extranet.who.int/prequal/medicines/ma151
  - https://extranet.who.int/prequal/medicines/ma157
  - https://extranet.who.int/prequal/medicines/ma177
- WHOPAR part 7, MA093 (dated March 2025): https://extranet.who.int/prequal/sites/default/files/whopar_files/MA093%20part7v3.pdf
- WHOPAR part 7, MA094 (dated January 2025): https://extranet.who.int/prequal/sites/default/files/whopar_files/ma094-part7v3.pdf
- Global Fund PQR transaction summary (repo extract of 23 Aug 2026, recomputed; carried): https://insights.theglobalfund.org/t/Public/views/PriceQualityReportingTransactionSummary/TransactionSummary
- PubMed E-utilities searches used to find the papers above: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
