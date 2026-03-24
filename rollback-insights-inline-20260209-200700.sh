#!/bin/zsh
set -e
cp backups/bible-loader.js.backup-20260209-192802 modules/bible/bible-loader.js
cp backups/bible-reader.js.backup-20260209-192802 modules/bible/bible-reader.js
cp backups/bible-picker.js.backup-20260209-192802 modules/bible/bible-picker.js
rm -rf modules/bible/data-inline/quick-insights
echo "Rolled back quick-insights inline fallback (restored 20260209-192802 backups)."
