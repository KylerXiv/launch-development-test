# Register fixtures

Each file is the staged register as fetched on 31 Aug 2026
(`sourcing/staging/nafdac_registrations.csv` or `tmda_registrations.csv`),
plus invented rows at the end. **None of the invented rows is real data.**
Each says TEST in its reference, its product name and its holder.

| File | Invented rows | The register watcher should |
|---|---|---|
| `nafdac-ganlum-registered.csv` | `TEST-A4-0001`: GanLum granules, Active since 20 Sep 2026. `TEST-A4-0002`: an ALAQ tablet, Inactive since its expiry on 9 Jan 2026 | propose GanLum · Country registration · Nigeria: Nigeria on the map, the count from 0 to 1, and the stage started. Propose nothing for the inactive ALAQ row |
| `tmda-ganlum-registered.csv` | `TEST-TAN 26,001 P01B NOV`: GanLum granules, Registered/Compliant since 25 Sep 2026 | propose GanLum · Country registration · Tanzania, starting the stage if run alone |

Run together, the two make two proposals. Only Nigeria's, the earlier
registration, starts GanLum's Country registration stage. Tanzania's only
draws its country.

With the real registers, the watcher proposes nothing. Nigeria and Tanzania
are already on the map for ASPY and DHA–PPQ, the only portfolio medicines
either register lists.

```bash
node scripts/propose-registers.js --only NAFDAC --nafdac test-data/registers/nafdac-ganlum-registered.csv --out /tmp/p
```

Or use Actions → **Propose changes from public sources** → Run workflow, and
pick a file. As with every fixture, a test proposal that is rejected is not
proposed again: change the invented date in a copy to show the route again.
