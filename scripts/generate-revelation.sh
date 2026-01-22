#!/bin/bash
# Generate Quick Insights for Revelation
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-revelation.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Revelation generation..."
echo "📝 Log file: scripts/logs/revelation.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-revelation.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js REV \
  > scripts/logs/revelation.log 2>&1 &

echo "✅ Revelation generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/revelation.log"
