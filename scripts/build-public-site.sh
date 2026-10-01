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
   data/world-map-geo.js data/resistance.js data/molecular-markers.js \
   data/sources.js data/treatment-policy.js "$OUT/data/"

# Shared assets
cp assets/journey-icons/icons.js assets/journey-icons/icons-solid.js "$OUT/assets/journey-icons/"
cp assets/who-emblem.svg assets/unitaid-logo.svg assets/report-issue.js assets/site-nav.js "$OUT/assets/"

# French and Portuguese editions of the illustrated journey dashboard, from
# the translation memory (docs/translation-notes.md). --allow-stale because a
# hand-made change reaches main before the translate bot has run, and English
# does not wait for French: new text shows in English until it is translated.
# A locale page that fails its self-check still fails the build.
node scripts/build-locale-pages.js --allow-stale
for loc in fr pt; do
  mkdir -p "$OUT/$loc"
  cp -R "dist/locale/$loc/." "$OUT/$loc/"
done
