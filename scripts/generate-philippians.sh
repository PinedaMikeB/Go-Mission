#!/bin/bash
# Generate Quick Insights for Philippians
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-philippians.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Philippians generation..."
echo "📝 Log file: scripts/logs/philippians.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-philippians.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js PHP \
  > scripts/logs/philippians.log 2>&1 &

echo "✅ Philippians generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/philippians.log"
