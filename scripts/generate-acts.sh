#!/bin/bash
# Generate Quick Insights for Acts
# Run in background: ./scripts/generate-acts.sh &

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Acts generation..."
echo "📝 Log file: scripts/logs/acts.log"

mkdir -p scripts/logs

GEMINI_API_KEY="AIzaSyAyW9eJeCS60izRPpHTqPSbPVLsBLT1vgo" \
  node scripts/generate-quick-insights.js ACT \
  > scripts/logs/acts.log 2>&1 &

echo "✅ Acts generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/acts.log"
