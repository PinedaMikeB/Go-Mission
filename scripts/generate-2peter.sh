#!/bin/bash
# Generate Quick Insights for 2 Peter
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-2peter.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting 2 Peter generation..."
echo "📝 Log file: scripts/logs/2peter.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-2peter.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js 2PE \
  > scripts/logs/2peter.log 2>&1 &

echo "✅ 2 Peter generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/2peter.log"
