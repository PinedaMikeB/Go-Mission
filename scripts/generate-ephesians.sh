#!/bin/bash
# Generate Quick Insights for Ephesians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-ephesians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Ephesians generation..."
echo "📝 Log file: scripts/logs/ephesians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-ephesians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js EPH \
  > scripts/logs/ephesians.log 2>&1 &

echo "✅ Ephesians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/ephesians.log"
