#!/usr/bin/env bash
# Creates the labels the proposal flow depends on. Run once per repository.
#
# The issue form applies `proposal` and `waiting` itself, but GitHub silently
# skips a label that does not exist — so the form looks like it worked while
# nothing downstream fires. That is what this script prevents.
#
# The rejection reasons are deliberately a fixed, short list: the reason
# decides what happens next, so it cannot be free text.
#
#   send back  -> the author files a better version
#   closed     -> recorded with a fingerprint; never proposed again
#
# Usage:  bash scripts/setup-labels.sh [owner/repo]

set -euo pipefail
REPO="${1:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"

label() {
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
  echo "  $1"
}

echo "Labels for $REPO:"

# the queue
label "proposal"     "0E8A16" "A proposed change to the dashboard data"
label "waiting"      "FBCA04" "Checked, and waiting for someone to approve or reject"
label "needs-fixing" "D93F0B" "The form could not be read as a proposal — see the bot's comment"

# the gate
label "approved"     "1D76DB" "Approved — applied, checked and merged automatically"

# rejections that send it back to its author
label "rejected:wrong-value"      "B60205" "Send back — the value is not what the source says"
label "rejected:evidence-missing" "B60205" "Send back — the evidence does not support this"

# rejections that close it for good
label "rejected:not-a-change"     "5319E7" "Closed — the source changed shape, the figure did not"
label "rejected:already-known"    "5319E7" "Closed — already recorded"
label "rejected:superseded"       "5319E7" "Closed — overtaken by a later change"

echo
echo "Done. The form applies 'proposal' and 'waiting'; reviewers apply the rest."
