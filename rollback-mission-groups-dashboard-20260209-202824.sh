#!/bin/zsh
set -e
cp backups/index.html.backup-$ts index.html
cp backups/my-groups.js.backup-$ts modules/groups/my-groups.js
echo "Rolled back mission-groups dashboard changes ($ts)."
