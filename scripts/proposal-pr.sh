#!/usr/bin/env bash
# Puts a proposal on its own branch, applied to the record, and makes sure an
# open pull request carries it — so the reviewer sees the real diff and, once
# pr-preview.yml has run, the real public dashboard, before anyone decides.
#
#   bash scripts/proposal-pr.sh <issue-number> <proposal.json>
#
# Run from a checkout of main. The branch, proposal/<n>, is rebuilt from that
# commit every time and force-pushed: it belongs to the bot and is never a place
# to hand-edit. proposal-decision.yml refuses to merge one whose data file is
# not exactly the proposal applied to main.
#
# Called by proposal-intake.yml (on filing and on every edit) and by
# proposal-decision.yml (when main has moved since the preview was built).
# Needs GH_TOKEN with contents and pull-requests write. Prints pr=<number> and
# sha=<commit>, appends them to $GITHUB_OUTPUT when set, and returns to the
# branch it started on.
set -euo pipefail

N="${1:-}"
PROPOSAL="${2:-}"
[[ "$N" =~ ^[0-9]+$ ]] || { echo "proposal-pr: issue number must be numeric, got '$N'" >&2; exit 2; }
[ -f "$PROPOSAL" ] || { echo "proposal-pr: no proposal file at '$PROPOSAL'" >&2; exit 2; }

BRANCH="proposal/$N"
START=$(git symbolic-ref -q --short HEAD || git rev-parse HEAD)
TITLE=$(node -e '
  const path = require("path");
  const p = require(path.resolve(process.argv[1]));
  process.stdout.write(require("./scripts/proposal-lib.js").titleFor(p).replace(/^Proposal: /, ""));
' "$PROPOSAL")

git config user.name  "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

git checkout --quiet -B "$BRANCH"
node scripts/proposal-lib.js apply "$PROPOSAL"
# By name, never -A: the data file is the only thing a proposal may change.
git add data/products.js
git commit --quiet -m "Proposal #$N: $TITLE" -m "Applied from the snapshot recorded when issue #$N was filed."
git push --quiet --force origin "$BRANCH"
SHA=$(git rev-parse HEAD)

PR=$(gh pr list --head "$BRANCH" --state open --json number --jq '.[0].number // empty')
if [ -z "$PR" ]; then
  BODY_FILE=$(mktemp)
  cat > "$BODY_FILE" <<EOF
Proposed in #$N. This pull request is that proposal applied to the record: the
diff below is exactly what would change, and a link to the public dashboard with
the change in it is posted here as a comment once the preview is built.

**The decision is made on #$N**, not here: label it \`approved\` or
\`rejected:…\`. Approving checks that this branch is still exactly the proposal
on today's \`main\`, then merges it — if \`main\` has moved, it rebuilds the branch
and the preview and asks for the approval again.

The branch is rebuilt by the bot on every edit to #$N. Do not push to it.

Closes #$N
EOF
  URL=$(gh pr create --base main --head "$BRANCH" --title "Proposal #$N: $TITLE" --body-file "$BODY_FILE")
  rm -f "$BODY_FILE"
  PR="${URL##*/}"
fi

git checkout --quiet "$START"

for kv in "pr=$PR" "sha=$SHA"; do
  echo "$kv"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "$kv" >> "$GITHUB_OUTPUT"; fi
done
