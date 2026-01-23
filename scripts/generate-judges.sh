#!/bin/bash
cd "$(dirname "$0")/.."
# Set OPENAI_API_KEY env var before running
export OPENAI_API_KEY="$OPENAI_API_KEY"
node scripts/generate-quick-insights-openai.js JDG 2>&1 | tee scripts/logs/judges.log
