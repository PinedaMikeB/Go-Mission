#!/bin/bash
# Generate Quick Insights for ALL remaining NT books (10 books)
# Run: OPENAI_API_KEY="your-key" ./scripts/generate-nt-remaining.sh
#
# Books: Titus, Philemon, Hebrews, James, 1 Peter, 2 Peter, 
#        1 John, 2 John, 3 John, Jude, Revelation
#
# Total: 11 books, ~60 chapters

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "============================================================"
echo "🚀 Go Mission - NT Quick Insights Generator (Remaining 11)"
echo "   Using: GPT-4o-mini"
echo "============================================================"

mkdir -p scripts/logs

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ Error: OPENAI_API_KEY not set"
    echo "Usage: OPENAI_API_KEY=\"your-key\" ./scripts/generate-nt-remaining.sh"
    exit 1
fi

echo ""
echo "📚 Starting 11 books in background..."
echo ""

# Small epistles first (quick wins)
echo "1. Titus (3 chapters)..."
./scripts/generate-titus.sh
sleep 2

echo "2. Philemon (1 chapter)..."
./scripts/generate-philemon.sh
sleep 2

echo "3. 2 John (1 chapter)..."
./scripts/generate-2john.sh
sleep 2

echo "4. 3 John (1 chapter)..."
./scripts/generate-3john.sh
sleep 2

echo "5. Jude (1 chapter)..."
./scripts/generate-jude.sh
sleep 2

echo "6. 2 Peter (3 chapters)..."
./scripts/generate-2peter.sh
sleep 2

echo "7. James (5 chapters)..."
./scripts/generate-james.sh
sleep 2

echo "8. 1 Peter (5 chapters)..."
./scripts/generate-1peter.sh
sleep 2

echo "9. 1 John (5 chapters)..."
./scripts/generate-1john.sh
sleep 2

echo "10. Hebrews (13 chapters)..."
./scripts/generate-hebrews.sh
sleep 2

echo "11. Revelation (22 chapters)..."
./scripts/generate-revelation.sh

echo ""
echo "============================================================"
echo "✅ All 11 books started in background!"
echo ""
echo "Monitor all logs:"
echo "  tail -f scripts/logs/*.log"
echo ""
echo "Check progress:"
echo "  ls -la modules/bible/data/quick-insights/"
echo "============================================================"
