# Import test files

Drag these into the **Import data** panel of the staging dashboard to see how
it copes. Nothing here touches `data/products.js` — import only builds a draft,
and the draft still has to pass the save gate.

Regenerate with `node scripts/make-import-fixtures.js`.
Check the expected behaviour with `node scripts/report-import-fixtures.js`.

## What each file is for

| File | What it tests | What should happen |
|---|---|---|
| `01-clean-small.csv` | The easy case | 3 new medicines, everything mapped |
| `02-messy-headers.csv` | `PRODUCT_NAME`, `Maker`, `No. of Registrations` | Still mapped; "Reviewer Initials" left alone |
| `03-updates-existing.csv` | Rows matching medicines already in the dashboard | 2 updates, 1 skipped as unchanged — **not** 3 new |
| `04-semicolon-european.csv` | Semicolons, `1.250`, `US$ 1,20`, `14/03/2026` | 3 new; 2 issues raised for the ambiguous dates |
| `05-tabs-with-junk.tsv` | Three title lines above the real header, tab-separated | Junk skipped and reported; 2 new |
| `06-quoted-nightmare.csv` | Commas, doubled quotes and newlines inside quoted cells | 3 new, text intact |
| `07-ragged-and-blank.csv` | Duplicate headers, blank rows, rows longer than the header | 3 rows read; overflow reported |
| `08-statuses-every-way.csv` | Eleven ways of writing a status, plus "banana" | Statuses mapped; "banana" raises an issue rather than guessing |
| `09-dates-every-way.csv` | ISO, long form, D/M, M/D, Excel serial, two-digit year, prose | Readable ones converted; ambiguous flagged; prose refused |
| `10-stages-and-notes.csv` | Columns named after steps, plus note columns | 2 updates against the right steps |
| `11-products.json` | JSON array with nested `detail.price.value` | 2 new, nested fields flattened |
| `12-launch-contract.js` | Our own `window.LAUNCH_DATA = …` format | 2 new |
| `13-lines.ndjson` | Newline-delimited JSON | 3 new |
| `14-nothing-useful.csv` | Meeting minutes — nothing to do with medicines | **Nothing mapped, nothing created.** A false match here would be worse than no match |
| `15-empty.csv` | Empty file | Reported, no crash |
| `16-headers-only.csv` | Headers with no rows | No rows, no crash |
| `17-large-500.csv` | 500 rows with stage columns | 500 new |
| `18-large-5000.csv` | 5,000 rows | 5,000 new; parses in tens of milliseconds |
| `19-mixed-mess.csv` | BOM, title line, semicolons, blanks, junk values, multi-line quotes, and one row matching an existing medicine | 3 new, 1 update, several issues, junk reported |

## The point of the awkward ones

`14-nothing-useful.csv` matters most. Import that guesses is worse than import
that refuses: a column called "Minutes reference" must not become a product id
just because the word "reference" appears in an alias list. If that file ever
starts producing medicines, something has been loosened too far.

`09-dates-every-way.csv` is the second. `03/04/2026` is the 3rd of April or the
4th of March depending on who typed it, and the value alone cannot say which.
It is read one way and the alternative is reported — never silently chosen.
