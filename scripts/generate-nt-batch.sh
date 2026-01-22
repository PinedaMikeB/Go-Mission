#!/bin/bash
# Start all 10 NT Quick Insights generators simultaneously (OpenAI GPT-4o-mini)
# Usage: OPENAI_API_KEY="your-key" ./scripts/generate-nt-batch.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "=============================================="
echo "🚀 Go Mission - NT Batch Quick Insights Generator"
echo "   Model: GPT-4o-mini (OpenAI)"
echo "=============================================="
echo ""

# Check for API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo ""
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-nt-batch.sh"
    exit 1
fi

echo "Starting 10 New Testament books simultaneously:"
echo "  1. 1 Corinthians (16 chapters)"
echo "  2. 2 Corinthians (13 chapters)"
echo "  3. Galatians (6 chapters)"
echo "  4. Ephesians (6 chapters)"
echo "  5. Philippians (4 chapters)"
echo "  6. Colossians (4 chapters)"
echo "  7. 1 Thessalonians (5 chapters)"
echo "  8. 2 Thessalonians (3 chapters)"
echo "  9. 1 Timothy (6 chapters)"
echo "  10. 2 Timothy (4 chapters)"
echo ""

mkdir -p scripts/logs

# Start all 10 with slight delays to avoid API burst
echo "🔥 Starting 1 Corinthians..."
node scripts/generate-quick-insights-openai.js 1CO \
  > scripts/logs/1corinthians.log 2>&1 &
PID_1CO=$!
sleep 1

echo "🔥 Starting 2 Corinthians..."
node scripts/generate-quick-insights-openai.js 2CO \
  > scripts/logs/2corinthians.log 2>&1 &
PID_2CO=$!
sleep 1

echo "🔥 Starting Galatians..."
node scripts/generate-quick-insights-openai.js GAL \
  > scripts/logs/galatians.log 2>&1 &
PID_GAL=$!
sleep 1

echo "🔥 Starting Ephesians..."
node scripts/generate-quick-insights-openai.js EPH \
  > scripts/logs/ephesians.log 2>&1 &
PID_EPH=$!
sleep 1

echo "🔥 Starting Philippians..."
node scripts/generate-quick-insights-openai.js PHP \
  > scripts/logs/philippians.log 2>&1 &
PID_PHP=$!
sleep 1

echo "🔥 Starting Colossians..."
node scripts/generate-quick-insights-openai.js COL \
  > scripts/logs/colossians.log 2>&1 &
PID_COL=$!
sleep 1

echo "🔥 Starting 1 Thessalonians..."
node scripts/generate-quick-insights-openai.js 1TH \
  > scripts/logs/1thessalonians.log 2>&1 &
PID_1TH=$!
sleep 1

echo "🔥 Starting 2 Thessalonians..."
node scripts/generate-quick-insights-openai.js 2TH \
  > scripts/logs/2thessalonians.log 2>&1 &
PID_2TH=$!
sleep 1

echo "🔥 Starting 1 Timothy..."
node scripts/generate-quick-insights-openai.js 1TI \
  > scripts/logs/1timothy.log 2>&1 &
PID_1TI=$!
sleep 1

echo "🔥 Starting 2 Timothy..."
node scripts/generate-quick-insights-openai.js 2TI \
  > scripts/logs/2timothy.log 2>&1 &
PID_2TI=$!

echo ""
echo "=============================================="
echo "✅ All 10 generators running!"
echo "=============================================="
echo ""
echo "Process IDs:"
echo "  1 Corinthians:    $PID_1CO"
echo "  2 Corinthians:    $PID_2CO"
echo "  Galatians:        $PID_GAL"
echo "  Ephesians:        $PID_EPH"
echo "  Philippians:      $PID_PHP"
echo "  Colossians:       $PID_COL"
echo "  1 Thessalonians:  $PID_1TH"
echo "  2 Thessalonians:  $PID_2TH"
echo "  1 Timothy:        $PID_1TI"
echo "  2 Timothy:        $PID_2TI"
echo ""
echo "Monitor logs:"
echo "  tail -f scripts/logs/1corinthians.log"
echo "  tail -f scripts/logs/2corinthians.log"
echo "  tail -f scripts/logs/galatians.log"
echo "  tail -f scripts/logs/ephesians.log"
echo "  tail -f scripts/logs/philippians.log"
echo "  tail -f scripts/logs/colossians.log"
echo "  tail -f scripts/logs/1thessalonians.log"
echo "  tail -f scripts/logs/2thessalonians.log"
echo "  tail -f scripts/logs/1timothy.log"
echo "  tail -f scripts/logs/2timothy.log"
echo ""
echo "Check progress:"
echo "  ./scripts/check-progress.sh"
echo ""
echo "Stop all:"
echo "  pkill -f 'generate-quick-insights-openai'"
echo ""
