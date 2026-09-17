// Reading outside data into the LAUNCH dataset.
//
// Pure functions only — no file reads, no DOM, no network — so the whole
// pipeline can be tested from the command line (scripts/test-import.js). The
// browser layer in editor.html only picks files, hands over their text, and
// renders what comes back.
//
// The shape of the problem: an analyst has a spreadsheet from somewhere. Its
// columns are not our column names, its dates are in whatever format Excel
// decided, its "yes" might be "Y" or "TRUE" or "1", and a third of the rows
// may be blank. None of that should reach data/products.js, and none of it
// should be silently guessed at either: this module's job is to make a
// PROPOSAL that a human confirms, never to write anything.
//
// Loads both ways:
//   const imp = require("./import-lib.js");        // Node
//   <script src="scripts/import-lib.js">           // browser -> window.LAUNCH_IMPORT

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LAUNCH_IMPORT = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------- tokens
  // Values that mean "we do not know", which is different from zero and
  // different from blank-because-nobody-filled-it-in. All become "TBC", the
  // dataset's honest unknown.
  var UNKNOWN = ["tbc", "tbd", "n/a", "na", "none", "unknown", "?", "-", "—", "–", "tba", "pending"];
  var TRUEISH = ["true", "yes", "y", "1", "confirmed", "in writing", "signed"];
  var FALSEISH = ["false", "no", "n", "0", "unconfirmed", "not confirmed"];

  var STATUS_SYNONYMS = {
    done: ["done", "complete", "completed", "finished", "achieved", "yes", "approved", "granted", "listed", "y"],
    prog: ["prog", "in progress", "inprogress", "ongoing", "underway", "started", "submitted", "under review", "in review", "pending", "active"],
    late: ["late", "delayed", "blocked", "stalled", "overdue", "behind", "at risk", "stuck"],
    idle: ["idle", "not started", "notstarted", "not yet", "none", "no", "n/a", "na", "", "-"]
  };

  var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  // ---------------------------------------------------------------- helpers
  function stripBOM(t) { return t.charCodeAt(0) === 0xFEFF ? t.slice(1) : t; }
  function norm(s) {
    return String(s == null ? "" : s)
      .replace(/ /g, " ")
      .trim().toLowerCase()
      .replace(/[\s_\-.]+/g, " ")
      .replace(/[^\w %()/&]+/g, "")
      .trim();
  }
  function isBlank(v) { return v == null || String(v).trim() === ""; }
  function isUnknown(v) { return UNKNOWN.indexOf(String(v == null ? "" : v).trim().toLowerCase()) > -1; }

  // ---------------------------------------------------------------- delimited text
  // Sniffed rather than assumed: exports arrive comma-, tab- and
  // semicolon-separated, and a European export may use semicolons precisely
  // because its numbers contain commas.
  function sniffDelimiter(text) {
    // Each candidate is tried through the real parser, not a naive split:
    // quotes have to be respected or a delimiter that only ever appears
    // INSIDE quoted text looks perfectly consistent. A registrations export
    // with semicolons in its drug descriptions beat commas that way, because
    // it split every line into a tidy two columns.
    //
    // Scored by how many columns it yields, weighted by how consistently.
    // Consistency alone rewards the wrong answer: two columns every time is
    // very consistent and almost always wrong.
    var sample = text.split(/\r?\n/).slice(0, 60).join("\n");
    var best = ",", bestScore = -1;
    [",", "\t", ";", "|"].forEach(function (d) {
      var rows;
      try { rows = parseDelimited(sample, d).rows; } catch (e) { return; }
      rows = rows.filter(function (r) {
        return r.some(function (c) { return !isBlank(c); });
      });
      if (!rows.length) return;
      var counts = rows.map(function (r) { return r.length; });
      var mode = {}, top = 0, topN = 0;
      counts.forEach(function (c) {
        mode[c] = (mode[c] || 0) + 1;
        if (mode[c] > top || (mode[c] === top && c > topN)) { top = mode[c]; topN = c; }
      });
      if (topN < 2) return;
      var score = topN * (top / counts.length);
      if (score > bestScore) { bestScore = score; best = d; }
    });
    return best;
  }

  // RFC4180-ish: quoted fields, doubled quotes inside them, newlines inside
  // quotes, and a tolerance for stray quotes that Excel sometimes emits.
  function parseDelimited(text, delim) {
    text = stripBOM(text).replace(/\r\n?/g, "\n");
    delim = delim || sniffDelimiter(text);
    var rows = [], row = [], cell = "", inQ = false, i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        cell += ch; i++; continue;
      }
      if (ch === '"') { inQ = true; i++; continue; }
      if (ch === delim) { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
      cell += ch; i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return { rows: rows, delimiter: delim };
  }

  // Spreadsheets exported from anywhere often carry a title line, a blank
  // line, then the real header. Take the first row that looks like headers:
  // mostly non-empty, mostly non-numeric, and the widest thing around.
  function findHeaderRow(rows) {
    // The first row that reads like column headings: at least two filled
    // cells, and not mostly numbers. Deliberately NOT "the widest row" —
    // ragged data often has a body row longer than the header, and requiring
    // the widest picks that row instead.
    for (var i = 0; i < Math.min(rows.length, 30); i++) {
      var r = rows[i];
      var filled = r.filter(function (c) { return !isBlank(c); });
      if (filled.length < 2) continue;
      var numeric = filled.filter(function (c) {
        return /^-?[\d.,%$£€\s]+$/.test(String(c).trim());
      });
      if (numeric.length > filled.length / 2) continue;
      return i;
    }
    return 0;
  }

  function toRecords(text) {
    var p = parseDelimited(text);
    var rows = p.rows.filter(function (r) { return r.some(function (c) { return !isBlank(c); }); });
    if (!rows.length) return { headers: [], records: [], delimiter: p.delimiter, notes: ["The file has no rows in it."] };
    var hi = findHeaderRow(rows);
    var notes = [];
    if (hi > 0) notes.push("Skipped " + hi + " line(s) above the column headings.");
    var raw = rows[hi].map(function (h, i) { return isBlank(h) ? "column " + (i + 1) : String(h).trim(); });
    // duplicate headings are common and would otherwise silently overwrite
    var seen = {}, headers = raw.map(function (h) {
      var k = h.toLowerCase();
      if (seen[k]) { seen[k]++; return h + " (" + seen[k] + ")"; }
      seen[k] = 1; return h;
    });
    var records = [];
    rows.slice(hi + 1).forEach(function (r, n) {
      if (!r.some(function (c) { return !isBlank(c); })) return;
      if (r.length > headers.length) {
        notes.push("Row " + (n + 1) + " had " + r.length + " values for " + headers.length + " columns — the extras were dropped.");
      }
      var o = { __row: n + 1 };
      headers.forEach(function (h, ci) { o[h] = r[ci] == null ? "" : String(r[ci]).trim(); });
      records.push(o);
    });
    return { headers: headers, records: records, delimiter: p.delimiter, notes: notes };
  }

  // ---------------------------------------------------------------- JSON-ish
  function toRecordsFromJSON(text) {
    var body = stripBOM(text).trim();
    // our own data file, or anything else assigning an object to a global
    var m = body.match(/^\s*(?:window\.)?[A-Z_][A-Z0-9_]*\s*=\s*/m);
    if (m) body = body.slice(m.index + m[0].length).replace(/;?\s*$/, "");
    var data;
    try { data = JSON.parse(body); }
    catch (e) { return { headers: [], records: [], notes: ["This is not valid JSON — " + e.message] }; }

    var list = null;
    if (Array.isArray(data)) list = data;
    else if (data && typeof data === "object") {
      if (Array.isArray(data.products)) list = data.products;
      else {
        // any single array of objects inside the top level
        for (var k in data) {
          if (Array.isArray(data[k]) && data[k].length && typeof data[k][0] === "object") { list = data[k]; break; }
        }
        if (!list) list = [data];
      }
    }
    if (!list) return { headers: [], records: [], notes: ["No list of records found in this file."] };

    // flatten one level so detail.price.value becomes "detail.price.value"
    var headers = [], records = [];
    list.forEach(function (item, i) {
      var flat = { __row: i + 1 };
      (function walk(o, prefix, depth) {
        if (o == null || typeof o !== "object" || Array.isArray(o) || depth > 3) return;
        Object.keys(o).forEach(function (key) {
          var v = o[key], name = prefix ? prefix + "." + key : key;
          if (v && typeof v === "object" && !Array.isArray(v)) walk(v, name, depth + 1);
          else {
            flat[name] = Array.isArray(v) ? v.join("; ") : v;
            if (headers.indexOf(name) === -1) headers.push(name);
          }
        });
      })(item, "", 0);
      records.push(flat);
    });
    return { headers: headers, records: records, notes: [] };
  }

  function looksLikeJSON(text) {
    var t = stripBOM(text).trim();
    return /^[\[{]/.test(t) || /^\s*(?:window\.)?[A-Z_][A-Z0-9_]*\s*=\s*[\[{]/m.test(t);
  }

  function readFile(name, text) {
    var lower = String(name || "").toLowerCase();
    if (/\.(json|js|jsonl|ndjson)$/.test(lower) || looksLikeJSON(text)) {
      if (/\.(jsonl|ndjson)$/.test(lower)) {
        var lines = stripBOM(text).split(/\r?\n/).filter(function (l) { return l.trim(); });
        return toRecordsFromJSON("[" + lines.join(",") + "]");
      }
      var r = toRecordsFromJSON(text);
      if (r.records.length || r.notes.length) return r;
    }
    return toRecords(text);
  }


  // ---------------------------------------------------------------- coercion
  // Everything below answers the same question: this cell was typed by a human
  // into a spreadsheet — what did they mean? A null return means "could not
  // tell", which is always reported rather than guessed.

  function coerceText(v) {
    if (v == null) return "";
    return String(v).replace(/ /g, " ").replace(/\s+/g, " ").trim();
  }

  function coerceStatus(v) {
    var t = norm(v);
    if (t === "") return "idle";
    for (var k in STATUS_SYNONYMS) {
      if (STATUS_SYNONYMS[k].indexOf(t) > -1) return k;
    }
    // tolerate trailing detail: "complete (Feb 2024)", "delayed - awaiting GDG"
    for (var k2 in STATUS_SYNONYMS) {
      for (var i = 0; i < STATUS_SYNONYMS[k2].length; i++) {
        var syn = STATUS_SYNONYMS[k2][i];
        if (syn && t.indexOf(syn) === 0) return k2;
      }
    }
    return null;
  }

  function coerceBool(v) {
    var t = norm(v);
    if (t === "") return null;
    if (TRUEISH.indexOf(t) > -1) return true;
    if (FALSEISH.indexOf(t) > -1) return false;
    return null;
  }

  // Counts are an integer or the dataset's honest unknown.
  function coerceCount(v) {
    if (isBlank(v)) return null;
    if (isUnknown(v)) return "TBC";
    var t = String(v).replace(/[\s,'’]/g, "");
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    var m = t.match(/^(\d+)(?:\.0+)?$/);        // 25.0 out of a spreadsheet
    if (m) return parseInt(m[1], 10);
    var plus = t.match(/^(\d+)\+$/);            // "25+"
    if (plus) return parseInt(plus[1], 10);
    return null;
  }

  // Dates arrive in every shape a spreadsheet can produce. Ambiguous
  // day/month pairs are reported, never guessed: 03/04/2026 is two different
  // dates depending on which side of the Atlantic wrote it.
  function coerceDate(v) {
    if (isBlank(v) || isUnknown(v)) return { value: null, ambiguous: false };
    var t = coerceText(v);

    var iso = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (iso) return { value: pad(iso[1], iso[2], iso[3]), ambiguous: false };

    // Excel serial day number
    if (/^\d{5}$/.test(t)) {
      var d = new Date(Date.UTC(1899, 11, 30) + parseInt(t, 10) * 86400000);
      return { value: d.toISOString().slice(0, 10), ambiguous: false };
    }

    var named = t.match(/^(\d{1,2})[\s\-]*(?:st|nd|rd|th)?[\s\-]+([A-Za-z]{3,})[\s\-,]+(\d{4})$/);
    if (named) {
      var mi = MONTHS.indexOf(named[2].slice(0, 3).toLowerCase());
      if (mi > -1) return { value: pad(named[3], mi + 1, named[1]), ambiguous: false };
    }
    var named2 = t.match(/^([A-Za-z]{3,})[\s\-]+(\d{1,2})(?:st|nd|rd|th)?[\s\-,]+(\d{4})$/);
    if (named2) {
      var mi2 = MONTHS.indexOf(named2[1].slice(0, 3).toLowerCase());
      if (mi2 > -1) return { value: pad(named2[3], mi2 + 1, named2[2]), ambiguous: false };
    }

    var slash = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (slash) {
      var a = parseInt(slash[1], 10), b = parseInt(slash[2], 10);
      var yr = slash[3].length === 2 ? "20" + slash[3] : slash[3];
      if (a > 12 && b <= 12) return { value: pad(yr, b, a), ambiguous: false };   // must be D/M
      if (b > 12 && a <= 12) return { value: pad(yr, a, b), ambiguous: false };   // must be M/D
      // both <= 12: genuinely undecidable from the value alone
      return { value: pad(yr, b, a), ambiguous: true, alternative: pad(yr, a, b) };
    }
    return { value: null, ambiguous: false };
  }
  function pad(y, m, d) {
    return String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
  }

  function coerceYear(v) {
    if (isBlank(v) || isUnknown(v)) return "TBC";
    var m = String(v).match(/(\d{4})/);
    if (m) { var y = parseInt(m[1], 10); if (y >= 1990 && y <= 2100) return y; }
    return null;
  }

  function coercePrice(v) {
    if (isBlank(v)) return "";
    if (isUnknown(v)) return "TBC";
    return coerceText(v);
  }

  // ---------------------------------------------------------------- fields
  var FIELDS = [
    { key: "id", label: "Short name (for links)", coerce: function (v) { return norm(v).replace(/ /g, "-"); },
      aliases: ["id", "product id", "code", "short name", "slug", "key", "identifier", "product code"] },
    { key: "name", label: "Name", coerce: coerceText,
      aliases: ["name", "product", "product name", "medicine", "medicine name", "drug", "drug name", "brand", "brand name", "title"] },
    { key: "inn", label: "Generic name (INN)", coerce: coerceText,
      aliases: ["inn", "generic", "generic name", "international nonproprietary name", "molecule", "compound", "active ingredient", "substance"] },
    { key: "manufacturer", label: "Manufacturer", coerce: coerceText,
      aliases: ["manufacturer", "maker", "company", "mfr", "mfg", "producer", "supplier", "developer", "sponsor", "partner", "originator"] },
    { key: "classLabel", label: "Short description", coerce: coerceText,
      aliases: ["class label", "short description", "description", "category", "class description", "summary", "label"] },
    { key: "class", label: "In development or on market", coerce: function (v) {
        var t = norm(v);
        if (/market|launched|available|marketed|approved/.test(t)) return "market";
        if (/pipeline|development|candidate|investigational|trial/.test(t)) return "pipeline";
        return null;
      }, aliases: ["class", "type", "pipeline or market", "market status", "development status", "product type"] },
    { key: "phase", label: "Development phase", coerce: function (v) {
        var t = norm(v);
        if (/preclinic|pre clinic|discovery/.test(t)) return "preclinical";
        if (/\b(phase )?(1|i)\b/.test(t) && !/ii|iii|2|3/.test(t)) return "phase1";
        if (/\b(phase )?(2|ii)\b/.test(t) && !/iii|3/.test(t)) return "phase2";
        if (/\b(phase )?(3|iii)\b/.test(t)) return "phase3";
        if (/regulator|submission|review|filing|sra/.test(t)) return "regulatory";
        if (/access|launch|market|deliver/.test(t)) return "access";
        return null;
      }, aliases: ["phase", "development phase", "poster phase", "clinical phase", "stage of development", "rd phase"] },
    { key: "flag", label: "Access barrier", coerce: coerceText,
      aliases: ["flag", "access barrier", "barrier", "bottleneck", "blocker", "issue", "risk", "constraint"] },
    { key: "price", label: "Price", coerce: coercePrice,
      aliases: ["price", "unit price", "cost", "price per treatment", "price per course", "price usd", "unit cost", "ppu"] },
    { key: "priceSource", label: "Price source", coerce: coerceText,
      aliases: ["price source", "source of price", "price reference", "price ref"] },
    { key: "priceAsOf", label: "Price last checked", coerce: null,
      aliases: ["price as of", "price date", "price checked", "price verified", "price asof"] },
    { key: "priceConfirmed", label: "Price confirmed in writing", coerce: coerceBool,
      aliases: ["confirmed in writing", "price confirmed", "written confirmation", "confirmed", "confirmedinwriting"] },
    { key: "registered", label: "Approved for sale in", coerce: coerceCount,
      aliases: ["registered", "countries registered", "approved for sale in", "registrations", "approved in", "number registered", "no of registrations"] },
    { key: "inGuidelines", label: "In national guidelines in", coerce: coerceCount,
      aliases: ["in guidelines", "national guidelines", "guidelines", "countries in guidelines", "inguidelines"] },
    { key: "inMft", label: "Used alongside other treatments in", coerce: coerceCount,
      aliases: ["mft", "in mft", "inmft", "multiple first line", "multiple first line therapies", "used alongside other treatments in", "used alongside"] },
    { key: "volumeNote", label: "Volume note", coerce: coerceText,
      aliases: ["volume note", "volume", "procurement note", "doses", "volume comment", "volumenote", "procurement"] }
  ];

  function fieldByKey(k) {
    for (var i = 0; i < FIELDS.length; i++) if (FIELDS[i].key === k) return FIELDS[i];
    return null;
  }

  // ---------------------------------------------------------------- mapping
  // Exact alias first, then containment, then a token-overlap score. Anything
  // below the threshold is left unmapped and offered to the human instead of
  // being forced into the nearest-looking field.
  function scoreHeader(h, aliases) {
    var n = norm(h);
    if (!n) return 0;
    var ht = n.split(" ").filter(Boolean);
    var best = 0;
    for (var i = 0; i < aliases.length; i++) {
      var a = aliases[i];
      if (!a) continue;
      if (n === a) return 1;
      // Containment only counts on whole words, and only when the two are
      // close in length. Without that, the alias "short name" swallows a
      // column simply called "Name", which is a different field entirely.
      var at = a.split(" ").filter(Boolean);
      var shorter = ht.length <= at.length ? ht : at;
      var longer = ht.length <= at.length ? at : ht;
      var contained = shorter.every(function (t) { return longer.indexOf(t) > -1; });
      if (contained) {
        var ratio = shorter.length / longer.length;
        var sc = 0.55 + 0.35 * ratio;
        if (sc > best) best = sc;
        continue;
      }
      var hit = at.filter(function (t) { return ht.indexOf(t) > -1; }).length;
      if (!at.length) continue;
      var overlap = hit / Math.max(at.length, ht.length);
      if (overlap >= 0.6) { var s2 = overlap * 0.7; if (s2 > best) best = s2; }
    }
    return best;
  }

  function guessMapping(headers, stageNames) {
    var fields = {}, used = {}, stages = {}, scores = {};

    // Stage columns are claimed FIRST. A stage name comes from this dataset
    // and is therefore far more specific than a generic alias list — without
    // this order, "Procurement note" is taken by the volume-note field before
    // the Procurement step ever sees it.
    (stageNames || []).forEach(function (sn, i) {
      var target = norm(sn);
      headers.forEach(function (h) {
        if (used[h]) return;
        var n = norm(h);
        var isNote = / note$| notes$/.test(n);
        var base = n.replace(/ (status|note|notes|state)$/, "");
        var hit = base === target ||
                  base === "stage " + (i + 1) || base === "step " + (i + 1) ||
                  (target.length > 6 && base.indexOf(target) > -1) ||
                  (base.length > 6 && target.indexOf(base) > -1);
        if (!hit) return;
        stages[i] = stages[i] || {};
        if (isNote) stages[i].note = h; else stages[i].status = h;
        used[h] = true;
      });
    });

    // Then every remaining header is scored against every field, and the
    // strongest pairs are taken first. Assigning field-by-field in list order
    // let whichever field happened to come first claim a column a later field
    // matched far better.
    var pairs = [];
    FIELDS.forEach(function (f) {
      headers.forEach(function (h) {
        if (used[h]) return;
        var sc = scoreHeader(h, f.aliases);
        if (sc >= 0.55) pairs.push({ field: f.key, header: h, score: sc });
      });
    });
    pairs.sort(function (a, b) { return b.score - a.score; });
    pairs.forEach(function (pr) {
      if (fields[pr.field] || used[pr.header]) return;
      fields[pr.field] = pr.header;
      used[pr.header] = true;
      scores[pr.field] = pr.score;
    });

    var unmapped = headers.filter(function (h) { return !used[h] && h !== "__row"; });
    return { fields: fields, stages: stages, unmapped: unmapped, scores: scores };
  }

  // ---------------------------------------------------------------- planning
  function matchExisting(rec, mapping, products) {
    var byId = mapping.fields.id ? norm(rec[mapping.fields.id]).replace(/ /g, "-") : "";
    if (byId) {
      for (var i = 0; i < products.length; i++) if (products[i].id === byId) return i;
    }
    var nm = mapping.fields.name ? norm(rec[mapping.fields.name]) : "";
    if (nm) {
      for (var j = 0; j < products.length; j++) if (norm(products[j].name) === nm) return j;
    }
    var inn = mapping.fields.inn ? norm(rec[mapping.fields.inn]) : "";
    if (inn) {
      for (var k = 0; k < products.length; k++) if (norm(products[k].inn) === inn) return k;
    }
    return -1;
  }

  // Produces a list of proposed changes. Nothing here mutates the draft — the
  // caller shows this to a human, who chooses what to apply.
  function planImport(records, mapping, draft) {
    var stageNames = draft.stages || [];
    var out = { creates: [], updates: [], skipped: [], issues: [] };

    records.forEach(function (rec) {
      var changes = [], issues = [];

      Object.keys(mapping.fields).forEach(function (key) {
        var header = mapping.fields[key], raw = rec[header];
        if (isBlank(raw)) return;
        var f = fieldByKey(key);
        var val;
        if (key === "priceAsOf") {
          var d = coerceDate(raw);
          if (d.value == null) { issues.push("Could not read the price date “" + raw + "”"); return; }
          if (d.ambiguous) issues.push("The price date “" + raw + "” could be " + d.value + " or " + d.alternative + " — read as " + d.value);
          val = d.value;
        } else {
          val = f.coerce ? f.coerce(raw) : coerceText(raw);
        }
        if (val === null) { issues.push("Could not read “" + raw + "” as " + f.label.toLowerCase()); return; }
        if (val === "") return;
        changes.push({ field: key, label: f.label, value: val, raw: String(raw) });
      });

      Object.keys(mapping.stages).forEach(function (i) {
        var m = mapping.stages[i], idx = Number(i);
        if (m.status && !isBlank(rec[m.status])) {
          var st = coerceStatus(rec[m.status]);
          if (st === null) issues.push("Could not read “" + rec[m.status] + "” as a status for " + (stageNames[idx] || ("step " + (idx + 1))));
          else changes.push({ field: "stage:" + idx + ":status", label: (stageNames[idx] || "Step " + (idx + 1)) + " status", value: st, raw: String(rec[m.status]) });
        }
        if (m.note && !isBlank(rec[m.note])) {
          changes.push({ field: "stage:" + idx + ":note", label: (stageNames[idx] || "Step " + (idx + 1)) + " note", value: coerceText(rec[m.note]), raw: String(rec[m.note]) });
        }
      });

      if (!changes.length) {
        out.skipped.push({ row: rec.__row, reason: "Nothing recognisable in this row", issues: issues });
        return;
      }

      var at = matchExisting(rec, mapping, draft.products || []);
      var label = (mapping.fields.name && coerceText(rec[mapping.fields.name])) ||
                  (mapping.fields.id && coerceText(rec[mapping.fields.id])) ||
                  ("row " + rec.__row);

      if (at > -1) {
        var prod = draft.products[at], real = [];
        changes.forEach(function (c) {
          var current = currentValue(prod, c.field);
          if (String(current === undefined ? "" : current) !== String(c.value)) {
            // One shape for every proposed change, whether it creates or
            // updates: `value` is always what would be written. `from` is
            // extra, for showing what it replaces. Two different key names
            // for the same idea is a trap for whoever applies the plan.
            real.push({ field: c.field, label: c.label, from: current, value: c.value, raw: c.raw });
          }
        });
        if (!real.length) {
          out.skipped.push({ row: rec.__row, reason: "Already matches " + (prod.name || prod.id), issues: issues });
          return;
        }
        out.updates.push({ row: rec.__row, index: at, label: prod.name || prod.id, changes: real, issues: issues });
      } else {
        out.creates.push({ row: rec.__row, label: label, changes: changes, issues: issues });
      }
    });

    // A file with far more rows than distinct medicines is almost certainly
    // one row per EVENT — a purchase order, a disbursement, a registration —
    // rather than one row per medicine. Importing it would create hundreds of
    // near-duplicates. The shape is detectable, so say so loudly rather than
    // letting someone find out after applying.
    out.notices = [];
    var labels = {}, distinct = 0;
    out.creates.forEach(function (c) {
      var k = String(c.label).trim().toLowerCase();
      if (!labels[k]) { labels[k] = 0; distinct++; }
      labels[k]++;
    });
    var repeated = Object.keys(labels).filter(function (k) { return labels[k] > 1; });
    if (out.creates.length >= 10 && distinct > 0 && out.creates.length / distinct >= 2) {
      out.notices.push({
        level: "stop",
        text: out.creates.length + " rows would become new medicines, but there are only " +
              distinct + " different names among them \u2014 about " +
              Math.round(out.creates.length / distinct) + " rows each. This looks like one row " +
              "per transaction or event, not one row per medicine. Importing it would create " +
              "hundreds of near-duplicates."
      });
    } else if (repeated.length) {
      out.notices.push({
        level: "warn",
        text: repeated.length + " name(s) appear on more than one row and would each be added " +
              "twice \u2014 for example \u201c" + repeated[0] + "\u201d."
      });
    }
    if (out.creates.length >= 50 && !out.notices.length) {
      out.notices.push({
        level: "warn",
        text: "This would add " + out.creates.length + " medicines at once. Worth checking a " +
              "few before applying."
      });
    }
    return out;
  }

  function currentValue(prod, field) {
    var m = field.match(/^stage:(\d+):(\w+)$/);
    if (m) {
      var st = (prod.stages || [])[Number(m[1])];
      return st ? st[m[2]] : undefined;
    }
    var d = prod.detail || {};
    switch (field) {
      case "price": return (d.price || {}).value;
      case "priceSource": return (d.price || {}).source;
      case "priceAsOf": return (d.price || {}).asOf;
      case "priceConfirmed": return (d.price || {}).confirmedInWriting;
      case "registered": return (d.country || {}).registered;
      case "inGuidelines": return (d.country || {}).inGuidelines;
      case "inMft": return (d.country || {}).inMft;
      case "volumeNote": return d.volumeNote;
      default: return prod[field];
    }
  }

  function setValue(prod, field, value) {
    var m = field.match(/^stage:(\d+):(\w+)$/);
    if (m) {
      prod.stages = prod.stages || [];
      while (prod.stages.length <= Number(m[1])) prod.stages.push({ status: "idle", note: "" });
      prod.stages[Number(m[1])][m[2]] = value;
      return;
    }
    prod.detail = prod.detail || {};
    var d = prod.detail;
    switch (field) {
      case "price": d.price = d.price || { confirmedInWriting: false }; d.price.value = value; return;
      case "priceSource": d.price = d.price || { confirmedInWriting: false }; d.price.source = value; return;
      case "priceAsOf": d.price = d.price || { confirmedInWriting: false }; d.price.asOf = value; return;
      case "priceConfirmed": d.price = d.price || {}; d.price.confirmedInWriting = value; return;
      case "registered": d.country = d.country || {}; d.country.registered = value; return;
      case "inGuidelines": d.country = d.country || {}; d.country.inGuidelines = value; return;
      case "inMft": d.country = d.country || {}; d.country.inMft = value; return;
      case "volumeNote": d.volumeNote = value; return;
      default: prod[field] = value;
    }
  }

  return {
    UNKNOWN: UNKNOWN, TRUEISH: TRUEISH, FALSEISH: FALSEISH,
    STATUS_SYNONYMS: STATUS_SYNONYMS, MONTHS: MONTHS,
    norm: norm, isBlank: isBlank, isUnknown: isUnknown,
    sniffDelimiter: sniffDelimiter, parseDelimited: parseDelimited,
    findHeaderRow: findHeaderRow, toRecords: toRecords,
    toRecordsFromJSON: toRecordsFromJSON, looksLikeJSON: looksLikeJSON,
    readFile: readFile,
    coerceText: coerceText, coerceStatus: coerceStatus, coerceBool: coerceBool,
    coerceCount: coerceCount, coerceDate: coerceDate, coerceYear: coerceYear,
    coercePrice: coercePrice,
    FIELDS: FIELDS, fieldByKey: fieldByKey, scoreHeader: scoreHeader,
    guessMapping: guessMapping, planImport: planImport,
    currentValue: currentValue, setValue: setValue, matchExisting: matchExisting
  };
});
