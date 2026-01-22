#!/bin/bash
# Generate Quick Insights for 1 Peter
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-1peter.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting 1 Peter generation..."
echo "📝 Log file: scripts/logs/1peter.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-1peter.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js 1PE \
  > scripts/logs/1peter.log 2>&1 &

echo "✅ 1 Peter generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/1peter.log"
