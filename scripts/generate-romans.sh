#!/bin/bash
# Generate Quick Insights for Romans
# Run in background: ./scripts/generate-romans.sh &

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Romans generation..."
echo "📝 Log file: scripts/logs/romans.log"

mkdir -p scripts/logs

GEMINI_API_KEY="AIzaSyAyW9eJeCS60izRPpHTqPSbPVLsBLT1vgo" \
  node scripts/generate-quick-insights.js ROM \
  > scripts/logs/romans.log 2>&1 &

echo "✅ Romans generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/romans.log"
