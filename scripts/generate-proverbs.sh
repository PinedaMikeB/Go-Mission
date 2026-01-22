#!/bin/bash
# Generate Quick Insights for Proverbs
# Run in background: ./scripts/generate-proverbs.sh &

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Proverbs generation..."
echo "📝 Log file: scripts/logs/proverbs.log"

mkdir -p scripts/logs

GEMINI_API_KEY="AIzaSyAyW9eJeCS60izRPpHTqPSbPVLsBLT1vgo" \
  node scripts/generate-quick-insights.js PRO \
  > scripts/logs/proverbs.log 2>&1 &

echo "✅ Proverbs generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/proverbs.log"
