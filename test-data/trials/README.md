# Trial fixtures

Both files are `sourcing/staging/trials.csv` as restaged from the 28 Sep 2026
snapshot, with one row changed: ALAQ's pivotal trial, FD-TACT (NCT05951595).
**The changed values are invented.** The trial's acronym reads `FD-TACT-TEST`
in both, so the date line a proposal would write says so.

| File | Invented values | The trial watcher should |
|---|---|---|
| `alaq-primary-completion.csv` | Active, not recruiting; primary completion 15 Sep 2026, **actual** | propose ALAQ · R&D & clinical, date line "Phase III FD-TACT-TEST (NCT05951595) reached primary completion on 15 Sep 2026 (ClinicalTrials.gov)" |
| `alaq-estimate-moved.csv` | Still recruiting; primary completion **estimated** Jun 2027 | propose the date line "Phase III FD-TACT-TEST (NCT05951595): primary completion expected Jun 2027 (ClinicalTrials.gov estimate)" |

With the real list, the watcher proposes nothing:
- **GanLum, ASPY and DHA–PPQ** show development as done, so no trial is followed.
- **ALAQ:** FD-TACT's estimated primary completion, 31 Jul 2026, has passed and
  the registry still says recruiting (last updated 18 Nov 2025). That is left
  for a person, in the run summary.

```bash
node scripts/propose-trials.js --staging test-data/trials/alaq-primary-completion.csv --out /tmp/p
```

Or use Actions → **Propose changes from public sources** → Run workflow, and
pick a file.

**A rejected test proposal is not proposed again.** The watcher skips any
change whose fingerprint was rejected before, test data included. That is why
`test-data/regulatory/ema-ganlum-opinion.csv` now proposes nothing: its
proposal was rejected in an earlier test run. To show the route again, change
the invented date in a copy of the file.
