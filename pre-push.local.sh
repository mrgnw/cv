#!/bin/bash

FLAG_FILE=".pdf_gen_ts"

# Check for changes in the src/lib/versions/ or src/ directories
CHANGED_FILES=$(git diff @{push} --name-only | grep -E '^src/|generate-pdfs\.js$')

if [ -z "$CHANGED_FILES" ]; then
    echo "No changes in src/lib/versions/ or src/, skipping PDF generation..."
    exit 0
fi

# If PDF generation was run less than 5 minutes ago, skip
if [ -f "$FLAG_FILE" ]; then
    FLAG_TIME=$(cat "$FLAG_FILE")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - FLAG_TIME))
    
    if [ $TIME_DIFF -lt 300 ]; then
        echo "PDFs were generated less than 5 minutes ago, skipping..."
        exit 0
    fi
fi

echo "Generating PDFs..."
bun run pdfs

git add static/*.pdf
git commit -m "chore: update PDFs [skip ci]" || true

date +%s > "$FLAG_FILE"
git push origin HEAD