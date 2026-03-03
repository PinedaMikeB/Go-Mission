#!/usr/bin/env bash
set -euo pipefail

REPO="/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
cd "$REPO"

COMMIT="$(git log --grep='Jitsi logo research docs and rollback point' --format=%H -n 1 || true)"
if [[ -z "${COMMIT}" ]]; then
  echo "No matching commit found for Jitsi logo research rollback."
  echo "Nothing to revert."
  exit 1
fi

echo "Reverting commit: $COMMIT"
git revert --no-edit "$COMMIT"
echo "Rollback complete. Push with: git push origin main"
