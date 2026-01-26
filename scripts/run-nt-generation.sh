#!/bin/bash
# NT Quick Insights Generation Script
# Runs all 27 NT books sequentially (excluding 1TH and 2TH - no Tyndale source)

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts"
mkdir -p logs

# Load API key
export OPENAI_API_KEY=$(cat ~/.env | grep OPENAI_API_KEY | cut -d'=' -f2)

echo "============================================================"
echo "🚀 Starting NT Quick Insights Generation"
echo "   Date: $(date)"
echo "   Books: 25 NT books (excluding 1TH, 2TH - no Tyndale)"
echo "============================================================"

# NT books (excluding 1TH and 2TH which have no Tyndale source)
NT_BOOKS="MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV"

for book in $NT_BOOKS; do
    echo ""
    echo "========================================"
    echo "📖 Starting $book at $(date '+%H:%M:%S')"
    echo "========================================"
    
    node generate-quick-insights-openai.js $book 2>&1 | tee -a logs/nt-generation.log
    
    echo "✅ $book completed at $(date '+%H:%M:%S')"
    echo ""
    
    # Small delay between books
    sleep 2
done

echo ""
echo "============================================================"
echo "🎉 NT Generation Complete!"
echo "   Finished: $(date)"
echo "============================================================"
