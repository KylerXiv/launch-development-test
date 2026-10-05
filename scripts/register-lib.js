// Shared helpers for the registration fetchers added after NAFDAC and TMDA:
// fetch-zamra.js, fetch-mcaz.js, fetch-dav.js. A library, not a step: nothing
// runs this file directly.
//
// Every fetcher here follows the NAFDAC/TMDA pattern (sourcing/README.md):
//   sourcing/raw/<source>/<date>.json        dated snapshot, portfolio-relevant records only
//   sourcing/staging/<source>_registrations.csv
//   sourcing/reports/<source>-watch-<date>.md  what changed since the last earlier snapshot
// and only ever writes under sourcing/. The staging files share one column
// layout (COLUMNS) so the country-access derivation can read them all the same way.
//
// Requires Node 18+ (global fetch). No dependencies.

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36";
const today = new Date().toISOString().slice(0, 10);

// Ingredient families that select candidate records before mapProductId has
// the final word. Spellings cover registers that drop the final "e"
// (Viet Nam: "Pyronaridin", "Piperaquin") and Kenya's "Pyronarodine".
const FAMILY = /pyronar[io]din|piperaquin|amodiaquin|ganaplacid|pyramax|eurartesim/i;

// Portfolio matching, as in the other fetchers, widened for the spellings above.
// ALAQ is checked before nothing else can claim it: AL + amodiaquine only.
function mapProductId(text) {
  const t = String(text || "").toLowerCase();
  if (/ganaplacid/.test(t)) return "ganlum";
  if ((/pyronar[io]din/.test(t) && /artesunat/.test(t)) || /pyramax|arpycom/.test(t)) return "pyramax";
  if ((/(dihydroartemisinin|artenimol)/.test(t) && /piperaquin/.test(t)) || /eurartesim/.test(t)) return "dhappq";
  if (/artemether/.test(t) && /lumefantrin/.test(t) && /amodiaquin/.test(t)) return "alaq";
  return "";
}

// One layout for every new staging file.
const COLUMNS = ["productId", "iso3", "registrationNo", "brandName", "ingredients", "form", "strength",
  "holder", "manufacturer", "issueDate", "expiryDate", "status", "sourceUrl", "retrievedDate"];

const isoDate = v => (v ? String(v).slice(0, 10) : "");
const clean = v => String(v ?? "").replace(/\s+/g, " ").trim();

