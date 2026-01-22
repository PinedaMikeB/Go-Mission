#!/bin/bash
# Generate Quick Insights for Genesis
# Run in background: ./scripts/generate-genesis.sh &

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Genesis generation..."
echo "📝 Log file: scripts/logs/genesis.log"

mkdir -p scripts/logs

GEMINI_API_KEY="AIzaSyAyW9eJeCS60izRPpHTqPSbPVLsBLT1vgo" \
  node scripts/generate-quick-insights.js GEN \
  > scripts/logs/genesis.log 2>&1 &

echo "✅ Genesis generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/genesis.log"
