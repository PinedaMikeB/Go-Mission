#!/usr/bin/env bash
set -euo pipefail
TS="$ts"
ROOT="$(cd "$(dirname "$0")" && pwd)"

cp -a "$ROOT/backups/bible-reader.js.backup-$TS" "$ROOT/modules/bible/bible-reader.js"
cp -a "$ROOT/backups/my-groups.js.backup-$TS" "$ROOT/modules/groups/my-groups.js"

echo "Rolled back bible-reader.js and my-groups.js to backup $TS"
