#!/bin/zsh
set -e
cp backups/bible-loader.js.backup-$ts modules/bible/bible-loader.js
cp backups/bible-reader.js.backup-$ts modules/bible/bible-reader.js
cp backups/bible-picker.js.backup-$ts modules/bible/bible-picker.js
echo "Rolled back Bible loader fixes ($ts)."
