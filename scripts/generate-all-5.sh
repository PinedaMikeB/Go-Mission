#!/bin/bash
# Start all 5 Quick Insights generators simultaneously (OpenAI GPT-4o-mini)
# Usage: OPENAI_API_KEY="your-key" ./scripts/generate-all-5.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "=============================================="
echo "🚀 Go Mission - Batch Quick Insights Generator"
echo "   Model: GPT-4o-mini (OpenAI)"
echo "=============================================="
echo ""

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo ""
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-all-5.sh"
    exit 1
fi

echo "Starting 5 books simultaneously:"
echo "  1. Acts (28 chapters)"
echo "  2. Romans (16 chapters)"
echo "  3. Psalms (150 chapters)"
echo "  4. Proverbs (31 chapters)"
echo "  5. Genesis (50 chapters)"
echo ""

mkdir -p scripts/logs

# Start all 5 with slight delays to avoid API burst
echo "🔥 Starting Acts..."
node scripts/generate-quick-insights-openai.js ACT \
  > scripts/logs/acts.log 2>&1 &
ACTS_PID=$!
sleep 2

echo "🔥 Starting Romans..."
node scripts/generate-quick-insights-openai.js ROM \
  > scripts/logs/romans.log 2>&1 &
ROMANS_PID=$!
sleep 2

echo "🔥 Starting Psalms..."
node scripts/generate-quick-insights-openai.js PSA \
  > scripts/logs/psalms.log 2>&1 &
PSALMS_PID=$!
sleep 2

echo "🔥 Starting Proverbs..."
node scripts/generate-quick-insights-openai.js PRO \
  > scripts/logs/proverbs.log 2>&1 &
PROVERBS_PID=$!
sleep 2

echo "🔥 Starting Genesis..."
node scripts/generate-quick-insights-openai.js GEN \
  > scripts/logs/genesis.log 2>&1 &
GENESIS_PID=$!

echo ""
echo "=============================================="
echo "✅ All 5 generators running!"
echo "=============================================="
echo ""
echo "Process IDs:"
echo "  Acts:     $ACTS_PID"
echo "  Romans:   $ROMANS_PID"
echo "  Psalms:   $PSALMS_PID"
echo "  Proverbs: $PROVERBS_PID"
echo "  Genesis:  $GENESIS_PID"
echo ""
echo "Monitor logs:"
echo "  tail -f scripts/logs/acts.log"
echo "  tail -f scripts/logs/romans.log"
echo "  tail -f scripts/logs/psalms.log"
echo "  tail -f scripts/logs/proverbs.log"
echo "  tail -f scripts/logs/genesis.log"
echo ""
echo "Check progress:"
echo "  ./scripts/check-progress.sh"
echo ""
echo "Stop all:"
echo "  pkill -f 'generate-quick-insights-openai'"
echo ""
