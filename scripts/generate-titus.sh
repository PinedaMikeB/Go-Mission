#!/bin/bash
# Generate Quick Insights for Titus
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-titus.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Titus generation..."
echo "📝 Log file: scripts/logs/titus.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-titus.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js TIT \
  > scripts/logs/titus.log 2>&1 &

echo "✅ Titus generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/titus.log"
