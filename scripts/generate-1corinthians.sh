#!/bin/bash
# Generate Quick Insights for 1 Corinthians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-1corinthians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting 1 Corinthians generation..."
echo "📝 Log file: scripts/logs/1corinthians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-1corinthians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js 1CO \
  > scripts/logs/1corinthians.log 2>&1 &

echo "✅ 1 Corinthians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/1corinthians.log"
