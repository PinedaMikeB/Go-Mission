#!/bin/bash
# Check progress of all Quick Insights generators
# Usage: ./scripts/check-progress.sh

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission"

echo "=============================================="
echo "📊 Quick Insights Generation Progress"
echo "=============================================="
echo ""

# Check if processes are running
echo "🔄 Running Processes:"
RUNNING=$(pgrep -f "generate-quick-insights" | wc -l | tr -d ' ')
if [ "$RUNNING" -gt 0 ]; then
    ps aux | grep "generate-quick-insights" | grep -v grep | awk '{print "  PID " $2 ": " $13}'
else
    echo "  No generators currently running"
fi
echo ""

# Check output files
echo "📚 Generated Files:"
echo ""

# All books to check (completed + new batch)
for book in ACT ROM PSA PRO GEN MAT MRK LUK JHN 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV; do
    FILE="modules/bible/data/quick-insights/${book}.json"
    if [ -f "$FILE" ]; then
        # Get chapter count
        CHAPTERS=$(python3 -c "import json; d=json.load(open('$FILE')); print(len(d.get('chapters', {})))" 2>/dev/null || echo "?")
        
        # Get expected chapters
        case $book in
            GEN) EXPECTED=50; NAME="Genesis" ;;
            PSA) EXPECTED=150; NAME="Psalms" ;;
            PRO) EXPECTED=31; NAME="Proverbs" ;;
            MAT) EXPECTED=28; NAME="Matthew" ;;
            MRK) EXPECTED=16; NAME="Mark" ;;
            LUK) EXPECTED=24; NAME="Luke" ;;
            JHN) EXPECTED=21; NAME="John" ;;
            ACT) EXPECTED=28; NAME="Acts" ;;
            ROM) EXPECTED=16; NAME="Romans" ;;
            1CO) EXPECTED=16; NAME="1 Corinthians" ;;
            2CO) EXPECTED=13; NAME="2 Corinthians" ;;
            GAL) EXPECTED=6; NAME="Galatians" ;;
            EPH) EXPECTED=6; NAME="Ephesians" ;;
            PHP) EXPECTED=4; NAME="Philippians" ;;
            COL) EXPECTED=4; NAME="Colossians" ;;
            1TH) EXPECTED=5; NAME="1 Thessalonians" ;;
            2TH) EXPECTED=3; NAME="2 Thessalonians" ;;
            1TI) EXPECTED=6; NAME="1 Timothy" ;;
            2TI) EXPECTED=4; NAME="2 Timothy" ;;
            TIT) EXPECTED=3; NAME="Titus" ;;
            PHM) EXPECTED=1; NAME="Philemon" ;;
            HEB) EXPECTED=13; NAME="Hebrews" ;;
            JAS) EXPECTED=5; NAME="James" ;;
            1PE) EXPECTED=5; NAME="1 Peter" ;;
            2PE) EXPECTED=3; NAME="2 Peter" ;;
            1JN) EXPECTED=5; NAME="1 John" ;;
            2JN) EXPECTED=1; NAME="2 John" ;;
            3JN) EXPECTED=1; NAME="3 John" ;;
            JUD) EXPECTED=1; NAME="Jude" ;;
            REV) EXPECTED=22; NAME="Revelation" ;;
            *) EXPECTED="?"; NAME="$book" ;;
        esac
        
        # Calculate percentage
        if [ "$CHAPTERS" != "?" ] && [ "$EXPECTED" != "?" ]; then
            PCT=$((CHAPTERS * 100 / EXPECTED))
            if [ "$CHAPTERS" -eq "$EXPECTED" ]; then
                STATUS="✅"
            else
                STATUS="🔄"
            fi
        else
            PCT="?"
            STATUS="❓"
        fi
        
        printf "  %s %-16s %3s/%3s chapters (%3s%%)\n" "$STATUS" "$NAME" "$CHAPTERS" "$EXPECTED" "$PCT"
    fi
done

echo ""
echo "=============================================="

# Show recent log activity
echo ""
echo "📝 Recent Log Activity (last 3 lines each):"
echo ""

for book in acts romans psalms proverbs genesis 1corinthians 2corinthians galatians ephesians philippians colossians 1thessalonians 2thessalonians 1timothy 2timothy; do
    LOG="scripts/logs/${book}.log"
    if [ -f "$LOG" ]; then
        UPPER=$(echo "$book" | tr '[:lower:]' '[:upper:]')
        echo "--- $UPPER ---"
        tail -3 "$LOG" 2>/dev/null || echo "  (empty)"
        echo ""
    fi
done
