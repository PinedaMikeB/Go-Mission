#!/bin/bash
# NT Quick Insights - PARALLEL Generation
# Each book runs as a separate background process

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts"
mkdir -p logs

# Load API key
export OPENAI_API_KEY=$(cat ~/.env | grep OPENAI_API_KEY | cut -d'=' -f2)

echo "============================================================"
echo "🚀 Starting PARALLEL NT Quick Insights Generation"
echo "   Date: $(date)"
echo "============================================================"

# NT books to generate (excluding MAT which is done, and 1TH/2TH which have no Tyndale)
BOOKS_TO_GENERATE="MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV"

for book in $BOOKS_TO_GENERATE; do
    echo "📖 Starting $book..."
    nohup node generate-quick-insights-openai.js $book > logs/${book}-generation.log 2>&1 &
    echo "   PID: $! - Log: logs/${book}-generation.log"
    
    # Small delay to avoid API rate limit spike
    sleep 2
done

echo ""
echo "============================================================"
echo "✅ All 24 books started in parallel!"
echo ""
echo "Monitor with:"
echo "  tail -f logs/*-generation.log"
echo ""
echo "Check progress:"
echo "  ls -la ../modules/bible/data/quick-insights/*.json"
echo "============================================================"
