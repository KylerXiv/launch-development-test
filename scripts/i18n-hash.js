#!/usr/bin/env node
/**
 * scripts/i18n-hash.js  —  the only place in this repo that hashes anything
 *
 * A library, not a step: nothing runs this file directly. Every script that
 * needs a hash loads it with
 *
 *     const { key, digest } = require("./i18n-hash");
 *
 * so every script computes the same hash for the same input, on any machine.
 *
 *   key(text)     16-hex translation key for one English string.
 *                 Whitespace is collapsed and trimmed first, so "Pipeline" and
 *                 "Pipeline " are the same string. This is the key of every
 *                 entry in i18n/translations.json.
 *
 *   digest(value) full sha256 of any JSON value, in canonical form: object keys
 *                 sorted at every level, CRLF inside strings read as LF. The
 *                 same content gives the same digest on Windows and on Linux,
 *                 whatever order the keys were written in. Used for the
 *                 per-file hashes and for contentHash in content.en.json.
 *
 * FROZEN. Changing either rule — even how spaces are trimmed — changes every
 * key at once: all 404 lookups in translations.json miss, everything is
 * re-translated and billed, and hand corrections become unreachable.
 * assemble-content.js --check fails if a memory key stops matching this file.
 */
"use strict";
const crypto = require("crypto");

const sha256 = (s) => crypto.createHash("sha256").update(s, "utf8").digest("hex");

/** The one normalisation rule for English text. */
const normalise = (text) => String(text == null ? "" : text).replace(/\s+/g, " ").trim();

/** Translation key: sha256 of the normalised English, first 16 hex characters. */
const key = (text) => sha256(normalise(text)).slice(0, 16);

/** Canonical JSON: sorted keys, LF line endings inside strings, no whitespace. */
function canonical(v) {
  if (v === null || typeof v !== "object") {
    return JSON.stringify(typeof v === "string" ? v.replace(/\r\n/g, "\n") : v);
  }
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort()
    .filter((k) => v[k] !== undefined)
    .map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}

/** Full sha256 of a JSON value in canonical form. */
const digest = (value) => sha256(canonical(value));

module.exports = { key, digest, normalise, canonical };
