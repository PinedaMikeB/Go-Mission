#!/bin/bash
# Generate Quick Insights for James
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-james.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting James generation..."
echo "📝 Log file: scripts/logs/james.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-james.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js JAS \
  > scripts/logs/james.log 2>&1 &

echo "✅ James generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/james.log"
