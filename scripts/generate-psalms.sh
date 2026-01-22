#!/bin/bash
# Generate Quick Insights for Psalms
# Run in background: ./scripts/generate-psalms.sh &

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Psalms generation..."
echo "📝 Log file: scripts/logs/psalms.log"

mkdir -p scripts/logs

GEMINI_API_KEY="AIzaSyAyW9eJeCS60izRPpHTqPSbPVLsBLT1vgo" \
  node scripts/generate-quick-insights.js PSA \
  > scripts/logs/psalms.log 2>&1 &

echo "✅ Psalms generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/psalms.log"
