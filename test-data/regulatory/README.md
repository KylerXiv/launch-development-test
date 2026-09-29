# Regulatory fixtures

`who-pq-ganlum-listed.csv` is `sourcing/staging/regulatory_events.csv` as
fetched on 31 Aug 2026, plus one invented row: **`TEST-0001`, WHO listing
GanLum on 15 Sep 2026**. It is not real WHO data.

With the real list, the source watcher proposes nothing — GanLum and ALAQ are
not prequalified, and ASPY and DHA–PPQ are already shown as listed. This file
exists so the whole route can be seen working:

```bash
node scripts/propose-regulatory.js --staging test-data/regulatory/who-pq-ganlum-listed.csv --out /tmp/p
```

or Actions → **Propose changes from public sources** → Run workflow → pick this
file. The proposal it files says it is test data, in its notes and in the WHO
reference (`TEST-0001`), so it cannot be mistaken for a real listing.
