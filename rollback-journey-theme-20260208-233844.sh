#!/bin/bash
set -euo pipefail
cp "backups/index.html.backup-20260208-233844" "index.html"
echo "Rolled back index.html from backups/index.html.backup-20260208-233844"
