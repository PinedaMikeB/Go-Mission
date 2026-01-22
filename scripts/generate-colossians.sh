#!/bin/bash
# Generate Quick Insights for Colossians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-colossians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Colossians generation..."
echo "📝 Log file: scripts/logs/colossians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-colossians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js COL \
  > scripts/logs/colossians.log 2>&1 &

echo "✅ Colossians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/colossians.log"
