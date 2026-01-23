#!/bin/bash
cd "$(dirname "$0")/.."
# Set OPENAI_API_KEY env var before running
export OPENAI_API_KEY="$OPENAI_API_KEY"
node scripts/generate-quick-insights-openai.js 1SA 2>&1 | tee scripts/logs/1samuel.log
