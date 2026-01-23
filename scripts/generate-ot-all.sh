#!/bin/bash
# Generate Quick Insights for ALL 39 OT Books (Detailed Paragraph Format)
# Runs in batches of 5 to avoid API rate limits

cd "$(dirname "$0")/.."

echo "============================================================"
echo "🚀 FULL OT REGENERATION - Detailed Paragraph Format"
echo "============================================================"
echo ""
echo "Total: 39 OT Books"
echo "Format: 5-7 sentences per section (detailed)"
echo ""

# Batch 1: Pentateuch (5 books)
echo "📚 BATCH 1: Pentateuch (Genesis - Deuteronomy)"
echo "============================================================"
./scripts/generate-genesis.sh &
./scripts/generate-exodus.sh &
./scripts/generate-leviticus.sh &
./scripts/generate-numbers.sh &
./scripts/generate-deuteronomy.sh &
wait
echo "✅ Batch 1 complete!"
echo ""

# Batch 2: Historical 1 (5 books)
echo "📚 BATCH 2: Historical (Joshua - 1 Samuel)"
echo "============================================================"
./scripts/generate-joshua.sh &
./scripts/generate-judges.sh &
./scripts/generate-ruth.sh &
./scripts/generate-1samuel.sh &
./scripts/generate-2samuel.sh &
wait
echo "✅ Batch 2 complete!"
echo ""

# Batch 3: Historical 2 (5 books)
echo "📚 BATCH 3: Historical (1 Kings - Nehemiah)"
echo "============================================================"
./scripts/generate-1kings.sh &
./scripts/generate-2kings.sh &
./scripts/generate-1chronicles.sh &
./scripts/generate-2chronicles.sh &
./scripts/generate-ezra.sh &
wait
echo "✅ Batch 3 complete!"
echo ""

# Batch 4: Historical 3 + Wisdom (5 books)
echo "📚 BATCH 4: Nehemiah, Esther, Job, Psalms, Proverbs"
echo "============================================================"
./scripts/generate-nehemiah.sh &
./scripts/generate-esther.sh &
./scripts/generate-job.sh &
./scripts/generate-psalms.sh &
./scripts/generate-proverbs.sh &
wait
echo "✅ Batch 4 complete!"
echo ""

# Batch 5: Wisdom + Major Prophets (5 books)
echo "📚 BATCH 5: Ecclesiastes, Song of Solomon, Isaiah, Jeremiah, Lamentations"
echo "============================================================"
./scripts/generate-ecclesiastes.sh &
./scripts/generate-songofsolomon.sh &
./scripts/generate-isaiah.sh &
./scripts/generate-jeremiah.sh &
./scripts/generate-lamentations.sh &
wait
echo "✅ Batch 5 complete!"
echo ""

# Batch 6: Major Prophets + Minor (5 books)
echo "📚 BATCH 6: Ezekiel, Daniel, Hosea, Joel, Amos"
echo "============================================================"
./scripts/generate-ezekiel.sh &
./scripts/generate-daniel.sh &
./scripts/generate-hosea.sh &
./scripts/generate-joel.sh &
./scripts/generate-amos.sh &
wait
echo "✅ Batch 6 complete!"
echo ""

# Batch 7: Minor Prophets (5 books)
echo "📚 BATCH 7: Obadiah, Jonah, Micah, Nahum, Habakkuk"
echo "============================================================"
./scripts/generate-obadiah.sh &
./scripts/generate-jonah.sh &
./scripts/generate-micah.sh &
./scripts/generate-nahum.sh &
./scripts/generate-habakkuk.sh &
wait
echo "✅ Batch 7 complete!"
echo ""

# Batch 8: Minor Prophets (4 books)
echo "📚 BATCH 8: Zephaniah, Haggai, Zechariah, Malachi"
echo "============================================================"
./scripts/generate-zephaniah.sh &
./scripts/generate-haggai.sh &
./scripts/generate-zechariah.sh &
./scripts/generate-malachi.sh &
wait
echo "✅ Batch 8 complete!"
echo ""

echo "============================================================"
echo "🎉 ALL 39 OT BOOKS COMPLETE!"
echo "============================================================"
echo ""
echo "Check output: modules/bible/data/quick-insights/"
echo "Check logs: scripts/logs/"
