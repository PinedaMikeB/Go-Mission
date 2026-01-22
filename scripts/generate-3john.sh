#!/bin/bash
# Generate Quick Insights for 3 John
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-3john.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting 3 John generation..."
echo "📝 Log file: scripts/logs/3john.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-3john.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js 3JN \
  > scripts/logs/3john.log 2>&1 &

echo "✅ 3 John generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/3john.log"
