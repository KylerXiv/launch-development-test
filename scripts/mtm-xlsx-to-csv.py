#!/usr/bin/env python3
"""Split a WHO Malaria Threat Map .xlsx export into one CSV per sheet.

    python3 scripts/mtm-xlsx-to-csv.py <export.xlsx> <out-dir> [--prefix 2026-09-09-mm]

Why this exists: WHO publishes these extracts as .xlsx, which Node cannot read
here without a dependency, and this repo has none. But an .xlsx is a zip of XML and Python's standard
library reads both, so the step does not have to be manual and does not add a
dependency. The archived CSVs remain the reproducible input that CI and
teammates run the normalizer against -- this script only removes the trip
through Excel that used to produce them.

Sheet names are slugified into file names. The Disclaimer and Glossary sheets
are written out too: they are WHO's own terms of use and column definitions,
and they cost 2 KB to keep next to the data they describe.

Requires Python 3.8+. No third-party packages.
"""
import csv
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def col_index(ref):
    """'BC12' -> 54. Cells carry their address, and sparse rows skip empties."""
    letters = re.match(r"([A-Z]+)", ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + ord(ch) - 64
    return n - 1


def cell_text(c, shared):
    t = c.get("t")
    if t == "inlineStr":
        node = c.find(NS + "is")
        return "".join(x.text or "" for x in node.iter(NS + "t")) if node is not None else ""
    v = c.find(NS + "v")
    if v is None or v.text is None:
        return ""
    if t == "s":
        return shared[int(v.text)]
    return v.text


def sheet_rows(z, target, shared):
    root = ET.fromstring(z.read(target))
    data = root.find(NS + "sheetData")
    if data is None:
        return
    for row in data:
        cells = {}
        for c in row:
            ref = c.get("r")
            cells[col_index(ref) if ref else len(cells)] = cell_text(c, shared)
        width = max(cells) + 1 if cells else 0
        yield [cells.get(i, "") for i in range(width)]


def sheets(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")):
            shared.append("".join(t.text or "" for t in si.iter(NS + "t")))
    rels = {r.get("Id"): r.get("Target")
            for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    for sh in ET.fromstring(z.read("xl/workbook.xml")).find(NS + "sheets"):
        target = rels[sh.get(RNS + "id")].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        yield sh.get("name"), list(sheet_rows(z, target, shared))


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main(argv):
    if len(argv) < 3:
        sys.exit(__doc__)
    src, out_dir = Path(argv[1]), Path(argv[2])
    prefix = ""
    if "--prefix" in argv:
        prefix = argv[argv.index("--prefix") + 1] + "-"
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in sheets(src):
        # pad every row to the widest, so the CSV is rectangular and any
        # reader can index by column without bounds-checking
        width = max((len(r) for r in rows), default=0)
        dest = out_dir / (prefix + slug(name) + ".csv")
        # newline="" per csv docs; LF endings so the file matches what the repo
        # stores rather than needing normalisation on commit
        with open(dest, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f, lineterminator="\n")
            for r in rows:
                w.writerow(r + [""] * (width - len(r)))
        print("%-28s %5d rows x %2d cols -> %s" % (name, len(rows), width, dest))


if __name__ == "__main__":
    main(sys.argv)
