# Regulatory fixtures

Both files are `sourcing/staging/regulatory_events.csv` as fetched on 31 Aug
2026, plus invented rows. **None of the invented rows is real data.** Each says
so in its name and its reference.

| File | Invented rows | The source watcher should |
|---|---|---|
| `who-pq-ganlum-listed.csv` | `TEST-0001`: WHO lists GanLum, 15 Sep 2026 | propose GanLum · WHO PQ listing done |
| `ema-ganlum-opinion.csv` | `TEST-EMA-0001`: EMA positive EU-M4all opinion for GanLum, 18 Sep 2026. `TEST-EMA-0002`: ALAQ application withdrawn | propose GanLum · Regulatory approval (SRA) done, with its next step cleared; leave the withdrawn ALAQ row for a person |

With the real list, the watcher proposes nothing:
- **WHO PQ:** GanLum and ALAQ are not prequalified, and ASPY and DHA–PPQ
  already show as listed.
- **EMA:** only ASPY has an EU-M4all opinion, and its SRA stage already shows
  as done.

These files exist so the whole route can be seen working:

```bash
node scripts/propose-regulatory.js --staging test-data/regulatory/ema-ganlum-opinion.csv --out /tmp/p
```

Or use Actions → **Propose changes from public sources** → Run workflow, and
pick a file. The proposal it files says it is test data, in its notes and in
the reference, so it cannot be mistaken for a real listing or opinion.
