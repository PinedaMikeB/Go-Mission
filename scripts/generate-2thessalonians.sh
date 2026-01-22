#!/bin/bash
# Generate Quick Insights for 2 Thessalonians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-2thessalonians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting 2 Thessalonians generation..."
echo "📝 Log file: scripts/logs/2thessalonians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-2thessalonians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js 2TH \
  > scripts/logs/2thessalonians.log 2>&1 &

echo "✅ 2 Thessalonians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/2thessalonians.log"
