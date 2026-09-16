// Writes the products data back out in the repo's house style.
//
// Why this exists: a save that reformats the whole file produces a diff
// nobody can review, which defeats the point of having the history. Matching
// the existing layout byte for byte means a git diff shows only what actually
// changed.
//
// This is a port of the Python implementation in
// streamlit-app/launch_data.py (_enc / _fmt / file_header /
// serialize_products_js). The two must stay in step; the round-trip test in
// scripts/test-serializer.js is what proves this one is still faithful.
//
// Loads both ways:
//   const ser = require("./serialize-products.js");   // Node
//   <script src="scripts/serialize-products.js">      // browser -> window.LAUNCH_SERIALIZE

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.LAUNCH_SERIALIZE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const FALLBACK_HEADER = "window.LAUNCH_DATA =\n";

  const enc = (v) => JSON.stringify(v);

  const isScalar = (v) =>
    v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";

  // A flat array of scalars counts as inline-able too: the file keeps rows
  // like `{ "stages": [2, 3] }` on one line. Note the Python original does
  // NOT do this and would expand those rows on its first save — see
  // docs/Handoff_Kyler.md. The file is the source of truth, not the port.
  const isInlineable = (v) =>
    isScalar(v) || (Array.isArray(v) && v.every(isScalar));

  const encInline = (v) =>
    Array.isArray(v) ? "[" + v.map(enc).join(", ") + "]" : enc(v);

  // House style: all-scalar objects print on one line (`{ "k": v, ... }`),
  // except top-level objects (meta, glossary) and the product rows themselves,
  // which stay expanded because they are the parts humans read and edit.
  function fmt(v, indent, depth, inProducts) {
    const pad = "  ".repeat(indent);

    if (Array.isArray(v)) {
      if (!v.length) return "[]";
      const lines = v.map((x) => `${pad}  ${fmt(x, indent + 1, depth + 1, inProducts)}`);
      return "[\n" + lines.join(",\n") + `\n${pad}]`;
    }

    if (v !== null && typeof v === "object") {
      const keys = Object.keys(v);
      if (!keys.length) return "{}";
      if (depth >= 2 && !(inProducts && depth === 2) && keys.every((k) => isInlineable(v[k]))) {
        return "{ " + keys.map((k) => `${enc(k)}: ${encInline(v[k])}`).join(", ") + " }";
      }
      const lines = keys.map(
        (k) => `${pad}  ${enc(k)}: ${fmt(v[k], indent + 1, depth + 1, inProducts || k === "products")}`
      );
      return "{\n" + lines.join(",\n") + `\n${pad}}`;
    }

    return enc(v);
  }

  // The comment banner up to and including the `window.LAUNCH_DATA =` line.
  // Preserved verbatim from the file being edited: it carries the schema
  // notes the next person to open the file needs.
  function fileHeader(sourceText) {
    if (typeof sourceText !== "string") return FALLBACK_HEADER;
    const m = sourceText.match(/^window\.LAUNCH_DATA\s*=[^\n]*\n/m);
    return m ? sourceText.slice(0, m.index + m[0].length) : FALLBACK_HEADER;
  }

  // `sourceText` is the file being replaced, read for its header. Pass null
  // only when there is no existing file to preserve.
  function serializeProducts(data, sourceText) {
    return fileHeader(sourceText) + fmt(data, 0, 0, false) + "\n";
  }

  return { serializeProducts, fileHeader, FALLBACK_HEADER };
});