// For a host that leaves its intermediate certificate out of the TLS chain
// (ZAMRA does): verify against Node's roots plus that one intermediate, kept
// in scripts/certs/. Verification stays on; nothing here skips it.
function httpsWithCa(url, { method, body, headers, timeout, ca }) {
  const https = require("https");
  const tls = require("tls");
  const extra = fs.readFileSync(path.join(__dirname, "certs", ca), "utf8");
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers, ca: [...tls.rootCertificates, extra], timeout }, res => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); } catch (e) { reject(e); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timed out")));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function request(url, { method = "GET", body, headers = {}, label = "request", timeout = 120000, ca } = {}, attempt = 1) {
  try {
    const allHeaders = { "user-agent": UA, accept: "application/json, text/plain, */*", ...headers };
    if (ca) return await httpsWithCa(url, { method, body, headers: allHeaders, timeout, ca });
    const res = await fetch(url, {
      method,
      body,
      headers: allHeaders,
      signal: AbortSignal.timeout(timeout),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt >= 2) throw new Error(`${label} failed twice (${url.slice(0, 90)}…): ${e.cause?.code || e.message || e}`);
    return request(url, { method, body, headers, label, timeout, ca }, attempt + 1);
  }
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows, columns = COLUMNS) {
  return [columns.join(","), ...rows.map(r => columns.map(c => csvEscape(r[c])).join(","))].join("\n") + "\n";
}

function sortRows(rows) {
  return rows.sort((a, b) => a.productId.localeCompare(b.productId) || a.iso3.localeCompare(b.iso3)
    || a.registrationNo.localeCompare(b.registrationNo) || a.brandName.localeCompare(b.brandName));
}

// The most recent snapshot from a day before today (a same-day rerun never
// diffs against itself).
function loadPrevious(rawDir) {
  if (!fs.existsSync(rawDir)) return null;
  const dates = fs.readdirSync(rawDir)
    .map(f => (f.match(/^(\d{4}-\d{2}-\d{2})\.json$/) || [])[1])
    .filter(d => d && d < today)
    .sort();
  if (!dates.length) return null;
  const date = dates[dates.length - 1];
  return { date, snapshot: JSON.parse(fs.readFileSync(path.join(rawDir, `${date}.json`), "utf8")) };
}

function diff(prevRows, rows, fields = ["status", "expiryDate", "issueDate"]) {
  const key = r => `${r.iso3}|${r.registrationNo}|${r.brandName}|${r.strength}`;
  const label = r => `${r.brandName || "(no brand)"}${r.strength ? " " + r.strength : ""} (${[r.iso3, r.registrationNo].filter(Boolean).join(" ")}${r.productId ? `, **${r.productId}**` : ""})`;
  const prevBy = new Map(prevRows.map(r => [key(r), r]));
  const currBy = new Map(rows.map(r => [key(r), r]));
  const changes = [];
  for (const [k, r] of currBy) {
    const old = prevBy.get(k);
    if (!old) { changes.push(`- **NEW** ${label(r)}${r.issueDate ? ` — issued ${r.issueDate}` : ""}${r.status ? `, ${r.status}` : ""}`); continue; }
    for (const field of fields) {
      if ((old[field] || "") !== (r[field] || "")) changes.push(`- ${label(r)} — ${field}: \`${old[field] || "—"}\` → \`${r[field] || "—"}\``);
    }
  }
  for (const [k, old] of prevBy) {
    if (!currBy.has(k)) changes.push(`- **GONE** ${label(old)} — no longer returned by the source (check for withdrawal or expiry)`);
  }
  return changes;
}

// Writes the snapshot, the staging CSV and the watch report, and prints a
// summary. `toRows(snapshot)` must rebuild the rows from a snapshot, so the
// previous run is re-read with today's mapping rules and only real changes show.
function writeOutputs({ source, title, sourceLine, snapshot, toRows }) {
  const rawDir = path.join(root, "sourcing", "raw", source);
  const stagingDir = path.join(root, "sourcing", "staging");
  const reportDir = path.join(root, "sourcing", "reports");
  [rawDir, stagingDir, reportDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

  const previous = loadPrevious(rawDir);
  const rows = sortRows(toRows(snapshot));

  fs.writeFileSync(path.join(rawDir, `${today}.json`), JSON.stringify(snapshot, null, 1) + "\n");
  fs.writeFileSync(path.join(stagingDir, `${source}_registrations.csv`), toCsv(rows));

  let reportBody;
  if (!previous) {
    reportBody = `First snapshot — no previous run to diff against. ${rows.length} portfolio rows staged.`;
  } else {
    const changes = diff(sortRows(toRows(previous.snapshot)), rows);
    reportBody = changes.length
      ? `Changes since ${previous.date}:\n\n${changes.join("\n")}`
      : `No changes since ${previous.date}. ${rows.length} portfolio rows staged.`;
  }
  fs.writeFileSync(path.join(reportDir, `${source}-watch-${today}.md`), `# ${title} — ${today}\n\nSource: ${sourceLine}\n\n${reportBody}\n`);

  const byProduct = rows.reduce((m, r) => (m[r.productId] = (m[r.productId] || 0) + 1, m), {});
  console.log(`${rows.length} portfolio rows (${Object.entries(byProduct).map(([k, v]) => `${k} ${v}`).join(" · ") || "none"}) → sourcing/staging/${source}_registrations.csv`);
  console.log(`Snapshot → sourcing/raw/${source}/${today}.json`);
  console.log(`Report → sourcing/reports/${source}-watch-${today}.md`);
  console.log("\n" + reportBody);
  return rows;
}

function run(main) {
  main().catch(err => { console.error(err.message || err); process.exit(1); });
}

module.exports = { UA, today, FAMILY, mapProductId, COLUMNS, isoDate, clean, request, toCsv, diff, writeOutputs, run };
