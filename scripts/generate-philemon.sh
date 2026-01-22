#!/bin/bash
# Generate Quick Insights for Philemon
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-philemon.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Philemon generation..."
echo "📝 Log file: scripts/logs/philemon.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-philemon.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js PHM \
  > scripts/logs/philemon.log 2>&1 &

echo "✅ Philemon generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/philemon.log"
