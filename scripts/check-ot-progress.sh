#!/bin/bash
# Monitor Quick Insights Generation Progress

echo "============================================================"
echo "📊 Quick Insights Generation Progress - 10 OT Books"
echo "============================================================"
echo ""

books=("exodus:1213" "leviticus:859" "numbers:1288" "deuteronomy:959" "joshua:658" "judges:618" "ruth:85" "1samuel:810" "2samuel:695" "1kings:816")

for item in "${books[@]}"; do
  name="${item%%:*}"
  total="${item##*:}"
  log="/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts/logs/${name}.log"
  
  if [ -f "$log" ]; then
    count=$(grep -o "✓" "$log" 2>/dev/null | wc -l | tr -d ' ')
    pct=$((count * 100 / total))
    printf "%-12s: %4d / %4d verses (%3d%%)\n" "$name" "$count" "$total" "$pct"
  else
    printf "%-12s: waiting to start...\n" "$name"
  fi
done

echo ""
echo "============================================================"
echo "Monitor logs: tail -f scripts/logs/*.log"
