#!/bin/bash
cp backups/index.html.backup-20260209-212023 index.html
cp backups/my-groups.js.backup-20260209-212023 modules/groups/my-groups.js
cp backups/bible-reader.js.backup-20260209-212023 modules/bible/bible-reader.js
echo "Rollback complete."
