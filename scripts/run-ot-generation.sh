#!/bin/bash
# Go Mission - OT Insights Background Generator
# Runs independently without Claude

# Load API key from ~/.env file
export OPENAI_API_KEY=$(cat ~/.env | grep OPENAI_API_KEY | cut -d= -f2)

cd "/Volumes/Wotg Drive Mike/GitHub/Go-Mission/scripts"

echo "============================================================"
echo "🚀 Starting OT Insights Background Generation"
echo "   Started: $(date)"
echo "============================================================"

# Process OT books that need completion
# These are the books that were incomplete or missing

BOOKS=(
  "GEN" "EXO" "LEV" "NUM" "DEU" 
  "JOS" "JDG" "RUT" "1SA" "2SA" 
  "1KI" "2KI" "1CH" "2CH" "EZR" 
  "NEH" "EST" "JOB" "PSA" "PRO" 
  "ECC" "SNG" "ISA" "JER" "LAM" 
  "EZK" "DAN" "HOS" "JOL" "AMO" 
  "OBA" "MIC" "HAB" "ZEP" "ZEC" "MAL"
)

for book in "${BOOKS[@]}"; do
  echo ""
  echo "📖 Processing $book at $(date)"
  node generate-quick-insights-openai.js "$book" 2>&1 | tee -a "logs/ot-batch-$(date +%Y%m%d).log"
  
  # Small delay between books
  sleep 5
done

echo ""
echo "============================================================"
echo "✅ OT Generation Complete!"
echo "   Finished: $(date)"
echo "============================================================"
