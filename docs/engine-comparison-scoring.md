# Translation engine scoring sheet — DEV-28

Fill this in while reading `i18n/engine-comparison-fr.html` and `-pt.html`. The point is
to end with a decision you can defend in a sentence, not a gut feeling you have to
re-argue in October.

**Run both locales before deciding.** An engine can be clearly better in French and
merely equal in Portuguese, and Portuguese is the one neither of us can check as easily.

---

## Before you score — the asymmetry to hold in mind

DeepL supports glossaries on its free tier. Google's API-key endpoint (Translation v2)
does not; glossaries need Translation v3 Advanced, which requires a GCP project and OAuth
rather than a key.

So **brand names and INNs are not a fair comparison out of the box.** Score those rows in
section 2 and treat them as a question about setup cost, not translation quality. Sections
1 and 3–5 are where the engines compete on equal terms.

---

## 1 · Accuracy — does it say the same thing?

The only category where a bad score is disqualifying. A translation that reads beautifully
and means something different is worse than a clumsy one that is correct.

Watch specifically for:

- **Negation flips.** "not recommended" becoming "recommended" is rare but catastrophic,
  and it is invisible unless you read for it.
- **Hedging lost.** "may indicate" becoming "indicates". This dataset is full of
  carefully hedged clinical language and MT tends to harden it.
- **Thresholds.** "over 10%" must stay over, not around or above-or-equal.

| | DeepL | Google |
|---|---|---|
| Meaning preserved on every prose row (y/n) | | |
| Rows where meaning shifted — list them | | |
| Hedging preserved (1–5) | | |

---

## 2 · Domain terms and names

| | DeepL | Google |
|---|---|---|
| Brand names unchanged — GanLum, Pyramax, ALAQ (y/n) | | |
| INNs correct or correctly localised (1–5) | | |
| WHO terminology matches published French/Portuguese (1–5) | | |
| Country names correct (1–5) | | |
| Acronyms handled sensibly — ACT, MFT, PQ (1–5) | | |

**Then the setup question.** If Google wins on prose but needs v3 Advanced to pin brand
names, what does that cost — a GCP project, OAuth credentials, and a service account that
somebody has to own after handover? Write the answer here, because it is a real part of
the decision:

> 

---

## 3 · Tone and register

This dashboard is read by ministries of health and funders. It should sound like a
technical briefing, not a marketing page or a machine.

| | DeepL | Google |
|---|---|---|
| Register appropriate for the audience (1–5) | | |
| Reads as written by a person (1–5) | | |
| Consistent across rows (1–5) | | |

---

## 4 · Length growth

French and Portuguese normally run **15–30% longer** than English. The comparison page
prints per-row and average growth.

An engine consistently above that range is not wrong, but it costs layout work on the
short strings — stage names, legend labels, filter controls — where there is no room.

| | DeepL | Google |
|---|---|---|
| Average growth, FR | % | % |
| Average growth, PT | % | % |
| Worst single row | | |
| Any short label that clearly will not fit | | |

---

## 5 · Practical and post-handover

The person maintaining this after 18 November inherits whatever we choose.

| | DeepL | Google |
|---|---|---|
| Free allowance | 500,000 chars/month, ongoing | 90-day trial credit, then paid |
| Glossary on the free path | yes | no — needs v3 Advanced |
| Cost at our volume (~40k chars first pass) | | |
| Cost if the dataset triples | | |
| Setup burden for whoever inherits it | | |

---

## The decision

**Chosen engine:**

**In one sentence, why:**

> 

**What would change this decision:**

> 

**Date and who decided:**

---

Copy the decision and its reasoning into `docs/i18n-schema.md` under "Decisions already
made", so the next person does not reopen it.
