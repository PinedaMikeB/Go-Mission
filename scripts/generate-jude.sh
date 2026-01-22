#!/bin/bash
# Generate Quick Insights for Jude
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-jude.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "🚀 Starting Jude generation..."
echo "📝 Log file: scripts/logs/jude.log"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-jude.sh"
    exit 1
fi

node scripts/generate-quick-insights-openai.js JUD \
  > scripts/logs/jude.log 2>&1 &

echo "✅ Jude generation running in background (PID: $!)"
echo "   Monitor: tail -f scripts/logs/jude.log"
