#!/bin/bash
# Generate Quick Insights for 10 OT Books
# Run each book in parallel (5 at a time to avoid API rate limits)

cd "$(dirname "$0")/.."

echo "============================================================"
echo "🚀 Starting Quick Insights Generation - 10 OT Books"
echo "============================================================"
echo ""
echo "Books to generate:"
echo "  1. Exodus (EXO) - 40 chapters"
echo "  2. Leviticus (LEV) - 27 chapters"
echo "  3. Numbers (NUM) - 36 chapters"
echo "  4. Deuteronomy (DEU) - 34 chapters"
echo "  5. Joshua (JOS) - 24 chapters"
echo "  6. Judges (JDG) - 21 chapters"
echo "  7. Ruth (RUT) - 4 chapters"
echo "  8. 1 Samuel (1SA) - 31 chapters"
echo "  9. 2 Samuel (2SA) - 24 chapters"
echo "  10. 1 Kings (1KI) - 22 chapters"
echo ""
echo "Starting batch 1 (5 books in parallel)..."
echo "============================================================"

# Batch 1: EXO, LEV, NUM, DEU, JOS
./scripts/generate-exodus.sh &
./scripts/generate-leviticus.sh &
./scripts/generate-numbers.sh &
./scripts/generate-deuteronomy.sh &
./scripts/generate-joshua.sh &

wait

echo ""
echo "============================================================"
echo "✅ Batch 1 complete! Starting batch 2..."
echo "============================================================"

# Batch 2: JDG, RUT, 1SA, 2SA, 1KI
./scripts/generate-judges.sh &
./scripts/generate-ruth.sh &
./scripts/generate-1samuel.sh &
./scripts/generate-2samuel.sh &
./scripts/generate-1kings.sh &

wait

echo ""
echo "============================================================"
echo "🎉 All 10 OT Books Generation Complete!"
echo "============================================================"
echo ""
echo "Check logs: tail -f scripts/logs/*.log"
echo "Output files: modules/bible/data/quick-insights/"
