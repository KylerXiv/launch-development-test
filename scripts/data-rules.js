// Governance rules for the LAUNCH dashboard data, as pure functions.
//
// This file holds the rules themselves and nothing else: no file reads, no
// argv, no process.exit, no output. That is what lets the same rules run in
// two places — scripts/validate-data.js (the CLI gate, used by CI) and the
// browser-based data editor — without a second copy that can drift.
//
// Loads both ways:
//   const rules = require("./data-rules.js");        // Node
//   <script src="scripts/data-rules.js">             // browser -> window.LAUNCH_RULES
//
// Two rule sets, deliberately separate:
//   checkData(data)          the product data contract. Pure — takes the
//                            parsed object, returns findings. The editor uses
//                            this one.
//   checkStudyLayers(src)    the WHO-derived map overlays. Takes already-read
//                            file *contents* as strings, so it stays pure, but
//                            in practice only the CLI calls it: it needs three
//                            other data files the editor never touches.
//
// Changing a rule here means changing its SHACL twin in
// ontology/launch-shapes.ttl too — they are the same governance, expressed
// twice, and they are expected to agree.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LAUNCH_RULES = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const STATUSES = ["done", "prog", "late", "idle"];
  const DATA_STATUSES = ["illustrative", "draft", "live"];
  const PHASES = ["preclinical", "phase1", "phase2", "phase3", "regulatory", "access"];

  // The two WHO overlay files are checked by the same code path on purpose:
  // their normalizers emit a deliberately identical envelope, so a divergence
  // shows up here rather than in the browser.
  const DATASETS = [
    { file: "data/resistance.js", global: "LAUNCH_RESISTANCE", tag: "resistance",
      normalizer: "normalize-resistance.js", value: "v", dim: "drug", unit: "studies" },
    { file: "data/molecular-markers.js", global: "LAUNCH_MOLECULAR_MARKERS", tag: "molecular markers",
      normalizer: "normalize-molecular-markers.js", value: "p", dim: "marker", unit: "surveys" }
  ];

  // ---- extraction ----------------------------------------------------------
  // The data file is a comment header, then `window.LAUNCH_DATA = ` at a line
  // start, then strict JSON. Anchored to a line start so the mention of the
  // marker inside the comment header cannot match.
  function extractData(raw) {
    const m = raw.match(/^window\.LAUNCH_DATA\s*=\s*/m);
    if (!m) return { ok: false, reason: "no-marker" };
    const body = raw.slice(m.index + m[0].length).replace(/;?\s*$/, "");
    try {
      return { ok: true, data: JSON.parse(body) };
    } catch (e) {
      return { ok: false, reason: "bad-json", message: e.message };
    }
  }

  // ---- the product data contract -------------------------------------------
  function checkData(data) {
    const errors = [];
    const warnings = [];
    const err = (m) => errors.push(m);
    const warn = (m) => warnings.push(m);

    // ---- meta --------------------------------------------------------------
    if (!data.meta) err("meta: missing");
    else {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.meta.lastUpdated || ""))
        err(`meta.lastUpdated: must be YYYY-MM-DD, got "${data.meta.lastUpdated}"`);
      if (!DATA_STATUSES.includes(data.meta.dataStatus))
        err(`meta.dataStatus: must be one of ${DATA_STATUSES.join("/")} (controls the on-page banner), got "${data.meta.dataStatus}"`);
    }

    // ---- glossary ----------------------------------------------------------
    if (data.glossary !== undefined) {
      if (typeof data.glossary !== "object" || Array.isArray(data.glossary)) err("glossary: must be an object of term → definition");
      else for (const [term, def] of Object.entries(data.glossary)) {
        if (!term.trim()) err("glossary: empty term key");
        if (typeof def !== "string" || def.trim().length < 20) err(`glossary["${term}"]: definition must be a real sentence`);
      }
    }

    // ---- changelog ---------------------------------------------------------
    if (data.changelog !== undefined) {
      if (!Array.isArray(data.changelog)) err("changelog: must be an array");
      else {
        data.changelog.forEach((c, ci) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(c.date || "")) err(`changelog[${ci}]: date must be YYYY-MM-DD`);
          if (!c.product) err(`changelog[${ci}]: "product" is required (product name or "All")`);
          if (!c.change || c.change.trim().length < 10) err(`changelog[${ci}]: "change" must describe what changed`);
          // The RSS feed takes the first N entries as the newest — order matters.
          if (ci > 0 && (data.changelog[ci - 1].date || "") < (c.date || ""))
            warn(`changelog[${ci}]: dates not newest-first ("${data.changelog[ci - 1].date}" before "${c.date}") — the feed would drop the newest entries`);
        });
      }
    }

    // ---- stages ------------------------------------------------------------
    if (!Array.isArray(data.stages) || data.stages.length < 2)
      err("stages: must be an array of stage names");
    else if (data.stages.some((s) => typeof s !== "string" || !s.trim()))
      err("stages: every entry must be a non-empty string");
    const nStages = Array.isArray(data.stages) ? data.stages.length : 0;

    // ---- stageColumns ------------------------------------------------------
    // How stages[] is grouped into display columns. A column listing more than
    // one index is a parallel pair (no arrow, no implied order, shown side by
    // side) — currently [2, 3], WHO recommendation and WHO PQ listing. Optional:
    // its absence just means every stage gets its own column, as before.
    if (data.stageColumns !== undefined) {
      if (!Array.isArray(data.stageColumns) || data.stageColumns.length === 0) {
        err("stageColumns: must be a non-empty array of { stages: [...] } columns");
      } else {
        const seen = [];
        data.stageColumns.forEach((col, ci) => {
          const ctag = `stageColumns[${ci}]`;
          if (!col || !Array.isArray(col.stages) || col.stages.length === 0) {
            err(`${ctag}: "stages" must be a non-empty array of stage indices`);
            return;
          }
          if (col.stages.length > 3)
            warn(`${ctag}: ${col.stages.length} stages sharing one column — check this renders legibly`);
          col.stages.forEach((idx) => {
            if (!Number.isInteger(idx) || idx < 0 || idx >= nStages)
              err(`${ctag}: stage index ${JSON.stringify(idx)} is out of range for ${nStages} stages`);
            seen.push(idx);
          });
        });
        // flattened in column order, stageColumns must be exactly 0..nStages-1
        // ascending — grouping may merge adjacent indices but never reorder or
        // drop them, so every other consumer (currentStage, milestones,
        // stageIndex-keyed maps) keeps meaning what it already means.
        const expected = Array.from({ length: nStages }, (_, i) => i);
        if (JSON.stringify(seen) !== JSON.stringify(expected)) {
          err(`stageColumns: flattened in order must be exactly [${expected.join(", ")}], got [${seen.join(", ")}]`);
        }
      }
    }

    // ---- products ----------------------------------------------------------
    if (!Array.isArray(data.products) || data.products.length === 0) {
      err("products: must be a non-empty array");
    } else {
      const ids = new Set();
      data.products.forEach((p, pi) => {
        const tag = `products[${pi}] (${p.id || p.name || "?"})`;
        if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) err(`${tag}: id required (lowercase letters/digits/hyphens)`);
        if (ids.has(p.id)) err(`${tag}: duplicate id "${p.id}"`);
        ids.add(p.id);
        for (const k of ["name", "inn", "manufacturer", "classLabel"])
          if (!p[k]) err(`${tag}: "${k}" is required`);

        // Placeholder rows (e.g. spatial emanators) only need identity + note.
        if (p.placeholder) {
          if (!p.note) err(`${tag}: placeholder products need a "note"`);
          return;
        }

        if (!["pipeline", "market"].includes(p.class))
          err(`${tag}: class must be "pipeline" or "market", got "${p.class}"`);
        if (p.phase !== undefined && !PHASES.includes(p.phase))
          err(`${tag}: phase must be one of ${PHASES.join("/")}, got "${p.phase}"`);
        if (p.phase === undefined)
          warn(`${tag}: no "phase" — the product will not appear on the pipeline poster view`);

        // stage track
        if (!Array.isArray(p.stages) || p.stages.length !== nStages) {
          err(`${tag}: stages must have exactly ${nStages} entries (one per stage), got ${p.stages ? p.stages.length : 0}`);
        } else {
          let hasLate = false;
          p.stages.forEach((s, si) => {
            const stag = `${tag} stage "${data.stages[si]}"`;
            if (!STATUSES.includes(s.status)) err(`${stag}: status must be one of ${STATUSES.join("/")}, got "${s.status}"`);
            if (s.status === "late") {
              hasLate = true;
              if (!s.note || s.note.trim().length < 15)
                err(`${stag}: a delayed stage must carry a substantive reason in "note"`);
            }
            if (s.status !== "idle" && !s.asOf)
              warn(`${stag}: no "asOf" verification date`);
            if (s.asOf && !/^\d{4}-\d{2}-\d{2}$/.test(s.asOf))
              err(`${stag}: asOf must be YYYY-MM-DD, got "${s.asOf}"`);
          });
          if (hasLate && !p.flag)
            err(`${tag}: has a delayed stage but no top-level "flag" sentence explaining the bottleneck`);
          if (!hasLate && p.flag)
            warn(`${tag}: has a "flag" but no stage is marked late — flag will show without a red light`);
        }
        if (!Number.isInteger(p.currentStage) || p.currentStage < 0 || p.currentStage >= nStages)
          err(`${tag}: currentStage must be an integer 0–${nStages - 1}`);

        // detail
        const d = p.detail;
        if (!d) { err(`${tag}: "detail" is required`); return; }
        // == null also catches JSON null — a null shape must not slip past the
        // governance rules below (a null price would skip the price rule entirely).
        for (const k of ["price", "useCase", "access", "adoption", "research", "country", "milestones"])
          if (d[k] == null) err(`${tag}: detail.${k} is required (and must not be null)`);

        if (d.price != null && (typeof d.price !== "object" || Array.isArray(d.price)))
          err(`${tag}: detail.price must be an object`);
        else if (d.price) {
          if (typeof d.price.confirmedInWriting !== "boolean")
            err(`${tag}: detail.price.confirmedInWriting must be true or false`);
          const shown = d.price.value && !["TBC", "TBD", "—", "-"].includes(d.price.value.trim());
          if (shown && !d.price.confirmedInWriting && !d.price.source)
            err(`${tag}: a displayed price needs confirmedInWriting=true or a public "source" — governance rule`);
          if (shown && !d.price.asOf) warn(`${tag}: detail.price has no "asOf" date`);
        }
        if (d.country != null && (typeof d.country !== "object" || Array.isArray(d.country)))
          err(`${tag}: detail.country must be an object`);
        else if (d.country) {
          for (const k of ["registered", "inGuidelines", "inMft"]) {
            const v = d.country[k];
            // "TBC" is the honest value for a count we haven't verified yet —
            // an invented number is worse than an admitted gap.
            if (v !== "TBC" && (!Number.isInteger(v) || v < 0))
              err(`${tag}: detail.country.${k} must be a non-negative integer or "TBC"`);
          }
        }
        if (d.countries !== undefined) {
          const c = d.countries;
          if (!["illustrative", "draft", "verified"].includes(c.status))
            err(`${tag}: detail.countries.status must be illustrative/draft/verified`);
          if (c.status !== "verified" && (!c.note || c.note.trim().length < 20))
            err(`${tag}: unverified detail.countries needs a substantive "note" (shown as the map warning)`);
          if (!Array.isArray(c.list) || !c.list.length) err(`${tag}: detail.countries.list must be a non-empty array`);
          else {
            const seenIso = new Set();
            c.list.forEach((e, ei) => {
              if (!/^[A-Z]{3}$/.test(e.iso3 || "")) err(`${tag}: countries.list[${ei}].iso3 must be a 3-letter uppercase ISO code`);
              if (seenIso.has(e.iso3)) err(`${tag}: countries.list has duplicate iso3 "${e.iso3}"`);
              seenIso.add(e.iso3);
              if (!["registered", "guidelines", "mft"].includes(e.level))
                err(`${tag}: countries.list[${ei}].level must be registered/guidelines/mft`);
            });
          }
        }
        if (d.journey !== undefined) {
          if (!Array.isArray(d.journey) || d.journey.length < 2) err(`${tag}: detail.journey must be an array of at least 2 gates`);
          else {
            let prev = null;
            d.journey.forEach((g, gi) => {
              if (!g.label || !g.label.trim()) err(`${tag}: journey[${gi}] needs a "label"`);
              const y = g.year;
              if (y !== "TBC" && (!Number.isInteger(y) || y < 1990 || y > 2100))
                err(`${tag}: journey[${gi}].year must be a year (1990–2100) or "TBC"`);
              if (Number.isInteger(y) && Number.isInteger(prev) && y < prev)
                warn(`${tag}: journey[${gi}] year ${y} is earlier than the previous gate (${prev}) — check the order`);
              if (Number.isInteger(y)) prev = y;
            });
          }
        }
        if (d.volume == null && !d.volumeNote)
          warn(`${tag}: no volume data and no "volumeNote" explaining why`);
        if (d.volume) {
          if (!d.volume.total || !d.volume.period || !Array.isArray(d.volume.split))
            err(`${tag}: detail.volume needs total, period and split[]`);
          else {
            const sum = d.volume.split.reduce((a, s) => a + (s.pct || 0), 0);
            if (Math.abs(sum - 100) > 1) err(`${tag}: detail.volume.split percentages sum to ${sum}, expected 100`);
            d.volume.split.forEach((s) => { if (!s.channel) err(`${tag}: every volume split entry needs a "channel"`); });
          }
        }
        if (d.milestones != null && !Array.isArray(d.milestones)) {
          err(`${tag}: detail.milestones must be an array`);
        } else if (Array.isArray(d.milestones)) {
          d.milestones.forEach((mrow, mi) => {
            const mtag = `${tag} milestone[${mi}]`;
            for (const k of ["milestone", "status", "label", "date", "next", "anticipated"])
              if (mrow[k] === undefined) err(`${mtag}: "${k}" is required`);
            if (!STATUSES.includes(mrow.status)) err(`${mtag}: bad status "${mrow.status}"`);
            if (mrow.status === "done" && (!mrow.source || !mrow.source.trim()))
              warn(`${mtag}: completed milestone "${mrow.milestone}" has no source citation`);
          });
        }
      });
    }

    return { errors, warnings };
  }

  // ---- the WHO study-result layers -----------------------------------------
  // Governance for the WHO-derived map overlays. Takes file CONTENTS, not
  // paths, so the rules stay free of I/O:
  //
  //   checkStudyLayers({
  //     worldMap: "<contents of data/world-map.js>",
  //     datasets: [{ file, source } | { file, missing: true }, ...]
  //   })
  //
  // Only the CLI calls this — the editor never touches these files, and must
  // never offer to edit them: they are regenerated byte-identically by their
  // normalizers from sourcing/raw/.
  function checkStudyLayers(sources) {
    const errors = [];
    const warnings = [];
    const err = (m) => errors.push(m);
    const warn = (m) => warnings.push(m);

    const evaluate = (source) => {
      const box = {};
      new Function("window", source)(box);
      return box;
    };

    let drawn = {};
    try {
      const mapBox = evaluate(sources.worldMap);
      drawn = (mapBox.LAUNCH_MAP && mapBox.LAUNCH_MAP.countries) || {};
    } catch (e) {
      err("data/world-map.js could not be evaluated: " + e.message);
    }

    for (const entry of sources.datasets) {
      const DS = DATASETS.find((d) => d.file === entry.file);
      if (entry.missing) {
        warn(`${DS.file} is missing — run "node scripts/${DS.normalizer}"`);
        continue;
      }
      let box;
      try {
        box = evaluate(entry.source);
      } catch (e) {
        err(`${DS.file} could not be evaluated: ` + e.message);
        continue;
      }
      const R = box[DS.global];
      if (!R || typeof R !== "object") {
        err(`${DS.file} did not define window.${DS.global}`);
        continue;
      }
      const m = R.meta || {};
      for (const k of ["source", "sourceUrl", "extract", "metric", "rule", "status"])
        if (!m[k] || !String(m[k]).trim()) err(`${DS.tag} meta: "${k}" is required`);
      if (!["illustrative", "draft", "verified"].includes(m.status))
        err(`${DS.tag} meta.status must be illustrative/draft/verified (got "${m.status}")`);
      // The rule is printed under the map. A vague one is a governance failure:
      // an aggregated dot the reader cannot interpret is worse than no dot.
      if (m.rule && String(m.rule).trim().length < 40)
        err(`${DS.tag} meta.rule must spell out how site studies were reduced to one country value`);

      // ---- the study table that backs the click-through panel ----
      const FIELDS = Array.isArray(R.fields) ? R.fields : [];
      const CODED = Array.isArray(R.coded) ? R.coded : [];
      if (!FIELDS.length) err(`${DS.tag}: fields[] is required to decode studies[]`);
      for (const c of CODED)
        if (!R.dict || !Array.isArray(R.dict[c]))
          err(`${DS.tag}: coded column "${c}" has no dict[] to decode against`);
      const studies = Array.isArray(R.studies) ? R.studies : [];
      if (!studies.length) err(`${DS.tag}: studies[] is empty — the drill-down panel would have nothing to show`);
      const at = {}; FIELDS.forEach((f, i) => { at[f] = i; });
      if (!(DS.value in at))
        err(`${DS.tag}: fields[] has no "${DS.value}" column — the dots have no value to draw from`);
      let badRow = 0, badCode = 0, uncited = 0, unnamed = 0;
      studies.forEach((row, i) => {
        if (!Array.isArray(row) || row.length !== FIELDS.length) { if (badRow++ < 3) err(`${DS.tag} studies[${i}]: expected ${FIELDS.length} values, got ${row && row.length}`); return; }
        for (const c of CODED) {
          const v = row[at[c]];
          if (!Number.isInteger(v) || !R.dict[c] || v < 0 || v >= R.dict[c].length) {
            if (badCode++ < 3) err(`${DS.tag} studies[${i}]: "${c}" index ${v} is outside dict.${c}`);
          }
        }
        const v = row[at[DS.value]], yr = row[at.year];
        if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100)
          err(`${DS.tag} studies[${i}]: value must be a number 0–100 (got ${JSON.stringify(v)})`);
        if (!Number.isInteger(yr) || yr < 1990 || yr > new Date().getUTCFullYear() + 1)
          err(`${DS.tag} studies[${i}]: implausible year ${JSON.stringify(yr)}`);
        // WHO itself publishes the occasional study with no site or region
        // named. Nothing is filtered out of this dataset, so that is recorded
        // as provenance debt, not treated as a failure — the panel renders it
        // as "—" and the coordinates still place the dot.
        if (!row[at.site] || !String(row[at.site]).trim()) unnamed++;
        // Decode before testing: the citation is an index into dict.citation,
        // and index 0 is a perfectly good index. Testing the index for
        // truthiness only worked because "" happens to sort first.
        if (!String((R.dict.citation || [])[row[at.citation]] || "").trim()) uncited++;
      });
      if (Number.isInteger(m.studyCount) && m.studyCount !== studies.length)
        err(`${DS.tag} meta.studyCount says ${m.studyCount} but studies[] holds ${studies.length} — rerun the normalizer`);

      // ---- the aggregated dots ----
      const layers = Object.keys(R).filter((k) => !["meta", "fields", "coded", "dict", "studies"].includes(k));
      if (!layers.length) err(`${DS.file} has no study-result layers`);
      const thisYear = new Date().getUTCFullYear();
      let cells = 0, undrawn = 0;
      for (const layer of layers) {
        for (const [dim, bySpecies] of Object.entries(R[layer] || {})) {
          if (!dim.trim()) err(`${DS.tag}.${layer}: a ${DS.dim} key is empty`);
          for (const [species, countries] of Object.entries(bySpecies || {})) {
            if (!species.trim()) err(`${DS.tag}.${layer} ${dim}: a species key is empty`);
            for (const [iso3, e] of Object.entries(countries)) {
              const tag = `${DS.tag}.${layer} ${dim} ${species} ${iso3}`;
              cells++;
              if (!/^[A-Z]{3}$/.test(iso3)) err(`${tag}: iso3 must be 3 uppercase letters`);
              // Not an error: WHO covers small island states the 110m basemap
              // does not draw. But it is silently dropped data, so say so.
              else if (!(iso3 in drawn)) { undrawn++; }
              if (typeof e.v !== "number" || !Number.isFinite(e.v) || e.v < 0 || e.v > 100)
                err(`${tag}: v must be a number between 0 and 100 (got ${JSON.stringify(e.v)})`);
              if (!Number.isInteger(e.year) || e.year < 1990 || e.year > thisYear + 1)
                err(`${tag}: year must be an integer between 1990 and ${thisYear + 1}`);
              if (!Number.isInteger(e.sites) || e.sites < 1)
                err(`${tag}: sites must say how many studies the dot averages`);
              if (!Number.isFinite(e.lat) || e.lat < -90 || e.lat > 90 ||
                  !Number.isFinite(e.lon) || e.lon < -180 || e.lon > 180)
                err(`${tag}: lat/lon are required and must be valid coordinates`);
            }
          }
        }
      }
      if (Number.isInteger(m.cellCount) && m.cellCount !== cells)
        err(`${DS.tag} meta.cellCount says ${m.cellCount} but ${cells} were found — rerun the normalizer`);
      if (unnamed) warn(`${DS.tag}: ${unnamed} of ${studies.length} ${DS.unit} name no site in the source data`);
      if (uncited) warn(`${DS.tag}: ${uncited} of ${studies.length} ${DS.unit} have no citation URL (WHO publishes many without one)`);
      if (undrawn) warn(`${DS.tag}: ${undrawn} country value(s) fall outside the drawn basemap and are invisible on the map`);
    }

    return { errors, warnings };
  }

  return {
    STATUSES, DATA_STATUSES, PHASES, DATASETS,
    extractData, checkData, checkStudyLayers
  };
});
