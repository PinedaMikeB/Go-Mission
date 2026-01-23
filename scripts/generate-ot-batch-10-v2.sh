#!/bin/bash
# Generate Quick Insights for 10 More OT Books (Batch 2)
# Run each book in parallel (5 at a time to avoid API rate limits)

cd "$(dirname "$0")/.."

echo "============================================================"
echo "🚀 Starting Quick Insights Generation - 10 OT Books (Batch 2)"
echo "============================================================"
echo ""
echo "Books to generate:"
echo "  1. 2 Kings (2KI) - 25 chapters"
echo "  2. 1 Chronicles (1CH) - 29 chapters"
echo "  3. 2 Chronicles (2CH) - 36 chapters"
echo "  4. Ezra (EZR) - 10 chapters"
echo "  5. Nehemiah (NEH) - 13 chapters"
echo "  6. Esther (EST) - 10 chapters"
echo "  7. Job (JOB) - 42 chapters"
echo "  8. Ecclesiastes (ECC) - 12 chapters"
echo "  9. Song of Solomon (SNG) - 8 chapters"
echo "  10. Isaiah (ISA) - 66 chapters"
echo ""
echo "Starting batch 1 (5 books in parallel)..."
echo "============================================================"

# Batch 1: 2KI, 1CH, 2CH, EZR, NEH
./scripts/generate-2kings.sh &
./scripts/generate-1chronicles.sh &
./scripts/generate-2chronicles.sh &
./scripts/generate-ezra.sh &
./scripts/generate-nehemiah.sh &

wait

echo ""
echo "============================================================"
echo "✅ Batch 1 complete! Starting batch 2..."
echo "============================================================"

# Batch 2: EST, JOB, ECC, SNG, ISA
./scripts/generate-esther.sh &
./scripts/generate-job.sh &
./scripts/generate-ecclesiastes.sh &
./scripts/generate-songofsolomon.sh &
./scripts/generate-isaiah.sh &

wait

echo ""
echo "============================================================"
echo "🎉 All 10 OT Books (Batch 2) Generation Complete!"
echo "============================================================"
echo ""
echo "Check logs: tail -f scripts/logs/*.log"
echo "Output files: modules/bible/data/quick-insights/"
