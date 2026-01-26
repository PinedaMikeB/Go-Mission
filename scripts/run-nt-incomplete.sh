#!/bin/bash
# NT Quick Insights Generation Script - INCOMPLETE BOOKS ONLY
# Re-runs the 19 incomplete NT books

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts"
mkdir -p logs

# Load API key
export OPENAI_API_KEY=$(cat ~/.env | grep OPENAI_API_KEY | cut -d'=' -f2)

echo "============================================================"
echo "🚀 Re-running INCOMPLETE NT Quick Insights Generation"
echo "   Date: $(date)"
echo "   Books: 19 incomplete NT books"
echo "============================================================"

# Incomplete NT books (need to regenerate)
INCOMPLETE_BOOKS="MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TI 2TI HEB JAS 1PE 1JN REV"

for book in $INCOMPLETE_BOOKS; do
    echo ""
    echo "========================================"
    echo "📖 Starting $book at $(date '+%H:%M:%S')"
    echo "========================================"
    
    node generate-quick-insights-openai.js $book 2>&1 | tee -a logs/nt-incomplete-generation.log
    
    echo "✅ $book completed at $(date '+%H:%M:%S')"
    echo ""
    
    # Small delay between books
    sleep 2
done

echo ""
echo "============================================================"
echo "🎉 NT Incomplete Books Generation Complete!"
echo "   Finished: $(date)"
echo "============================================================"
