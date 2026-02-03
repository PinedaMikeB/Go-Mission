#!/bin/bash
# Rollback script for Go Mission - 2026-02-03 changes
# Run this to restore the previous version

echo "🔄 Rolling back to backup from 2026-02-03..."

cp "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/index.html.backup-2026-02-03" "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/index.html"

echo "✅ Rollback complete!"
echo "📁 Restored: index.html"
