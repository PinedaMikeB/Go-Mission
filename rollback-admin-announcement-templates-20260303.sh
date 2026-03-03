#!/usr/bin/env bash
set -euo pipefail

REPO="/Volumes/Wotg Drive Mike/GitHub/Go-Mission"
cd "$REPO"

COMMIT="$(git log --grep='Admin announcements presets and notifications list workflow' --format=%H -n 1 || true)"
if [[ -z "${COMMIT}" ]]; then
  echo "No matching commit found for admin announcement templates rollback."
  echo "Nothing to revert."
  exit 1
fi

echo "Reverting commit: $COMMIT"
git revert --no-edit "$COMMIT"
echo "Rollback complete. Push with: git push origin main"
