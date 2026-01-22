#!/bin/bash
# Generate Quick Insights for Galatians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-galatians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Galatians generation..."
echo "📝 Log file: scripts/logs/galatians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-galatians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js GAL \
  > scripts/logs/galatians.log 2>&1 &

echo "✅ Galatians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/galatians.log"
