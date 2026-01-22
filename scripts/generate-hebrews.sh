#!/bin/bash
# Generate Quick Insights for Hebrews
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-hebrews.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Hebrews generation..."
echo "📝 Log file: scripts/logs/hebrews.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-hebrews.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js HEB \
  > scripts/logs/hebrews.log 2>&1 &

echo "✅ Hebrews generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/hebrews.log"
