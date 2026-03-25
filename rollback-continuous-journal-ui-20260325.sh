#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

BASE_COMMIT="286142058209ab5b1b6663a8a2e37729dc260318"
FILES=(
  "modules/bible/bible-reader.js"
)

git checkout "$BASE_COMMIT" -- "${FILES[@]}"

if git diff --quiet -- "${FILES[@]}"; then
  echo "Rollback not needed. Files already match ${BASE_COMMIT}."
  exit 0
fi

git add "${FILES[@]}"
git commit -m "Rollback continuous journal UI"

echo "Rollback committed for: ${FILES[*]}"
