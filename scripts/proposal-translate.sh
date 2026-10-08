#!/usr/bin/env bash
# Builds what an approved proposal merges: the proposal on main as main is now,
# the English content rebuilt from it, and its new strings translated into
# French, Portuguese and Spanish — one commit on proposal/<n>, which
# proposal-decision.yml then squash-merges. English and the three translations
# land on main together (docs/translation-notes.md).
#
#   bash scripts/proposal-translate.sh <issue-number> <pr-head-sha>
#
# Run from a checkout of main on which proposal-decision.yml has just applied
# the snapshot and found data/products.js byte-for-byte the pull request's.
# That file is the only thing taken from the proposal. i18n/content.en.json and
# i18n/translations.json are rebuilt here, on today's main: the translate bot
# may have refreshed content.en.json on main since the pull request was opened,
# and the pull request's own copy would then conflict with it.
#
# The approval is the contentHash of the content rebuilt here, passed to
# translate-strings.js as APPROVED_CONTENT_HASH. It equals the pull request's
# own contentHash unless main's page or other data files moved since then —
# changes that were already live in English — and both are recorded.
#
# English does not wait for French. If the engine fails for a locale, the
# commit is made anyway and that locale's new text shows in English until
# translate.yml fills it. A locale page that fails its self-check stops
# everything: nothing is pushed, and the approval job merges nothing.
#
# Uses TRANSLATE_ENGINE and GOOGLE_API_KEY from the environment. Prints
# sha= content_hash= reviewed_hash= left_fr= left_pt= left_es= failed= and appends them
# to $GITHUB_OUTPUT when set. Leaves the checkout on the branch it started on.
set -euo pipefail
N="${1:-}"
SHA="${2:-}"
[[ "$N" =~ ^[0-9]+$ ]] || { echo "proposal-translate: issue number must be numeric, got '$N'" >&2; exit 2; }
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "proposal-translate: need the pull request's head commit, got '$SHA'" >&2; exit 2; }
BRANCH="proposal/$N"
START=$(git symbolic-ref -q --short HEAD || git rev-parse HEAD)

hash_of() { node -e 'let r="";process.stdin.on("data",(c)=>(r+=c)).on("end",()=>{try{process.stdout.write(JSON.parse(r).contentHash||"")}catch(e){}})'; }
REVIEWED=$( { git show "$SHA:i18n/content.en.json" 2>/dev/null || true; } | hash_of)

node scripts/assemble-content.js
HASH=$(hash_of < i18n/content.en.json)
export APPROVED_CONTENT_HASH="$HASH"

FAILED=""
for loc in fr pt es; do
  if ! node scripts/translate-strings.js --locale="$loc"; then
    FAILED="${FAILED:+$FAILED }$loc"
    echo "proposal-translate: translation to $loc failed; its new text stays in English until the translate bot runs" >&2
  fi
done
# what is still in English after this, per locale (0 when everything new was translated)
left() { node scripts/translate-strings.js --dry-run | sed -n "s/^  $1: .* · \([0-9][0-9]*\) to translate .*/\1/p"; }
LEFT_FR=$(left fr)
LEFT_PT=$(left pt)
LEFT_ES=$(left es)

node scripts/build-locale-pages.js
rm -rf dist

git config user.name  "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git checkout --quiet -B "$BRANCH"
git add data/products.js i18n/content.en.json i18n/translations.json
git commit --quiet -m "Proposal #$N: approved, with its translations" \
  -m "The snapshot recorded when issue #$N was filed, on main as it is now; contentHash $HASH."
# Only over the commit the reviewer approved: if anyone pushed since, this fails.
git push --quiet --force-with-lease="refs/heads/$BRANCH:$SHA" origin "HEAD:refs/heads/$BRANCH"
NEW=$(git rev-parse HEAD)
git checkout --quiet "$START"

for kv in "sha=$NEW" "content_hash=$HASH" "reviewed_hash=$REVIEWED" "left_fr=$LEFT_FR" "left_pt=$LEFT_PT" "left_es=$LEFT_ES" "failed=$FAILED"; do
  echo "$kv"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$kv" >> "$GITHUB_OUTPUT"; fi
done
