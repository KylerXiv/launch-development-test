#!/usr/bin/env bash
# Builds the public deploy output: every public-facing HTML page (root,
# unitaid/, synthetic/, and the fr/ and pt/ editions of the illustrated
# journey dashboard) plus the data/ and assets/ files they load.
#
# Deliberately excluded, and never copied here: briefs/, sourcing/, ontology/,
# docs/, history/, powerbi/, streamlit-app/, scripts/ itself, and repo files
# like README.md/CLAUDE.md.
#
# editor.html is excluded too, and that omission is the ONLY thing keeping the
# data editor off the public site. It is not an oversight — do not add it. Vercel reads the whole private repo to run this
# script, but only files copied into $OUT end up on the public URL.
#
# api/ is not copied either, and must not be: Vercel deploys it from the repo
# as functions, separately from $OUT. Their responses are public; their source
# is not served. See docs/email-backend-notes.md.
set -euo pipefail

OUT=public-site
rm -rf "$OUT"
mkdir -p "$OUT/data" "$OUT/assets/journey-icons" "$OUT/unitaid/assets" "$OUT/synthetic"

# Root pages
cp index.html explainer.html option-b.html pipeline.html story.html \
   widget.html illustrated-journey-dashboard.html feed.xml "$OUT/"

# unitaid/ edition
cp unitaid/index.html unitaid/option-b.html unitaid/pipeline.html unitaid/story.html "$OUT/unitaid/"
cp unitaid/assets/unitaid-logo.svg "$OUT/unitaid/assets/"

# synthetic/ edition
cp synthetic/index.html synthetic/option-b.html synthetic/pipeline.html \
   synthetic/story.html synthetic/widget.html "$OUT/synthetic/"

# Shared data
cp data/products.js data/products.synthetic.js data/world-map.js \
   data/world-map-geo.js \
   data/sources.js data/treatment-policy.js "$OUT/data/"

# Shared assets
cp assets/journey-icons/icons.js assets/journey-icons/icons-solid.js "$OUT/assets/journey-icons/"
cp assets/who-emblem.svg assets/unitaid-logo.svg assets/report-issue.js assets/site-nav.js "$OUT/assets/"
# The emails' logo (api/_mail.js LOGO_PATH): emails load it from this site,
# as a PNG because mail apps do not show SVG
mkdir -p "$OUT/assets/email"
cp assets/email/unitaid-logo.png "$OUT/assets/email/"

# French and Portuguese editions of the illustrated journey dashboard, from
# the translation memory (docs/translation-notes.md). --allow-stale because a
# hand-made change reaches main before the translate bot has run, and English
# does not wait for French: new text shows in English until it is translated.
# A locale page that fails its self-check still fails the build.
node scripts/build-locale-pages.js --allow-stale
LOCALES="fr pt"
for loc in $LOCALES; do
  mkdir -p "$OUT/$loc"
  cp -R "dist/locale/$loc/." "$OUT/$loc/"
done

# Switch the language menu on. assets/site-nav.js lists French and Portuguese
# as "coming soon" by default, because the repo served as it is (a local server,
# GitHub Pages) has no fr/ or pt/ folders to link to. This build has just
# written them, so every copy of the menu in the output (the English page's and
# each locale's own) is told they are live, through the menu's own
# window.LAUNCH_LOCALES_LIVE setting. A language added to LOCALES is switched
# on here too.
LIVE="window.LAUNCH_LOCALES_LIVE = window.LAUNCH_LOCALES_LIVE || {$(for loc in $LOCALES; do printf ' %s: true,' "$loc"; done | sed 's/,$//') };"
for f in "$OUT/assets/site-nav.js" $(for loc in $LOCALES; do printf '%s ' "$OUT/$loc/assets/site-nav.js"; done); do
  { printf '%s\n' "$LIVE"; cat "$f"; } > "$f.tmp" && mv "$f.tmp" "$f"
done
